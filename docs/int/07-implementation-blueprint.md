# Implementation Blueprint (Phases 7–15)

Based on the Architecture Decision (Phase 6 — Option E: Hybrid), this document specifies the detailed design for implementing bidirectional sync between Website and POS.

---

## Phase 7: Sync Architecture Design

### 7.1 Component Diagram

```
┌──────────────────── WEBSITE (6aiag3ra) ────────────────────┐
│                                                             │
│  DB Tables: bookings, rooms, sync_events                   │
│                                                             │
│  Edge Functions:                                            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ booking-webhook (POST)                                  ││
│  │   → Receives POS pushes (existing)                      ││
│  │   → New: Receives POS acknowledgment/status             ││
│  ├─────────────────────────────────────────────────────────┤│
│  │ sync-webhook-sender (scheduled, every 15s)              ││
│  │   → Reads unprocessed sync_events                       ││
│  │   → New: POSTs to POS booking-webhook                   ││
│  ├─────────────────────────────────────────────────────────┤│
│  │ pos-sync-api (GET/POST/PUT)                             ││
│  │   → Existing: generic sync endpoint                     ││
│  │   → New: room sync from POS                             ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  DB Trigger: trg_booking_sync_event (existing)              │
│    → New: extend to create sync_events after payment        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              ↕ HTTP + HMAC SHA-256
┌────────────────────── POS (8cvkfu8m) ───────────────────────┐
│                                                             │
│  DB Tables: bookings, rooms, room_mappings,                 │
│             external_bookings, sync_logs, sync_queue         │
│                                                             │
│  Edge Functions:                                            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ website-sync (POST)                                     ││
│  │   → Existing: push_booking, push_status_update, etc.    ││
│  │   → New: receive_room_update, push_availability         ││
│  ├─────────────────────────────────────────────────────────┤│
│  │ booking-webhook (POST)                                  ││
│  │   → Existing: receive Website sync events               ││
│  │   → New: handle booking_created, payment_confirmed      ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Client Services:                                           │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ booking-sync.ts (existing)                              ││
│  │   → pushBookingToWebsite(), pushStatusUpdateToWebsite() ││
│  │   → New: checkAndPullWebsiteBookings()                  ││
│  ├─────────────────────────────────────────────────────────┤│
│  │ mutation-queue.ts (existing) — offline resilience       ││
│  │ circuit-breaker.ts (existing) — fault isolation         ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Sync Event Types

| Event Type | Direction | Payload | Priority |
|---|---|---|---|
| `booking_created` | Website → POS | Full booking + payment data | HIGH |
| `booking_paid` | Website → POS | booking_id, payment_status, paid_amount | HIGH |
| `booking_cancelled` | Website → POS | booking_id, reason | HIGH |
| `booking_updated` | Bidirectional | booking_id, changed fields | MEDIUM |
| `room_updated` | POS → Website | room_id, all room fields | MEDIUM |
| `room_status_changed` | POS → Website | room_id, new status | HIGH |
| `room_type_updated` | POS → Website | room_type_id, fields | LOW |
| `pricing_updated` | POS → Website | room_type_id, new base_price | MEDIUM |
| `availability_sync` | POS → Website | room_id, date range, status | HIGH |
| `ping` | Bidirectional | health check | LOW |

### 7.3 Sync Scheduling

| Sync Type | Trigger | Mechanism | Max Lag |
|---|---|---|---|
| POS booking push | On mutation success (client) | Immediate HTTP | ~2s |
| POS status update | On mutation success (client) | Immediate HTTP | ~2s |
| Website booking push | On payment confirmed | sync_event → scheduled function | ~15s |
| Room data sync | DB trigger → sync_queue | Scheduled (every 60s) | ~60s |
| Availability sync | On room status change | Immediate + scheduled | ~15s |
| Periodic reconciliation | Schedule | POS full-room scan → Website | ~5min |

---

## Phase 8: Data Mapping Specification

### 8.1 Booking: Website → POS

```
Website Booking ──────────────────► POS Booking
─────────────────────────────────────────────────────
guest_name       ───────────────►  guest_name
guest_email      ───────────────►  guest_email (NEW)
guest_phone      ───────────────►  guest_phone
check_in (date)  ──► timestamptz ──► check_in
check_out (date) ──► timestamptz ──► check_out
adults           ───────────────►  adults
children         ───────────────►  children
nightly_rate     ───────────────►  nightly_rate
total_price      ───────────────►  total_amount
advance_amount   ───────────────►  paid_amount (= total_price if paid)
booking_status   ──► map_status ──► status
room_id          ──► room_mappings ──► room_id
id (UUID)        ───────────────►  external_bookings.external_booking_id
source='website'  ──────────────►  external_bookings.source
```

### 8.2 Booking Status Mapping

```
Website              POS
──────────────────────────────────
pending_payment  ──► pending
confirmed        ──► confirmed
checked_in       ──► checked_in
checked_out      ──► checked_out
cancelled        ──► cancelled
—                ──► no_show (Website doesn't use)
```

### 8.3 Room Status Mapping

```
POS                             Website
───────────────────────────────────────────────
available                    ──► available
reserved                     ──► available
booked                       ──► booked (NEW value)
occupied                     ──► occupied
partial_paid                 ──► occupied
fully_paid                   ──► occupied
cleaning                     ──► maintenance (or NEW value 'cleaning')
maintenance                  ──► maintenance
```

### 8.4 Pricing Mapping

```
POS                                      Website
──────────────────────────────────────────────────────────
room_types.base_price                ──► rooms.price_per_night
pricing_rules (percentage)           ──► rooms.discount_percent
pricing_rules (fixed_amount)         ──► applied to price_per_night
pricing_rules (seasonal/override)    ──► rooms.seasonal_pricing (jsonb)
```

---

## Phase 9: API Contract Design

### 9.1 Website Endpoints (for POS to call)

#### `POST /api/booking-webhook` (EXISTING, EXTEND)

**Purpose:** Receive POS booking pushes and status updates.

**Headers:** `x-webhook-signature: HMAC-SHA256(body + timestamp + POS_WEBHOOK_SECRET)`, `x-timestamp`

**Request (push_booking):**
```json
{
  "action": "push_booking",
  "idempotency_key": "sha256(operation+pos_booking_id)",
  "booking": {
    "pos_booking_id": "uuid",
    "room_id": "pos-room-uuid",
    "guest_name": "...",
    "guest_phone": "...",
    "check_in": "2026-07-15T14:00:00+05:45",
    "check_out": "2026-07-17T12:00:00+05:45",
    "adults": 2,
    "children": 0,
    "nightly_rate": 4500,
    "total_amount": 9000,
    "paid_amount": 0,
    "status": "confirmed",
    "notes": "Walk-in booking"
  },
  "room_mapping": {
    "pos_room_id": "uuid",
    "website_room_id": "uuid"
  }
}
```

**Response:**
```json
{
  "success": true,
  "website_booking_id": "uuid",
  "website_booking_status": "confirmed",
  "mapped_room_id": "uuid"
}
```

#### New: `POST /api/pos-sync-api/rooms`

**Purpose:** Receive room data sync from POS.

**Request:**
```json
{
  "action": "sync_rooms",
  "rooms": [
    {
      "website_room_id": "uuid",
      "room_number": "101",
      "room_type": "Deluxe Room",
      "price_per_night": 5000,
      "discount_percent": 0,
      "availability_status": "available",
      "is_active": true,
      "amenities": ["WiFi", "AC", "TV"],
      "max_guests": 2,
      "image_url": "https://..."
    }
  ]
}
```

### 9.2 POS Endpoints (for Website to call)

#### New: `POST /api/booking-webhook` (Website → POS direction)

**Purpose:** Receive Website booking sync events.

**Headers:** `x-webhook-signature: HMAC-SHA256(body + timestamp + WEBSITE_SYNC_SECRET)`, `x-timestamp`

**Request (booking_created):**
```json
{
  "event_type": "booking_created",
  "idempotency_key": "sha256(website_booking_id)",
  "booking": {
    "website_booking_id": "uuid",
    "room_id": "room-uuid-in-website-db",
    "guest_name": "...",
    "guest_email": "...",
    "guest_phone": "...",
    "check_in": "2026-07-15",
    "check_out": "2026-07-17",
    "adults": 2,
    "children": 0,
    "nightly_rate": 4500,
    "total_price": 9000,
    "advance_amount": 9000,
    "balance_amount": 0,
    "payment_status": "paid",
    "booking_status": "confirmed",
    "source": "website"
  }
}
```

**Response:**
```json
{
  "success": true,
  "pos_booking_id": "uuid",
  "pos_booking_number": "BKG-00042",
  "status": "confirmed"
}
```

### 9.3 Idempotency Keys

Both endpoints MUST generate and check idempotency keys:
- Website: `sha256("push_booking:" + pos_booking_id)`
- POS: `sha256("booking_created:" + website_booking_id)`

---

## Phase 10: Security & Idempotency Design

### 10.1 HMAC Signing (Both Directions)

```
signature = HMAC-SHA256(
  secret_key,
  body + "." + timestamp
)
Header: x-webhook-signature: {signature}
Header: x-timestamp: {unix_ms}
```

- Website secret: `POS_WEBHOOK_SECRET` (existing env var)
- POS secret: `WEBSITE_SYNC_SECRET` (existing env var `WEBSITE_WEBHOOK_SECRET`)
- Timestamp tolerance: ±5 minutes to prevent replay
- On signature mismatch: log security event, return 401, no retry

### 10.2 Idempotency (Website Side — NEW)

Add `idempotency_keys` table to Website DB:
```sql
CREATE TABLE idempotency_keys (
  key_hash TEXT PRIMARY KEY,
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Flow:
1. Edge function receives request with `idempotency_key`
2. Compute: `key_hash = sha256(idempotency_key)`
3. Query: `SELECT * FROM idempotency_keys WHERE key_hash = $1`
4. If found: return `result` (idempotent)
5. If not found: INSERT with null result, process, UPDATE result atomically
6. If INSERT fails (unique violation): another request won → SELECT and return existing

### 10.3 Rate Limiting

| Endpoint | Limit | Window | Action |
|---|---|---|---|
| Website booking-webhook | 60 req/min | per IP | 429 after threshold |
| POS booking-webhook | 60 req/min | per source IP | 429 after threshold |
| POS website-sync | 30 req/min (existing) | per IP | 429 after threshold |

---

## Phase 11: Error Handling & Recovery

### 11.1 Error Taxonomy

| Error | HTTP | Action | Retry? |
|---|---|---|---|
| HMAC invalid | 401 | Log security event, discard | No |
| Idempotency collision | 409 | Return existing result | No |
| Booking conflict | 409 | Return conflict details | Manual |
| DB error (transient) | 503 | Retry with backoff | Yes (3x) |
| DB error (permanent) | 500 | Dead-letter | No |
| Rate limited | 429 | Backoff + retry | Yes (after delay) |
| Room mapping missing | 422 | Return unmapped error | Manual |
| Invalid payload | 422 | Log, discard | No |

### 11.2 Website Sync Retry (NEW — on sync_events table)

```
sync_event INSERT → status='pending'
sync-webhook-sender reads pending events (every 15s):
  → POST to POS booking-webhook
  → Success: status='processed', processed_at=NOW()
  → 4xx error (non-retryable): status='failed', error logged
  → 5xx/network error: retry_count++, next_retry_at = NOW() + backoff(1s,5s,15s,30s,60s)
  → retry_count >= max_retries (5): status='dead_letter'
```

### 11.3 POS Error Handling (EXISTING, EXTEND)

- Mutation queue retries with backoff (1s, 2s, 4s, 8s, 30s — max 5 attempts)
- Circuit breaker opens after 10 failures in 30s (blocks all sync for 30s)
- Dead-letter after 300s in stuck state
- SyncAdminPanel UI for manual retry
- **New:** Add Website → POS sync to mutation queue for offline resilience

---

## Phase 12: UI/UX Integration

### 12.1 POS Modifications

**BookingForm.tsx** — EXTEND:
- Already calls `pushBookingToWebsite()` on success
- Add feedback: show Website booking ID after sync
- Add retry button if sync fails

**MotelPage.tsx** — EXTEND:
- Add "Website Bookings" section showing pending Website-sourced bookings
- Show booking source badge: "Website" vs "Walk-in" vs "Phone"
- Color-code: Website bookings in blue, POS bookings in green
- Check-in flow: Website-paid bookings skip payment step

**SyncAdminPanel.tsx** — EXTEND:
- Add Website → POS sync log view
- Add manual trigger for Website booking pull
- Add reconciliation button (compare booking counts)

### 12.2 Website Modifications

**Admin Bookings Page** — ADD:
- Show POS booking number when available
- Show "Synced to POS" badge
- Option to manually trigger POS sync

**Admin Dashboard** — ADD:
- Sync health indicator (last successful sync, pending syncs, failures)
- Quick action: "Sync Now"

---

## Phase 13: Migration & Rollout Plan

### 13.1 Prerequisites (Day 0)

- [ ] Full backup of both databases (InsForge CLI: `insforge db backup`)
- [ ] Document current state: booking counts, room counts, room mappings
- [ ] Deploy new DB migration for POS (add `guest_email` column)
- [ ] Deploy new DB migration for Website (add `max_guests` column, `idempotency_keys` table)
- [ ] Verify existing POS → Website sync still works after migrations

### 13.2 Phase 1: Foundation (No Behavior Change) — Day 1

- [ ] Add `guest_email` to POS `bookings` table
- [ ] Add `max_guests` to Website `rooms` table
- [ ] Create `idempotency_keys` table on Website
- [ ] Add idempotency check to Website `booking-webhook` edge function
- [ ] Deploy, verify no regression

### 13.3 Phase 2: Website → POS Booking Sync (CRITICAL) — Day 2

- [ ] Extend POS `booking-webhook` edge function:
  - Handle `booking_created` event type
  - Map Website room ID → POS room ID via `room_mappings`
  - Handle pre-paid bookings (set `paid_amount = total_amount`)
  - Store `guest_email`
  - Create `external_bookings` link
  - Idempotency check
- [ ] Extend Website `create-booking` edge function:
  - After payment confirmation: INSERT into `sync_events`
  - Event type: `booking_created`, payload: full booking + payment data
- [ ] Extend Website `sync-webhook-sender`:
  - Handle `booking_created` events → POST to POS `booking-webhook`
- [ ] Deploy, test with test booking

### 13.4 Phase 3: Room Status Sync — Day 3

- [ ] Add room status sync from POS → Website:
  - On room status change (check-in, check-out, cleaning, maintenance)
  - Call Website `pos-sync-api` with room status update
  - Map POS status → Website status
- [ ] Add periodic room sync (every 60s):
  - POS edge function reads all active rooms
  - POSTs to Website `pos-sync-api/rooms`
  - Website updates room data (price, status, amenities)

### 13.5 Phase 4: Monitoring & Reconciliation — Day 4

- [ ] Deploy sync health dashboard
- [ ] Add reconciliation job (every 5 minutes):
  - Compare booking counts between systems
  - Alert on discrepancies
- [ ] Add manual retry UI for dead-letter items
- [ ] Run full reconciliation report

### 13.6 Rollback Plan

| Condition | Action |
|---|---|
| Phase 1 regression | Rollback DB migrations, redeploy edge functions |
| Phase 2 breaks POS booking | Disable `sync-webhook-sender`, revert edge function changes |
| Phase 3 breaks room display | Revert room sync code, Website rooms return to manual |
| Any phase causes data loss | Restore from Day 0 backup |

---

## Phase 14: Testing Strategy

### 14.1 Unit Tests

| Test | Scope | Tool |
|---|---|---|
| HMAC signing/verification | Edge function utils | Vitest |
| Status mapping functions | Both systems | Vitest |
| Booking data transformation | Both systems | Vitest |
| Idempotency key generation | Both systems | Vitest |
| Room mapping lookup | POS edge functions | Vitest |

### 14.2 Integration Tests

| Test | Setup | Assertions |
|---|---|---|
| POS → Website booking push | Create POS booking, verify Website booking created | Booking exists in Website DB with correct fields |
| Website → POS booking sync | Create Website booking + payment, trigger sync_event | Booking exists in POS DB with paid_amount = total |
| Duplicate event handling | Send same webhook twice | Second call returns existing result (idempotent) |
| HMAC invalid | Send request with wrong signature | 401 response, no DB change |
| Room mapping lookup | Create room mapping, sync booking | Booking created with correct room_id |
| Status update sync | Check-in POS booking | Website booking status = checked_in |

### 14.3 E2E Tests

| Test | Flow |
|---|---|
| Customer booking arrives in POS | Book on Website → pay → verify POS shows booking |
| POS check-in reflects on Website | Check-in in POS → verify Website booking status |
| Double-booking prevention | Book room on Website → POS rejects overlapping booking |
| Offline sync recovery | Disconnect POS → make changes → reconnect → verify sync |
| Sync health dashboard | Verify dashboard shows correct counts |

### 14.4 Testing Data

Create test accounts in both systems:
- Website test customer: `test-customer@highlandscafe.com`
- POS test admin: already exists in `user_profiles`

Test rooms: Ensure at least 2 rooms with `room_mappings` configured.

---

## Phase 15: Final Report

### 15.1 Architecture Summary

**Selected: Option E — Hybrid with POS as Source of Truth**

Two Postgres databases connected via HMAC-signed REST webhooks. POS owns hotel operations data (rooms, room types, pricing, walk-in bookings). Website owns customer-facing content and customer bookings. Sync bridge connects them bidirectionally.

### 15.2 Critical Gaps Addressed

| Gap | Solution | Phase |
|---|---|---|
| G-1: Website → POS booking sync | Extend `create-booking` → `sync_events` → `sync-webhook-sender` → POS `booking-webhook` | P2 |
| G-2: Guest email in POS | Add column, update edge functions | P1 |
| G-3: Payment model mismatch | Set `paid_amount = total_amount` for pre-paid syncs | P2 |
| G-5: Status enum mismatch | Canonical mapping in edge functions | P2 |
| G-9: Idempotency on Website | Add `idempotency_keys` table + check | P1 |

### 15.3 Key Files Modified

| File | Change |
|---|---|
| POS DB migration | ADD `guest_email TEXT` to `bookings` |
| Website DB migration | ADD `idempotency_keys` table, ADD `max_guests INTEGER` to `rooms` |
| Website `create-booking/index.js` | ADD `sync_events` INSERT after payment confirmed |
| Website `sync-webhook-sender/index.ts` | ADD POS `booking-webhook` POST for `booking_created` events |
| Website `booking-webhook/index.js` | ADD idempotency check |
| POS `booking-webhook/index.js` | ADD `booking_created` handler, guest_email support, pre-paid logic |
| POS `booking-sync.ts` | MAYBE: add Website booking pull if needed |

### 15.4 Edge Functions Deployed

**Website (existing + modifications):**
- `create-booking` — modified to emit sync events
- `booking-webhook` — modified with idempotency
- `sync-webhook-sender` — extended with POS delivery
- `pos-sync-api` — extended (or use existing)

**POS (existing + modifications):**
- `website-sync` — existing (no changes needed for core sync)
- `booking-webhook` — modified to handle Website → POS direction

### 15.5 Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Booking data loss during sync | Low | High | Idempotency + retry + reconciliation |
| POS edge function cold start delay | Medium | Low | Keep-alive or concurrent warm starts |
| HMAC secret leak | Low | Critical | Rotate secrets, audit log access |
| Race condition on booking sync | Low | Medium | Idempotency + POS-side conflict check |
| Schema drift (fields added to one side) | Medium | Low | Versioned payloads, field whitelist |
| Network partition (Internet down) | Medium | High | POS mutation queue + Website sync_events hold |

### 15.6 Effort Estimate

| Phase | Effort | Dependencies |
|---|---|---|
| P1: Foundation | 2-3 hours | DB migrations deployable separately |
| P2: Booking Sync | 4-6 hours | P1 complete, existing POS booking-webhook tested |
| P3: Room Sync | 3-4 hours | P2 complete, room_mappings exist |
| P4: Monitoring | 2-3 hours | P2/P3 deployed and stable |
| Testing | 3-4 hours | P1-P3 code ready |
| **Total** | **14-20 hours** | Sequential phases |

### 15.7 Go/No-Go Criteria

**Go if:**
- [ ] Both databases backed up and restorable
- [ ] Existing POS → Website sync verified working
- [ ] All edge functions deploy without error
- [ ] Room mappings exist for at least 2 rooms
- [ ] Test credentials for both systems ready

**No-Go if:**
- [ ] Existing sync is failing (fix first)
- [ ] Room mappings are missing (create at least 1)
- [ ] Any DB migration causes existing app errors
- [ ] HMAC secrets are expired or misconfigured

---

## Appendix: Quick Reference

### Commands

```bash
# Deploy Website edge functions
cd ~/Desktop/Arjun
insforge functions deploy create-booking
insforge functions deploy booking-webhook
insforge functions deploy sync-webhook-sender
insforge functions deploy pos-sync-api

# Deploy POS edge functions
cd ~/Desktop/Highlands\ Cafe\ &\ Motel\ Inn
insforge functions deploy website-sync
insforge functions deploy booking-webhook

# Website DB migrations
insforge db push

# POS DB migrations
insforge db push

# Backups
insforge db dump -f website-backup.sql
insforge db dump --project 8cvkfu8m -f pos-backup.sql

# Test sync
curl -X POST https://6aiag3ra.us-east.insforge.app/api/booking-webhook \
  -H "x-webhook-signature: ..." \
  -d '{...}'
```

### Environment Variables

| Variable | System | Purpose |
|---|---|---|
| `POS_WEBHOOK_SECRET` | Website | Verify POS → Website webhooks |
| `WEBSITE_WEBHOOK_SECRET` | POS | Verify Website → POS webhooks |
| `FONEPAY_MERCHANT_CODE` | Both | Fonepay merchant IDs |
| `FONEPAY_SECRET_KEY` | Both | Fonepay HMAC keys |
| `SUPABASE_SERVICE_ROLE_KEY` | Website | Bypass RLS (edge functions) |
| `ANON_KEY` | Both | Client-side auth |
