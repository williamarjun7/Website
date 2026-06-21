import { createClient } from "npm:@insforge/sdk"

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
  last_error: string | null
  created_at: string
}

interface ReconcileResult {
  reconciled: number
  skipped: number
  errors: number
  details: Array<{
    id: string
    event_type: string
    entity_id: string
    action: string
    error?: string
  }>
}

async function sendSyncEvent(
  webhookUrl: string,
  webhookSecret: string,
  payload: Record<string, unknown>,
): Promise<{ success: boolean; statusCode: number; body: string }> {
  const timestampMs = Date.now()
  const encoder = new TextEncoder()
  const body = JSON.stringify(payload)
  const key = await crypto.subtle.importKey("raw", encoder.encode(webhookSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(`${body}.${timestampMs}`))
  const signature = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("")

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Timestamp": String(timestampMs),
        "X-Idempotency-Key": `replay:${payload.id || "unknown"}`,
      },
      body,
      signal: AbortSignal.timeout(15000),
    })
    const bodyText = await response.text()
    return { success: response.ok, statusCode: response.status, body: bodyText }
  } catch (err) {
    return { success: false, statusCode: 0, body: err instanceof Error ? err.message : "Network error" }
  }
}

export default async function handler(): Promise<Response> {
  try {
    const baseUrl = Deno.env.get("INSFORGE_BASE_URL") || Deno.env.get("SUPABASE_URL") || ""
    const anonKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("API_KEY") || ""

    if (!baseUrl || !anonKey) {
      return new Response(JSON.stringify({ error: "Server config error" }), { status: 500 })
    }

    const webhookUrl = Deno.env.get("POS_WEBHOOK_URL")
    const webhookSecret = Deno.env.get("POS_WEBHOOK_SECRET") || ""

    if (!webhookUrl) {
      return new Response(JSON.stringify({ error: "POS_WEBHOOK_URL not configured", reconciled: 0 }), {
        headers: { "Content-Type": "application/json" },
      })
    }

    const { database: db } = createClient({ baseUrl, anonKey })

    // Fetch dead-letter events that are eligible for replay
    // Only replay events from website (not POS-originated loops)
    // Max 20 per run to avoid thundering herd
    const { data: deadLetterEvents, error } = await db
      .from("sync_events")
      .select("*")
      .eq("status", "dead_letter")
      .eq("origin_system", "website")
      .order("created_at", { ascending: true })
      .limit(20)

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    const events = (deadLetterEvents || []) as SyncEvent[]
    const result: ReconcileResult = { reconciled: 0, skipped: 0, errors: 0, details: [] }

    for (const event of events) {
      try {
        // Reset retry count and set to retrying (fresh start)
        await db
          .from("sync_events")
          .update({
            status: "retrying",
            retry_count: 0,
            last_error: "Re-attempting via reconcile-cron",
            next_retry_at: new Date().toISOString(),
          })
          .eq("id", event.id)

        // Attempt immediate delivery
        const webhookPayload = {
          event_type: event.event_type,
          website_booking_id: event.entity_id,
          trace_id: event.trace_id,
          parent_event_id: event.parent_event_id,
          idempotency_key: `reconcile:${event.id}`,
          origin_system: "website",
          timestamp: new Date().toISOString(),
          booking: {
            website_booking_id: event.entity_id,
            room_id: event.payload?.room_id,
            guest_name: event.payload?.guest_name,
            guest_email: event.payload?.guest_email,
            guest_phone: event.payload?.guest_phone,
            check_in: event.payload?.check_in,
            check_out: event.payload?.check_out,
            adults: event.payload?.adults || 1,
            total_amount: event.payload?.total_price || event.payload?.total_amount,
            payment_status: event.payload?.payment_status || "unpaid",
            booking_status: event.payload?.booking_status || "pending",
            pos_booking_id: event.payload?.pos_booking_id || null,
          },
        }

        const delivery = await sendSyncEvent(webhookUrl, webhookSecret, webhookPayload)

        if (delivery.success) {
          await db
            .from("sync_events")
            .update({
              status: "processed",
              last_error: null,
              response_body: delivery.body,
            })
            .eq("id", event.id)

          result.reconciled++
          result.details.push({
            id: event.id,
            event_type: event.event_type,
            entity_id: event.entity_id,
            action: "delivered",
          })
        } else {
          // Non-retryable — keep as dead_letter but update error
          await db
            .from("sync_events")
            .update({
              status: "dead_letter",
              last_error: `Reconcile failed: HTTP ${delivery.statusCode} — ${delivery.body.substring(0, 200)}`,
            })
            .eq("id", event.id)

          result.skipped++
          result.details.push({
            id: event.id,
            event_type: event.event_type,
            entity_id: event.entity_id,
            action: "still_dead",
            error: `HTTP ${delivery.statusCode}`,
          })
        }
      } catch (err) {
        result.errors++
        result.details.push({
          id: event.id,
          event_type: event.event_type,
          entity_id: event.entity_id,
          action: "error",
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    return new Response(JSON.stringify(result, null, 2), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("reconcile-dead-letter error:", message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
