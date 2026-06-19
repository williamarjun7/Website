# Phase 3: Business Workflow Analysis

## A. Website — Customer Booking Flow

```
Browse Rooms → Select Dates → Select Room → Enter Guest Details → Fonepay QR Payment → Confirmation
```

1. **Browse**: Customer lands on any page. `site_content` key-value store drives all page content (29 keys like `hero_title`, `about_us`, `description_text`, `rooms_section_text`, `about_images`, etc.). Images from `site_images` (type=`hero`, `cafe`, etc.).
2. **Select Dates**: `isRoomAvailable()` checks `booking_conflicts` VIEW. Uses `getEffectivePricePerNight()` that calculates room price as: `price_per_night - (price_per_night * discount_percent / 100)` flat base price. Seasonal pricing in `rooms.seasonal_pricing` (jsonb) exists but is NOT reflected in `getEffectivePricePerNight()` — it only uses `discount_percent`.
3. **Select Room**: `RoomsPage.jsx` renders cards for `available` rooms. `RoomDetail.jsx` handles single room view with images from `room_images`.
4. **Enter Details**: `BookingPage.jsx` → guest_name, guest_email, guest_phone, adults, children.
5. **Payment**: Clicking "Confirm Booking" triggers `create-booking` edge function → Fonepay QR generation → `payments` record with `status='pending'` and `active_prn` set. Shows QR in iframe. Customer scans with Fonepay app.
6. **Webhook Confirmation**: Fonepay server calls `website-webhook` edge function → validates signature + nonce → `confirm_booking_payment()` via RPC → atomically: set booking_status='confirmed', payment_status='paid', update payment to 'verified'.
7. **Failure**: Payment fails → `fonepay-webhook` sends failure → booking stays `pending_payment` with `hold_expires_at`. Beyond expiry → booking auto-cancelled.

**Sync Integration Points in Customer Flow:**
- ❌ Booking creation (`create-booking` edge function) does NOT push to POS
- ❌ Payment confirmation does NOT push to POS
- ❌ Cancellation does NOT push to POS

---

## B. Website — Fonepay Payment Flow

```
create-booking → Generate QR Code → Customer Scans → Fonepay Webhook → Confirm Payment
```

1. **`create-booking` edge function** (`booking/index.js`):
   - Validate input, check room availability
   - Insert into `bookings` with `booking_status='pending_payment'`, `payment_status='unpaid'`
   - Insert into `payments` with `prn` (PRN format: `HCMIPRN{timestamp}{random}`), amount, pending status
   - Call Fonepay API (`POST /merchant-service/rest/api/v2/merchant/generateqr`) with HMAC SHA-256 signed payload
   - Store Fonepay response (prn, qrImage) back to payments
   - Return QR image URL + Booking ID to client
2. **Client polls** payment status every 5s via `check-payment` edge function (checks `payments.status`)
3. **Fonepay webhook** (`fonepay-webhook/index.js`):
   - Validates HMAC signature using `FONEPAY_SECRET_KEY`
   - Checks nonce against `used_nonces` table for replay protection
   - Calls `confirm_booking_payment(booking_id)` RPC → atomically marks booking confirmed + payment verified
   - Returns `{"status": "success"}`
4. **Booking page** sees confirmed status → shows success UI

**Edge Cases:**
- Fonepay can post webhook AFTER client polling timeout — handled (webhook still processes)
- Duplicate webhook calls — prevented by used_nonces table
- Fonepay "pending" state (not paid, not failed) — system keeps polling
- Fonepay payment fails after QR generation — stays `pending_payment` until hold expires

---

## C. Website — Admin Booking Flow

```
Login (Google OAuth) → Admin Panel → Bookings → View/Create/Manage
```

1. **Login**: Google OAuth via InsForge Auth. `is_admin()` checks `admins` table by `auth.uid()`.
2. **Admin creates booking**: Fill guest details, select room, dates → `admin-booking` edge function → creates booking with `source='pos'` → triggers `trg_booking_sync_event` → creates `sync_event` record.
3. **Admin manages**: Change status, mark payment received, cancel.

**Sync Integration Points:**
- ⚠️ Admin booking creation triggers `trg_booking_sync_event` → `sync_events` table populated
- ❌ `sync-webhook-sender` scheduled function reads `sync_events` but delivery to POS is not completing

---

## D. POS — Motel Booking Flow

```
Create Booking → Check-In → Room Services → Check-Out → Invoice → Payment
```

### D1. Booking Creation (`BookingForm.tsx` → `motel.hooks.ts` → RPC `create_booking`)

