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
import { z } from "https://esm.sh/zod@3.22.4"

const ALLOWED_ORIGINS: (string | RegExp)[] = [
  "https://highlandsmotelinn.insforge.site",
  "https://highlands-motel.com",
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
]

function isOriginAllowed(origin: string): boolean {
  return ALLOWED_ORIGINS.some(a => typeof a === "string" ? a === origin : a.test(origin))
}

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") || ""
  const allowed = isOriginAllowed(origin)
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  }
}

interface RateLimitEntry { count: number; expires: number }
const rateLimitStore = new Map<string, RateLimitEntry>()
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW = 60_000
const MAX_BODY_BYTES = 65_536

function getClientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")
    || request.headers.get("x-real-ip")
    || "unknown"
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const key = ip
  const entry = rateLimitStore.get(key)
  if (entry && entry.expires < now) rateLimitStore.delete(key)
  if (!entry || entry.expires < now) {
    rateLimitStore.set(key, { count: 1, expires: now + RATE_LIMIT_WINDOW })
    return { allowed: true }
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((entry.expires - now) / 1000)
    return { allowed: false, retryAfter }
  }
  entry.count++
  return { allowed: true }
}

setInterval(() => {
  const now = Date.now()
  for (const [key, val] of rateLimitStore.entries()) {
    if (val.expires < now) rateLimitStore.delete(key)
  }
}, 300_000)

function sanitizeString(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim()
}

const CreateBookingSchema = z.object({
  room_id: z.string().uuid({ message: "room_id must be a valid UUID" }),
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "check_in must be YYYY-MM-DD" }),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "check_out must be YYYY-MM-DD" }),
  guest_name: z.string().min(2, { message: "guest_name must be at least 2 characters" }).max(100),
  guest_email: z.string().email({ message: "guest_email must be a valid email" }),
  guest_phone: z.string().regex(/^(\+?\d{1,3}[- ]?)?\d{7,15}$/, { message: "guest_phone is invalid" }),
  guests: z.number().int().min(1).max(20).optional(),
  payment_status: z.enum(["pending", "failed", "pay_at_property"]).optional(),
})

