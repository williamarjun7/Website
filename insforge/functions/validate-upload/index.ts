import { createClient } from "npm:@insforge/sdk"

interface RateLimitConfig { maxRequests: number; windowSeconds: number }
interface RateLimitResult { allowed: boolean; retryAfter?: number; count?: number }
const DEFAULT_CONFIG: RateLimitConfig = { maxRequests: 30, windowSeconds: 60 }
async function checkRateLimit(db: { rpc: (fn: string, params: Record<string, unknown>) => { single: () => Promise<{ data: Record<string, unknown> | null; error: unknown }> } }, key: string, config: Partial<RateLimitConfig> = {}): Promise<RateLimitResult> {
  const { maxRequests, windowSeconds } = { ...DEFAULT_CONFIG, ...config }
  const { data, error } = await db.rpc("check_rate_limit", { p_key: key, p_max_requests: maxRequests, p_window_seconds: windowSeconds }).single()
  if (error || !data) return { allowed: true }
  return { allowed: (data as Record<string, unknown>).allowed !== false, retryAfter: (data as Record<string, unknown>).retry_after as number | undefined, count: (data as Record<string, unknown>).count as number | undefined }
}
function rateLimitKey(type: string, identifier: string): string { return `${type}:${identifier}` }

type IpTrustModel = "platform" | "proxy-chain" | "first-proxy"
function getTrustedClientIP(request: Request): string {
  const model = (Deno.env.get("IP_TRUST_MODEL") || "platform") as IpTrustModel
  const proxyCount = parseInt(Deno.env.get("TRUSTED_PROXY_COUNT") || "0", 10)
  const cfIp = request.headers.get("cf-connecting-ip"); if (cfIp) return cfIp
  const realIp = request.headers.get("x-real-ip"); if (realIp) return realIp
  const azureIp = request.headers.get("x-azure-clientip"); if (azureIp) return azureIp
  const forwarded = request.headers.get("x-forwarded-for")
  if (!forwarded) return "unknown"
  const ips = forwarded.split(",").map(ip => ip.trim()).filter(Boolean)
  if (ips.length === 0) return "unknown"
  if (model === "platform") return "unknown"
  if (model === "proxy-chain") {
    if (proxyCount > 0 && ips.length > proxyCount) return ips[ips.length - 1 - proxyCount]
    return ips[ips.length - 1] || "unknown"
  }
  if (model === "first-proxy") return ips[0]
  return "unknown"
}

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"]
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

const IMAGE_MAGIC_BYTES: Record<string, Uint8Array[]> = {
  "image/jpeg": [new Uint8Array([0xFF, 0xD8, 0xFF])],
  "image/png": [new Uint8Array([0x89, 0x50, 0x4E, 0x47])],
  "image/gif": [new Uint8Array([0x47, 0x49, 0x46])],
  "image/webp": [new Uint8Array([0x52, 0x49, 0x46, 0x46])],
}

async function verifyImageMagicBytes(buffer: ArrayBuffer, mimeType: string): Promise<boolean> {
  const signatures = IMAGE_MAGIC_BYTES[mimeType]
  if (!signatures) return false
  const header = new Uint8Array(buffer.slice(0, 8))
  return signatures.some(sig => {
    if (sig.length > header.length) return false
    for (let i = 0; i < sig.length; i++) {
      if (header[i] !== sig[i]) return false
    }
    return true
  })
}

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".")
  if (dot === -1) return ""
  return filename.slice(dot).toLowerCase()
}

function sanitizeFileName(name: string): string {
  const ext = getExtension(name)
  const baseName = name.slice(0, name.length - ext.length)
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .substring(0, 60)
  return `${baseName}${ext}`
}

export default async function handler(req: Request) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const baseUrl = Deno.env.get("INSFORGE_BASE_URL") || Deno.env.get("SUPABASE_URL") || ""
  const anonKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("API_KEY") || ""
  if (!baseUrl || !anonKey) {
    return new Response(JSON.stringify({ error: "Server config error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const clientIp = getTrustedClientIP(req)
  const { database: db } = createClient({ baseUrl, anonKey })
  const { storage } = createClient({ baseUrl, anonKey })

  const rateCheck = await checkRateLimit(db, rateLimitKey("validate-upload", clientIp), { maxRequests: 30, windowSeconds: 60 })
  if (!rateCheck.allowed) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(rateCheck.retryAfter) },
    })
  }

  const contentLength = parseInt(req.headers.get("content-length") || "0", 10)
  if (contentLength > MAX_FILE_SIZE + 1024) {
    return new Response(JSON.stringify({ error: "File too large" }), {
      status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const folder = (formData.get("folder") as string) || "uploads"

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Validate extension
    const ext = getExtension(file.name)
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return new Response(JSON.stringify({ error: `Invalid file extension: ${ext}. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return new Response(JSON.stringify({ error: `Invalid file type: ${file.type}. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 5MB` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Validate magic bytes (signature-based content detection)
    const buffer = await file.arrayBuffer()
    const hasValidSignature = await verifyImageMagicBytes(buffer, file.type)
    if (!hasValidSignature) {
      return new Response(JSON.stringify({ error: "File content does not match declared type" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Upload file
    const safeName = sanitizeFileName(file.name)
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${safeName}`

    const { data: uploadData, error: uploadError } = await storage
      .from("site-assets")
      .upload(fileName, file, {
        contentType: file.type,
      })

    if (uploadError) {
      console.error("validate-upload: upload failed:", uploadError.message)
      return new Response(JSON.stringify({ error: "Upload failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const publicUrl = uploadData?.url || storage.from("site-assets").getPublicUrl(fileName)

    return new Response(JSON.stringify({
      success: true,
      url: publicUrl,
      key: uploadData?.key || fileName,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("validate-upload error:", err)
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
}
