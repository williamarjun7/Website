// ─── Shared Notification Module ──────────────────────────────────────────────
// Email (Resend) + WhatsApp (Meta Cloud API) with logging, dedup, retry.
// Import in any edge function: import { sendBookingNotifications } from "../_shared/notifications.ts"

import { createClient } from "npm:@insforge/sdk"

// ─── Types ──────────────────────────────────────────────────────────────────

export type BookingEvent = "booking_created" | "booking_confirmed" | "booking_updated" | "booking_cancelled"

export interface BookingInfo {
  id: string
  guest_name: string
  guest_email: string
  guest_phone: string
  room_name: string
  room_number: string
  check_in: string
  check_out: string
  total_price: number
  advance_amount?: number
  balance_amount?: number
  booking_status: string
  payment_status: string
  tenant_id?: string
  motel_name?: string
  guests?: number
  created_at?: string
  special_requests?: string
}

export interface NotificationResult {
  email_customer: boolean
  email_staff: boolean
  whatsapp_customer: boolean
  whatsapp_staff: boolean
  errors: string[]
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function htmlEncode(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;")
}

function formatDate(iso: string): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })
}

function formatTime(iso: string): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
}

function formatCurrency(n: number): string {
  return "NPR " + (n || 0).toLocaleString("en-IN")
}

function getStaffEmails(): string[] {
  const raw = Deno.env.get("STAFF_NOTIFICATION_EMAIL") || ""
  return raw.split(",").map(e => e.trim()).filter(e => e.length > 0)
}

function getStaffPhones(): string[] {
  const raw = Deno.env.get("STAFF_WHATSAPP_PHONE") || ""
  return raw.split(",").map(p => p.trim()).filter(p => p.length > 0)
}

function isWhatsAppEnabled(): boolean {
  return !!(Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") && Deno.env.get("WHATSAPP_ACCESS_TOKEN"))
}

function isEmailEnabled(): boolean {
  return !!Deno.env.get("RESEND_API_KEY")
}

function generateDedupKey(bookingId: string, channel: string, recipientType: string, eventType: string): string {
  return `${bookingId}:${channel}:${recipientType}:${eventType}`
}

function getMotelName(): string {
  return Deno.env.get("MOTEL_NAME") || "Highlands Cafe & Motel Inn"
}

// ─── Email: Resend API ──────────────────────────────────────────────────────

async function sendEmailViaResend(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = Deno.env.get("RESEND_API_KEY")
  if (!apiKey) return false
  const from = Deno.env.get("EMAIL_FROM") || "Highlands Cafe & Motel Inn <noreply@highlands-motel.com>"
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      console.error(`[notifications] Resend error ${res.status}: ${body.slice(0, 300)}`)
      return false
    }
    return true
  } catch (e) {
    console.error("[notifications] Resend exception:", e)
    return false
  }
}

// ─── WhatsApp: Meta Cloud API ───────────────────────────────────────────────

async function sendWhatsAppMessage(to: string, body: string): Promise<boolean> {
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN")
  if (!phoneNumberId || !accessToken) return false

  const apiVersion = Deno.env.get("WHATSAPP_API_VERSION") || "v22.0"
  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to.replace(/[^0-9]/g, ""),
        type: "text",
        text: { preview_url: false, body },
      }),
    })
    if (!res.ok) {
      const errBody = await res.text().catch(() => "")
      console.error(`[notifications] WhatsApp error ${res.status}: ${errBody.slice(0, 300)}`)
      return false
    }
    return true
  } catch (e) {
    console.error("[notifications] WhatsApp exception:", e)
    return false
  }
}

// ─── HTML Email Templates ───────────────────────────────────────────────────