1. Staff selects room, guest info, dates, rate → form validation
2. Calls `useCreateBooking()` mutation → RPC `create_booking(room_id, guest_name, guest_phone, check_in, check_out, adults, children, nightly_rate, notes)`
3. `create_booking()` SQL function:
   - Checks room availability (no overlapping dates for same room with active booking)
   - `check_idempotency_strict()` — if already processed, return existing booking
   - INSERT into `bookings` with unique `booking_number` (auto-generated) and `idempotency_key`
   - `mark_idempotency()` — crash-safe commit
4. On success → `pushBookingToWebsite()` → POS `website-sync` edge function → Website `booking-webhook` edge function → creates Website booking
5. React Query invalidation refreshes bookings list

**Sync at Creation:** ✅ POS → Website
- `BookingForm.tsx`: `pushBookingToWebsite(posBooking)` is called inside the mutation's `onSuccess` callback
- `booking-sync.ts` `pushBookingToWebsite()` → calls edge function `website-sync` with action `push_booking`
- `website-sync/index.js`: Handles `push_booking` → calls Website `booking-webhook` edge function with HMAC-signed body
- `booking-webhook/index.js`: Receives → creates/updates Website booking → links via `external_bookings` → logs via `sync_logs`

### D2. Check-In (`MotelPage.tsx` → `useCheckIn()` → RPC `process_check_in`)

1. Staff clicks "Check In" on booking row in `MotelPage.tsx`
2. Confirmation dialog → on confirm → calls `process_check_in(booking_id)` RPC
3. `process_check_in()`:
   - Checks booking is `confirmed`
   - Updates booking status to `checked_in`
   - Updates room status to `occupied`
   - Records in `room_state_transitions`
   - `mark_idempotency()` → dedup
4. On success → `pushStatusUpdateToWebsite(booking_id, 'checked_in')`
5. React Query: invalidates `['bookings']`, `['rooms']`, `['roomStateTransitions']`

**Sync at Check-In:** ✅ POS → Website
- `MotelPage.tsx` triggers `pushStatusUpdateToWebsite()` with new status
- Same flow: `booking-sync.ts` → `website-sync` edge function (action `push_status_update`) → Website `booking-webhook` → updates Website booking status

### D3. Room Services (`MotelPage.tsx` → Booking Detail)

1. Staff opens booking detail for checked-in guest
2. Menu items listed — staff selects items → `create_room_service()` RPC
3. Creates `room_services` record linked to booking
4. Can optionally push to POS `orders` for kitchen processing (if service_type indicates food)
5. Costs accumulated → reflected in invoice at checkout

**Sync Integration:** ❌ Room services do NOT sync to Website (Website has no room_services concept)

### D4. Check-Out (`MotelPage.tsx` → `useCheckOut()` → `process_check_out`)

1. Staff clicks "Check Out" → confirmation dialog
2. Calls `process_check_out(booking_id)` RPC:
   - Auto-creates invoice for any unbilled room services
   - Updates booking status to `checked_out`
   - Updates room status to `available`
   - Records state transition
3. On success → `pushStatusUpdateToWebsite(booking_id, 'checked_out')`

**Sync at Check-Out:** ✅ POS → Website

### D5. Booking Cancel

1. Staff cancels booking → `updateBookingStatus('cancelled')`
2. On success → `pushStatusUpdateToWebsite(booking_id, 'cancelled')`

**Sync at Cancel:** ✅ POS → Website

---

## E. POS — Payment Flow

### E1. Invoice Payment

```
Invoice Created → Payment Dialog → Cash/Fonepay → Confirm Payment
```

1. **Invoice**: Created via `create_invoice(order_id)` or `generate_invoice(booking_id)` RPC
2. **Payment Dialog**: Opens with invoice data → staff selects method (Cash, Fonepay QR, Card)
3. **Cash**: `process_cash_payment(invoice_id, amount)`:
   - `create_payment_intent(invoice_id, amount, 'cash')` → `confirm_payment(intent_id)`
   - Crash-safe: 2-phase (create_intent → confirm_intent) with idempotency
   - Updates invoice status, records payment_log
4. **Fonepay QR**: `fonepay.ts` client service:
   - POST to edge function `/fonepay` → calls Fonepay API → returns QR image URL + transaction_id
   - Displays QR in modal → staff scans with Fonepay app
   - Fonepay webhook (`fonepay-webhook/index.js`): validates HMAC → calls `log_fonepay_transaction()` → updates invoice → creates `payment_intent` as processed
   - Client polls payment status
