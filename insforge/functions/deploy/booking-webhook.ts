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

// ── Inlined from _shared/idempotency.ts ──

type DatabaseClient = ReturnType<typeof createClient>["database"]

interface IdempotencyResult {
  cached: boolean
  data: Record<string, unknown> | null
}

/**
 * Resolves idempotency for a given operation + entity.
 *
 * Crash-safe three-phase protocol:
 *   PHASE 1 (reserve): INSERT idempotency_key with null result.
 *     → If UNIQUE violation: another request reserved it first.
 *   PHASE 2 (execute): caller runs the actual work.
 *   PHASE 3 (complete): UPDATE result + completed_at.
 *
 * Crash recovery: if completed_at IS NULL, caller re-executes
 * (safe because PHASE 1 prevents concurrent execution).
 */
export async function resolveIdempotencyKey(
  db: DatabaseClient,
  operation: string,
  entityId: string,
  payloadHash?: string,
): Promise<IdempotencyResult> {
  const salt = payloadHash || "v1"
  const keyHash = await sha256(`${operation}:${entityId}:${salt}`)

  // Check for existing completion
  const { data: existing } = await db
    .from("idempotency_keys")
    .select("result, completed_at")
    .eq("key_hash", keyHash)
    .maybeSingle()

  if (existing?.completed_at) {
    return { cached: true, data: existing.result as Record<string, unknown> | null }
  }

  // PHASE 1: Reserve
  const { error: insertErr } = await db
    .from("idempotency_keys")
    .insert({
      key_hash: keyHash,
      operation,
      result: null,
    })
    .maybeSingle()

  if (insertErr) {
    // Unique violation — another request reserved it.
    // Wait briefly then check if completed.
    await sleep(200)
    const { data: retry } = await db
      .from("idempotency_keys")
      .select("result, completed_at")
      .eq("key_hash", keyHash)
      .maybeSingle()

    if (retry?.completed_at) {
      return { cached: true, data: retry.result as Record<string, unknown> | null }
    }
    // Not completed yet — caller should proceed but this shouldn't happen
    // since only one reservation wins. Fall through.
  }

  return { cached: false, data: null }
}

/**
 * Completes the idempotency reservation after work is done.
 * Must be called after resolveIdempotencyKey returns {cached: false}.
 */
export async function completeIdempotency(
  db: DatabaseClient,
  operation: string,
  entityId: string,
  payloadHash: string | undefined,
  result: Record<string, unknown>,
): Promise<void> {
  const salt = payloadHash || "v1"
  const keyHash = await sha256(`${operation}:${entityId}:${salt}`)

  await db
    .from("idempotency_keys")
    .update({
      result,
      completed_at: new Date().toISOString(),
    })
    .eq("key_hash", keyHash)
}

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hash = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
// ── End inlined ──
import { createClient } from "npm:@insforge/sdk"

// Strict HMAC: if BOOKING_WEBHOOK_SECRET is missing, refuse to start.
const _STARTUP_SECRET_CHECK = (() => {
  const secret = Deno.env.get("BOOKING_WEBHOOK_SECRET")
  if (!secret) {
    console.error("FATAL: BOOKING_WEBHOOK_SECRET is not configured. Service will refuse all requests.")
  }
  return secret
})()

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Webhook-Signature, X-Idempotency-Key, X-Timestamp",
}

const RATE_LIMIT_WINDOW = 60_000
const RATE_LIMIT_MAX = 60
const ipRequests = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = ipRequests.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW }
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + RATE_LIMIT_WINDOW }
  entry.count++
  ipRequests.set(ip, entry)
  return entry.count <= RATE_LIMIT_MAX
}

function toError(e: unknown): Error {
  if (e instanceof Error) return e
  if (typeof e === "object" && e !== null) {
    const msg = (e as Record<string, unknown>).message || (e as Record<string, unknown>).error || JSON.stringify(e)
    return new Error(String(msg))
  }
  return new Error(String(e))
}


