# Phase 1: System Discovery Report

## A. Technology Stack

| Component | Project A (Website) | Project B (POS) |
|---|---|---|
| **Frontend** | React 19 + Vite 7 (rolldown) | React 19 + Vite 8 |
| **Styling** | Tailwind CSS 3 + custom CSS | Tailwind CSS 3 + shadcn/ui + Radix UI + CVA |
| **Language** | TypeScript 5.9 | TypeScript 6.0 |
| **Build** | tsc -b && vite build | tsc -b && vite build |
| **State/Data** | Direct SDK calls | TanStack React Query + IndexedDB |
| **Backend** | InsForge (Supabase-compatible) | InsForge (Supabase-compatible) |
| **Database** | PostgreSQL 15 (6aiag3ra) | PostgreSQL 15 (8cvkfu8m) |
| **Auth** | InsForge Auth (JWT) | InsForge Auth (JWT) with RBAC |
| **Payments** | Fonepay (QR + Web + Pay at Property) | Fonepay (QR + Tax Refund) |
| **Email** | Resend API | Not detected |
| **Real-time** | InsForge Realtime (WebSocket) | InsForge Realtime (WebSocket) |
| **Offline** | None | IndexedDB + Mutation Queue + Circuit Breaker |
| **Monitoring** | Client-side monitoring service | Sentry + Telemetry + Logger |
| **Testing** | Vitest (unit) | Vitest (unit + chaos tests) |
| **Deploy** | Netlify + Vercel | Not determined |

## B. InsForge Projects

| Property | Project A (Website) | Project B (POS) |
|---|---|---|
| **Project ID** | cf73bae1-25bf-4ef8-976c-9fc4d79ca2f2 | f03e468b-dfb9-4bd5-bade-6dfc34178179 |
| **Name** | HighLands Cafe Final | Highlands Cafe & Motel Inn Management |
| **App Key** | 6aiag3ra | 8cvkfu8m |
| **Region** | us-east | us-east |
| **DB URL** | 6aiag3ra.us-east.database.insforge.app | 8cvkfu8m.us-east.database.insforge.app |

## C. Folder Structures

### Project A (Website)
```
C:\Users\pawan\OneDrive\Desktop\Arjun/
  .insforge/project.json
  insforge/functions/
    _shared/ (ip-utils, rate-limiter, timing-safe)
    admin-recover-payment/
    cleanup-nonces/
    create-booking/
    fonepay-payment/
    health-check/
    payment-reconciliation/ (+ chaos.test.deno.ts)
    pos-sync-api/
    sync-webhook-sender/
    tiktok-feed/
    validate-upload/
  migrations/ (1 active migration)
  migrations_backup/ (24 historical migrations)
  src/
    App.tsx (all routes)
    main.tsx (entry)
    index.css (globals + Tailwind)
    components/ (common, admin, booking)
    pages/ (10 public + 11 admin)
    services/ (10 service files + 2 test files)
    hooks/ (usePolling, useWebSocket)
    utils/ (csv)
```

### Project B (POS)
```
C:\Users\pawan\OneDrive\Desktop\Highlands Cafe & Motel Inn/
  .insforge/project.json
  edge-functions/
    admin-update-user/
    booking-webhook/
    fonepay/ (QR + status + tax refund)
    fonepay-webhook/
    verify-admin-code/
    website-sync/ (push booking, push status, check availability, retry queue)
  src/
    App.tsx (all routes)
    main.tsx (entry)
    index.css (globals)
    types/index.ts (complete domain types)
    components/
      ui/ (shadcn: avatar, badge, button, card, dialog, dropdown-menu, input, label, select, separator, switch, table, tabs, toast)
      rooms/ (RoomCard, RoomFilters, RoomGrid, RoomList)
      tables/ (TableCard, TableGrid, table.service)
      common/ (ConfirmDialog, FonepayQRDialog, ImageUpload, KitchenOrderCard, Layout, OfflineBanner, OrderCard, PaymentCheckout, ProtectedRoute, QueueStatusBadge, SyncAdminPanel)
    pages/
      auth/ (LoginPage, SignUpPage, AdminLoginPage, AdminSignUpPage, VerifyEmail)
      dashboard/ (DashboardPage)
      pos/ (PosPage, SplitBillModal)
      orders/ (OrdersPage, CreateOrderPage)
      kitchen/ (KitchenPage)
      menu/ (MenuPage, MenuCategoryDialog, MenuItemDialog)
      inventory/ (InventoryPage, ProductForm, StockMovementForm)
      billing/ (BillingPage, InvoiceDetailPage, PaymentModal, PrintInvoice, SplitPaymentModal)
      motel/ (MotelPage, BookingForm, RoomDialog, RoomServiceForm)
      reports/ (ReportsPage)
      settings/ (SettingsPage)
      staff/ (StaffPage)
      admin/ (AuditLog, FeatureFlags, OperationalAnalytics, QueueInspector, StaffActivityLogs, SystemHealth, TableManagement, UserRoleManagement)
    lib/
      core/ (insforge, auth-context, query-client, query-keys, utils, validations, alerts, format-currency)
      hooks/ (analytics, billing, booking-sync, inventory, menu, motel, orders, tables)
      services/ (audit, booking-sync, booking-sync.types, circuit-breaker, csv-export, db-cleanup, deployment-check, feature-flags, fonepay, kitchen-sound, logger, mutation-queue, observation, payment-workflow, queue-db, queue-leader, realtime, release-channels, reports, security-monitor, sentry, sync, table-sessions, telemetry, upload)
    workbench/ (workflows)
```

