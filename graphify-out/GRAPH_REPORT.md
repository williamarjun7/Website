# Graph Report - .  (2026-06-20)

## Corpus Check
- 104 files · ~243,218 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 472 nodes · 804 edges · 49 communities (43 shown, 6 thin omitted)
- Extraction: 84% EXTRACTED · 16% INFERRED · 0% AMBIGUOUS · INFERRED: 126 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Admin Pages & Layout|Admin Pages & Layout]]
- [[_COMMUNITY_Admin Data & Tables|Admin Data & Tables]]
- [[_COMMUNITY_Bidirectional Sync Pipeline|Bidirectional Sync Pipeline]]
- [[_COMMUNITY_Booking Creation Flow|Booking Creation Flow]]
- [[_COMMUNITY_Admin Content & Images|Admin Content & Images]]
- [[_COMMUNITY_Common UI Components|Common UI Components]]
- [[_COMMUNITY_Admin Forms & Menu|Admin Forms & Menu]]
- [[_COMMUNITY_Edge Functions Core|Edge Functions Core]]
- [[_COMMUNITY_Deploy Artifacts A|Deploy Artifacts A]]
- [[_COMMUNITY_Deploy Artifacts B|Deploy Artifacts B]]
- [[_COMMUNITY_Fonepay Payment|Fonepay Payment]]
- [[_COMMUNITY_Deploy Artifacts C|Deploy Artifacts C]]
- [[_COMMUNITY_Booking Schema|Booking Schema]]
- [[_COMMUNITY_Service Layer|Service Layer]]
- [[_COMMUNITY_Booking Webhook Deploy|Booking Webhook Deploy]]
- [[_COMMUNITY_InsForge Payment|InsForge Payment]]
- [[_COMMUNITY_POS Sync API|POS Sync API]]
- [[_COMMUNITY_Admin Recovery Service|Admin Recovery Service]]
- [[_COMMUNITY_Admin Auth Flow|Admin Auth Flow]]
- [[_COMMUNITY_Upload Validation|Upload Validation]]
- [[_COMMUNITY_UI Utilities|UI Utilities]]
- [[_COMMUNITY_Health Check|Health Check]]
- [[_COMMUNITY_TikTok Feed|TikTok Feed]]
- [[_COMMUNITY_Shared Edge Utils|Shared Edge Utils]]
- [[_COMMUNITY_Dead Letter Reconciler|Dead Letter Reconciler]]
- [[_COMMUNITY_IP & Rate Limiter|IP & Rate Limiter]]
- [[_COMMUNITY_Standalone Config 48|Standalone Config 48]]

## God Nodes (most connected - your core abstractions)
1. `handleInsforgeError()` - 65 edges
2. `handler()` - 13 edges
3. `MonitoringService` - 13 edges
4. `getSiteContentMap()` - 12 edges
5. `MemDB` - 9 edges
6. `getSiteImagesByType()` - 9 edges
7. `uploadImage()` - 9 edges
8. `runSyncWebhookSender()` - 8 edges
9. `handler()` - 8 edges
10. `handler()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Logo Image` --references--> `HighLands Cafe Website`  [INFERRED]
  src/assets/logo.png → docs/int/00-consolidated-analysis.md
- `Menu Image` --references--> `HighLands Cafe Website`  [INFERRED]
  src/assets/menu.png → docs/int/00-consolidated-analysis.md
- `invokeAdmin()` --calls--> `handleInsforgeError()`  [INFERRED]
  src/services/adminRecoveryService.ts → src/services/insforge.ts
- `getCurrentAdmin()` --calls--> `handleInsforgeError()`  [INFERRED]
  src/services/authService.ts → src/services/insforge.ts
- `getBookingsByEmail()` --calls--> `handleInsforgeError()`  [INFERRED]
  src/services/bookingService.ts → src/services/insforge.ts

## Hyperedges (group relationships)
- **Sync Data Pipeline** — sync_events_table, sync_webhook_sender, pos_sync_api, booking_webhook_function, website_sync_function, room_mappings_table, external_bookings_table, sync_logs_table [EXTRACTED 1.00]
- **POS Offline Resilience Layer** — mutation_queue, circuit_breaker, idempotency_framework, crash_safe_two_phase [EXTRACTED 1.00]
- **Customer Booking Creation Pipeline** — create_booking_function, fonepay_payments, payment_flow_website, booking_entity, booking_state_machine, booking_webhook_function [EXTRACTED 1.00]

## Communities (49 total, 6 thin omitted)

### Community 0 - "Admin Pages & Layout"
Cohesion: 0.11
Nodes (32): handleCategorySubmit(), handleDeleteCategory(), handleDeleteItem(), handleItemSubmit(), handleToggleAvailability(), loadMenu(), useWebSocket(), handleVerifyClick() (+24 more)

### Community 1 - "Admin Data & Tables"
Cohesion: 0.1
Nodes (31): handleSave(), refreshContent(), handleDelete(), handleImageUpload(), handleSubmit(), loadImages(), handleImageUpload(), confirmDelete() (+23 more)

### Community 2 - "Bidirectional Sync Pipeline"
Cohesion: 0.07
Nodes (37): Bidirectional Sync Architecture, Booking Entity, Booking State Machine, booking-webhook Edge Function, POS Circuit Breaker, Crash-Safe Two-Phase Idempotency, create-booking Edge Function, external_bookings Table (+29 more)

### Community 3 - "Booking Creation Flow"
Cohesion: 0.11
Nodes (24): checkRateLimit(), handler(), hmacSha256Hex(), toError(), getCorsHeaders(), isOriginAllowed(), completeIdempotency(), resolveIdempotencyKey() (+16 more)

