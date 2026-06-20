import { createClient } from "npm:@insforge/sdk"

// ── Auto-Healing Repair Worker ─────────────────────────────────────
//
// SAFETY RULES:
//   ALLOWED auto-fix:
//     guest_name, guest_email, guest_phone — MEDIUM severity
//     payment_status, booking_status, advance_amount,
//     balance_amount, total_price — HIGH severity
//     check_in, check_out, adults, children — MEDIUM severity
//
//   NEVER auto-fix (require human approval via sync_repair_jobs):
//     missing_booking → needs manual POS creation
//     duplicate_booking → needs manual merge
//     room_reassignment → needs manual verification
//     orphaned_record → needs manual investigation
//
// DRY-RUN MODE:
//   Set repair_mode = "dry_run" in the request body to simulate
//   repairs without actually executing them.
//
// AUDIT TRAIL:
//   Every repair creates a sync_repair_jobs row with before/after
//   values, rollback SQL, and status tracking.
//
// ROLLBACK:
//   Each repair stores the SQL needed to reverse it.
// ──────────────────────────────────────────────────────────────────

interface RepairAction {
  issue_id: string
  booking_id: string
  repair_type: string
  severity: string
  website_value: Record<string, unknown> | null
  pos_value: Record<string, unknown> | null
}

const NEVER_AUTO_FIX = new Set([
  "missing_booking",
  "duplicate_booking",
  "room_mismatch",
  "orphaned_record",
  "stale_booking",
])

const AUTO_HEALABLE_TYPES: Record<string, string> = {
  guest_name_mismatch: "guest_name",
  guest_email_mismatch: "guest_email",
  guest_phone_mismatch: "guest_phone",
  status_mismatch: "booking_status",
  payment_mismatch: "payment_status",
  amount_mismatch: "total_price",
  date_mismatch: "check_out",
}

function generateRollbackSql(
  table: string,
  bookingId: string,
  field: string,
  beforeValue: unknown,
): string {
  const escaped = typeof beforeValue === "string"
    ? `'${beforeValue.replace(/'/g, "''")}'`
    : beforeValue === null
      ? "NULL"
      : String(beforeValue)
  return `UPDATE ${table} SET ${field} = ${escaped} WHERE id = '${bookingId.replace(/'/g, "''")}'`
}

function getRepairValue(
  repairType: string,
  posValue: Record<string, unknown> | null,
  websiteValue: Record<string, unknown> | null,
): unknown {
  if (!posValue) return null
  if (repairType === "booking_status") return posValue.booking_status || posValue.status
  if (repairType === "payment_status") return posValue.payment_status
  if (repairType === "guest_name") return posValue.guest_name
  if (repairType === "guest_email") return posValue.guest_email
  if (repairType === "guest_phone") return posValue.guest_phone
  if (repairType === "total_price") return posValue.total_price || posValue.total_amount
  if (repairType === "advance_amount") return posValue.advance_amount
  if (repairType === "balance_amount") return posValue.balance_amount
  if (repairType === "check_in") return posValue.check_in
  if (repairType === "check_out") return posValue.check_out
  if (repairType === "adults") return posValue.adults
  if (repairType === "children") return posValue.children
  return null
}

function getWebsiteFieldName(repairType: string): string {
  const map: Record<string, string> = {
    guest_name: "guest_name",
    guest_email: "guest_email",
    guest_phone: "guest_phone",
    booking_status: "booking_status",
    payment_status: "payment_status",
    total_price: "total_price",
    advance_amount: "advance_amount",
    balance_amount: "balance_amount",
    check_in: "check_in",
    check_out: "check_out",
    adults: "adults",
    children: "children",
  }
  return map[repairType] || repairType
}

