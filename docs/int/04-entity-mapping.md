# Phase 4: Entity Mapping

## A. Room Entity

| Field | Website (`rooms`) | POS (`rooms`) | Mapping Notes |
|---|---|---|---|
| ID | `id` (UUID) | `id` (UUID) | `room_mappings` bridges them |
| Room Number | `room_number` | `room_number` | Direct 1:1 mapping |
| Floor | `floor_number` | `floor` | Direct |
| Active | `is_active` + `deleted_at` | `is_active` | Website has soft-delete |
| Status | `availability_status` (text): available, occupied, maintenance | `status` (enum): available, reserved, booked, occupied, partial_paid, fully_paid, cleaning, maintenance | Website has 3 states, POS has 8. Must map: Website `occupied` → POS multiple states |
| Description | `description` | — | Website only |
| Bed Type | `bed_type` | — | Website only |
| AC | `has_ac` | — | Website only |
| Price | `price_per_night` + seasonal_pricing jsonb + discount_percent | Via `room_types.base_price` + `pricing_rules` | DIFFERENT: Website has flat price per room. POS has type-based pricing. |
| Max Guests | — | Via `room_types.max_guests` | POS only |
| Amenities | `amenities` (text[]) | Via `room_types.amenities` (jsonb) | Different storage format |
| Policies | `policies` | — | Website only |
| Room Size | `room_size` | — | Website only |
| Featured | `featured` | — | Website only |
| Images | Via `room_images` (separate table) | `image_url` on rooms + `image_url` on room_types | Different storage models |
| Room Type | `room_type` (text) | `room_type_id` → `room_types` | Denormalized vs normalized |
| Maintenance | `maintenance` | status='maintenance' | Different implementation |
| Mapped ID | — | Via `room_mappings` | POS tracks the link |

**Mapping Strategy:** Each Website room → one POS room (via `room_mappings`). Room numbers are the natural key for initial pairing. The POS room_types map to Website room_type text values (standard→"Standard", deluxe→"Deluxe", etc.).

---

## B. Room Type Entity

| Field | Website (embedded in rooms) | POS (`room_types`) | Mapping Notes |
|---|---|---|---|
| ID | — (text value in `rooms.room_type`) | `id` (UUID) | POS has first-class room_types |
| Name | `room_type` text value | `name` | Direct match by name |
| Code | — | `code` (enum) | POS only |
| Base Price | `price_per_night` | `base_price` | Website price is per-room, POS per-type |
| Max Guests | — | `max_guests` | POS only |
| Amenities | `amenities` (text[]) | `amenities` (jsonb) | Different format |
| Image | — | `image_url` | POS only (Website has room_images per room) |

**Gap:** Website doesn't have room types as separate entities. The `room_type` field is a text tag. To sync properly, Website would need either a room_types table or at least a controlled vocabulary.

---

## C. Booking Entity

| Field | Website (`bookings`) | POS (`bookings`) | Mapping Notes |
|---|---|---|---|
| ID | `id` (UUID) | `id` (UUID) | `external_bookings.external_booking_id` bridges them |
| Room | `room_id` → Website rooms | `room_id` → POS rooms | Cross-DB, bridged via `room_mappings` |
| Guest Name | `guest_name` | `guest_name` | Direct |
| Guest Email | `guest_email` | — | Website only (for customer) |
| Guest Phone | `guest_phone` | `guest_phone` | Direct |
| Check-In | `check_in` (date) | `check_in` (timestamptz) | Type mismatch: date vs timestamptz |
| Check-Out | `check_out` (date) | `check_out` (timestamptz) | Type mismatch: date vs timestamptz |
| Adults | `adults` | `adults` | Direct |
| Children | `children` | `children` | Direct |
| Status | `booking_status` (text): pending_payment, confirmed, cancelled, checked_in, checked_out | `status` (enum): pending, confirmed, checked_in, checked_out, cancelled, no_show | Website lacks `no_show`, POS lacks `pending_payment`. Mapping: pending_payment→pending, confirmed→confirmed |
| Nightly Rate | `nightly_rate` | `nightly_rate` | Direct |
| Total Price | `total_price` | `total_amount` | Different name |
| Paid Amount | `advance_amount`, `balance_amount` | `paid_amount` | Different models: Website tracks advance+balance, POS tracks total+paid |
| Payment Status | `payment_status` (text): unpaid, partially_paid, paid, refunded | — (calculated from paid_amount vs total_amount) | Different approach |
| Source | `source` (text): website, pos | — | Website tracks origin |
| POS ID | `pos_booking_id` (text) | — | Website links back to POS |
| Hold Expiry | `hold_expires_at` | — | Website Fonepay hold |
| PRN | `active_prn` | — | Website Fonepay reference |
| Notes | — | `notes` | POS only |
| Booking Number | — | `booking_number` (unique) | POS only |
| Created By | — | `created_by` → user_profiles | POS only |
| Idempotency Key | — | `idempotency_key` (unique) | POS only |

