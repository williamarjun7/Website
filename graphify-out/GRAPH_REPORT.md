# Graph Report - Arjun  (2026-06-04)

## Corpus Check
- 61 files · ~186,415 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 209 nodes · 352 edges · 33 communities (32 shown, 1 thin omitted)
- Extraction: 70% EXTRACTED · 30% INFERRED · 0% AMBIGUOUS · INFERRED: 107 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `186c719d`
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
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]

## God Nodes (most connected - your core abstractions)
1. `handleInsforgeError()` - 65 edges
2. `getRooms()` - 9 edges
3. `uploadImage()` - 9 edges
4. `loadMenu()` - 7 edges
5. `getAllRoomsForAdmin()` - 7 edges
6. `handler()` - 6 edges
7. `handler()` - 6 edges
8. `loadRooms()` - 6 edges
9. `getFullMenu()` - 6 edges
10. `addRoomImage()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `loadMenu()` --calls--> `getFullMenu()`  [INFERRED]
  src/pages/Cafe.tsx → src/services/menuService.ts
- `getCurrentAdmin()` --calls--> `handleInsforgeError()`  [INFERRED]
  src/services/authService.ts → src/services/insforge.ts
- `getSiteContent()` --calls--> `handleInsforgeError()`  [INFERRED]
  src/services/contentService.ts → src/services/insforge.ts
- `toggleImageActive()` --calls--> `handleInsforgeError()`  [INFERRED]
  src/services/contentService.ts → src/services/insforge.ts
- `postTaxRefund()` --calls--> `handleInsforgeError()`  [INFERRED]
  src/services/fonepayService.ts → src/services/insforge.ts

## Communities (33 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.19
Nodes (17): handleImageUpload(), handleImageUpload(), confirmDelete(), handleAddImageToExistingRoom(), handleImageUpload(), handleRemoveExistingImage(), handleReorderImage(), handleSubmit() (+9 more)

### Community 1 - "Community 1"
Cohesion: 0.13
Nodes (13): handleLogout(), handleSubmit(), handleSignup(), handleResend(), handleVerify(), adminLogin(), adminLogout(), adminSignup() (+5 more)

### Community 2 - "Community 2"
Cohesion: 0.15
Nodes (14): async(), getTotalPrice(), onSubmit(), processPayment(), searchAvailableRooms(), verify(), calculateTotalPrice(), createBooking() (+6 more)

### Community 3 - "Community 3"
Cohesion: 0.19
Nodes (14): handleStatusChange(), loadOrders(), cancelBooking(), getBookingById(), getBookingsByDateRange(), getBookingsByEmail(), getUpcomingCheckIns(), handleInsforgeError() (+6 more)

### Community 4 - "Community 4"
Cohesion: 0.24
Nodes (16): handleCategorySubmit(), handleDeleteCategory(), handleDeleteItem(), handleItemSubmit(), handleToggleAvailability(), loadMenu(), createCategory(), createMenuItem() (+8 more)

### Community 5 - "Community 5"
Cohesion: 0.23
Nodes (12): handleSave(), loadContent(), handleDelete(), handleSubmit(), loadImages(), addSiteImage(), deleteSiteImage(), getAllSiteContent() (+4 more)

### Community 6 - "Community 6"
Cohesion: 0.21
Nodes (5): handleStatusUpdate(), loadBookings(), getAllBookings(), updateBookingStatus(), exportToCsv()

### Community 7 - "Community 7"
Cohesion: 0.31
Nodes (6): loadData(), loadRoomData(), loadRooms(), getSiteImagesByType(), getRoomById(), getRooms()

### Community 8 - "Community 8"
Cohesion: 0.25
Nodes (3): handlePlaceOrder(), loadMenu(), placeOrder()

### Community 9 - "Community 9"
Cohesion: 0.43
Nodes (6): errorResponse(), extractBookingId(), getCorsHeaders(), handler(), hmacSha512(), logEvent()

### Community 10 - "Community 10"
Cohesion: 0.52
Nodes (6): checkIdempotency(), errorResponse(), getCorsHeaders(), handler(), verifyHmacSignature(), verifyPosApiKey()

### Community 13 - "Community 13"
Cohesion: 0.83
Nodes (3): createHmacSignature(), handler(), toError()

## Knowledge Gaps
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `handleInsforgeError()` connect `Community 3` to `Community 0`, `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 8`?**
  _High betweenness centrality (0.415) - this node is a cross-community bridge._
- **Why does `getRooms()` connect `Community 7` to `Community 0`, `Community 2`, `Community 3`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `getFullMenu()` connect `Community 4` to `Community 8`, `Community 3`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Are the 56 inferred relationships involving `handleInsforgeError()` (e.g. with `adminLogin()` and `adminSignup()`) actually correct?**
  _`handleInsforgeError()` has 56 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `getRooms()` (e.g. with `loadData()` and `loadRoomData()`) actually correct?**
  _`getRooms()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `uploadImage()` (e.g. with `handleImageUpload()` and `handleImageUpload()`) actually correct?**
  _`uploadImage()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `getAllRoomsForAdmin()` (e.g. with `loadRooms()` and `handleImageUpload()`) actually correct?**
  _`getAllRoomsForAdmin()` has 4 INFERRED edges - model-reasoned connections that need verification._