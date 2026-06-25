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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-pos-api-key, x-webhook-signature, x-idempotency-key, x-webhook-event, x-webhook-source",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, OPTIONS",
    "Vary": "Origin",
  }
}

const RATE_LIMIT_MAX = 30
const RATE_LIMIT_WINDOW = 60_000
const MAX_BODY_BYTES = 65_536
interface RateLimitEntry { count: number; expires: number }
const rateLimitStore = new Map<string, RateLimitEntry>()

function getClientIp(request: Request): string {
  return request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
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

function verifyPosApiKey(request: Request): boolean {
  const expectedKey = Deno.env.get("POS_SYNC_API_KEY")
  if (!expectedKey) return false
  const apiKey = request.headers.get("x-pos-api-key")
  if (apiKey === expectedKey) return true
  const authHeader = request.headers.get("authorization") || ""
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i)
  return bearerMatch !== null && bearerMatch[1] === expectedKey
}

function errorResponse(message: string, status = 400, corsHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: message }), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
    status,
  })
}

async function verifyHmacSignature(request: Request, rawBody: string): Promise<boolean> {
  const secret = Deno.env.get("POS_WEBHOOK_SECRET")
  if (!secret) return true
  const signature = request.headers.get("x-webhook-signature")
  if (!signature) return false
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody))
  const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("")
  return computed === signature
}

async function checkIdempotency(db: ReturnType<typeof createClient>["database"], idempotencyKey: string): Promise<boolean> {
  const { data } = await db
    .from("bookings")
    .select("id")
    .eq("pos_booking_id", idempotencyKey)
    .limit(1)
  return data && data.length > 0
}

const CreateBookingSchema = z.object({
  room_id: z.string().uuid(),
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guest_name: z.string().min(2).max(100),
  guest_email: z.string().email(),
  guest_phone: z.string().regex(/^(\+?\d{1,3}[- ]?)?\d{7,15}$/),
  booking_status: z.enum(["confirmed", "checked_in", "checked_out"]).default("confirmed"),
  payment_status: z.enum(["pending", "paid", "failed", "pay_at_property"]).default("pending"),
  total_amount: z.number().nonnegative().optional(),
  advance_amount: z.number().nonnegative().optional(),
  balance_amount: z.number().nonnegative().optional(),
  paid_amount: z.number().nonnegative().optional(),
  pos_booking_id: z.string().optional(),
})

const GetBookingsQuerySchema = z.object({
  status: z.enum(["confirmed", "cancelled", "checked_in", "checked_out"]).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid from date format (YYYY-MM-DD)").optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid to date format (YYYY-MM-DD)").optional(),
  pos_booking_id: z.string().optional(),
})

const UpdateBookingSchema = z.object({
  booking_status: z.enum(["confirmed", "cancelled", "checked_in", "checked_out"]).optional(),
  payment_status: z.enum(["pending", "paid", "failed", "pay_at_property"]).optional(),
  guest_name: z.string().min(2).max(100).optional(),
  guest_phone: z.string().regex(/^(\+?\d{1,3}[- ]?)?\d{7,15}$/).optional(),
  guest_email: z.string().email().optional(),
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  total_amount: z.number().nonnegative().optional(),
  advance_amount: z.number().nonnegative().optional(),
  balance_amount: z.number().nonnegative().optional(),
  paid_amount: z.number().nonnegative().optional(),
})

