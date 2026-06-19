# Phase 5: Gap Analysis

## Severity Levels
- **CRITICAL**: Blocks business operations — revenue loss, double-booking, data loss
- **HIGH**: Causes operational friction — manual workarounds exist, but error-prone
- **MEDIUM**: Missing convenience features — workflow inefficiency
- **LOW**: Nice-to-have — cosmetic or edge case

---

## G-1: Website → POS Booking Sync (CRITICAL)

**Gap:** When a customer books and pays on the Website, the booking does NOT reach the POS system. POS staff cannot see Website bookings in their motel dashboard.

**Impact:**
- Double-booking risk: POS staff can book the same room for overlapping dates
- Missed arrivals: Staff doesn't know a paying guest is arriving
- Customer service failure: Guest arrives but staff is unprepared

**Evidence:**
- `create-booking` edge function ends after payment confirmation
- No call to POS endpoint, no sync_event creation for POS direction
- `sync-webhook-sender` edge function exists but is not wired to `create-booking` flow
- POS staff manage rooms independently via `MotelPage.tsx`

**Fix Required:** Either extend `create-booking` to call POS after payment confirmation, or trigger sync_event that `sync-webhook-sender` delivers to POS.

---

## G-2: Guest Email Missing in POS (CRITICAL)

**Gap:** POS `bookings` table has no `guest_email` field. Website requires email for booking. When a Website booking syncs to POS, the guest email is lost.

**Impact:** POS cannot contact guests by email for confirmations, reminders, or marketing.

**Evidence:**
- `bookings` schema diff: Website has `guest_email` (text, not null), POS has no email field
- POS `booking-webhook` edge function receives email from Website but has nowhere to store it

**Fix Required:** Add `guest_email` column to POS `bookings` table.

---

## G-3: Payment Model Mismatch (HIGH)

**Gap:** Website tracks booking payments with advance_amount + balance_amount + payment_status. POS tracks total_amount + paid_amount. When a Website booking (already paid) syncs to POS, there's no way to represent "fully paid via Website" in the POS payment model.

**Impact:** POS may try to collect payment again for an already-paid booking, or mark it as unpaid.

**Evidence:**
- Website: `advance_amount` (12000) + `balance_amount` (0) + `payment_status` ('paid')
- POS: `total_amount` (12000) + `paid_amount` (0) → shows as unpaid
- No `payment_method` on POS bookings (only on invoices)
- Both have Fonepay, but different merchant accounts

**Fix Required:** POS needs to handle "externally paid" scenario. Options:
1. Add `paid_amount = total_amount` when creating POS booking from Website payment
2. Add `source_payment` field to POS booking marking it as pre-paid via Website
3. Create a zero-amount invoice or mark booking as fully_paid

---

## G-4: Room Type Model Mismatch (HIGH)

**Gap:** Website has denormalized room types (text field). POS has normalized `room_types` table with enum codes. Cross-system room type references are fragile.

**Impact:** Room type information can drift between systems. POS might change a type's name/code, breaking Website mappings.

**Evidence:**
- Website: `rooms.room_type` = text value ("Deluxe Room")
- POS: `room_types.code` = enum (deluxe), `room_types.name` = "Deluxe Room"
- No referential integrity between the two

**Fix Required:** Either add a room_types table to Website (normalized), or add a controlled vocabulary check constraint on Website `rooms.room_type`.

---

## G-5: Status Enum Mismatch (HIGH)

**Gap:** Booking and room status enums differ between systems, making status sync ambiguous.

**Booking Statuses:**
| Website | POS |
|---|---|
| `pending_payment` | `pending` |
| `confirmed` | `confirmed` |
| `checked_in` | `checked_in` |
| `checked_out` | `checked_out` |
| `cancelled` | `cancelled` |
| — | `no_show` |

**Room Statuses:**
| Website | POS |
|---|---|
| `available` | `available` |
| `occupied` | `occupied`, `partial_paid`, `fully_paid`, `cleaning` |
| `maintenance` | `maintenance` |
| — | `reserved`, `booked` |

**Impact:**
- POS `no_show` has no Website equivalent → Website won't reflect no-show status
- `pending_payment` → `pending` mapping drops payment context
- POS `cleaning` has no Website equivalent → Website shows occupied while room is being cleaned
- POS `partial_paid` / `fully_paid` mapped to Website `occupied` loses payment context

