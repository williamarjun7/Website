# Graph Report - .  (2026-06-15)

## Corpus Check
- 67 files · ~191,392 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 216 nodes · 372 edges · 32 communities (30 shown, 2 thin omitted)
- Extraction: 73% EXTRACTED · 27% INFERRED · 0% AMBIGUOUS · INFERRED: 100 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Booking Wizard Flow|Booking Wizard Flow]]
- [[_COMMUNITY_Menu Admin Management|Menu Admin Management]]
- [[_COMMUNITY_Image Upload & Room Mgmt|Image Upload & Room Mgmt]]
- [[_COMMUNITY_Admin Auth & Layout|Admin Auth & Layout]]
- [[_COMMUNITY_Fonepay Payment Functions|Fonepay Payment Functions]]
- [[_COMMUNITY_Content Editor & Image Admin|Content Editor & Image Admin]]
- [[_COMMUNITY_Payment Display Helpers|Payment Display Helpers]]
- [[_COMMUNITY_Payment Recovery Admin|Payment Recovery Admin]]
- [[_COMMUNITY_Data Loading Utilities|Data Loading Utilities]]
- [[_COMMUNITY_Payment Reconciliation Function|Payment Reconciliation Function]]
- [[_COMMUNITY_Fonepay Payment Function|Fonepay Payment Function]]
- [[_COMMUNITY_Error Boundary Component|Error Boundary Component]]
- [[_COMMUNITY_CORS & Rate Limiting|CORS & Rate Limiting]]
- [[_COMMUNITY_Admin Recovery Edge Function|Admin Recovery Edge Function]]
- [[_COMMUNITY_Fonepay HMAC Signature|Fonepay HMAC Signature]]

## God Nodes (most connected - your core abstractions)
1. `handleInsforgeError()` - 61 edges
2. `handler()` - 11 edges
3. `uploadImage()` - 9 edges
4. `getRooms()` - 8 edges
5. `getAllRoomsForAdmin()` - 8 edges
6. `loadMenu()` - 7 edges
7. `handler()` - 6 edges
8. `loadRooms()` - 6 edges
9. `getFullMenu()` - 6 edges
10. `addRoomImage()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `getSiteContent()` --calls--> `handleInsforgeError()`  [INFERRED]
  C:/Users/pawan/OneDrive/Desktop/Arjun/src/services/contentService.ts → src/services/insforge.ts
- `toggleImageActive()` --calls--> `handleInsforgeError()`  [INFERRED]
  C:/Users/pawan/OneDrive/Desktop/Arjun/src/services/contentService.ts → src/services/insforge.ts
- `handleImageUpload()` --calls--> `uploadImage()`  [INFERRED]
  src/pages/admin/Images.tsx → C:/Users/pawan/OneDrive/Desktop/Arjun/src/services/storageService.ts
- `handleImageUpload()` --calls--> `uploadImage()`  [INFERRED]
  src/pages/admin/Menu.tsx → C:/Users/pawan/OneDrive/Desktop/Arjun/src/services/storageService.ts
- `getAllSiteContent()` --calls--> `handleInsforgeError()`  [INFERRED]
  C:/Users/pawan/OneDrive/Desktop/Arjun/src/services/contentService.ts → src/services/insforge.ts

## Communities (32 total, 2 thin omitted)

### Community 0 - "Booking Wizard Flow"
Cohesion: 0.12
Nodes (20): getTotalPrice(), onSubmit(), processPayment(), searchAvailableRooms(), verify(), calculateAdvanceAmount(), calculateBalanceAmount(), calculateTotalPrice() (+12 more)

### Community 1 - "Menu Admin Management"
Cohesion: 0.19
Nodes (19): handleCategorySubmit(), handleDeleteCategory(), handleDeleteItem(), handleItemSubmit(), handleToggleAvailability(), loadMenu(), loadMenu(), handleInsforgeError() (+11 more)

### Community 2 - "Image Upload & Room Mgmt"
Cohesion: 0.19
Nodes (18): handleImageUpload(), handleImageUpload(), async(), confirmDelete(), handleAddImageToExistingRoom(), handleImageUpload(), handleRemoveExistingImage(), handleReorderImage() (+10 more)

### Community 3 - "Admin Auth & Layout"
Cohesion: 0.13
Nodes (13): handleLogout(), handleSubmit(), handleSignup(), handleResend(), handleVerify(), adminLogin(), adminLogout(), adminSignup() (+5 more)

### Community 4 - "Fonepay Payment Functions"
Cohesion: 0.26
Nodes (12): checkRateLimit(), confirmPayment(), errorResponse(), extractBookingId(), fetchWithTimeout(), generateSecurePrn(), getClientIp(), getCorsHeaders() (+4 more)

### Community 5 - "Content Editor & Image Admin"
Cohesion: 0.23
Nodes (12): handleSave(), loadContent(), handleDelete(), handleSubmit(), loadImages(), addSiteImage(), deleteSiteImage(), getAllSiteContent() (+4 more)

### Community 6 - "Payment Display Helpers"
Cohesion: 0.2
Nodes (5): handleStatusUpdate(), getAllBookings(), getUpcomingCheckIns(), updateBookingStatus(), exportToCsv()

### Community 7 - "Payment Recovery Admin"
Cohesion: 0.31
Nodes (7): handleForceConfirm(), handleForceExpire(), forceConfirmPayment(), forceExpireBooking(), invokeAdmin(), listStuckPayments(), searchBookingsAndPayments()

### Community 8 - "Data Loading Utilities"
Cohesion: 0.31
Nodes (5): loadData(), loadRooms(), getSiteImagesByType(), getRoomById(), getRooms()

### Community 9 - "Payment Reconciliation Function"
Cohesion: 0.46
Nodes (7): checkIdempotency(), errorResponse(), getCorsHeaders(), handler(), isOriginAllowed(), verifyHmacSignature(), verifyPosApiKey()

### Community 10 - "Fonepay Payment Function"
Cohesion: 0.43
Nodes (4): checkRate(), errorResponse(), handler(), hmacSha512()

### Community 13 - "Admin Recovery Edge Function"
Cohesion: 0.83
Nodes (3): errorResponse(), handler(), successResponse()

### Community 14 - "Fonepay HMAC Signature"
Cohesion: 0.83
Nodes (3): createHmacSignature(), handler(), toError()

## Knowledge Gaps
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `handleInsforgeError()` connect `Menu Admin Management` to `Booking Wizard Flow`, `Image Upload & Room Mgmt`, `Admin Auth & Layout`, `Content Editor & Image Admin`, `Payment Display Helpers`, `Payment Recovery Admin`, `Data Loading Utilities`?**
  _High betweenness centrality (0.359) - this node is a cross-community bridge._
- **Why does `getRooms()` connect `Data Loading Utilities` to `Booking Wizard Flow`, `Menu Admin Management`, `Image Upload & Room Mgmt`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `updateBookingStatus()` connect `Payment Display Helpers` to `Booking Wizard Flow`, `Menu Admin Management`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Are the 52 inferred relationships involving `handleInsforgeError()` (e.g. with `invokeAdmin()` and `adminLogin()`) actually correct?**
  _`handleInsforgeError()` has 52 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `uploadImage()` (e.g. with `handleImageUpload()` and `handleImageUpload()`) actually correct?**
  _`uploadImage()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `getRooms()` (e.g. with `loadData()` and `loadRooms()`) actually correct?**
  _`getRooms()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `getAllRoomsForAdmin()` (e.g. with `loadRooms()` and `handleImageUpload()`) actually correct?**
  _`getAllRoomsForAdmin()` has 5 INFERRED edges - model-reasoned connections that need verification._