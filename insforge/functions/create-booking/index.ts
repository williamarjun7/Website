import { createClient } from "npm:@insforge/sdk"
import { z } from "https://esm.sh/zod@3.22.4"

// ─── Allowed Origins (CORS) ───────────────────────────────────────────────
const ALLOWED_ORIGINS: (string | RegExp)[] = [
  "https://6aiag3ra.insforge.site",
  "https://highlands-motel.com",
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

// ─── Rate Limiting (in-memory, per-deployment) ───────────────────────────
// Note: For multi-instance deployments, use Deno KV or Redis instead.
interface RateLimitEntry {
  count: number
  expires: number
}
const rateLimitStore = new Map<string, RateLimitEntry>()
const RATE_LIMIT_MAX = 10          // requests
const RATE_LIMIT_WINDOW = 60_000    // milliseconds (1 minute)

const MAX_BODY_BYTES = 65_536       // 64KB

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
  guests: z.number().int().min(1).max(20).optional(),
  payment_status: z.enum(["pending", "failed", "pay_at_property"]).optional(),
  advance_amount: z.number().positive().optional(),
  balance_amount: z.number().min(0).optional(),
})

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

  // Body size limit
  const contentLength = parseInt(req.headers.get("content-length") || "0", 10)
  if (contentLength > MAX_BODY_BYTES) {
    return new Response(JSON.stringify({ error: "Request too large" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 413,
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

    const { room_id, check_in, check_out, guest_name, guest_email, guest_phone, guests, payment_status, advance_amount, balance_amount } = parseResult.data

    // Validate date logic
    const checkInDate = new Date(check_in)
    const checkOutDate = new Date(check_out)
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      throw new Error("Invalid date format")
    }
    if (checkOutDate <= checkInDate) {
      throw new Error("check_out must be after check_in")
    }

    // ── Initialize InsForge client ─────────────────────────────────────
    const baseUrl = Deno.env.get("INSFORGE_BASE_URL") || Deno.env.get("SUPABASE_URL") || ""
    const anonKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("API_KEY") || ""

    if (!baseUrl || !anonKey) {
      throw new Error("Server configuration error")
    }

    const { database: db } = createClient({ baseUrl, anonKey })

    // ── Fetch room price (trusted source) ─────────────────────────────
    const { data: room, error: roomError } = await db
      .from("rooms")
      .select("price_per_night")
      .eq("id", room_id)
      .single()

    if (roomError) {
      console.error("create-booking: DB error fetching room:", roomError.message)
      return new Response(JSON.stringify({ error: "Database error, please try again" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 502,
      })
    }
    if (!room) {
      throw new Error("Room not found")
    }

    // ── Calculate total price securely ─────────────────────────────────
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
    if (nights <= 0) {
      throw new Error("Invalid dates")
    }
    const total_price = nights * room.price_per_night

    // Calculate advance (60%) and balance (40%) for pay_at_property
    const isPayAtProperty = payment_status === "pay_at_property"
    const advAmount = isPayAtProperty ? Math.round(total_price * 60) / 100 : (advance_amount || total_price)
    const balAmount = isPayAtProperty ? total_price - advAmount : (balance_amount || 0)

    // ── Auto-expire stale holds ──────────────────────────────────────
    const now = new Date().toISOString()
    await db
      .from("bookings")
      .update({ booking_status: "expired", payment_status: "failed" })
      .eq("room_id", room_id)
      .eq("booking_status", "pending_payment")
      .lt("hold_expires_at", now)

    // ── Check for conflicting bookings (with retry for TOCTOU) ───────
    let attempts = 0
    const maxAttempts = 3

    while (attempts < maxAttempts) {
      attempts++

      const { data: conflictingBookings, error: conflictError } = await db
        .from("bookings")
        .select("id")
        .eq("room_id", room_id)
        .in("booking_status", ["pending_payment", "confirmed", "checked_in"])
        .lt("check_in", check_out)
        .gt("check_out", check_in)
        .limit(1)

      if (conflictError) {
        console.error("create-booking: DB error checking conflicts:", conflictError.message)
        return new Response(JSON.stringify({ error: "Database error, please try again" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 502,
        })
      }

      if (conflictingBookings && conflictingBookings.length > 0) {
        throw new Error("Room is no longer available for the selected dates")
      }

      // Determine booking status based on payment method
      // payment_status = "pay_at_property" → still pending_payment (needs 60% advance)
      // payment_status = "pending" → online payment → pending_payment with hold
      const needsPayment = payment_status === "pending" || payment_status === "pay_at_property"
      const bookingStatus = needsPayment ? "pending_payment" : "confirmed"
      const holdExpiresAt = needsPayment
        ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
        : null

      // Insert booking
      const { data: booking, error: insertError } = await db
        .from("bookings")
        .insert({
          room_id,
          check_in,
          check_out,
          guests: guests || null,
          total_price,
          advance_amount: isPayAtProperty ? advAmount : null,
          balance_amount: isPayAtProperty ? balAmount : null,
          guest_name,
          guest_email,
          guest_phone,
          payment_status: payment_status || "pending",
          booking_status: bookingStatus,
          hold_expires_at: holdExpiresAt,
          source: "website",
        })
        .select()
        .single()

      if (!insertError && booking) {
        // Send confirmation email for pay_at_property bookings (after advance payment)
        // Online payment bookings get their email after payment verification
        // Note: pay_at_property now goes through payment flow for the 60% advance

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
    console.error("create-booking error:", error)
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
}
