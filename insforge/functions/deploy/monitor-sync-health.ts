import { createClient } from "npm:@insforge/sdk"

interface SyncEvent {
  id: string
  event_type: string
  entity_id: string
  status: string
  retry_count: number
  max_retries: number
  last_error: string | null
  next_retry_at: string | null
  origin_system: string
  created_at: string
}

interface HealthReport {
  healthy: boolean
  timestamp: string
  metrics: {
    total_sync_events: number
    pending: number
    processed: number
    retrying: number
    dead_letter: number
    rejected_conflict: number
    stalled_retries: number
    dead_letter_rate_pct: number
    circuit_breaker_activations_24h: number
  }
  dead_letter_details: Array<{
    id: string
    event_type: string
    entity_id: string
    retry_count: number
    last_error: string | null
    created_at: string
  }>
  alerts: string[]
}

export default async function handler(): Promise<Response> {
  try {
    const baseUrl = Deno.env.get("INSFORGE_BASE_URL") || Deno.env.get("SUPABASE_URL") || ""
    const anonKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("API_KEY") || ""

    if (!baseUrl || !anonKey) {
      return new Response(JSON.stringify({ error: "Server config error" }), { status: 500 })
    }

    const { database: db } = createClient({ baseUrl, anonKey })
    const now = new Date().toISOString()
    const alerts: string[] = []

    // Count by status
    const { data: statusCounts } = await db
      .rpc("monitor_sync_event_counts", {} as Record<string, unknown>)

    let total = 0
    let pending = 0
    let processed = 0
    let retrying = 0
    let deadLetter = 0
    let rejected = 0

    if (statusCounts?.data) {
      for (const row of (statusCounts.data as Array<{ status: string; count: number }>)) {
        total += Number(row.count)
        switch (row.status) {
          case "pending": pending = Number(row.count); break
          case "processed": processed = Number(row.count); break
          case "retrying": retrying = Number(row.count); break
          case "dead_letter": deadLetter = Number(row.count); break
          case "rejected": rejected = Number(row.count); break
        }
      }
    } else {
      // Fallback: manual counts
      const { data: all } = await db.from("sync_events").select("status").limit(5000)
      if (all) {
        total = all.length
        for (const row of all as Array<{ status: string }>) {
          switch (row.status) {
            case "pending": pending++; break
            case "processed": processed++; break
            case "retrying": retrying++; break
            case "dead_letter": deadLetter++; break
            case "rejected": rejected++; break
          }
        }
      }
    }

    // Stalled retries: events stuck in retrying > 1 hour
    const stalledCutoff = new Date(Date.now() - 3_600_000).toISOString()
    const { data: stalled } = await db
      .from("sync_events")
      .select("id, event_type, entity_id, retry_count, max_retries, last_error, created_at")
      .eq("status", "retrying")
      .lt("next_retry_at", stalledCutoff)
      .limit(20)

    const stalledRetries = (stalled || []) as SyncEvent[]

    // Dead-letter details
    const { data: deadLetterEvents } = await db
      .from("sync_events")
      .select("id, event_type, entity_id, retry_count, last_error, created_at")
      .eq("status", "dead_letter")
      .order("created_at", { ascending: false })
      .limit(20)

    const deadLetterDetails = (deadLetterEvents || []) as SyncEvent[]

    // Stalled retry alerts
    if (stalledRetries.length > 0) {
      alerts.push(`WARN: ${stalledRetries.length} sync events stalled in retrying for >1 hour`)
    }

    // Dead letter throttle
    if (deadLetter > 10) {
      alerts.push(`WARN: ${deadLetter} dead-letter events — needs investigation`)
    }
    if (deadLetter > 50) {
      alerts.push(`CRIT: ${deadLetter} dead-letter events — pipeline may be broken`)
    }

    // High dead-letter rate (>5%)
    const deadLetterRate = total > 0 ? Math.round((deadLetter / total) * 10000) / 100 : 0
    if (deadLetterRate > 5) {
      alerts.push(`WARN: Dead-letter rate is ${deadLetterRate}% — exceeds 5% threshold`)
    }

    // Rejected events indicate sync conflicts
    if (rejected > 0) {
      alerts.push(`INFO: ${rejected} events rejected (conflicts) — may indicate booking overlap issues`)
    }

    const report: HealthReport = {
      healthy: deadLetter <= 10 && stalledRetries.length === 0 && deadLetterRate <= 5,
      timestamp: now,
      metrics: {
        total_sync_events: total,
        pending,
        processed,
        retrying,
        dead_letter: deadLetter,
        rejected_conflict: rejected,
        stalled_retries: stalledRetries.length,
        dead_letter_rate_pct: deadLetterRate,
        circuit_breaker_activations_24h: 0,
      },
      dead_letter_details: deadLetterDetails.map(e => ({
        id: e.id,
        event_type: e.event_type,
        entity_id: e.entity_id,
        retry_count: e.retry_count,
        last_error: e.last_error,
        created_at: e.created_at,
      })),
      alerts,
    }

    return new Response(JSON.stringify(report, null, 2), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("monitor-sync-health error:", message)
    return new Response(JSON.stringify({ error: message, healthy: false }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
