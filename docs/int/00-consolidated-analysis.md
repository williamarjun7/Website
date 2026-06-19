# HighLands Cafe — Website ↔ POS Integration Analysis

**Complete 15-phase analysis for bidirectional sync between Website (`6aiag3ra`) and POS (`8cvkfu8m`).**

---

## 1. System Discovery

### Technology Stack

| Component | Website | POS |
|---|---|---|
| Frontend | React 19 + Vite 7 | React 19 + Vite 8 + shadcn/ui |
| Backend | InsForge (Supabase-compatible) | InsForge |
| Database | PostgreSQL 15 (`6aiag3ra`) | PostgreSQL 15 (`8cvkfu8m`) |
| Auth | InsForge Auth (JWT) | InsForge Auth (JWT) + RBAC |
| Payments | Fonepay (QR + Web) | Fonepay (QR + Tax Refund) |
| Real-time | InsForge Realtime | InsForge Realtime |
| Offline | None | IndexedDB + Mutation Queue + Circuit Breaker |
| State Mgt | Direct SDK calls | TanStack React Query |

### Edge Functions

**Website (10):** `create-booking`, `fonepay-payment`, `admin-recover-payment`, `payment-reconciliation` (scheduled), `sync-webhook-sender` (scheduled), `pos-sync-api`, `health-check`, `cleanup-nonces` (scheduled), `tiktok-feed`, `validate-upload`.

**POS (6):** `website-sync` (pushes booking/status to Website), `booking-webhook` (receives webhooks), `fonepay` (QR + status + tax refund), `fonepay-webhook`, `admin-update-user`, `verify-admin-code`.

### Existing Sync Infrastructure

**POS → Website (WORKING):** POS `BookingForm.tsx` → `pushBookingToWebsite()` → `website-sync` edge function → Website `booking-webhook` → creates/updates Website booking. Same flow for check-in/out/cancel status updates. Uses `room_mappings` table for room ID cross-reference, `sync_logs` for audit, `sync_queue` for retry.

**Website → POS (INCOMPLETE):** Website has `sync_events` table (trigger-populated on booking changes) and `sync-webhook-sender` edge function, but `create-booking` never creates sync events for POS delivery. The chain is not connected.

---

## 2. Database Reverse Engineering

### Website DB — 14 Tables

| Table | Key Columns |
|---|---|
| `rooms` | 22 cols — flat model: room_number, room_type (text), price_per_night, availability_status, amenities (text[]), seasonal_pricing (jsonb), discount_percent, has_ac, floor_number |
| `room_images` | url, alt_text, sort_order, room_id (FK) |
| `bookings` | 21 cols — guest_name/email/phone, check_in/out (date), booking_status, payment_status, total_price, advance_amount, balance_amount, source ('website'/'pos'), pos_booking_id, hold_expires_at, active_prn |
| `payments` | prn (unique), amount, payment_method, status, fonepay_trace_id, tax_refund tracking |
| `sync_events` | event_type, entity_id, payload (jsonb), processed, retry_count, max_retries |
| `menu_items`, `menu_categories`, `site_content` (29 key-value pairs), `site_images`, `admins`, `audit_logs`, `used_nonces`, `booking_conflicts` (VIEW) |

**Functions (6):** `is_admin()`, `confirm_booking_payment()`, `insert_used_nonce()`, `log_admin_action()`, `trigger_audit_log()`, `emit_booking_sync_event()`.

**Triggers:** `trg_booking_sync_event` on bookings (INSERT/UPDATE → `emit_booking_sync_event()`), audit triggers on 7 tables.

**RLS Pattern:** anon can SELECT public content, anon can SELECT own bookings by guest_email, authenticated + `is_admin()` for write operations.

### POS DB — 39 Tables

