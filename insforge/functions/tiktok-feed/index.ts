const CACHE_TTL_SECONDS = 3600

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

  const url = new URL(req.url)
  const tiktokUrl = url.searchParams.get("url") || "https://www.tiktok.com/@highlandscafe1"

  try {
    const oembedRes = await fetch(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(tiktokUrl)}`,
      { signal: AbortSignal.timeout(8000) }
    )

    if (!oembedRes.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch oEmbed", status: oembedRes.status }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const data = await oembedRes.json()

    return new Response(JSON.stringify({
      html: data.html || "",
      thumbnail: data.thumbnail_url || "",
      title: data.title || "",
      author: data.author_name || "",
      width: data.width || 600,
      height: data.height || 800,
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS * 2}`,
      },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error"
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
}
