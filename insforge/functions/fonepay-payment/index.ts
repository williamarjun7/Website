import { createClient } from "npm:@insforge/sdk"
import { z } from "https://esm.sh/zod@3.22.4"

const ALLOWED_ORIGINS = [
  "https://highlands-motel.com",
  "https://www.highlands-motel.com",
  "https://6aiag3ra.us-east.insforge.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]

function toError(e: unknown): Error {
  if (e instanceof Error) return e
  if (typeof e === "object" && e !== null) {
    const msg = (e as Record<string, unknown>).message || (e as Record<string, unknown>).error || JSON.stringify(e)
    return new Error(String(msg))
  }
  return new Error(String(e))
}

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") || ""
  const allowed = ALLOWED_ORIGINS.includes(origin)
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
    "Vary": "Origin",
  }
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

function extractBookingId(prn: string): string | null {
  const prefix = "HIGHLANDS_"
  if (!prn.startsWith(prefix)) return null
  const afterPrefix = prn.slice(prefix.length)
  const idx = afterPrefix.lastIndexOf("_")
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

const CallbackSchema = z.object({
  action: z.literal("handle-callback"),
  prn: z.string(),
  amount: z.string().optional(),
  txnId: z.string().optional(),
  uid: z.string().optional(),
  status: z.string().optional(),
  response_code: z.string().optional(),
  signature: z.string().optional(),
})

const PostTaxRefundSchema = z.object({
  action: z.literal("post-tax-refund"),
  prn: z.string(),
  fonepayTraceId: z.union([z.string(), z.number()]),
  invoiceNumber: z.string(),
  invoiceDate: z.string(),
  transactionAmount: z.union([z.string(), z.number()]),
})

const RequestSchema = z.discriminatedUnion("action", [
  GenerateQrSchema,
  GenerateWebSchema,
  VerifyQrSchema,
  VerifyWebSchema,
  CallbackSchema,
  PostTaxRefundSchema,
])

type AppError = { error: string }

function errorResponse(message: string, status = 400): Response {
  const body: AppError = { error: message }
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  })
}

