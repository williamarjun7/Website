import { createClient } from "npm:@insforge/sdk"
import { z } from "https://esm.sh/zod@3.22.4"

const ALLOWED_ORIGINS: (string | RegExp)[] = [
  "https://6aiag3ra.insforge.site",
  "https://highlands-motel.com",
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
]

function isOriginAllowed(origin: string): boolean {
  return ALLOWED_ORIGINS.some(a => typeof a === "string" ? a === origin : a.test(origin))
}

const FETCH_TIMEOUT_MS = 15_000
const HOLD_DURATION_MS = 15 * 60 * 1000
const MAX_BODY_BYTES = 65_536

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

async function fetchWithTimeout(url: string, options: RequestInit & { timeout?: number } = {}): Promise<Response> {
  const { timeout = FETCH_TIMEOUT_MS, ...fetchOptions } = options
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, { ...fetchOptions, signal: controller.signal })
    return res
  } finally {
    clearTimeout(timer)
  }
}

function htmlEncode(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;")
}

async function hmacSha512(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false, ["sign"]
  )
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data))
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
}

async function verifyFonepayResponseSignature(
  merchantSecret: string,
  merchantCode: string,
  fonepayResult: Record<string, unknown>
): Promise<boolean> {
  const responseDv = fonepayResult.dataValidation as string | undefined
  if (!responseDv) return false

  const expectedFields = [
    String(fonepayResult.fonepayTraceId ?? ""),
    String(fonepayResult.amount ?? "0"),
    String(fonepayResult.prn ?? ""),
    merchantCode,
    String(fonepayResult.paymentStatus ?? ""),
  ]
  const dataToHash = expectedFields.join(",")
  const computedDv = await hmacSha512(merchantSecret, dataToHash)
  return computedDv === responseDv
}

function generateSecurePrn(bookingId: string): string {
  const ts = Date.now()
  const rand = crypto.randomUUID().replace(/-/g, "")
  return `HIGHLANDS_${bookingId}_${ts}_${rand}`
}

function extractBookingId(prn: string): string | null {
  const prefix = "HIGHLANDS_"
  if (!prn.startsWith(prefix)) return null
  const afterPrefix = prn.slice(prefix.length)
  const idx = afterPrefix.indexOf("_")
  if (idx <= 0) return null
  return afterPrefix.slice(0, idx)
}

async function logEvent(db: ReturnType<typeof createClient>["database"] | null, event: {
  payment_id?: string
  booking_id: string
  event_type: string
  old_status?: string
  new_status?: string
  payload?: unknown
}) {
  if (!db) return
  try {
    await db.from("payment_events").insert({
      payment_id: event.payment_id || null,
      booking_id: event.booking_id,
      event_type: event.event_type,
      old_status: event.old_status || null,
      new_status: event.new_status || null,
      payload: event.payload || {},
    })
  } catch {
    // best-effort audit; never fail the request
  }
}

interface EmailData { to: string; subject: string; html: string }

async function sendEmail(data: EmailData): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY")
  if (!apiKey) { console.warn("RESEND_API_KEY not set — skipping email"); return }
  const from = Deno.env.get("EMAIL_FROM") || "Highlands Motel <noreply@highlands-motel.com>"
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: data.to, subject: data.subject, html: data.html }),
    })
    if (!res.ok) console.error(`Email send failed: ${res.status} ${await res.text().catch(() => "")}`)
  } catch (e) {
    console.error("Email send error:", e)
  }
}

function buildConfirmationHtml(params: { guestName: string; roomName: string; checkIn: string; checkOut: string; totalPrice: number; advanceAmount?: number; balanceAmount?: number; bookingId: string }): string {
  const ge = htmlEncode
  const advance = params.advanceAmount ?? params.totalPrice
  const balance = params.balanceAmount ?? 0
  const isPartial = !!params.advanceAmount
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;padding:24px;max-width:600px"><h2 style="color:#92400e">Booking Confirmed — Highlands Motel &amp; Cafe</h2><p>Dear ${ge(params.guestName)},</p><p>Your booking at Highlands Motel &amp; Cafe has been confirmed.</p><table style="width:100%;border-collapse:collapse;margin:16px 0"><tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Room</td><td style="padding:8px;border-bottom:1px solid #eee"><strong>${ge(params.roomName)}</strong></td></tr><tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Check-in</td><td style="padding:8px;border-bottom:1px solid #eee"><strong>${ge(params.checkIn)}</strong></td></tr><tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Check-out</td><td style="padding:8px;border-bottom:1px solid #eee"><strong>${ge(params.checkOut)}</strong></td></tr><tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Total Booking Amount</td><td style="padding:8px;border-bottom:1px solid #eee"><strong>NPR ${params.totalPrice.toLocaleString()}</strong></td></tr>${isPartial ? `<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Advance Payment (60%)</td><td style="padding:8px;border-bottom:1px solid #eee"><strong>NPR ${advance.toLocaleString()}</strong></td></tr><tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Balance at Property (40%)</td><td style="padding:8px;border-bottom:1px solid #eee"><strong>NPR ${balance.toLocaleString()}</strong></td></tr>` : ''}<tr><td style="padding:8px;color:#666">Booking ID</td><td style="padding:8px"><code>${ge(params.bookingId)}</code></td></tr></table><p style="color:#666;font-size:14px">If you have any questions, contact us at the property.</p><p style="font-size:12px;color:#999">— Highlands Motel &amp; Cafe</p></body></html>`
}

