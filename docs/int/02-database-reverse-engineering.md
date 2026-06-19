# Phase 2: Database Reverse Engineering Report

## A. Website DB (Project A — `6aiag3ra`)

### Tables (14)
| Table | Columns | Description |
|---|---|---|
| `rooms` | 22 | Flat room model: room_number, room_type (text), price_per_night, availability_status, amenities (text[]), seasonal_pricing (jsonb), discount_percent, has_ac, floor_number, featured, maintenance, is_active, etc. |
| `room_images` | 6 | url, alt_text, sort_order, room_id (FK → rooms) |
| `bookings` | 21 | booking_status, payment_status, total_price, source ('website'|'pos'), pos_booking_id, hold_expires_at, active_prn, advance/balance_amount, nightly_rate, adults, children, etc. |
| `payments` | 16 | prn (unique), amount, currency, payment_method, status, fonepay_trace_id, gateway_reference, tax_refund tracking |
| `payment_events` | 9 | audit trail for payment state transitions |
| `sync_events` | 13 | event_type, entity_id, payload (jsonb), source, processed, retry_count, max_retries, etc. |
| `menu_items` | 14 | Flat model: name, category (text), price, available, prep_time, image, etc. |
| `menu_categories` | 6 | name, description, sort_order, is_active |
| `site_content` | 3 | key-value store for page content (29 keys) |
| `site_images` | 5 | image_url, type (hero|cafe|gallery|exterior|other), title, is_active |
| `admins` | 5 | user_id (FK → auth.users), email, role, whitelist for RLS |
| `audit_logs` | 8 | actor_id, actor_email, action, target_type, target_id, metadata (jsonb), ip_address |
| `used_nonces` | 4 | nonce (unique), expires_at — Fonepay replay protection |
| `booking_conflicts` | 3 | VIEW — room_id, check_in, check_out for conflict detection |

### Functions (6)
- `is_admin()` — checks if `auth.uid()` exists in `admins` table
- `confirm_booking_payment()` — atomic payment+booking confirmation
- `insert_used_nonce()` — Fonepay nonce insertion
- `log_admin_action()` — audit log helper
- `trigger_audit_log()` — trigger function for automatic audit on table changes
- `emit_booking_sync_event()` — trigger: inserts into `sync_events` on booking INSERT/UPDATE

### Triggers
- `trg_booking_sync_event` on `bookings` (AFTER INSERT/UPDATE) → `emit_booking_sync_event()`
- `trg_audit_*` on `rooms`, `bookings`, `room_images`, `menu_items`, `menu_categories`, `site_content`, `site_images` → `trigger_audit_log()`

### RLS Pattern
- **anon** can SELECT `rooms`, `menu_items`, `menu_categories`, `room_images`, `site_content`, `site_images` (all public)
- **anon** can SELECT own `bookings`/`payments` (by guest_email match)
- **authenticated** can SELECT everything; can UPDATE own bookings
- **authenticated** write operations restricted by `is_admin()` check against `admins` table
- Admins in `admins` table are the only ones who can create/update/delete content

---

## B. POS DB (Project B — `8cvkfu8m`)

