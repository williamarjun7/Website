import { createClient } from "npm:@insforge/sdk"
import { verifyHmac, generateTraceId } from "../_shared/sync-harden.ts"
import { resolveIdempotencyKey, completeIdempotency } from "../_shared/idempotency.ts"

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

  // ── HMAC verification with ±300s timestamp tolerance ──────────
  const webhookSecret = Deno.env.get("BOOKING_WEBHOOK_SECRET")
  let rawBodyText: string | null = null

  if (webhookSecret) {
    rawBodyText = await req.text()

    const signature = req.headers.get("X-Webhook-Signature")
    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing X-Webhook-Signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const timestampMs = req.headers.get("X-Timestamp")

    if (timestampMs) {
      // Strict validation: HMAC over payload.timestamp with ±5min tolerance
      const { valid, reason } = await verifyHmac(webhookSecret, rawBodyText, signature, timestampMs)
      if (!valid) {
        return new Response(JSON.stringify({ error: `HMAC validation failed: ${reason}` }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
    } else {
      // Lenient fallback: raw body HMAC (backward compat with POS website-sync)
      console.warn("booking-webhook: Missing X-Timestamp header — using lenient HMAC validation")
      const expectedSig = await hmacSha256Hex(webhookSecret, rawBodyText)
      if (signature !== expectedSig) {
        return new Response(JSON.stringify({ error: "Invalid HMAC signature" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
    }
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
  const { event_type, booking: bookingData, trace_id, parent_event_id, idempotency_key } = body
  const externalBookingId = body.external_booking_id || body.website_booking_id

  if (!event_type) {
    return new Response(JSON.stringify({ error: "event_type is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  try {
    const baseUrl = Deno.env.get("INSFORGE_BASE_URL") || Deno.env.get("SUPABASE_URL") || ""
    const anonKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("API_KEY") || ""

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
    const eventId = externalBookingId || "unknown"

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
          nightly_rate = null,
          total_amount,
          advance_amount,
          balance_amount,
          payment_status = "pending",
          booking_status = "confirmed",
          pos_booking_id,
        } = bookingData as Record<string, unknown>

        if (!websiteRoomId || !guest_name || !check_in || !check_out) {
          throw new Error("Missing required booking fields: room_id, guest_name, check_in, check_out")
        }

        // Check for conflicts on the Website side
        const { data: conflicts } = await db
          .from("bookings")
          .select("id, guest_name, check_in, check_out")
          .eq("room_id", websiteRoomId as string)
          .in("booking_status", ["confirmed", "checked_in"])
          .lt("check_in", check_out as string)
          .gt("check_out", check_in as string)
          .limit(5)

        if (conflicts && conflicts.length > 0) {
          const conflictResult = { received: true, status: "rejected", reason: "Room not available for selected dates", conflicts }
          // Mark idempotency as completed so retries get cached response
          await completeIdempotency(db, event_type, idKey, undefined, conflictResult as unknown as Record<string, unknown>)
          return new Response(JSON.stringify(conflictResult), {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          })
        }

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
            advance_amount: advance_amount as number | null || null,
            balance_amount: balance_amount as number | null || null,
            guest_name: guest_name as string,
            guest_email: (guest_email as string) || null,
            guest_phone: (guest_phone as string) || null,
            payment_status: payment_status as string,
            booking_status: booking_status as string,
            source: "pos",
            pos_booking_id: (pos_booking_id as string) || null,
            metadata: { trace_id: traceId, origin_system: "pos" },
          })
          .select("id")
          .single()

        if (insertError) throw insertError

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
          if (bookingData.check_in) updateData.check_in = bookingData.check_in
          if (bookingData.check_out) updateData.check_out = bookingData.check_out
          if (bookingData.payment_status) updateData.payment_status = bookingData.payment_status
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

async function hmacSha256Hex(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey("raw", encoder.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("")
}