## D. Edge Functions Inventory

### Project A (Website) — 10 functions
| Function | Purpose | Trigger |
|---|---|---|
| `create-booking` | Create reservation with conflict detection | HTTP POST |
| `fonepay-payment` | QR/Web payment generate & verify, tax refund | HTTP POST |
| `admin-recover-payment` | Force-confirm/expire stuck payments | HTTP POST |
| `payment-reconciliation` | Auto-resolve stuck payments | Scheduled (GET) |
| `sync-webhook-sender` | Push sync events to POS | Scheduled |
| `pos-sync-api` | POS data sync endpoint (rooms, bookings CRUD) | HTTP (GET/POST/PUT) |
| `health-check` | API health monitoring | HTTP GET |
| `cleanup-nonces` | Delete expired nonces | Scheduled |
| `tiktok-feed` | Fetch TikTok feed | HTTP GET |
| `validate-upload` | File upload validation | HTTP POST |

### Project B (POS) — 6 functions
| Function | Purpose | Trigger |
|---|---|---|
| `website-sync` | Push booking/status to Website, check availability, retry queue | HTTP POST |
| `booking-webhook` | Receive webhooks from Website, create/link bookings | HTTP POST |
| `fonepay` | Generate QR, check status, post tax refund | HTTP POST |
| `fonepay-webhook` | Receive Fonepay webhook callbacks | HTTP POST |
| `admin-update-user` | Admin user profile updates | HTTP POST |
| `verify-admin-code` | Verify admin access codes | HTTP POST |

## E. Database Entity Comparison

### Common Entities (exist in BOTH databases)
| Entity | Website | POS | Notes |
|---|---|---|---|
| `rooms` | Yes (flat: all fields in one table) | Yes (normalized: `rooms` + `room_types`) | Different schemas |
| `bookings` | Yes (flat: guest info + room_id) | Yes (more fields: booking_number, paid_amount, room_services) | Different columns |
| `room_images` | Yes | No (handled differently) | Website-only |
| `menu_items` | Yes (flat) | Yes (with `category_id` FK + modifiers) | POS has richer model |
| `menu_categories` | Yes | Yes | Similar |
| `user_profiles` | Yes | Yes | Same purpose |
| `payment_events` | Yes (audit table) | Similar in `audit_logs` | Different design |

### Website-Only Tables
| Table | Purpose |
|---|---|
| `site_content` | Editable text content for all pages (29 keys) |
| `site_images` | Image management by type (hero, gallery, cafe, exterior, other) |
| `booking_conflicts` | View for availability checking |
| `used_nonces` | Fonepay nonce tracking |
| `admins` | Admin user whitelist for RLS |
| `sync_events` | Queued sync events for webhook delivery |

### POS-Only Tables
| Table | Purpose |
|---|---|
| `room_types` | Room categories with base_price, max_guests |
| `room_services` | Services charged during stay (room service, minibar, etc.) |
| `room_state_transitions` | History of room status changes |
| `invoices` / `invoice_items` | Billing and invoicing |
| `payment_logs` / `payment_intents` | Payment tracking |
| `orders` / `order_items` | Cafe/restaurant ordering |
| `products` / `stock_movements` | Inventory management |
| `restaurant_tables` / `table_sessions` | Table management |
| `housekeeping_tasks` | Housekeeping scheduling |
| `maintenance_tasks` | Maintenance tracking |
| `suppliers` / `purchase_orders` | Supply chain |
| `audit_logs` | System audit trail |
| `system_events` | Event sourcing for real-time |
| `workflows` / `workflow_logs` | Workflow state machines |
| `mutation_queue` | Offline mutation queue |
| `room_mappings` | POS ↔ Website room ID mapping |
| `sync_logs` | Sync activity history |
| `sync_queue` | Retry queue for failed syncs |
| `external_bookings` | Links POS bookings to external (website) booking IDs |
| `bill_splits` / `split_items` / `split_payments` | Split bill management |
| `credit_customers` | Credit account customers |
| `recipes` / `recipe_versions` / `recipe_items` | Recipe management |
| `menu_item_modifiers` | Menu item customization options |
| `order_status_history` | Order status transitions |
| `inventory_holds` | Inventory reservation |
| `housekeeping_tasks` / `maintenance_tasks` | Task management |
| `feature_flags` | Feature toggle system |
| `release_channels` | Release management |

## F. Existing Sync Infrastructure (Already Built)

### POS → Website Sync (WORKING)
1. POS `BookingForm.tsx` creates booking → calls `pushBookingToWebsite()` → calls POS edge function `website-sync` → calls Website edge function `booking-webhook` → creates booking in Website DB
2. POS `MotelPage.tsx` check-in/check-out → calls `pushStatusUpdateToWebsite()` → calls POS `website-sync` → calls Website `booking-webhook` → updates Website booking status
3. `sync_logs` table tracks all sync attempts with status
4. `sync_queue` table holds failed syncs for retry
5. `external_bookings` table links POS booking IDs to Website booking IDs
6. `room_mappings` table maps POS rooms to Website rooms

### Website → POS Sync (PARTIALLY BUILT — NOT CONNECTED)
1. Website has `pos-sync-api` edge function that accepts requests (rooms, bookings CRUD)
2. Website has `sync-webhook-sender` scheduled function that reads `sync_events` and delivers to POS
3. But: Website-side booking creation (`create-booking` edge function) does NOT push to POS
4. Website admin booking changes do NOT trigger sync to POS
