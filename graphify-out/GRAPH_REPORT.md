# Graph Report - .  (2026-06-03)

## Corpus Check
- 63 files · ~184,590 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 202 nodes · 343 edges · 32 communities (30 shown, 2 thin omitted)
- Extraction: 69% EXTRACTED · 31% INFERRED · 0% AMBIGUOUS · INFERRED: 106 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

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
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 14|Community 14]]

## God Nodes (most connected - your core abstractions)
1. `handleInsforgeError()` - 64 edges
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
- `getMenuItemsByCategory()` --calls--> `handleInsforgeError()`  [INFERRED]
  src/services/menuService.ts → src/services/insforge.ts

## Communities (32 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.13
Nodes (18): handleStatusUpdate(), loadBookings(), handleStatusChange(), loadOrders(), cancelBooking(), getAllBookings(), getBookingById(), getBookingsByDateRange() (+10 more)

### Community 1 - "Community 1"
Cohesion: 0.13
Nodes (13): handleLogout(), handleSubmit(), handleSignup(), handleResend(), handleVerify(), adminLogin(), adminLogout(), adminSignup() (+5 more)

### Community 2 - "Community 2"
Cohesion: 0.21
Nodes (15): confirmDelete(), handleAddImageToExistingRoom(), handleImageUpload(), handleRemoveExistingImage(), handleReorderImage(), handleSubmit(), loadRooms(), addRoomImage() (+7 more)

### Community 3 - "Community 3"
Cohesion: 0.18
Nodes (13): async(), getTotalPrice(), onSubmit(), processPayment(), searchAvailableRooms(), verify(), calculateTotalPrice(), createBooking() (+5 more)

### Community 4 - "Community 4"
Cohesion: 0.18
Nodes (15): handleSave(), loadContent(), handleDelete(), handleImageUpload(), handleSubmit(), loadImages(), handleImageUpload(), addSiteImage() (+7 more)

### Community 5 - "Community 5"
Cohesion: 0.24
Nodes (16): handleCategorySubmit(), handleDeleteCategory(), handleDeleteItem(), handleItemSubmit(), handleToggleAvailability(), loadMenu(), createCategory(), createMenuItem() (+8 more)

### Community 6 - "Community 6"
Cohesion: 0.31
Nodes (6): loadData(), loadRoomData(), loadRooms(), getSiteImagesByType(), getRoomById(), getRooms()

### Community 7 - "Community 7"
Cohesion: 0.25
Nodes (3): handlePlaceOrder(), loadMenu(), placeOrder()

### Community 8 - "Community 8"
Cohesion: 0.52
Nodes (6): errorResponse(), extractBookingId(), getCorsHeaders(), handler(), hmacSha512(), logEvent()

### Community 9 - "Community 9"
Cohesion: 0.52
Nodes (6): checkIdempotency(), errorResponse(), getCorsHeaders(), handler(), verifyHmacSignature(), verifyPosApiKey()

## Knowledge Gaps
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `handleInsforgeError()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`?**
  _High betweenness centrality (0.414) - this node is a cross-community bridge._
- **Why does `getRooms()` connect `Community 6` to `Community 0`, `Community 2`, `Community 3`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `getFullMenu()` connect `Community 5` to `Community 0`, `Community 7`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Are the 55 inferred relationships involving `handleInsforgeError()` (e.g. with `adminLogin()` and `adminSignup()`) actually correct?**
  _`handleInsforgeError()` has 55 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `getRooms()` (e.g. with `loadData()` and `loadRoomData()`) actually correct?**
  _`getRooms()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `uploadImage()` (e.g. with `handleImageUpload()` and `handleImageUpload()`) actually correct?**
  _`uploadImage()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `getAllRoomsForAdmin()` (e.g. with `loadRooms()` and `handleImageUpload()`) actually correct?**
  _`getAllRoomsForAdmin()` has 4 INFERRED edges - model-reasoned connections that need verification._