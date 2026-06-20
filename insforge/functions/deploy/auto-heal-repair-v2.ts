import { createClient } from "npm:@insforge/sdk"

const REPAIR_TYPES = [
  "guest_name", "guest_email", "guest_phone",
  "payment_status", "booking_status",
  "advance_amount", "balance_amount", "total_price",
  "check_in", "check_out", "adults", "children",
] as const

const NEVER_AUTO_FIX = new Set([
  "missing_booking", "duplicate_booking",
  "room_mismatch", "orphaned_record", "stale_booking",
])

interface RepairJob {
  id: string
  issue_id: string
  repair_type: string
  booking_id: string
  severity: string
  before_value: Record<string, unknown>
  after_value: Record<string, unknown>
  status: string
  dry_run: boolean
  executed_at: string | null
  repaired_by: string
  notes: string | null
  rollback_sql: string | null
  created_at: string
}

export default async function handler(req: Request): Promise<Response> {
  const dryRun = req.headers.get("x-repair-mode") === "dry_run"

  try {
    const baseUrl = Deno.env.get("INSFORGE_BASE_URL") || Deno.env.get("SUPABASE_URL") || ""
    const anonKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("API_KEY") || ""

    if (!baseUrl || !anonKey) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500 })
    }

    const { database: db } = createClient({ baseUrl, anonKey })

    const results = {
      evaluated: 0,
      auto_healable: 0,
      non_auto_healable: 0,
      repairs_created: 0,
      errors: 0,
      dry_run,
    }

    const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
    const { data: unresolvedLogs, error: fetchError } = await db
      .from("sync_reconciliation_logs")
      .select("*")
      .is("resolved_at", null)
      .is("repair_job_id", null)
      .lte("detected_at", cutoff)
      .limit(100)

    if (fetchError) {
      return new Response(JSON.stringify({ error: "Failed to fetch reconciliation logs", details: fetchError }), { status: 500 })
    }

    const logs = (unresolvedLogs || []) as Array<Record<string, unknown>>
    results.evaluated = logs.length

    for (const log of logs) {
      const issueType = String(log.issue_type || "")
      const bookingId = String(log.booking_id || "")
      const severity = String(log.severity || "medium")

      if (NEVER_AUTO_FIX.has(issueType)) {
        results.non_auto_healable++
        await db.from("sync_reconciliation_logs").update({
          auto_healable: false,
        }).eq("id", log.id)
        continue
      }

      results.auto_healable++

      const repairType = issueType === "status_mismatch" ? "booking_status"
        : issueType === "payment_mismatch" ? "payment_status"
        : issueType === "guest_name_mismatch" ? "guest_name"
        : issueType === "guest_phone_mismatch" ? "guest_phone"
        : issueType === "guest_email_mismatch" ? "guest_email"
        : issueType === "amount_mismatch" ? "total_price"
        : issueType === "date_mismatch" ? "check_in"
        : ""

      if (!repairType) {
        results.non_auto_healable++
        continue
      }

      const websiteVal = log.website_value as Record<string, unknown> || {}
      const posVal = log.pos_value as Record<string, unknown> || {}

      const fieldName = Object.keys(websiteVal).find(k => k !== "id" && !k.startsWith("_")) || ""
      const afterVal = websiteVal[fieldName]
      const beforeVal = posVal[fieldName]

      let updateQuery: Record<string, unknown> | null = null
      if (fieldName === "booking_status") {
        updateQuery = { booking_status: String(afterVal), source: "pos" }
      } else if (fieldName === "payment_status") {
        updateQuery = { payment_status: String(afterVal), source: "pos" }
      } else if (fieldName === "guest_name") {
        updateQuery = { guest_name: String(afterVal) }
      } else if (fieldName === "guest_email") {
        updateQuery = { guest_email: String(afterVal) }
      } else if (fieldName === "guest_phone") {
        updateQuery = { guest_phone: String(afterVal) }
      } else if (fieldName === "total_price" || fieldName === "total_amount") {
        const numVal = Number(afterVal)
        if (!isNaN(numVal)) updateQuery = { total_price: numVal }
      } else if (fieldName === "check_in") {
        updateQuery = { check_in: String(afterVal) }
      } else if (fieldName === "check_out") {
        updateQuery = { check_out: String(afterVal) }
      } else if (fieldName === "adults") {
        const numVal = Number(afterVal)
        if (!isNaN(numVal)) updateQuery = { adults: numVal }
      } else if (fieldName === "children") {
        const numVal = Number(afterVal)
        if (!isNaN(numVal)) updateQuery = { children: numVal }
      }

      if (!updateQuery) {
        results.non_auto_healable++
        continue
      }

      const beforeSnapshot: Record<string, unknown> = {}
      for (const key of Object.keys(updateQuery)) {
        beforeSnapshot[key] = beforeVal
      }

      const rollbackSql = `UPDATE bookings SET source='website' WHERE id='${bookingId}';`

      const { data: job, error: jobError } = await db
        .from("sync_repair_jobs")
        .insert({
          issue_id: log.id,
          repair_type: repairType,
          booking_id: bookingId,
          severity,
          before_value: beforeSnapshot,
          after_value: updateQuery,
          status: dryRun ? "dry_run" : "pending",
          dry_run: dryRun,
          rollback_sql: rollbackSql,
        })
        .select()
        .single()

      if (jobError) {
        results.errors++
        continue
      }

      results.repairs_created++

      if (!dryRun) {
        const jobRecord = job as unknown as RepairJob
        try {
          await db.from("bookings").update(updateQuery).eq("id", bookingId)
          await db.from("sync_repair_jobs").update({
            status: "completed",
            executed_at: new Date().toISOString(),
          }).eq("id", jobRecord.id)

          await db.from("sync_reconciliation_logs").update({
            auto_healable: true,
            auto_healed_at: new Date().toISOString(),
            repair_job_id: jobRecord.id,
          }).eq("id", log.id)
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err)
          await db.from("sync_repair_jobs").update({
            status: "failed",
            notes: errMsg,
          }).eq("id", jobRecord.id)
          results.errors++
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("auto-heal-repair error:", message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
