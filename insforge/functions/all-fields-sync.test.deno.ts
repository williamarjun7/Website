// ═══════════════════════════════════════════════════════════════════
// All-Fields Sync Tests — Verify Fix #1 and Fix #2 behavior
// ═══════════════════════════════════════════════════════════════════
//
// Tests the expanded trigger and payment field synchronization logic.
// Run: deno test --no-check all-fields-sync.test.deno.ts
// ═══════════════════════════════════════════════════════════════════

import { assertEquals, assert, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts"

function uuid(): string {
  return crypto.randomUUID()
}

// ── Payment Field Payload Builder ──────────────────────────────────

interface BookingPayload {
  room_id: string
  guest_name: string
  guest_email: string
  guest_phone: string
  check_in: string
  check_out: string
  adults: number
  children: number
  total_price: number
  advance_amount: number | null
  balance_amount: number | null
  paid_amount: number
  nightly_rate: number | null
  payment_status: string
  booking_status: string
  source: string
  pos_booking_id: string | null
}

function buildSyncPayload(overrides: Partial<BookingPayload> = {}): BookingPayload {
  return {
    room_id: uuid(),
    guest_name: "Test Guest",
    guest_email: "test@example.com",
    guest_phone: "+977-9800000001",
    check_in: "2026-07-15",
    check_out: "2026-07-17",
    adults: 2,
    children: 0,
    total_price: 9000,
    advance_amount: null,
    balance_amount: null,
    paid_amount: 0,
    nightly_rate: 4500,
    payment_status: "pending",
    booking_status: "pending_payment",
    source: "website",
    pos_booking_id: null,
    ...overrides,
  }
}

// ═══════════════════════════════════════════════════════════════════
// TEST 1: Trigger Expansion — Payment Field Mapping
// ═══════════════════════════════════════════════════════════════════

function getPaidAmount(payload: BookingPayload): number {
  if (payload.paid_amount > 0) return payload.paid_amount
  if (payload.payment_status === "paid") return payload.total_price
  if (payload.payment_status === "pay_at_property" && payload.advance_amount) {
    return payload.advance_amount
  }
  return 0
}

function getAdvanceAmount(payload: BookingPayload): number | null {
  if (payload.advance_amount !== null && payload.advance_amount !== undefined) return payload.advance_amount
  if (payload.payment_status === "pay_at_property") {
    return Math.round(payload.total_price * 60) / 100
  }
  if (payload.payment_status === "paid") return payload.total_price
  return null
}

function getBalanceAmount(payload: BookingPayload): number | null {
  if (payload.balance_amount !== null && payload.balance_amount !== undefined) return payload.balance_amount
  const advance = getAdvanceAmount(payload)
  if (advance !== null) return payload.total_price - advance
  return null
}

Deno.test({
  name: "SYNC-1: full payment — paid_amount = total_price, advance = total, balance = 0",
  fn: () => {
    const p = buildSyncPayload({ payment_status: "paid" })
    assertEquals(getPaidAmount(p), 9000)
    assertEquals(getAdvanceAmount(p), 9000)
    assertEquals(getBalanceAmount(p), 0)
  },
})

Deno.test({
  name: "SYNC-2: pay_at_property — paid_amount = 60% advance",
  fn: () => {
    const p = buildSyncPayload({ payment_status: "pay_at_property", total_price: 10000 })
    const advance = getAdvanceAmount(p)
    assertEquals(advance, 6000)
    assertEquals(getBalanceAmount(p), 4000)
    assertEquals(getPaidAmount(p), 0) // paid_amount only set when explicitly provided
  },
})

Deno.test({
  name: "SYNC-3: pay_at_property with explicit advance_amount",
  fn: () => {
    const p = buildSyncPayload({
      payment_status: "pay_at_property",
      total_price: 10000,
      advance_amount: 5000,
      balance_amount: 5000,
      paid_amount: 5000,
    })
    assertEquals(getPaidAmount(p), 5000)
    assertEquals(getAdvanceAmount(p), 5000)
    assertEquals(getBalanceAmount(p), 5000)
  },
})

Deno.test({
  name: "SYNC-4: unpaid pending — no payment amounts",
  fn: () => {
    const p = buildSyncPayload({ payment_status: "pending", total_price: 8000 })
    assertEquals(getPaidAmount(p), 0)
    assertEquals(getAdvanceAmount(p), null)
    assertEquals(getBalanceAmount(p), null)
  },
})

Deno.test({
  name: "SYNC-5: failed payment — no amounts",
  fn: () => {
    const p = buildSyncPayload({ payment_status: "failed", total_price: 6000 })
    assertEquals(getPaidAmount(p), 0)
    assertEquals(getAdvanceAmount(p), null)
    assertEquals(getBalanceAmount(p), null)
  },
})

// ═══════════════════════════════════════════════════════════════════
// TEST 2: Webhook Payload Schema — All mandatory fields present
// ═══════════════════════════════════════════════════════════════════

interface WebhookPayload {
  event_type: string
  website_booking_id: string
  trace_id: string
  parent_event_id: string | null
  idempotency_key: string
  booking: Record<string, unknown>
  origin_system: string
  timestamp: string
}

function buildWebhookPayload(event_type: string, p: BookingPayload, entityId: string): WebhookPayload {
  return {
    event_type,
    website_booking_id: entityId,
    trace_id: uuid(),
    parent_event_id: null,
    idempotency_key: `website:${entityId}:${event_type}:${uuid()}`,
    booking: {
      website_booking_id: entityId,
      room_id: p.room_id,
      guest_name: p.guest_name,
      guest_email: p.guest_email,
      guest_phone: p.guest_phone,
      check_in: p.check_in,
      check_out: p.check_out,
      adults: p.adults,
      children: p.children,
      nightly_rate: p.nightly_rate,
      total_amount: p.total_price,
      advance_amount: getAdvanceAmount(p),
      balance_amount: getBalanceAmount(p),
      paid_amount: getPaidAmount(p),
      payment_status: p.payment_status,
      booking_status: p.booking_status,
      source: p.source,
      pos_booking_id: p.pos_booking_id,
    },
    origin_system: "website",
    timestamp: new Date().toISOString(),
  }
}

const MANDATORY_BOOKING_FIELDS = [
  "website_booking_id",
  "room_id",
  "guest_name",
  "guest_email",
  "guest_phone",
  "check_in",
  "check_out",
  "adults",
  "children",
  "nightly_rate",
  "total_amount",
  "payment_status",
  "booking_status",
  "source",
]

const PAYMENT_FIELDS = ["paid_amount", "advance_amount", "balance_amount"]

Deno.test({
  name: "SYNC-6: webhook payload contains all mandatory fields",
  fn: () => {
    const p = buildSyncPayload({ payment_status: "paid" })
    const wh = buildWebhookPayload("booking_confirmed", p, uuid())
    const booking = wh.booking

    for (const field of MANDATORY_BOOKING_FIELDS) {
      assert(booking[field] !== undefined, `Mandatory field "${field}" missing from webhook payload`)
    }
    for (const field of PAYMENT_FIELDS) {
      assert(booking[field] !== undefined, `Payment field "${field}" missing from webhook payload`)
    }
  },
})

Deno.test({
  name: "SYNC-7: booking_updated payload carries payment fields",
  fn: () => {
    const p = buildSyncPayload({
      payment_status: "paid",
      total_price: 15000,
      advance_amount: 15000,
      balance_amount: 0,
      paid_amount: 15000,
    })
    const wh = buildWebhookPayload("booking_updated", p, uuid())
    assertEquals(wh.booking.payment_status, "paid")
    assertEquals(wh.booking.total_amount, 15000)
    assertEquals(wh.booking.advance_amount, 15000)
    assertEquals(wh.booking.balance_amount, 0)
    assertEquals(wh.booking.paid_amount, 15000)
  },
})

// ═══════════════════════════════════════════════════════════════════
// TEST 3: Event Type Mapping — All booking_status values
// ═══════════════════════════════════════════════════════════════════

const STATUS_EVENT_MAP: Record<string, string> = {
  pending_payment: "booking_created",
  confirmed: "booking_confirmed",
  checked_in: "booking_checked_in",
  checked_out: "booking_checked_out",
  cancelled: "booking_cancelled",
  expired: "booking_expired",
  failed: "booking_failed",
}

function mapStatusToEvent(bookingStatus: string): string {
  return STATUS_EVENT_MAP[bookingStatus] || "booking_updated"
}

Deno.test({
  name: "SYNC-8: all booking_status values map to correct event types",
  fn: () => {
    for (const [status, expectedEvent] of Object.entries(STATUS_EVENT_MAP)) {
      assertEquals(mapStatusToEvent(status), expectedEvent, `Status "${status}" should map to "${expectedEvent}"`)
    }
  },
})

Deno.test({
  name: "SYNC-9: unknown status maps to booking_updated",
  fn: () => {
    assertEquals(mapStatusToEvent("unknown_status"), "booking_updated")
    assertEquals(mapStatusToEvent(""), "booking_updated")
  },
})

// ═══════════════════════════════════════════════════════════════════
// TEST 4: Booking Update Handler — Field merging
// ═══════════════════════════════════════════════════════════════════

function buildBookingUpdate(bookingData: Record<string, unknown>): Record<string, unknown> {
  const updateData: Record<string, unknown> = {}

  if (bookingData.guest_name) updateData.guest_name = bookingData.guest_name
  if (bookingData.guest_phone) updateData.guest_phone = bookingData.guest_phone
  if (bookingData.guest_email) updateData.guest_email = bookingData.guest_email
  if (bookingData.check_in) updateData.check_in = bookingData.check_in
  if (bookingData.check_out) updateData.check_out = bookingData.check_out
  if (bookingData.payment_status) updateData.payment_status = bookingData.payment_status
  if (bookingData.total_amount) updateData.total_price = bookingData.total_amount
  if (bookingData.advance_amount !== undefined && bookingData.advance_amount !== null) {
    updateData.advance_amount = bookingData.advance_amount
  }
  if (bookingData.balance_amount !== undefined && bookingData.balance_amount !== null) {
    updateData.balance_amount = bookingData.balance_amount
  }

  return updateData
}

Deno.test({
  name: "SYNC-10: booking update merges all fields including payment",
  fn: () => {
    const update = buildBookingUpdate({
      guest_name: "New Name",
      guest_phone: "+977-9999999999",
      guest_email: "new@example.com",
      check_in: "2026-08-01",
      check_out: "2026-08-05",
      payment_status: "paid",
      total_amount: 18000,
      advance_amount: 18000,
      balance_amount: 0,
    })

    assertEquals(update.guest_name, "New Name")
    assertEquals(update.guest_phone, "+977-9999999999")
    assertEquals(update.guest_email, "new@example.com")
    assertEquals(update.check_in, "2026-08-01")
    assertEquals(update.check_out, "2026-08-05")
    assertEquals(update.payment_status, "paid")
    assertEquals(update.total_price, 18000)
    assertEquals(update.advance_amount, 18000)
    assertEquals(update.balance_amount, 0)
  },
})

Deno.test({
  name: "SYNC-11: booking update with null advance/balance correctly omitted",
  fn: () => {
    const update = buildBookingUpdate({
      guest_name: "No Payment Change",
      payment_status: "pending",
    })

    assertEquals(update.guest_name, "No Payment Change")
    assertEquals(update.payment_status, "pending")
    assertEquals(update.advance_amount, undefined, "advance_amount should be omitted when null")
    assertEquals(update.balance_amount, undefined, "balance_amount should be omitted when null")
  },
})

// ═══════════════════════════════════════════════════════════════════
// TEST 5: Trigger Dedup — Only emit when fields actually change
// ═══════════════════════════════════════════════════════════════════

interface BookingRow {
  source: string
  booking_status: string
  payment_status: string
  guest_name: string
  guest_phone: string
  guest_email: string
  check_in: string
  check_out: string
  total_price: number
  advance_amount: number | null
  balance_amount: number | null
  adults: number
  children: number
}

function triggerShouldEmit(oldRow: BookingRow, newRow: BookingRow): boolean {
  if (oldRow.source !== newRow.source && newRow.source !== "pos") return true
  if (newRow.source === "pos") return false

  return (
    oldRow.booking_status !== newRow.booking_status ||
    oldRow.payment_status !== newRow.payment_status ||
    oldRow.guest_name !== newRow.guest_name ||
    oldRow.guest_phone !== newRow.guest_phone ||
    oldRow.guest_email !== newRow.guest_email ||
    oldRow.check_in !== newRow.check_in ||
    oldRow.check_out !== newRow.check_out ||
    oldRow.total_price !== newRow.total_price ||
    oldRow.advance_amount !== newRow.advance_amount ||
    oldRow.balance_amount !== newRow.balance_amount ||
    oldRow.adults !== newRow.adults ||
    oldRow.children !== newRow.children
  )
}

const BASE_ROW: BookingRow = {
  source: "website",
  booking_status: "pending_payment",
  payment_status: "pending",
  guest_name: "Original",
  guest_phone: "+977-1111111111",
  guest_email: "orig@example.com",
  check_in: "2026-07-01",
  check_out: "2026-07-03",
  total_price: 6000,
  advance_amount: null,
  balance_amount: null,
  adults: 1,
  children: 0,
}

Deno.test({
  name: "SYNC-12: no field change — trigger does NOT emit",
  fn: () => {
    assertEquals(triggerShouldEmit(BASE_ROW, { ...BASE_ROW }), false)
  },
})

Deno.test({
  name: "SYNC-13: booking_status change — trigger emits",
  fn: () => {
    assertEquals(triggerShouldEmit(BASE_ROW, { ...BASE_ROW, booking_status: "confirmed" }), true)
  },
})

Deno.test({
  name: "SYNC-14: guest_name change — trigger emits",
  fn: () => {
    assertEquals(triggerShouldEmit(BASE_ROW, { ...BASE_ROW, guest_name: "New Name" }), true)
  },
})

Deno.test({
  name: "SYNC-15: guest_email change — trigger emits",
  fn: () => {
    assertEquals(triggerShouldEmit(BASE_ROW, { ...BASE_ROW, guest_email: "new@example.com" }), true)
  },
})

Deno.test({
  name: "SYNC-16: guest_phone change — trigger emits",
  fn: () => {
    assertEquals(triggerShouldEmit(BASE_ROW, { ...BASE_ROW, guest_phone: "+977-9999999999" }), true)
  },
})

Deno.test({
  name: "SYNC-17: check_in change — trigger emits",
  fn: () => {
    assertEquals(triggerShouldEmit(BASE_ROW, { ...BASE_ROW, check_in: "2026-08-01" }), true)
  },
})

Deno.test({
  name: "SYNC-18: check_out change — trigger emits",
  fn: () => {
    assertEquals(triggerShouldEmit(BASE_ROW, { ...BASE_ROW, check_out: "2026-08-05" }), true)
  },
})

Deno.test({
  name: "SYNC-19: total_price change — trigger emits",
  fn: () => {
    assertEquals(triggerShouldEmit(BASE_ROW, { ...BASE_ROW, total_price: 9000 }), true)
  },
})

Deno.test({
  name: "SYNC-20: advance_amount change — trigger emits",
  fn: () => {
    assertEquals(triggerShouldEmit(BASE_ROW, { ...BASE_ROW, advance_amount: 3000 }), true)
  },
})

Deno.test({
  name: "SYNC-21: balance_amount change — trigger emits",
  fn: () => {
    assertEquals(triggerShouldEmit(BASE_ROW, { ...BASE_ROW, balance_amount: 3000 }), true)
  },
})

Deno.test({
  name: "SYNC-22: adults change — trigger emits",
  fn: () => {
    assertEquals(triggerShouldEmit(BASE_ROW, { ...BASE_ROW, adults: 3 }), true)
  },
})

Deno.test({
  name: "SYNC-23: source=pos — trigger does NOT emit (loop prevention)",
  fn: () => {
    assertEquals(triggerShouldEmit(BASE_ROW, { ...BASE_ROW, source: "pos", booking_status: "confirmed" }), false)
  },
})
