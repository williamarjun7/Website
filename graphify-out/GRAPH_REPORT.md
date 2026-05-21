# Graph Report - .  (2026-05-21)

## Corpus Check
- 54 files · ~188,073 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 199 nodes · 385 edges · 19 communities (16 shown, 3 thin omitted)
- Extraction: 74% EXTRACTED · 26% INFERRED · 0% AMBIGUOUS · INFERRED: 100 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_React UI Components|React UI Components]]
- [[_COMMUNITY_Business Domain & README|Business Domain & README]]
- [[_COMMUNITY_Backend Data Services|Backend Data Services]]
- [[_COMMUNITY_Room Management|Room Management]]
- [[_COMMUNITY_Cafe Menu Module|Cafe Menu Module]]
- [[_COMMUNITY_Booking Flow & Payment|Booking Flow & Payment]]
- [[_COMMUNITY_Auth Module|Auth Module]]
- [[_COMMUNITY_Image Management|Image Management]]
- [[_COMMUNITY_Error Handling|Error Handling]]
- [[_COMMUNITY_Frontend Entry & Helpers|Frontend Entry & Helpers]]
- [[_COMMUNITY_Brand Identity|Brand Identity]]
- [[_COMMUNITY_Room Image Asset|Room Image Asset]]
- [[_COMMUNITY_Menu Image Asset|Menu Image Asset]]

## God Nodes (most connected - your core abstractions)
1. `handleInsforgeError()` - 58 edges
2. `React 19` - 27 edges
3. `Lucide React` - 24 edges
4. `Highlands Cafe & Motel Inn` - 21 edges
5. `React Router DOM 7` - 15 edges
6. `getRooms()` - 14 edges
7. `uploadImage()` - 9 edges
8. `loadMenu()` - 7 edges
9. `getFullMenu()` - 7 edges
10. `loadRooms()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `loadRooms()` --calls--> `getRooms()`  [INFERRED]
  src/pages/Rooms.tsx → src/services/roomService.ts
- `getCurrentAdmin()` --calls--> `handleInsforgeError()`  [INFERRED]
  src/services/authService.ts → src/services/insforge.ts
- `verifyQrPayment()` --calls--> `handleInsforgeError()`  [INFERRED]
  src/services/fonepayService.ts → src/services/insforge.ts
- `getMenuItemsByCategory()` --calls--> `handleInsforgeError()`  [INFERRED]
  src/services/menuService.ts → src/services/insforge.ts
- `Highlands Cafe & Motel Inn` --references--> `Vercel`  [EXTRACTED]
  README.md → DEPLOYMENT.md

## Communities (19 total, 3 thin omitted)

### Community 0 - "React UI Components"
Cohesion: 0.09
Nodes (12): handleSubmit(), handleSignup(), Lucide React, loadData(), verify(), loadRooms(), React 19, React Router DOM 7 (+4 more)

### Community 1 - "Business Domain & README"
Cohesion: 0.08
Nodes (27): Admin Panel, Booking System, Cafe Menu System, Warm Brown and Cream Color Palette, date-fns, Fredoka Font, GitHub, Google Maps (+19 more)

### Community 2 - "Backend Data Services"
Cohesion: 0.14
Nodes (17): handleStatusUpdate(), loadBookings(), cancelBooking(), getAllBookings(), getBookingById(), getBookingsByDateRange(), getBookingsByEmail(), getUpcomingCheckIns() (+9 more)

### Community 3 - "Room Management"
Cohesion: 0.19
Nodes (16): confirmDelete(), handleAddImageToExistingRoom(), handleImageUpload(), handleRemoveExistingImage(), handleReorderImage(), handleSubmit(), loadRooms(), loadRoomData() (+8 more)

### Community 4 - "Cafe Menu Module"
Cohesion: 0.2
Nodes (17): handleCategorySubmit(), handleDeleteCategory(), handleDeleteItem(), handleItemSubmit(), handleToggleAvailability(), loadMenu(), loadMenu(), createCategory() (+9 more)

### Community 5 - "Booking Flow & Payment"
Cohesion: 0.23
Nodes (10): getTotalPrice(), onSubmit(), processPayment(), searchAvailableRooms(), calculateTotalPrice(), createBooking(), generateQrPayment(), generateWebPayment() (+2 more)

### Community 6 - "Auth Module"
Cohesion: 0.22
Nodes (9): handleLogout(), handleResend(), handleVerify(), adminLogout(), getAdminSession(), getCurrentAdmin(), isAuthenticated(), resendVerification() (+1 more)

### Community 7 - "Image Management"
Cohesion: 0.33
Nodes (9): handleDelete(), handleImageUpload(), handleSubmit(), loadImages(), handleImageUpload(), addSiteImage(), deleteSiteImage(), getAllSiteImages() (+1 more)

### Community 9 - "Frontend Entry & Helpers"
Cohesion: 0.7
Nodes (4): errorResponse(), getCorsHeaders(), handler(), hmacSha512()

### Community 11 - "Brand Identity"
Cohesion: 0.5
Nodes (4): Highlands Cafe & Motel Inn, Brand Identity, Warm Amber and Orange Color Palette, Highlands Cafe & Motel Inn Logo

## Knowledge Gaps
- **23 isolated node(s):** `Tailwind CSS 3.4`, `TypeScript`, `date-fns`, `Liquid Glass Style`, `Fredoka Font` (+18 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `React 19` connect `React UI Components` to `Business Domain & README`, `Backend Data Services`, `Room Management`, `Cafe Menu Module`, `Booking Flow & Payment`, `Auth Module`, `Image Management`, `Error Handling`?**
  _High betweenness centrality (0.258) - this node is a cross-community bridge._
- **Why does `handleInsforgeError()` connect `Backend Data Services` to `React UI Components`, `Room Management`, `Cafe Menu Module`, `Booking Flow & Payment`, `Auth Module`, `Image Management`?**
  _High betweenness centrality (0.257) - this node is a cross-community bridge._
- **Why does `Highlands Cafe & Motel Inn` connect `Business Domain & README` to `React UI Components`?**
  _High betweenness centrality (0.231) - this node is a cross-community bridge._
- **Are the 50 inferred relationships involving `handleInsforgeError()` (e.g. with `adminLogin()` and `adminSignup()`) actually correct?**
  _`handleInsforgeError()` has 50 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Tailwind CSS 3.4`, `TypeScript`, `date-fns` to the rest of the system?**
  _23 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `React UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Business Domain & README` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._