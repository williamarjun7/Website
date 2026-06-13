# Graph Report - .  (2026-06-13)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 274 nodes · 459 edges · 40 communities (35 shown, 5 thin omitted)
- Extraction: 75% EXTRACTED · 25% INFERRED · 0% AMBIGUOUS · INFERRED: 116 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dc158978`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]

## God Nodes (most connected - your core abstractions)
1. `handleInsforgeError()` - 67 edges
2. `handler()` - 13 edges
3. `getRooms()` - 10 edges
4. `uploadImage()` - 9 edges
5. `handler()` - 8 edges
6. `QA Test Report` - 8 edges
7. `handler()` - 7 edges
8. `loadMenu()` - 7 edges
9. `getAllRoomsForAdmin()` - 7 edges
10. `loadRooms()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Highlands Motel Logo` --references--> `Highlands Motel & Cafe Brand`  [EXTRACTED]
  logo.png → index.html
- `handleImageUpload()` --calls--> `uploadImage()`  [INFERRED]
  src/pages/admin/Images.tsx → src/services/storageService.ts
- `handleImageUpload()` --calls--> `uploadImage()`  [INFERRED]
  src/pages/admin/Menu.tsx → src/services/storageService.ts
- `invokeAdmin()` --calls--> `handleInsforgeError()`  [INFERRED]
  src/services/adminRecoveryService.ts → src/services/insforge.ts
- `getCurrentAdmin()` --calls--> `handleInsforgeError()`  [INFERRED]
  src/services/authService.ts → src/services/insforge.ts

## Communities (40 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.12
Nodes (20): async(), getTotalPrice(), onSubmit(), processPayment(), searchAvailableRooms(), verify(), calculateAdvanceAmount(), calculateBalanceAmount() (+12 more)

### Community 1 - "Community 1"
Cohesion: 0.17
Nodes (22): handleCategorySubmit(), handleDeleteCategory(), handleDeleteItem(), handleImageUpload(), handleItemSubmit(), handleToggleAvailability(), loadMenu(), handleInsforgeError() (+14 more)

### Community 2 - "Community 2"
Cohesion: 0.13
Nodes (13): handleLogout(), handleSubmit(), handleSignup(), handleResend(), handleVerify(), adminLogin(), adminLogout(), adminSignup() (+5 more)

### Community 3 - "Community 3"
Cohesion: 0.22
Nodes (15): confirmDelete(), handleAddImageToExistingRoom(), handleImageUpload(), handleRemoveExistingImage(), handleReorderImage(), handleSubmit(), loadRooms(), addRoomImage() (+7 more)

### Community 4 - "Community 4"
Cohesion: 0.21
Nodes (14): checkRateLimit(), confirmPayment(), errorResponse(), extractBookingId(), fetchWithTimeout(), generateSecurePrn(), getClientIp(), getCorsHeaders() (+6 more)

### Community 5 - "Community 5"
Cohesion: 0.2
Nodes (14): handleSave(), loadContent(), refreshContent(), handleDelete(), handleImageUpload(), handleSubmit(), loadImages(), addSiteImage() (+6 more)

### Community 6 - "Community 6"
Cohesion: 0.19
Nodes (7): handleStatusUpdate(), loadBookings(), refreshBookings(), getAllBookings(), getUpcomingCheckIns(), updateBookingStatus(), exportToCsv()

### Community 7 - "Community 7"
Cohesion: 0.31
Nodes (7): loadData(), load(), loadRoomData(), loadRooms(), getSiteImagesByType(), getRoomById(), getRooms()

### Community 8 - "Community 8"
Cohesion: 0.38
Nodes (9): checkIdempotency(), checkRateLimit(), errorResponse(), getClientIp(), getCorsHeaders(), handler(), isOriginAllowed(), verifyHmacSignature() (+1 more)

### Community 9 - "Community 9"
Cohesion: 0.31
Nodes (7): handleForceConfirm(), handleForceExpire(), forceConfirmPayment(), forceExpireBooking(), invokeAdmin(), listStuckPayments(), searchBookingsAndPayments()

### Community 10 - "Community 10"
Cohesion: 0.42
Nodes (8): checkRateLimit(), errorResponse(), getClientIp(), getCorsHeaders(), handler(), isOriginAllowed(), successResponse(), verifyAdminSession()

### Community 11 - "Community 11"
Cohesion: 0.25
Nodes (3): handlePlaceOrder(), loadMenu(), placeOrder()

### Community 12 - "Community 12"
Cohesion: 0.36
Nodes (9): Multi-Layer QA Testing Approach, QA Data Integrity Verification, System Health Score 65/100, QA Performance Benchmarks, QA Reliability Stress Testing, QA Security Controls Audit, QA UI/UX Testing Results, Stress Test Remediation Rounds (+1 more)

### Community 14 - "Community 14"
Cohesion: 0.43
Nodes (4): checkRate(), errorResponse(), handler(), hmacSha512()

### Community 17 - "Community 17"
Cohesion: 0.67
Nodes (5): handleStatusChange(), loadOrders(), refreshOrders(), getAllOrders(), updateOrderStatus()

### Community 18 - "Community 18"
Cohesion: 0.83
Nodes (3): createHmacSignature(), handler(), toError()

### Community 19 - "Community 19"
Cohesion: 0.5
Nodes (4): Highlands Motel & Cafe Brand, Highlands Motel SEO Metadata, Index HTML Entry Point, Highlands Motel Logo

## Knowledge Gaps
- **6 isolated node(s):** `Highlands Motel SEO Metadata`, `System Health Score 65/100`, `Fonepay QR Billing Integration Requirements`, `Highlands Motel Logo`, `Cafe Menu Image` (+1 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `handleInsforgeError()` connect `Community 1` to `Community 0`, `Community 2`, `Community 3`, `Community 5`, `Community 6`, `Community 7`, `Community 9`, `Community 11`, `Community 17`?**
  _High betweenness centrality (0.301) - this node is a cross-community bridge._
- **Why does `getAllBookings()` connect `Community 6` to `Community 0`, `Community 1`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `getRooms()` connect `Community 7` to `Community 0`, `Community 1`, `Community 3`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Are the 57 inferred relationships involving `handleInsforgeError()` (e.g. with `invokeAdmin()` and `adminLogin()`) actually correct?**
  _`handleInsforgeError()` has 57 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `getRooms()` (e.g. with `loadData()` and `load()`) actually correct?**
  _`getRooms()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `uploadImage()` (e.g. with `handleImageUpload()` and `handleImageUpload()`) actually correct?**
  _`uploadImage()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Highlands Motel SEO Metadata`, `System Health Score 65/100`, `Fonepay QR Billing Integration Requirements` to the rest of the system?**
  _6 weakly-connected nodes found - possible documentation gaps or missing edges._