| Table | Key Columns |
|---|---|
| `rooms` | 11 cols — room_number, room_type_id (FK), floor, status (enum), is_active |
| `room_types` | name, code (enum: standard/deluxe/suite/family/single/double/dormitory), base_price, max_guests, amenities (jsonb) |
| `bookings` | 18 cols — booking_number (unique), guest_name/phone, check_in/out (timestamptz), status (enum), nightly_rate, total_amount, paid_amount, idempotency_key (unique) |
| `room_state_transitions` | room_id, from/to_status, reason, changed_by |
| `room_services` | booking_id, menu_item_id, quantity, unit_price, service_type |
| `invoices`/`invoice_items` | invoice_number, subtotal, discount, total, locked_for_payment |
| `payment_logs`/`payment_intents` | Two-phase payment (intent → confirm) with idempotency |
| `orders`/`order_items` | order_number, status (enum), subtotal, modifiers (jsonb), recipe integration |
| `products`/`stock_movements` | sku, current_stock, reorder_level, running_balance via triggers |
| `menu_items`/`menu_categories`/`menu_item_modifiers` | category_id FK, options (jsonb), max_selections |
| `recipes`/`recipe_versions`/`recipe_items` | Multi-version recipe management linked to products |
| `restaurant_tables`/`table_sessions` | table_number, capacity, section, status |
| `bill_splits`/`split_items`/`split_payments` | split_type (equal/by_item/custom_amount), per-item assignment |
| `room_mappings` | pos_room_id ↔ website_room_id (sync bridge) |
| `sync_logs`/`sync_queue` | Direction, request/response bodies, retry_count, next_retry_at |
| `external_bookings` | pos_booking_id, source, external_booking_id, last_sync_at |
| `idempotency_keys` | key_hash + operation (composite PK), result — crash-safe dedup |
| `fonepay_transactions` | transaction_id, qr_expiry, gateway_reference, payment_log_id |
| `pricing_rules` | rule_type, applies_to, value_type, value, start/end_date, days_of_week |
| `workflow_state`/`workflow_logs` | entity_type, current_step, status, context (jsonb) |
| `system_events` | Event sourcing for real-time architecture |
| `audit_logs` | user_id, previous/new_state (jsonb), severity |
| `transition_history` | Generic state machine log |
| `credit_customers`, `housekeeping_tasks`, `maintenance_tasks`, `suppliers`, `purchase_orders`, `purchase_order_items` | POS operations |

**Functions (40+):** `create_booking()`, `process_check_in/out()`, `process_cash_payment()` (crash-safe 2-phase), `create_invoice()`, `record_stock_movement()` (running balance), `reserve/release_inventory()`, `transition_order_status()`, `check_idempotency_strict()`, `mark_idempotency()`, `log_sync_entry()`, `link_external_booking()`, `create_system_event()`.

**Triggers:** `trg_fonepay_payment_notify` (realtime), `trg_fonepay_qr_expiry` (10 min), `trigger_check_invoice_locked`, `trigger_check_order_items_locked`, `trigger_audit_order_status`, `trigger_system_event_order`, `trg_update_product_stock`.

**RLS Pattern:** Public SELECT on active rooms/types/menu/tables. Authenticated CRUD on business tables. Project_admin-only access to sync tables (`room_mappings`, `external_bookings`, `sync_logs`, `sync_queue`, `idempotency_keys`, `fonepay_transactions`).

### Schema Comparison: Rooms

| Aspect | Website | POS |
|---|---|---|
| Model | Flat (23 cols, room_type as text) | Normalized (rooms + room_types FK) |
| Room Type | `room_type` (text tag) | `room_type_id` → `room_types` (code enum) |
| Status | available/occupied/maintenance (3) | available/reserved/booked/occupied/partial_paid/fully_paid/cleaning/maintenance (8) |
| Pricing | `price_per_night` + seasonal_pricing (unused) + discount_percent | `room_types.base_price` + `pricing_rules` table |
| Max Guests | Not present | `room_types.max_guests` |
| Images | `room_images` table (multiple per room) | `image_url` on rooms and room_types (single) |

### Schema Comparison: Bookings

