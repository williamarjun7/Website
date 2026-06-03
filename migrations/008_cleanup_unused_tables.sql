-- Migrate 008 (applied live 2026-06-03)
-- Cleanup: Drop ~55 unused tables/enums from website DB (6aiag3ra).
-- Also create tables that were missing: payments, payment_events, room_images, site_content.

-- ── Drop orphaned tables ──────────────────────────────────────────

-- Blocked dates (nothing writes to it; bookings table is source of truth for availability)
DROP TABLE IF EXISTS public.blocked_dates CASCADE;

-- Sync
DROP TABLE IF EXISTS public.sync_queue CASCADE;
DROP TABLE IF EXISTS public.sync_logs CASCADE;
DROP TABLE IF EXISTS public.external_bookings CASCADE;

-- Orders (website is display-only)
DROP TABLE IF EXISTS public.order_status_history CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.order_counter CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;

-- Inventory & recipes
DROP TABLE IF EXISTS public.inventory_holds CASCADE;
DROP TABLE IF EXISTS public.stock_movements CASCADE;
DROP TABLE IF EXISTS public.inventory CASCADE;
DROP TABLE IF EXISTS public.recipe_items CASCADE;
DROP TABLE IF EXISTS public.recipe_versions CASCADE;
DROP TABLE IF EXISTS public.recipes CASCADE;

-- Products
DROP TABLE IF EXISTS public.product_images CASCADE;
DROP TABLE IF EXISTS public.product_variants CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;

-- Billing
DROP TABLE IF EXISTS public.payment_intents CASCADE;
DROP TABLE IF EXISTS public.payment_logs CASCADE;
DROP TABLE IF EXISTS public.invoice_items CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.bills CASCADE;

-- Branches & tables
DROP TABLE IF EXISTS public.restaurant_tables CASCADE;
DROP TABLE IF EXISTS public.restaurants CASCADE;
DROP TABLE IF EXISTS public.branches CASCADE;
DROP TABLE IF EXISTS public.tables CASCADE;

-- Housekeeping & suppliers
DROP TABLE IF EXISTS public.housekeeping_tasks CASCADE;
DROP TABLE IF EXISTS public.maintenance_tasks CASCADE;
DROP TABLE IF EXISTS public.purchase_order_items CASCADE;
DROP TABLE IF EXISTS public.purchase_orders CASCADE;
DROP TABLE IF EXISTS public.suppliers CASCADE;

-- Guest features
DROP TABLE IF EXISTS public.guest_sessions CASCADE;
DROP TABLE IF EXISTS public.qr_sessions CASCADE;
DROP TABLE IF EXISTS public.qr_banners CASCADE;

-- Staff
DROP TABLE IF EXISTS public.staff_documents CASCADE;
DROP TABLE IF EXISTS public.staff_profiles CASCADE;

-- Auth/roles
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Misc
DROP TABLE IF EXISTS public.idempotency_keys CASCADE;
DROP TABLE IF EXISTS public.event_logs CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.system_events CASCADE;
DROP TABLE IF EXISTS public.promotions CASCADE;
DROP TABLE IF EXISTS public.compatibility_rules CASCADE;
DROP TABLE IF EXISTS public.emi_plans CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.saved_builds CASCADE;

-- Media
DROP TABLE IF EXISTS public.media_assets CASCADE;
DROP TABLE IF EXISTS public.media CASCADE;

-- Room extras
DROP TABLE IF EXISTS public.room_galleries CASCADE;
DROP TABLE IF EXISTS public.room_mappings CASCADE;

-- Homepage CMS
DROP TABLE IF EXISTS public.homepage_sections CASCADE;

-- Menu extras
DROP TABLE IF EXISTS public.menu_item_modifiers CASCADE;
DROP TABLE IF EXISTS public.menu_item_ingredients CASCADE;

-- Ryota bike configurator tables
DROP TABLE IF EXISTS public.ryota_saved_builds CASCADE;
DROP TABLE IF EXISTS public.ryota_reviews CASCADE;
DROP TABLE IF EXISTS public.ryota_profiles CASCADE;
DROP TABLE IF EXISTS public.ryota_products CASCADE;
DROP TABLE IF EXISTS public.ryota_product_variants CASCADE;
DROP TABLE IF EXISTS public.ryota_product_images CASCADE;
DROP TABLE IF EXISTS public.ryota_orders CASCADE;
DROP TABLE IF EXISTS public.ryota_order_items CASCADE;
DROP TABLE IF EXISTS public.ryota_media_assets CASCADE;
DROP TABLE IF EXISTS public.ryota_homepage_sections CASCADE;
DROP TABLE IF EXISTS public.ryota_emi_plans CASCADE;
DROP TABLE IF EXISTS public.ryota_compatibility_rules CASCADE;
DROP TABLE IF EXISTS public.ryota_categories CASCADE;

-- ── Drop orphaned enums ───────────────────────────────────────────
DROP TYPE IF EXISTS public.invoice_status;
DROP TYPE IF EXISTS public.order_status;
DROP TYPE IF EXISTS public.session_status;
DROP TYPE IF EXISTS public.stock_movement_type;
DROP TYPE IF EXISTS public.table_status;
DROP TYPE IF EXISTS public.user_role;
DROP TYPE IF EXISTS public.booking_status;
DROP TYPE IF EXISTS public.room_status;
DROP TYPE IF EXISTS public.room_type;
DROP TYPE IF EXISTS public.payment_method;
DROP TYPE IF EXISTS public.payment_status;

-- ── Drop orphaned sequence ───────────────────────────────────────
DROP SEQUENCE IF EXISTS public.order_number_seq;

-- ── Drop orphaned functions (triggered on now-dropped tables) ─────
DROP FUNCTION IF EXISTS public.notify_bill_event;
DROP FUNCTION IF EXISTS public.notify_low_stock;
DROP FUNCTION IF EXISTS public.notify_menu_item_event;
DROP FUNCTION IF EXISTS public.notify_new_order;
DROP FUNCTION IF EXISTS public.notify_order_status;
DROP FUNCTION IF EXISTS public.notify_order_status_change;
DROP FUNCTION IF EXISTS public.notify_room_status;
DROP FUNCTION IF EXISTS public.test_func;
DROP FUNCTION IF EXISTS public.test_plpgsql;

-- ── Create missing tables ────────────────────────────────────────

-- Payments (referenced by fonepay-payment edge function)
CREATE TABLE IF NOT EXISTS payments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  prn          TEXT NOT NULL UNIQUE,
  amount       NUMERIC(10,2) NOT NULL,
  currency     TEXT NOT NULL DEFAULT 'NPR',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('fonepay_qr', 'fonepay_web')),
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  response_code  TEXT,
  response_msg   TEXT,
  verified_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payment events log (referenced by fonepay-payment edge function)
CREATE TABLE IF NOT EXISTS payment_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id  UUID REFERENCES payments(id) ON DELETE CASCADE,
  booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  event_type  TEXT NOT NULL,
  old_status  TEXT,
  new_status  TEXT,
  payload     JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Room images (referenced by roomService.ts)
CREATE TABLE IF NOT EXISTS room_images (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  alt_text   TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Site content KV store (referenced by contentService.ts)
CREATE TABLE IF NOT EXISTS site_content (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT NOT NULL UNIQUE,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