**Critical Gaps:**
1. **Guest Email**: Website captures email (required for customer booking). POS doesn't have this field — need to add or carry as metadata.
2. **Payment Model**: Website tracks advance_amount + balance_amount + payment_status. POS tracks total_amount + paid_amount. Different semantics — Website is "how much do they still owe", POS is "how much have they paid total".
3. **Status Mismatch**: `no_show` exists in POS but not Website. `pending_payment` exists in Website but not POS.
4. **Booking Number**: POS has human-readable booking numbers (e.g., `BKG-00001`). Website uses UUIDs. POS generates this; Website doesn't.

---

## D. Payment Entity

| Field | Website (`payments`) | POS (`payment_logs` / `payment_intents`) | Mapping Notes |
|---|---|---|---|
| ID | `id` (UUID) | `id` (UUID) | No cross-reference |
| Booking/Invoice | `booking_id` | `invoice_id` | Different parent entity |
| Amount | `amount` | `amount` | Direct |
| Method | `payment_method` (text) | `method` (enum) | Direct |
| Status | `status` (text): pending, verified, failed, refunded | `status` (enum on payment_intents): pending, processing, completed, failed, refunded, reversed | Similar semantics |
| PRN | `prn` (unique) | — | Website only (Fonepay reference) |
| Fonepay Trace | `fonepay_trace_id` | via `fonepay_transactions.gateway_reference` | Different table |
| Tax Refund | `tax_refund_status`, `tax_refund_amount` | — | Website only |
| Refund Reference | `refund_reference` | — | Website only |
| Processed By | — | `processed_by` → user_profiles | POS only |
| Idempotency Key | — | `idempotency_key` (unique) | POS only |
| Notes | — | `notes` | POS only |

**Key Difference:** Website has a single `payments` table per booking. POS has two-phase payment (intent → log) supporting split payments. Website payments are booking-level. POS payments are invoice-level.

---

## E. Menu Item / Menu Category Entity

| Field | Website (`menu_items` / `menu_categories`) | POS (`menu_items` / `menu_categories`) | Mapping Notes |
|---|---|---|---|
| Menu Item ID | UUID | UUID | Different databases |
| Name | `name` | `name` | Direct |
| Category | `category` (text, no FK) | `category_id` → menu_categories | Different model |
| Price | `price` | `price` | Direct |
| Available | `available` | `is_available` | Direct |
| Prep Time | `prep_time` | `preparation_time` | Direct |
| Image | `image` | `image_url` | Different column name, same concept |
| Description | — | `description` | POS only |
| Active | — | `is_active` | POS only |
| Modifiers | — | Via `menu_item_modifiers` | POS only |
| Recipes | — | Via `recipes` + `recipe_versions` + `recipe_items` | POS only |

**Observation:** Website menu items are a simplified read-only subset. Menu items likely need to sync one-way (POS → Website) since POS is where menu is managed.

---

## F. Customer / Guest Entity

| Field | Website | POS | Notes |
|---|---|---|---|
| Name | `bookings.guest_name` | `bookings.guest_name` | Embedded in booking |
| Email | `bookings.guest_email` | — | Website only |
| Phone | `bookings.guest_phone` | `bookings.guest_phone` | Embedded in booking |
| ID | — (identified by booking context) | — (identified by booking context) | No customer table in either system |

**Observation:** Neither system has a proper customer table. Guest data is denormalized into bookings. No way to track repeat customers across bookings. This is a shared gap.

---

## G. Image Entity

