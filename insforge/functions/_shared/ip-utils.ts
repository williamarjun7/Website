export type IpTrustModel = "platform" | "proxy-chain" | "first-proxy"

interface IpConfig {
  trustModel: IpTrustModel
  trustedProxyCount: number
}

function getConfig(): IpConfig {
  const model = (Deno.env.get("IP_TRUST_MODEL") || "platform") as IpTrustModel
  const proxyCount = parseInt(Deno.env.get("TRUSTED_PROXY_COUNT") || "0", 10)
  return { trustModel: model, trustedProxyCount: proxyCount }
}

export function getTrustedClientIP(request: Request): string {
  const config = getConfig()

  // Platform-specific headers set by the hosting provider (most trustworthy)
  const cfIp = request.headers.get("cf-connecting-ip")
  if (cfIp) return cfIp

  const realIp = request.headers.get("x-real-ip")
  if (realIp) return realIp

  const azureIp = request.headers.get("x-azure-clientip")
  if (azureIp) return azureIp

  const forwarded = request.headers.get("x-forwarded-for")
  if (!forwarded) return "unknown"

  const ips = forwarded.split(",").map(ip => ip.trim()).filter(Boolean)
  if (ips.length === 0) return "unknown"

  switch (config.trustModel) {
    case "platform":
      // Platform model: don't trust client-supplied X-Forwarded-For at all
      // Use only if the platform header was already set above
      return "unknown"

    case "proxy-chain":
      // Proxy-chain model: trust only the rightmost N IPs where N = trusted proxies + 1 (client)
      if (config.trustedProxyCount > 0 && ips.length > config.trustedProxyCount) {
        return ips[ips.length - 1 - config.trustedProxyCount]
      }
      // Fall through to safest default
      return ips[ips.length - 1] || "unknown"

    case "first-proxy":
      // Legacy behavior: trust first IP (only for backward compat)
      return ips[0]

    default:
      return "unknown"
  }
}
