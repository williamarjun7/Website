import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { z } from "https://esm.sh/zod@3.22.4"

// ─── Email Module (inlined) ─────────────────────────────────────────────
interface EmailData { to: string; subject: string; html: string }

async function sendEmail(data: EmailData): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY")
  if (!apiKey) { console.warn("RESEND_API_KEY not set — skipping email"); return }
  const from = Deno.env.get("EMAIL_FROM") || "Highlands Motel <noreply@highlands-motel.com>"
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: data.to, subject: data.subject, html: data.html }),
  })
  if (!res.ok) console.error(`Email send failed: ${res.status} ${await res.text().catch(() => "")}`)
}

function buildBookingConfirmationHtml(params: { guestName: string; roomName: string; checkIn: string; checkOut: string; totalPrice: number; bookingId: string }): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;padding:24px;max-width:600px"><h2 style="color:#92400e">Booking Confirmed — Highlands Motel & Cafe</h2><p>Dear ${params.guestName},</p><p>Your booking at Highlands Motel & Cafe has been confirmed.</p><table style="width:100%;border-collapse:collapse;margin:16px 0"><tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Room</td><td style="padding:8px;border-bottom:1px solid #eee"><strong>${params.roomName}</strong></td></tr><tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Check-in</td><td style="padding:8px;border-bottom:1px solid #eee"><strong>${params.checkIn}</strong></td></tr><tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Check-out</td><td style="padding:8px;border-bottom:1px solid #eee"><strong>${params.checkOut}</strong></td></tr><tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Total</td><td style="padding:8px;border-bottom:1px solid #eee"><strong>NPR ${params.totalPrice.toLocaleString()}</strong></td></tr><tr><td style="padding:8px;color:#666">Booking ID</td><td style="padding:8px"><code>${params.bookingId}</code></td></tr></table><p style="color:#666;font-size:14px">If you have any questions, contact us at the property.</p><p style="font-size:12px;color:#999">— Highlands Motel & Cafe</p></body></html>`
}

// ─── Allowed Origins (CORS) ───────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "https://highlands-motel.com",
  "https://www.highlands-motel.com",
  "https://6aiag3ra.us-east.insforge.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") || ""
  const allowed = ALLOWED_ORIGINS.includes(origin)
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  }
}

// ─── Rate Limiting (in-memory, per-deployment) ───────────────────────────
// Note: For multi-instance deployments, use Deno KV or Redis instead.
interface RateLimitEntry {
  count: number
  expires: number
}
const rateLimitStore = new Map<string, RateLimitEntry>()
const RATE_LIMIT_MAX = 10          // requests
const RATE_LIMIT_WINDOW = 60_000    // milliseconds (1 minute)

function getClientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")
    || request.headers.get("x-real-ip")
    || "unknown"
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const key = ip
  const entry = rateLimitStore.get(key)

  if (entry && entry.expires < now) {
    rateLimitStore.delete(key)
  }

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

// Clean up expired entries periodically (simple GC)
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of rateLimitStore.entries()) {
    if (val.expires < now) rateLimitStore.delete(key)
  }
}, 300_000)

// ─── Request Schema (Zod) ────────────────────────────────────────────────
const CreateBookingSchema = z.object({
  room_id: z.string().uuid({ message: "room_id must be a valid UUID" }),
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "check_in must be YYYY-MM-DD" }),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "check_out must be YYYY-MM-DD" }),
  guest_name: z.string().min(2, { message: "guest_name must be at least 2 characters" }).max(100),
  guest_email: z.string().email({ message: "guest_email must be a valid email" }),
  guest_phone: z.string().regex(/^(\+?\d{1,3}[- ]?)?\d{7,15}$/, { message: "guest_phone is invalid" }),
  payment_status: z.enum(["pending", "paid", "failed", "pay_at_property"]).optional(),
})

type CreateBookingInput = z.infer<typeof CreateBookingSchema>

