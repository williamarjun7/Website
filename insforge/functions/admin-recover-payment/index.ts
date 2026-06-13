// Admin payment recovery endpoint.
// POST /functions/admin-recover-payment
// Authorization: Bearer <admin-jwt> (sent by insforge.functions.invoke automatically)
//
// Actions:
//   { action: "list-stuck" } → returns all pending_payment bookings past their hold
//   { action: "search", query: "..." } → search bookings + payments by ID/email/PRN
//   { action: "force-confirm", booking_id, payment_id?, note } → atomic force-confirm via stored proc
//   { action: "force-expire", booking_id, reason } → expire booking, release hold

import { createClient } from "npm:@insforge/sdk"

const MAX_RESULTS = 50

function errorResponse(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    headers: { "Content-Type": "application/json" }, status,
  })
}

function successResponse(data: unknown): Response {
  return new Response(JSON.stringify({ success: true, ...(typeof data === "object" && data ? data : { data }) }), {
    headers: { "Content-Type": "application/json" },
  })
}

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, content-type" } })
  }

  if (req.method !== "POST") return errorResponse("Method not allowed", 405)

  // Verify admin JWT
  const authHeader = req.headers.get("authorization") || ""
  if (!authHeader.startsWith("Bearer ")) {
    return errorResponse("Unauthorized", 401)
  }
  const jwt = authHeader.slice(7)

  const baseUrl = Deno.env.get("INSFORGE_BASE_URL") || Deno.env.get("SUPABASE_URL") || ""
  if (!baseUrl) return errorResponse("Server configuration error", 500)

  // Verify the JWT by creating a client with it and checking getCurrentUser
  const { auth: authClient } = createClient({ baseUrl, anonKey: jwt })
  try {
    const { data: userData, error: userErr } = await authClient.getCurrentUser()
    if (userErr || !userData?.user) {
      return errorResponse("Unauthorized: invalid session", 401)
    }
    const user = userData.user

    // Check admin role via user_metadata or a DB check
    const isAdmin = user.role === "service_role" ||
      user.email === "admin@6aiag3ra.insforge.site" ||
      (user.user_metadata as Record<string, unknown>)?.role === "admin"

    if (!isAdmin) {
      return errorResponse("Unauthorized: admin access required", 403)
    }
  } catch {
    return errorResponse("Authentication failed", 401)
  }

  // Now create a service-role client for the actual DB operations
  const anonKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("API_KEY") || ""
  if (!anonKey) return errorResponse("Database not configured", 500)
  const { database: db } = createClient({ baseUrl, anonKey })

  let body: unknown
  try { body = await req.json() } catch { return errorResponse("Invalid request body") }
  if (!body || typeof body !== "object") return errorResponse("Invalid request")

  const { action } = body as Record<string, unknown>
  if (!action || typeof action !== "string") return errorResponse("Missing action field")

  try {
    if (action === "list-stuck") {
      // Find bookings stuck in pending_payment past their hold
      const { data: stuck, error: fetchErr } = await db
        .from("bookings")
        .select("*, rooms(name)")
        .eq("booking_status", "pending_payment")
        .lt("hold_expires_at", new Date().toISOString())
        .order("hold_expires_at", { ascending: true })
        .limit(MAX_RESULTS)

      if (fetchErr) return errorResponse(fetchErr.message, 500)
      return successResponse({ bookings: stuck || [] })
    }

    if (action === "search") {
      const { query } = body as Record<string, unknown>
      if (!query || typeof query !== "string") return errorResponse("Missing query")

      const term = `%${query}%`

      // Search bookings
      const { data: bookings, error: bErr } = await db
        .from("bookings")
        .select("*, rooms(name)")
        .or(`id.ilike.${term},guest_name.ilike.${term},guest_email.ilike.${term},active_prn.ilike.${term}`)
        .limit(MAX_RESULTS)

      if (bErr) return errorResponse(bErr.message, 500)

      // Search payments
      const { data: payments, error: pErr } = await db
        .from("payments")
        .select("*, bookings(id, guest_name, guest_email, total_price)")
        .or(`prn.ilike.${term},booking_id.ilike.${term},fonepay_trace_id.ilike.${term}`)
        .limit(MAX_RESULTS)

      if (pErr) return errorResponse(pErr.message, 500)

      return successResponse({ bookings: bookings || [], payments: payments || [] })
    }

    if (action === "force-confirm") {
      const { booking_id, note } = body as Record<string, unknown>
      if (!booking_id || typeof booking_id !== "string") return errorResponse("Missing booking_id")

      // Check for an existing payment record
      const { data: payment } = await db
        .from("payments")
        .select("id, status, prn, amount")
        .eq("booking_id", booking_id)
        .maybeSingle()

      if (!payment) {
        return errorResponse("No payment record found for this booking. Use the booking ID or create a payment first.", 404)
      }

      // Use the stored procedure for atomic confirmation
      const { data: rpcResult, error: rpcErr } = await db.rpc("confirm_booking_payment", {
        p_payment_id: payment.id,
        p_booking_id: booking_id,
        p_prn: payment.prn,
        p_amount: payment.amount,
        p_fonepay_trace_id: "",
      }).single()

      if (rpcErr) return errorResponse("Database error: " + rpcErr.message, 500)
      const result = rpcResult as Record<string, unknown>

      if (result.code === "IDEMPOTENT") {
        return successResponse({ message: "Booking was already confirmed", code: "IDEMPOTENT" })
      }

      if (!result.success) {
        return errorResponse(String(result.message || "Failed to confirm booking"), 409)
      }

      // Log the admin action
      await db.from("payment_events").insert({
        payment_id: payment.id,
        booking_id,
        event_type: "payment_completed",
        old_status: "pending",
        new_status: "paid",
        payload: { action: "admin-force-confirm", note: note || "Admin recovery", prn: payment.prn },
      })

      return successResponse({ message: "Booking confirmed successfully", code: "SUCCESS" })
    }

    if (action === "force-expire") {
      const { booking_id, reason } = body as Record<string, unknown>
      if (!booking_id || typeof booking_id !== "string") return errorResponse("Missing booking_id")

      const { error: updateErr } = await db
        .from("bookings")
        .update({ booking_status: "expired", payment_status: "failed", hold_expires_at: null })
        .eq("id", booking_id)
        .eq("booking_status", "pending_payment")

      if (updateErr) return errorResponse("Failed to expire booking: " + updateErr.message, 500)

      await db.from("payment_events").insert({
        booking_id,
        event_type: "payment_failed",
        old_status: "pending_payment",
        new_status: "expired",
        payload: { action: "admin-force-expire", reason: reason || "Admin override" },
      })

      return successResponse({ message: "Booking expired and inventory released" })
    }

    return errorResponse("Unknown action", 400)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error"
    return errorResponse(msg, 500)
  }
}
