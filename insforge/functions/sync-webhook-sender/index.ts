import { createClient } from "npm:@insforge/sdk"

function toError(e: unknown): Error {
  if (e instanceof Error) return e
  if (typeof e === "object" && e !== null) {
    const msg = (e as Record<string, unknown>).message || (e as Record<string, unknown>).error || JSON.stringify(e)
    return new Error(String(msg))
  }
  return new Error(String(e))
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

    const { data: events, error } = await db
      .from("sync_events")
      .select("*")
      .eq("processed", false)
      .order("created_at", { ascending: true })
      .limit(50)

    if (error) throw toError(error)
    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ message: "No pending events" }))
    }

    let delivered = 0
    let failed = 0

    for (const event of events) {
      const currentRetries = event.retry_count || 0
      const maxRetries = event.max_retries || 5
      if (currentRetries >= maxRetries) continue

      try {
        const payload = event.payload || {}
        const webhookPayload = JSON.stringify({
          event_type: event.event_type,
          external_booking_id: event.entity_id,
          website_room_id: payload.room_id,
          guest_name: payload.guest_name,
          guest_phone: payload.guest_phone,
          guest_email: payload.guest_email,
          check_in: payload.check_in,
          check_out: payload.check_out,
          adults: payload.adults || 1,
          children: payload.children || 0,
          nightly_rate: payload.nightly_rate || null,
          total_amount: payload.total_price || payload.total_amount,
          notes: payload.notes || null,
          source: event.source,
          idempotency_key: `website:${event.entity_id}:${event.event_type}`,
          timestamp: event.created_at,
        })

        const signature = await createHmacSignature(webhookSecret, webhookPayload)

        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Signature": signature,
            "X-Webhook-Event": event.event_type,
            "X-Webhook-Source": "highlands-website",
            "X-Idempotency-Key": `website:${event.entity_id}:${event.event_type}`,
          },
          body: webhookPayload,
        })

        if (response.ok) {
          await db
            .from("sync_events")
            .update({ processed: true, delivered_at: new Date().toISOString() })
            .eq("id", event.id)
          delivered++
        } else {
          const errorText = await response.text().catch(() => "Unknown error")
          console.error(`Webhook delivery failed for event ${event.id}: HTTP ${response.status} — ${errorText}`)
          await db
            .from("sync_events")
            .update({
              retry_count: currentRetries + 1,
              error_message: `HTTP ${response.status}: ${errorText}`,
              last_attempt_at: new Date().toISOString(),
            })
            .eq("id", event.id)
          failed++
        }
      } catch (err) {
        const msg = toError(err).message
        console.error(`Webhook delivery error for event ${event.id}: ${msg}`)
        await db
          .from("sync_events")
          .update({
            retry_count: currentRetries + 1,
            error_message: msg,
            last_attempt_at: new Date().toISOString(),
          })
          .eq("id", event.id)
          .catch(() => {})
        failed++
      }
    }

    return new Response(JSON.stringify({ delivered, failed, total: events.length }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error: unknown) {
    const message = toError(error).message
    return new Response(JSON.stringify({ error: message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    })
  }
}

async function createHmacSignature(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data))
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
}
