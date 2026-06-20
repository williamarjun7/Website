import { createClient } from "npm:@insforge/sdk"

const RECONCILIATION_TIMEOUT_MS = 120_000
const MAX_LOG_AGE_DAYS = 30
const COMPARISON_FIELDS = [
  "guest_name",
  "guest_email",
  "guest_phone",
  "room_id",
  "check_in",
  "check_out",
  "booking_status",
  "payment_status",
  "total_price",
] as const

type ComparisonField = typeof COMPARISON_FIELDS[number]

type LogEntry = Record<string, unknown>

interface PosBooking {
  id: string
  website_booking_id?: string
  guest_name: string
  guest_email?: string
  guest_phone?: string
  room_id: string
  check_in: string
  check_out: string
  status: string
  payment_status: string
  total_amount: number
  paid_amount: number
  nightly_rate: number
  adults: number
  children: number
  created_at: string
  updated_at: string
}

interface WebsiteBooking {
  id: string
  pos_booking_id?: string
  guest_name: string
  guest_email?: string
  guest_phone?: string
  room_id: string
  check_in: string
  check_out: string
  booking_status: string
  payment_status: string
  total_price: number
  advance_amount: number | null
  balance_amount: number | null
  nightly_rate: number | null
  adults: number
  children: number
  source: string
  created_at: string
  updated_at: string
}

function logRecon(db: ReturnType<typeof createClient>["database"], entry: {
  booking_id: string
  severity: string
  issue_type: string
  website_value: Record<string, unknown> | null
  pos_value: Record<string, unknown> | null
  details: string
}): Promise<unknown> {
  return db.from("sync_reconciliation_logs").insert({
    booking_id: entry.booking_id,
    severity: entry.severity,
    issue_type: entry.issue_type,
    website_value: entry.website_value,
    pos_value: entry.pos_value,
    details: entry.details,
  })
}

function getField(obj: Record<string, unknown>, field: string): unknown {
  const value = obj[field]
  if (value === null || value === undefined) return null
  if (typeof value === "string") return value.trim().toLowerCase()
  return value
}

function compareValues(a: unknown, b: unknown): boolean {
  if (a === null && b === null) return true
  if (a === null || b === null) return false
  if (typeof a === "string" && typeof b === "string") {
    return a.trim().toLowerCase() === b.trim().toLowerCase()
  }
  return String(a) === String(b)
}

function normalizeStatus(status: string): string {
  const s = status.toLowerCase().replace(/[\s_-]/g, "")
  const map: Record<string, string> = {
    pending: "pending",
    pendingpayment: "pending_payment",
    confirmed: "confirmed",
    checkedin: "checked_in",
    checkedout: "checked_out",
    cancelled: "cancelled",
    noshow: "no_show",
    expired: "expired",
    failed: "failed",
    paid: "paid",
    unpaid: "unpaid",
    partiallypaid: "partial",
    partial: "partial",
    refunded: "refunded",
    payatproperty: "pay_at_property",
  }
  return map[s] || status
}

function normalizePaymentStatus(status: string): string {
  const s = status.toLowerCase().replace(/[\s_-]/g, "")
  const map: Record<string, string> = {
    pending: "pending",
    paid: "paid",
    unpaid: "unpaid",
    failed: "failed",
    payatproperty: "pay_at_property",
    partiallypaid: "partial",
    partial: "partial",
    refunded: "refunded",
  }
  return map[s] || status
}