**Fix Required:** Define a canonical status mapping table. Add missing statuses to the narrower side.

---

## G-6: Pricing Discrepancy (HIGH)

**Gap:** Website calculates price differently than POS. Website uses `getEffectivePricePerNight()` = `price_per_night - (price_per_night × discount_percent / 100)`. POS uses `room_types.base_price` with `pricing_rules` (seasonal, weekday, weekend, holiday).

**Impact:** Same room, same dates → different prices on Website vs POS. Staff quoting a walk-in price may not match website.

**Evidence:**
- Website: price stored per room, discount is room-level percent
- POS: price stored per room type, discounts via separate `pricing_rules` table
- Website `seasonal_pricing` (jsonb) is stored but not used in `getEffectivePricePerNight()`
- Website `discount_percent` is flat 0-100, POS pricing_rules can be fixed_amount, percentage, or override_price

**Fix Required:** Align pricing engines or document intentional differences. If POS is source of truth for pricing, Website should either sync from POS pricing_rules or use a shared pricing API.

---

## G-7: Date/Time Type Mismatch (MEDIUM)

**Gap:** Website uses `date` type for check_in/check_out. POS uses `timestamptz`.

**Impact:** Timezone ambiguity in sync. Website dates have no associated timezone. POS timestamps could be interpreted in any timezone.

**Evidence:**
- Website: `check_in date`, `check_out date`
- POS: `check_in timestamptz`, `check_out timestamptz`

**Fix Required:** Standardize on timestamptz. Website should either change column types or adopt timezone convention (e.g., Nepal Standard Time UTC+5:45, or treat all dates as `00:00:00+05:45`).

---

## G-8: Website Fonepay Hold vs POS Payment (MEDIUM)

**Gap:** Website uses Fonepay payment hold mechanism (`hold_expires_at`, `active_prn`) for booking reservation. POS has no equivalent concept.