| Aspect | Website | POS |
|---|---|---|
| Guest Email | `guest_email` (required) | NOT PRESENT |
| Check-in/out | date type | timestamptz type |
| Payment Model | advance_amount + balance_amount + payment_status | total_amount + paid_amount (calculated) |
| Booking Number | UUID only | `booking_number` (unique, human-readable) |
| Idempotency | None | `idempotency_key` (unique) + `idempotency_keys` table |
| Status | pending_payment/confirmed/cancelled/checked_in/checked_out | pending/confirmed/checked_in/checked_out/cancelled/no_show |

---

## 3. Business Workflow Analysis

### Website — Customer Booking Flow

```
Browse → Select Dates → Select Room → Guest Details → Fonepay QR → Confirm
```

1. `getEffectivePricePerNight()` = `price_per_night × (1 - discount_percent/100)` — note: `seasonal_pricing` jsonb stored but never used
2. `isRoomAvailable()` checks `booking_conflicts` VIEW for date overlap
3. `create-booking` edge function: validates → inserts booking (pending_payment) → inserts payment → calls Fonepay API → returns QR image
4. Client polls payment status every 5s
5. Fonepay webhook: validates HMAC → checks `used_nonces` for replay → `confirm_booking_payment()` RPC → atomic booking confirmed + payment verified

**CRITICAL GAP:** `create-booking` does NOT push to POS at any point. Customer pays → booking is Website-only → POS never sees it.

### Website — Admin Booking Flow

Login (Google OAuth) → `is_admin()` check → create/manage bookings. Admin-created bookings with `source='pos'` DO trigger `trg_booking_sync_event` → populate `sync_events`, but `sync-webhook-sender` delivery chain is incomplete.

### POS — Motel Booking Flow

```
Create Booking (walk-in/phone) → Check-In → Room Services → Check-Out → Invoice → Payment
```

- **Create:** `BookingForm.tsx` → `useCreateBooking()` → RPC `create_booking()` (idempotent, availability check) → **on success: `pushBookingToWebsite()`** ✅
- **Check-In:** Click in `MotelPage.tsx` → `process_check_in()` RPC (state machine, idempotent) → room→occupied → **`pushStatusUpdateToWebsite()`** ✅
- **Room Services:** Select items → `create_room_service()` RPC → costs on invoice (POS-only, no Website equivalent)
- **Check-Out:** `process_check_out()` → auto-invoice unbilled services → room→available → **`pushStatusUpdateToWebsite()`** ✅
- **Cancel:** **`pushStatusUpdateToWebsite(..., 'cancelled')`** ✅

### POS — Payment Flow

**Cash:** `process_cash_payment()` → create intent → confirm (crash-safe 2-phase with idempotency).
**Fonepay:** Client → `/fonepay` edge function → QR → Fonepay webhook → `log_fonepay_transaction()` → updates invoice + payment_intent.
**Split Payments:** bill_splits + split_items + split_payments — each split paid independently.
**POS Fonepay uses different merchant code than Website.** Payment sync not needed (separate revenue streams).

### POS — Restaurant Order Flow

```
Create Order → Kitchen (preparing) → Ready → Served → Pending Payment → Paid
```

- `create_order()` RPC: generates order_number (ORD-00001), validates stock, `reserve_inventory()`, triggers `system_events` for realtime display
- Kitchen sees order via Realtime subscription → accepts → prepares → marks ready
- `transition_order_status()` state machine (pending→preparing→ready→served→pending_payment→paid) — each transition logged in `order_status_history`
- On pending_payment: `create_invoice()` auto-generates invoice, locks order items

### POS — Inventory Flow

**Stock In:** `record_stock_movement('in')` → trigger maintains `current_stock` running balance → alert if below `reorder_level`.
**Stock Out (Consumption):** `reserve_inventory()` creates hold → order complete → `release_inventory('consumed')` records movement. Cancel → `release_inventory('cancelled')` restores stock.
**Recipes:** recipes → recipe_versions → recipe_items → products. Order items auto-calculate required product quantities.

