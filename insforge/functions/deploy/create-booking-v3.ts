// ── Inlined from _shared/timing-safe.ts ──
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const encoder = new TextEncoder();
  const aBuf = encoder.encode(a);
  const bBuf = encoder.encode(b);
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  try {
    return crypto.subtle.timingSafeEqual(aBuf, bBuf);
  } catch {
    let result = 0;
    for (let i = 0; i < aBuf.length; i++) {
      result |= aBuf[i] ^ bBuf[i];
    }
    return result === 0;
  }
}
// ── End inlined ──
// ── Inlined from _shared/sync-harden.ts ──

const HMAC_ALGORITHM = { name: "HMAC", hash: "SHA-256" } as const

export async function signHmac(secret: string, payload: string, timestampMs: number): Promise<string> {
  const encoder = new TextEncoder()
  const input = `${payload}.${timestampMs}`
  const cryptoKey = await crypto.subtle.importKey("raw", encoder.encode(secret), HMAC_ALGORITHM, false, ["sign"])
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(input))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("")
}

export async function verifyHmac(secret: string, payload: string, signature: string, timestampMs: string): Promise<{ valid: boolean; reason?: string }> {
  const now = Date.now()
  const ts = parseInt(timestampMs, 10)
  if (isNaN(ts)) return { valid: false, reason: "invalid_timestamp" }
  if (Math.abs(now - ts) > 300_000) return { valid: false, reason: "timestamp_out_of_tolerance" }
  const expected = await signHmac(secret, payload, ts)
  if (!timingSafeEqual(expected, signature)) return { valid: false, reason: "signature_mismatch" }
  return { valid: true }
}

type CircuitState = "closed" | "open" | "half-open"
interface CircuitEntry { state: CircuitState; failureCount: number; lastFailureAt: number; openedAt: number; halfOpenAttempts: number }
const circuitBreakerStore = new Map<string, CircuitEntry>()

function getCircuitEntry(endpoint: string): CircuitEntry {
  let entry = circuitBreakerStore.get(endpoint)
  if (!entry) {
    entry = { state: "closed", failureCount: 0, lastFailureAt: 0, openedAt: 0, halfOpenAttempts: 0 }
    circuitBreakerStore.set(endpoint, entry)
  }
  return entry
}

export function circuitBreakerAllow(endpoint: string): { allowed: boolean; state: CircuitState } {
  const entry = getCircuitEntry(endpoint); const now = Date.now()
  if (entry.state === "open") {
    if (now - entry.openedAt >= 60_000) { entry.state = "half-open"; entry.halfOpenAttempts = 0; return { allowed: true, state: "half-open" } }
    return { allowed: false, state: "open" }
  }
  if (entry.state === "half-open") {
    if (entry.halfOpenAttempts < 1) { entry.halfOpenAttempts++; return { allowed: true, state: "half-open" } }
    return { allowed: false, state: "half-open" }
  }
  return { allowed: true, state: "closed" }
}

export function circuitBreakerSuccess(endpoint: string): void {
  const entry = getCircuitEntry(endpoint); entry.failureCount = 0; entry.state = "closed"
}

export function circuitBreakerFailure(endpoint: string, statusCode: number): void {
  if (statusCode < 500) return
  const entry = getCircuitEntry(endpoint)
  entry.failureCount++; entry.lastFailureAt = Date.now()
  if (entry.failureCount >= 3) { entry.state = "open"; entry.openedAt = Date.now() }
}

const BASE_DELAY_MS = 1_000; const MAX_DELAY_MS = 60_000; const JITTER_FACTOR = 0.2

export function backoffDelay(attempt: number): number {
  const exponential = Math.min(BASE_DELAY_MS * Math.pow(2, attempt - 1), MAX_DELAY_MS)
  return Math.round(exponential + exponential * JITTER_FACTOR * (Math.random() * 2 - 1))
}

export function isRetryable(statusCode: number | null): boolean {
  if (statusCode === null) return true
  if (statusCode >= 500) return true
  if (statusCode === 429) return true
  return false
}

export function generateTraceId(): string {
  return crypto.randomUUID()
}

export function buildLineage(originSystem: "website" | "pos", traceId?: string, parentEventId?: string | null): { origin_system: string; trace_id: string; parent_event_id: string | null } {
  return { origin_system: originSystem, trace_id: traceId || generateTraceId(), parent_event_id: parentEventId || null }
}

export interface SyncSendResult { success: boolean; statusCode: number; body: string }

