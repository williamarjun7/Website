import { createClient } from "npm:@insforge/sdk"

export default async function handler(_req: Request) {
  const baseUrl = Deno.env.get("INSFORGE_BASE_URL") || ""
  const anonKey = Deno.env.get("API_KEY") || ""
  if (!baseUrl || !anonKey) {
    return new Response(JSON.stringify({ error: "Server config error" }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
  const { database: db } = createClient({ baseUrl, anonKey })

  try {
    const { data, error } = await db
      .from("used_nonces")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .select("id")

    if (error) throw error

    const count = data ? data.length : 0
    return new Response(JSON.stringify({ success: true, deleted: count, timestamp: new Date().toISOString() }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("cleanup-nonces error:", message)
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
}