function buildCustomerEmailHtml(b: BookingInfo, event: BookingEvent): string {
  const ge = htmlEncode
  const motel = b.motel_name || getMotelName()
  const isPartial = !!b.advance_amount && b.advance_amount < b.total_price

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      confirmed: "#059669", pending_payment: "#d97706", cancelled: "#dc2626", pending: "#d97706",
    }
    const label = status === "pending_payment" ? "Pending" : status.charAt(0).toUpperCase() + status.slice(1)
    return `<span style="display:inline-block;padding:4px 12px;border-radius:999px;font-size:13px;font-weight:600;color:#fff;background:${colors[status] || '#6b7280'}">${label}</span>`
  }

  const subjectLine = event === "booking_created" ? "Booking Received" :
    event === "booking_confirmed" ? "Booking Confirmed" :
    event === "booking_cancelled" ? "Booking Cancelled" :
    "Booking Updated"

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  @media only screen and (max-width:600px){.container{width:100%!important;padding:16px!important}.table-cell{display:block!important;width:100%!important;padding:8px 0!important}}
  body{margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
</style>
</head>
<body style="margin:0;padding:0;background:#f3f4f6">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 16px">
<table class="container" role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.08)">
  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#92400e,#ea580c);padding:32px 24px;text-align:center">
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">${ge(motel)}</h1>
    <p style="margin:8px 0 0;color:#fde68a;font-size:14px">${subjectLine}</p>
  </td></tr>

  <!-- Status -->
  <tr><td style="padding:24px 24px 0;text-align:center">
    ${statusBadge(b.booking_status)}
  </td></tr>

  <!-- Booking Summary -->
  <tr><td style="padding:20px 24px 8px">
    <h2 style="margin:0 0 16px;font-size:16px;color:#374151;font-weight:600;border-bottom:2px solid #f3f4f6;padding-bottom:8px">Booking Summary</h2>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:6px 0;color:#6b7280;font-size:14px">Guest</td><td style="padding:6px 0;font-size:14px;font-weight:600;text-align:right">${ge(b.guest_name)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;font-size:14px">Room</td><td style="padding:6px 0;font-size:14px;font-weight:600;text-align:right">${ge(b.room_name)}${b.room_number ? ` (#${ge(b.room_number)})` : ""}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;font-size:14px">Check-in</td><td style="padding:6px 0;font-size:14px;font-weight:600;text-align:right">${formatDate(b.check_in)} at ${formatTime(b.check_in)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;font-size:14px">Check-out</td><td style="padding:6px 0;font-size:14px;font-weight:600;text-align:right">${formatDate(b.check_out)} at ${formatTime(b.check_out)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;font-size:14px">Total Amount</td><td style="padding:6px 0;font-size:14px;font-weight:600;text-align:right">${formatCurrency(b.total_price)}</td></tr>
      ${isPartial ? `
      <tr><td style="padding:6px 0;color:#6b7280;font-size:14px">Advance (60%)</td><td style="padding:6px 0;font-size:14px;font-weight:600;text-align:right">${formatCurrency(b.advance_amount || 0)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;font-size:14px">Balance at Property</td><td style="padding:6px 0;font-size:14px;font-weight:600;text-align:right">${formatCurrency(b.balance_amount || 0)}</td></tr>
      ` : ""}
      <tr><td style="padding:6px 0;color:#6b7280;font-size:14px">Booking ID</td><td style="padding:6px 0;font-size:12px;font-weight:600;text-align:right;font-family:monospace;color:#92400e">${ge(b.id)}</td></tr>
    </table>
  </td></tr>

  <!-- Motel Contact Information -->
  <tr><td style="padding:16px 24px 8px">
    <h2 style="margin:0 0 12px;font-size:15px;color:#374151;font-weight:600;border-bottom:2px solid #f3f4f6;padding-bottom:8px">Contact Information</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px">
      <tr><td style="padding:4px 0;color:#6b7280">Motel</td><td style="padding:4px 0;font-weight:600;text-align:right">${ge(motel)}</td></tr>
      <tr><td style="padding:4px 0;color:#6b7280">Phone</td><td style="padding:4px 0;text-align:right">${Deno.env.get("MOTEL_PHONE") || "+977-9763215874"}</td></tr>
      <tr><td style="padding:4px 0;color:#6b7280">Email</td><td style="padding:4px 0;text-align:right">${Deno.env.get("MOTEL_EMAIL") || "highlandscafemotelinn@gmail.com"}</td></tr>
      <tr><td style="padding:4px 0;color:#6b7280">Address</td><td style="padding:4px 0;text-align:right;max-width:280px">${Deno.env.get("MOTEL_ADDRESS") || "Birendranagar-07, Khajura, Surkhet, Karnali Province, Nepal"}</td></tr>
    </table>
  </td></tr>

  <!-- Check-in Instructions -->
  <tr><td style="padding:8px 24px 8px">
    <h2 style="margin:0 0 12px;font-size:15px;color:#374151;font-weight:600;border-bottom:2px solid #f3f4f6;padding-bottom:8px">Check-in Instructions</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px">
      <tr><td style="padding:4px 0;color:#6b7280">Check-in Time</td><td style="padding:4px 0;font-weight:600;text-align:right">From 2:00 PM</td></tr>
      <tr><td style="padding:4px 0;color:#6b7280">Check-out Time</td><td style="padding:4px 0;font-weight:600;text-align:right">12:00 PM</td></tr>
      <tr><td style="padding:4px 0;color:#6b7280">Front Desk Hours</td><td style="padding:4px 0;text-align:right">7:00 AM - 8:00 PM</td></tr>
      <tr><td style="padding:8px 0 4px;color:#4b5563;font-size:12px" colspan="2">Please proceed to the front desk upon arrival. For late check-ins (after 8:00 PM), please call ahead to make arrangements.</td></tr>
    </table>
  </td></tr>

  <!-- Required Identification Documents -->
  <tr><td style="padding:8px 24px 16px">
    <h2 style="margin:0 0 12px;font-size:15px;color:#374151;font-weight:600;border-bottom:2px solid #f3f4f6;padding-bottom:8px">Required Documents for Check-in</h2>
    <p style="margin:0;color:#4b5563;font-size:13px;line-height:1.6">Please bring one of the following government-issued photo identification documents for verification during check-in:</p>
    <ul style="margin:8px 0 0;padding:0 0 0 18px;color:#4b5563;font-size:13px;line-height:1.8">
      <li>Citizenship Card</li>
      <li>National ID Card</li>
      <li>Passport</li>
      <li>Driver's License</li>
      <li>Any government-issued photo identification</li>
    </ul>
  </td></tr>

  <!-- Footer note -->
  <tr><td style="padding:16px 24px 24px;text-align:center;border-top:1px solid #f3f4f6">
    <p style="margin:0;color:#9ca3af;font-size:12px">If you have any questions, please contact us at ${Deno.env.get("MOTEL_PHONE") || "+977-9763215874"} or email ${Deno.env.get("MOTEL_EMAIL") || "highlandscafemotelinn@gmail.com"}.</p>
    <p style="margin:8px 0 0;color:#9ca3af;font-size:11px">— ${ge(motel)}</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`
}

function buildStaffEmailHtml(b: BookingInfo, event: BookingEvent): string {
  const ge = htmlEncode
  const motel = b.motel_name || getMotelName()
  const isPartial = !!b.advance_amount && b.advance_amount < b.total_price

  const eventLabels: Record<string, string> = {
    booking_created: "New Booking Created",
    booking_confirmed: "Booking Confirmed",
    booking_updated: "Booking Updated",
    booking_cancelled: "Booking Cancelled",
  }

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  @media only screen and (max-width:600px){.container{width:100%!important;padding:16px!important}}
  body{margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
</style>
</head>
<body style="margin:0;padding:0;background:#f3f4f6">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 16px">
<table class="container" role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.08)">
  <tr><td style="background:linear-gradient(135deg,#991b1b,#dc2626);padding:24px;text-align:center">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">Staff Alert: ${eventLabels[event]}</h1>
    <p style="margin:6px 0 0;color:#fca5a5;font-size:13px">${ge(motel)}</p>
  </td></tr>

  <tr><td style="padding:20px 24px 8px">
    <h2 style="margin:0 0 16px;font-size:15px;color:#374151;font-weight:600;border-bottom:2px solid #f3f4f6;padding-bottom:8px">Booking Details</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px">
      <tr><td style="padding:5px 0;color:#6b7280">Guest Name</td><td style="padding:5px 0;font-weight:600;text-align:right">${ge(b.guest_name)}</td></tr>
      <tr><td style="padding:5px 0;color:#6b7280">Guest Email</td><td style="padding:5px 0;text-align:right"><a href="mailto:${ge(b.guest_email)}" style="color:#92400e">${ge(b.guest_email)}</a></td></tr>
      <tr><td style="padding:5px 0;color:#6b7280">Guest Phone</td><td style="padding:5px 0;text-align:right">${ge(b.guest_phone)}</td></tr>
      <tr><td style="padding:5px 0;color:#6b7280">Room</td><td style="padding:5px 0;font-weight:600;text-align:right">${ge(b.room_name)}${b.room_number ? ` (#${ge(b.room_number)})` : ""}</td></tr>
      <tr><td style="padding:5px 0;color:#6b7280">Check-in</td><td style="padding:5px 0;font-weight:600;text-align:right">${formatDate(b.check_in)} at ${formatTime(b.check_in)}</td></tr>
      <tr><td style="padding:5px 0;color:#6b7280">Check-out</td><td style="padding:5px 0;font-weight:600;text-align:right">${formatDate(b.check_out)} at ${formatTime(b.check_out)}</td></tr>
      ${b.guests ? `<tr><td style="padding:5px 0;color:#6b7280">Guests</td><td style="padding:5px 0;font-weight:600;text-align:right">${b.guests}</td></tr>` : ""}
      <tr><td style="padding:5px 0;color:#6b7280">Status</td><td style="padding:5px 0;font-weight:600;text-align:right;text-transform:capitalize">${b.booking_status}</td></tr>
      <tr><td style="padding:5px 0;color:#6b7280">Payment</td><td style="padding:5px 0;font-weight:600;text-align:right;text-transform:capitalize">${b.payment_status}</td></tr>
      <tr><td style="padding:5px 0;color:#6b7280">Total</td><td style="padding:5px 0;font-weight:600;text-align:right">${formatCurrency(b.total_price)}</td></tr>
      ${isPartial ? `
      <tr><td style="padding:5px 0;color:#6b7280">Advance</td><td style="padding:5px 0;font-weight:600;text-align:right">${formatCurrency(b.advance_amount || 0)}</td></tr>
      <tr><td style="padding:5px 0;color:#6b7280">Balance</td><td style="padding:5px 0;font-weight:600;text-align:right">${formatCurrency(b.balance_amount || 0)}</td></tr>
      ` : ""}
      ${b.created_at ? `<tr><td style="padding:5px 0;color:#6b7280">Booked At</td><td style="padding:5px 0;font-weight:600;text-align:right">${formatDate(b.created_at)} ${formatTime(b.created_at)}</td></tr>` : ""}
      ${b.special_requests ? `<tr><td style="padding:5px 0;color:#6b7280;vertical-align:top">Special Requests</td><td style="padding:5px 0;font-weight:600;text-align:right;max-width:300px;word-break:break-word">${ge(b.special_requests)}</td></tr>` : ""}
    </table>
  </td></tr>

  <tr><td style="padding:16px 24px 24px;text-align:center;border-top:1px solid #f3f4f6">
    <p style="margin:0;color:#9ca3af;font-size:12px">Booking ID: <code style="font-size:11px;color:#92400e">${ge(b.id)}</code></p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`
}

// ─── WhatsApp Text Templates ────────────────────────────────────────────────

function buildCustomerWhatsAppText(b: BookingInfo, event: BookingEvent): string {
  const motel = b.motel_name || getMotelName()

  const greeting = event === "booking_created" ? "Thank you for your booking!" :
    event === "booking_confirmed" ? "Your booking is confirmed!" :
    event === "booking_cancelled" ? "Your booking has been cancelled." :
    "Your booking has been updated."

  const actionNote = event === "booking_created" ? "Please complete payment to confirm your reservation." :
    event === "booking_confirmed" ? "We look forward to welcoming you!" :
    event === "booking_cancelled" ? "If this was unexpected, please contact us." :
    "Please review the updated details below."

  const nights = b.check_in && b.check_out
    ? Math.ceil((new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const motelPhone = Deno.env.get("MOTEL_PHONE") || "+977-9763215874"
  const motelEmail = Deno.env.get("MOTEL_EMAIL") || "highlandscafemotelinn@gmail.com"
  const motelAddress = Deno.env.get("MOTEL_ADDRESS") || "Birendranagar-07, Khajura, Surkhet, Karnali Province, Nepal"

  return [
    `🏨 *${motel}*`,
        ``,
    `*${greeting}*`,
    ``,
    `📋 *Booking Summary*`,
    `👤 Guest: ${b.guest_name}`,
    `🛏️ Room: ${b.room_name}${b.room_number ? ` (#${b.room_number})` : ""}`,
    `📅 Check-in: ${formatDate(b.check_in)} at ${formatTime(b.check_in)}`,
    `📅 Check-out: ${formatDate(b.check_out)} at ${formatTime(b.check_out)}`,
    nights > 0 ? `🌙 Nights: ${nights}` : "",
    `💰 Total: ${formatCurrency(b.total_price)}`,
    b.advance_amount && b.advance_amount < b.total_price ? `💳 Advance Paid: ${formatCurrency(b.advance_amount)}` : "",
    b.balance_amount ? `💵 Balance: ${formatCurrency(b.balance_amount)}` : "",
    ``,
    `🔖 Booking ID: ${b.id.slice(0, 8)}...`,
    ``,
    `📍 *Contact Information*`,
    `📞 ${motelPhone}`,
    `📧 ${motelEmail}`,
    `🏠 ${motelAddress}`,
    ``,
    `⏰ *Check-in Instructions*`,
    `Check-in: From 2:00 PM`,
    `Check-out: 12:00 PM`,
    `Front Desk: 7:00 AM - 8:00 PM`,
    `For late check-ins (after 8:00 PM), please call ahead.`,
    ``,
    `🪪 *Required Documents*`,
    `Please bring one of the following for verification:`,
    `• Citizenship Card`,
    `• National ID Card`,
    `• Passport`,
    `• Driver's License`,
    `• Any government-issued photo ID`,
    ``,
    `${actionNote}`,
    ``,
    `— ${motel}`,
  ].filter(l => l).join("\n")
}