export default async function handler(req: Request) {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const merchantCode = Deno.env.get("FONEPAY_PG_MERCHANT_CODE") || ""
  const merchantSecret = Deno.env.get("FONEPAY_PG_MERCHANT_SECRET") || ""
  const baseUrl = Deno.env.get("FONEPAY_PG_URL") || ""
  const dynamicQrUrl = Deno.env.get("FONEPAY_DYNAMICQR_URL") || ""
  const username = Deno.env.get("FONEPAY_USERNAME") || ""
  const password = Deno.env.get("FONEPAY_PASSWORD") || ""
  const callbackUrl = Deno.env.get("FONEPAY_PG_CALLBACK_URL") || ""

  if (!merchantCode || !merchantSecret) {
    return errorResponse("Payment gateway not configured", 500)
  }

  try {
    const baseUrl = Deno.env.get("INSFORGE_BASE_URL") || Deno.env.get("SUPABASE_URL") || ""
    const anonKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("API_KEY") || ""
    if (!baseUrl || !anonKey) {
      return errorResponse("Database not configured", 500)
    }
    const { database: db } = createClient({ baseUrl, anonKey })

    let body: unknown
    let action: string

    if (req.method === "GET") {
      const url = new URL(req.url)
      const prn = url.searchParams.get("PRN")
      const pid = url.searchParams.get("PID")
      const amt = url.searchParams.get("AMT")
      const uid = url.searchParams.get("UID")
      const dv = url.searchParams.get("DV")
      if (prn) {
        body = { action: "handle-callback", prn, amount: amt || "", uid: uid || "", response_code: dv ? "successful" : "", status: dv ? "success" : "" }
      }
    } else {
      try { body = await req.json() } catch {
        try {
          const formData = await req.formData()
          const entries: Record<string, string> = {}
          for (const [k, v] of formData.entries()) {
            entries[k] = String(v)
          }
          body = entries
        } catch {
          return errorResponse("Invalid request body")
        }
      }
    }

    if (!body || typeof body !== "object") {
      return errorResponse("Invalid request")
    }

    action = (body as Record<string, unknown>)?.action as string || "handle-callback"

    const parsed = action === "handle-callback"
      ? CallbackSchema.safeParse({ ...(body as Record<string, unknown>), action: "handle-callback" })
      : RequestSchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse("Invalid request: " + parsed.error.errors.map(
        e => `${e.path.join(".")}: ${e.message}`
      ).join("; "))
    }

    const { data: actionData } = parsed

    if (action === "generate-qr") {
      if (!db) return errorResponse("Database not configured", 500)

      const { orderId, remarks1, remarks2 } = actionData

      const { data: booking, error: fetchError } = await db
        .from("bookings")
        .select("id, total_price, payment_status")
        .eq("id", orderId)
        .single()

      if (fetchError || !booking) {
        return errorResponse("Booking not found", 404)
      }
      if (booking.payment_status === "paid") {
        return errorResponse("Booking already paid", 409)
      }

      const amount = booking.total_price
      const prn = `HIGHLANDS_${orderId}_${Date.now()}`
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
        const res = await fetch(`${dynamicQrUrl}/thirdPartyDynamicQrDownload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error(`Fonepay API error: ${res.status}`)
        qrData = await res.json()
      } catch (e) {
        return errorResponse(`QR generation failed: ${e instanceof Error ? e.message : "unknown"}`, 502)
      }

      const qrResponse = qrData as Record<string, unknown>

      await logEvent(db, {
        booking_id: orderId,
        event_type: "payment_initiated",
        payload: { prn, amount, method: "fonepay_qr" },
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

    if (action === "generate-web") {
      if (!db) return errorResponse("Database not configured", 500)

      const { orderId, remarks1, remarks2 } = actionData

      const { data: booking, error: fetchError } = await db
        .from("bookings")
        .select("id, total_price, payment_status")
        .eq("id", orderId)
        .single()

      if (fetchError || !booking) {
        return errorResponse("Booking not found", 404)
      }
      if (booking.payment_status === "paid") {
        return errorResponse("Booking already paid", 409)
      }

      const amount = booking.total_price
      const prn = `HIGHLANDS_${orderId}_${Date.now()}`

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

      await logEvent(db, {
        booking_id: orderId,
        event_type: "payment_initiated",
        payload: { prn, amount, method: "fonepay_web" },
      })

      return new Response(JSON.stringify({ success: true, prn, paymentUrl, amount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (action === "verify-qr") {
      const { prn } = actionData
      const bookingId = extractBookingId(prn)
      if (!bookingId) {
        return errorResponse("Invalid PRN format", 400)
      }

      const dataToHash = `${prn},${merchantCode}`
      const dataValidation = await hmacSha512(merchantSecret, dataToHash)

      let fonepayResult: Record<string, unknown>
      try {
        const res = await fetch(`${dynamicQrUrl}/thirdPartyDynamicQrGetStatus`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prn, merchantCode, dataValidation, username, password }),
        })
        if (!res.ok) throw new Error(`Fonepay API error: ${res.status}`)
        fonepayResult = await res.json()
      } catch (e) {
        return errorResponse(`QR verification failed: ${e instanceof Error ? e.message : "unknown"}`, 502)
      }

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

      if (!db) return errorResponse("Database not configured", 500)

      const { data: booking } = await db
        .from("bookings")
        .select("id, total_price, payment_status")
        .eq("id", bookingId)
        .single()

      if (!booking) {
        await logEvent(db, { booking_id: bookingId, event_type: "payment_failed", payload: { prn, reason: "Booking not found" } })
        return errorResponse("Booking not found", 404)
      }

      const { data: existingPayment } = await db
        .from("payments")
        .select("id, status")
        .eq("prn", prn)
        .maybeSingle()

      if (existingPayment) {
        if (existingPayment.status === "completed") {
          await logEvent(db, { booking_id: bookingId, event_type: "idempotency_hit", payment_id: existingPayment.id, payload: { prn } })
          return new Response(JSON.stringify({ success: true, message: "Payment already verified" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          })
        }
        return new Response(JSON.stringify({ success: false, message: "Payment is still being processed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const fonepayAmount = parseFloat(String(fonepayResult.amount || fonepayResult.txnAmount || "0"))
      if (fonepayAmount > 0 && Math.abs(fonepayAmount - booking.total_price) > 0.01) {
        await logEvent(db, {
          booking_id: bookingId, event_type: "amount_mismatch",
          payload: { prn, fonepayAmount, dbAmount: booking.total_price },
        })
      }

      const { data: paymentRecord, error: insertError } = await db
        .from("payments")
        .insert({
          booking_id: bookingId,
          prn,
          amount: booking.total_price,
          payment_method: "fonepay_qr",
          status: "completed",
          response_code: String(fonepayResult.responseCode || fonepayResult.paymentStatus || ""),
          response_msg: String(fonepayResult.message || ""),
          verified_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (insertError) {
        await logEvent(db, {
          booking_id: bookingId, event_type: "replay_attempt",
          payload: { prn, error: insertError.message },
        })
        const { data: fallbackPayment } = await db
          .from("payments")
          .select("id, status")
          .eq("prn", prn)
          .single()
        if (fallbackPayment?.status === "completed") {
          return new Response(JSON.stringify({ success: true, message: "Payment already verified" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          })
        }
        return errorResponse("Payment processing conflict", 409)
      }

      const { error: updateError } = await db
        .from("bookings")
        .update({ payment_status: "paid" })
        .eq("id", bookingId)
        .eq("payment_status", "pending")

      if (updateError) {
        await logEvent(db, {
          payment_id: paymentRecord.id, booking_id: bookingId,
          event_type: "payment_failed",
          payload: { prn, error: "Failed to update booking status" },
        })
        return errorResponse("Failed to confirm payment", 500)
      }

      await logEvent(db, {
        payment_id: paymentRecord.id, booking_id: bookingId,
        event_type: "payment_completed",
        old_status: "pending", new_status: "paid",
        payload: { prn, amount: booking.total_price },
      })

      return new Response(JSON.stringify({ success: true, message: "Payment verified successfully" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (action === "verify-web") {
      const { prn, uid, amount: callbackAmount, pid, bankCode } = actionData
      const bookingId = extractBookingId(prn)
      if (!bookingId) {
        return errorResponse("Invalid PRN format", 400)
      }

      const PID = pid || merchantCode
      const BID = bankCode

      const dvString = `${PID},${callbackAmount},${prn},${BID},${uid}`
      const DV = await hmacSha512(merchantSecret, dvString)

      const params = new URLSearchParams({ PRN: prn, PID, BID, AMT: callbackAmount, UID: uid, DV })
      const verificationUrl = `${baseUrl}/api/merchantRequest/verificationMerchant?${params}`

      let fonepayResult: Record<string, unknown>
      try {
        const res = await fetch(verificationUrl, {
          headers: { "Content-Type": "application/json", "User-Agent": "PaymentGateway/1.0" },
        })
        if (!res.ok) throw new Error(`Verification API error: ${res.status}`)
        const xmlText = await res.text()
        const { parse } = await import("https://deno.land/x/xml@2.1.1/mod.ts")
        const jsonResult = parse(xmlText) as Record<string, unknown>
        fonepayResult = (jsonResult?.response || jsonResult) as Record<string, unknown>
      } catch (e) {
        return errorResponse(`Web payment verification failed: ${e instanceof Error ? e.message : "unknown"}`, 502)
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

      if (!db) return errorResponse("Database not configured", 500)

      const { data: booking } = await db
        .from("bookings")
        .select("id, total_price, payment_status")
        .eq("id", bookingId)
        .single()

      if (!booking) {
        await logEvent(db, { booking_id: bookingId, event_type: "payment_failed", payload: { prn, reason: "Booking not found" } })
        return errorResponse("Booking not found", 404)
      }

      const { data: existingPayment } = await db
        .from("payments")
        .select("id, status")
        .eq("prn", prn)
        .maybeSingle()

      if (existingPayment) {
        if (existingPayment.status === "completed") {
          await logEvent(db, { booking_id: bookingId, event_type: "idempotency_hit", payment_id: existingPayment.id, payload: { prn } })
          return new Response(JSON.stringify({ success: true, message: "Payment already verified" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          })
        }
        return new Response(JSON.stringify({ success: false, message: "Payment is still being processed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const { data: paymentRecord, error: insertError } = await db
        .from("payments")
        .insert({
          booking_id: bookingId,
          prn,
          amount: booking.total_price,
          payment_method: "fonepay_web",
          status: "completed",
          response_code: String(fonepayResult.response_code || ""),
          response_msg: String(fonepayResult.message || ""),
          verified_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (insertError) {
        await logEvent(db, {
          booking_id: bookingId, event_type: "replay_attempt",
          payload: { prn, error: insertError.message },
        })
        const { data: fallbackPayment } = await db
          .from("payments")
          .select("id, status")
          .eq("prn", prn)
          .single()
        if (fallbackPayment?.status === "completed") {
          return new Response(JSON.stringify({ success: true, message: "Payment already verified" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          })
        }
        return errorResponse("Payment processing conflict", 409)
      }

      const { error: updateError } = await db
        .from("bookings")
        .update({ payment_status: "paid" })
        .eq("id", bookingId)
        .eq("payment_status", "pending")

      if (updateError) {
        await logEvent(db, {
          payment_id: paymentRecord.id, booking_id: bookingId,
          event_type: "payment_failed",
          payload: { prn, error: "Failed to update booking status" },
        })
        return errorResponse("Failed to confirm payment", 500)
      }

      await logEvent(db, {
        payment_id: paymentRecord.id, booking_id: bookingId,
        event_type: "payment_completed",
        old_status: "pending", new_status: "paid",
        payload: { prn, amount: booking.total_price },
      })

      return new Response(JSON.stringify({
        success: true,
        message: "Payment verified successfully",
        amount: booking.total_price,
        txnAmount: parseFloat(fonepayResult.txnAmount as string) || 0,
        uniqueId: fonepayResult.uniqueId || "",
        response_code: fonepayResult.response_code || "",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (action === "post-tax-refund") {
      if (!db) return errorResponse("Database not configured", 500)

      const { prn, fonepayTraceId, invoiceNumber, invoiceDate, transactionAmount } = actionData

      const { data: payment } = await db
        .from("payments")
        .select("id, booking_id, status")
        .eq("prn", prn)
        .single()

      if (!payment) {
        return errorResponse("Payment not found", 404)
      }
      if (payment.status !== "completed") {
        return errorResponse("Payment not completed", 400)
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
        const res = await fetch(`${dynamicQrUrl}/thirdPartyPostTaxRefund`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error(`Fonepay tax refund API error: ${res.status}`)
        result = await res.json()
      } catch (e) {
        return errorResponse(`Tax refund failed: ${e instanceof Error ? e.message : "unknown"}`, 502)
      }

      await logEvent(db, {
        payment_id: payment.id,
        booking_id: payment.booking_id,
        event_type: result.success ? "payment_completed" : "payment_failed",
        payload: { prn, fonepayTraceId, invoiceNumber, fonepayResponse: result },
      })

      return new Response(JSON.stringify({ success: true, fonepayResponse: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (action === "handle-callback") {
      const { prn, amount: callbackAmount, txnId, uid, status, response_code, signature } = actionData
      const bookingId = extractBookingId(prn)
      if (!bookingId) {
        return errorResponse("Invalid PRN format", 400)
      }

      if (!db) return errorResponse("Database not configured", 500)

      const { data: booking } = await db
        .from("bookings")
        .select("id, total_price, payment_status")
        .eq("id", bookingId)
        .single()

      if (!booking) {
        await logEvent(db, { booking_id: bookingId, event_type: "payment_callback_failed", payload: { prn, reason: "Booking not found" } })
        return errorResponse("Booking not found", 404)
      }

      if (booking.payment_status === "paid") {
        await logEvent(db, { booking_id: bookingId, event_type: "callback_idempotency_hit", payload: { prn } })
        return new Response(JSON.stringify({ success: true, message: "Payment already processed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const { data: existingPayment } = await db
        .from("payments")
        .select("id, status")
        .eq("prn", prn)
        .maybeSingle()

      if (existingPayment?.status === "completed") {
        await logEvent(db, { booking_id: bookingId, event_type: "callback_idempotency_hit", payment_id: existingPayment.id, payload: { prn } })
        return new Response(JSON.stringify({ success: true, message: "Payment already verified" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const { data: paymentRecord, error: insertError } = await db
        .from("payments")
        .insert({
          booking_id: bookingId,
          prn,
          amount: callbackAmount ? parseFloat(callbackAmount) : booking.total_price,
          payment_method: "fonepay_qr",
          status: status === "success" || response_code === "successful" ? "completed" : "failed",
          response_code: response_code || status || "",
          response_msg: status || "",
          verified_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (insertError) {
        await logEvent(db, {
          booking_id: bookingId, event_type: "callback_replay_attempt",
          payload: { prn, error: insertError.message },
        })
        return errorResponse("Payment processing conflict", 409)
      }

      if (status === "success" || response_code === "successful") {
        const { error: updateError } = await db
          .from("bookings")
          .update({ payment_status: "paid" })
          .eq("id", bookingId)
          .eq("payment_status", "pending")

        if (updateError) {
          await logEvent(db, {
            payment_id: paymentRecord.id, booking_id: bookingId,
            event_type: "callback_update_failed",
            payload: { prn, error: updateError.message },
          })
        }
      }

      await logEvent(db, {
        payment_id: paymentRecord.id, booking_id: bookingId,
        event_type: status === "success" || response_code === "successful" ? "payment_callback_completed" : "payment_callback_failed",
        old_status: "pending", new_status: status === "success" || response_code === "successful" ? "paid" : "failed",
        payload: { prn, amount: booking.total_price, callbackData: { amount: callbackAmount, txnId, uid, status, response_code } },
      })

      return new Response(JSON.stringify({ success: true, message: "Callback processed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return errorResponse("Unknown action", 400)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
}
