export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  count?: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 30,
  windowSeconds: 60,
};

export async function checkRateLimit(
  db: { rpc: (fn: string, params: Record<string, unknown>) => { single: () => Promise<{ data: Record<string, unknown> | null; error: unknown }> } },
  key: string,
  config: Partial<RateLimitConfig> = {},
): Promise<RateLimitResult> {
  const { maxRequests, windowSeconds } = { ...DEFAULT_CONFIG, ...config };

  const { data, error } = await db.rpc("check_rate_limit", {
    p_key: key,
    p_max_requests: maxRequests,
    p_window_seconds: windowSeconds,
  }).single();

  if (error || !data) {
    return { allowed: true };
  }

  return {
    allowed: (data as Record<string, unknown>).allowed !== false,
    retryAfter: (data as Record<string, unknown>).retry_after as number | undefined,
    count: (data as Record<string, unknown>).count as number | undefined,
  };
}

export function rateLimitKey(type: string, identifier: string): string {
  return `${type}:${identifier}`;
}