### POS — Room State Machine

```
available → reserved → booked → occupied → cleaning → available
                              → partial_paid → fully_paid (merged)
                              → maintenance
```

All transitions in `room_state_transitions`. `pricing_rules` handles seasonal/weekday/weekend/holiday pricing with fixed_amount, percentage, or override_price value types.

### POS — Offline Resilience

**Mutation Queue:** IndexedDB (Dexie.js), retry max 5 (1s→2s→4s→8s→30s backoff), dead-letter after 300s, leader-based drain via BroadcastChannel.
**Circuit Breaker:** 10 failures in 30s → open 30s → half-open → probe → close. Cross-tab sync via localStorage.
**Realtime Resilience:** 1000-entry LRU dedup, replay checkpoint on reconnect, dead-letter after 3 retries, stale channel cleanup every 5min, backpressure with circuit breaker.

### POS — Idempotency Framework

`check_idempotency_strict(key_hash, operation)` → if exists return result → INSERT with null result → process → `mark_idempotency()` update result. Crash-safe: server crash between INSERT and mark → next call finds null → re-executes. SHA-256(key_hash = operation + idempotency_key).

### Sync Flows

**POS → Website (WORKING):**
1. `BookingForm.tsx` booking created → `pushBookingToWebsite()` → `booking-sync.ts` → POST to `website-sync` edge function (HMAC-signed, rate-limited 30/min)
2. `website-sync/index.js`: routes by action (push_booking/push_status_update/check_availability/trigger_retry_queue) → maps POS room→Website room via `room_mappings` → POSTs to Website `booking-webhook`
3. Website `booking-webhook/index.js`: validates HMAC → creates/updates booking → links via `external_bookings` → logs `sync_log`
4. On failure: mutation queue retries (max 5, 1s→30s) → circuit breaker after 10 failures → dead-letter after 300s

**Website → POS (INCOMPLETE):**
- `sync_events` table exists, trigger-populated on booking INSERT/UPDATE
- `sync-webhook-sender` scheduled function exists
- POS `booking-webhook` edge function can receive Website events
- **MISSING:** `create-booking` never creates sync_event → POS never notified
- **MISSING:** `sync-webhook-sender` not actively delivering to POS

---

## 4. Entity Mapping

### Room Mapping

| Field | Website | POS | Map |
|---|---|---|---|
| ID | UUID | UUID | `room_mappings` |
| Room Number | `room_number` | `room_number` | Direct |
| Status | availability_status (text) | status (enum) | 3→8 mapping |
| Price | price_per_night (per-room) | room_types.base_price (per-type) | Sync POS→Website |
| Images | `room_images` (multiple) | `image_url` (single) | Primary only |
| Room Type | `room_type` (text) | `room_type_id` → room_types | Text ↔ normalized |
| Max Guests | — | room_types.max_guests | Add to Website |

### Booking Mapping

| Website Field | POS Field | Issue |
|---|---|---|
| `guest_email` | **MISSING** | Must add column |
| `check_in` (date) | `check_in` (timestamptz) | Timezone ambiguity |
| `advance_amount` / `balance_amount` | `total_amount` / `paid_amount` | Different payment model |
| `booking_status` (5 values) | `status` (6 values) | `no_show` ↔ `pending_payment` mismatch |
| — | `idempotency_key` (unique) | Add idempotency to Website |

### Payment Mapping

Website has single `payments` table per booking (prn, amount, fonepay_trace_id, tax_refund). POS has two-phase payments (intent→log) supporting split payments, invoice-level, multiple methods. **Separate merchant accounts — no sync needed.**

### POS-Only Entities (No Website Equivalent)