// ─── Main Handler ────────────────────────────────────────────────────────
export default async function (req: Request) {
  const corsHeaders = getCorsHeaders(req)

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    })
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

  try {
    // ── Parse & validate body ──────────────────────────────────────────
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

    const { room_id, check_in, check_out, guest_name, guest_email, guest_phone, payment_status } = parseResult.data

    // Validate date logic
    const checkInDate = new Date(check_in)
    const checkOutDate = new Date(check_out)
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      throw new Error("Invalid date format")
    }
    if (checkOutDate <= checkInDate) {
      throw new Error("check_out must be after check_in")
    }

    // ── Initialize Supabase/InsForge client ────────────────────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("INSFORGE_URL") || Deno.env.get("INSFORGE_BASE_URL") || ""
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("INSFORGE_SERVICE_ROLE_KEY") || Deno.env.get("API_KEY") || ""

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Server configuration error")
    }

    const db = createClient(supabaseUrl, supabaseKey)

    // ── Fetch room price (trusted source) ─────────────────────────────
    const { data: room, error: roomError } = await db
      .from("rooms")
      .select("price_per_night")
      .eq("id", room_id)
      .single()

    if (roomError || !room) {
      throw new Error("Room not found")
    }

    // ── Calculate total price securely ─────────────────────────────────
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
    if (nights <= 0) {
      throw new Error("Invalid dates")
    }
    const total_price = nights * room.price_per_night

    // ── Check for conflicting bookings (with retry for TOCTOU) ───────
    let attempts = 0
    const maxAttempts = 3

    while (attempts < maxAttempts) {
      attempts++

      const { data: conflictingBookings, error: conflictError } = await db
        .from("bookings")
        .select("id")
        .eq("room_id", room_id)
        .in("booking_status", ["confirmed", "checked_in"])
        .lt("check_in", check_out)
        .gt("check_out", check_in)
        .limit(1)

      if (conflictError) {
        throw new Error("Error verifying room availability")
      }

      if (conflictingBookings && conflictingBookings.length > 0) {
        throw new Error("Room is no longer available for the selected dates")
      }

      // Check blocked dates
      const { data: blockedDates, error: blockedError } = await db
        .from("blocked_dates")
        .select("id")
        .eq("room_id", room_id)
        .lt("start_date", check_out)
        .gt("end_date", check_in)
        .limit(1)

      if (blockedError && blockedError.code !== "PGRST116") {
        throw new Error("Error verifying room availability against blocked dates")
      }

      if (blockedDates && blockedDates.length > 0) {
        throw new Error("Room is not available for the selected dates (blocked)")
      }

      // Insert booking
      const { data: booking, error: insertError } = await db
        .from("bookings")
        .insert({
          room_id,
          check_in,
          check_out,
          total_price,
          guest_name,
          guest_email,
          guest_phone,
          payment_status: payment_status || "pending",
          booking_status: "confirmed",
          source: "website",
        })
        .select()
        .single()

      if (!insertError && booking) {
        // Fire-and-forget email notification
        (async () => {
          try {
            const { data: room } = await db
              .from("rooms")
              .select("name")
              .eq("id", room_id)
              .single()
            const roomName = room?.name || "Selected Room"
            await sendEmail({
              to: guest_email,
              subject: "Booking Confirmed — Highlands Motel & Cafe",
              html: buildBookingConfirmationHtml({
                guestName: guest_name,
                roomName,
                checkIn: check_in,
                checkOut: check_out,
                totalPrice: total_price,
                bookingId: booking.id,
              }),
            })
          } catch {
          }
        })()

        return new Response(JSON.stringify(booking), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        })
      }

      // Retry on unique violation (race condition)
      if (insertError && (insertError.code === "23505" || insertError.message?.includes("unique"))) {
        if (attempts === maxAttempts) {
          throw new Error("Room is no longer available for the selected dates")
        }
        await new Promise(resolve => setTimeout(resolve, 100 * attempts))
        continue
      }

      if (insertError) {
        throw insertError
      }
    }

    throw new Error("Room is no longer available for the selected dates")
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
}
