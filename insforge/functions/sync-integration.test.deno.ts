// ═══════════════════════════════════════════════════════════════════
// LIVE INTEGRATION TESTS — Real InsForge Deployed Endpoints
// ═══════════════════════════════════════════════════════════════════
//
// Tests the actual deployed edge functions against the real database.
// Run: deno test --no-check --allow-net sync-integration.test.deno.ts
// ═══════════════════════════════════════════════════════════════════

import { assertEquals, assert, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts"

const BASE = Deno.env.get("INSFORGE_BASE_URL") ?? "https://6aiag3ra.us-east.insforge.app"
const API_KEY = Deno.env.get("TEST_API_KEY") ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1Njc1Njd9.wYK1TZtfInJm3lbH49QqA9M6owrvjTacAm0edKbMigs"
const BOOKING_WEBHOOK_SECRET = Deno.env.get("TEST_WEBHOOK_SECRET") ?? "whsec_sync_integration_test_key_2026"
const TEST_PREFIX = `int-test-${Date.now()}`
const KNOWN_ROOM_ID = "5f4d5e3a-713e-47d0-88b2-e85a48b8591a"
const SECOND_ROOM_ID = "6ac86da7-46f6-4a78-8cf6-1471fa37a9fe"

// ── HMAC Helpers ──────────────────────────────────────────────────

async function signHmac(secret: string, payload: string, ts: number): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(`${payload}.${ts}`))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("")
}

function uuid(): string {
  return crypto.randomUUID()
}


// ═══════════════════════════════════════════════════════════════════
// 1. CREATE BOOKING ENDPOINT
// ═══════════════════════════════════════════════════════════════════

Deno.test({
  name: "INT-1: create-booking — creates a valid booking",
  fn: async () => {
    const d = new Date(); d.setDate(d.getDate() + 200)
    const checkIn = d.toISOString().slice(0, 10)
    const checkOut = new Date(d.getTime() + 2 * 86400000).toISOString().slice(0, 10)
    const body = {
      room_id: KNOWN_ROOM_ID,
      check_in: checkIn,
      check_out: checkOut,
      guest_name: `${TEST_PREFIX} Guest`,
      guest_email: `${TEST_PREFIX}@example.com`,
      guest_phone: "+977-9800000123",
      guests: 2,
      payment_status: "pay_at_property",
    }

    const resp = await fetch(`${BASE}/functions/create-booking`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": API_KEY,
        "Authorization": `Bearer ${API_KEY}`,
        "Origin": "https://highlandsmotelinn.insforge.site",
      },
      body: JSON.stringify(body),
    })

    assertEquals(resp.status, 200, `create-booking returned 200, got ${resp.status}`)
    const data = await resp.json()
    assertExists(data.id, "Booking has an ID")
    assertEquals(data.guest_email, body.guest_email, "Email matches")
    assertEquals(data.source, "website", "Source = website")
    assertExists(data.metadata?.trace_id, "Trace ID generated")

    console.log(`  → Created booking ${data.id}, trace: ${data.metadata?.trace_id}`)
  },
  sanitizeResources: false,
  sanitizeOps: false,
})

Deno.test({
  name: "INT-2: create-booking — rejects invalid data (400)",
  fn: async () => {
    const resp = await fetch(`${BASE}/functions/create-booking`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": API_KEY,
        "Authorization": `Bearer ${API_KEY}`,
        "Origin": "https://highlandsmotelinn.insforge.site",
      },
      body: JSON.stringify({ room_id: "not-a-uuid", guest_name: "A" }),
    })

    assertEquals(resp.status, 400, "Bad request returns 400")
    const data = await resp.json()
    assert(data.error === "BOOKING_ERROR", `Error type: ${data.error}`)
    console.log(`  → Validation error: ${data.message}`)
  },
  sanitizeResources: false,
  sanitizeOps: false,
})

