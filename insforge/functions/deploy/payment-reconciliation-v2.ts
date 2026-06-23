// Scheduled reconciliation for abandoned payments.
// Call via GET every 1-2 minutes (cron-job.org, Deno Cron, etc.)
// Headers: x-reconcile-key (if RECONCILE_API_KEY is set)
//
// Flow:
// Phase 1: Scan ALL pending payments (recovers orphaned PRNs from duplicate QR gen)
// Phase 2: Scan expired-hold bookings (handles never-generated-QR scenarios)
// Each found payment is checked against Fonepay Status API with mandatory HMAC verification.
// Batch has a hard 60-second total budget to prevent platform timeout.

import { createClient } from "npm:@insforge/sdk"
// ── Inlined from _shared/notifications.ts ──

export type BookingEvent = "booking_created" | "booking_confirmed" | "booking_updated" | "booking_cancelled"

export interface BookingInfo {
  id: string; guest_name: string; guest_email: string; guest_phone: string; room_name: string; room_number: string
  check_in: string; check_out: string; total_price: number; advance_amount?: number; balance_amount?: number
  booking_status: string; payment_status: string; tenant_id?: string; motel_name?: string
}

export interface NotificationResult { email_customer: boolean; email_staff: boolean; whatsapp_customer: boolean; whatsapp_staff: boolean; errors: string[] }

function nHtmlEncode(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;")
}

function nFormatDate(iso: string): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })
}

function nFormatTime(iso: string): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
}

function nFormatCurrency(n: number): string {
  return "NPR " + (n || 0).toLocaleString("en-IN")
}

function nGetStaffEmails(): string[] {
  return (Deno.env.get("STAFF_NOTIFICATION_EMAIL") || "").split(",").map(e => e.trim()).filter(e => e.length > 0)
}

function nGetStaffPhones(): string[] {
  return (Deno.env.get("STAFF_WHATSAPP_PHONE") || "").split(",").map(p => p.trim()).filter(p => p.length > 0)
}

function nIsWhatsAppEnabled(): boolean {
  return !!(Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") && Deno.env.get("WHATSAPP_ACCESS_TOKEN"))
}

function nIsEmailEnabled(): boolean {
  return !!Deno.env.get("RESEND_API_KEY")
}

function nDedupKey(bookingId: string, channel: string, recipientType: string, eventType: string): string {
  return `${bookingId}:${channel}:${recipientType}:${eventType}`
}

function nMotelName(): string {
  return Deno.env.get("MOTEL_NAME") || "Highlands Cafe & Motel Inn"
}

async function nSendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = Deno.env.get("RESEND_API_KEY")
  if (!apiKey) return false
  const from = Deno.env.get("EMAIL_FROM") || "Highlands Cafe & Motel Inn <noreply@highlands-motel.com>"
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    })
    if (!res.ok) { console.error(`[notifications] Resend error ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`); return false }
    return true
  } catch (e) { console.error("[notifications] Resend exception:", e); return false }
}

async function nSendWhatsApp(to: string, body: string): Promise<boolean> {
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN")
  if (!phoneNumberId || !accessToken) return false
  const apiVersion = Deno.env.get("WHATSAPP_API_VERSION") || "v22.0"
  try {
    const res = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: to.replace(/[^0-9]/g, ""), type: "text", text: { preview_url: false, body } }),
    })
    if (!res.ok) { console.error(`[notifications] WhatsApp error ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`); return false }
    return true
  } catch (e) { console.error("[notifications] WhatsApp exception:", e); return false }
}

