// Scheduled reconciliation for abandoned payments.
// Call via GET every 1-2 minutes (cron-job.org, Deno Cron, etc.)
// Headers: x-reconcile-key (if RECONCILE_API_KEY is set)
//
// Flow:
// 1. Find expired pending_payment bookings
// 2. For each: check Fonepay Status API
// 3. success → confirm via atomic stored procedure → send email
// 4. failed → mark as failed
// 5. pending/unreachable → extend hold (up to 30 min) or expire

import { createClient } from "npm:@insforge/sdk"

const FETCH_TIMEOUT_MS = 10_000
const MAX_BATCH = 50
const MAX_HOLD_MS = 30 * 60 * 1000
const EXTEND_MS = 5 * 60 * 1000

// Rate limiting (in-memory, per deployment)
interface RateEntry { count: number; expires: number }
const rateStore = new Map<string, RateEntry>()
const RATE_MAX = 5
const RATE_WIN = 60_000
function checkRate(ip: string): boolean {
  const now = Date.now(); const e = rateStore.get(ip)
  if (e && e.expires < now) rateStore.delete(ip)
  if (!e || e.expires < now) { rateStore.set(ip, { count: 1, expires: now + RATE_WIN }); return true }
  if (e.count >= RATE_MAX) return false
  e.count++; return true
}
setInterval(() => { const n = Date.now(); for (const [k, v] of rateStore) { if (v.expires < n) rateStore.delete(k) } }, 300_000)

function htmlEncode(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;")
}

async function hmacSha512(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"])
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("")
}

interface EmailData { to: string; subject: string; html: string }
async function sendEmail(data: EmailData): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY")
  if (!apiKey) return
  const from = Deno.env.get("EMAIL_FROM") || "Highlands Motel <noreply@6aiag3ra.insforge.site>"
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: data.to, subject: data.subject, html: data.html }),
    })
    if (!res.ok) console.error(`Reconciliation email failed: ${res.status}`)
  } catch (e) { console.error("Reconciliation email error:", e) }
}

function buildConfirmationHtml(p: { guestName: string; roomName: string; checkIn: string; checkOut: string; totalPrice: number; advanceAmount?: number; balanceAmount?: number; bookingId: string }): string {
  const ge = htmlEncode
  const advance = p.advanceAmount ?? p.totalPrice
  const balance = p.balanceAmount ?? 0
  const isPartial = !!p.advanceAmount
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;padding:24px;max-width:600px"><h2 style="color:#92400e">Booking Confirmed — Highlands Motel &amp; Cafe</h2><p>Dear ${ge(p.guestName)},</p><p>Your booking at Highlands Motel &amp; Cafe has been confirmed.</p><table style="width:100%;border-collapse:collapse;margin:16px 0"><tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Room</td><td style="padding:8px;border-bottom:1px solid #eee"><strong>${ge(p.roomName)}</strong></td></tr><tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Check-in</td><td style="padding:8px;border-bottom:1px solid #eee"><strong>${ge(p.checkIn)}</strong></td></tr><tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Check-out</td><td style="padding:8px;border-bottom:1px solid #eee"><strong>${ge(p.checkOut)}</strong></td></tr><tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Total Booking Amount</td><td style="padding:8px;border-bottom:1px solid #eee"><strong>NPR ${p.totalPrice.toLocaleString()}</strong></td></tr>${isPartial ? `<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Advance Payment (60%)</td><td style="padding:8px;border-bottom:1px solid #eee"><strong>NPR ${advance.toLocaleString()}</strong></td></tr><tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Balance at Property (40%)</td><td style="padding:8px;border-bottom:1px solid #eee"><strong>NPR ${balance.toLocaleString()}</strong></td></tr>` : ''}<tr><td style="padding:8px;color:#666">Booking ID</td><td style="padding:8px"><code>${ge(p.bookingId)}</code></td></tr></table><p style="color:#666;font-size:14px">If you have any questions, contact us at the property.</p><p style="font-size:12px;color:#999">— Highlands Motel &amp; Cafe</p></body></html>`
}

function errorResponse(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), { headers: { "Content-Type": "application/json" }, status })
}