export async function sendSyncEvent(webhookUrl: string, webhookSecret: string, payload: Record<string, unknown>, options?: { timeoutMs?: number; idempotencyKey?: string }): Promise<SyncSendResult> {
  const { allowed, state } = circuitBreakerAllow(webhookUrl)
  if (!allowed) { console.error(`Circuit breaker OPEN for ${webhookUrl} (state=${state})`); return { success: false, statusCode: 503, body: "Circuit breaker open" } }
  const timestampMs = Date.now(); const body = JSON.stringify(payload)
  const signature = await signHmac(webhookSecret, body, timestampMs)
  const timeout = options?.timeoutMs || 10_000
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeout)
  const headers: Record<string, string> = { "Content-Type": "application/json", "X-Webhook-Signature": signature, "X-Timestamp": String(timestampMs) }
  const originSystem = (payload as Record<string, string>).origin_system
  headers["X-Webhook-Source"] = originSystem === "pos" ? "pos" : "website"
  if (options?.idempotencyKey) headers["X-Idempotency-Key"] = options.idempotencyKey
  try {
    const response = await fetch(webhookUrl, { method: "POST", headers, body, signal: controller.signal })
    clearTimeout(timer); const bodyText = await response.text()
    if (response.ok || response.status === 508) circuitBreakerSuccess(webhookUrl)
    else circuitBreakerFailure(webhookUrl, response.status)
    return { success: response.ok, statusCode: response.status, body: bodyText }
  } catch (err) {
    clearTimeout(timer); circuitBreakerFailure(webhookUrl, 503)
    return { success: false, statusCode: 0, body: err instanceof Error ? err.message : "Network error" }
  }
}
// ── End inlined ──
// ── Inlined from _shared/notifications.ts ──

export type BookingEvent = "booking_created" | "booking_confirmed" | "booking_updated" | "booking_cancelled"

export interface BookingInfo {
  id: string; guest_name: string; guest_email: string; guest_phone: string; room_name: string; room_number: string
  check_in: string; check_out: string; total_price: number; advance_amount?: number; balance_amount?: number
  booking_status: string; payment_status: string; tenant_id?: string; motel_name?: string
}

export interface NotificationResult { email_customer: boolean; email_staff: boolean; errors: string[] }

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
  const from = Deno.env.get("EMAIL_FROM") || "Highlands Cafe & Motel Inn <noreply@highlandscafemotelinn.com>"
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

async function nLog(d: ReturnType<typeof createClient>["database"] | null, p: { booking_id: string; tenant_id?: string; channel: "email"; recipient_type: "customer" | "staff"; recipient_address: string; event_type: BookingEvent; subject: string; body_preview: string; status: "sent" | "failed" | "retrying"; retry_count?: number; last_error?: string; dedup_key: string }): Promise<void> {
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
  const result: NotificationResult = { email_customer: false, email_staff: false, errors: [] }
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
  return result
}
// ── End inlined ──

import { createClient } from "npm:@insforge/sdk"
import { z } from "https://esm.sh/zod@3.22.4"

const ALLOWED_ORIGINS: (string | RegExp)[] = [
  "https://highlandsmotelinn.insforge.site",
  "https://highlandscafemotelinn.com",
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
]

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

interface RateLimitEntry { count: number; expires: number }
const rateLimitStore = new Map<string, RateLimitEntry>()
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW = 60_000
const MAX_BODY_BYTES = 65_536

function getClientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")
    || request.headers.get("x-real-ip")
    || "unknown"
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const key = ip
  const entry = rateLimitStore.get(key)
  if (entry && entry.expires < now) rateLimitStore.delete(key)
  if (!entry || entry.expires < now) {
    rateLimitStore.set(key, { count: 1, expires: now + RATE_LIMIT_WINDOW })
    return { allowed: true }
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((entry.expires - now) / 1000)
    return { allowed: false, retryAfter }
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

function sanitizeString(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim()
}

const CreateBookingSchema = z.object({
  room_id: z.string().uuid({ message: "room_id must be a valid UUID" }),
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "check_in must be YYYY-MM-DD" }),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "check_out must be YYYY-MM-DD" }),
  guest_name: z.string().min(2, { message: "guest_name must be at least 2 characters" }).max(100),
  guest_email: z.string().email({ message: "guest_email must be a valid email" }),
  guest_phone: z.string().regex(/^(\+?\d{1,3}[- ]?)?\d{7,15}$/, { message: "guest_phone is invalid" }),
  guests: z.number().int().min(1).max(20).optional(),
  payment_status: z.enum(["pending", "failed", "pay_at_property"]).optional(),
})