function nBuildCustomerHtml(b: BookingInfo, event: BookingEvent): string {
  const ge = nHtmlEncode; const motel = b.motel_name || nMotelName(); const isPartial = !!b.advance_amount && b.advance_amount < b.total_price
  const statusBadge = (status: string) => {
    const colors: Record<string, string> = { confirmed: "#059669", pending_payment: "#d97706", cancelled: "#dc2626", pending: "#d97706" }
    const label = status === "pending_payment" ? "Pending" : status.charAt(0).toUpperCase() + status.slice(1)
    return `<span style="display:inline-block;padding:4px 12px;border-radius:999px;font-size:13px;font-weight:600;color:#fff;background:${colors[status] || '#6b7280'}">${label}</span>`
  }
  const subjectLine = event === "booking_created" ? "Booking Received" : event === "booking_confirmed" ? "Booking Confirmed" : event === "booking_cancelled" ? "Booking Cancelled" : "Booking Updated"
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>@media only screen and (max-width:600px){.container{width:100%!important;padding:16px!important}.table-cell{display:block!important;width:100%!important;padding:8px 0!important}}body{margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}</style></head><body style="margin:0;padding:0;background:#f3f4f6"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 16px"><table class="container" role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.08)"><tr><td style="background:linear-gradient(135deg,#92400e,#ea580c);padding:32px 24px;text-align:center"><h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">${ge(motel)}</h1><p style="margin:8px 0 0;color:#fde68a;font-size:14px">${subjectLine}</p></td></tr><tr><td style="padding:24px 24px 0;text-align:center">${statusBadge(b.booking_status)}</td></tr><tr><td style="padding:20px 24px 8px"><h2 style="margin:0 0 16px;font-size:16px;color:#374151;font-weight:600;border-bottom:2px solid #f3f4f6;padding-bottom:8px">Booking Summary</h2><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:6px 0;color:#6b7280;font-size:14px">Guest</td><td style="padding:6px 0;font-size:14px;font-weight:600;text-align:right">${ge(b.guest_name)}</td></tr><tr><td style="padding:6px 0;color:#6b7280;font-size:14px">Room</td><td style="padding:6px 0;font-size:14px;font-weight:600;text-align:right">${ge(b.room_name)}${b.room_number ? ` (#${ge(b.room_number)})` : ""}</td></tr><tr><td style="padding:6px 0;color:#6b7280;font-size:14px">Check-in</td><td style="padding:6px 0;font-size:14px;font-weight:600;text-align:right">${nFormatDate(b.check_in)} at ${nFormatTime(b.check_in)}</td></tr><tr><td style="padding:6px 0;color:#6b7280;font-size:14px">Check-out</td><td style="padding:6px 0;font-size:14px;font-weight:600;text-align:right">${nFormatDate(b.check_out)} at ${nFormatTime(b.check_out)}</td></tr><tr><td style="padding:6px 0;color:#6b7280;font-size:14px">Total Amount</td><td style="padding:6px 0;font-size:14px;font-weight:600;text-align:right">${nFormatCurrency(b.total_price)}</td></tr>${isPartial ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px">Advance (60%)</td><td style="padding:6px 0;font-size:14px;font-weight:600;text-align:right">${nFormatCurrency(b.advance_amount || 0)}</td></tr><tr><td style="padding:6px 0;color:#6b7280;font-size:14px">Balance at Property</td><td style="padding:6px 0;font-size:14px;font-weight:600;text-align:right">${nFormatCurrency(b.balance_amount || 0)}</td></tr>` : ""}<tr><td style="padding:6px 0;color:#6b7280;font-size:14px">Booking ID</td><td style="padding:6px 0;font-size:12px;font-weight:600;text-align:right;font-family:monospace;color:#92400e">${ge(b.id)}</td></tr></table></td></tr><tr><td style="padding:16px 24px 24px;text-align:center;border-top:1px solid #f3f4f6"><p style="margin:0;color:#9ca3af;font-size:12px">If you have any questions, please contact us.</p><p style="margin:8px 0 0;color:#9ca3af;font-size:11px">— ${ge(motel)}</p></td></tr></table></td></tr></table></body></html>`
}

