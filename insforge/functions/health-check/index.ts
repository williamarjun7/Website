import { createClient } from 'npm:@insforge/sdk'

const ALLOWED_ORIGINS = [
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
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json",
  }
}

export default async function handler(req: Request) {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const baseUrl = Deno.env.get("INSFORGE_BASE_URL") || ""
  const anonKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {}

  const start = Date.now()

  // 1. Deno runtime check
  checks.runtime = { status: "ok" }

  // 2. DB connectivity
  if (baseUrl && anonKey) {
    try {
      const dbStart = Date.now()
      const { database: db } = createClient({ baseUrl, anonKey })
      const { error } = await db.from("rooms").select("id").limit(1)
      checks.database = {
        status: error ? "degraded" : "ok",
        latencyMs: Date.now() - dbStart,
        ...(error ? { error: error.message } : {}),
      }
    } catch (e) {
      checks.database = { status: "down", error: e instanceof Error ? e.message : "Unknown" }
    }
  } else {
    checks.database = { status: "not_configured" }
  }

  // 3. Environment variables check
  const requiredEnvs = [
    "FONEPAY_PG_MERCHANT_CODE",
    "FONEPAY_PG_MERCHANT_SECRET",
  ]
  const missingEnvs = requiredEnvs.filter(k => !Deno.env.get(k))
  checks.environment = {
    status: missingEnvs.length === 0 ? "ok" : "degraded",
    ...(missingEnvs.length > 0 ? { missingVars: missingEnvs } : {}),
  }

  const totalLatency = Date.now() - start
  const allOk = Object.values(checks).every(c => c.status === "ok" || c.status === "not_configured")

  return new Response(JSON.stringify({
    status: allOk ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    latencyMs: totalLatency,
    checks,
  }), { headers: corsHeaders })
}
