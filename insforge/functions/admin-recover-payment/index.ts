import { createClient } from "npm:@insforge/sdk"
import { z } from "https://esm.sh/zod@3.22.4"

const ALLOWED_ORIGINS: (string | RegExp)[] = [
  "https://6aiag3ra.insforge.site",
  "https://highlands-motel.com",
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
]

const MAX_RESULTS = 50
const MAX_BODY_BYTES = 65_536
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW = 60_000

interface RateLimitEntry { count: number; expires: number }
const rateLimitStore = new Map<string, RateLimitEntry>()

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

function getClientIp(request: Request): string {
  return request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(ip)
  if (entry && entry.expires < now) rateLimitStore.delete(ip)
  if (!entry || entry.expires < now) {
    rateLimitStore.set(ip, { count: 1, expires: now + RATE_LIMIT_WINDOW })
    return { allowed: true }
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfter: Math.ceil((entry.expires - now) / 1000) }
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

const ActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("list-stuck") }),
  z.object({ action: z.literal("search"), query: z.string().min(1).max(100) }),
  z.object({ action: z.literal("force-confirm"), booking_id: z.string().min(1), note: z.string().max(500).optional() }),
  z.object({ action: z.literal("force-expire"), booking_id: z.string().min(1), reason: z.string().max(500).optional() }),
])

function errorResponse(message: string, status = 400, corsHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: message }), {
    headers: { "Content-Type": "application/json", ...corsHeaders }, status,
  })
}

function successResponse(data: unknown, corsHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify({ success: true, ...(typeof data === "object" && data ? data : { data }) }), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  })
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1]
    return JSON.parse(new TextDecoder().decode(
      Uint8Array.from(atob(payload), c => c.charCodeAt(0))
    ))
  } catch {
    return null
  }
}

async function verifyAdminSession(request: Request): Promise<{ authorized: boolean; error?: string; errorStatus?: number }> {
  const authHeader = request.headers.get("authorization") || ""
  if (!authHeader.startsWith("Bearer ")) {
    return { authorized: false, error: "Unauthorized", errorStatus: 401 }
  }
  const jwt = authHeader.slice(7)

  const payload = decodeJwtPayload(jwt)
  if (!payload?.sub) {
    return { authorized: false, error: "Invalid or expired session", errorStatus: 401 }
  }

  const insforgeUrl = Deno.env.get("INSFORGE_BASE_URL") || Deno.env.get("SUPABASE_URL") || ""
  const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("API_KEY") || ""
  if (!insforgeUrl || !svcKey) {
    return { authorized: false, error: "Server configuration error", errorStatus: 500 }
  }

  try {
    const { database: db } = createClient({ baseUrl: insforgeUrl, anonKey: svcKey })
    const { data: adminRecord } = await db
      .from("admins")
      .select("id")
      .eq("user_id", payload.sub)
      .maybeSingle()

    if (!adminRecord) {
      return { authorized: false, error: "Admin access required", errorStatus: 403 }
    }
    return { authorized: true }
  } catch {
    return { authorized: false, error: "Authentication failed", errorStatus: 401 }
  }
}