room_types, room_services, room_state_transitions, invoices, invoice_items, orders, order_items, products, stock_movements, restaurant_tables, table_sessions, bill_splits, split_items, split_payments, menu_item_modifiers, recipes, recipe_versions, recipe_items, pricing_rules, workflow_state, workflow_logs, system_events, user_profiles, credit_customers, housekeeping_tasks, maintenance_tasks, suppliers, purchase_orders, inventory_holds, order_status_history, transition_history, payment_logs, payment_intents, fonepay_transactions.

### Website-Only Entities (No POS Equivalent)

site_content, site_images, used_nonces, booking_conflicts (VIEW).

---

## 5. Gap Analysis

### CRITICAL Gaps

**G-1: Website → POS Booking Sync.** Bookings created and paid on Website never reach POS. Risk: double-booking, missed arrivals. *Fix: Wire `create-booking` to emit `sync_events` after payment → `sync-webhook-sender` delivers to POS `booking-webhook`.*

**G-2: Guest Email Missing in POS.** POS `bookings` has no `guest_email`. Website requires email. Email lost on sync. *Fix: Add `guest_email TEXT` column to POS `bookings`.*

### HIGH Gaps

**G-3: Payment Model Mismatch.** Website: advance_amount + balance_amount + payment_status. POS: total_amount + paid_amount. Website-paid booking shows as unpaid in POS. *Fix: Set `paid_amount = total_amount` when syncing pre-paid bookings.*

**G-4: Room Type Model Mismatch.** Website: `room_type` (text). POS: `room_types` (normalized, enum code). Fragile references. *Fix: Add room_types table or CHECK constraint to Website.*

**G-5: Status Enum Mismatch.** Booking statuses: Website lacks `no_show`, POS lacks `pending_payment`. Room statuses: Website has 3, POS has 8 (missing: cleaning, reserved, booked, partial/fully_paid). *Fix: Canonical mapping table + add missing values.*

**G-6: Pricing Discrepancy.** Website: `price_per_night × (1 - discount_percent)`, seasonal_pricing unused. POS: base_price + pricing_rules (seasonal/weekday/weekend types). *Fix: Sync pricing_rules from POS to Website, or align algorithms.*

### MEDIUM Gaps

**G-7: Date/Time Type Mismatch.** Website uses `date`, POS uses `timestamptz`. Timezone ambiguity. *Fix: Standardize on timestamptz with Nepal timezone.*

**G-8: Fonepay Hold vs Payment.** Website has `hold_expires_at` / `active_prn`. POS has no hold concept. *Fix: Only sync confirmed (paid) bookings.*

**G-9: No Idempotency on Website.** POS has `idempotency_keys` across all RPCs. Website has none (only Fonepay `used_nonces`). *Fix: Add `idempotency_keys` table + check to Website edge functions.*

**G-10: Room Capacity Missing on Website.** No `max_guests` field. *Fix: Add column, populate from POS room_types.*

**G-11: No Customer Table.** Neither system has first-class guest table. Guest data embedded in bookings. *Noted, out of scope.*

### LOW Gaps

**G-12: Sync Acknowledgment** — fire-and-forget, no verification. **G-13: Menu/Product Sync** — managed independently. **G-14: Room Images** — Website multi-image vs POS single. **G-15: Seasonal Pricing Unused** — column exists, code never reads it.

---

## 6. Architecture Decision

### Evaluated Options

| Option | Verdict | Reason |
|---|---|---|
| A: Shared Database | ❌ Rejected | Breaking change, incompatible RLS, cross-project coupling |
| B: Shared API Layer | ❌ Rejected | Massive rewrite, months of work |
| C: REST-only Sync | 🤔 Plausible | Lowest effort but no conflict resolution |
| D: Event-Driven Realtime | ❌ Rejected | Missed events risk, edge functions not persistent |
| **E: Hybrid** | **✅ RECOMMENDED** | Extends existing infra, no breaking changes, fastest path |

### Option E: Hybrid with POS as Source of Truth

**Core Principle:**
- **POS owns** hotel operations: rooms, room types, pricing, walk-in bookings, statuses
- **Website owns** customer-facing content: `site_content`, `site_images`
- **Sync bridge**: POS→Website for ops data (extend existing), Website→POS for customer bookings (new)

