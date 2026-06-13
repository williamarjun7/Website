import { createClient } from "npm:@insforge/sdk"
import { z } from "https://esm.sh/zod@3.22.4"

const ALLOWED_ORIGINS: (string | RegExp)[] = [
  "https://6aiag3ra.insforge.site",
  "https://highlands-motel.com",
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
]

const RATE_LIMIT_MAX = 20
const RATE_LIMIT_WINDOW = 60_000
const MAX_BODY_BYTES = 65_536

interface RateLimitEntry { count: number; expires: number }
const rateLimitStore = new Map<string, RateLimitEntry>()

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

const PlaceOrderSchema = z.object({
  customer_name: z.string().min(2, "Name must be at least 2 characters").max(100),
  phone_number: z.string().min(7, "Phone number too short").max(20),
  address: z.string().min(1, "Address is required").max(500),
  area: z.string().max(100).optional(),
  order_notes: z.string().max(500).optional(),
  items: z.array(z.object({
    menu_item_id: z.string().min(1, "Invalid item"),
    quantity: z.number().int().min(1, "Quantity must be positive"),
  })).min(1, "At least one item required"),
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
    const rawData: unknown = await req.json()

    const parsed = PlaceOrderSchema.safeParse(rawData)
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Validation: " + parsed.error.errors.map(
        e => `${e.path.join(".")}: ${e.message}`
      ).join("; ") }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      })
    }

    const { customer_name, phone_number, address, area, order_notes, items } = parsed.data

    const baseUrl = Deno.env.get("INSFORGE_BASE_URL") || Deno.env.get("SUPABASE_URL") || ""
    const anonKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("API_KEY") || ""

    if (!baseUrl || !anonKey) {
      console.error("place-cafe-order: Server configuration error")
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      })
    }

    const client = createClient({ baseUrl, anonKey })

    const menuItemIds = [...new Set(items.map(i => i.menu_item_id))]
    const { data: menuItems, error: menuError } = await client.database
      .from("menu_items")
      .select("id, name, price")
      .in("id", menuItemIds)

    if (menuError || !menuItems || menuItems.length !== menuItemIds.length) {
      console.error("place-cafe-order: Menu items not found:", menuItemIds)
      return new Response(JSON.stringify({ error: "One or more menu items not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      })
    }

    const menuMap = new Map(menuItems.map(m => [m.id, { name: m.name, price: m.price }]))

    const resolvedItems = items.map(item => {
      const menuItem = menuMap.get(item.menu_item_id)
      if (!menuItem) throw new Error(`Menu item ${item.menu_item_id} not found`)
      return {
        menu_item_id: item.menu_item_id,
        item_name: menuItem.name,
        quantity: item.quantity,
        price: menuItem.price,
      }
    })

    const subtotal = resolvedItems.reduce((s, i) => s + i.price * i.quantity, 0)

    let orderNumber = ""
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: counter, error: cErr } = await client
        .database
        .from("order_counter")
        .select("last_number")
        .eq("id", 1)
        .single()
      if (cErr || !counter) {
        if (attempt < 4) await new Promise(r => setTimeout(r, 50 + Math.random() * 150))
        continue
      }
      const lastNumber = counter.last_number
      const nextNumber = lastNumber + 1
      const { data: updated, error: uErr } = await client
        .database
        .from("order_counter")
        .update({ last_number: nextNumber })
        .eq("id", 1)
        .eq("last_number", lastNumber)
        .select("last_number")
        .single()
      if (!uErr && updated?.last_number === nextNumber) {
        orderNumber = "ORD-" + nextNumber.toString().padStart(5, "0")
        break
      }
      if (attempt < 4) await new Promise(r => setTimeout(r, 50 + Math.random() * 150))
    }

    if (!orderNumber) orderNumber = "ORD-" + Date.now().toString(36).toUpperCase()

    const { data: order, error: oErr } = await client
      .database
      .from("orders")
      .insert({
        status: "Order Placed",
        order_type: "delivery",
        subtotal,
        tax: 0,
        total: subtotal,
        version: 1,
        estimated_min: 30,
        order_number: orderNumber,
        customer_name,
        phone_number,
        delivery_address: address,
        delivery_area: area || null,
        room_number: address,
        order_notes: order_notes || null,
      })
      .select()
      .single()

    if (oErr) {
      console.error("place-cafe-order: Failed to create order:", oErr.message)
      return new Response(JSON.stringify({ error: "Failed to create order" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      })
    }

    const orderItems = resolvedItems.map((item) => ({
      order_id: order.id,
      menu_item_id: item.menu_item_id,
      name: item.item_name,
      qty: item.quantity,
      price: item.price,
      notes: null,
    }))

    const { data: createdItems, error: iErr } = await client
      .database
      .from("order_items")
      .insert(orderItems)
      .select()

    if (iErr) {
      console.error("place-cafe-order: Failed to create order items:", iErr.message)
      return new Response(JSON.stringify({ error: "Failed to create order items" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      })
    }

    return new Response(JSON.stringify({ order, items: createdItems }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("place-cafe-order error:", error)
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
}