5. **Partial Payment**: POS allows split payments (cash + card + Fonepay). `paid_amount` accumulates. Invoice stays partially paid until total is met.
6. **Payment Reversal**: `reverse_payment()` RPC — records reversal with reason, reopens invoice

### E2. Fonepay Flow (POS-specific)

- Different Fonepay merchant code than Website
- Same Fonepay API pattern (HMAC SHA-256, QR generation)
- `fonepay_transactions` table tracks QR generation → expiry → verification lifecycle
- Trigger `trg_fonepay_payment_notify` publishes realtime event on payment confirmation
- Trigger `trg_fonepay_qr_expiry` auto-expires QR after 10 min (configurable)
- Payment verification persists `gateway_reference` (unique) on `fonepay_transactions`
- Client-side `fonepay.ts` service encapsulates 3 operations: generate QR, check status, post tax refund

**Sync Integration:** ❌ POS payments do NOT sync to Website (Website has separate booking-level payments)

---

## F. POS — Restaurant Order Flow

```
Create Order → Kitchen Display → Prepare Items → Complete → Bill → Payment
```

### F1. Order Creation (`OrderForm.tsx` → `useCreateOrder()` → RPC `create_order`)

1. Staff selects table or walk-in → customer info → menu items with modifiers
2. Rate limiting check -> `useCreateOrder()` mutation → RPC `create_order(table_id, items, ...)`:
   - Generates `order_number` (unique, format like `ORD-00001`)
   - Checks/creates `table_session` if dining in
   - Validates stock availability for recipe items
   - `reserve_inventory()` — reserves stock for each product
   - Inserts order with `status='pending'`
   - Inserts order_items with `status='pending'`
   - Records in `order_status_history` (null → pending)
   - `mark_idempotency()` → dedup
3. Trigger `trigger_system_event_order` fires → creates `system_events` for realtime

### F2. Kitchen Workflow

1. **New Order Notification**: Realtime subscription picks up `system_events` → frontend shows new order
2. **Staff accepts order**: `transition_order_status(order_id, 'preparing')` → updates status, logs to `order_status_history`
3. **Order Items prepared**: Kitchen marks individual `order_items.status` as ready
4. **All items ready**: `transition_order_status(order_id, 'ready')` → notification to serving staff
5. **Served**: `transition_order_status(order_id, 'served')` → items delivered to table
6. **Bill Requested**: `transition_order_status(order_id, 'pending_payment')` → auto-creates invoice via `create_invoice(order_id)` RPC

### F3. Order Status State Machine

```
pending → preparing → ready → served → pending_payment → paid → cancelled
```
Each transition logged in `order_status_history`. Invoice locks order items (`trigger_check_order_items_locked`).

### F4. Bill Splitting

1. Staff initiates bill split on an invoice
2. `bill_splits` record created with split_type (`equal`, `by_item`, `custom_amount`)
3. `split_items` link order items to each split
4. Each split can be paid independently via `split_payments`
5. Split payments accumulate → when all splits paid, invoice marks `paid`

---

## G. POS — Inventory Management Flow

### G1. Stock In

```
Purchase Order → Goods Receipt → stock_movements (movement_type='in') → products.current_stock updated
```

- `record_stock_movement(product_id, 'in', quantity, ...)` RPC
- Trigger `trg_update_product_stock` maintains `current_stock` running balance
- If `current_stock` crosses down past `reorder_level`, generates alert

### G2. Stock Out (Consumption)

```
Order Creation → reserve_inventory() → Order Completion → release_inventory() → stock_movements (movement_type='out')
```

- `reserve_inventory()` — creates `inventory_holds` (status='active') decrementing available stock
- `release_inventory()` — converts holds to consumed (status='consumed'), records stock movement
- If order cancelled → `release_inventory(..., 'cancelled')` — restores stock

### G3. Recipe Integration

- `recipes` define how many of each `product` goes into a `menu_item`
- `recipe_versions` tracks recipe changes
- `recipe_items` maps product → quantity per version
- When order item added, system calculates required product quantities from current recipe version

---

## H. POS — Room Management Flow

### H1. Room State Machine

```
available → reserved → booked → occupied → cleaning → available
                                              → maintenance
              partial_paid → fully_paid → (merged into occupied flow)
```

- `update_room_status(room_id, new_status, reason)` RPC
- All transitions recorded in `room_state_transitions`
- Status enum: `available, reserved, booked, occupied, partial_paid, fully_paid, cleaning, maintenance`

