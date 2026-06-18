=============================================================================
  ADMIN PANEL — COMPLETE CAPABILITIES GUIDE
  Highlands Motel & Cafe
=============================================================================

Access: /admin/login
Layout: Persistent sidebar with 7 sections + logout

=====================================================================
1. ADMIN DASHBOARD              Route: /admin/dashboard
=====================================================================

WHAT IT DOES: High-level snapshot of motel operations.

DISPLAYS:
  - 4 stat cards: Total Bookings, Total Revenue (NPR),
    Total Rooms, Occupancy Rate (%)
  - Booking status bar chart (confirmed, checked_in,
    checked_out, cancelled, pending_payment, paid, failed,
    expired) with color-coded horizontal bars
  - Recent 5 bookings (guest, date, price, status)
  - Upcoming 5 check-ins with quick action buttons:
    "Check In" (green) and "Cancel" (red)

=====================================================================
2. ROOMS                        Route: /admin/rooms
=====================================================================

WHAT IT DOES: Full CRUD for motel rooms + image management.

ROOM CARD LIST:
  - Hero image (or placeholder)
  - Room name, number, type
  - Status badges: Active/Hidden, AC/Non-AC, Featured ★,
    Maintenance, Discount % OFF
  - Floor, room size, bed type
  - Price per night + max guests
  - Hover actions: Manage Images, Edit, Delete

CREATE/EDIT MODAL — 7 sections:

  [Room Identity]
    - Room Name (required)
    - Room Number (required)

  [Pricing & Capacity]
    - Price / Night in NPR (required)
    - Max Guests (required)
    - Room Type (select: Single/Double/Deluxe/Suite)

  [Room Features]
    - Bed Type (select: Single/Double/Queen/King/Twin)
    - Room Size (e.g. "350 sq ft")
    - Air Conditioning toggle

  [Description & Amenities]
    - Description (textarea)
    - Amenities (comma-separated textarea)

  [Room Status & Flags]
    - Featured Room ☆ toggle
    - Under Maintenance ⚠ toggle
    - Availability Status (select: Available/Occupied/
      Maintenance/Reserved)
    - Discount % (0-100)

  [Policies]
    - Specific Policies / Notes (textarea)

  [Room Photos]
    - Existing image thumbnails (hover to delete)
    - Pending uploads with + badge
    - Upload zone (multiple files, JPG/PNG, max 5MB each)
    - Loading spinner during upload

  [Footer]
    - Publicly Visible toggle
    - Cancel / Create or Update button

IMAGE MANAGEMENT MODAL (separate):
  - Grid of all room images
  - Hover overlay: Move Up, Move Down (reorder), Delete
  - Sort order numbers shown on each image
  - Upload more photos directly to room

SPECIAL:
  - Rooms sorted A-Z
  - Delete confirmation dialog
  - Floor number auto-derived from room number
  - Empty state with "Add Your First Room" CTA

=====================================================================
3. BOOKINGS                     Route: /admin/bookings
=====================================================================

WHAT IT DOES: View, filter, search, and manage guest bookings.

TABLE COLUMNS:
  - Guest (name, email, phone stacked)
  - Room name
  - Dates (check-in → check-out)
  - Status badge (confirmed/checked_in/checked_out/cancelled)
  - Payment badge (Paid/Pending/Failed/Pay at Property)
  - Total (NPR)
  - Advance Paid (NPR or —)
  - Balance Due (NPR or —)
  - Actions

ACTIONS (per row, context-sensitive):
  - Confirmed → "Check In" (green) / "Cancel" (red)
  - Checked In → "Check Out" (blue)
  - Checked Out / Cancelled → disabled

SEARCH & FILTER:
  - Search bar: searches guest name, email, booking ID
  - Status dropdown filter: All, Confirmed, Checked In,
    Checked Out, Cancelled, Paid, Pending, Failed,
    Pay at Property

EXPORT: CSV download of all filtered bookings.

PAGINATION: 10 bookings per page.

=====================================================================
4. CAFE MENU                    Route: /admin/menu
=====================================================================

WHAT IT DOES: Full CRUD for menu categories and items.