### Community 4 - "Admin Content & Images"
Cohesion: 0.1
Nodes (14): handleStatusUpdate(), refreshBookings(), getTotalPrice(), calculateAdvanceAmount(), calculateBalanceAmount(), calculateTotalPrice(), cancelBooking(), getAllBookings() (+6 more)

### Community 5 - "Common UI Components"
Cohesion: 0.11
Nodes (9): C(), getFAQ(), C(), loadData(), load(), getSiteContentMap(), getSiteImagesByType(), getRoomById() (+1 more)

### Community 6 - "Admin Forms & Menu"
Cohesion: 0.13
Nodes (15): handleLogout(), handleResetPassword(), handleSubmit(), handleSignup(), handleResend(), handleVerify(), adminLogin(), adminLogout() (+7 more)

### Community 7 - "Edge Functions Core"
Cohesion: 0.24
Nodes (11): createSystem(), findOrphans(), healthScore(), MemDB, runSyncWebhookSender(), simulatePosToWebsitePush(), sleep(), triggerSyncEvent() (+3 more)

### Community 8 - "Deploy Artifacts A"
Cohesion: 0.19
Nodes (18): buildLineage(), checkRateLimit(), circuitBreakerAllow(), circuitBreakerFailure(), circuitBreakerSuccess(), completeIdempotency(), generateTraceId(), getCircuitEntry() (+10 more)

### Community 9 - "Deploy Artifacts B"
Cohesion: 0.18
Nodes (12): buildLineage(), circuitBreakerAllow(), circuitBreakerFailure(), circuitBreakerSuccess(), generateTraceId(), getCircuitEntry(), getCorsHeaders(), isOriginAllowed() (+4 more)

### Community 10 - "Fonepay Payment"
Cohesion: 0.21
Nodes (15): buildConfirmationHtml(), checkRateLimit(), confirmPayment(), errorResponse(), fetchWithTimeout(), generateSecurePrn(), getClientIp(), getCorsHeaders() (+7 more)

### Community 11 - "Deploy Artifacts C"
Cohesion: 0.24
Nodes (14): buildLineage(), circuitBreakerAllow(), circuitBreakerFailure(), circuitBreakerSuccess(), generateTraceId(), getCircuitEntry(), handlePosRejection(), handler() (+6 more)

### Community 12 - "Booking Schema"
Cohesion: 0.18
Nodes (6): clearConfirmedBooking(), storeConfirmedBooking(), ConfirmationStep(), verify(), getBookingById(), verifyWebPayment()

### Community 14 - "Booking Webhook Deploy"
Cohesion: 0.38
Nodes (9): checkIdempotency(), checkRateLimit(), errorResponse(), getClientIp(), getCorsHeaders(), handler(), isOriginAllowed(), verifyHmacSignature() (+1 more)

### Community 15 - "InsForge Payment"
Cohesion: 0.33
Nodes (6): checkFonepayStatus(), checkRate(), errorResponse(), handler(), hmacSha512(), verifyFonepayResponse()

### Community 16 - "POS Sync API"
Cohesion: 0.38
Nodes (9): checkIdempotency(), checkRateLimit(), errorResponse(), getClientIp(), getCorsHeaders(), handler(), isOriginAllowed(), verifyHmacSignature() (+1 more)

### Community 17 - "Admin Recovery Service"
Cohesion: 0.31
Nodes (7): handleForceConfirm(), handleForceExpire(), forceConfirmPayment(), forceExpireBooking(), invokeAdmin(), listStuckPayments(), searchBookingsAndPayments()

### Community 18 - "Admin Auth Flow"
Cohesion: 0.42
Nodes (8): checkRateLimit(), errorResponse(), getClientIp(), getCorsHeaders(), handler(), isOriginAllowed(), successResponse(), verifyAdminSession()

### Community 19 - "Upload Validation"
Cohesion: 0.5
Nodes (7): checkRateLimit(), getExtension(), getTrustedClientIP(), handler(), rateLimitKey(), sanitizeFileName(), verifyImageMagicBytes()

### Community 22 - "Health Check"
Cohesion: 0.83
Nodes (3): getCorsHeaders(), handler(), isOriginAllowed()

### Community 23 - "TikTok Feed"
Cohesion: 0.83
Nodes (3): fetchFromTikAPI(), fetchFromTikWM(), handler()

## Knowledge Gaps
- **11 isolated node(s):** `POS Circuit Breaker`, `Booking State Machine`, `pos-sync-api Edge Function`, `G-2: Guest Email Missing in POS`, `sync_logs Table` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `handleInsforgeError()` connect `Admin Pages & Layout` to `Admin Data & Tables`, `Admin Content & Images`, `Common UI Components`, `Admin Forms & Menu`, `Booking Schema`, `Admin Recovery Service`?**
  _High betweenness centrality (0.118) - this node is a cross-community bridge._
- **Why does `getSiteContentMap()` connect `Common UI Components` to `Admin Pages & Layout`, `Admin Data & Tables`, `Booking Schema`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `getSiteImagesByType()` connect `Common UI Components` to `Admin Pages & Layout`, `Admin Data & Tables`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Are the 56 inferred relationships involving `handleInsforgeError()` (e.g. with `invokeAdmin()` and `adminLogin()`) actually correct?**
  _`handleInsforgeError()` has 56 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `getSiteContentMap()` (e.g. with `loadData()` and `load()`) actually correct?**
  _`getSiteContentMap()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `POS Circuit Breaker`, `Booking State Machine`, `pos-sync-api Edge Function` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Admin Pages & Layout` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._