### Tables (39)
| Table | Columns | Description |
|---|---|---|
| `rooms` | 11 | room_number, room_type_id (FK), floor, status (enum), notes, is_active, image_url |
| `room_types` | 10 | name, code (enum), description, base_price, max_guests, amenities (jsonb), image_url, is_active |
| `room_state_transitions` | 6 | room_id, from/to_status, reason, changed_by — state machine history |
| `bookings` | 18 | booking_number (unique), room_id, guest_name/phone, check_in/out, adults/children, status, nightly_rate, total_amount, paid_amount, notes, created_by, idempotency_key (unique) |
| `room_services` | 11 | booking_id, room_id, menu_item_id, description, quantity, unit_price, total, service_type, idempotency_key |
| `user_profiles` | 9 | id (PK = auth.users.id), name, phone, role (enum: admin|manager|owner|staff|kitchen|reception), email, avatar_url, is_active |
| `invoices` | 17 | invoice_number (unique), order_id, booking_id, customer_name/phone, subtotal, discount, total, status, locked_for_payment, locked_until, idempotency_key (unique) |
| `invoice_items` | 8 | invoice_id, description, quantity, unit_price, total, reference_type/id |
| `payment_logs` | 10 | invoice_id, amount, method (enum), reference, status, notes, processed_by, idempotency_key (unique) |
| `payment_intents` | 12 | invoice_id, amount, method, status (enum), idempotency_key, processed/failed/reversed tracking |
| `orders` | 17 | order_number (unique), table_id, customer_name/phone, status (enum), subtotal, tax, service_charge, discount, total, created_by, assigned_to, idempotency_key (unique), order_type (enum) |
| `order_items` | 11 | order_id, menu_item_id, recipe_version_id, item_name, quantity, unit_price, modifiers (jsonb), notes, status (enum) |
| `order_status_history` | 6 | order_id, from/to_status (enum), changed_by, reason |
| `menu_items` | 10 | category_id (FK), name, description, price, image_url, is_available, is_active, preparation_time |
| `menu_categories` | 6 | name, description, sort_order, is_active |
| `menu_item_modifiers` | 5 | menu_item_id, name, options (jsonb), max_selections, is_required |
| `recipes` | 5 | menu_item_id, name, servings, instructions |
| `recipe_versions` | 7 | recipe_id, version, name, servings, instructions, is_current |
| `recipe_items` | 5 | recipe_version_id, product_id, quantity, unit |
| `products` | 8 | name, sku (unique), category, unit, reorder_level, is_active, current_stock |
| `stock_movements` | 10 | product_id, movement_type (enum), quantity, unit, running_balance, reference_type/id, reason, created_by |
| `inventory_holds` | 5 | order_id, product_id, quantity, status (enum), expires_at |
| `restaurant_tables` | 7 | table_number (unique), capacity, section, is_active, status (enum) |
| `table_sessions` | 6 | table_id, staff_id, status, started_at, closed_at, metadata (jsonb) |
| `bill_splits` | 12 | invoice_id, order_id, split_type (enum), guest_name, subtotal, tax, service_charge, discount, total_amount, payment_status |
| `split_items` | 7 | split_id, order_item_id, item_name, quantity, unit_price, total_price |
| `split_payments` | 10 | split_id, payment_method, amount, transaction_reference, notes, processed_by, idempotency_key, paid_at |
| `fonepay_transactions` | 13 | invoice_id, transaction_id (unique), amount, qr_generated_at, qr_expiry, status, verified_at, payment_log_id, gateway_reference (unique), paid_amount, paid_at |
| `pricing_rules` | 12 | name, rule_type, applies_to, value_type, value, start/end_date, days_of_week, is_active |
| `room_mappings` | 6 | pos_room_id (unique), website_room_id (unique), website_room_name — sync bridge |
| `sync_logs` | 15 | direction, event_type, entity_type, entity_id, external_id, status, request/response_body (jsonb), error_message, retry_count, max_retries, source, idempotency_key |
| `sync_queue` | 11 | sync_log_id, direction, event_type, payload (jsonb), retry_count, max_retries, next_retry_at, last_error, status |
| `external_bookings` | 6 | pos_booking_id (FK), source, external_booking_id (unique per source), last_sync_at |
| `system_events` | 5 | event_type, entity_type, entity_id, payload (jsonb) |
| `audit_logs` | 10 | user_id, action, entity_type, entity_id, previous/new_state (jsonb), reason, metadata, severity |
| `transition_history` | 7 | Generic state transition log: entity_type, entity_id, from/to_state, triggered_by, reason |
| `workflow_state` | 9 | entity_type, entity_id, current_step, status, context (jsonb) |
| `workflow_logs` | 7 | workflow_id, from/to_step, action, actor_id, metadata (jsonb) |
| `idempotency_keys` | 3 | key_hash+operation (composite PK), result — crash-safe dedup |
| `credit_customers` | (from code) | name, phone, total_balance, outstanding, last_payment |
| `housekeeping_tasks` | (from code) | room_id, assigned_to, task_type, status, priority, notes |
| `maintenance_tasks` | (from code) | room_id, asset_type, description, status, priority, assigned_to, costs |
| `suppliers` | (from code) | name, contact, phone, email, address, tax_id, payment_terms |
| `purchase_orders` | (from code) | po_number, supplier_id, status, order/expected/received dates |
| `purchase_order_items` | (from code) | purchase_order_id, product_id, product_name, quantity, unit, prices, received_quantity |

### Functions (40+)
Key functions:
- `create_booking()` — creates booking with idempotency check
- `create_room_service()` — adds room service
- `process_check_in()` / `process_check_out()` — state machine with idempotency
- `process_cash_payment()` — crash-safe cash payment (create_intent + confirm)
- `process_payment()` — full payment processing with idempotency and resume support
- `reverse_payment()` — payment reversal with ledger
- `confirm_payment()` / `create_payment_intent()` — 2-phase commit payment
- `create_invoice()` / `generate_invoice()` — invoice lifecycle
- `record_stock_movement()` — inventory with running balance and reorder alerts
- `reserve_inventory()` / `release_inventory()` — inventory reservation
- `update_room_status()` — room state machine
- `log_sync_entry()` — sync logging
- `link_external_booking()` — sync bridge
- `mark_queue_*` — sync queue state machine
- `transition_order_status()` — order state machine
- `update_booking_dates()` — used by sync
- `cancel_external_booking()` — sync bridge
- `write_frontend_audit()` — audit from client
- `log_fonepay_transaction()` / `update_fonepay_transaction()` — payment tracking
- `create_system_event()` — event sourcing
- `check_idempotency_strict()` / `mark_idempotency()` / `update_idempotency_result()` — idempotency framework