// ─── Zod Schemas ──────────────────────────────────────────────────────────

const GenerateQrSchema = z.object({
  action: z.literal("generate-qr"),
  orderId: z.string(),
  remarks1: z.string().optional().default("Payment"),
  remarks2: z.string().optional().default(""),
})

const GenerateWebSchema = z.object({
  action: z.literal("generate-web"),
  orderId: z.string(),
  remarks1: z.string().optional().default("Payment"),
  remarks2: z.string().optional().default(""),
})

const VerifyQrSchema = z.object({
  action: z.literal("verify-qr"),
  prn: z.string(),
})

const VerifyWebSchema = z.object({
  action: z.literal("verify-web"),
  prn: z.string(),
  uid: z.string(),
  amount: z.string(),
  pid: z.string().optional(),
  bankCode: z.string().optional().default(""),
})

const PostTaxRefundSchema = z.object({
  action: z.literal("post-tax-refund"),
  prn: z.string(),
  fonepayTraceId: z.union([z.string(), z.number()]),
  invoiceNumber: z.string(),
  invoiceDate: z.string(),
  transactionAmount: z.union([z.string(), z.number()]),
})

// NOTE: handle-callback action has been REMOVED for security.
// The Fonepay web payment redirect is handled by the frontend at /payment-result
// which calls the verify-web action. The GET handler (which allowed
// unauthenticated payment forgery) has also been removed.

const RequestSchema = z.discriminatedUnion("action", [
  GenerateQrSchema,
  GenerateWebSchema,
  VerifyQrSchema,
  VerifyWebSchema,
  PostTaxRefundSchema,
])

type AppError = { message: string; error: string }

function errorResponse(message: string, status = 400, corsHeaders?: Record<string, string>): Response {
  const body: AppError = { message, error: "PAYMENT_ERROR" }
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
    status,
  })
}

// ─── Rate Limiting ───────────────────────────────────────────────────────
interface RateLimitEntry { count: number; expires: number }
const rateLimitStore = new Map<string, RateLimitEntry>()
const RATE_LIMIT_MAX = 20
const RATE_LIMIT_WINDOW = 60_000

function getClientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")
    || request.headers.get("x-real-ip")
    || "unknown"
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

// ─── Payment confirmation helper (uses atomic DB function) ────────────────