export default async function handler(req: Request): Promise<Response> {
  const dryRun = req.method === "POST" && req.headers.get("x-repair-mode") === "dry_run"
  const isAdminRequest = req.method === "POST" && (req.method === "POST")

  try {
    const baseUrl = Deno.env.get("INSFORGE_BASE_URL") || Deno.env.get("SUPABASE_URL") || ""
    const anonKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("API_KEY") || ""

    if (!baseUrl || !anonKey) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500 })
    }

    const { database: db } = createClient({ baseUrl, anonKey })

    // ── Step 1: Fetch unresolved reconciliation logs that are auto-healable ──
    const { data: issues, error: fetchError } = await db
      .from("sync_reconciliation_logs")
      .select("id, booking_id, severity, issue_type, website_value, pos_value, details")
      .is("resolved_at", null)
      .is("repair_job_id", null)
      .order("detected_at", { ascending: true })
      .limit(50)

    if (fetchError) {
      return new Response(JSON.stringify({ error: "Failed to fetch reconciliation logs", details: fetchError }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    const repairs: RepairAction[] = (issues || []).map((issue: Record<string, unknown>) => ({
      issue_id: issue.id as string,
      booking_id: issue.booking_id as string,
      repair_type: AUTO_HEALABLE_TYPES[issue.issue_type as string] || issue.issue_type as string,
      severity: issue.severity as string,
      website_value: issue.website_value as Record<string, unknown> | null,
      pos_value: issue.pos_value as Record<string, unknown> | null,
    })).filter(r => {
      if (NEVER_AUTO_FIX.has(r.repair_type)) {
        console.warn(`auto-heal: Skipping non-auto-fixable issue type ${r.repair_type} for booking ${r.booking_id}`)
        return false
      }
      return true
    })

    const results = {
      total_found: (issues || []).length,
      auto_healable: repairs.length,
      skipped_require_human: (issues || []).length - repairs.length,
      dry_run,
      repairs_attempted: 0,
      repairs_succeeded: 0,
      repairs_failed: 0,
      repair_ids: [] as string[],
    }

    // ── Step 2: Process each repair ──
    for (const repair of repairs) {
      const newValue = getRepairValue(repair.repair_type, repair.pos_value, repair.website_value)
      const fieldName = getWebsiteFieldName(repair.repair_type)
      const beforeValue = repair.website_value?.[fieldName]
        || repair.website_value?.[repair.repair_type]
        || null

      if (newValue === null || newValue === undefined) {
        console.warn(`auto-heal: No repair value for ${repair.repair_type} on booking ${repair.booking_id}`)
        continue
      }

      // Check whether the value actually needs to change
      if (String(beforeValue) === String(newValue)) {
        // Already in sync — mark as resolved
        await db.from("sync_reconciliation_logs").update({
          resolved_at: new Date().toISOString(),
          notes: "Auto-healed (already in sync — no change needed)",
        }).eq("id", repair.issue_id)
        results.repairs_succeeded++
        continue
      }

      // Create repair job record
      const rollbackSql = dryRun ? null : generateRollbackSql("public.bookings", repair.booking_id, fieldName, beforeValue)

      const { data: job, error: jobError } = await db
        .from("sync_repair_jobs")
        .insert({
          issue_id: repair.issue_id,
          repair_type: repair.repair_type,
          booking_id: repair.booking_id,
          severity: repair.severity,
          before_value: { [fieldName]: beforeValue },
          after_value: { [fieldName]: newValue },
          status: dryRun ? "dry_run" : "pending",
          dry_run: dryRun,
          repaired_by: "system",
          notes: dryRun ? "Dry run — no changes executed" : null,
          rollback_sql: rollbackSql,
        })
        .select("id")
        .single()

      if (jobError) {
        console.error(`auto-heal: Failed to create repair job for booking ${repair.booking_id}:`, jobError)
        results.repairs_failed++
        continue
      }

      if (dryRun) {
        results.repair_ids.push(job.id)
        results.repairs_succeeded++
        continue
      }

      // ── EXECUTE REPAIR (dry_run = false) ──
      results.repairs_attempted++

      try {
        const updatePayload: Record<string, unknown> = {}
        updatePayload[fieldName] = newValue

        const { error: updateError } = await db
          .from("bookings")
          .update(updatePayload)
          .eq("id", repair.booking_id)

        if (updateError) {
          // Mark job as failed
          await db.from("sync_repair_jobs").update({
            status: "failed",
            notes: `Update failed: ${updateError.message}`,
          }).eq("id", job.id)
          results.repairs_failed++
          continue
        }

        // Mark job as completed
        await db.from("sync_repair_jobs").update({
          status: "completed",
          executed_at: new Date().toISOString(),
        }).eq("id", job.id)

        // Mark reconciliation log as healed
        await db.from("sync_reconciliation_logs").update({
          resolved_at: new Date().toISOString(),
          repair_job_id: job.id,
          auto_healed_at: new Date().toISOString(),
          notes: `Auto-healed: ${fieldName} changed from "${beforeValue}" to "${newValue}"`,
        }).eq("id", repair.issue_id)

        results.repairs_succeeded++
        results.repair_ids.push(job.id)
      } catch (execError) {
        const msg = execError instanceof Error ? execError.message : String(execError)
        await db.from("sync_repair_jobs").update({
          status: "failed",
          notes: `Execution error: ${msg}`,
        }).eq("id", job.id)
        results.repairs_failed++
      }
    }

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      results,
      summary: {
        mode: dryRun ? "dry_run" : "live",
        all_succeeded: results.repairs_failed === 0,
        total_processed: results.total_found,
        human_review_required: results.skipped_require_human,
      },
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
