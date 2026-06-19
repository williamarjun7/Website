# Graph Report - .  (2026-06-18)

## Corpus Check
- 103 files · ~209,477 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 333 nodes · 539 edges · 41 communities (37 shown, 4 thin omitted)
- Extraction: 78% EXTRACTED · 22% INFERRED · 0% AMBIGUOUS · INFERRED: 116 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Admin Pages & Dashboard|Admin Pages & Dashboard]]
- [[_COMMUNITY_Edge Functions & Payment Processing|Edge Functions & Payment Processing]]
- [[_COMMUNITY_Customer Pages & Navigation|Customer Pages & Navigation]]
- [[_COMMUNITY_Auth & Admin Gate|Auth & Admin Gate]]
- [[_COMMUNITY_Booking Flow & Database|Booking Flow & Database]]
- [[_COMMUNITY_Image & Content Management|Image & Content Management]]
- [[_COMMUNITY_Room Display & Management|Room Display & Management]]
- [[_COMMUNITY_Services & API Layer|Services & API Layer]]
- [[_COMMUNITY_Cafe Menu & Ordering|Cafe Menu & Ordering]]
- [[_COMMUNITY_Shared Utilities & Error Handling|Shared Utilities & Error Handling]]
- [[_COMMUNITY_Bookings Management Admin|Bookings Management Admin]]
- [[_COMMUNITY_Build & Config|Build & Config]]
- [[_COMMUNITY_Payment Recovery Admin|Payment Recovery Admin]]
- [[_COMMUNITY_Migrations & Schema|Migrations & Schema]]
- [[_COMMUNITY_Tailwind & UI Styling|Tailwind & UI Styling]]
- [[_COMMUNITY_Fonepay Payment Backend|Fonepay Payment Backend]]
- [[_COMMUNITY_Payment Reconciliation|Payment Reconciliation]]
- [[_COMMUNITY_Admin Layout & Components|Admin Layout & Components]]
- [[_COMMUNITY_Rate Limiting & Security|Rate Limiting & Security]]
- [[_COMMUNITY_InsForge Backend|InsForge Backend]]
- [[_COMMUNITY_Logo & Brand Assets|Logo & Brand Assets]]

## God Nodes (most connected - your core abstractions)
1. `handleInsforgeError()` - 65 edges
2. `handler()` - 13 edges
3. `MonitoringService` - 13 edges
4. `Highlands Motel & Cafe` - 11 edges
5. `InsForge Deno Edge Functions Backend` - 11 edges
6. `getSiteImagesByType()` - 9 edges
7. `getSiteContentMap()` - 9 edges
8. `uploadImage()` - 9 edges
9. `handler()` - 8 edges
10. `getRooms()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Cafe Menu Visual` --references--> `Highlands Motel & Cafe`  [INFERRED]
  src/assets/menu.png → README.md
- `Dynamic QR BILLING Integration Requirements` --conceptually_related_to--> `Fonepay Payment Gateway`  [INFERRED]
  Dynamic QR BILLING Integration Requirement billing.pdf → README.md
- `Highlands Motel & Cafe Logo` --references--> `Highlands Motel & Cafe`  [EXTRACTED]
  src/assets/logo.png → README.md
- `Dynamic QR BILLING Integration Requirements` --conceptually_related_to--> `fonepay-payment Edge Function`  [INFERRED]
  Dynamic QR BILLING Integration Requirement billing.pdf → README.md
- `handleImageUpload()` --calls--> `uploadImage()`  [INFERRED]
  src/pages/admin/Images.tsx → src/services/storageService.ts

## Hyperedges (group relationships)
- **Full-Stack Architecture** — README_md_vite_react_frontend, README_md_insforge_backend, README_md_insforge_postgresql, README_md_insforge_auth [EXTRACTED 1.00]
- **Payment System** — README_md_fonepay_payment, README_md_pay_at_property, README_md_fonepay_payment_fn, README_md_admin_recover_payment_fn, README_md_payment_reconciliation_fn [EXTRACTED 1.00]

## Communities (41 total, 4 thin omitted)

### Community 0 - "Admin Pages & Dashboard"
Cohesion: 0.09
Nodes (29): InsForge Backend Platform, admin-recover-payment Edge Function, Booking Flow, Chart.js, create-booking Edge Function, Fonepay Payment Gateway, fonepay-payment Edge Function, Highlands Motel & Cafe (+21 more)

### Community 1 - "Edge Functions & Payment Processing"
Cohesion: 0.1
Nodes (9): C(), getFAQ(), C(), loadData(), load(), getSiteContentMap(), getSiteImagesByType(), getRoomById() (+1 more)

### Community 2 - "Customer Pages & Navigation"
Cohesion: 0.11
Nodes (13): handleStatusUpdate(), refreshBookings(), getTotalPrice(), calculateAdvanceAmount(), calculateBalanceAmount(), calculateTotalPrice(), cancelBooking(), getAllBookings() (+5 more)

