import { createClient } from "npm:@insforge/sdk"
import { z } from "https://esm.sh/zod@3.22.4"

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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-pos-api-key, x-webhook-signature, x-idempotency-key, x-webhook-event, x-webhook-source",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, OPTIONS",
    "Vary": "Origin",
  }
}

function verifyPosApiKey(request: Request): boolean {
  const expectedKey = Deno.env.get("POS_SYNC_API_KEY")
  if (!expectedKey) return false
  const apiKey = request.headers.get("x-pos-api-key")
  if (apiKey === expectedKey) return true
  const authHeader = request.headers.get("authorization") || ""
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i)
  return bearerMatch !== null && bearerMatch[1] === expectedKey
}

function errorResponse(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    headers: { "Content-Type": "application/json" },
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

async function checkIdempotency(db: any, idempotencyKey: string): Promise<boolean> {
  const { data } = await db
    .from("bookings")
    .select("id")
    .eq("pos_booking_id", idempotencyKey)
    .limit(1)
  return data && data.length > 0
}

const UpsertRoomSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  price_per_night: z.number().positive(),
  max_guests: z.number().int().positive().default(2),
  is_active: z.boolean().default(true),
  room_type: z.string().optional(),
  amenities: z.array(z.string()).optional(),
  room_size: z.string().optional(),
  bed_type: z.string().optional(),
  policies: z.string().optional(),
})

const CreateBookingSchema = z.object({
  room_id: z.string().uuid(),
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guest_name: z.string().min(2).max(100),
  guest_email: z.string().email(),
  guest_phone: z.string().regex(/^(\+?\d{1,3}[- ]?)?\d{7,15}$/),
  booking_status: z.enum(["confirmed", "checked_in", "checked_out"]).default("confirmed"),
  payment_status: z.enum(["pending", "paid", "failed", "pay_at_property"]).default("pending"),
  pos_booking_id: z.string().optional(),
})

