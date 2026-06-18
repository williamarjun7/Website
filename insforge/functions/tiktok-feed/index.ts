const TIKTOK_USERNAME = "highlandscafe1"
const MAX_VIDEOS = 6
const CACHE_TTL_SECONDS = 3600

interface TikTokVideo {
  id: string
  url: string
  cover: string
  title: string
  videoUrl?: string
}

interface ApiResponse {
  videos: TikTokVideo[]
  source: string
  fetchedAt: string
}

async function fetchFromTikWM(): Promise<TikTokVideo[] | null> {
  try {
    const res = await fetch(
      `https://www.tikwm.com/api/user/posts?unique_id=${TIKTOK_USERNAME}&count=${MAX_VIDEOS}`,
      { headers: { "User-Agent": "Highlands-Motel-Cafe/1.0" }, signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null
    const body = await res.json()
    if (body.code !== 0 || !body.data?.videos) return null
    return body.data.videos.slice(0, MAX_VIDEOS).map((v: { video_id: string | number; title?: string; cover?: string; play?: string; wmplay?: string }) => ({
      id: String(v.video_id),
      url: `https://www.tiktok.com/@${TIKTOK_USERNAME}/video/${v.video_id}`,
      cover: v.cover || "",
      title: v.title || "",
      videoUrl: v.play || v.wmplay || "",
    }))
  } catch {
    return null
  }
}

async function fetchFromTikAPI(): Promise<TikTokVideo[] | null> {
  try {
    const res = await fetch(
      `https://api.tikapi.io/user/posts?unique_id=${TIKTOK_USERNAME}&count=${MAX_VIDEOS}`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null
    const body = await res.json()
    if (!Array.isArray(body)) return null
    return body.slice(0, MAX_VIDEOS).map((v: { id: string; desc?: string; cover?: string; play?: string }) => ({
      id: v.id,
      url: `https://www.tiktok.com/@${TIKTOK_USERNAME}/video/${v.id}`,
      cover: v.cover || "",
      title: v.desc || "",
      videoUrl: v.play || "",
    }))
  } catch {
    return null
  }
}

export default async function handler(req: Request) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  let videos: TikTokVideo[] | null = null
  let source = ""

  videos = await fetchFromTikWM()
  if (videos) source = "tikwm"

  if (!videos) {
    videos = await fetchFromTikAPI()
    if (videos) source = "tikapi"
  }

  const response: ApiResponse = {
    videos: videos || [],
    source,
    fetchedAt: new Date().toISOString(),
  }

  return new Response(JSON.stringify(response), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS * 2}`,
    },
  })
}
