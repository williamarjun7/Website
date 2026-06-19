/**
 * sync-harden.ts
 *
 * Shared utilities for hardened sync:
 *   - HMAC signing (strict hex, lowercase)
 *   - HMAC verification with timing-safe compare
 *   - Per-endpoint circuit breaker
 *   - Exponential backoff with jitter
 */

import { timingSafeEqual } from "./timing-safe.ts"

// ── HMAC ──────────────────────────────────────────────────────────

const HMAC_ALGORITHM = { name: "HMAC", hash: "SHA-256" } as const

/**
 * Signs a payload using HMAC-SHA256.
 * Returns lowercase hex string.
 *
 * Format: HMAC-SHA256(secret, payload + "." + timestamp_ms)
 */
export async function signHmac(
  secret: string,
  payload: string,
  timestampMs: number,
): Promise<string> {
  const encoder = new TextEncoder()
  const input = `${payload}.${timestampMs}`
  const cryptoKey = await crypto.subtle.importKey("raw", encoder.encode(secret), HMAC_ALGORITHM, false, ["sign"])
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(input))
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
}

/**
 * Verifies an HMAC signature with ±5 minute timestamp tolerance.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export async function verifyHmac(
  secret: string,
  payload: string,
  signature: string,
  timestampMs: string,
): Promise<{ valid: boolean; reason?: string }> {
  const now = Date.now()
  const ts = parseInt(timestampMs, 10)
  if (isNaN(ts)) {
    return { valid: false, reason: "invalid_timestamp" }
  }
  if (Math.abs(now - ts) > 300_000) {
    return { valid: false, reason: "timestamp_out_of_tolerance" }
  }
  const expected = await signHmac(secret, payload, ts)
  if (!timingSafeEqual(expected, signature)) {
    return { valid: false, reason: "signature_mismatch" }
  }
  return { valid: true }
}

// ── Circuit Breaker ──────────────────────────────────────────────

type CircuitState = "closed" | "open" | "half-open"

interface CircuitBreakerConfig {
  failureThreshold: number
  openTimeoutMs: number
  halfOpenMaxRequests: number
}

const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  openTimeoutMs: 60_000,
  halfOpenMaxRequests: 1,
}

interface CircuitEntry {
  state: CircuitState
  failureCount: number
  lastFailureAt: number
  openedAt: number
  halfOpenAttempts: number
}

// Shared across all invocations (per-worker, in-memory)
const circuitBreakerStore = new Map<string, CircuitEntry>()

function getCircuitEntry(endpoint: string): CircuitEntry {
  let entry = circuitBreakerStore.get(endpoint)
  if (!entry) {
    entry = { state: "closed", failureCount: 0, lastFailureAt: 0, openedAt: 0, halfOpenAttempts: 0 }
    circuitBreakerStore.set(endpoint, entry)
  }
  return entry
}

/**
 * Check if a request to endpoint is allowed through the circuit breaker.
 */
export function circuitBreakerAllow(endpoint: string): { allowed: boolean; state: CircuitState } {
  const entry = getCircuitEntry(endpoint)
  const now = Date.now()

  if (entry.state === "open") {
    if (now - entry.openedAt >= 60_000) {
      entry.state = "half-open"
      entry.halfOpenAttempts = 0
      return { allowed: true, state: "half-open" }
    }
    return { allowed: false, state: "open" }
  }

  if (entry.state === "half-open") {
    if (entry.halfOpenAttempts < 1) {
      entry.halfOpenAttempts++
      return { allowed: true, state: "half-open" }
    }
    return { allowed: false, state: "half-open" }
  }

  return { allowed: true, state: "closed" }
}

/**
 * Record a successful request to the circuit breaker.
 */
export function circuitBreakerSuccess(endpoint: string): void {
  const entry = getCircuitEntry(endpoint)
  entry.failureCount = 0
  entry.state = "closed"
}

/**
 * Record a failed request to the circuit breaker.
 * Only 5xx responses count toward the threshold.
 */