export default async function handler(req: Request) {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/functions\/pos-sync-api/, "").replace(/^\/api\/pos-sync/, "").replace(/^\/pos-sync/, "")

  const isAvailabilityGet = req.method === "GET" && path === "/availability"
  if (!isAvailabilityGet && !verifyPosApiKey(req)) {
    return errorResponse("Unauthorized: Invalid or missing POS API key", 401, corsHeaders)
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
    return errorResponse("Request too large", 413, corsHeaders)
  }

  try {
    const baseUrl = Deno.env.get("INSFORGE_BASE_URL") || ""

    const anonKey = Deno.env.get("API_KEY") || ""
    if (!baseUrl || !anonKey) {
      return errorResponse("Server configuration error", 500, corsHeaders)
    }

    const { database: db } = createClient({ baseUrl, anonKey })

    if (req.method === "GET" && path === "/availability") {
      const checkIn = url.searchParams.get("check_in")
      const checkOut = url.searchParams.get("check_out")

      if (!checkIn || !checkOut) {
        return errorResponse("check_in and check_out query parameters are required", 400, corsHeaders)
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut)) {
        return errorResponse("Invalid date format. Use YYYY-MM-DD.", 400, corsHeaders)
      }

      const [roomsResult, bookingsResult] = await Promise.all([
        db.from("rooms").select("*, room_images(*)").eq("is_active", true).order("name", { ascending: true }),
        db.from("bookings").select("room_id, check_in, check_out").in("booking_status", ["confirmed", "checked_in"]).lt("check_in", checkOut).gt("check_out", checkIn),
      ])

      const unavailableRoomIds = new Set<string>()
      for (const b of bookingsResult.data || []) unavailableRoomIds.add(b.room_id)

      const rooms = (roomsResult.data || []).map((room: Record<string, unknown>) => ({
        ...room,
        is_available: !unavailableRoomIds.has(room.id),
      }))

      return new Response(JSON.stringify({ data: rooms, unavailable_room_ids: [...unavailableRoomIds] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (req.method === "GET" && path === "/rooms") {
      const { data: rooms, error } = await db
        .from("rooms")
        .select("*, room_images(*)")
        .order("name", { ascending: true })

      if (error) return errorResponse(error.message, 500, corsHeaders)

      return new Response(JSON.stringify({ data: rooms }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (req.method === "GET" && path === "/bookings") {
      const rawParams = Object.fromEntries(url.searchParams.entries())
      const queryParams = GetBookingsQuerySchema.safeParse(rawParams)
      if (!queryParams.success) {
        return errorResponse("Validation: " + queryParams.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; "), 400, corsHeaders)
      }

      const { status, from: fromDate, to: toDate, pos_booking_id: posId } = queryParams.data
      let query = db.from("bookings").select("*, rooms(name, room_type)").order("check_in", { ascending: false })

      if (status) query = query.eq("booking_status", status)
      if (fromDate) query = query.gte("check_in", fromDate)
      if (toDate) query = query.lte("check_out", toDate)
      if (posId) query = query.eq("pos_booking_id", posId)

      const { data: bookings, error } = await query

      if (error) return errorResponse(error.message, 500, corsHeaders)

      return new Response(JSON.stringify({ data: bookings }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const bookingIdMatch = path.match(/^\/bookings\/([a-f0-9-]+)$/)
    if (req.method === "GET" && bookingIdMatch) {
      const { data: booking, error } = await db
        .from("bookings")
        .select("*, rooms(*, room_images(*))")
        .eq("id", bookingIdMatch[1])
        .single()

      if (error) return errorResponse("Booking not found", 404, corsHeaders)

      return new Response(JSON.stringify({ data: booking }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (req.method === "POST" && path === "/bookings") {
      const rawBodyText = await req.text()
      if (!(await verifyHmacSignature(req, rawBodyText))) {
        return errorResponse("Invalid webhook signature", 403, corsHeaders)
      }

      let rawBody: Record<string, unknown>
      try {
        rawBody = JSON.parse(rawBodyText) as Record<string, unknown>
      } catch {
        return errorResponse("Invalid JSON body", 400, corsHeaders)
      }

      if (rawBody.origin_system === "website" || rawBody.source === "website") {
        return errorResponse("Loop detected: origin_system cannot be 'website'", 400, corsHeaders)
      }

      const idempotencyKey = req.headers.get("x-idempotency-key") || rawBody?.idempotency_key as string | undefined
      if (idempotencyKey) {
        if (await checkIdempotency(db, idempotencyKey)) {
          return new Response(JSON.stringify({ received: true, duplicate: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          })
        }
      }

      const parsed = CreateBookingSchema.safeParse(rawBody)
      if (!parsed.success) {
        return errorResponse("Validation: " + parsed.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; "), 400, corsHeaders)
      }

      const input = parsed.data

      const checkInDate = new Date(input.check_in)
      const checkOutDate = new Date(input.check_out)
      if (checkOutDate <= checkInDate) {
        return errorResponse("check_out must be after check_in", 400, corsHeaders)
      }

      const { data: room, error: roomError } = await db
        .from("rooms")
        .select("price_per_night")
        .eq("id", input.room_id)
        .single()

      if (roomError || !room) {
        return errorResponse("Room not found", 404, corsHeaders)
      }

      const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
      const total_price = nights * room.price_per_night

      const traceId = (rawBody as Record<string, unknown>).trace_id || `pos-${crypto.randomUUID()}`
      const effectiveTotal = input.total_amount || total_price
      const effectiveAdvance = input.advance_amount || (
        input.payment_status === "pay_at_property"
          ? Math.round(effectiveTotal * 60) / 100
          : null
      )
      const effectiveBalance = input.balance_amount || (
        effectiveAdvance ? effectiveTotal - effectiveAdvance : null
      )
      const effectivePaid = input.paid_amount || (
        input.payment_status === "paid" ? effectiveTotal : (effectiveAdvance || 0)
      )

      const paymentMeta: Record<string, unknown> = {}
      if (effectiveAdvance) paymentMeta.pos_advance_amount = effectiveAdvance
      if (effectiveBalance) paymentMeta.pos_balance_amount = effectiveBalance
      if (effectivePaid) paymentMeta.pos_paid_amount = effectivePaid

      const { data: booking, error: insertError } = await db
        .from("bookings")
        .insert({
          room_id: input.room_id,
          check_in: input.check_in,
          check_out: input.check_out,
          total_price: effectiveTotal,
          advance_amount: effectiveAdvance,
          balance_amount: effectiveBalance,
          guest_name: input.guest_name,
          guest_email: input.guest_email,
          guest_phone: input.guest_phone,
          booking_status: input.booking_status,
          payment_status: input.payment_status,
          source: "pos",
          pos_booking_id: input.pos_booking_id || null,
          metadata: { trace_id: traceId, origin_system: "pos", ...paymentMeta },
        })
        .select()
        .single()

      if (insertError) {
        if (insertError.code === "23P01" || insertError.code === "23505") {
          return errorResponse("Room is not available for the selected dates", 409, corsHeaders)
        }
        return errorResponse(insertError.message, 500, corsHeaders)
      }

      return new Response(JSON.stringify({ data: booking }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 201,
      })
    }

    const updateMatch = path.match(/^\/bookings\/([a-f0-9-]+)$/)
    if (req.method === "PUT" && updateMatch) {
      const rawBodyText = await req.text()
      if (!(await verifyHmacSignature(req, rawBodyText))) {
        return errorResponse("Invalid webhook signature", 403, corsHeaders)
      }

      let rawBody: Record<string, unknown>
      try {
        rawBody = JSON.parse(rawBodyText) as Record<string, unknown>
      } catch {
        return errorResponse("Invalid JSON body", 400, corsHeaders)
      }

      if (rawBody.origin_system === "website" || rawBody.source === "website") {
        return errorResponse("Loop detected: origin_system cannot be 'website'", 400, corsHeaders)
      }

      const parsed = UpdateBookingSchema.safeParse(rawBody)
      if (!parsed.success) {
        return errorResponse("Validation: " + parsed.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; "), 400, corsHeaders)
      }

      const updates: Record<string, unknown> = { ...parsed.data }

      if (updates.total_amount) {
        updates.total_price = updates.total_amount
        delete updates.total_amount
      }

      if (updates.payment_status === "paid" && !updates.advance_amount) {
        const { data: current } = await db
          .from("bookings")
          .select("total_price")
          .eq("id", updateMatch[1])
          .single()
        if (current) {
          updates.advance_amount = current.total_price
          updates.balance_amount = 0
        }
      }

      const { data: booking, error: updateError } = await db
        .from("bookings")
        .update({ ...updates, source: "pos" })
        .eq("id", updateMatch[1])
        .select()
        .single()

      if (updateError) return errorResponse(updateError.message, 500, corsHeaders)

      return new Response(JSON.stringify({ data: booking }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return errorResponse("Not found", 404, corsHeaders)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error"
    console.error("pos-sync-api error:", error)
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
}