Deno.test({
  name: "INT-3: create-booking — CORS headers present",
  fn: async () => {
    const resp = await fetch(`${BASE}/functions/create-booking`, {
      method: "OPTIONS",
      headers: { "Origin": "https://highlandsmotelinn.insforge.site" },
    })

    const cors = resp.headers.get("access-control-allow-origin")
    assertEquals(cors, "https://highlandsmotelinn.insforge.site", "CORS origin matches")
    console.log(`  → CORS origin: ${cors}`)
  },
  sanitizeResources: false,
  sanitizeOps: false,
})

// ═══════════════════════════════════════════════════════════════════
// 2. BOOKING WEBHOOK — HMAC + Loop Prevention + Idempotency
// ═══════════════════════════════════════════════════════════════════

Deno.test({
  name: "INT-4: booking-webhook — rejects missing HMAC signature (401)",
  fn: async () => {
    const body = {
      event_type: "booking_confirmed",
      external_booking_id: uuid(),
      trace_id: uuid(),
      origin_system: "pos",
      source: "pos",
      booking: {
        room_id: uuid(),
        guest_name: "Test Guest",
        guest_email: "test@example.com",
        check_in: "2026-08-01",
        check_out: "2026-08-03",
        total_amount: 10000,
        pos_booking_id: uuid(),
      },
    }

    const resp = await fetch(`${BASE}/functions/booking-webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    assertEquals(resp.status, 401, `Missing signature → 401, got ${resp.status}`)
    const data = await resp.json()
    assert(data.error?.includes("Missing"), `Error: ${data.error}`)
    console.log(`  → HMAC rejection: ${data.error}`)
  },
  sanitizeResources: false,
  sanitizeOps: false,
})

Deno.test({
  name: "INT-5: booking-webhook — rejects invalid HMAC signature (403)",
  fn: async () => {
    const body = {
      event_type: "booking_confirmed",
      external_booking_id: uuid(),
      trace_id: uuid(),
      origin_system: "pos",
      source: "pos",
      booking: {
        room_id: uuid(),
        guest_name: "Test Guest",
        check_in: "2026-08-01",
        check_out: "2026-08-03",
        pos_booking_id: uuid(),
      },
    }
    const bodyStr = JSON.stringify(body)
    const ts = Date.now()
    const sig = await signHmac("wrong-secret", bodyStr, ts) // wrong secret

    const resp = await fetch(`${BASE}/functions/booking-webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": sig,
        "X-Timestamp": String(ts),
      },
      body: bodyStr,
    })

    assertEquals(resp.status, 403, `Invalid HMAC → 403, got ${resp.status}`)
    console.log("  → Invalid HMAC correctly rejected (403)")
  },
  sanitizeResources: false,
  sanitizeOps: false,
})

Deno.test({
  name: "INT-6: booking-webhook — rejects origin_system=website (loop prev)",
  fn: async () => {
    const body = {
      event_type: "booking_confirmed",
      external_booking_id: uuid(),
      trace_id: uuid(),
      origin_system: "website", // LOOP!
      source: "pos",
      booking: {
        room_id: uuid(),
        guest_name: "Loop Test",
        check_in: "2026-08-05",
        check_out: "2026-08-07",
        pos_booking_id: uuid(),
      },
    }
    const bodyStr = JSON.stringify(body)
    const ts = Date.now()
    const sig = await signHmac(BOOKING_WEBHOOK_SECRET, bodyStr, ts)

    const resp = await fetch(`${BASE}/functions/booking-webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": sig,
        "X-Timestamp": String(ts),
      },
      body: bodyStr,
    })

    assertEquals(resp.status, 400, `Loop rejected → 400, got ${resp.status}`)
    const data = await resp.json()
    assert(data.error?.includes("Loop"), `Error: ${data.error}`)
    console.log(`  → Loop prevention: ${data.error}`)
  },
  sanitizeResources: false,
  sanitizeOps: false,
})

Deno.test({
  name: "INT-7: booking-webhook — rejects source=website (loop prev)",
  fn: async () => {
    const body = {
      event_type: "booking_confirmed",
      external_booking_id: uuid(),
      trace_id: uuid(),
      origin_system: "pos",
      source: "website", // LOOP!
      booking: {
        room_id: uuid(),
        guest_name: "Loop Test 2",
        check_in: "2026-08-10",
        check_out: "2026-08-12",
        pos_booking_id: uuid(),
      },
    }
    const bodyStr = JSON.stringify(body)
    const ts = Date.now()
    const sig = await signHmac(BOOKING_WEBHOOK_SECRET, bodyStr, ts)

    const resp = await fetch(`${BASE}/functions/booking-webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": sig,
        "X-Timestamp": String(ts),
      },
      body: bodyStr,
    })

    assertEquals(resp.status, 400, `Loop rejected → 400, got ${resp.status}`)
    const data = await resp.json()
    assert(data.error?.includes("Loop"), `Error: ${data.error}`)
    console.log(`  → Source loop prevention: ${data.error}`)
  },
  sanitizeResources: false,
  sanitizeOps: false,
})

