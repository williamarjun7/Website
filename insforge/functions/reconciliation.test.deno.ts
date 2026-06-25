// ═══════════════════════════════════════════════════════════════════
// Reconciliation Engine Tests
// ═══════════════════════════════════════════════════════════════════
//
// Run: deno test --no-check reconciliation.test.deno.ts
// ═══════════════════════════════════════════════════════════════════

import { assertEquals, assert } from "https://deno.land/std@0.208.0/assert/mod.ts"

// ── Helpers ────────────────────────────────────────────────────────

function uuid(): string {
  return crypto.randomUUID()
}


// ── In-Memory Database for Reconciliation Logic Tests ─────────────

interface ReconLog {
  id: string
  booking_id: string
  severity: string
  issue_type: string
  website_value: Record<string, unknown> | null
  pos_value: Record<string, unknown> | null
  details: string
  detected_at: string
  resolved_at: string | null
}

class ReconTestDB {
  bookings: Array<Record<string, unknown>> = []
  syncEvents: Array<Record<string, unknown>> = []
  reconLogs: ReconLog[] = []

  insertBooking(b: Record<string, unknown>): void {
    this.bookings.push(b)
  }

  insertSyncEvent(e: Record<string, unknown>): void {
    this.syncEvents.push(e)
  }

  addReconLog(log: ReconLog): void {
    this.reconLogs.push(log)
  }

  findWebsiteBooking(id: string): Record<string, unknown> | undefined {
    return this.bookings.find(b => b.id === id)
  }

  getUnresolvedLogs(): ReconLog[] {
    return this.reconLogs.filter(l => l.resolved_at === null)
  }

  getLogsByType(issueType: string): ReconLog[] {
    return this.reconLogs.filter(l => l.issue_type === issueType)
  }

  reset(): void {
    this.bookings = []
    this.syncEvents = []
    this.reconLogs = []
  }
}

// ── Normalization Helpers (mirrors reconcile-bookings logic) ──────

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

function compareValues(a: unknown, b: unknown): boolean {
  if (a === null && b === null) return true
  if (a === null || b === null) return false
  if (typeof a === "string" && typeof b === "string") {
    return a.trim().toLowerCase() === b.trim().toLowerCase()
  }
  return String(a) === String(b)
}

// ═══════════════════════════════════════════════════════════════════
// TEST 1: Normalization
// ═══════════════════════════════════════════════════════════════════

Deno.test({
  name: "REC-1: normalizeStatus — handles all variants",
  fn: () => {
    assertEquals(normalizeStatus("CONFIRMED"), "confirmed")
    assertEquals(normalizeStatus("Checked-In"), "checked_in")
    assertEquals(normalizeStatus("checked_in"), "checked_in")
    assertEquals(normalizeStatus("Checked Out"), "checked_out")
    assertEquals(normalizeStatus("no-show"), "no_show")
    assertEquals(normalizeStatus("Pending Payment"), "pending_payment")
    assertEquals(normalizeStatus("pay_at_property"), "pay_at_property")
  },
})

Deno.test({
  name: "REC-2: normalizePaymentStatus — handles all payment states",
  fn: () => {
    assertEquals(normalizePaymentStatus("paid"), "paid")
    assertEquals(normalizePaymentStatus("PARTIAL"), "partial")
    assertEquals(normalizePaymentStatus("PartiallyPaid"), "partial")
    assertEquals(normalizePaymentStatus("refunded"), "refunded")
    assertEquals(normalizePaymentStatus("UNPAID"), "unpaid")
  },
})

// ═══════════════════════════════════════════════════════════════════
// TEST 3: Drift Detection — Matched Booking
// ═══════════════════════════════════════════════════════════════════

