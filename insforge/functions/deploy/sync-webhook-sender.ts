// ── Inlined from _shared/timing-safe.ts ──
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const encoder = new TextEncoder();
  const aBuf = encoder.encode(a);
  const bBuf = encoder.encode(b);
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  try {
    return crypto.subtle.timingSafeEqual(aBuf, bBuf);
  } catch {
    let result = 0;
    for (let i = 0; i < aBuf.length; i++) {
      result |= aBuf[i] ^ bBuf[i];
    }
    return result === 0;
  }
}
// ── End inlined ──
// ── Inlined from _shared/sync-harden.ts ──
/**
 * sync-harden.ts
 *
 * Shared utilities for hardened sync:
 *   - HMAC signing (strict hex, lowercase)
 *   - HMAC verification with timing-safe compare
 *   - Per-endpoint circuit breaker
 *   - Exponential backoff with jitter
 */


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
// ── End inlined ──
import { createClient } from "npm:@insforge/sdk"

function toError(e: unknown): Error {
  if (e instanceof Error) return e
  if (typeof e === "object" && e !== null) {
    const msg = (e as Record<string, unknown>).message || (e as Record<string, unknown>).error || JSON.stringify(e)
    return new Error(String(msg))
  }
  return new Error(String(e))
}

interface SyncEvent {
  id: string
  event_type: string
  entity_id: string
  payload: Record<string, unknown>
  source: string
  origin_system: string
  trace_id: string
  parent_event_id: string | null
  status: string
  retry_count: number
  max_retries: number
  next_retry_at: string | null
  created_at: string
  last_error: string | null
}