### H2. Room Type Management

- Room types defined in `room_types` table with code enum (standard, deluxe, suite, family, single, double, dormitory)
- Each room assigned a room_type_id
- Room type holds base_price, max_guests, general amenities
- Individual room holds floor, notes, status — not base pricing

### H3. Pricing Rules

- `pricing_rules` table handles seasonal/dynamic pricing
- Rule types: seasonal, weekday, weekend, holiday, custom
- Applies to room_types or menu_items via `applies_to` (entity type reference)
- Value type: `fixed_amount`, `percentage`, `override_price`
- Date range + days_of_week filtering for scheduling

---

## I. POS — Workflow Engine

### I1. Multi-step Workflows

- `workflow_state` tracks entity state machines (check-in process, checkout, order lifecycle)
- `workflow_logs` records each step transition with actor and metadata
- Enables long-running workflows (e.g., checkout: create invoice → add charges → apply discounts → process payment → close)

### I2. Audit Trail

- `audit_logs` — comprehensive: user_id, action, entity_type/entity_id, previous/new_state (jsonb), severity
- `transition_history` — generic entity state machine log, separate from room_state_transitions
- Client-side: `audit.service.ts` handles audit for UI actions with severity levels, diff generation, and snapshot capture

---

## J. POS — Idempotency Framework

```
check_idempotency_strict(key_hash, operation) → if exists: return result
INSERT INTO idempotency_keys (operation, key_hash, result)
process operation
mark_idempotency(id, result) → update result
```

- Used by all critical RPCs (create_booking, process_check_in, process_check_out, process_cash_payment, process_payment, create_invoice, create_order)
- `key_hash = SHA-256(operation + idempotency_key)`
- Crash-safe: if server crashes between INSERT and `mark_idempotency`, next call finds existing row with null result → re-executes
- Two RPCs: `check_idempotency_strict()` (block on conflict) and `mark_idempotency()` (update result on completion)

---

## K. POS — Offline Resilience Architecture

### K1. Mutation Queue (`mutation-queue.ts`)
```
Queue Mutation → Process with Retry → Success → Remove from Queue
                                    → Fail → Retry (max 5, backoff: 1s→2s→4s→8s→30s)
                                    → Stuck >300s → Dead-Letter Queue
```
- IndexedDB-backed (Dexie.js) — survives page reload
- Mutations stored in `queue` table with: id, type, payload, status, retryCount, maxRetries, createdAt, lastAttemptAt, error
- Leader-based drain: only one tab processes queue at a time (cross-tab via BroadcastChannel)
- On queue drain: checks if mutations are still pending after all processed
- Dead-letter queue: mutations stuck for 300s → flagged as `dead_letter`

### K2. Circuit Breaker (`circuit-breaker.ts`)
```
Closed (normal) → 10 failures in 30s → Open (block 30s) → Timeout → Half-Open → Probe → Close
```
- Tracks: failure count, last failure timestamps (30s sliding window)
- Threshold: 10 failures → state='open'
- Timeout: 30s in open state → state='half-open'
- Half-open: allows 1 probe request → success → close; fail → reopen
- Cross-tab sync via `localStorage` events (broadcast to all tabs)
- Exposed as React context + hook

### K3. Realtime Resilience (`realtime.ts`)
- WebSocket-based subscriptions with automatic reconnection
- Event deduplication: LRU cache of 1000 recent event IDs
- Replay checkpoint: tracks last processed event ID, requests replay on reconnect
- Dead-letter channel: events failing processing after 3 retries moved to dead-letter
- Stale channel cleanup: every 5 minutes, removes subscriptions to inactive entities
- Backpressure: pauses realtime processing when circuit breaker is open
- Channel state management: subscribed, connecting, error states with retry

---

## L. Sync Flows (Cross-System)

### L1. POS → Website Sync (WORKING)

```
POS Service → website-sync Edge Function → Website booking-webhook Edge Function → Website DB
```

**Triggers:**
1. Booking created → `pushBookingToWebsite(posBooking)` in `BookingForm.tsx`
2. Check-in → `pushStatusUpdateToWebsite(bookingId, 'checked_in')` in `MotelPage.tsx`
3. Check-out → `pushStatusUpdateToWebsite(bookingId, 'checked_out')` in `MotelPage.tsx`
4. Booking cancelled → `pushStatusUpdateToWebsite(bookingId, 'cancelled')` in `MotelPage.tsx`

