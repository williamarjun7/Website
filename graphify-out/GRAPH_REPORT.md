# Graph Report - .  (2026-06-04)

## Corpus Check
- 64 files · ~186,268 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 209 nodes · 352 edges · 32 communities (31 shown, 1 thin omitted)
- Extraction: 70% EXTRACTED · 30% INFERRED · 0% AMBIGUOUS · INFERRED: 107 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 12|Community 12]]

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
- `handleImageUpload()` --calls--> `uploadImage()`  [INFERRED]
  src/pages/admin/Images.tsx → src/services/storageService.ts
- `handleImageUpload()` --calls--> `uploadImage()`  [INFERRED]
  src/pages/admin/Menu.tsx → src/services/storageService.ts
- `getCurrentAdmin()` --calls--> `handleInsforgeError()`  [INFERRED]
  src/services/authService.ts → src/services/insforge.ts
- `getBookingById()` --calls--> `handleInsforgeError()`  [INFERRED]
  src/services/bookingService.ts → src/services/insforge.ts

## Communities (32 total, 1 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.13
Nodes (13): handleLogout(), handleSubmit(), handleSignup(), handleResend(), handleVerify(), adminLogin(), adminLogout(), adminSignup() (+5 more)

### Community 1 - "Community 1"
Cohesion: 0.18
Nodes (16): handleSave(), loadContent(), handleDelete(), handleImageUpload(), handleSubmit(), loadImages(), addSiteImage(), deleteSiteImage() (+8 more)

### Community 2 - "Community 2"
Cohesion: 0.15
Nodes (14): async(), getTotalPrice(), onSubmit(), processPayment(), searchAvailableRooms(), verify(), calculateTotalPrice(), createBooking() (+6 more)

### Community 3 - "Community 3"
Cohesion: 0.22
Nodes (15): confirmDelete(), handleAddImageToExistingRoom(), handleImageUpload(), handleRemoveExistingImage(), handleReorderImage(), handleSubmit(), loadRooms(), addRoomImage() (+7 more)

### Community 4 - "Community 4"
Cohesion: 0.14
Nodes (10): handleStatusUpdate(), loadBookings(), cancelBooking(), getAllBookings(), getBookingById(), getBookingsByDateRange(), getBookingsByEmail(), getUpcomingCheckIns() (+2 more)

### Community 5 - "Community 5"
Cohesion: 0.22
Nodes (17): handleCategorySubmit(), handleDeleteCategory(), handleDeleteItem(), handleImageUpload(), handleItemSubmit(), handleToggleAvailability(), loadMenu(), createCategory() (+9 more)

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (9): handleStatusChange(), loadOrders(), handlePlaceOrder(), loadMenu(), getAllOrders(), getOrderByNumber(), getOrdersByPhone(), placeOrder() (+1 more)

### Community 7 - "Community 7"
Cohesion: 0.31
Nodes (6): loadData(), loadRoomData(), loadRooms(), getSiteImagesByType(), getRoomById(), getRooms()

### Community 8 - "Community 8"
Cohesion: 0.43
Nodes (6): errorResponse(), extractBookingId(), getCorsHeaders(), handler(), hmacSha512(), logEvent()

### Community 9 - "Community 9"
Cohesion: 0.52
Nodes (6): checkIdempotency(), errorResponse(), getCorsHeaders(), handler(), verifyHmacSignature(), verifyPosApiKey()

### Community 12 - "Community 12"
Cohesion: 0.83
Nodes (3): createHmacSignature(), handler(), toError()

## Knowledge Gaps
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.