**Data Ownership:**

| Entity | Source of Truth | Sync Direction |
|---|---|---|
| Rooms | POS | POS → Website |
| Room Types | POS | POS → Website |
| Room Images | Website | Website → POS (primary only) |
| Customer Bookings | Website | Website → POS |
| Walk-in Bookings | POS | POS → Website |
| Customer Payments | Website | → POS (as paid_amount) |
| Walk-in Payments | POS | POS only |
| Booking Status | Shared | Bidirectional |
| Pricing Rules | POS | POS → Website |
| Menu Items | POS | POS → Website (future) |
| Site Content | Website | Website only |

**Conflict Resolution:**
- Same booking updated both sides → last-writer-wins (updated_at)
- POS cancels Website-confirmed → POS wins (overbooking control)
- Customer cancels after POS check-in → REJECT (POS locks)
- Room status changed both sides → POS wins (operational reality)

---

## 7. Implementation Blueprint

### Architecture

```
Website DB ← Edge Functions → POS Edge Functions → POS DB
             ↕ (HTTP + HMAC SHA-256)
        [sync_events]        [sync_queue]
```

**Website Edge Functions:**
- `booking-webhook` — receive POS pushes (existing) + add idempotency
- `sync-webhook-sender` (scheduled 15s) — read sync_events → POST to POS (new)
- `pos-sync-api` — room sync from POS (extend)

**POS Edge Functions:**
- `website-sync` — push_booking, push_status_update, etc. (existing)
- `booking-webhook` — handle Website → POS booking_created events (new)

### Sync Event Types

| Event | Direction | Priority | Max Lag |
|---|---|---|---|
| booking_created | Website → POS | HIGH | ~15s |
| booking_paid | Website → POS | HIGH | ~15s |
| booking_cancelled | Website → POS | HIGH | ~15s |
| booking_status_update | POS → Website | HIGH | ~2s |
| room_updated | POS → Website | MEDIUM | ~60s |
| room_status_changed | POS → Website | HIGH | ~15s |
| availability_sync | POS → Website | HIGH | ~15s |

### API Contracts

**Website `POST /api/booking-webhook` (POS → Website):**
```json
{
  "action": "push_booking",
  "idempotency_key": "sha256(operation+pos_booking_id)",
  "booking": { "pos_booking_id", "guest_name", "guest_phone", "check_in", "check_out", ... },
  "room_mapping": { "pos_room_id", "website_room_id" }
}
```

**Website `POST /api/pos-sync-api/rooms` (POS → Website):**
```json
{
  "action": "sync_rooms",
  "rooms": [{ "website_room_id", "room_number", "room_type", "price_per_night", "availability_status", ... }]
}
```

**POS `POST /api/booking-webhook` (Website → POS):**
```json
{
  "event_type": "booking_created",
  "idempotency_key": "sha256(website_booking_id)",
  "booking": { "website_booking_id", "room_id", "guest_name", "guest_email", "guest_phone", "total_price", "advance_amount": 9000, "balance_amount": 0, "payment_status": "paid", ... }
}
```

### Security

**HMAC:** `HMAC-SHA256(secret, body + "." + timestamp)` in `x-webhook-signature` header. Timestamp tolerance ±5 minutes. Mismatch → 401, no retry.

**Idempotency (New on Website):**
```sql
CREATE TABLE idempotency_keys (key_hash TEXT PRIMARY KEY, result JSONB, created_at TIMESTAMPTZ DEFAULT NOW());
```
Flow: compute sha256(key) → SELECT → if found return result → INSERT null → process → UPDATE result. Unique violation = another request won.

### Error Handling