const UpdateBookingSchema = z.object({
  booking_status: z.enum(["confirmed", "cancelled", "checked_in", "checked_out"]).optional(),
  payment_status: z.enum(["pending", "paid", "failed", "pay_at_property"]).optional(),
  guest_name: z.string().min(2).max(100).optional(),
  guest_phone: z.string().regex(/^(\+?\d{1,3}[- ]?)?\d{7,15}$/).optional(),
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export default async function handler(req: Request) {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  // Verify POS API key (except for GET availability)
  if (req.method !== "GET") {
    if (!verifyPosApiKey(req)) {
      return errorResponse("Unauthorized: Invalid or missing POS API key", 401)
    }
  }

  const url = new URL(req.url)
  const path = url.pathname.replace(/^\/functions\/pos-sync-api/, "").replace(/^\/api\/pos-sync/, "").replace(/^\/pos-sync/, "")

  try {
    const baseUrl = Deno.env.get("INSFORGE_BASE_URL") || Deno.env.get("SUPABASE_URL") || ""
    const anonKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("API_KEY") || ""

    if (!baseUrl || !anonKey) {
      return errorResponse("Server configuration error", 500)
    }

    const { database: db } = createClient({ baseUrl, anonKey })

    // ── GET /availability?check_in=...&check_out=... ───────────────────
    if (req.method === "GET" && path === "/availability") {
      const checkIn = url.searchParams.get("check_in")
      const checkOut = url.searchParams.get("check_out")

      if (!checkIn || !checkOut) {
        return errorResponse("check_in and check_out query parameters are required")
      }

      const [roomsResult, bookingsResult] = await Promise.all([
        db.from("rooms").select("*, room_images(*)").eq("is_active", true).order("name", { ascending: true }),
        db.from("bookings").select("room_id, check_in, check_out").in("booking_status", ["confirmed", "checked_in"]).lt("check_in", checkOut).gt("check_out", checkIn),
      ])

      const unavailableRoomIds = new Set<string>()
      for (const b of bookingsResult.data || []) unavailableRoomIds.add(b.room_id)

      const rooms = (roomsResult.data || []).map((room: any) => ({
        ...room,
        is_available: !unavailableRoomIds.has(room.id),
      }))

      return new Response(JSON.stringify({ data: rooms, unavailable_room_ids: [...unavailableRoomIds] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // ── GET /rooms ──────────────────────────────────────────────────────
    if (req.method === "GET" && path === "/rooms") {
      const { data: rooms, error } = await db
        .from("rooms")
        .select("*, room_images(*)")
        .order("name", { ascending: true })

      if (error) return errorResponse(error.message, 500)

      return new Response(JSON.stringify({ data: rooms }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // ── GET /bookings ────────────────────────────────────────────────────
    if (req.method === "GET" && path === "/bookings") {
      const status = url.searchParams.get("status")
      const fromDate = url.searchParams.get("from")
      const toDate = url.searchParams.get("to")
      const posId = url.searchParams.get("pos_booking_id")

      let query = db.from("bookings").select("*, rooms(name, room_type)").order("check_in", { ascending: false })

      if (status) query = query.eq("booking_status", status)
      if (fromDate) query = query.gte("check_in", fromDate)
      if (toDate) query = query.lte("check_out", toDate)
      if (posId) query = query.eq("pos_booking_id", posId)

      const { data: bookings, error } = await query

      if (error) return errorResponse(error.message, 500)

      return new Response(JSON.stringify({ data: bookings }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // ── GET /bookings/:id ────────────────────────────────────────────────
    const bookingIdMatch = path.match(/^\/bookings\/([a-f0-9-]+)$/)
    if (req.method === "GET" && bookingIdMatch) {
      const { data: booking, error } = await db
        .from("bookings")
        .select("*, rooms(*, room_images(*))")
        .eq("id", bookingIdMatch[1])
        .single()

      if (error) return errorResponse("Booking not found", 404)

      return new Response(JSON.stringify({ data: booking }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // ── POST /bookings (Create booking from POS) ─────────────────────────
    if (req.method === "POST" && path === "/bookings") {
      const rawBodyText = await req.text()
      if (!(await verifyHmacSignature(req, rawBodyText))) {
        return errorResponse("Invalid webhook signature", 403)
      }

      let rawBody: unknown
      try {
        rawBody = JSON.parse(rawBodyText)
      } catch {
        return errorResponse("Invalid JSON body")
      }

      const idempotencyKey = req.headers.get("x-idempotency-key") || (rawBody as Record<string, unknown>)?.idempotency_key as string | undefined
      if (idempotencyKey) {
        if (await checkIdempotency(db, idempotencyKey)) {
          return new Response(JSON.stringify({ received: true, duplicate: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          })
        }
      }

      const parsed = CreateBookingSchema.safeParse(rawBody)
      if (!parsed.success) {
        return errorResponse("Validation: " + parsed.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; "))
      }

      const input = parsed.data

      // Validate dates
      const checkInDate = new Date(input.check_in)
      const checkOutDate = new Date(input.check_out)
      if (checkOutDate <= checkInDate) {
        return errorResponse("check_out must be after check_in")
      }

      // Get room price
      const { data: room, error: roomError } = await db
        .from("rooms")
        .select("price_per_night")
        .eq("id", input.room_id)
        .single()

      if (roomError || !room) {
        return errorResponse("Room not found", 404)
      }

      const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
      const total_price = nights * room.price_per_night

      // Check for conflicts (skip if POS has its own checks)
      const { data: conflicts } = await db
        .from("bookings")
        .select("id")
        .eq("room_id", input.room_id)
        .in("booking_status", ["confirmed", "checked_in"])
        .lt("check_in", input.check_out)
        .gt("check_out", input.check_in)
        .limit(1)

      if (conflicts && conflicts.length > 0) {
        return errorResponse("Room is not available for the selected dates", 409)
      }

      // Insert with source=pos to prevent loop
      const { data: booking, error: insertError } = await db
        .from("bookings")
        .insert({
          room_id: input.room_id,
          check_in: input.check_in,
          check_out: input.check_out,
          total_price,
          guest_name: input.guest_name,
          guest_email: input.guest_email,
          guest_phone: input.guest_phone,
          booking_status: input.booking_status,
          payment_status: input.payment_status,
          source: "pos",
          pos_booking_id: input.pos_booking_id || null,
        })
        .select()
        .single()

      if (insertError) return errorResponse(insertError.message, 500)

      return new Response(JSON.stringify({ data: booking }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 201,
      })
    }

    // ── PUT /bookings/:id (Update booking from POS) ──────────────────────
    const updateMatch = path.match(/^\/bookings\/([a-f0-9-]+)$/)
    if (req.method === "PUT" && updateMatch) {
      const rawBodyText = await req.text()
      if (!(await verifyHmacSignature(req, rawBodyText))) {
        return errorResponse("Invalid webhook signature", 403)
      }

      let rawBody: unknown
      try {
        rawBody = JSON.parse(rawBodyText)
      } catch {
        return errorResponse("Invalid JSON body")
      }

      const parsed = UpdateBookingSchema.safeParse(rawBody)
      if (!parsed.success) {
        return errorResponse("Validation: " + parsed.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; "))
      }

      // Only allow updates that don't re-trigger website sync
      // Prevent infinite loop: POS updates set source=pos context
      const updates: Record<string, unknown> = { ...parsed.data }

      const { data: booking, error: updateError } = await db
        .from("bookings")
        .update({ ...updates, source: "pos" })
        .eq("id", updateMatch[1])
        .select()
        .single()

      if (updateError) return errorResponse(updateError.message, 500)

      return new Response(JSON.stringify({ data: booking }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return errorResponse("Not found", 404)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
}