### Community 3 - "Auth & Admin Gate"
Cohesion: 0.12
Nodes (15): handleLogout(), handleResetPassword(), handleSubmit(), handleSignup(), handleResend(), handleVerify(), adminLogin(), adminLogout() (+7 more)

### Community 4 - "Booking Flow & Database"
Cohesion: 0.23
Nodes (18): handleCategorySubmit(), handleDeleteCategory(), handleDeleteItem(), handleItemSubmit(), handleToggleAvailability(), loadMenu(), handleInsforgeError(), createCategory() (+10 more)

### Community 5 - "Image & Content Management"
Cohesion: 0.19
Nodes (17): handleImageUpload(), confirmDelete(), handleAddImageToExistingRoom(), handleImageUpload(), handleRemoveExistingImage(), handleReorderImage(), handleSubmit(), loadRooms() (+9 more)

### Community 6 - "Room Display & Management"
Cohesion: 0.17
Nodes (13): useWebSocket(), handleVerifyClick(), onSubmit(), processPayment(), run(), createBooking(), generateQrPayment(), generateWebPayment() (+5 more)

### Community 7 - "Services & API Layer"
Cohesion: 0.21
Nodes (15): buildConfirmationHtml(), checkRateLimit(), confirmPayment(), errorResponse(), fetchWithTimeout(), generateSecurePrn(), getClientIp(), getCorsHeaders() (+7 more)

### Community 8 - "Cafe Menu & Ordering"
Cohesion: 0.21
Nodes (13): handleSave(), refreshContent(), handleDelete(), handleImageUpload(), handleSubmit(), loadImages(), addSiteImage(), deleteSiteImage() (+5 more)

### Community 9 - "Shared Utilities & Error Handling"
Cohesion: 0.18
Nodes (6): clearConfirmedBooking(), storeConfirmedBooking(), ConfirmationStep(), verify(), getBookingById(), verifyWebPayment()

### Community 11 - "Build & Config"
Cohesion: 0.33
Nodes (6): checkFonepayStatus(), checkRate(), errorResponse(), handler(), hmacSha512(), verifyFonepayResponse()

### Community 12 - "Payment Recovery Admin"
Cohesion: 0.38
Nodes (9): checkIdempotency(), checkRateLimit(), errorResponse(), getClientIp(), getCorsHeaders(), handler(), isOriginAllowed(), verifyHmacSignature() (+1 more)

### Community 13 - "Migrations & Schema"
Cohesion: 0.31
Nodes (7): handleForceConfirm(), handleForceExpire(), forceConfirmPayment(), forceExpireBooking(), invokeAdmin(), listStuckPayments(), searchBookingsAndPayments()

### Community 14 - "Tailwind & UI Styling"
Cohesion: 0.42
Nodes (8): checkRateLimit(), errorResponse(), getClientIp(), getCorsHeaders(), handler(), isOriginAllowed(), successResponse(), verifyAdminSession()

### Community 15 - "Fonepay Payment Backend"
Cohesion: 0.5
Nodes (7): checkRateLimit(), getExtension(), getTrustedClientIP(), handler(), rateLimitKey(), sanitizeFileName(), verifyImageMagicBytes()

### Community 18 - "Rate Limiting & Security"
Cohesion: 0.83
Nodes (3): getCorsHeaders(), handler(), isOriginAllowed()

### Community 19 - "InsForge Backend"
Cohesion: 0.83
Nodes (3): createHmacSignature(), handler(), toError()

## Knowledge Gaps
- **16 isolated node(s):** `Surkhet, Nepal`, `Tailwind CSS 3`, `React Router v7`, `React Hook Form + Zod`, `InsForge Auth (JWT)` (+11 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `handleInsforgeError()` connect `Booking Flow & Database` to `Edge Functions & Payment Processing`, `Customer Pages & Navigation`, `Auth & Admin Gate`, `Image & Content Management`, `Room Display & Management`, `Cafe Menu & Ordering`, `Shared Utilities & Error Handling`, `Migrations & Schema`?**
  _High betweenness centrality (0.240) - this node is a cross-community bridge._
- **Why does `getSiteContentMap()` connect `Edge Functions & Payment Processing` to `Cafe Menu & Ordering`, `Booking Flow & Database`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `getBookingById()` connect `Shared Utilities & Error Handling` to `Customer Pages & Navigation`, `Booking Flow & Database`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Are the 56 inferred relationships involving `handleInsforgeError()` (e.g. with `invokeAdmin()` and `adminLogin()`) actually correct?**
  _`handleInsforgeError()` has 56 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Surkhet, Nepal`, `Tailwind CSS 3`, `React Router v7` to the rest of the system?**
  _16 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Admin Pages & Dashboard` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Edge Functions & Payment Processing` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._