export default async function (req: Request) {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ message: "Method not allowed", error: "METHOD_NOT_ALLOWED" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    })
  }

  const clientIp = getClientIp(req)
  const rateCheck = checkRateLimit(clientIp)
  if (!rateCheck.allowed) {
    return new Response(JSON.stringify({ message: "Too many requests. Please try again later.", error: "RATE_LIMITED" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(rateCheck.retryAfter) },
      status: 429,
    })
  }

  const contentLength = parseInt(req.headers.get("content-length") || "0", 10)
  if (contentLength > MAX_BODY_BYTES) {
    return new Response(JSON.stringify({ message: "Request too large", error: "REQUEST_TOO_LARGE" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 413,
    })
  }

  try {
    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      throw new Error("Invalid JSON in request body")
    }

    const parseResult = CreateBookingSchema.safeParse(rawBody)
    if (!parseResult.success) {
      const messages = parseResult.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; ")
      throw new Error(`Validation failed: ${messages}`)
    }

    const { room_id, check_in, check_out, guest_name: rawName, guest_email, guest_phone, guests, payment_status } = parseResult.data
    const guest_name = sanitizeString(rawName)

    const checkInDate = new Date(check_in)
    const checkOutDate = new Date(check_out)
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      throw new Error("Invalid date format")
    }
    if (checkOutDate <= checkInDate) {
      throw new Error("check_out must be after check_in")
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (checkInDate < today) {
      throw new Error("check_in cannot be in the past")
    }

    if (guest_name.length < 2 || guest_name.length > 100) {
      throw new Error("guest_name must be between 2 and 100 characters")
    }
    const baseUrl = Deno.env.get("INSFORGE_BASE_URL") || ""

    const anonKey = Deno.env.get("API_KEY") || ""

    if (!baseUrl || !anonKey) {
      throw new Error("Server configuration error")
    }

    const { database: db } = createClient({ baseUrl, anonKey })

    const { data: room, error: roomError } = await db
      .from("rooms")
      .select("price_per_night, max_guests, is_active, maintenance, discount_percent")
      .eq("id", room_id)
      .single()

    if (roomError) {
      console.error("create-booking: DB error fetching room:", roomError.message)
      return new Response(JSON.stringify({ message: "Database error, please try again", error: "DATABASE_ERROR" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 502,
      })
    }
    if (!room) {
      throw new Error("Room not found")
    }
    if (!room.is_active || room.maintenance) {
      throw new Error("Room is not available for booking")
    }

    const guestCount = guests || 1
    if (room.max_guests && guestCount > room.max_guests) {
      const label = room.max_guests === 1 ? "guest" : "guests"
      throw new Error(`Room capacity exceeded. Maximum ${room.max_guests} ${label} allowed.`)
    }

    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
    if (nights <= 0) throw new Error("Invalid dates")
    if (nights > 30) throw new Error("Maximum booking duration is 30 nights")

    const effectivePricePerNight = room.discount_percent && room.discount_percent > 0
      ? Math.round(room.price_per_night * (1 - room.discount_percent / 100))
      : room.price_per_night
    const total_price = nights * effectivePricePerNight

    const isPayAtProperty = payment_status === "pay_at_property"
    const advAmount = isPayAtProperty ? Math.round(total_price * 60) / 100 : total_price
    const balAmount = isPayAtProperty ? total_price - advAmount : 0

    // ── Generate trace_id for this booking lifecycle ──────────────
    const traceId = generateTraceId()

    // Expire stale pending_payment holds
    const now = new Date().toISOString()
    await db
      .from("bookings")
      .update({ booking_status: "expired", payment_status: "failed" })
      .eq("room_id", room_id)
      .eq("booking_status", "pending_payment")
      .lt("hold_expires_at", now)

    // ── DB-Enforced Double-Booking Prevention ───────────────────────
    // No SELECT conflict check needed.
    // The PostgreSQL EXCLUDE constraint `no_overlapping_active_bookings`
    // on `bookings` guarantees zero overlapping bookings per room
    // for active statuses (pending_payment, confirmed, checked_in).
    //
    // If a concurrent transaction inserts an overlapping booking first,
    // the EXCLUDE constraint raises error code 23P01 (exclusion_violation).
    // We catch this and return a clean "room unavailable" response.
    //
    // This eliminates the TOCTOU race window entirely.
    // ─────────────────────────────────────────────────────────────────

    const needsPayment = payment_status === "pending" || payment_status === "pay_at_property"
    const bookingStatus = needsPayment ? "pending_payment" : "confirmed"
    const holdExpiresAt = needsPayment
      ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
      : null

    const { data: booking, error: insertError } = await db
      .from("bookings")
      .insert({
        room_id,
        check_in,
        check_out,
        adults: guestCount,
        total_price,
        advance_amount: isPayAtProperty ? advAmount : null,
        balance_amount: isPayAtProperty ? balAmount : null,
        guest_name,
        guest_email,
        guest_phone,
        payment_status: payment_status || "pending",
        booking_status: bookingStatus,
        hold_expires_at: holdExpiresAt,
        source: "website",
        metadata: {
          trace_id: traceId,
          origin_system: "website",
        },
      })
      .select()
      .single()

    if (insertError) {
      // 23P01 = exclusion_constraint violation (no_overlapping_active_bookings)
      // 23505 = unique_violation (safety net for any UNIQUE constraints)
      const isOverlap = insertError.code === "23P01" || insertError.code === "23505"
      console.error(`create-booking: ${isOverlap ? "overlap" : "db"} error: ${insertError.code} ${insertError.message}`)
      return new Response(JSON.stringify({
        message: isOverlap ? "Room is no longer available for the selected dates" : "Database error, please try again",
        error: isOverlap ? "ROOM_UNAVAILABLE" : "DATABASE_ERROR",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: isOverlap ? 409 : 502,
      })
    }

    return new Response(JSON.stringify(booking), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : typeof error === "object" && error !== null ? JSON.stringify(error) : String(error)
    console.error("create-booking error:", message, error)
    return new Response(JSON.stringify({ message, error: "BOOKING_ERROR" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
}