function nBuildStaffHtml(b: BookingInfo, event: BookingEvent): string {
  const ge = nHtmlEncode; const motel = b.motel_name || nMotelName(); const isPartial = !!b.advance_amount && b.advance_amount < b.total_price
  const eventLabels: Record<string, string> = { booking_created: "New Booking Created", booking_confirmed: "Booking Confirmed", booking_updated: "Booking Updated", booking_cancelled: "Booking Cancelled" }
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>@media only screen and (max-width:600px){.container{width:100%!important;padding:16px!important}}body{margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}</style></head><body style="margin:0;padding:0;background:#f3f4f6"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 16px"><table class="container" role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.08)"><tr><td style="background:linear-gradient(135deg,#991b1b,#dc2626);padding:24px;text-align:center"><h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">Staff Alert: ${eventLabels[event]}</h1><p style="margin:6px 0 0;color:#fca5a5;font-size:13px">${ge(motel)}</p></td></tr><tr><td style="padding:20px 24px 8px"><h2 style="margin:0 0 16px;font-size:15px;color:#374151;font-weight:600;border-bottom:2px solid #f3f4f6;padding-bottom:8px">Booking Details</h2><table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px"><tr><td style="padding:5px 0;color:#6b7280">Guest Name</td><td style="padding:5px 0;font-weight:600;text-align:right">${ge(b.guest_name)}</td></tr><tr><td style="padding:5px 0;color:#6b7280">Guest Email</td><td style="padding:5px 0;text-align:right"><a href="mailto:${ge(b.guest_email)}" style="color:#92400e">${ge(b.guest_email)}</a></td></tr><tr><td style="padding:5px 0;color:#6b7280">Guest Phone</td><td style="padding:5px 0;text-align:right">${ge(b.guest_phone)}</td></tr><tr><td style="padding:5px 0;color:#6b7280">Room</td><td style="padding:5px 0;font-weight:600;text-align:right">${ge(b.room_name)}${b.room_number ? ` (#${ge(b.room_number)})` : ""}</td></tr><tr><td style="padding:5px 0;color:#6b7280">Check-in</td><td style="padding:5px 0;font-weight:600;text-align:right">${nFormatDate(b.check_in)} at ${nFormatTime(b.check_in)}</td></tr><tr><td style="padding:5px 0;color:#6b7280">Check-out</td><td style="padding:5px 0;font-weight:600;text-align:right">${nFormatDate(b.check_out)} at ${nFormatTime(b.check_out)}</td></tr><tr><td style="padding:5px 0;color:#6b7280">Status</td><td style="padding:5px 0;font-weight:600;text-align:right;text-transform:capitalize">${b.booking_status}</td></tr><tr><td style="padding:5px 0;color:#6b7280">Payment</td><td style="padding:5px 0;font-weight:600;text-align:right;text-transform:capitalize">${b.payment_status}</td></tr><tr><td style="padding:5px 0;color:#6b7280">Total</td><td style="padding:5px 0;font-weight:600;text-align:right">${nFormatCurrency(b.total_price)}</td></tr>${isPartial ? `<tr><td style="padding:5px 0;color:#6b7280">Advance</td><td style="padding:5px 0;font-weight:600;text-align:right">${nFormatCurrency(b.advance_amount || 0)}</td></tr><tr><td style="padding:5px 0;color:#6b7280">Balance</td><td style="padding:5px 0;font-weight:600;text-align:right">${nFormatCurrency(b.balance_amount || 0)}</td></tr>` : ""}</table></td></tr><tr><td style="padding:16px 24px 24px;text-align:center;border-top:1px solid #f3f4f6"><p style="margin:0;color:#9ca3af;font-size:12px">Booking ID: <code style="font-size:11px;color:#92400e">${ge(b.id)}</code></p></td></tr></table></td></tr></table></body></html>`
}