TWO-LEVEL HIERARCHY:
  Category → Items within each category

CATEGORY:
  - Name / Sort Order
  - Edit, Delete (warns: all items deleted too)
  - "Add Item" button per category

ITEM FORM FIELDS:
  - Name (required)
  - Description
  - Category (select, required)
  - Price in NPR (required)
  - Available toggle
  - Item Image (PNG/JPG/WebP, max 2MB)

DISPLAY:
  - Categories as headers with items in responsive grid
  - Each item: thumbnail, name, availability toggle
    (ToggleRight green / ToggleLeft gray), description,
    price, edit/delete buttons

=====================================================================
5. SITE IMAGES                  Route: /admin/images
=====================================================================

WHAT IT DOES: Manage website-wide images by section.

5 DISPLAY SECTIONS:
  - Home Page Hero Section
  - Gallery Images
  - Cafe & Restaurant
  - Exterior & Property
  - Other Images

IMAGE GRID:
  - Square thumbnails, responsive 2/4/5 columns
  - Hover: Open in new tab, Delete
  - Title overlay at bottom (if set)

ADD IMAGE MODAL:
  - Display Section (select: hero/gallery/cafe/exterior/other)
  - Title / Caption (optional)
  - File upload (PNG/JPG/WebP, max 5MB)
  - Preview before confirming

=====================================================================
6. CONTENT EDITOR               Route: /admin/content
=====================================================================

WHAT IT DOES: Edit all website text content — 28 fields total.

FIELDS (per-field save with individual Save buttons):

  HERO:
    - Hero Title, Hero Subtitle

  HOME PAGE:
    - Feature 1 Title, Feature 1 Description
    - Feature 2 Title, Feature 2 Description
    - Feature 3 Title, Feature 3 Description
    - CTA Title, CTA Description
    - Cafe Title, Cafe Description
    - Rooms Section Title, Rooms Description

  ABOUT PAGE:
    - About Us Text
    - About Hero Title, About Hero Subtitle

  CAFE PAGE:
    - Cafe Hero Title, Cafe Hero Subtitle
    - Cafe Description, Cafe Hours

  CONTACT PAGE:
    - Address, Phone, Email
    - Check-in Time, Check-out Time

  FAQ PAGE:
    - FAQ Questions (JSON array format)

  FOOTER:
    - Footer Text

VALIDATION:
  - Zod schemas per field (min/max lengths, email format,
    phone regex)
  - FAQ JSON must be valid array with {question, answer}
  - Toast notifications for success/error

=====================================================================
7. PAYMENT RECOVERY             Route: /admin/payment-recovery
=====================================================================

WHAT IT DOES: Manual override tool for stuck/failed payments.

3 SUMMARY CARDS:
  - Stuck Payments (count of stuck bookings)
  - Total Held Value (NPR sum of stuck bookings)
  - Recoverable (count with active PRN)

STUCK PAYMENTS TABLE:
  - Guest (avatar + name + email)
  - Room name
  - Dates
  - Hold expired (relative time badge: "5m ago", "2h ago")
  - Amount (NPR)
  - PRN (truncated)
  - Actions: Force Confirm (green) / Force Expire (red)

SEARCH: Debounced search across:
  - Booking ID, guest name, email, PRN
  - Results split: Bookings section + Payments section

CONFIRM DIALOG:
  - Two variants: Confirm Payment | Expire Booking
  - Shows booking summary
  - Warning for confirm: "Only use if you verified payment"
  - "Cannot be undone" notice

AUTO-REFRESH: Every 60 seconds.

INFO SECTION: Guidance on when to use each action.

=====================================================================
AUTH PAGES
=====================================================================

LOGIN   (/admin/login)
  - Email + Password sign in
  - Password reset (sends reset email)
  - Link to sign up
  - Verification error → "Verify Now" link

SIGNUP  (/admin/signup)
  - Email + Password + Confirm Password
  - Min 8 char password, passwords must match
  - Redirects to verify page if email verification required

VERIFY  (/admin/verify)
  - 6-digit verification code entry
  - Resend code button
  - Auto-redirects to dashboard on success