async function confirmPayment(
  db: ReturnType<typeof createClient>["database"],
  paymentRecord: { id: string; status: string },
  bookingId: string,
  prn: string,
  amount: number,
  fonepayTraceId: string | null,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (paymentRecord.status === "completed") {
    await logEvent(db, { booking_id: bookingId, event_type: "idempotency_hit", payment_id: paymentRecord.id, payload: { prn } })
    return new Response(JSON.stringify({ success: true, message: "Payment already verified" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // Use atomic stored procedure (transaction-safe)
  const { data: result, error: rpcError } = await db.rpc("confirm_booking_payment", {
    p_payment_id: paymentRecord.id,
    p_booking_id: bookingId,
    p_prn: prn,
    p_amount: amount,
    p_fonepay_trace_id: fonepayTraceId || "",
  }).single()

  if (rpcError) {
    await logEvent(db, {
      booking_id: bookingId, event_type: "payment_failed",
      payment_id: paymentRecord.id, payload: { prn, error: "RPC call failed: " + rpcError.message },
    })
    return errorResponse("Payment confirmation failed", 500, corsHeaders)
  }

  const rpcResult = result as Record<string, unknown>

  if (!rpcResult.success) {
    const code = String(rpcResult.code || "")
    if (code === "IDEMPOTENT") {
      return new Response(JSON.stringify({ success: true, message: "Payment already verified" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    await logEvent(db, {
      booking_id: bookingId, event_type: "payment_failed",
      payment_id: paymentRecord.id, payload: { prn, reason: String(rpcResult.message || "Unknown"), code },
    })
    return errorResponse(String(rpcResult.message || "Payment processing failed"), 409, corsHeaders)
  }

  await logEvent(db, {
    payment_id: paymentRecord.id, booking_id: bookingId,
    event_type: "payment_completed",
    old_status: "pending", new_status: "paid",
    payload: { prn, amount },
  })

  await logEvent(db, {
    payment_id: paymentRecord.id, booking_id: bookingId,
    event_type: "booking_confirmed",
    payload: { prn, amount },
  })
  ;(async () => {
    try {
      const { data: booking } = await db
        .from("bookings")
        .select("id, guest_name, guest_email, check_in, check_out, room_id, total_price, advance_amount, balance_amount")
        .eq("id", bookingId)
        .single()
      if (!booking) return
      const { data: room } = await db
        .from("rooms")
        .select("name")
        .eq("id", booking.room_id)
        .single()
      const roomName = room?.name || "Selected Room"
      await sendEmail({
        to: booking.guest_email,
        subject: "Booking Confirmed — Highlands Motel & Cafe",
        html: buildConfirmationHtml({
          guestName: booking.guest_name,
          roomName,
          checkIn: booking.check_in,
          checkOut: booking.check_out,
          totalPrice: booking.total_price,
          advanceAmount: booking.advance_amount || undefined,
          balanceAmount: booking.balance_amount || undefined,
          bookingId: booking.id,
        }),
      })
    } catch { /* best-effort */ }
  })()

  return new Response(JSON.stringify({ success: true, message: "Payment verified successfully" }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

// ─── Session JWT verification ──────────────────────────────────────────────

async function verifySession(request: Request): Promise<{ authorized: boolean; user?: { id: string; email: string }; error?: string }> {
  const authHeader = request.headers.get("authorization") || ""
  const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""

  if (!jwt) {
    return { authorized: false, error: "Missing authorization header" }
  }

  const insforgeUrl = Deno.env.get("INSFORGE_BASE_URL") || Deno.env.get("SUPABASE_URL") || ""
  if (!insforgeUrl) return { authorized: false, error: "Server configuration error" }

  try {
    const { auth: authClient } = createClient({ baseUrl: insforgeUrl, anonKey: jwt })
    const { data: userData, error: userErr } = await authClient.getCurrentUser()
    if (userErr || !userData?.user) {
      return { authorized: false, error: "Invalid or expired session" }
    }
    return { authorized: true, user: { id: userData.user.id, email: userData.user.email || "" } }
  } catch {
    return { authorized: false, error: "Authentication failed" }
  }
}

// ─── Admin JWT verification ────────────────────────────────────────────────

async function verifyAdminJwt(request: Request): Promise<{ authorized: boolean; error?: string }> {
  const authHeader = request.headers.get("authorization") || ""
  const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""

  if (!jwt) {
    return { authorized: false, error: "Missing authorization header" }
  }

  const insforgeUrl = Deno.env.get("INSFORGE_BASE_URL") || Deno.env.get("SUPABASE_URL") || ""
  if (!insforgeUrl) return { authorized: false, error: "Server configuration error" }

  try {
    const { auth: authClient } = createClient({ baseUrl: insforgeUrl, anonKey: jwt })
    const { data: userData, error: userErr } = await authClient.getCurrentUser()
    if (userErr || !userData?.user) {
      return { authorized: false, error: "Invalid or expired session" }
    }

    const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("API_KEY") || ""
    if (!svcKey) return { authorized: false, error: "Server configuration error" }

    const { database: adminDb } = createClient({ baseUrl: insforgeUrl, anonKey: svcKey })
    const { data: adminRecord } = await adminDb
      .from("admins")
      .select("id")
      .eq("user_id", userData.user.id)
      .maybeSingle()

    if (!adminRecord) return { authorized: false, error: "Admin access required" }

    return { authorized: true }
  } catch {
    return { authorized: false, error: "Authentication failed" }
  }
}

// ─── Main Handler ──────────────────────────────────────────────────────────

export default async function handler(req: Request) {
  const corsHeaders = getCorsHeaders(req)
  const _err = (m: string, s = 400) => errorResponse(m, s, corsHeaders)

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  // POST only. GET is not supported (removed for security).
  if (req.method !== "POST") {
    const url = new URL(req.url)
    if (req.method === "GET" && url.searchParams.has("PRN")) {
      return _err("Callback endpoint removed. Use POST verify-web instead.", 410)
    }
    return _err("Method not allowed", 405)
  }

  // Rate limiting
  const clientIp = getClientIp(req)
  const rateCheck = checkRateLimit(clientIp)
  if (!rateCheck.allowed) {
    return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(rateCheck.retryAfter) },
      status: 429,
    })
  }

  // Body size limit
  const contentLength = parseInt(req.headers.get("content-length") || "0", 10)
  if (contentLength > MAX_BODY_BYTES) {
    return new Response(JSON.stringify({ error: "Request too large" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 413,
    })
  }

  const merchantCode = Deno.env.get("FONEPAY_PG_MERCHANT_CODE") || ""
  const merchantSecret = Deno.env.get("FONEPAY_PG_MERCHANT_SECRET") || ""
  const baseUrl = Deno.env.get("FONEPAY_PG_URL") || ""
  const dynamicQrUrl = Deno.env.get("FONEPAY_DYNAMICQR_URL") || ""
  const username = Deno.env.get("FONEPAY_USERNAME") || ""
  const password = Deno.env.get("FONEPAY_PASSWORD") || ""
  const callbackUrl = Deno.env.get("FONEPAY_PG_CALLBACK_URL") || ""

    if (!merchantCode || !merchantSecret) {
      return _err("Payment gateway not configured", 500, corsHeaders)
    }

  try {
    const insforgeUrl = Deno.env.get("INSFORGE_BASE_URL") || Deno.env.get("SUPABASE_URL") || ""
    const anonKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("API_KEY") || ""
    if (!insforgeUrl || !anonKey) {
      return _err("Database not configured", 500, corsHeaders)
    }
    const { database: db } = createClient({ baseUrl: insforgeUrl, anonKey })

    let body: unknown
    try { body = await req.json() } catch {
      try {
        const formData = await req.formData()
        const entries: Record<string, string> = {}
        for (const [k, v] of formData.entries()) {
          entries[k] = String(v)
        }
        body = entries
      } catch {
        return _err("Invalid request body")
      }
    }

    if (!body || typeof body !== "object") {
      return _err("Invalid request", 400, corsHeaders)
    }

    const action = (body as Record<string, unknown>)?.action as string
    if (!action) {
      return _err("Missing action field", 400, corsHeaders)
    }

    const parsed = RequestSchema.safeParse(body)
    if (!parsed.success) {
      return _err("Invalid request: " + parsed.error.errors.map(
        e => `${e.path.join(".")}: ${e.message}`
      ).join("; "))
    }

    const { data: actionData } = parsed

    // ─── Generate QR ──────────────────────────────────────────────────────
    if (action === "generate-qr") {
      const sessionCheck = await verifySession(req)
      if (!sessionCheck.authorized) {
        return new Response(JSON.stringify({ error: sessionCheck.error || "Unauthorized" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        })
      }
      if (!db) return _err("Database not configured", 500)

      const { orderId, remarks1, remarks2 } = actionData

      const { data: booking, error: fetchError } = await db
        .from("bookings")
        .select("id, guest_email, total_price, advance_amount, balance_amount, payment_status, booking_status")
        .eq("id", orderId)
        .single()

      if (fetchError || !booking) {
        return _err("Booking not found", 404)
      }
      if (booking.guest_email !== sessionCheck.user.email) {
        return _err("Unauthorized: booking does not belong to this user", 403)
      }
      if (booking.payment_status === "paid") {
        return _err("Booking already paid", 409)
      }
      if (booking.booking_status !== "pending_payment") {
        return _err("Booking is not in pending payment state", 409)
      }

      // For pay_at_property, charge only the advance amount (60%)
      // For other methods, charge the full total
      const isPartial = booking.payment_status === "pay_at_property"
      const amount = isPartial ? (booking.advance_amount || Math.round(booking.total_price * 60) / 100) : booking.total_price

      // Check for existing pending payment for this booking to prevent duplicate PRNs
      const { data: existingPending } = await db
        .from("payments")
        .select("id, prn, amount, created_at")
        .eq("booking_id", orderId)
        .in("status", ["pending"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingPending) {
        await logEvent(db, {
          booking_id: orderId,
          event_type: "qr_reused",
          payload: { prn: existingPending.prn, existing_payment_id: existingPending.id, reason: "reused existing pending payment" },
        })

        // Refresh hold on the booking
        const holdExpiresAt = new Date(Date.now() + HOLD_DURATION_MS).toISOString()
        await db.from("bookings")
          .update({ hold_expires_at: holdExpiresAt, active_prn: existingPending.prn })
          .eq("id", orderId)

        return new Response(JSON.stringify({
          success: true,
          prn: existingPending.prn,
          qrMessage: "",
          thirdpartyQrWebSocketUrl: "",
          amount: existingPending.amount,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const prn = generateSecurePrn(orderId)
      const dataToHash = `${String(amount)},${prn},${merchantCode},${remarks1},${remarks2}`
      const dataValidation = await hmacSha512(merchantSecret, dataToHash)

      const payload = {
        amount: String(amount),
        remarks1,
        remarks2,
        prn,
        merchantCode,
        dataValidation,
        username,
        password,
      }

      let qrData: unknown
      try {
        const res = await fetchWithTimeout(`${dynamicQrUrl}/thirdPartyDynamicQrDownload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error(`Fonepay API error: ${res.status}`)
        qrData = await res.json()
      } catch {
        return _err("Payment gateway error. Please try again.", 502)
      }

      const qrResponse = qrData as Record<string, unknown>
      if (!qrResponse.qrMessage) {
        return _err("Fonepay rejected the request. Verify merchant credentials.", 502)
      }

      // Create payment record in pending state (for PRN uniqueness + reconciliation)
      const { error: payInsertErr } = await db
        .from("payments")
        .insert({
          booking_id: orderId,
          prn,
          amount,
          payment_method: "fonepay_qr",
          status: "pending",
        })
        .select()
        .single()

      // PRN uniqueness is enforced at DB level — if another QR was generated
      // with the same PRN (extremely unlikely with crypto UUID), this fails.
      if (payInsertErr) {
        await logEvent(db, {
          booking_id: orderId, event_type: "payment_failed",
          payload: { prn, error: "Failed to create payment record: " + payInsertErr.message },
        })
        return _err("Failed to initiate payment, please try again", 500)
      }

      // Refresh hold on the booking
      const holdExpiresAt = new Date(Date.now() + HOLD_DURATION_MS).toISOString()
      await db.from("bookings")
        .update({ hold_expires_at: holdExpiresAt, active_prn: prn })
        .eq("id", orderId)

      await logEvent(db, {
        booking_id: orderId,
        event_type: "qr_created",
        payload: { prn, amount, method: "fonepay_qr", qr_message_present: !!qrResponse.qrMessage },
      })

      return new Response(JSON.stringify({
        success: true,
        prn,
        qrMessage: qrResponse.qrMessage || "",
        thirdpartyQrWebSocketUrl: qrResponse.thirdpartyQrWebSocketUrl || "",
        amount,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // ─── Generate Web ─────────────────────────────────────────────────────
    if (action === "generate-web") {
      const sessionCheck = await verifySession(req)
      if (!sessionCheck.authorized) {
        return new Response(JSON.stringify({ error: sessionCheck.error || "Unauthorized" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        })
      }
      if (!db) return _err("Database not configured", 500)

      const { orderId, remarks1, remarks2 } = actionData

      const { data: booking, error: fetchError } = await db
        .from("bookings")
        .select("id, guest_email, total_price, advance_amount, balance_amount, payment_status, booking_status")
        .eq("id", orderId)
        .single()

      if (fetchError || !booking) {
        return _err("Booking not found", 404)
      }
      if (booking.guest_email !== sessionCheck.user.email) {
        return _err("Unauthorized: booking does not belong to this user", 403)
      }
      if (booking.payment_status === "paid") {
        return _err("Booking already paid", 409)
      }
      if (booking.booking_status !== "pending_payment") {
        return _err("Booking is not in pending payment state", 409)
      }

      // For pay_at_property, charge only the advance amount (60%)
      const isPartialWeb = booking.payment_status === "pay_at_property"
      const amount = isPartialWeb ? (booking.advance_amount || Math.round(booking.total_price * 60) / 100) : booking.total_price

      // Check for existing pending payment for this booking
      const { data: existingPendingWeb } = await db
        .from("payments")
        .select("id, prn, amount, created_at")
        .eq("booking_id", orderId)
        .in("status", ["pending"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingPendingWeb) {
        await logEvent(db, {
          booking_id: orderId,
          event_type: "idempotency_hit",
          payload: { prn: existingPendingWeb.prn, existing_payment_id: existingPendingWeb.id, reason: "reused existing pending payment" },
        })

        const holdExpiresAt = new Date(Date.now() + HOLD_DURATION_MS).toISOString()
        await db.from("bookings")
          .update({ hold_expires_at: holdExpiresAt, active_prn: existingPendingWeb.prn })
          .eq("id", orderId)

        return new Response(JSON.stringify({ success: true, prn: existingPendingWeb.prn, paymentUrl: "", amount: existingPendingWeb.amount }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const prn = generateSecurePrn(orderId)

      const today = new Date()
      const month = String(today.getMonth() + 1).padStart(2, "0")
      const day = String(today.getDate()).padStart(2, "0")
      const date = `${month}/${day}/${today.getFullYear()}`

      const paymentData = {
        PID: merchantCode,
        MD: "P",
        PRN: prn,
        AMT: amount,
        CRN: "NPR",
        DT: date,
        R1: remarks1,
        R2: remarks2,
        RU: callbackUrl,
      }

      const concat = `${paymentData.PID},${paymentData.MD},${paymentData.PRN},${paymentData.AMT},${paymentData.CRN},${paymentData.DT},${paymentData.R1},${paymentData.R2},${paymentData.RU}`
      const dv = await hmacSha512(merchantSecret, concat)

      const paymentUrl = `${baseUrl}/api/merchantRequest?PID=${paymentData.PID}&MD=${paymentData.MD}&PRN=${paymentData.PRN}&AMT=${paymentData.AMT}&CRN=${paymentData.CRN}&DT=${encodeURIComponent(paymentData.DT)}&R1=${encodeURIComponent(paymentData.R1)}&R2=${encodeURIComponent(paymentData.R2)}&DV=${dv}&RU=${encodeURIComponent(paymentData.RU)}`

      // Create payment record in pending state
      const { error: payInsertErr } = await db
        .from("payments")
        .insert({
          booking_id: orderId,
          prn,
          amount,
          payment_method: "fonepay_web",
          status: "pending",
        })
        .select()
        .single()

      if (payInsertErr) {
        await logEvent(db, {
          booking_id: orderId, event_type: "payment_failed",
          payload: { prn, error: "Failed to create payment record: " + payInsertErr.message },
        })
        return _err("Failed to initiate payment, please try again", 500)
      }

      // Refresh hold
      const holdExpiresAt = new Date(Date.now() + HOLD_DURATION_MS).toISOString()
      await db.from("bookings")
        .update({ hold_expires_at: holdExpiresAt, active_prn: prn })
        .eq("id", orderId)

      await logEvent(db, {
        booking_id: orderId,
        event_type: "payment_initiated",
        payload: { prn, amount, method: "fonepay_web" },
      })

      return new Response(JSON.stringify({ success: true, prn, paymentUrl, amount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // ─── Verify QR ────────────────────────────────────────────────────────
    if (action === "verify-qr") {
      const sessionCheck = await verifySession(req)
      if (!sessionCheck.authorized) {
        return new Response(JSON.stringify({ error: sessionCheck.error || "Unauthorized" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        })
      }
      const { prn } = actionData
      const bookingId = extractBookingId(prn)
      if (!bookingId) {
        return _err("Invalid PRN format", 400)
      }

      const dataToHash = `${prn},${merchantCode}`
      const dataValidation = await hmacSha512(merchantSecret, dataToHash)

      let fonepayResult: Record<string, unknown>
      try {
        const res = await fetchWithTimeout(`${dynamicQrUrl}/thirdPartyDynamicQrGetStatus`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prn, merchantCode, dataValidation, username, password }),
        })
        if (!res.ok) throw new Error(`Fonepay API error: ${res.status}`)
        fonepayResult = await res.json()
      } catch {
        return _err("Payment verification failed. Please try again.", 502)
      }

      // Payment not yet successful on Fonepay side
      if (fonepayResult.paymentStatus !== "success") {
        await logEvent(db, {
          booking_id: bookingId,
          event_type: "payment_failed",
          payload: { prn, fonepayResponse: fonepayResult },
        })
        return new Response(JSON.stringify({
          success: false,
          status: fonepayResult.paymentStatus,
          response: fonepayResult,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      // ── Payment status = success. Now verify integrity ──

      if (!db) return _err("Database not configured", 500)

      // Verify Fonepay response HMAC signature to prevent forgery
      const signatureValid = await verifyFonepayResponseSignature(merchantSecret, merchantCode, fonepayResult)
      if (!signatureValid) {
        await logEvent(db, {
          booking_id: bookingId, event_type: "payment_failed",
          payload: { prn, reason: "Fonepay response signature verification failed" },
        })
        return _err("Payment verification failed: invalid response signature", 502)
      }

      // Find existing payment record (created at QR generation time)
      // IMPORTANT: read amount from payment record, not recalculated from booking
      const { data: existingPayment } = await db
        .from("payments")
        .select("id, booking_id, status, amount")
        .eq("prn", prn)
        .maybeSingle()

      if (!existingPayment) {
        await logEvent(db, { booking_id: bookingId, event_type: "payment_failed", payload: { prn, reason: "Payment record not found" } })
        return _err("Payment session not found", 404)
      }

      // Integrity: payment record must belong to this booking
      if (existingPayment.booking_id !== bookingId) {
        await logEvent(db, {
          booking_id: bookingId, event_type: "payment_failed",
          payload: { prn, paymentBookingId: existingPayment.booking_id, reason: "Payment record booking_id mismatch" },
        })
        return _err("Payment session mismatch", 409)
      }

      // ⚠️ Amount integrity check — compare Fonepay amount vs PAYMENT RECORD amount (authoritative)
      const fonepayAmount = parseFloat(String(fonepayResult.amount || fonepayResult.txnAmount || "0"))
      if (fonepayAmount > 0 && Math.abs(fonepayAmount - existingPayment.amount) > 0.01) {
        await logEvent(db, {
          booking_id: bookingId, event_type: "amount_mismatch",
          payload: { prn, fonepayAmount, dbAmount: existingPayment.amount },
        })
        return _err("Payment amount mismatch. Contact support.", 409)
      }

      const fonepayTraceId = String(fonepayResult.fonepayTraceId || fonepayResult.fonepayTraceId === 0 ? fonepayResult.fonepayTraceId : "")

      // Use payment record's stored amount — this is the authoritative amount from QR generation time
      return await confirmPayment(db, existingPayment, bookingId, prn, existingPayment.amount, fonepayTraceId || null, corsHeaders)
    }

    // ─── Verify Web ───────────────────────────────────────────────────────
    if (action === "verify-web") {
      const sessionCheck = await verifySession(req)
      if (!sessionCheck.authorized) {
        return new Response(JSON.stringify({ error: sessionCheck.error || "Unauthorized" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        })
      }
      const { prn, uid, amount: callbackAmount, pid, bankCode } = actionData
      const bookingId = extractBookingId(prn)
      if (!bookingId) {
        return _err("Invalid PRN format", 400)
      }

      const PID = pid || merchantCode
      const BID = bankCode

      const dvString = `${PID},${callbackAmount},${prn},${BID},${uid}`
      const DV = await hmacSha512(merchantSecret, dvString)

      const params = new URLSearchParams({ PRN: prn, PID, BID, AMT: callbackAmount, UID: uid, DV })
      const verificationUrl = `${baseUrl}/api/merchantRequest/verificationMerchant?${params}`

      let fonepayResult: Record<string, unknown>
      try {
        const res = await fetchWithTimeout(verificationUrl, {
          headers: { "Content-Type": "application/json", "User-Agent": "PaymentGateway/1.0" },
        })
        if (!res.ok) throw new Error(`Verification API error: ${res.status}`)
        const xmlText = await res.text()
        const { parse } = await import("https://deno.land/x/xml@2.1.1/mod.ts")
        const jsonResult = parse(xmlText) as Record<string, unknown>
        fonepayResult = (jsonResult?.response || jsonResult) as Record<string, unknown>
      } catch {
        return _err("Payment verification failed. Please try again.", 502)
      }

      const isSuccess = fonepayResult.success === "true" || fonepayResult.response_code === "successful"

      if (!isSuccess) {
        await logEvent(db, {
          booking_id: bookingId,
          event_type: "payment_failed",
          payload: { prn, fonepayResponse: fonepayResult },
        })
        return new Response(JSON.stringify({
          amount: parseFloat(fonepayResult.amount as string) || 0,
          bankCode: fonepayResult.bankCode || "",
          initiator: fonepayResult.initiator || "",
          message: fonepayResult.message || "",
          response_code: fonepayResult.response_code || "",
          success: false,
          txnAmount: parseFloat(fonepayResult.txnAmount as string) || 0,
          uniqueId: fonepayResult.uniqueId || "",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      if (!db) return _err("Database not configured", 500)

      // Find existing payment record (read amount from stored record)
      const { data: existingPayment } = await db
        .from("payments")
        .select("id, booking_id, status, amount")
        .eq("prn", prn)
        .maybeSingle()

      if (!existingPayment) {
        await logEvent(db, { booking_id: bookingId, event_type: "payment_failed", payload: { prn, reason: "Payment record not found" } })
        return _err("Payment session not found", 404)
      }

      // Integrity: payment record must belong to this booking
      if (existingPayment.booking_id !== bookingId) {
        await logEvent(db, {
          booking_id: bookingId, event_type: "payment_failed",
          payload: { prn, paymentBookingId: existingPayment.booking_id, reason: "Payment record booking_id mismatch" },
        })
        return _err("Payment session mismatch", 409)
      }

      // Verify the callback amount matches the stored payment amount (authoritative at generation time)
      const webAmount = parseFloat(callbackAmount)
      if (webAmount > 0 && Math.abs(webAmount - existingPayment.amount) > 0.01) {
        await logEvent(db, {
          booking_id: bookingId, event_type: "amount_mismatch",
          payload: { prn, webAmount, dbAmount: existingPayment.amount },
        })
        return _err("Payment amount mismatch. Contact support.", 409)
      }

      const fonepayTraceId = String(fonepayResult.uniqueId || "")

      // Use stored payment.amount (authoritative at QR generation time), not recalculated
      return await confirmPayment(db, existingPayment, bookingId, prn, existingPayment.amount, fonepayTraceId || null, corsHeaders)
    }

    // ─── Post Tax Refund ──────────────────────────────────────────────────
    if (action === "post-tax-refund") {
      // Admin JWT required — refunds bypass the normal payment flow
      const authCheck = await verifyAdminJwt(req)
      if (!authCheck.authorized) {
        return new Response(JSON.stringify({ error: authCheck.error || "Unauthorized" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        })
      }
      if (!db) return _err("Database not configured", 500)

      const { prn, fonepayTraceId, invoiceNumber, invoiceDate, transactionAmount } = actionData

      const { data: payment } = await db
        .from("payments")
        .select("id, booking_id, status, tax_refund_submitted_at, tax_refund_response")
        .eq("prn", prn)
        .single()

      if (!payment) {
        return _err("Payment not found", 404)
      }
      if (payment.status !== "completed") {
        return _err("Payment not completed", 400)
      }

      // Idempotency: if already submitted, return previous response
      if (payment.tax_refund_submitted_at) {
        await logEvent(db, {
          payment_id: payment.id,
          booking_id: payment.booking_id,
          event_type: "idempotency_hit",
          payload: { prn, fonepayTraceId, invoiceNumber, reason: "tax_refund_already_submitted" },
        })
        return new Response(JSON.stringify({
          success: true,
          message: "Tax refund already submitted",
          tax_refund_submitted_at: payment.tax_refund_submitted_at,
          fonepayResponse: payment.tax_refund_response,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const dataToHash = `${fonepayTraceId},${prn},${invoiceNumber},${invoiceDate},${transactionAmount},${merchantCode}`
      const dataValidation = await hmacSha512(merchantSecret, dataToHash)

      const payload = {
        fonepayTraceId: String(fonepayTraceId),
        merchantPRN: prn,
        invoiceNumber,
        invoiceDate,
        transactionAmount: String(transactionAmount),
        merchantCode,
        dataValidation,
        username,
        password,
      }

      let result: Record<string, unknown>
      try {
        const res = await fetchWithTimeout(`${dynamicQrUrl}/thirdPartyPostTaxRefund`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error(`Fonepay tax refund API error: ${res.status}`)
        result = await res.json()
      } catch {
        return _err("Tax refund failed. Please try again.", 502)
      }

      // Record the submission result whether success or failure
      await db.from("payments")
        .update({
          tax_refund_submitted_at: new Date().toISOString(),
          tax_refund_response: result,
        })
        .eq("id", payment.id)

      await logEvent(db, {
        payment_id: payment.id,
        booking_id: payment.booking_id,
        event_type: result.success ? "tax_refund_submitted" : "tax_refund_failed",
        payload: { prn, fonepayTraceId, invoiceNumber, fonepayResponse: result },
      })

      return new Response(JSON.stringify({ success: true, fonepayResponse: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return _err("Unknown action", 400)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
}