function simulateReconciliation(ws: Record<string, unknown>, pos: Record<string, unknown>): ReconLog[] {
  const logs: ReconLog[] = []

  const wsNorm: Record<string, unknown> = {
    guest_name: String(ws.guest_name || "").toLowerCase().trim(),
    guest_email: String(ws.guest_email || "").toLowerCase().trim(),
    guest_phone: String(ws.guest_phone || "").toLowerCase().trim(),
    room_id: String(ws.room_id || ""),
    check_in: String(ws.check_in || ""),
    check_out: String(ws.check_out || ""),
    booking_status: normalizeStatus(String(ws.booking_status || "")),
    payment_status: normalizePaymentStatus(String(ws.payment_status || "")),
    total_price: ws.total_price,
  }

  const posNorm: Record<string, unknown> = {
    guest_name: String(pos.guest_name || "").toLowerCase().trim(),
    guest_email: String(pos.guest_email || "").toLowerCase().trim(),
    guest_phone: String(pos.guest_phone || "").toLowerCase().trim(),
    room_id: String(pos.room_id || ""),
    check_in: String(pos.check_in || ""),
    check_out: String(pos.check_out || ""),
    booking_status: normalizeStatus(String(pos.status || pos.booking_status || "")),
    payment_status: normalizePaymentStatus(String(pos.payment_status || "")),
    total_price: pos.total_amount || pos.total_price,
  }

  const fields: Array<{ name: string; issueType: string }> = [
    { name: "guest_name", issueType: "guest_name_mismatch" },
    { name: "guest_phone", issueType: "guest_phone_mismatch" },
    { name: "guest_email", issueType: "guest_email_mismatch" },
    { name: "room_id", issueType: "room_mismatch" },
    { name: "check_in", issueType: "date_mismatch" },
    { name: "check_out", issueType: "date_mismatch" },
    { name: "booking_status", issueType: "status_mismatch" },
    { name: "payment_status", issueType: "payment_mismatch" },
    { name: "total_price", issueType: "amount_mismatch" },
  ]

  for (const f of fields) {
    if (!compareValues(wsNorm[f.name], posNorm[f.name])) {
      logs.push({
        id: uuid(),
        booking_id: String(ws.id || ""),
        severity: f.issueType === "status_mismatch" || f.issueType === "payment_mismatch" ? "high" : "medium",
        issue_type: f.issueType,
        website_value: { [f.name]: wsNorm[f.name] },
        pos_value: { [f.name]: posNorm[f.name] },
        details: `Field "${f.name}" mismatch: Website="${wsNorm[f.name]}" vs POS="${posNorm[f.name]}"`,
        detected_at: new Date().toISOString(),
        resolved_at: null,
      })
    }
  }

  return logs
}

Deno.test({
  name: "REC-3: fully matched booking — zero drift logs",
  fn: () => {
    const ws = {
      id: uuid(),
      guest_name: "John Doe",
      guest_email: "john@example.com",
      guest_phone: "+977-9800000001",
      room_id: uuid(),
      check_in: "2026-07-15",
      check_out: "2026-07-17",
      booking_status: "confirmed",
      payment_status: "paid",
      total_price: 9000,
    }
    const pos = {
      guest_name: "John Doe",
      guest_email: "john@example.com",
      guest_phone: "+977-9800000001",
      room_id: ws.room_id,
      check_in: "2026-07-15",
      check_out: "2026-07-17",
      status: "confirmed",
      payment_status: "paid",
      total_amount: 9000,
    }

    const logs = simulateReconciliation(ws, pos)
    assertEquals(logs.length, 0, "No drift logs for matched booking")
  },
})

Deno.test({
  name: "REC-4: status mismatch — generates drift log",
  fn: () => {
    const bookingId = uuid()
    const ws = {
      id: bookingId,
      guest_name: "Jane Doe",
      guest_email: "jane@example.com",
      guest_phone: "+977-9800000002",
      room_id: uuid(),
      check_in: "2026-08-01",
      check_out: "2026-08-03",
      booking_status: "checked_in",
      payment_status: "paid",
      total_price: 12000,
    }
    const pos = {
      guest_name: "Jane Doe",
      guest_email: "jane@example.com",
      guest_phone: "+977-9800000002",
      room_id: ws.room_id,
      check_in: "2026-08-01",
      check_out: "2026-08-03",
      status: "confirmed",
      payment_status: "paid",
      total_amount: 12000,
    }

    const logs = simulateReconciliation(ws, pos)
    assertEquals(logs.length, 1, "One drift log for status mismatch")
    assertEquals(logs[0].issue_type, "status_mismatch")
    assertEquals(logs[0].severity, "high")
    assertEquals(logs[0].website_value?.booking_status, "checked_in")
    assertEquals(logs[0].pos_value?.booking_status, "confirmed")
  },
})

Deno.test({
  name: "REC-5: guest name mismatch — generates medium severity log",
  fn: () => {
    const bookingId = uuid()
    const ws = {
      id: bookingId,
      guest_name: "Alice Smith",
      guest_email: "alice@example.com",
      guest_phone: "+977-9800000003",
      room_id: uuid(),
      check_in: "2026-09-01",
      check_out: "2026-09-02",
      booking_status: "confirmed",
      payment_status: "unpaid",
      total_price: 4500,
    }
    const pos = {
      guest_name: "Alice Johnson",
      guest_email: "alice@example.com",
      guest_phone: "+977-9800000003",
      room_id: ws.room_id,
      check_in: "2026-09-01",
      check_out: "2026-09-02",
      status: "confirmed",
      payment_status: "unpaid",
      total_amount: 4500,
    }

    const logs = simulateReconciliation(ws, pos)
    assertEquals(logs.length, 1)
    assertEquals(logs[0].issue_type, "guest_name_mismatch")
    assertEquals(logs[0].severity, "medium")
  },
})

