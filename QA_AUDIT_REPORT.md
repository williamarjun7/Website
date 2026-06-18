=====================================================================
  ADMIN CAPABILITIES — FULL QA AUDIT REPORT
  Highlands Motel & Cafe
=====================================================================

Audit date: June 18, 2026
SDK: @insforge/sdk@1.1.5
Backend: InsForge (https://6aiag3ra.us-east.insforge.app)
Frontend: React + Vite + TypeScript
Auth: InsForge Auth (Supabase-compatible)

=====================================================================
  VERIFIED WORKING FEATURES
=====================================================================

AUTHENTICATION
──────────────
✅ Login         — signInWithPassword() → POST /api/auth/sessions
                  src/services/authService.ts:12, AdminLogin.tsx:37
                  SDK call exists, session saved server-side.

✅ Signup        — signUp() → POST /api/auth/users
                  src/services/authService.ts:28, AdminSignup.tsx:36
                  Handles requireEmailVerification flag. PASS.

✅ Email Verification — verifyEmail({email, otp}) → POST /api/auth/email/verify
                       src/services/authService.ts:44, AdminVerify.tsx
                       OTP code entry, 6-digit validation. PASS.

✅ Password Reset — sendResetPasswordEmail() → POST /api/auth/email/send-reset
                   src/services/authService.ts:109, AdminLogin.tsx:21

✅ Session Persistence — storage: localStorage added to SDK client
                        src/services/insforge.ts:14

✅ Protected Routes — AdminGate.tsx guards all /admin/* with isAuthenticated()
                     src/pages/admin/AdminGate.tsx:9-15

✅ Logout — signOut() → POST /api/auth/logout
           src/services/authService.ts:76, AdminLayout.tsx:34

ROOM MANAGEMENT
───────────────
✅ Create Room     — createRoom() → INSERT into rooms
                    src/services/roomService.ts:142
✅ Update Room     — updateRoom() → UPDATE rooms by id
                    src/services/roomService.ts:158
✅ Delete Room     — deleteRoom() → DELETE rooms by id (with cascade to room_images)
                    src/services/roomService.ts:175
✅ Upload Images   — uploadImage() → storage bucket site-assets
                    src/services/storageService.ts:6, Rooms.tsx:119
✅ Delete Images   — deleteRoomImage() → DELETE from room_images
                    src/services/roomService.ts:206
✅ Reorder Images  — updateRoomImageSortOrder() → UPDATE sort_order
                    src/services/roomService.ts:221
✅ Featured Room Display — RoomDetails.tsx:169, Rooms.tsx:237
✅ Hidden Room Behavior — getRooms() filters is_active = true; admin sees all
✅ Floor Auto-gen  — First digit of room_number → floor_number (Rooms.tsx:250)

All 18 fields verified in DB schema, TypeScript interface, and form:
  name, room_number, price_per_night, max_guests, room_type,
  bed_type, room_size, floor_number, has_ac, featured, maintenance,
  availability_status, discount_percent, description, amenities (TEXT[]),
  policies, is_active, seasonal_pricing (JSONB — unused in frontend)

BOOKING SYSTEM
──────────────
✅ Create Booking   — create-booking edge function with Zod validation + 3x retry
                     src/services/bookingService.ts:40
✅ View Bookings    — getAllBookings() with rooms join
                     src/pages/admin/Bookings.tsx
✅ Check-in Action  — updateBookingStatus(id, 'checked_in')
                     Admin Bookings.tsx:312
✅ Check-out Action — updateBookingStatus(id, 'checked_out')
                     Admin Bookings.tsx:329
✅ Cancel Booking   — updateBookingStatus(id, 'cancelled')
                     Admin Bookings.tsx:319
✅ Booking Search   — Filters by guest_name, guest_email, id
                     Admin Bookings.tsx:50-56
✅ Booking Filter   — Status dropdown: booking_status + payment_status
                     Admin Bookings.tsx:58-62
✅ CSV Export       — Client-side CSV generation, download link
                     src/utils/csv.ts, Bookings.tsx:165-191
✅ Pagination       — 10 items/page, prev/next + page buttons
                     Admin Bookings.tsx:354-391

FONEPAY PAYMENTS (REAL — all edge functions verified)
───────────────
✅ QR Generation    — generateQrPayment() → fonepay-payment edge function
                     src/services/fonepayService.ts:17
✅ Web Payment      — generateWebPayment() → fonepay-payment edge function
                     src/services/fonepayService.ts:43
✅ QR Verification  — verifyQrPayment() → fonepay-payment edge function
                     src/services/fonepayService.ts:65
✅ Web Verification — verifyWebPayment() → fonepay-payment edge function
                     src/services/fonepayService.ts:91
✅ Fonepay HMAC     — Signature validation on payment verification
                     insforge/functions/fonepay-payment/index.ts
✅ Tax Refund API   — postTaxRefund() → Fonepay Tax Refund endpoint
                     src/services/fonepayService.ts:125
✅ Payment Recovery — forceConfirmPayment() / forceExpireBooking()
                     src/services/adminRecoveryService.ts
                     Both call real edge function admin-recover-payment

EMAIL (REAL — via Resend)
─────
✅ Booking Confirmations — sendBookingConfirmation() → Resend API via edge function
                          src/services/fonepayService.ts:111
✅ Password Reset Emails — sendResetPasswordEmail() via InsForge Auth
                          src/services/authService.ts:109
✅ Verification Emails   — resendVerificationEmail() via InsForge Auth
                          src/services/authService.ts:60

CONTENT MANAGEMENT
─────────────────
✅ 29/29 Content Keys    — All fields render in ContentEditor
                          src/pages/admin/ContentEditor.tsx:38-68
✅ Per-field Save        — updateSiteContent() with upsert
                          ContentEditor.tsx:141
✅ Zod Validation        — safeParse per field with error toast
                          ContentEditor.tsx:129-137
✅ FAQ JSON Validation   — Custom JSON.parse with fallback
                          ContentEditor.tsx:116-127

All 29 content keys display correctly on customer pages:
  Home.tsx       — 14 keys (hero, features, cafe, CTA, rooms)
  About.tsx      — 2 keys (hero_title, hero_subtitle)
  Cafe.tsx       — 5 keys (hero, description, hours)
  Contact.tsx    — 5 keys (phone, email, address, check-in/out)
  FAQ.tsx        — 1 key (faq_questions)
  Footer.tsx     — 7 keys (tagline, contact, hours, cafe_hours)

IMAGE MANAGEMENT
────────────────
✅ Upload (site)        — uploadImage(file, 'site') → site-assets bucket
                         src/services/storageService.ts:6
✅ Upload (rooms)       — uploadImage(file, 'rooms') → site-assets/rooms/
                         Admin Rooms.tsx:119-166
✅ Upload (menu)        — uploadImage(file, 'menu') → site-assets/menu/
                         Admin Menu.tsx:146-173
✅ Display by type      — getSiteImagesByType('hero'|'cafe') on all customer pages
                         src/services/contentService.ts:66
✅ Delete (site)        — deleteSiteImage() → DELETE from site_images
                         Admin Images.tsx:120-125

CAFE MENU
─────────
✅ Create Category      — createCategory() → INSERT menu_categories
                         src/services/menuService.ts:96
✅ Update Category      — updateCategory() → UPDATE menu_categories
                         src/services/menuService.ts:111
✅ Delete Category      — deleteCategory() → DELETE menu_categories (hard)
                         src/services/menuService.ts:127
✅ Create Menu Item     — createMenuItem() → INSERT menu_items
                         src/services/menuService.ts:141
✅ Update Menu Item     — updateMenuItem() → UPDATE menu_items
                         src/services/menuService.ts:156
✅ Delete Menu Item     — deleteMenuItem() → soft delete (sets deleted_at)
                         src/services/menuService.ts:172
✅ Toggle Availability  — toggleItemAvailability() ↔ available boolean
                         src/services/menuService.ts:186
✅ Menu Image Upload    — uploadImage(file, 'menu') on item create/edit
                         Admin Menu.tsx:146-173
✅ Customer Sync        — Cafe.tsx reads from getFullMenu()
                         src/pages/Cafe.tsx:36

=====================================================================
  PARTIALLY IMPLEMENTED
=====================================================================

⚠️ availability_status field — Form exists, DB column exists, RoomDetails
   displays it, but:
   - NOT displayed on customer room listing (Rooms.tsx)
   - NOT used in getAvailableRooms() for blocking bookings
   - NOT checked in booking flow (rooms with 'occupied'/'reserved'
     status can still be booked if dates are free)
   Files: roomService.ts:112-139, Rooms.tsx (customer)

⚠️ Discount pricing — Frontend applies discount_percent everywhere via
   getEffectivePricePerNight() in bookingService.ts:182, but the backend
   edge function create-booking/index.ts:198 calculates total_price using
   raw room.price_per_night, IGNORING discount_percent. BUG: customer sees
   discounted price but booking records use full price.
   File: insforge/functions/create-booking/index.ts:198

⚠️ About page body text — about_text content key exists in ContentEditor
   (line 41) but About.tsx:84-89 never reads or displays it. All body text
   is hardcoded. Admin edits = zero effect.
   Files: ContentEditor.tsx:41, About.tsx:84-89

⚠️ Home page featured rooms — featured flag exists in DB and admin form,
   but Home.tsx:35 ignores it. Shows first 3 rooms by room_number instead
   of featured=true rooms.
   File: Home.tsx:35

⚠️ Booking status transitions — updateBookingStatus() has NO state machine
   validation. Any status can be set to any other status (e.g., checked_out
   → confirmed). DB CHECK constraint only validates allowed values, not
   transitions.
   File: bookingService.ts:105-122

⚠️ Price filter on customer room listing — Uses base price_per_night
   instead of getEffectivePricePerNight(). Discounted rooms show in wrong
   price bracket during search.
   File: Rooms.tsx (customer):62-67

⚠️ Room image deletion — deleteRoomImage() removes DB record but NEVER
   calls deleteImage() to remove file from storage bucket. Orphaned files
   accumulate. Same issue with deleteSiteImage() in Images.tsx.
   Files: roomService.ts:206-218, Images.tsx:120-125

=====================================================================
  NOT IMPLEMENTED
=====================================================================

❌ eSewa payment integration — Not referenced anywhere in codebase.
   No service file, no env vars, no UI option. Booking only offers
   fonepay_qr, fonepay_web, pay_at_property.

❌ toggleImageActive UI — Service function exists in contentService.ts:149
   but no toggle UI button in Images.tsx. Users cannot deactivate images
   without deleting them.

❌ About page body text — about_text key exists in ContentEditor but is
   NEVER consumed by About.tsx (see Partially Implemented).

❌ Home page featured rooms — featured flag has zero effect on homepage
   room selection (see Partially Implemented).

❌ Gallery/Exterior image types — These image types can be uploaded via
   admin Images page under "Gallery Images" and "Exterior & Property"
   sections, but no customer page displays them. Gallery page doesn't
   exist; exterior images are never referenced in any component.

=====================================================================
  UI EXISTS BUT BACKEND MISSING
=====================================================================

🚧 Create/Edit room form has NO JavaScript validation — HTML5 required
   only. No server-side validation on createRoom()/updateRoom(). DB has
   NO CHECK constraints on rooms table (price > 0, guests > 0, discount
   between 0-100). Silent failures.
   Files: roomService.ts:142-172, Rooms.tsx:246-308

🚧 deleteRoom() has no safety check — No "has active bookings?" guard.
   Deleting a room with existing bookings silently orphans records because
   there is NO foreign key from bookings.room_id → rooms.id.
   Files: roomService.ts:175-187, migrations

🚧 Cancel booking doesn't release hold — cancelBooking() sets status to
   'cancelled' but doesn't release active_prn or trigger Fonepay tax
   refund. Held payments remain in limbo.
   File: bookingService.ts:125-139

=====================================================================
  SECURITY CONCERNS
=====================================================================

🔴 .env file with production credentials committed to version control
   — Contains Fonepay merchant code, secret, username, password,
   InsForge base URL, and anon key. Should be .gitignored.
   File: .env

🔴 No rate limiting on login — signInWithPassword() can be spammed
   with no client-side throttle or backoff. Backend rate limiting unknown.
   File: AdminLogin.tsx

🔴 PaymentResult relies on sessionStorage — Payment confirmation data
   stored in sessionStorage can be lost (privacy mode, storage cleared).
   Page shows blank skeleton in that case.
   File: PaymentResult.tsx:45-53

🔴 No error bounds on booking/payment pages — Network failure during
   payment verification causes unhandled promise rejection.
   Files: Booking.tsx, PaymentResult.tsx

🔴 Cron job authenticate via static API key — payment-reconciliation
   edge function uses x-reconcile-key header, static key validation.
   Key management not checked.

=====================================================================
  DATABASE ISSUES
=====================================================================

📦 Missing DDL in version control:
   - site_images table — no CREATE TABLE in any migration
   - menu_items table — no CREATE TABLE in any migration
   - menu_categories table — no CREATE TABLE in any migration
   - menu_items.deleted_at column — no ALTER TABLE in any migration
   These tables exist in the live DB but their DDL is not reproducible.

📦 No CHECK constraints on rooms table:
   - No price_per_night > 0
   - No max_guests > 0
   - No discount_percent BETWEEN 0 AND 100
   - No room_number format validation

📦 No foreign key: bookings.room_id → rooms.id
   - Room deletion silently orphans booking records
   - Exclusion constraint still references orphaned room_ids

📦 seasonal_pricing column is dead — Column exists in DB (JSONB) and
   TypeScript interface but has zero frontend usage. No form field,
   no display, no logic.

📦 alt_text column on room_images is dead — Added in migration 014
   but never populated or displayed.

=====================================================================
  SYNCHRONIZATION ISSUES
=====================================================================

🔗 Home.tsx: featured rooms ignored (HIGH)
   Admin sets featured=true → homepage still shows first 3 by room_number

🔗 About.tsx: about_text ignored (HIGH)
   Admin edits about_text in ContentEditor → About page unchanged

🔗 RoomDetails.tsx: check-in/out hardcoded (MEDIUM)
   Shows Check-in: 02:00 PM / Check-out: 11:00 AM hardcoded
   Contact.tsx correctly reads from site_content

🔗 Cancellation policy contradiction (MEDIUM)
   RoomDetails.tsx says "48 hours"
   Terms.tsx, FAQ.tsx, GuestInfoStep.tsx say "12 hours"

🔗 BookingConfirmation.tsx: dummy contact info (LOW)
   Shows +977-98XXXXXXXX and info@highlands-motel.com
   Rest of site uses real values from site_content

🔗 menuService.getFullMenu() filters available=true (CRITICAL BUG)
   Admin toggles item off → it disappears from admin UI completely
   No way to re-enable without direct DB access
   File: menuService.ts:27

=====================================================================
  PAYMENT ISSUES
=====================================================================

💳 eSewa — NOT INTEGRATED. Zero code exists.

💳 Discount not applied server-side — create-booking edge function
   calculates total_price using raw price_per_night, ignoring
   discount_percent. Customer pays discounted price on frontend but
   backend records full price. Booking total is WRONG.
   File: insforge/functions/create-booking/index.ts:198

💳 cancelBooking() doesn't trigger Fonepay tax refund — No refund
   API call on cancellation. Payments remain unreleased.

💳 updateBookingStatus() has no state machine — Invalid transitions
   possible (confirmed → checked_out skipping checked_in).
   File: bookingService.ts:105-122

💳 getAllBookings() has no server-side pagination — Returns all
   rows. Performance issue with thousands of bookings.
   File: bookingService.ts:89-102

=====================================================================
  EMAIL ISSUES
=====================================================================

📧 Booking confirmation email — Sent via Resend through edge function.
   Verified working for all payment methods including pay_at_property.
   Note: pay_at_property sends confirmation BEFORE payment is collected.

📧 Contact form — On Contact.tsx, mailto: link used instead of
   server-side form submission. No email integration for contact form.

=====================================================================
  PRODUCTION BLOCKERS
=====================================================================

🚫 MUST FIX BEFORE LAUNCH:
   1. .env file committed to git — remove from tracking
   2. Discount pricing desync — backend ignores discount_percent
   3. About page about_text not displayed — broken content sync
   4. Home page featured flag ignored — broken content sync
   5. Menu items disappear on toggle off — critical UX bug
   6. Image deletion orphans storage files — bloat over time
   7. No room form validation — bad data can enter DB
   8. Room deletion orphans bookings — data integrity risk
   9. No state machine on booking status updates

🚫 SHOULD FIX:
   10. Cancellation policy contradiction (48h vs 12h)
   11. BookingConfirmation dummy contact info
   12. RoomDetails hardcoded check-in/out times
   13. Customer room price filter ignores discounts
   14. PaymentResult fragile sessionStorage reliance
   15. Missing error boundaries on booking/payment pages

🚫 NICE TO HAVE:
   16. toggleImageActive UI
   17. Availability_status integration in booking flow
   18. Gallery/exterior image display on customer pages
   19. eSewa integration
   20. Contact form email submission (non-mailto)
   21. Missing DDL files for 3 tables in version control

=====================================================================
  END OF AUDIT REPORT
=====================================================================
