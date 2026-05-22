import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { z } from "https://esm.sh/zod@3.22.4"

const ALLOWED_ORIGINS = [
  "https://highlands-motel.com",
  "https://www.highlands-motel.com",
  "https://highlandscafemotelinn.netlify.app",
  "https://6aiag3ra.us-east.insforge.app",
]

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

const GenerateQrSchema = z.object({
  action: z.literal("generate-qr"),
  orderId: z.string(),
  amount: z.number().positive(),
  remarks1: z.string().optional().default("Payment"),
  remarks2: z.string().optional().default(""),
})

const GenerateWebSchema = z.object({
  action: z.literal("generate-web"),
  orderId: z.string(),
  amount: z.number().positive(),
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

const RequestSchema = z.discriminatedUnion("action", [
  GenerateQrSchema,
  GenerateWebSchema,
  VerifyQrSchema,
  VerifyWebSchema,
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

  try {
    let body: unknown
    try { body = await req.json() } catch {
      return errorResponse("Invalid JSON")
    }

    const parsed = RequestSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse("Invalid request: " + parsed.error.errors.map(
        e => `${e.path.join(".")}: ${e.message}`
      ).join("; "))
    }

    const merchantCode = Deno.env.get("FONEPAY_PG_MERCHANT_CODE") || ""
    const merchantSecret = Deno.env.get("FONEPAY_PG_MERCHANT_SECRET") || ""
    const baseUrl = Deno.env.get("FONEPAY_PG_URL") || ""
    const dynamicQrUrl = Deno.env.get("FONEPAY_DYNAMICQR_URL") || ""
    const username = Deno.env.get("FONEPAY_USERNAME") || ""
    const password = Deno.env.get("FONEPAY_PASSWORD") || ""
    const callbackUrl = Deno.env.get("FONEPAY_PG_CALLBACK_URL") || ""
    const clientUrl = Deno.env.get("CLIENT_URL") || "https://highlands-motel.com"

    if (!merchantCode || !merchantSecret) {
      return errorResponse("Payment gateway not configured", 500)
    }

    const { action } = parsed.data

    if (action === "generate-qr") {
      const { orderId, amount, remarks1, remarks2 } = parsed.data
      const prn = `HIGHLANDS_${orderId}_${Date.now()}`
      const dataToHash = `${amount},${prn},${merchantCode},${remarks1},${remarks2}`
      const dataValidation = await hmacSha512(merchantSecret, dataToHash)

      const payload = {
        amount,
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

      return new Response(JSON.stringify({ success: true, prn, qrCode: qrData, amount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (action === "generate-web") {
      const { orderId, amount, remarks1, remarks2 } = parsed.data
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

      return new Response(JSON.stringify({ success: true, prn, paymentUrl, amount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (action === "verify-qr") {
      const { prn } = parsed.data
      const dataToHash = `${prn},${merchantCode}`
      const dataValidation = await hmacSha512(merchantSecret, dataToHash)

      try {
        const res = await fetch(`${dynamicQrUrl}/thirdPartyDynamicQrGetStatus`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prn, merchantCode, dataValidation, username, password }),
        })
        if (!res.ok) throw new Error(`Fonepay API error: ${res.status}`)
        const result = await res.json()

        return new Response(JSON.stringify({
          success: result.paymentStatus === "success",
          status: result.paymentStatus,
          response: result,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      } catch (e) {
        return errorResponse(`QR verification failed: ${e instanceof Error ? e.message : "unknown"}`, 502)
      }
    }

    if (action === "verify-web") {
      const { prn, uid, amount, pid, bankCode } = parsed.data
      const PID = pid || merchantCode
      const BID = bankCode

      const dvString = `${PID},${amount},${prn},${BID},${uid}`
      const DV = await hmacSha512(merchantSecret, dvString)

      const params = new URLSearchParams({ PRN: prn, PID, BID, AMT: amount, UID: uid, DV })
      const verificationUrl = `${baseUrl}/api/merchantRequest/verificationMerchant?${params}`

      try {
        const res = await fetch(verificationUrl, {
          headers: { "Content-Type": "application/json", "User-Agent": "PaymentGateway/1.0" },
        })
        if (!res.ok) throw new Error(`Verification API error: ${res.status}`)
        const xmlText = await res.text()

        const { parse } = await import("https://deno.land/x/xml@2.1.1/mod.ts")
        const jsonResult = parse(xmlText) as Record<string, unknown>
        const respData = (jsonResult?.response || jsonResult) as Record<string, unknown>

        return new Response(JSON.stringify({
          amount: parseFloat(respData.amount as string) || 0,
          bankCode: respData.bankCode || "",
          initiator: respData.initiator || "",
          message: respData.message || "",
          response_code: respData.response_code || "",
          success: respData.success === "true" || respData.response_code === "successful",
          txnAmount: parseFloat(respData.txnAmount as string) || 0,
          uniqueId: respData.uniqueId || "",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      } catch (e) {
        return errorResponse(`Web payment verification failed: ${e instanceof Error ? e.message : "unknown"}`, 502)
      }
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