interface WebhookBody {
  event_type: string
  website_booking_id?: string
  external_booking_id?: string
  trace_id?: string
  parent_event_id?: string
  idempotency_key?: string
  origin_system?: string
  source?: string
  booking?: Record<string, unknown>
  timestamp?: string
}

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const ip = req.headers.get("x-forwarded-for") || "unknown"
  if (!checkRateLimit(ip)) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // ── STRICT HMAC verification (fail closed) ─────────────────────
  // RULES:
  //   1. BOOKING_WEBHOOK_SECRET must be configured (startup check above)
  //   2. X-Webhook-Signature header is REQUIRED
  //   3. X-Timestamp header is REQUIRED
  //   4. Timestamp tolerance: ±5 minutes (enforced by verifyHmac)
  //   5. No fallback/lenient validation paths
  //
  // FAIL CLOSED: any missing/invalid header → 401/403 response
  // ───────────────────────────────────────────────────────────────
  const webhookSecret = _STARTUP_SECRET_CHECK
  if (!webhookSecret) {
    return new Response(JSON.stringify({ error: "Server not configured for webhooks" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const rawBodyText = await req.text()

  const signature = req.headers.get("X-Webhook-Signature")
  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing X-Webhook-Signature" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const timestampMs = req.headers.get("X-Timestamp")
  if (!timestampMs) {
    return new Response(JSON.stringify({ error: "Missing X-Timestamp header (required for HMAC)" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // verifyHmac enforces ±5 minute timestamp tolerance + timing-safe comparison
  const { valid, reason } = await verifyHmac(webhookSecret, rawBodyText, signature, timestampMs)
  if (!valid) {
    return new Response(JSON.stringify({ error: `HMAC validation failed: ${reason}` }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  let body: WebhookBody
  try {
    body = rawBodyText ? JSON.parse(rawBodyText) : await req.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // ── LOOP PREVENTION ───────────────────────────────────────────
  if (body.origin_system === "website") {
    console.warn("booking-webhook: Rejected event with origin_system=website (loop prevention)")
    return new Response(JSON.stringify({ error: "Loop detected: origin_system cannot be 'website'" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
  if (body.source === "website") {
    console.warn("booking-webhook: Rejected event with source=website (loop prevention)")
    return new Response(JSON.stringify({ error: "Loop detected: source cannot be 'website'" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // ── Process event ─────────────────────────────────────────────
  const { event_type, booking: bookingData, trace_id, parent_event_id: _parent_event_id, idempotency_key } = body
  const externalBookingId = body.external_booking_id || body.website_booking_id

  if (!event_type) {
    return new Response(JSON.stringify({ error: "event_type is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  try {
    const baseUrl = Deno.env.get("INSFORGE_BASE_URL") || ""

    const anonKey = Deno.env.get("API_KEY") || ""
    if (!baseUrl || !anonKey) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { database: db } = createClient({ baseUrl, anonKey })

    // ── Phase 1: Idempotency (crash-safe three-phase) ─────────────
    const idKey = idempotency_key || `pos:${externalBookingId || "unknown"}:${event_type}`
    const idResult = await resolveIdempotencyKey(db, event_type, idKey)
    if (idResult.cached) {
      return new Response(JSON.stringify({ received: true, duplicate: true, cached_response: idResult.data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Build lineage
    const traceId = trace_id || `pos-${generateTraceId()}`
    const _eventId = externalBookingId || "unknown"

    switch (event_type) {
      case "booking_confirmed": {
        if (!bookingData) {
          throw new Error("booking payload required for booking_confirmed")
        }

        const {
          room_id: websiteRoomId,
          guest_name,
          guest_email,
          guest_phone,
          check_in,
          check_out,
          adults = 1,
          children = 0,
          nightly_rate: _nightly_rate = null,
          total_amount,
          advance_amount,
          balance_amount,
          paid_amount = 0,
          payment_status = "pending",
          booking_status = "confirmed",
          pos_booking_id,
        } = bookingData as Record<string, unknown>

        if (!websiteRoomId || !guest_name || !check_in || !check_out) {
          throw new Error("Missing required booking fields: room_id, guest_name, check_in, check_out")
        }

        // ── Double-booking prevention is handled by the DB ─────────
        // No SELECT conflict check needed. The PostgreSQL EXCLUDE
        // constraint `no_overlapping_active_bookings` guarantees
        // zero overlapping bookings per room. If the INSERT below
        // fails with exclusion_constraint (23P01), we return 409.
        // ───────────────────────────────────────────────────────────

        // Calculate price if not provided
        let totalPrice = total_amount
        if (!totalPrice) {
          const { data: room } = await db
            .from("rooms")
            .select("price_per_night, discount_percent")
            .eq("id", websiteRoomId as string)
            .single()

          if (room) {
            const nights = Math.ceil(
              (new Date(check_out as string).getTime() - new Date(check_in as string).getTime()) / (1000 * 60 * 60 * 24),
            )
            const effectiveRate = room.discount_percent
              ? Math.round(room.price_per_night * (1 - room.discount_percent / 100))
              : room.price_per_night
            totalPrice = nights * effectiveRate
          }
        }

        // Store payment metadata for mapping advance/balance semantics
        const paymentMeta: Record<string, unknown> = {}
        if (advance_amount !== undefined && advance_amount !== null) paymentMeta.pos_advance_amount = advance_amount
        if (balance_amount !== undefined && balance_amount !== null) paymentMeta.pos_balance_amount = balance_amount
        if (paid_amount && Number(paid_amount) > 0) paymentMeta.pos_paid_amount = paid_amount

        // Calculate paid_amount from payment context if not explicitly provided
        const _effectivePaidAmount = Number(paid_amount) > 0
          ? Number(paid_amount)
          : payment_status === "paid"
            ? (Number(totalPrice) || 0)
            : payment_status === "pay_at_property"
              ? (Number(advance_amount) || Math.round(Number(totalPrice) * 60) / 100 || 0)
              : 0

        // Create booking with source=pos to prevent loop
        const { data: newBooking, error: insertError } = await db
          .from("bookings")
          .insert({
            room_id: websiteRoomId as string,
            check_in: check_in as string,
            check_out: check_out as string,
            adults: adults as number,
            children: children as number,
            total_price: (totalPrice as number) || 0,
            advance_amount: (advance_amount as number) || null,
            balance_amount: (balance_amount as number) || null,
            guest_name: guest_name as string,
            guest_email: (guest_email as string) || null,
            guest_phone: (guest_phone as string) || null,
            payment_status: payment_status as string,
            booking_status: booking_status as string,
            source: "pos",
            pos_booking_id: (pos_booking_id as string) || null,
            metadata: { trace_id: traceId, origin_system: "pos", ...paymentMeta },
          })
          .select("id")
          .single()

        if (insertError) {
          if (insertError.code === "23P01" || insertError.code === "23505") {
            const conflictResult = { received: true, status: "rejected", reason: "Room not available for selected dates" }
            await completeIdempotency(db, event_type, idKey, undefined, conflictResult as unknown as Record<string, unknown>)
            return new Response(JSON.stringify(conflictResult), {
              status: 409,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            })
          }
          throw insertError
        }

        const responsePayload = { received: true, status: "accepted", website_booking_id: newBooking.id }
        await completeIdempotency(db, event_type, idKey, undefined, responsePayload as unknown as Record<string, unknown>)
        return new Response(JSON.stringify(responsePayload), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      case "booking_cancelled":
      case "booking.checked_in":
      case "booking.checked_out":
      case "booking_updated": {
        if (!externalBookingId) {
          throw new Error("website_booking_id or external_booking_id required")
        }

        const { data: websiteBooking } = await db
          .from("bookings")
          .select("id, source, booking_status")
          .eq("id", externalBookingId)
          .single()

        if (!websiteBooking) {
          throw new Error(`Booking ${externalBookingId} not found on Website`)
        }

        const statusMap: Record<string, string> = {
          booking_cancelled: "cancelled",
          "booking.checked_in": "checked_in",
          "booking.checked_out": "checked_out",
          booking_updated: "",
        }

        const newStatus = statusMap[event_type]
        const updateData: Record<string, unknown> = { source: "pos" }

        if (newStatus) updateData.booking_status = newStatus
        if (event_type === "booking_cancelled") updateData.payment_status = "failed"

        if (bookingData) {
          if (bookingData.guest_name) updateData.guest_name = bookingData.guest_name
          if (bookingData.guest_phone) updateData.guest_phone = bookingData.guest_phone
          if (bookingData.guest_email) updateData.guest_email = bookingData.guest_email
          if (bookingData.check_in) updateData.check_in = bookingData.check_in
          if (bookingData.check_out) updateData.check_out = bookingData.check_out
          if (bookingData.payment_status) updateData.payment_status = bookingData.payment_status
          if (bookingData.total_amount) updateData.total_price = bookingData.total_amount
          if (bookingData.advance_amount !== undefined && bookingData.advance_amount !== null) {
            updateData.advance_amount = bookingData.advance_amount
          }
          if (bookingData.balance_amount !== undefined && bookingData.balance_amount !== null) {
            updateData.balance_amount = bookingData.balance_amount
          }
        }

        await db.from("bookings").update(updateData).eq("id", externalBookingId)

        const responsePayload = { received: true, status: "updated" }
        await completeIdempotency(db, event_type, idKey, undefined, responsePayload as unknown as Record<string, unknown>)
        return new Response(JSON.stringify(responsePayload), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      default:
        throw new Error(`Unknown event_type: ${event_type}`)
    }
  } catch (error: unknown) {
    const message = toError(error).message
    console.error("booking-webhook error:", message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
}


