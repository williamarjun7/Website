-- Migration 013: Row Level Security policies for ALL tables
-- Adds RLS policies matching the access patterns used in the frontend code.
-- Safe for re-runs: drops existing policies before creating.

-- ── Enable RLS on tables that don't have it ──────────────────────────
ALTER TABLE IF EXISTS public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.room_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.site_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_counter ENABLE ROW LEVEL SECURITY;

-- payments, payment_events, sync_events already have RLS enabled

-- ── Revoke overly permissive grants ───────────────────────────────────
-- sync_events: anon should not have ALL (service_role only for edge functions)
REVOKE ALL ON TABLE public.sync_events FROM anon;
REVOKE ALL ON TABLE public.sync_events FROM authenticated;

-- order_counter: anon should not have ALL (too permissive)
REVOKE ALL ON TABLE public.order_counter FROM anon;

-- ── 1. bookings ─────────────────────────────────────────────────────
-- Anon: no direct access to bookings table. All booking operations
-- go through edge functions (create-booking, fonepay-payment) which
-- use service_role key and bypass RLS.
DROP POLICY IF EXISTS "anon_select_own_bookings" ON public.bookings;
DROP POLICY IF EXISTS "anon_insert_bookings" ON public.bookings;

-- Authenticated users (admins logged in via auth): full read + update on all bookings
DROP POLICY IF EXISTS "authenticated_select_all_bookings" ON public.bookings;
CREATE POLICY "authenticated_select_all_bookings" ON public.bookings
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "authenticated_update_bookings" ON public.bookings;
CREATE POLICY "authenticated_update_bookings" ON public.bookings
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Authenticated: deny INSERT/DELETE (admin operations use edge functions with service_role)
DROP POLICY IF EXISTS "authenticated_delete_bookings" ON public.bookings;
CREATE POLICY "authenticated_no_insert" ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "authenticated_no_delete" ON public.bookings;
CREATE POLICY "authenticated_no_delete" ON public.bookings
  FOR DELETE TO authenticated
  USING (false);

DROP POLICY IF EXISTS "service_role_all_bookings" ON public.bookings;
CREATE POLICY "service_role_all_bookings" ON public.bookings
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "project_admin_all_bookings" ON public.bookings;
CREATE POLICY "project_admin_all_bookings" ON public.bookings
  FOR ALL TO project_admin
  USING (true)
  WITH CHECK (true);

-- ── 2. rooms ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "anon_select_active_rooms" ON public.rooms;
CREATE POLICY "anon_select_active_rooms" ON public.rooms
  FOR SELECT TO anon
  USING (is_active = true);

DROP POLICY IF EXISTS "authenticated_all_rooms" ON public.rooms;
CREATE POLICY "authenticated_all_rooms" ON public.rooms
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_rooms" ON public.rooms;
CREATE POLICY "service_role_all_rooms" ON public.rooms
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "project_admin_all_rooms" ON public.rooms;
CREATE POLICY "project_admin_all_rooms" ON public.rooms
  FOR ALL TO project_admin
  USING (true)
  WITH CHECK (true);

-- ── 3. room_images ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "anon_select_room_images" ON public.room_images;
CREATE POLICY "anon_select_room_images" ON public.room_images
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "authenticated_all_room_images" ON public.room_images;
CREATE POLICY "authenticated_all_room_images" ON public.room_images
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_room_images" ON public.room_images;
CREATE POLICY "service_role_all_room_images" ON public.room_images
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "project_admin_all_room_images" ON public.room_images;
CREATE POLICY "project_admin_all_room_images" ON public.room_images
  FOR ALL TO project_admin
  USING (true)
  WITH CHECK (true);

-- ── 4. site_content ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "anon_select_site_content" ON public.site_content;
CREATE POLICY "anon_select_site_content" ON public.site_content
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "authenticated_all_site_content" ON public.site_content;
CREATE POLICY "authenticated_all_site_content" ON public.site_content
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_site_content" ON public.site_content;
CREATE POLICY "service_role_all_site_content" ON public.site_content
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "project_admin_all_site_content" ON public.site_content;
CREATE POLICY "project_admin_all_site_content" ON public.site_content
  FOR ALL TO project_admin
  USING (true)
  WITH CHECK (true);

-- ── 5. site_images ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "anon_select_active_site_images" ON public.site_images;
CREATE POLICY "anon_select_active_site_images" ON public.site_images
  FOR SELECT TO anon
  USING (is_active = true);