export default async function (req: Request) {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ message: "Method not allowed", error: "METHOD_NOT_ALLOWED" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    })
  }

  const clientIp = getClientIp(req)
  const rateCheck = checkRateLimit(clientIp)
  if (!rateCheck.allowed) {
    return new Response(JSON.stringify({ message: "Too many requests. Please try again later.", error: "RATE_LIMITED" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(rateCheck.retryAfter) },
      status: 429,
    })
  }

  const contentLength = parseInt(req.headers.get("content-length") || "0", 10)
  if (contentLength > MAX_BODY_BYTES) {
    return new Response(JSON.stringify({ message: "Request too large", error: "REQUEST_TOO_LARGE" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 413,
    })
  }

  try {
    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      throw new Error("Invalid JSON in request body")
    }

    const parseResult = CreateBookingSchema.safeParse(rawBody)
    if (!parseResult.success) {
      const messages = parseResult.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; ")
      throw new Error(`Validation failed: ${messages}`)
    }

    const { room_id, check_in, check_out, guest_name: rawName, guest_email, guest_phone, guests, payment_status } = parseResult.data
    const guest_name = sanitizeString(rawName)

    const checkInDate = new Date(check_in)
    const checkOutDate = new Date(check_out)
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      throw new Error("Invalid date format")
    }
    if (checkOutDate <= checkInDate) {
      throw new Error("check_out must be after check_in")
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (checkInDate < today) {
      throw new Error("check_in cannot be in the past")
    }

    if (guest_name.length < 2 || guest_name.length > 100) {
      throw new Error("guest_name must be between 2 and 100 characters")
    }
    const baseUrl = Deno.env.get("INSFORGE_BASE_URL") || ""

    const anonKey = Deno.env.get("API_KEY") || ""

    if (!baseUrl || !anonKey) {
      throw new Error("Server configuration error")
    }

    const { database: db } = createClient({ baseUrl, anonKey })

    const { data: room, error: roomError } = await db
      .from("rooms")
      .select("price_per_night, max_guests, is_active, maintenance, discount_percent")
      .eq("id", room_id)
      .single()

    if (roomError) {
      console.error("create-booking: DB error fetching room:", roomError.message)
      return new Response(JSON.stringify({ message: "Database error, please try again", error: "DATABASE_ERROR" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 502,
      })
    }
    if (!room) {
      throw new Error("Room not found")
    }
    if (!room.is_active || room.maintenance) {
      throw new Error("Room is not available for booking")
    }

    const guestCount = guests || 1
    if (room.max_guests && guestCount > room.max_guests) {
      const label = room.max_guests === 1 ? "guest" : "guests"
      throw new Error(`Room capacity exceeded. Maximum ${room.max_guests} ${label} allowed.`)
    }

    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
    if (nights <= 0) throw new Error("Invalid dates")
    if (nights > 30) throw new Error("Maximum booking duration is 30 nights")

    const effectivePricePerNight = room.discount_percent && room.discount_percent > 0
      ? Math.round(room.price_per_night * (1 - room.discount_percent / 100))
      : room.price_per_night
    const total_price = nights * effectivePricePerNight

    const isPayAtProperty = payment_status === "pay_at_property"
    const advAmount = isPayAtProperty ? Math.round(total_price * 60) / 100 : total_price
    const balAmount = isPayAtProperty ? total_price - advAmount : 0

    const traceId = generateTraceId()

    const now = new Date().toISOString()
    await db
      .from("bookings")
      .update({ booking_status: "expired", payment_status: "failed" })
      .eq("room_id", room_id)
      .eq("booking_status", "pending_payment")
      .lt("hold_expires_at", now)

    const needsPayment = payment_status === "pending" || payment_status === "pay_at_property"
    const bookingStatus = needsPayment ? "pending_payment" : "confirmed"
    const holdExpiresAt = needsPayment
      ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
      : null

    const { data: booking, error: insertError } = await db
      .from("bookings")
      .insert({
        room_id, check_in, check_out,
        adults: guestCount, total_price,
        advance_amount: isPayAtProperty ? advAmount : null,
        balance_amount: isPayAtProperty ? balAmount : null,
        guest_name, guest_email, guest_phone,
        payment_status: payment_status || "pending",
        booking_status: bookingStatus,
        hold_expires_at: holdExpiresAt,
        source: "website",
        metadata: { trace_id: traceId, origin_system: "website" },
      })
      .select()
      .single()

    if (insertError) {
      const isOverlap = insertError.code === "23P01" || insertError.code === "23505"
      console.error(`create-booking: ${isOverlap ? "overlap" : "db"} error: ${insertError.code} ${insertError.message}`)
      return new Response(JSON.stringify({
        message: isOverlap ? "Room is no longer available for the selected dates" : "Database error, please try again",
        error: isOverlap ? "ROOM_UNAVAILABLE" : "DATABASE_ERROR",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: isOverlap ? 409 : 502,
      })
    }

    ;(async () => {
      try {
        const { data: room } = await db.from("rooms").select("name, room_number").eq("id", room_id).single()
        const info: BookingInfo = {
          id: booking.id, guest_name: booking.guest_name, guest_email: booking.guest_email,
          guest_phone: booking.guest_phone, room_name: room?.name || "Selected Room",
          room_number: room?.room_number || "",
          check_in: booking.check_in, check_out: booking.check_out, total_price: booking.total_price,
          advance_amount: booking.advance_amount || undefined, balance_amount: booking.balance_amount || undefined,
          booking_status: booking.booking_status, payment_status: booking.payment_status,
        }
        await sendBookingNotifications(db, info, "booking_created")
      } catch (e) { console.error("[create-booking] Notification error:", e) }
    })()

    return new Response(JSON.stringify(booking), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : typeof error === "object" && error !== null ? JSON.stringify(error) : String(error)
    console.error("create-booking error:", message, error)
    return new Response(JSON.stringify({ message, error: "BOOKING_ERROR" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
}