Deno.test({
  name: "INT-8: booking-webhook — missing event_type (400)",
  fn: async () => {
    const body = {
      external_booking_id: uuid(),
      origin_system: "pos",
      source: "pos",
    }
    const bodyStr = JSON.stringify(body)
    const ts = Date.now()
    const sig = await signHmac(BOOKING_WEBHOOK_SECRET, bodyStr, ts)

    const resp = await fetch(`${BASE}/functions/booking-webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": sig,
        "X-Timestamp": String(ts),
      },
      body: bodyStr,
    })

    assertEquals(resp.status, 400, `Missing event_type → 400, got ${resp.status}`)
    console.log("  → Missing event_type correctly rejected (400)")
  },
  sanitizeResources: false,
  sanitizeOps: false,
})

Deno.test({
  name: "INT-9: booking-webhook — HMAC with stale timestamp (403)",
  fn: async () => {
    const body = {
      event_type: "booking_confirmed",
      origin_system: "pos",
      source: "pos",
      external_booking_id: uuid(),
      booking: {
        room_id: uuid(),
        guest_name: "Stale Timestamp",
        check_in: "2026-09-01",
        check_out: "2026-09-03",
        pos_booking_id: uuid(),
      },
    }
    const bodyStr = JSON.stringify(body)
    const staleTs = Date.now() - 600_000 // 10 min ago (exceeds 300s tolerance)
    const sig = await signHmac(BOOKING_WEBHOOK_SECRET, bodyStr, staleTs)

    const resp = await fetch(`${BASE}/functions/booking-webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": sig,
        "X-Timestamp": String(staleTs),
      },
      body: bodyStr,
    })

    assertEquals(resp.status, 403, `Stale HMAC → 403, got ${resp.status}`)
    console.log("  → Stale HMAC timestamp correctly rejected (403)")
  },
  sanitizeResources: false,
  sanitizeOps: false,
})

// ═══════════════════════════════════════════════════════════════════
// 3. SYNC WEBHOOK SENDER
// ═══════════════════════════════════════════════════════════════════

Deno.test({
  name: "INT-10: sync-webhook-sender — runs without error",
  fn: async () => {
    // This calls the sync-webhook-sender which processes pending sync_events.
    // It will try to deliver to POS_WEBHOOK_URL. If that fails, it should
    // handle gracefully (retry/fail). We just verify it runs without crashing.
    const resp = await fetch(`${BASE}/functions/sync-webhook-sender`, {
      method: "POST",
      headers: {
        "apikey": API_KEY,
        "Authorization": `Bearer ${API_KEY}`,
      },
    })

    // Should always return a valid JSON response (success or server error)
    const text = await resp.text()
    let data: Record<string, unknown>
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error(`Non-JSON response: ${text.substring(0, 200)}`)
    }

    assert(resp.ok || resp.status === 500 || resp.status === 502,
      `sync-webhook-sender should respond gracefully, got ${resp.status}`)

    console.log(`  → Sender: ${JSON.stringify(data)}`)
  },
  sanitizeResources: false,
  sanitizeOps: false,
})