DROP POLICY IF EXISTS "authenticated_all_site_images" ON public.site_images;
CREATE POLICY "authenticated_all_site_images" ON public.site_images
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_site_images" ON public.site_images;
CREATE POLICY "service_role_all_site_images" ON public.site_images
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "project_admin_all_site_images" ON public.site_images;
CREATE POLICY "project_admin_all_site_images" ON public.site_images
  FOR ALL TO project_admin
  USING (true)
  WITH CHECK (true);

-- ── 6. menu_items ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "anon_select_available_menu_items" ON public.menu_items;
CREATE POLICY "anon_select_available_menu_items" ON public.menu_items
  FOR SELECT TO anon
  USING (available = true);

DROP POLICY IF EXISTS "authenticated_all_menu_items" ON public.menu_items;
CREATE POLICY "authenticated_all_menu_items" ON public.menu_items
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_menu_items" ON public.menu_items;
CREATE POLICY "service_role_all_menu_items" ON public.menu_items
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "project_admin_all_menu_items" ON public.menu_items;
CREATE POLICY "project_admin_all_menu_items" ON public.menu_items
  FOR ALL TO project_admin
  USING (true)
  WITH CHECK (true);

-- ── 7. menu_categories ──────────────────────────────────────────────
DROP POLICY IF EXISTS "anon_select_active_menu_categories" ON public.menu_categories;
CREATE POLICY "anon_select_active_menu_categories" ON public.menu_categories
  FOR SELECT TO anon
  USING (is_active = true);

DROP POLICY IF EXISTS "authenticated_all_menu_categories" ON public.menu_categories;
CREATE POLICY "authenticated_all_menu_categories" ON public.menu_categories
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_menu_categories" ON public.menu_categories;
CREATE POLICY "service_role_all_menu_categories" ON public.menu_categories
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "project_admin_all_menu_categories" ON public.menu_categories;
CREATE POLICY "project_admin_all_menu_categories" ON public.menu_categories
  FOR ALL TO project_admin
  USING (true)
  WITH CHECK (true);

-- ── 8. payments ─────────────────────────────────────────────────────
-- anon: explicitly deny (no SELECT for anonymous users)
DROP POLICY IF EXISTS "anon_no_access_payments" ON public.payments;
CREATE POLICY "anon_no_access_payments" ON public.payments
  FOR ALL TO anon
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "authenticated_select_own_payments" ON public.payments;
CREATE POLICY "authenticated_select_own_payments" ON public.payments
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "service_role_all_payments" ON public.payments;
CREATE POLICY "service_role_all_payments" ON public.payments
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "project_admin_all_payments" ON public.payments;
CREATE POLICY "project_admin_all_payments" ON public.payments
  FOR ALL TO project_admin
  USING (true)
  WITH CHECK (true);

-- ── 9. payment_events ───────────────────────────────────────────────
DROP POLICY IF EXISTS "anon_no_access_payment_events" ON public.payment_events;
CREATE POLICY "anon_no_access_payment_events" ON public.payment_events
  FOR ALL TO anon
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "authenticated_all_payment_events" ON public.payment_events;
CREATE POLICY "authenticated_all_payment_events" ON public.payment_events
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_payment_events" ON public.payment_events;
CREATE POLICY "service_role_all_payment_events" ON public.payment_events
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "project_admin_all_payment_events" ON public.payment_events;
CREATE POLICY "project_admin_all_payment_events" ON public.payment_events
  FOR ALL TO project_admin
  USING (true)
  WITH CHECK (true);

-- ── 10. sync_events ─────────────────────────────────────────────────
-- Replace existing project_admin_policy with more granular policies
DROP POLICY IF EXISTS "project_admin_policy" ON public.sync_events;

DROP POLICY IF EXISTS "service_role_all_sync_events" ON public.sync_events;
CREATE POLICY "service_role_all_sync_events" ON public.sync_events
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "project_admin_all_sync_events" ON public.sync_events;
CREATE POLICY "project_admin_all_sync_events" ON public.sync_events
  FOR ALL TO project_admin
  USING (true)
  WITH CHECK (true);

-- ── 11. order_counter ───────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_select_order_counter" ON public.order_counter;
CREATE POLICY "authenticated_select_order_counter" ON public.order_counter
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "authenticated_update_order_counter" ON public.order_counter;
CREATE POLICY "authenticated_update_order_counter" ON public.order_counter
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_all_order_counter" ON public.order_counter;
CREATE POLICY "service_role_all_order_counter" ON public.order_counter
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "project_admin_all_order_counter" ON public.order_counter;
CREATE POLICY "project_admin_all_order_counter" ON public.order_counter
  FOR ALL TO project_admin
  USING (true)
  WITH CHECK (true);
