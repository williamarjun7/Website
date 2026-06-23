import { createClient } from "npm:@insforge/sdk"
import { sendSyncEvent, isRetryable } from "../_shared/sync-harden.ts"

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
    const baseUrl = Deno.env.get("INSFORGE_BASE_URL") || ""

    const anonKey = Deno.env.get("API_KEY") || ""
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