function nBuildCustomerWhatsApp(b: BookingInfo, event: BookingEvent): string {
  const motel = b.motel_name || nMotelName()
  const greeting = event === "booking_created" ? "Thank you for your booking!" : event === "booking_confirmed" ? "Your booking is confirmed!" : event === "booking_cancelled" ? "Your booking has been cancelled." : "Your booking has been updated."
  const actionNote = event === "booking_created" ? "Please complete payment to confirm your reservation." : event === "booking_confirmed" ? "We look forward to welcoming you!" : event === "booking_cancelled" ? "If this was unexpected, please contact us." : "Please review the updated details below."
  const nights = b.check_in && b.check_out ? Math.ceil((new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / (1000 * 60 * 60 * 24)) : 0
  return [`🏨 *${motel}*`, ``, `*${greeting}*`, ``, `📋 *Booking Summary*`, `👤 Guest: ${b.guest_name}`, `🛏️ Room: ${b.room_name}${b.room_number ? ` (#${b.room_number})` : ""}`, `📅 Check-in: ${nFormatDate(b.check_in)} at ${nFormatTime(b.check_in)}`, `📅 Check-out: ${nFormatDate(b.check_out)} at ${nFormatTime(b.check_out)}`, nights > 0 ? `🌙 Nights: ${nights}` : "", `💰 Total: ${nFormatCurrency(b.total_price)}`, b.advance_amount && b.advance_amount < b.total_price ? `💳 Advance Paid: ${nFormatCurrency(b.advance_amount)}` : "", b.balance_amount ? `💵 Balance: ${nFormatCurrency(b.balance_amount)}` : "", ``, `🔖 Booking ID: ${b.id.slice(0, 8)}...`, ``, `${actionNote}`, ``, `— ${motel}`].filter(l => l).join("\n")
}

function nBuildStaffWhatsApp(b: BookingInfo, event: BookingEvent): string {
  const motel = b.motel_name || nMotelName()
  const eventIcons: Record<string, string> = { booking_created: "🆕", booking_confirmed: "✅", booking_updated: "🔄", booking_cancelled: "❌" }
  const eventLabels: Record<string, string> = { booking_created: "New Booking", booking_confirmed: "Confirmed", booking_updated: "Updated", booking_cancelled: "Cancelled" }
  return [`${eventIcons[event] || "📢"} *Staff Alert: ${eventLabels[event]}*`, `📍 ${motel}`, ``, `👤 Guest: ${b.guest_name}`, `📧 Email: ${b.guest_email}`, `📞 Phone: ${b.guest_phone}`, `🛏️ Room: ${b.room_name}${b.room_number ? ` (#${b.room_number})` : ""}`, `📅 In: ${nFormatDate(b.check_in)} ${nFormatTime(b.check_in)}`, `📅 Out: ${nFormatDate(b.check_out)} ${nFormatTime(b.check_out)}`, `📊 Status: ${b.booking_status}`, `💳 Payment: ${b.payment_status}`, `💰 Total: ${nFormatCurrency(b.total_price)}`, b.advance_amount && b.advance_amount < b.total_price ? `💵 Advance: ${nFormatCurrency(b.advance_amount)}` : "", b.balance_amount ? `💵 Balance: ${nFormatCurrency(b.balance_amount)}` : "", ``, `🔖 ID: ${b.id}`].filter(l => l).join("\n")
}

async function nLog(d: ReturnType<typeof createClient>["database"] | null, p: { booking_id: string; tenant_id?: string; channel: "email" | "whatsapp"; recipient_type: "customer" | "staff"; recipient_address: string; event_type: BookingEvent; subject: string; body_preview: string; status: "sent" | "failed" | "retrying"; retry_count?: number; last_error?: string; dedup_key: string }): Promise<void> {
  if (!d) return
  try { await d.from("notification_logs").insert({ booking_id: p.booking_id, tenant_id: p.tenant_id || null, channel: p.channel, recipient_type: p.recipient_type, recipient_address: p.recipient_address, event_type: p.event_type, subject: p.subject, body_preview: p.body_preview.slice(0, 500), status: p.status, retry_count: p.retry_count || 0, max_retries: 3, last_error: p.last_error || "", dedup_key: p.dedup_key }) } catch (e) { console.error("[notifications] Failed to log notification:", e) }
}

async function nIsDup(d: ReturnType<typeof createClient>["database"] | null, dedupKey: string): Promise<boolean> {
  if (!d) return false
  try { const { data } = await d.from("notification_logs").select("id").eq("dedup_key", dedupKey).in("status", ["sent", "retrying"]).maybeSingle(); return !!data } catch { return false }
}

export async function retryFailedNotifications(d: ReturnType<typeof createClient>["database"], maxRetries = 3, batchSize = 20): Promise<number> {
  const { data: failed } = await d.from("notification_logs").select("*").eq("status", "retrying").lt("retry_count", maxRetries).limit(batchSize)
  if (!failed || failed.length === 0) return 0
  let recovered = 0
  for (const log of failed) {
    try {
      let success = false
      if (log.channel === "email") {
        const booking = await d.from("bookings").select("*").eq("id", log.booking_id).single()
        if (booking.data) success = await nSendEmail(log.recipient_address, log.subject, log.body_preview)
      } else if (log.channel === "whatsapp") {
        success = await nSendWhatsApp(log.recipient_address, log.body_preview)
      }
      const newStatus = success ? "sent" : "retrying"; const newRetry = (log.retry_count || 0) + 1
      await d.from("notification_logs").update({ status: newStatus, retry_count: newRetry, last_error: success ? "" : "Retry failed", delivered_at: success ? new Date().toISOString() : null }).eq("id", log.id)
      if (success) recovered++
    } catch {
      await d.from("notification_logs").update({ retry_count: (log.retry_count || 0) + 1, last_error: "Retry exception" }).eq("id", log.id)
    }
  }
  return recovered
}

export async function sendBookingNotifications(d: ReturnType<typeof createClient>["database"] | null, booking: BookingInfo, event: BookingEvent): Promise<NotificationResult> {
  const result: NotificationResult = { email_customer: false, email_staff: false, whatsapp_customer: false, whatsapp_staff: false, errors: [] }
  const motelName = nMotelName()
  if (nIsEmailEnabled() && booking.guest_email) {
    const dedupKey = nDedupKey(booking.id, "email", "customer", event)
    const isDup = d ? await nIsDup(d, dedupKey) : false
    if (!isDup) {
      const subject = event === "booking_created" ? "Booking Received — " + motelName : event === "booking_confirmed" ? "Booking Confirmed — " + motelName : event === "booking_cancelled" ? "Booking Cancelled — " + motelName : "Booking Updated — " + motelName
      const html = nBuildCustomerHtml(booking, event); const success = await nSendEmail(booking.guest_email, subject, html)
      result.email_customer = success
      await nLog(d, { booking_id: booking.id, tenant_id: booking.tenant_id, channel: "email", recipient_type: "customer", recipient_address: booking.guest_email, event_type: event, subject, body_preview: html, status: success ? "sent" : "failed", last_error: success ? "" : "Resend API error", dedup_key: dedupKey })
      if (!success) result.errors.push("customer_email_failed")
    }
  }
  const staffEmails = nGetStaffEmails()
  if (nIsEmailEnabled() && staffEmails.length > 0) {
    const dedupKey = nDedupKey(booking.id, "email", "staff", event)
    const isDup = d ? await nIsDup(d, dedupKey) : false
    if (!isDup) {
      const eventLabels: Record<string, string> = { booking_created: "New Booking Alert", booking_confirmed: "Booking Confirmed", booking_updated: "Booking Updated", booking_cancelled: "Booking Cancelled" }
      const subject = `${eventLabels[event]} — ${motelName}`; const html = nBuildStaffHtml(booking, event)
      const success = await nSendEmail(staffEmails.join(","), subject, html)
      result.email_staff = success
      for (const email of staffEmails) {
        await nLog(d, { booking_id: booking.id, tenant_id: booking.tenant_id, channel: "email", recipient_type: "staff", recipient_address: email, event_type: event, subject, body_preview: html, status: success ? "sent" : "failed", last_error: success ? "" : "Resend API error", dedup_key: `${dedupKey}:${email}` })
      }
      if (!success) result.errors.push("staff_email_failed")
    }
  }
  if (nIsWhatsAppEnabled() && booking.guest_phone) {
    const dedupKey = nDedupKey(booking.id, "whatsapp", "customer", event)
    const isDup = d ? await nIsDup(d, dedupKey) : false
    if (!isDup) {
      const text = nBuildCustomerWhatsApp(booking, event); const success = await nSendWhatsApp(booking.guest_phone, text)
      result.whatsapp_customer = success
      await nLog(d, { booking_id: booking.id, tenant_id: booking.tenant_id, channel: "whatsapp", recipient_type: "customer", recipient_address: booking.guest_phone, event_type: event, subject: "", body_preview: text, status: success ? "sent" : "failed", last_error: success ? "" : "WhatsApp API error", dedup_key: dedupKey })
      if (!success) result.errors.push("customer_whatsapp_failed")
    }
  }
  const staffPhones = nGetStaffPhones()
  if (nIsWhatsAppEnabled() && staffPhones.length > 0) {
    const dedupKey = nDedupKey(booking.id, "whatsapp", "staff", event)
    const isDup = d ? await nIsDup(d, dedupKey) : false
    if (!isDup) {
      const text = nBuildStaffWhatsApp(booking, event)
      for (const phone of staffPhones) {
        const success = await nSendWhatsApp(phone, text)
        if (success) result.whatsapp_staff = true
        await nLog(d, { booking_id: booking.id, tenant_id: booking.tenant_id, channel: "whatsapp", recipient_type: "staff", recipient_address: phone, event_type: event, subject: "", body_preview: text, status: success ? "sent" : "failed", last_error: success ? "" : "WhatsApp API error", dedup_key: `${dedupKey}:${phone}` })
        if (!success) result.errors.push(`staff_whatsapp_failed:${phone}`)
      }
    }
  }
  return result
}
// ── End inlined ──

const FETCH_TIMEOUT_MS = 10_000
const MAX_BATCH = 100
const MAX_HOLD_MS = 30 * 60 * 1000
const EXTEND_MS = 5 * 60 * 1000
const RECONCILIATION_TIMEOUT_MS = 60_000
const PENDING_PAYMENT_AGE_MS = 5 * 60 * 1000

const merchantBase = (Deno.env.get("FONEPAY_MERCHANT_BASE") || "https://merchantapi.fonepay.com").replace(/\/+$/, "")
const ENDPOINTS = {
  qrStatus: `${merchantBase}/api/merchant/merchantDetailsForThirdParty/thirdPartyDynamicQrGetStatus`,
}

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

async function hmacSha512(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"])
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("")
}





function errorResponse(message: string, status = 400): Response {
  return new Response(JSON.stringify({ message, error: "RECONCILIATION_ERROR" }), { headers: { "Content-Type": "application/json" }, status })
}

// ── Core: check a single PRN against Fonepay Status API ──────────────────────

async function checkFonepayStatus(
  prn: string,
  merchantCode: string,
  merchantSecret: string,
  username: string,
  password: string,
): Promise<{ status: 'success' | 'failed' | 'pending' | 'unreachable'; fonepayResult?: Record<string, unknown> }> {
  const dataValidation = await hmacSha512(merchantSecret, `${prn},${merchantCode}`)
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const res = await fetch(ENDPOINTS.qrStatus, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prn, merchantCode, dataValidation, username, password }),
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) {
      const errBody = await res.text().catch(() => "(unreadable)")
      console.error(`Reconciliation: Fonepay status check failed [${res.status}] for PRN ${prn}: ${errBody}`)
      return { status: 'unreachable' }
    }
    const result = await res.json() as Record<string, unknown>
    const rawStatus = String(result.paymentStatus || "").toLowerCase()
    if (rawStatus === "success") return { status: 'success', fonepayResult: result }
    if (rawStatus === "failed" || rawStatus === "cancelled") return { status: 'failed', fonepayResult: result }
    return { status: 'pending', fonepayResult: result }
  } catch {
    return { status: 'unreachable' }
  }
}

// ── HMAC verification for Fonepay response (MANDATORY — rejects if missing) ──

async function verifyFonepayResponse(
  merchantSecret: string,
  merchantCode: string,
  fonepayResult: Record<string, unknown>,
): Promise<{ valid: boolean; error?: string }> {
  const responseDv = fonepayResult.dataValidation
  if (!responseDv || typeof responseDv !== "string" || responseDv.length === 0) {
    return { valid: false, error: "Missing dataValidation in Fonepay response" }
  }
  const expectedFields = [
    String(fonepayResult.fonepayTraceId ?? ""),
    String(fonepayResult.amount ?? "0"),
    String(fonepayResult.prn ?? ""),
    merchantCode,
    String(fonepayResult.paymentStatus ?? ""),
  ]
  const computedDv = await hmacSha512(merchantSecret, expectedFields.join(","))
  if (computedDv !== responseDv) {
    return { valid: false, error: "Fonepay response HMAC signature mismatch" }
  }
  return { valid: true }
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
  const username = Deno.env.get("FONEPAY_USERNAME") || ""
  const password = Deno.env.get("FONEPAY_PASSWORD") || ""

  if (!merchantCode || !merchantSecret) return errorResponse("Payment gateway not configured", 500)

  try {
    const baseUrl = Deno.env.get("INSFORGE_BASE_URL") || ""
    const anonKey = Deno.env.get("API_KEY") || ""
    if (!baseUrl || !anonKey) return errorResponse("Database not configured", 500)
    const { database: db } = createClient({ baseUrl, anonKey })

    const startTime = Date.now()

    const results = {
      phase1_pending_payments: 0,
      phase2_expired_holds: 0,
      recovered: 0,
      expired: 0,
      extended: 0,
      hmac_rejected: 0,
      skipped_timeout: 0,
      errors: 0,
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 1: Scan ALL pending payments (recovers orphaned PRNs)
    // ═══════════════════════════════════════════════════════════════════════════

    const pendingPaymentAge = new Date(Date.now() - PENDING_PAYMENT_AGE_MS).toISOString()

    const { data: pendingPayments, error: ppError } = await db
      .from("payments")
      .select("id, booking_id, prn, amount, fonepay_trace_id, created_at")
      .eq("status", "pending")
      .lt("created_at", pendingPaymentAge)
      .order("created_at", { ascending: true })
      .limit(MAX_BATCH)

    if (ppError) return errorResponse("Phase 1 query failed: " + ppError.message, 500)

    results.phase1_pending_payments = (pendingPayments || []).length

    for (const payment of pendingPayments || []) {
      if (Date.now() - startTime > RECONCILIATION_TIMEOUT_MS) {
        results.skipped_timeout++
        break
      }

      try {
        const status = await checkFonepayStatus(payment.prn, merchantCode, merchantSecret, username, password)

        if (status.status === 'unreachable') {
          continue
        }

        if (status.status === 'success' && status.fonepayResult) {
          // MANDATORY HMAC verification — reject if missing or invalid
          const hmacCheck = await verifyFonepayResponse(merchantSecret, merchantCode, status.fonepayResult)
          if (!hmacCheck.valid) {
            await db.from("payments")
              .update({ status: "failed", response_msg: "hmac_rejected: " + hmacCheck.error })
              .eq("id", payment.id).eq("status", "pending")
            results.hmac_rejected++
            continue
          }

          const fonepayTraceId = String(status.fonepayResult.fonepayTraceId || status.fonepayResult.fonepayTraceId === 0 ? status.fonepayResult.fonepayTraceId : "")

          // Look up associated booking
          const { data: booking } = await db
            .from("bookings")
            .select("id, guest_name, guest_email, check_in, check_out, room_id, total_price, advance_amount, balance_amount, booking_status")
            .eq("id", payment.booking_id)
            .single()

          if (!booking || booking.booking_status !== "pending_payment") {
            // Booking already confirmed or doesn't exist — mark payment as failed
            await db.from("payments")
              .update({ status: "failed", response_msg: "booking_not_available" })
              .eq("id", payment.id).eq("status", "pending")
            results.expired++
            continue
          }

          // Call atomic stored procedure
          const { data: rpcResult } = await db.rpc("confirm_booking_payment", {
            p_payment_id: payment.id,
            p_booking_id: payment.booking_id,
            p_prn: payment.prn,
            p_amount: payment.amount,
            p_fonepay_trace_id: fonepayTraceId || "",
          }).single()

          const confirmed = rpcResult && (rpcResult as Record<string, unknown>)?.success === true

          if (confirmed) {
            results.recovered++
            ;(async () => {
              try {
                const { data: room } = await db.from("rooms").select("name, room_number").eq("id", booking.room_id).single()
                const info: BookingInfo = {
                  id: booking.id,
                  guest_name: booking.guest_name,
                  guest_email: booking.guest_email,
                  guest_phone: "",
                  room_name: room?.name || "Selected Room",
                  room_number: room?.room_number || "",
                  check_in: booking.check_in,
                  check_out: booking.check_out,
                  total_price: booking.total_price,
                  advance_amount: booking.advance_amount || undefined,
                  balance_amount: booking.balance_amount || undefined,
                  booking_status: "confirmed",
                  payment_status: "paid",
                }
                await sendBookingNotifications(db, info, "booking_confirmed")
              } catch { /* best-effort */ }
            })()
          } else {
            // RPC returned false (likely idempotent or conflict)
            results.recovered++
          }
        } else if (status.status === 'failed') {
          await db.from("payments")
            .update({ status: "failed", response_msg: "fonepay_rejected" })
            .eq("id", payment.id).eq("status", "pending")
          results.expired++
        }
        // pending / unreachable: skip (try next cycle)
      } catch {
        results.errors++
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PHASE 2: Scan expired-hold bookings (handles never-generated-QR scenarios)
    // ═══════════════════════════════════════════════════════════════════════════

    if (Date.now() - startTime < RECONCILIATION_TIMEOUT_MS) {
      const now = new Date().toISOString()

      const { data: expiredBookings, error: fetchError } = await db
        .from("bookings")
        .select("id, active_prn, hold_expires_at, total_price, advance_amount, balance_amount, guest_name, guest_email, check_in, check_out, room_id, payment_status")
        .eq("booking_status", "pending_payment")
        .lt("hold_expires_at", now)
        .limit(MAX_BATCH)

      if (!fetchError) {
        results.phase2_expired_holds = (expiredBookings || []).length

        for (const booking of expiredBookings || []) {
          if (Date.now() - startTime > RECONCILIATION_TIMEOUT_MS) {
            results.skipped_timeout++
            break
          }

          try {
            const prn = booking.active_prn

            if (!prn) {
              await db.from("bookings")
                .update({ booking_status: "expired", payment_status: "failed" })
                .eq("id", booking.id).eq("booking_status", "pending_payment")
              results.expired++
              continue
            }

            const status = await checkFonepayStatus(prn, merchantCode, merchantSecret, username, password)

            if (status.status === 'unreachable') {
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
              continue
            }

            if (status.status === 'success' && status.fonepayResult) {
              // MANDATORY HMAC verification
              const hmacCheck = await verifyFonepayResponse(merchantSecret, merchantCode, status.fonepayResult)
              if (!hmacCheck.valid) {
                await db.from("bookings").update({ booking_status: "expired", payment_status: "failed" })
                  .eq("id", booking.id).eq("booking_status", "pending_payment")
                results.hmac_rejected++
                continue
              }

              const fonepayTraceId = String(status.fonepayResult.fonepayTraceId || status.fonepayResult.fonepayTraceId === 0 ? status.fonepayResult.fonepayTraceId : "")

              // Find payment record for this PRN
              const { data: existingPayment } = await db
                .from("payments")
                .select("id, status, amount")
                .eq("prn", prn)
                .maybeSingle()

              if (existingPayment) {
                const { data: rpcResult } = await db.rpc("confirm_booking_payment", {
                  p_payment_id: existingPayment.id,
                  p_booking_id: booking.id,
                  p_prn: prn,
                  p_amount: existingPayment.amount,
                  p_fonepay_trace_id: fonepayTraceId,
                }).single()

                if (rpcResult && (rpcResult as Record<string, unknown>)?.success === true) {
                  results.recovered++
                  ;(async () => {
                    try {
                      const { data: room } = await db.from("rooms").select("name, room_number").eq("id", booking.room_id).single()
                      const info: BookingInfo = {
                        id: booking.id,
                        guest_name: booking.guest_name,
                        guest_email: booking.guest_email,
                        guest_phone: "",
                        room_name: room?.name || "Selected Room",
                        room_number: room?.room_number || "",
                        check_in: booking.check_in,
                        check_out: booking.check_out,
                        total_price: booking.total_price,
                        advance_amount: booking.advance_amount || undefined,
                        balance_amount: booking.balance_amount || undefined,
                        booking_status: "confirmed",
                        payment_status: "paid",
                      }
                      await sendBookingNotifications(db, info, "booking_confirmed")
                    } catch { /* best-effort */ }
                  })()
                } else {
                  results.recovered++
                }
              } else {
                // Payment record missing — anomalous. Create one.
                const paidAmount = parseFloat(String(status.fonepayResult.amount || status.fonepayResult.txnAmount || "0")) || booking.total_price
                const { data: newPayment } = await db.from("payments").insert({
                  booking_id: booking.id, prn, amount: paidAmount,
                  payment_method: "fonepay_qr", status: "pending",
                }).select("id").single()

                if (newPayment) {
                  const { data: rpcResult } = await db.rpc("confirm_booking_payment", {
                    p_payment_id: newPayment.id, p_booking_id: booking.id,
                    p_prn: prn, p_amount: paidAmount, p_fonepay_trace_id: fonepayTraceId,
                  }).single()

                  if (rpcResult && (rpcResult as Record<string, unknown>)?.success === true) {
                    results.recovered++
                    ;(async () => {
                      try {
                        const { data: room } = await db.from("rooms").select("name, room_number").eq("id", booking.room_id).single()
                        const info: BookingInfo = {
                          id: booking.id,
                          guest_name: booking.guest_name,
                          guest_email: booking.guest_email,
                          guest_phone: "",
                          room_name: room?.name || "Selected Room",
                          room_number: room?.room_number || "",
                          check_in: booking.check_in,
                          check_out: booking.check_out,
                          total_price: booking.total_price,
                          advance_amount: booking.advance_amount || undefined,
                          balance_amount: booking.balance_amount || undefined,
                          booking_status: "confirmed",
                          payment_status: "paid",
                        }
                        await sendBookingNotifications(db, info, "booking_confirmed")
                      } catch { /* best-effort */ }
                    })()
                  }
                }
              }
            } else if (status.status === 'failed') {
              await db.from("bookings").update({ booking_status: "failed", payment_status: "failed" })
                .eq("id", booking.id).eq("booking_status", "pending_payment")
              results.expired++
            } else {
              // Still pending at Fonepay — extend or expire
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
      }
    }

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      elapsed_ms: Date.now() - startTime,
      results,
    }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("payment-reconciliation error:", error)
    return new Response(JSON.stringify({ message, error: "RECONCILIATION_ERROR" }), {
      headers: { "Content-Type": "application/json" }, status: 500,
    })
  }
}