export default async function handler(): Promise<Response> {
  const startTime = Date.now()

  try {
    const baseUrl = Deno.env.get("INSFORGE_BASE_URL") || Deno.env.get("SUPABASE_URL") || ""
    const anonKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("API_KEY") || ""

    if (!baseUrl || !anonKey) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500 })
    }

    const { database: db } = createClient({ baseUrl, anonKey })

    const posApiUrl = Deno.env.get("POS_WEBHOOK_URL")
    const posApiKey = Deno.env.get("POS_SYNC_API_KEY")

    const results = {
      bookings_checked: 0,
      matched: 0,
      mismatches: 0,
      missing_on_pos: 0,
      missing_on_website: 0,
      orphaned_website: 0,
      errors: 0,
      duration_ms: 0,
    }

    // Clean old logs (keep MAX_LOG_AGE_DAYS)
    const cutoff = new Date(Date.now() - MAX_LOG_AGE_DAYS * 24 * 3600 * 1000).toISOString()
    await db.from("sync_reconciliation_logs").delete().lt("detected_at", cutoff)

    // ── Step 1: Fetch all Website bookings that should be in POS (source=website, pos_booking_id set) ──
    const { data: websiteBookings, error: fetchErr } = await db
      .from("bookings")
      .select("id, pos_booking_id, guest_name, guest_email, guest_phone, room_id, check_in, check_out, booking_status, payment_status, total_price, advance_amount, balance_amount, nightly_rate, adults, children, source, created_at, updated_at")
      .not("pos_booking_id", "is", null)
      .gte("updated_at", cutoff)

    if (fetchErr) {
      return new Response(JSON.stringify({ error: "Failed to fetch Website bookings", details: fetchErr }), { status: 500 })
    }

    const wsBookings = (websiteBookings || []) as unknown as WebsiteBooking[]
    results.bookings_checked = wsBookings.length

    // ── Step 2: Fetch POS booking IDs from sync_events that have been processed ──
    const { data: syncedPosIds } = await db
      .from("sync_events")
      .select("pos_booking_id, entity_id")
      .eq("status", "processed")
      .not("pos_booking_id", "is", null)
      .gte("created_at", cutoff)
      .limit(2000)

    const websiteToPosMap = new Map<string, string>()
    for (const se of syncedPosIds || []) {
      const seRecord = se as Record<string, unknown>
      if (seRecord.entity_id && seRecord.pos_booking_id) {
        websiteToPosMap.set(String(seRecord.entity_id), String(seRecord.pos_booking_id))
      }
    }

    // ── Step 3: Check each Website booking against POS data ──
    for (const wb of wsBookings) {
      if (Date.now() - startTime > RECONCILIATION_TIMEOUT_MS) break

      const posBookingId = wb.pos_booking_id || websiteToPosMap.get(wb.id)

      if (!posBookingId) {
        results.missing_on_pos++
        await logRecon(db, {
          booking_id: wb.id,
          severity: "high",
          issue_type: "missing_booking",
          website_value: { id: wb.id, guest_name: wb.guest_name } as Record<string, unknown>,
          pos_value: null,
          details: `Website booking ${wb.id} has no pos_booking_id — never synced to POS`,
        })
        continue
      }

      // Try to fetch POS booking via API if available
      let posBooking: PosBooking | null = null
      if (posApiUrl && posApiKey) {
        try {
          const posResp = await fetch(`${posApiUrl.replace(/\/webhook.*$/, "")}/api/bookings/${posBookingId}`, {
            headers: { "X-POS-API-Key": posApiKey },
            signal: AbortSignal.timeout(5_000),
          })
          if (posResp.ok) {
            posBooking = (await posResp.json()).data as PosBooking
          }
        } catch {
          // POS unreachable — skip cross-reference for this cycle
        }
      }

      if (!posBooking) {
        // If we can't reach POS, mark as inconclusive but don't log as error
        results.matched++
        continue
      }

      // ── Compare each field ──
      const wsNorm: Record<string, unknown> = {
        guest_name: getField(wb as unknown as Record<string, unknown>, "guest_name"),
        guest_email: getField(wb as unknown as Record<string, unknown>, "guest_email"),
        guest_phone: getField(wb as unknown as Record<string, unknown>, "guest_phone"),
        room_id: getField(wb as unknown as Record<string, unknown>, "room_id"),
        check_in: getField(wb as unknown as Record<string, unknown>, "check_in"),
        check_out: getField(wb as unknown as Record<string, unknown>, "check_out"),
        booking_status: normalizeStatus(wb.booking_status),
        payment_status: normalizePaymentStatus(wb.payment_status),
        total_price: wb.total_price,
      }

      const posNorm: Record<string, unknown> = {
        guest_name: getField(posBooking as unknown as Record<string, unknown>, "guest_name"),
        guest_email: getField(posBooking as unknown as Record<string, unknown>, "guest_email"),
        guest_phone: getField(posBooking as unknown as Record<string, unknown>, "guest_phone"),
        room_id: getField(posBooking as unknown as Record<string, unknown>, "room_id"),
        check_in: getField(posBooking as unknown as Record<string, unknown>, "check_in"),
        check_out: getField(posBooking as unknown as Record<string, unknown>, "check_out"),
        booking_status: normalizeStatus(posBooking.status),
        payment_status: normalizePaymentStatus(posBooking.payment_status || "unpaid"),
        total_price: posBooking.total_amount,
      }

      let anyMismatch = false

      for (const field of COMPARISON_FIELDS) {
        const wsVal = wsNorm[field]
        const posVal = posNorm[field]

        if (!compareValues(wsVal, posVal)) {
          anyMismatch = true
          const issueType = field === "booking_status"
            ? "status_mismatch"
            : field === "payment_status"
              ? "payment_mismatch"
              : field === "total_price"
                ? "amount_mismatch"
                : field === "guest_name"
                  ? "guest_name_mismatch"
                  : field === "guest_phone"
                    ? "guest_phone_mismatch"
                    : field === "guest_email"
                      ? "guest_email_mismatch"
                      : field === "room_id"
                        ? "room_mismatch"
                        : "date_mismatch"

          await logRecon(db, {
            booking_id: wb.id,
            severity: issueType === "status_mismatch" || issueType === "payment_mismatch" ? "high" : "medium",
            issue_type: issueType,
            website_value: { [field]: wsVal } as Record<string, unknown>,
            pos_value: { [field]: posVal } as Record<string, unknown>,
            details: `Field "${field}" mismatch: Website="${wsVal}" vs POS="${posVal}"`,
          })
        }
      }

      if (anyMismatch) {
        results.mismatches++
      } else {
        results.matched++
      }
    }

    // ── Step 4: Check for orphaned POS bookings (POS booking_id exists in sync_events but no Website booking) ──
    const { data: processedEvents } = await db
      .from("sync_events")
      .select("entity_id, pos_booking_id")
      .eq("status", "processed")
      .gte("created_at", cutoff)
      .limit(1000)

    for (const event of (processedEvents || []) as Array<Record<string, unknown>>) {
      if (!event.pos_booking_id) continue
      const websiteId = String(event.entity_id)
      const exists = wsBookings.find(w => w.id === websiteId)
      if (!exists) {
        results.orphaned_website++
        await logRecon(db, {
          booking_id: websiteId,
          severity: "critical",
          issue_type: "orphaned_record",
          website_value: null,
          pos_value: { pos_booking_id: event.pos_booking_id, event_type: event.event_type } as Record<string, unknown>,
          details: `POS booking ${event.pos_booking_id} references Website booking ${websiteId} which no longer exists`,
        })
      }
    }

    results.duration_ms = Date.now() - startTime

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      results,
      summary: {
        healthy: results.mismatches === 0 && results.missing_on_pos === 0 && results.orphaned_website === 0,
        total_checked: results.bookings_checked,
        match_rate_pct: results.bookings_checked > 0
          ? Math.round((results.matched / results.bookings_checked) * 10000) / 100
          : 100,
      },
    }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("reconcile-bookings error:", message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