export function circuitBreakerFailure(endpoint: string, statusCode: number): void {
  if (statusCode < 500) return // only 5xx opens circuit
  const entry = getCircuitEntry(endpoint)
  entry.failureCount++
  entry.lastFailureAt = Date.now()
  if (entry.failureCount >= 3) {
    entry.state = "open"
    entry.openedAt = Date.now()
  }
}

// ── Exponential Backoff ──────────────────────────────────────────

const BASE_DELAY_MS = 1_000
const MAX_DELAY_MS = 60_000
const JITTER_FACTOR = 0.2

/**
 * Returns the delay in ms for the given retry attempt (1-indexed).
 * Implements: min(BASE * 2^(attempt-1), MAX) with ±20% jitter.
 */
export function backoffDelay(attempt: number): number {
  const exponential = Math.min(BASE_DELAY_MS * Math.pow(2, attempt - 1), MAX_DELAY_MS)
  const jitter = exponential * JITTER_FACTOR * (Math.random() * 2 - 1)
  return Math.round(exponential + jitter)
}

/**
 * Determines if a retry is allowed based on attempt count and HTTP status.
 * Only 5xx and network errors should be retried (4xx = non-retryable).
 */
export function isRetryable(statusCode: number | null): boolean {
  if (statusCode === null) return true // network error
  if (statusCode >= 500) return true
  if (statusCode === 429) return true // rate limit — retry
  return false
}

// ── Trace / Lineage ──────────────────────────────────────────────

/**
 * Generates a v4 UUID (used for trace_id).
 */
export function generateTraceId(): string {
  return crypto.randomUUID()
}

/**
 * Builds sync event lineage metadata.
 */
export function buildLineage(
  originSystem: "website" | "pos",
  traceId?: string,
  parentEventId?: string | null,
): {
  origin_system: string
  trace_id: string
  parent_event_id: string | null
} {
  return {
    origin_system: originSystem,
    trace_id: traceId || generateTraceId(),
    parent_event_id: parentEventId || null,
  }
}

// ── Sync Event Sender ────────────────────────────────────────────

export interface SyncSendResult {
  success: boolean
  statusCode: number
  body: string
}

/**
 * Sends a sync event to a webhook endpoint with HMAC signing,
 * circuit breaker, and retry support.
 */
export async function sendSyncEvent(
  webhookUrl: string,
  webhookSecret: string,
  payload: Record<string, unknown>,
  options?: { timeoutMs?: number; idempotencyKey?: string },
): Promise<SyncSendResult> {
  const { allowed, state } = circuitBreakerAllow(webhookUrl)
  if (!allowed) {
    console.error(`Circuit breaker OPEN for ${webhookUrl} (state=${state})`)
    return { success: false, statusCode: 503, body: "Circuit breaker open" }
  }

  const timestampMs = Date.now()
  const body = JSON.stringify(payload)
  const signature = await signHmac(webhookSecret, body, timestampMs)

  const timeout = options?.timeoutMs || 10_000
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Webhook-Signature": signature,
    "X-Timestamp": String(timestampMs),
  }

  const originSystem = (payload as Record<string, string>).origin_system
  headers["X-Webhook-Source"] = originSystem === "pos" ? "pos" : "website"
  if (options?.idempotencyKey) {
    headers["X-Idempotency-Key"] = options.idempotencyKey
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    })

    clearTimeout(timer)
    const bodyText = await response.text()

    if (response.ok || response.status === 508) {
      circuitBreakerSuccess(webhookUrl)
    } else {
      circuitBreakerFailure(webhookUrl, response.status)
    }

    return { success: response.ok, statusCode: response.status, body: bodyText }
  } catch (err) {
    clearTimeout(timer)
    circuitBreakerFailure(webhookUrl, 503) // network error treated as 503
    return {
      success: false,
      statusCode: 0,
      body: err instanceof Error ? err.message : "Network error",
    }
  }
}