export default async function handler(req: Request) {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") return errorResponse("Method not allowed", 405, corsHeaders)

  const clientIp = getClientIp(req)
  const rateCheck = checkRateLimit(clientIp)
  if (!rateCheck.allowed) {
    return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(rateCheck.retryAfter) },
      status: 429,
    })
  }

  const authCheck = await verifyAdminSession(req)
  if (!authCheck.authorized) {
    return errorResponse(authCheck.error || "Unauthorized", authCheck.errorStatus || 401, corsHeaders)
  }

  const contentLength = parseInt(req.headers.get("content-length") || "0", 10)
  if (contentLength > MAX_BODY_BYTES) {
    return errorResponse("Request body too large", 413, corsHeaders)
  }

  const insforgeUrl = Deno.env.get("INSFORGE_BASE_URL") || Deno.env.get("SUPABASE_URL") || ""
  const anonKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("API_KEY") || ""
  if (!insforgeUrl || !anonKey) return errorResponse("Database not configured", 500, corsHeaders)
  const { database: db } = createClient({ baseUrl: insforgeUrl, anonKey })

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return errorResponse("Invalid request body", 400, corsHeaders)
  }

  const parsed = ActionSchema.safeParse(rawBody)
  if (!parsed.success) {
    return errorResponse("Validation: " + parsed.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; "), 400, corsHeaders)
  }

  const { action } = parsed.data

  try {
    if (action === "list-stuck") {
      const { data: stuck, error: fetchErr } = await db
        .from("bookings")
        .select("*, rooms(name)")
        .eq("booking_status", "pending_payment")
        .lt("hold_expires_at", new Date().toISOString())
        .order("hold_expires_at", { ascending: true })
        .limit(MAX_RESULTS)

      if (fetchErr) return errorResponse(fetchErr.message, 500, corsHeaders)
      return successResponse({ bookings: stuck || [] }, corsHeaders)
    }

    if (action === "search") {
      const { query } = parsed.data
      const term = `%${query}%`

      const { data: bookings, error: bErr } = await db
        .from("bookings")
        .select("*, rooms(name)")
        .or(`id.ilike.${term},guest_name.ilike.${term},guest_email.ilike.${term},active_prn.ilike.${term}`)
        .limit(MAX_RESULTS)

      if (bErr) return errorResponse(bErr.message, 500, corsHeaders)

      const { data: payments, error: pErr } = await db
        .from("payments")
        .select("*, bookings(id, guest_name, guest_email, total_price)")
        .or(`prn.ilike.${term},booking_id.ilike.${term},fonepay_trace_id.ilike.${term}`)
        .limit(MAX_RESULTS)

      if (pErr) return errorResponse(pErr.message, 500, corsHeaders)

      return successResponse({ bookings: bookings || [], payments: payments || [] }, corsHeaders)
    }

    if (action === "force-confirm") {
      const { booking_id, note } = parsed.data

      const { data: payment } = await db
        .from("payments")
        .select("id, status, prn, amount")
        .eq("booking_id", booking_id)
        .maybeSingle()

      if (!payment) {
        return errorResponse("No payment record found for this booking. Use the booking ID or create a payment first.", 404, corsHeaders)
      }

      const { data: rpcResult, error: rpcErr } = await db.rpc("confirm_booking_payment", {
        p_payment_id: payment.id,
        p_booking_id: booking_id,
        p_prn: payment.prn,
        p_amount: payment.amount,
        p_fonepay_trace_id: "",
      }).single()

      if (rpcErr) return errorResponse("Database error: " + rpcErr.message, 500, corsHeaders)
      const result = rpcResult as Record<string, unknown>

      if (result.code === "IDEMPOTENT") {
        return successResponse({ message: "Booking was already confirmed", code: "IDEMPOTENT" }, corsHeaders)
      }

      if (!result.success) {
        return errorResponse(String(result.message || "Failed to confirm booking"), 409, corsHeaders)
      }

      await db.from("payment_events").insert({
        payment_id: payment.id,
        booking_id,
        event_type: "payment_completed",
        old_status: "pending",
        new_status: "paid",
        payload: { action: "admin-force-confirm", note: note || "Admin recovery", prn: payment.prn },
      })

      return successResponse({ message: "Booking confirmed successfully", code: "SUCCESS" }, corsHeaders)
    }

    if (action === "force-expire") {
      const { booking_id, reason } = parsed.data

      const { error: updateErr } = await db
        .from("bookings")
        .update({ booking_status: "expired", payment_status: "failed", hold_expires_at: null })
        .eq("id", booking_id)
        .eq("booking_status", "pending_payment")

      if (updateErr) return errorResponse("Failed to expire booking: " + updateErr.message, 500, corsHeaders)

      await db.from("payment_events").insert({
        booking_id,
        event_type: "payment_failed",
        old_status: "pending_payment",
        new_status: "expired",
        payload: { action: "admin-force-expire", reason: reason || "Admin override" },
      })

      return successResponse({ message: "Booking expired and inventory released" }, corsHeaders)
    }

    return errorResponse("Unknown action", 400, corsHeaders)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error"
    console.error("admin-recover-payment error:", err)
    return errorResponse(msg, 500, corsHeaders)
  }
}
