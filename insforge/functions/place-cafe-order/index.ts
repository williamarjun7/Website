import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@insforge/sdk"

const ALLOWED_ORIGINS: (string | RegExp)[] = [
  "https://6aiag3ra.insforge.site",
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

function validate(data: any) {
  if (!data.customer_name || data.customer_name.length < 2) throw new Error("Name must be at least 2 characters")
  if (!data.phone_number) throw new Error("Phone number is required")
  if (!data.address) throw new Error("Address is required")
  if (!Array.isArray(data.items) || data.items.length === 0) throw new Error("At least one item required")
  for (const item of data.items) {
    if (!item.menu_item_id || !item.item_name || !item.quantity || !item.price) throw new Error("Invalid item")
    if (item.quantity < 1) throw new Error("Quantity must be positive")
    if (item.price <= 0) throw new Error("Price must be positive")
  }
}

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

  try {
    const data = await req.json()
    validate(data)

    const { customer_name, phone_number, address, area, items } = data

    const baseUrl = Deno.env.get("INSFORGE_BASE_URL") || Deno.env.get("SUPABASE_URL") || ""
    const anonKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("API_KEY") || ""

    if (!baseUrl || !anonKey) throw new Error("Server configuration error")

    const client = createClient({ baseUrl, anonKey })

    const subtotal = items.reduce((s: number, i: any) => s + i.price * i.quantity, 0)

    let orderNumber = ""
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: counter, error: cErr } = await client
        .database
        .from("order_counter")
        .select("last_number")
        .eq("id", 1)
        .single()
      if (cErr || !counter) continue
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
      })
      .select()
      .single()

    if (oErr) throw new Error(`Failed to create order: ${oErr.message}`)

    const orderItems = items.map((item: any) => ({
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

    if (iErr) throw new Error(`Failed to create order items: ${iErr.message}`)

    return new Response(JSON.stringify({ order, items: createdItems }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
}