**Impact:** Website booking holds a room temporarily during payment, but if it syncs to POS, POS might release the room regardless (since POS doesn't do holds).

**Evidence:**
- Website: `bookings.hold_expires_at`, `bookings.active_prn`
- POS: no hold concept; booking status goes `pending` → `confirmed` directly
- POS `booking-webhook` creates booking immediately — no hold phase

**Fix Required:** POS `booking-webhook` should support a pending/hold state for Website bookings that haven't completed payment yet, OR only sync confirmed (paid) bookings.

---

## G-9: No Idempotency on Website (MEDIUM)

**Gap:** POS has a mature idempotency framework (`idempotency_keys` table, `check_idempotency_strict`, `mark_idempotency`). Website has none.

**Impact:** Duplicate sync events (e.g., from retries) can create duplicate bookings, double-charge, or corrupt state. Currently prevented by unique constraints but without graceful handling.

**Evidence:**
- POS: `idempotency_keys` table with SHA-256 hashing across all critical RPCs
- Website: Fonepay nonce (`used_nonces`) for payment replay protection only
- Website `booking-webhook` edge function receives `idempotency_key` in payload but doesn't use it for dedup — only for logging

**Fix Required:** Implement idempotency on Website for:
1. `booking-webhook` edge function (receiving POS push)
2. `create-booking` edge function (local booking creation)

---

## G-10: Room Capacity Missing on Website (MEDIUM)

**Gap:** Website `rooms` has no max_guests field. POS tracks via `room_types.max_guests`.

**Impact:** Website cannot enforce guest limits during booking. Customer can book 10 adults for a single room.

**Evidence:**
- Website: `rooms` table has no guest capacity field
- POS: `room_types.max_guests` exists as integer

**Fix Required:** Add `max_guests` to Website `rooms` table (or derived from room_type).

---

## G-11: No Customer Table (MEDIUM)

**Gap:** Neither system has a first-class customer/guest table. Guest data is embedded in each booking.

**Impact:** Cannot track repeat customers, guest preferences, booking history, or loyalty. POS `credit_customers` table exists but only for credit accounts.

**Evidence:**
- Website: `bookings.guest_name`, `bookings.guest_email`, `bookings.guest_phone`
- POS: `bookings.guest_name`, `bookings.guest_phone`
- No `guests` or `customers` table in either system

**Fix Required:** Out of scope for sync but worth noting for future.

---

## G-12: Sync Acknowledgment (LOW)

**Gap:** POS sync is fire-and-forget. No confirmation loop verifies that the Website successfully processed the sync.

**Impact:** Silent sync failures. POS thinks data is synced, Website may have rejected it.

**Evidence:**
- `pushBookingToWebsite()` in `booking-sync.ts` resolves on HTTP 200
- No follow-up verification
- `sync_logs` table records request/response but only on the POS side

**Fix Required:** Add confirmation readback — after sync, verify by fetching the Website booking and comparing fields.

---

## G-13: Menu/Product Sync Missing (LOW)

**Gap:** Menu items are maintained independently in both systems. Website menu items don't reflect POS recipe costs, modifier options, or availability changes.

**Impact:** Menu prices or availability may differ between Website and POS.

**Evidence:**
- Website: `menu_items` with independent CRUD
- POS: `menu_items` + `menu_item_modifiers` + `recipes` + `products` integrated
- No sync mechanism exists for menu data

**Fix Required:** One-way sync (POS → Website) for menu items and categories, or use POS as source of truth.

---

## G-14: Room Images Only One-Way (LOW)

**Gap:** Website supports multiple room images. POS supports only one. Syncing room images from Website to POS would lose data.

**Impact:** POS room display is less rich.

**Evidence:**
- Website: `room_images` (FK → rooms), multiple per room
- POS: `rooms.image_url` (single), `room_types.image_url` (single)

**Fix Required:** Change POS to support multiple images, or designate a primary image for sync.

---

## G-15: Seasonal Pricing Unused (LOW)

**Gap:** Website `rooms.seasonal_pricing` (jsonb) column exists but `getEffectivePricePerNight()` doesn't read it — only uses `discount_percent`. Seasonal pricing is effectively dead code.

**Impact:** Pricing rules in Website are not fully functional. Staff who set seasonal pricing may be confused why prices don't change.

**Evidence:**
- `RoomsPage.jsx` / `RoomDetail.jsx`: use `getEffectivePricePerNight()` → uses only `discount_percent`
- `seasonal_pricing` never referenced in price calculation logic
- POS has active `pricing_rules` table with seasonal support

**Fix Required:** Either remove the column or wire it into price calculation. Better: use POS pricing_rules as the source of truth.

---

## Summary: Gap Priority Matrix

| ID | Gap | Severity | Effort | Existing Infrastructure |
|---|---|---|---|---|
| G-1 | Website → POS booking sync | CRITICAL | Medium | `sync_events` table, `sync-webhook-sender` function, POS `booking-webhook` exist |
| G-2 | Guest email in POS | CRITICAL | Low | Just need DB migration + edge function update |
| G-3 | Payment model mismatch | HIGH | Medium | Add paid_amount handling in POS booking-webhook |
| G-4 | Room type model mismatch | HIGH | Low | Add room_types table or constraint to Website |
| G-5 | Status enum mismatch | HIGH | Low | Status mapping table + add missing statuses |
| G-6 | Pricing discrepancy | HIGH | High | Either sync pricing_rules or align algorithms |
| G-7 | Date/time type mismatch | MEDIUM | Low | Standardize on timestamptz |
| G-8 | Fonepay hold vs payment | MEDIUM | Low | Only sync confirmed bookings |
| G-9 | Idempotency on Website | MEDIUM | Medium | Port idempotency_keys pattern to Website |
| G-10 | Room capacity missing | MEDIUM | Low | Add max_guests to Website rooms |
| G-11 | No customer table | MEDIUM | High | Out of scope for sync (noted) |
| G-12 | Sync acknowledgment | LOW | Low | Add verification readback |
| G-13 | Menu/product sync | LOW | Medium | Add one-way sync |
| G-14 | Room images only one-way | LOW | Low | Store primary image only |
| G-15 | Seasonal pricing unused | LOW | Low | Remove or wire it up |

**Immediate Action Items (CRITICAL):**
1. G-1: Wire Website booking creation to notify POS
2. G-2: Add guest_email column to POS bookings

**High Priority (PHASE 1):**
3. G-3: Handle pre-paid Website bookings in POS
4. G-4: Normalize room type handling
5. G-5: Align status enums
6. G-6: Align pricing or document divergence