Deno.test({
  name: "REC-6: amount mismatch — generates drift log",
  fn: () => {
    const bookingId = uuid()
    const ws = {
      id: bookingId,
      guest_name: "Bob",
      guest_email: "bob@example.com",
      guest_phone: "+977-9800000004",
      room_id: uuid(),
      check_in: "2026-10-01",
      check_out: "2026-10-04",
      booking_status: "confirmed",
      payment_status: "paid",
      total_price: 13500,
    }
    const pos = {
      guest_name: "Bob",
      guest_email: "bob@example.com",
      guest_phone: "+977-9800000004",
      room_id: ws.room_id,
      check_in: "2026-10-01",
      check_out: "2026-10-04",
      status: "confirmed",
      payment_status: "paid",
      total_amount: 13000,
    }

    const logs = simulateReconciliation(ws, pos)
    assertEquals(logs.length, 1)
    assertEquals(logs[0].issue_type, "amount_mismatch")
    assertEquals(logs[0].website_value?.total_price, 13500)
    assertEquals(logs[0].pos_value?.total_price, 13000)
  },
})

Deno.test({
  name: "REC-7: fully mismatched booking — all 9 fields generate logs",
  fn: () => {
    const ws = {
      id: uuid(),
      guest_name: "Name A",
      guest_email: "a@example.com",
      guest_phone: "+977-1111111111",
      room_id: uuid(),
      check_in: "2026-01-01",
      check_out: "2026-01-02",
      booking_status: "confirmed",
      payment_status: "paid",
      total_price: 5000,
    }
    const pos = {
      guest_name: "Name B",
      guest_email: "b@example.com",
      guest_phone: "+977-2222222222",
      room_id: uuid(),
      check_in: "2026-01-03",
      check_out: "2026-01-04",
      status: "cancelled",
      payment_status: "unpaid",
      total_amount: 3000,
    }

    const logs = simulateReconciliation(ws, pos)
    assertEquals(logs.length, 9, "All 9 fields should differ")
    const types = logs.map(l => l.issue_type)
    assert(types.includes("guest_name_mismatch"), "guest_name")
    assert(types.includes("guest_email_mismatch"), "guest_email")
    assert(types.includes("guest_phone_mismatch"), "guest_phone")
    assert(types.includes("room_mismatch"), "room_id")
    assert(types.includes("date_mismatch"), "dates")
    assert(types.includes("status_mismatch"), "status")
    assert(types.includes("payment_mismatch"), "payment")
    assert(types.includes("amount_mismatch"), "amount")
  },
})

Deno.test({
  name: "REC-8: case insensitive comparison — same data different case = no drift",
  fn: () => {
    const ws = {
      id: uuid(),
      guest_name: "JOHN DOE",
      guest_email: "John@Example.COM",
      guest_phone: "+977-9800000005",
      room_id: uuid(),
      check_in: "2026-11-01",
      check_out: "2026-11-02",
      booking_status: "CONFIRMED",
      payment_status: "PAID",
      total_price: 4500,
    }
    const pos = {
      guest_name: "john doe",
      guest_email: "john@example.com",
      guest_phone: "+977-9800000005",
      room_id: ws.room_id,
      check_in: "2026-11-01",
      check_out: "2026-11-02",
      status: "confirmed",
      payment_status: "paid",
      total_amount: 4500,
    }

    const logs = simulateReconciliation(ws, pos)
    assertEquals(logs.length, 0, "Case differences should not trigger drift")
  },
})

Deno.test({
  name: "REC-9: payment status cross-format mapping",
  fn: () => {
    const tests: Array<{ ws: string; pos: string; match: boolean }> = [
      { ws: "paid", pos: "paid", match: true },
      { ws: "paid", pos: "Paid", match: true },
      { ws: "pay_at_property", pos: "partial", match: false },
      { ws: "partial", pos: "partially_paid", match: true },
      { ws: "failed", pos: "unpaid", match: false },
      { ws: "refunded", pos: "refunded", match: true },
    ]

    for (const t of tests) {
      const wsNorm = normalizePaymentStatus(t.ws)
      const posNorm = normalizePaymentStatus(t.pos)
      const result = wsNorm === posNorm
      assertEquals(result, t.match, `WS="${t.ws}"(${wsNorm}) vs POS="${t.pos}"(${posNorm}) expected match=${t.match}`)
    }
  },
})

Deno.test({
  name: "REC-10: orphan detection — booking exists in sync_events but not in bookings",
  fn: () => {
    const db = new ReconTestDB()

    // Website booking was deleted but sync_event still references it
    const orphanId = uuid()
    db.insertSyncEvent({
      entity_id: orphanId,
      pos_booking_id: "pos-123",
      status: "processed",
      event_type: "booking_confirmed",
      created_at: new Date().toISOString(),
    })

    // No matching booking in bookings table
    const exists = db.findWebsiteBooking(orphanId)
    assertEquals(exists, undefined, "Orphaned booking should not exist")

    // Simulate what the reconciliation engine does
    const processedEvents = db.syncEvents.filter(e => e.status === "processed" && e.pos_booking_id)
    const orphans = processedEvents.filter(e => !db.findWebsiteBooking(String(e.entity_id)))
    assertEquals(orphans.length, 1, "One orphaned sync event should be detected")
    assertEquals(orphans[0].entity_id, orphanId)
  },
})