function buildStaffWhatsAppText(b: BookingInfo, event: BookingEvent): string {
  const motel = b.motel_name || getMotelName()

  const eventIcons: Record<string, string> = {
    booking_created: "🆕",
    booking_confirmed: "✅",
    booking_updated: "🔄",
    booking_cancelled: "❌",
  }
  const eventLabels: Record<string, string> = {
    booking_created: "New Booking",
    booking_confirmed: "Confirmed",
    booking_updated: "Updated",
    booking_cancelled: "Cancelled",
  }

  return [
    `${eventIcons[event] || "📢"} *Staff Alert: ${eventLabels[event]}*`,
    `📍 ${motel}`,
    ``,
    `👤 Guest: ${b.guest_name}`,
    `📧 Email: ${b.guest_email}`,
    `📞 Phone: ${b.guest_phone}`,
    `🛏️ Room: ${b.room_name}${b.room_number ? ` (#${b.room_number})` : ""}`,
    `📅 In: ${formatDate(b.check_in)} ${formatTime(b.check_in)}`,
    `📅 Out: ${formatDate(b.check_out)} ${formatTime(b.check_out)}`,
    b.guests ? `👥 Guests: ${b.guests}` : "",
    `📊 Status: ${b.booking_status}`,
    `💳 Payment: ${b.payment_status}`,
    `💰 Total: ${formatCurrency(b.total_price)}`,
    b.advance_amount && b.advance_amount < b.total_price ? `💵 Advance: ${formatCurrency(b.advance_amount)}` : "",
    b.balance_amount ? `💵 Balance: ${formatCurrency(b.balance_amount)}` : "",
    b.created_at ? `🕐 Booked: ${formatDate(b.created_at)} ${formatTime(b.created_at)}` : "",
    b.special_requests ? `📝 Notes: ${b.special_requests}` : "",
    ``,
    `🔖 ID: ${b.id}`,
  ].filter(l => l).join("\n")
}

// ─── Database Logging ───────────────────────────────────────────────────────

async function logNotification(
  db: ReturnType<typeof createClient>["database"] | null,
  params: {
    booking_id: string
    tenant_id?: string
    channel: "email" | "whatsapp"
    recipient_type: "customer" | "staff"
    recipient_address: string
    event_type: BookingEvent
    subject: string
    body_preview: string
    status: "sent" | "failed" | "retrying"
    retry_count?: number
    last_error?: string
    dedup_key: string
  },
): Promise<void> {
  if (!db) return
  try {
    await db.from("notification_logs").insert({
      booking_id: params.booking_id,
      tenant_id: params.tenant_id || null,
      channel: params.channel,
      recipient_type: params.recipient_type,
      recipient_address: params.recipient_address,
      event_type: params.event_type,
      subject: params.subject,
      body_preview: params.body_preview.slice(0, 500),
      status: params.status,
      retry_count: params.retry_count || 0,
      max_retries: 3,
      last_error: params.last_error || "",
      dedup_key: params.dedup_key,
    })
  } catch (e) {
    console.error("[notifications] Failed to log notification:", e)
  }
}

// ─── Dedup Check ─────────────────────────────────────────────────────────────

async function isDuplicate(
  db: ReturnType<typeof createClient>["database"] | null,
  dedupKey: string,
): Promise<boolean> {
  if (!db) return false
  try {
    const { data } = await db
      .from("notification_logs")
      .select("id")
      .eq("dedup_key", dedupKey)
      .in("status", ["sent", "retrying"])
      .maybeSingle()
    return !!data
  } catch {
    return false
  }
}

// ─── Retry Failed ────────────────────────────────────────────────────────────

export async function retryFailedNotifications(
  db: ReturnType<typeof createClient>["database"],
  maxRetries = 3,
  batchSize = 20,
): Promise<number> {
  const { data: failed } = await db
    .from("notification_logs")
    .select("*")
    .eq("status", "retrying")
    .lt("retry_count", maxRetries)
    .limit(batchSize)

  if (!failed || failed.length === 0) return 0

  let recovered = 0
  for (const log of failed) {
    try {
      let success = false
      if (log.channel === "email") {
        // Reconstruct and resend
        const booking = await db.from("bookings").select("*").eq("id", log.booking_id).single()
        if (booking.data) {
          success = await sendEmailViaResend(log.recipient_address, log.subject, log.body_preview)
        }
      } else if (log.channel === "whatsapp") {
        success = await sendWhatsAppMessage(log.recipient_address, log.body_preview)
      }

      const newStatus = success ? "sent" : "retrying"
      const newRetry = (log.retry_count || 0) + 1
      await db.from("notification_logs")
        .update({
          status: newStatus,
          retry_count: newRetry,
          last_error: success ? "" : "Retry failed",
          delivered_at: success ? new Date().toISOString() : null,
        })
        .eq("id", log.id)

      if (success) recovered++
    } catch {
      await db.from("notification_logs")
        .update({ retry_count: (log.retry_count || 0) + 1, last_error: "Retry exception" })
        .eq("id", log.id)
    }
  }
  return recovered
}

// ─── Core Notification Sender ────────────────────────────────────────────────

export async function sendBookingNotifications(
  db: ReturnType<typeof createClient>["database"] | null,
  booking: BookingInfo,
  event: BookingEvent,
): Promise<NotificationResult> {
  const result: NotificationResult = {
    email_customer: false,
    email_staff: false,
    whatsapp_customer: false,
    whatsapp_staff: false,
    errors: [],
  }

  const motelName = getMotelName()

  // ── Customer Email ──────────────────────────────────────────────────────

  if (isEmailEnabled() && booking.guest_email) {
    const dedupKey = generateDedupKey(booking.id, "email", "customer", event)
    const isDup = db ? await isDuplicate(db, dedupKey) : false

    if (!isDup) {
      const subject = event === "booking_created" ? "Booking Received — " + motelName :
        event === "booking_confirmed" ? "Booking Confirmed — " + motelName :
        event === "booking_cancelled" ? "Booking Cancelled — " + motelName :
        "Booking Updated — " + motelName

      const html = buildCustomerEmailHtml(booking, event)
      const success = await sendEmailViaResend(booking.guest_email, subject, html)
      result.email_customer = success

      await logNotification(db, {
        booking_id: booking.id,
        tenant_id: booking.tenant_id,
        channel: "email",
        recipient_type: "customer",
        recipient_address: booking.guest_email,
        event_type: event,
        subject,
        body_preview: html,
        status: success ? "sent" : "failed",
        last_error: success ? "" : "Resend API error",
        dedup_key: dedupKey,
      })

      if (!success) result.errors.push("customer_email_failed")
    }
  }

  // ── Staff Email ─────────────────────────────────────────────────────────

  const staffEmails = getStaffEmails()
  if (isEmailEnabled() && staffEmails.length > 0) {
    const dedupKey = generateDedupKey(booking.id, "email", "staff", event)
    const isDup = db ? await isDuplicate(db, dedupKey) : false

    if (!isDup) {
      const eventLabels: Record<string, string> = {
        booking_created: "New Booking Alert", booking_confirmed: "Booking Confirmed",
        booking_updated: "Booking Updated", booking_cancelled: "Booking Cancelled",
      }
      const subject = `${eventLabels[event]} — ${motelName}`
      const html = buildStaffEmailHtml(booking, event)
      const success = await sendEmailViaResend(staffEmails.join(","), subject, html)
      result.email_staff = success

      for (const email of staffEmails) {
        await logNotification(db, {
          booking_id: booking.id,
          tenant_id: booking.tenant_id,
          channel: "email",
          recipient_type: "staff",
          recipient_address: email,
          event_type: event,
          subject,
          body_preview: html,
          status: success ? "sent" : "failed",
          last_error: success ? "" : "Resend API error",
          dedup_key: `${dedupKey}:${email}`,
        })
      }

      if (!success) result.errors.push("staff_email_failed")
    }
  }

  // ── Customer WhatsApp ───────────────────────────────────────────────────

  if (isWhatsAppEnabled() && booking.guest_phone) {
    const dedupKey = generateDedupKey(booking.id, "whatsapp", "customer", event)
    const isDup = db ? await isDuplicate(db, dedupKey) : false

    if (!isDup) {
      const text = buildCustomerWhatsAppText(booking, event)
      const success = await sendWhatsAppMessage(booking.guest_phone, text)
      result.whatsapp_customer = success

      await logNotification(db, {
        booking_id: booking.id,
        tenant_id: booking.tenant_id,
        channel: "whatsapp",
        recipient_type: "customer",
        recipient_address: booking.guest_phone,
        event_type: event,
        subject: "",
        body_preview: text,
        status: success ? "sent" : "failed",
        last_error: success ? "" : "WhatsApp API error",
        dedup_key: dedupKey,
      })

      if (!success) result.errors.push("customer_whatsapp_failed")
    }
  }

  // ── Staff WhatsApp ──────────────────────────────────────────────────────

  const staffPhones = getStaffPhones()
  if (isWhatsAppEnabled() && staffPhones.length > 0) {
    const dedupKey = generateDedupKey(booking.id, "whatsapp", "staff", event)
    const isDup = db ? await isDuplicate(db, dedupKey) : false

    if (!isDup) {
      const text = buildStaffWhatsAppText(booking, event)

      for (const phone of staffPhones) {
        const success = await sendWhatsAppMessage(phone, text)
        if (success) result.whatsapp_staff = true

        await logNotification(db, {
          booking_id: booking.id,
          tenant_id: booking.tenant_id,
          channel: "whatsapp",
          recipient_type: "staff",
          recipient_address: phone,
          event_type: event,
          subject: "",
          body_preview: text,
          status: success ? "sent" : "failed",
          last_error: success ? "" : "WhatsApp API error",
          dedup_key: `${dedupKey}:${phone}`,
        })

        if (!success) result.errors.push(`staff_whatsapp_failed:${phone}`)
      }
    }
  }

  return result
}