export default async function handler(req: Request) {
  if (req.method !== "GET") return errorResponse("Method not allowed", 405)

  // Rate limiting by IP
  const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "reconciler"
  if (!checkRate(clientIp)) return errorResponse("Too many requests", 429)

  // Required API key check
  const expectedKey = Deno.env.get("RECONCILE_API_KEY")
  if (!expectedKey) return errorResponse("Server configuration error: RECONCILE_API_KEY not set", 500)
  const provided = req.headers.get("x-reconcile-key") || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || ""
  if (provided !== expectedKey) return errorResponse("Unauthorized", 401)

  const merchantCode = Deno.env.get("FONEPAY_PG_MERCHANT_CODE") || ""
  const merchantSecret = Deno.env.get("FONEPAY_PG_MERCHANT_SECRET") || ""
  const dynamicQrUrl = Deno.env.get("FONEPAY_DYNAMICQR_URL") || ""
  const username = Deno.env.get("FONEPAY_USERNAME") || ""
  const password = Deno.env.get("FONEPAY_PASSWORD") || ""

  if (!merchantCode || !merchantSecret) return errorResponse("Payment gateway not configured", 500)

  try {
    const baseUrl = Deno.env.get("INSFORGE_BASE_URL") || Deno.env.get("SUPABASE_URL") || ""
    const anonKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("API_KEY") || ""
    if (!baseUrl || !anonKey) return errorResponse("Database not configured", 500)
    const { database: db } = createClient({ baseUrl, anonKey })

    const now = new Date().toISOString()

    // Find all expired hold bookings (pending_payment with hold_expires_at in past)
    const { data: expiredBookings, error: fetchError } = await db
      .from("bookings")
      .select("id, active_prn, hold_expires_at, total_price, advance_amount, balance_amount, guest_name, guest_email, check_in, check_out, room_id, payment_status")
      .eq("booking_status", "pending_payment")
      .lt("hold_expires_at", now)
      .limit(MAX_BATCH)

    if (fetchError) return errorResponse("Database query failed: " + fetchError.message, 500)

    const results = {
      scanned: 0, expired: 0, recovered: 0, extended: 0, errors: 0,
    }
    results.scanned = (expiredBookings || []).length

    for (const booking of expiredBookings || []) {
      try {
        const prn = booking.active_prn

        if (!prn) {
          // No PRN — customer never reached payment screen. Just expire.
          await db.from("bookings")
            .update({ booking_status: "expired", payment_status: "failed" })
            .eq("id", booking.id)
            .eq("booking_status", "pending_payment")
          results.expired++
          continue
        }

        // Call Fonepay Status API
        const dataValidation = await hmacSha512(merchantSecret, `${prn},${merchantCode}`)

        let fonepayResult: Record<string, unknown>
        let fonepayReachable = true
        try {
          const controller = new AbortController()
          const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
          const res = await fetch(`${dynamicQrUrl}/merchant/merchantDetailsForThirdParty/thirdPartyDynamicQrGetStatus`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prn, merchantCode, dataValidation, username, password }),
            signal: controller.signal,
          })
          clearTimeout(timer)
          if (!res.ok) throw new Error(`Fonepay API error: ${res.status}`)
          fonepayResult = await res.json()
        } catch {
          fonepayReachable = false
        }

        if (!fonepayReachable) {
          // Fonepay unreachable — extend hold if under max
          const elapsed = Date.now() - new Date(booking.hold_expires_at).getTime() + EXTEND_MS
          if (elapsed < MAX_HOLD_MS) {
            const newExpiry = new Date(Date.now() + EXTEND_MS).toISOString()
            await db.from("bookings").update({ hold_expires_at: newExpiry })
              .eq("id", booking.id).eq("booking_status", "pending_payment")
            results.extended++
          } else {
            await db.from("bookings").update({ booking_status: "expired", payment_status: "failed" })
              .eq("id", booking.id).eq("booking_status", "pending_payment")
            results.expired++
          }
          continue
        }

        const paymentStatus = String(fonepayResult.paymentStatus || "").toLowerCase()

        if (paymentStatus === "success") {
          // ── Payment made! Recover via atomic stored procedure ──
          // Find payment record
          const { data: existingPayment } = await db
            .from("payments")
            .select("id, status, amount")
            .eq("prn", prn)
            .maybeSingle()

          const fonepayTraceId = String(fonepayResult.fonepayTraceId || fonepayResult.fonepayTraceId === 0 ? fonepayResult.fonepayTraceId : "")

          if (existingPayment) {
            // Use the payment record's actual amount (correct for partial payments)
            const paidAmount = existingPayment.amount || booking.total_price
            // Payment record exists — use atomic confirm
            const { data: rpcResult } = await db.rpc("confirm_booking_payment", {
              p_payment_id: existingPayment.id,
              p_booking_id: booking.id,
              p_prn: prn,
              p_amount: paidAmount,
              p_fonepay_trace_id: fonepayTraceId,
            }).single()

            const success = rpcResult && (rpcResult as Record<string, unknown>)?.success === true

              if (success) {
                results.recovered++
                // Send confirmation email
                (async () => {
                  try {
                    const { data: room } = await db.from("rooms").select("name").eq("id", booking.room_id).single()
                    await sendEmail({
                      to: booking.guest_email,
                      subject: "Booking Confirmed — Highlands Motel & Cafe",
                      html: buildConfirmationHtml({
                        guestName: booking.guest_name,
                        roomName: room?.name || "Selected Room",
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
            } else {
              // Stored procedure returned false — likely idempotent or conflict
              results.recovered++ // Still count as handled
            }
          } else {
            // No payment record found — this is anomalous. Create one and confirm.
            // For partial payments, use advance amount; otherwise full price
            const paidAmount = booking.advance_amount || (booking.payment_status === "pay_at_property" ? Math.round(booking.total_price * 60) / 100 : booking.total_price)
            const { data: newPayment } = await db.from("payments").insert({
              booking_id: booking.id, prn, amount: paidAmount,
              payment_method: "fonepay_qr", status: "pending",
            }).select("id").single()

            if (newPayment) {
              const { data: rpcResult } = await db.rpc("confirm_booking_payment", {
                p_payment_id: newPayment.id,
                p_booking_id: booking.id,
                p_prn: prn,
                p_amount: paidAmount,
                p_fonepay_trace_id: fonepayTraceId,
              }).single()

              if (rpcResult && (rpcResult as Record<string, unknown>)?.success === true) {
                results.recovered++
                ;(async () => {
                  try {
                    const { data: room } = await db.from("rooms").select("name").eq("id", booking.room_id).single()
                    await sendEmail({
                      to: booking.guest_email, subject: "Booking Confirmed — Highlands Motel & Cafe",
                      html: buildConfirmationHtml({
                        guestName: booking.guest_name, roomName: room?.name || "Selected Room",
                        checkIn: booking.check_in, checkOut: booking.check_out,
                        totalPrice: booking.total_price,
                        advanceAmount: booking.advance_amount || undefined,
                        balanceAmount: booking.balance_amount || undefined,
                        bookingId: booking.id,
                      }),
                    })
                  } catch { /* best-effort */ }
                })()
              }
            }
          }
        } else if (paymentStatus === "failed" || paymentStatus === "cancelled") {
          await db.from("bookings").update({ booking_status: "failed", payment_status: "failed" })
            .eq("id", booking.id).eq("booking_status", "pending_payment")
          results.expired++
        } else {
          // Still pending on Fonepay side — extend or expire
          const elapsed = Date.now() - new Date(booking.hold_expires_at).getTime() + EXTEND_MS
          if (elapsed < MAX_HOLD_MS) {
            await db.from("bookings").update({ hold_expires_at: new Date(Date.now() + EXTEND_MS).toISOString() })
              .eq("id", booking.id).eq("booking_status", "pending_payment")
            results.extended++
          } else {
            await db.from("bookings").update({ booking_status: "expired", payment_status: "failed" })
              .eq("id", booking.id).eq("booking_status", "pending_payment")
            results.expired++
          }
        }
      } catch {
        results.errors++
      }
    }

    return new Response(JSON.stringify({ success: true, timestamp: new Date().toISOString(), results }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("payment-reconciliation error:", error)
    return new Response(JSON.stringify({ error: message }), {
      headers: { "Content-Type": "application/json" }, status: 500,
    })
  }
}