**Data Flow:**
1. Client service `booking-sync.ts` calls `website-sync` edge function (HTTPS POST)
2. `website-sync/index.js`:
   - Validates HMAC signature using `WEBSITE_WEBHOOK_SECRET`
   - Rate-limited: 30 requests per minute window per IP
   - Routes by action:
     - `push_booking`: maps POS room → Website room (via `room_mappings`), calls Website `booking-webhook` with booking data
     - `push_status_update`: maps POS booking → Website booking, sends status update
     - `check_availability`: forwards availability check to Website
     - `trigger_retry_queue`: scans `sync_queue` for failed items → retries
3. Website `booking-webhook/index.js`:
   - Validates HMAC signature using `POS_WEBHOOK_SECRET`
   - `push_booking`: INSERT/UPDATE website booking, INSERT/UPDATE via `external_bookings` link
   - `push_status_update`: UPDATE website booking status
   - Creates `sync_log` entry
   - Returns mapped website IDs

**Failure Handling:**
- Network failure: mutation queue retries with backoff (max 5, 1s→30s)
- Edge function failure: circuit breaker blocks retries for 30s if threshold exceeded
- Dead-letter: after 300s, flagged for manual review in SyncAdminPanel
- Sync Queue (DB): `sync_queue` table with retry_count, max_retries, next_retry_at, last_error

### L2. Website → POS Sync (INCOMPLETE)

**What exists:**
- `sync_events` table on Website: events generated by `trg_booking_sync_event` trigger on bookings INSERT/UPDATE
- `sync-webhook-sender` edge function (scheduled): reads unprocessed sync_events, posts to POS website-sync or booking-webhook edge function
- POS `booking-webhook` edge function: receives sync events from Website, creates POS booking with external_booking link
- POS `website-sync` edge function: handles `create-booking` action from Website

**What's missing:**
- `create-booking` edge function does NOT create a sync_event or call POS directly
- `sync-webhook-sender` scheduled function delivery chain is incomplete (not actually calling POS endpoints actively)
- No idempotency on Website side for sync events
- No Website-side equivalent of POS mutation queue for failed sync attempts

### L3. Room Mapping

- POS `room_mappings` table links `pos_room_id` ↔ `website_room_id`
- Populated via `SyncAdminPanel.tsx`: staff pairs POS rooms with Website rooms
- Used by `website-sync` edge function to translate POS room IDs to Website room IDs before creating bookings
- Website rooms without mapping → skip sync
- List of unmapped rooms displayed in SyncAdminPanel for pairing

### L4. Sync Monitoring

- `SyncAdminPanel.tsx` provides UI:
  - Room mappings: view paired/unpaired rooms, create/modify/delete mappings
  - Sync logs: filterable by direction, event type, status, date range
  - Retry queue: view failed items, retry individual items
  - Telemetry: protocol, host, battery info (Chrome-only for debugging)

---

## M. Workflow Summary: Booking Lifecycle Across Systems

```
WEBSITE CUSTOMER                    POS STAFF
    │                                  │
    ├─ Browse rooms                    │
    ├─ Book room                       │
    ├─ Pay via Fonepay QR              │
    │                                  │
    └──[SYNC MISSING]───              │
                                       ├─ Create booking (walk-in/phone)
                                       ├─ Push to Website ✅
                                       ├─ Check-in
                                       ├─ Push status ✅
                                       ├─ Add room services
                                       ├─ Check-out
                                       ├─ Push status ✅
                                       ├─ Generate invoice
                                       └─ Process payment
                                       │
    Website sees POS bookings (via sync) but not vice versa.
```

## N. Key Observations

1. **Website is reception-only**: Customers book and pay online. POS is operations hub: manage bookings, rooms, orders, inventory, billing.
2. **Payment split**: Website collects customer payments via Fonepay. POS collects walk-in/phone booking payments via Cash or Fonepay (different merchant account). These are separate revenue streams.
3. **No guest portal**: Customers cannot view their POS bookings. No check-in/out self-service.
4. **Room service is POS-only**: Food/drinks charged to room are handled entirely offline — no Website component.
5. **POS sync is optimistic**: It fires and forgets. No confirmation loop back to POS that Website actually received the update.
6. **Website → POS sync gap**: The most critical gap. Website customer bookings (especially paid ones) don't reach POS. If a customer books and pays online, POS staff won't see it — leading to double-booking or missed arrivals.
7. **Idempotency gap**: POS has robust idempotency. Website has none. Sync events can be duplicated.
8. **Offline gap**: POS works offline with queue. Website requires internet. Neither system handles split-brain scenarios.