### Triggers
- `trg_fonepay_payment_notify` — publishes realtime events on payment confirmation
- `trg_fonepay_qr_expiry` — auto-sets QR expiry (10 min default)
- `trigger_check_invoice_locked` — prevents financial changes to locked invoices
- `trigger_check_order_items_locked` — prevents modifications to invoiced items
- `trigger_audit_order_status` — auto-logs order status changes
- `trigger_system_event_order` — emits system events on order status changes
- `trg_update_product_stock` — maintains running stock balance

### RLS Pattern
- **public** can SELECT active `rooms`, `room_types`, `menu_items`, `menu_categories`, `restaurant_tables`
- **authenticated** has full CRUD on most business tables
- **project_admin** (`is_project_admin()` → role='admin' in `user_profiles`) has elevated access
- **Blocked tables** (`room_mappings`, `external_bookings`, `fonepay_transactions`, `sync_logs`, `sync_queue`, `idempotency_keys`): blocked for direct client access, only accessible via RPC/edge functions or project_admin
- **`table_sessions`**: staff can read all, but only update own sessions
- **`audit_logs`**: two insert policies (by user_id match and authenticated), admin can read all

## C. Schema Comparison: Rooms

| Aspect | Website | POS |
|---|---|---|
| Room ID | UUID | UUID |
| Model | Flat (23 columns including room_type as text, amenities as array) | Normalized (rooms + room_types with FK) |
| Room Type | `room_type` (text field) | `room_type_id` → `room_types` table (code enum + name + base_price + amenities) |
| Status | `availability_status` (text): 'available', 'occupied', 'maintenance' | `status` (room_status enum): available, reserved, booked, occupied, partial_paid, fully_paid, cleaning, maintenance |
| Pricing | `price_per_night` + `seasonal_pricing` (jsonb) + `discount_percent` | Via `room_types.base_price` + `pricing_rules` table |
| Description | `description`, `policies`, `room_size`, `bed_type`, `has_ac`, `floor_number`, `amenities` (text[]) | All in `room_type` or `image_url` on rooms |
| Images | Via `room_images` (separate table, FK → rooms) | `image_url` on rooms + `image_url` on room_types |
| Active flag | `is_active` + soft-delete via `deleted_at` | `is_active` |
| Mapped | No room_mapping field | Via `room_mappings` table (pos_room_id ↔ website_room_id) |

## D. Schema Comparison: Bookings

| Aspect | Website | POS |
|---|---|---|
| Booking ID | UUID | UUID |
| Guest Info | `guest_name`, `guest_email`, `guest_phone` | `guest_name`, `guest_phone` (no guest_email field found) |
| Date Range | `check_in`/`check_out` (date) | `check_in`/`check_out` (timestamptz) |
| Status | `booking_status` (text): pending_payment, confirmed, cancelled, checked_in, checked_out | `status` (booking_status enum): pending, confirmed, checked_in, checked_out, cancelled, no_show |
| Payment | `payment_status` (text), `total_price`, `advance_amount`, `balance_amount` | `total_amount`, `paid_amount` |
| Pricing Detail | `nightly_rate` | `nightly_rate` |
| Source | `source` (text): 'website' or 'pos' + `pos_booking_id` (text) | Not tracked (POS is origin) |
| Hold/Payment | `hold_expires_at`, `active_prn` — Fonepay hold | No hold mechanism (different payment flow) |
| Adult/Child | `adults`, `children` | `adults`, `children` |
| Idempotency | Not on bookings table | `idempotency_key` (unique) on bookings |
| Booking Number | Not present | `booking_number` (unique, auto-generated) |
| Linked Rooms | Via FK `room_id` → `rooms` | Via FK `room_id` → `rooms` |
| Room Services | Not present | `room_services` table (FK → bookings) |

## E. Key Architectural Differences

1. **Payment Flow**: Website uses a booking-level payment (Fonepay QR → `payments` → `confirm_booking_payment`). POS uses invoice-level payment (create_order → create_invoice → process_payment). The Website has advance/balance amount tracking; POS tracks total_amount and paid_amount.
2. **Idempotency**: POS has a mature idempotency framework (`idempotency_keys` table with SHA-256 hashing, crash-safe 2-phase commit). Website has no equivalent.
3. **Sync Infrastructure**: POS has dedicated `room_mappings`, `sync_logs`, `sync_queue`, `external_bookings` tables. Website has `sync_events` table with processed/retry tracking.
4. **Real-time**: POS uses `system_events` + Realtime subscriptions + replay + duplicate suppression. Website has no real-time subscriptions.
5. **Offline**: POS has IndexedDB mutation queue with circuit breaker, cross-tab leader election. Website has no offline support.
