-- Migration 018: Fix RLS policies — restrict authenticated access to admin-authorized users only
-- PRECEDENT: 013_rls_security_policies.sql was too permissive (all authenticated = full access)
-- NOTE: service_role + project_admin policies omitted intentionally:
--   Edge functions use service_role API key → RLS is BYPASSED entirely (no policies needed)
--   Those policies were never applied since the roles don't exist in this DB.

-- ── 1. Create admins table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated — admins table is edge-function-only
-- Edge functions bypass RLS via service_role API key

-- ── 2. Create helper function to check if current user is admin ──────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admins
        WHERE user_id = auth.uid()
    );
$$;

-- ── 3. Fix bookings policies ─────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_select_all_bookings" ON public.bookings;
CREATE POLICY "authenticated_select_own_bookings" ON public.bookings
    FOR SELECT TO authenticated
    USING (
        public.is_admin() OR guest_email = auth.email()
    );

DROP POLICY IF EXISTS "authenticated_update_bookings" ON public.bookings;
DROP POLICY IF EXISTS "authenticated_update_own_bookings" ON public.bookings;
CREATE POLICY "authenticated_update_own_bookings" ON public.bookings
    FOR UPDATE TO authenticated
    USING (
        public.is_admin() OR guest_email = auth.email()
    )
    WITH CHECK (
        public.is_admin() OR guest_email = auth.email()
    );

-- ── 4. Fix rooms policies ────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_all_rooms" ON public.rooms;
CREATE POLICY "authenticated_read_rooms" ON public.rooms
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "authenticated_manage_rooms" ON public.rooms;
CREATE POLICY "authenticated_manage_rooms" ON public.rooms
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ── 5. Fix room_images policies ──────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_all_room_images" ON public.room_images;
CREATE POLICY "authenticated_read_room_images" ON public.room_images
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "authenticated_manage_room_images" ON public.room_images;
CREATE POLICY "authenticated_manage_room_images" ON public.room_images
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ── 6. Fix site_content policies ─────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_all_site_content" ON public.site_content;
CREATE POLICY "authenticated_read_site_content" ON public.site_content
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "authenticated_manage_site_content" ON public.site_content;
CREATE POLICY "authenticated_manage_site_content" ON public.site_content
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ── 7. Fix site_images policies ──────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_all_site_images" ON public.site_images;
CREATE POLICY "authenticated_read_site_images" ON public.site_images
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "authenticated_manage_site_images" ON public.site_images;
CREATE POLICY "authenticated_manage_site_images" ON public.site_images
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ── 8. Fix menu_items policies ──────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_all_menu_items" ON public.menu_items;
CREATE POLICY "authenticated_read_menu_items" ON public.menu_items
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "authenticated_manage_menu_items" ON public.menu_items;
CREATE POLICY "authenticated_manage_menu_items" ON public.menu_items
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ── 9. Fix menu_categories policies ─────────────────────────────────
DROP POLICY IF EXISTS "authenticated_all_menu_categories" ON public.menu_categories;
CREATE POLICY "authenticated_read_menu_categories" ON public.menu_categories
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "authenticated_manage_menu_categories" ON public.menu_categories;
CREATE POLICY "authenticated_manage_menu_categories" ON public.menu_categories
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ── 10. Fix payments policies ───────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_select_own_payments" ON public.payments;
CREATE POLICY "authenticated_select_payments" ON public.payments
    FOR SELECT TO authenticated
    USING (public.is_admin());

-- ── 11. Fix payment_events policies ─────────────────────────────────
DROP POLICY IF EXISTS "authenticated_all_payment_events" ON public.payment_events;
CREATE POLICY "authenticated_select_payment_events" ON public.payment_events
    FOR SELECT TO authenticated
    USING (public.is_admin());

-- ── 12. Fix order_counter policies (if table exists) ────────────────
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'order_counter') THEN
        DROP POLICY IF EXISTS "authenticated_select_order_counter" ON public.order_counter;
        DROP POLICY IF EXISTS "authenticated_update_order_counter" ON public.order_counter;
        CREATE POLICY "authenticated_select_order_counter" ON public.order_counter
            FOR SELECT TO authenticated
            USING (public.is_admin());

        DROP POLICY IF EXISTS "authenticated_update_order_counter_admin" ON public.order_counter;
        CREATE POLICY "authenticated_update_order_counter_admin" ON public.order_counter
            FOR UPDATE TO authenticated
            USING (public.is_admin())
            WITH CHECK (public.is_admin());
    END IF;
END;
$$;