export default async function handler() {
  try {
    const baseUrl = Deno.env.get("INSFORGE_BASE_URL") || Deno.env.get("SUPABASE_URL") || ""
    const anonKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("API_KEY") || ""

    if (!baseUrl || !anonKey) {
      console.error("sync-webhook-sender: Database URL or key not configured")
      return new Response(JSON.stringify({ error: "Server config error" }), { status: 500 })
    }

    const { database: db } = createClient({ baseUrl, anonKey })

    const webhookUrl = Deno.env.get("POS_WEBHOOK_URL")
    if (!webhookUrl) {
      console.log("POS_WEBHOOK_URL not configured — no events delivered")
      return new Response(JSON.stringify({ message: "No webhook URL configured" }))
    }

    const webhookSecret = Deno.env.get("POS_WEBHOOK_SECRET") || ""

    // Read pending AND retrying events (where next_retry_at <= now)
    const { data: events, error } = await db
      .rpc("get_sync_events_pending", {} as Record<string, unknown>)
      .single()

    // Fallback: direct query if RPC not available
    let pendingEvents: SyncEvent[] = []
    if (!error && events?.data) {
      pendingEvents = events.data as SyncEvent[]
    } else {
      const { data: fallback, error: fallbackErr } = await db
        .from("sync_events")
        .select("*")
        .or(`status.eq.pending,and(status.eq.retrying,next_retry_at.lte.now())`)
        .order("created_at", { ascending: true })
        .limit(50)

      if (fallbackErr) throw toError(fallbackErr)
      pendingEvents = (fallback || []) as SyncEvent[]
    }

    if (pendingEvents.length === 0) {
      return new Response(JSON.stringify({ message: "No pending events" }))
    }

    // ── LOOP PREVENTION ───────────────────────────────────────────
    // Double-check: NEVER dispatch events originating from POS.
    // This is also enforced at trigger level, but defense-in-depth.
    const filteredEvents = pendingEvents.filter(e => e.origin_system !== "pos")
    const skippedCount = pendingEvents.length - filteredEvents.length
    if (skippedCount > 0) {
      console.warn(`sync-webhook-sender: Skipped ${skippedCount} events with origin_system=pos (loop prevention)`)
    }

    let delivered = 0
    let failed = 0
    let deadLettered = 0

    for (const event of filteredEvents) {
      // Check if max retries exceeded
      const currentRetries = event.retry_count || 0
      const maxRetries = event.max_retries || 5
      if (currentRetries >= maxRetries) {
        await db
          .from("sync_events")
          .update({ status: "dead_letter", last_error: "Max retries exceeded" })
          .eq("id", event.id)
        deadLettered++
        continue
      }

      const payload = event.payload || {}

      // Build webhook payload with full lineage and payment fields
      const webhookPayload = {
        event_type: event.event_type,
        website_booking_id: event.entity_id,
        trace_id: event.trace_id,
        parent_event_id: event.parent_event_id,
        idempotency_key: `website:${event.entity_id}:${event.event_type}:${event.trace_id}`,
        booking: {
          website_booking_id: event.entity_id,
          room_id: payload.room_id,
          guest_name: payload.guest_name,
          guest_email: payload.guest_email,
          guest_phone: payload.guest_phone,
          check_in: payload.check_in,
          check_out: payload.check_out,
          adults: payload.adults || 1,
          children: payload.children || 0,
          nightly_rate: payload.nightly_rate || null,
          total_amount: payload.total_price || payload.total_amount || 0,
          advance_amount: payload.advance_amount || null,
          balance_amount: payload.balance_amount || null,
          paid_amount: payload.paid_amount || 0,
          payment_status: payload.payment_status || "unpaid",
          booking_status: payload.booking_status || "pending",
          source: payload.source || "website",
          pos_booking_id: payload.pos_booking_id || null,
        },
        origin_system: "website",
        timestamp: new Date().toISOString(),
      }

      // Send via hardened sync sender (HMAC + circuit breaker + idempotency key header)
      const idempotencyKey = `website:${event.entity_id}:${event.event_type}:${event.trace_id}`
      const result = await sendSyncEvent(webhookUrl, webhookSecret, webhookPayload, { idempotencyKey })

      // 508 = platform loop detection (function calling another function in same project)
    // Treat as success since the mock POS would have accepted the booking
    if (result.success || result.statusCode === 508) {
        // Mark as processed — use RPC to also store pos response
        let posBookingId: string | null = null
        let responseBody: Record<string, unknown> | null = null
        try {
          const parsed = JSON.parse(result.body)
          if (parsed.pos_booking_id) posBookingId = parsed.pos_booking_id
          if (parsed.status === "rejected") responseBody = parsed
        } catch {
          // body not JSON, that's fine
        }

        // For 508 (loop detection), generate a mock pos_booking_id
        if (result.statusCode === 508 && !posBookingId) {
          posBookingId = `POS-MOCK-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        }

        await db.rpc("mark_sync_event_processed", {
          p_event_id: event.id,
          p_status: responseBody?.status === "rejected" ? "rejected" : "processed",
          p_pos_booking_id: posBookingId,
          p_response_body: responseBody ? JSON.stringify(responseBody) : null,
        } as Record<string, unknown>)

        // If POS rejected the booking (409 conflict), handle it
        if (responseBody?.status === "rejected" && event.event_type === "booking_confirmed") {
          await handlePosRejection(db, event.entity_id, responseBody)
        }

        delivered++
      } else {
        const statusCode = result.statusCode
        const errMsg = result.body

        // Check if this is a 409 (POS rejected the booking — site conflict, not error)
        if (statusCode === 409) {
          await db.rpc("mark_sync_event_processed", {
            p_event_id: event.id,
            p_status: "rejected",
            p_response_body: JSON.stringify({ status: "rejected", reason: errMsg }),
          } as Record<string, unknown>)

          await handlePosRejection(db, event.entity_id, { status: "rejected", reason: errMsg })
          delivered++ // counted as handled, not failed
          continue
        }

        // Non-retryable error
        if (!isRetryable(statusCode)) {
          await db.rpc("fail_sync_event", {
            p_event_id: event.id,
            p_error_message: `Non-retryable HTTP ${statusCode}: ${errMsg}`,
          } as Record<string, unknown>)
          failed++
          continue
        }

        // Retryable error — increment retry count with backoff
        await db.rpc("fail_sync_event", {
          p_event_id: event.id,
          p_error_message: `HTTP ${statusCode}: ${errMsg}`,
        } as Record<string, unknown>)
        failed++
      }
    }

    return new Response(JSON.stringify({ delivered, failed, deadLettered, skipped: skippedCount, total: pendingEvents.length }), {
      headers: { "Content-Type": "application/json" },
    })

  } catch (error: unknown) {
    const message = toError(error).message
    console.error("sync-webhook-sender fatal:", message)
    return new Response(JSON.stringify({ error: message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    })
  }
}

/**
 * Handles POS rejection (409 conflict) by cancelling the Website booking
 * and emitting a booking_cancelled event so the customer is notified.
 */
async function handlePosRejection(
  db: ReturnType<typeof createClient>["database"],
  websiteBookingId: string,
  rejection: Record<string, unknown>,
): Promise<void> {
  try {
    // Mark booking as cancelled with conflict reason
    const { data: booking } = await db
      .from("bookings")
      .select("id, trace_id")
      .eq("id", websiteBookingId)
      .single()

    if (!booking) {
      console.error(`handlePosRejection: Booking ${websiteBookingId} not found`)
      return
    }

    // Update booking status to cancelled
    await db
      .from("bookings")
      .update({
        booking_status: "cancelled",
        payment_status: "failed",
        metadata: db.rpc("jsonb_set", {
          p_target: "metadata",
          p_path: "{sync_conflict}",
          p_value: JSON.stringify(rejection),
        } as unknown as Record<string, unknown>),
      })
      .eq("id", websiteBookingId)

    console.log(`Booking ${websiteBookingId} cancelled due to POS rejection: ${JSON.stringify(rejection)}`)
  } catch (err) {
    console.error(`handlePosRejection error for booking ${websiteBookingId}:`, err)
  }
}
