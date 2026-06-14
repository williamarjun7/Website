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

interface RateLimitEntry {
  count: number
  expires: number
}
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
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    })
  }

  const clientIp = getClientIp(req)
  const rateCheck = checkRateLimit(clientIp)
  if (!rateCheck.allowed) {
    return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(rateCheck.retryAfter) },
      status: 429,
    })
  }

  const contentLength = parseInt(req.headers.get("content-length") || "0", 10)
  if (contentLength > MAX_BODY_BYTES) {
    return new Response(JSON.stringify({ error: "Request too large" }), {
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

    const baseUrl = Deno.env.get("INSFORGE_BASE_URL") || Deno.env.get("SUPABASE_URL") || ""
    const anonKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("API_KEY") || ""

    if (!baseUrl || !anonKey) {
      throw new Error("Server configuration error")
    }

    const { database: db } = createClient({ baseUrl, anonKey })

    const { data: room, error: roomError } = await db
      .from("rooms")
      .select("price_per_night, max_guests, is_active, maintenance")
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
    if (!room.is_active || room.maintenance) {
      throw new Error("Room is not available for booking")
    }

    const guestCount = guests || 1
    if (room.max_guests && guestCount > room.max_guests) {
      throw new Error(`Room capacity exceeded. Maximum ${room.max_guests} guests allowed.`)
    }

    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
    if (nights <= 0) {
      throw new Error("Invalid dates")
    }
    if (nights > 30) {
      throw new Error("Maximum booking duration is 30 nights")
    }
    const total_price = nights * room.price_per_night

    const isPayAtProperty = payment_status === "pay_at_property"
    const advAmount = isPayAtProperty ? Math.round(total_price * 60) / 100 : total_price
    const balAmount = isPayAtProperty ? total_price - advAmount : 0

    const now = new Date().toISOString()
    await db
      .from("bookings")
      .update({ booking_status: "expired", payment_status: "failed" })
      .eq("room_id", room_id)
      .eq("booking_status", "pending_payment")
      .lt("hold_expires_at", now)

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

      const needsPayment = payment_status === "pending" || payment_status === "pay_at_property"
      const bookingStatus = needsPayment ? "pending_payment" : "confirmed"
      const holdExpiresAt = needsPayment
        ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
        : null

      const { data: booking, error: insertError } = await db
        .from("bookings")
        .insert({
          room_id,
          check_in,
          check_out,
          guests: guestCount,
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
        return new Response(JSON.stringify(booking), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        })
      }

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