| Error | HTTP | Action | Retry |
|---|---|---|---|
| HMAC invalid | 401 | Log, discard | No |
| Idempotency collision | 409 | Return existing | No |
| Booking conflict | 409 | Return conflict | Manual |
| DB transient | 503 | Backoff | Yes (3x) |
| Rate limited | 429 | Backoff | Yes |
| Room mapping missing | 422 | Unmapped error | Manual |

**Website retry:** sync_events → pending → sync-webhook-sender reads → POST → success=processed, 4xx=failed, 5xx=retry (1s,5s,15s,30s,60s), max 5 → dead_letter.

### Migration Plan (4 Phases, 14-20 hours)

**Phase 1 — Foundation (2-3h, no behavior change):**
- Add `guest_email TEXT` to POS `bookings`
- Add `max_guests INTEGER` to Website `rooms`
- Create `idempotency_keys` table on Website
- Add idempotency check to Website `booking-webhook`
- Deploy, verify no regression

**Phase 2 — Website → POS Booking Sync (4-6h, CRITICAL):**
- Extend POS `booking-webhook`: handle `booking_created`, map room via `room_mappings`, set `paid_amount = total_amount` for pre-paid, store guest_email, create `external_bookings` link, idempotency check
- Extend Website `create-booking`: after payment confirmed → INSERT into `sync_events` with full booking + payment payload
- Extend Website `sync-webhook-sender`: handle `booking_created` events → POST to POS `booking-webhook`
- Test with live booking

**Phase 3 — Room Status Sync (3-4h):**
- On POS room status change → call Website `pos-sync-api`
- Map POS status (8 values) → Website status (3 values)
- Periodic room sync every 60s

**Phase 4 — Monitoring (2-3h):**
- Sync health dashboard
- Reconciliation job every 5min (compare booking counts)
- Manual retry UI for dead-letter items

**Rollback:**
- Phase 1: Rollback DB migrations, redeploy edge functions
- Phase 2: Disable sync-webhook-sender, revert edge functions
- Phase 3: Revert room sync, Website rooms return to manual
- Any data loss: Restore Day 0 backup

### Testing

**Integration tests:** POS→Website booking push, Website→POS booking sync, duplicate event idempotency, HMAC rejection, room mapping lookup, status update sync.
**E2E tests:** Customer booking arrives in POS, POS check-in reflects on Website, double-booking prevention, offline sync recovery.

### Go/No-Go

**Go if:** Both databases backed up, existing POS→Website sync working, all edge functions deploy, room_mappings exist for ≥2 rooms, test credentials ready.
**No-Go if:** Existing sync failing, room_mappings missing, any migration breaks app, HMAC secrets misconfigured.

---

## Key Files to Modify

| File | Change |
|---|---|
| POS DB migration | ADD `guest_email TEXT` to `bookings` |
| Website DB migration | ADD `idempotency_keys` table, ADD `max_guests INTEGER` to `rooms` |
| Website `create-booking/index.js` | ADD `sync_events` INSERT after payment confirmed |
| Website `sync-webhook-sender/index.ts` | ADD POS `booking-webhook` POST for `booking_created` |
| Website `booking-webhook/index.js` | ADD idempotency check |
| POS `booking-webhook/index.js` | ADD `booking_created` handler, guest_email, pre-paid logic |

## Quick Reference

```bash
# Deploy
cd ~/Desktop/Arjun && insforge functions deploy create-booking booking-webhook sync-webhook-sender pos-sync-api
cd ~/Desktop/Highlands\ Cafe\ &\ Motel\ Inn && insforge functions deploy website-sync booking-webhook

# DB migrations
insforge db push    # in each project directory

# Backups
insforge db dump -f website-backup.sql
insforge db dump --project 8cvkfu8m -f pos-backup.sql
```

**Database Credentials:**
- Website: `postgresql://postgres:7c83753ffea4d6cad29237cc41b0c951@6aiag3ra.us-east.database.insforge.app:5432/insforge`
- POS: `postgresql://postgres:04561a21ce9b4fefe9544574074d6654@8cvkfu8m.us-east.database.insforge.app:5432/insforge`