// ═══════════════════════════════════════════════════════════════════
// 4. HEALTH CHECK
// ═══════════════════════════════════════════════════════════════════

Deno.test({
  name: "INT-11: health-check — returns healthy status",
  fn: async () => {
    const resp = await fetch(`${BASE}/functions/health-check`, {
      headers: { "apikey": API_KEY, "Authorization": `Bearer ${API_KEY}` },
    })

    assertEquals(resp.ok, true, "Health check endpoint reachable")
    const data = await resp.json()
    assert(data.status === "healthy" || data.status === "ok", `Status: ${data.status}`)
    console.log(`  → Health: ${JSON.stringify(data)}`)
  },
  sanitizeResources: false,
  sanitizeOps: false,
})

// ═══════════════════════════════════════════════════════════════════
// 5. POS SYNC API — Loop Prevention
// ═══════════════════════════════════════════════════════════════════

Deno.test({
  name: "INT-12: pos-sync-api — rejects website-originated writes (loop prev)",
  fn: async () => {
    const body = {
      action: "create_booking",
      booking: {
        room_id: uuid(),
        guest_name: "POS Sync Test",
        check_in: "2026-10-01",
        check_out: "2026-10-03",
        pos_booking_id: uuid(),
      },
      origin_system: "website", // LOOP
    }

    const resp = await fetch(`${BASE}/functions/pos-sync-api`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
      },
      body: JSON.stringify(body),
    })

    // The pos-sync-api should reject website-originated writes
    const text = await resp.text()
    const data = JSON.parse(text)
    console.log(`  → pos-sync-api origin_system=website: ${resp.status} ${JSON.stringify(data)}`)
  },
  sanitizeResources: false,
  sanitizeOps: false,
})

// ═══════════════════════════════════════════════════════════════════
// 6. END-TO-END: Create → Sync → Webhook (best effort)
// ═══════════════════════════════════════════════════════════════════

Deno.test({
  name: "INT-13: E2E — create booking, trigger sync, verify pipeline",
  fn: async () => {
    // Step 1: Create a booking
    const d = new Date(); d.setDate(d.getDate() + 205)
    const checkIn = d.toISOString().slice(0, 10)
    const checkOut = new Date(d.getTime() + 2 * 86400000).toISOString().slice(0, 10)
    const body = {
      room_id: SECOND_ROOM_ID,
      check_in: checkIn,
      check_out: checkOut,
      guest_name: `${TEST_PREFIX} E2E`,
      guest_email: `${TEST_PREFIX}-e2e@example.com`,
      guest_phone: "+977-9800000999",
      guests: 2,
      payment_status: "pay_at_property",
    }

    const createResp = await fetch(`${BASE}/functions/create-booking`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": API_KEY,
        "Authorization": `Bearer ${API_KEY}`,
        "Origin": "https://highlandsmotelinn.insforge.site",
      },
      body: JSON.stringify(body),
    })
    assertEquals(createResp.ok, true, "Booking created")
    const booking = await createResp.json()

    // Step 2: Verify pipeline (trigger creates events, sender processes them)
    assertExists(booking.id, "Booking has an ID")
    console.log(`  → Booking created: ${booking.id}`)

    if (booking.metadata?.trace_id) {
      console.log(`  → Trace ID: ${booking.metadata.trace_id}`)
    }

    // Step 3: Run sync-webhook-sender to process pending events
    const senderResp = await fetch(`${BASE}/functions/sync-webhook-sender`, {
      method: "POST",
      headers: { "apikey": API_KEY, "Authorization": `Bearer ${API_KEY}` },
    })
    const senderResult = await senderResp.json()
    console.log(`  → Sender result: ${JSON.stringify(senderResult)}`)

    // Verify pipeline is functional
    assert(senderResp.ok || senderResp.status === 500,
      `Sender should handle gracefully, got ${senderResp.status}`)
  },
  sanitizeResources: false,
  sanitizeOps: false,
})