| Field | Website (`room_images` / `site_images`) | POS (`rooms.image_url` / `room_types.image_url`) | Notes |
|---|---|---|---|
| Room Images | Separate `room_images` table (FK → rooms) | Single `image_url` column on `rooms` table + `room_types.image_url` | Different model: Website supports multiple images per room, POS supports one |
| Site Images | `site_images` table (type: hero, cafe, gallery, exterior, other) | — | POS doesn't have website-content images |
| Menu Images | `menu_items.image` column | `menu_items.image_url` column | Single image per item |

**Mapping:** Website supports multiple room images, POS supports one. Multi-image rooms would need either truncation to one or POS storing only the primary image URL.

---

## H. Sync Infrastructure Entities

| Entity | Website | POS |
|---|---|---|
| Event Queue | `sync_events` (13 cols, jsonb payload, retry_count, max_retries, source) | `sync_queue` (11 cols, sync_log_id FK, retry tracking, last_error) |
| Activity Log | `sync_events` | `sync_logs` (15 cols, full request/response bodies, direction tracking) |
| Cross-reference | — | `external_bookings` (6 cols: pos_booking_id, source, external_booking_id, last_sync_at) |
| Room Mapping | — | `room_mappings` (6 cols: pos_room_id, website_room_id, website_room_name) |
| Audit Log | `audit_logs` (8 cols, simpler) | `audit_logs` (10 cols, richer: previous/new_state jsonb, severity) |
| Idempotency | — | `idempotency_keys` (3 cols: key_hash+operation PK, result) |

**Observation:** POS has a significantly more mature sync infrastructure with dedicated mapping tables and rich logging. Website has a simpler event-driven approach. A bidirectional sync would need to reconcile both — likely standardizing on POS's infrastructure as the sync source of truth.

---

## I. POS-Only Entities (No Website Equivalent)

| Entity | Purpose | Why POS Only |
|---|---|---|
| `room_types` | Normalized room type catalog | POS manages room classification |
| `room_services` | Food/drinks charged to room | POS operational feature |
| `room_state_transitions` | Room status change audit | POS room management |
| `invoices` / `invoice_items` | Billing | POS handles invoicing |
| `orders` / `order_items` | Food ordering | POS restaurant operations |
| `products` / `stock_movements` | Inventory | POS inventory management |
| `restaurant_tables` / `table_sessions` | Dine-in management | POS restaurant |
| `bill_splits` / `split_items` / `split_payments` | Bill splitting | POS restaurant |
| `menu_item_modifiers` | Menu customization | POS menu management |
| `recipes` / `recipe_versions` / `recipe_items` | Recipe management | POS kitchen operations |
| `pricing_rules` | Dynamic pricing | POS pricing engine |
| `workflow_state` / `workflow_logs` | Multi-step workflows | POS process automation |
| `system_events` | Event sourcing | POS real-time architecture |
| `user_profiles` | Staff management | POS staff operations |
| `credit_customers` | Credit accounts | POS business model |
| `housekeeping_tasks` | Housekeeping | POS operations |
| `maintenance_tasks` | Maintenance | POS operations |
| `suppliers` / `purchase_orders` | Procurement | POS supply chain |
| `fonepay_transactions` | POS Fonepay tracking | Separate merchant account |

## J. Website-Only Entities (No POS Equivalent)

| Entity | Purpose | Why Website Only |
|---|---|---|
| `site_content` | Page content management | Website CMS |
| `site_images` | Site imagery | Website CMS |
| `used_nonces` | Fonepay replay protection | Website Fonepay integration |
| `sync_events` | Event-driven sync | Website sync approach |
| `booking_conflicts` (VIEW) | Availability check | Website search |

## K. Shared Entities by Convention Only (No Direct Link)

| Entity | Website | POS | Link |
|---|---|---|---|
| Rooms | `rooms` + `room_images` | `rooms` + `room_types` | `room_mappings` |
| Bookings | `bookings` + `payments` | `bookings` + `invoices` + `payment_logs` | `external_bookings` |
| Menu Items | `menu_items` | `menu_items` + `recipes` | None (manual sync) |
| Menu Categories | `menu_categories` | `menu_categories` | None (manual sync) |
| Audit Logs | `audit_logs` | `audit_logs` | None (different schema) |
