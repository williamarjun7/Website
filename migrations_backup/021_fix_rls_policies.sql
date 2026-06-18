-- Migration 021: Fix RLS policies — anon/authenticated separation, booking ownership
-- Applied after 020_security_hardening.sql

-- ═══════════════════════════════════════════════════════════════════════
-- H1: Fix booking RLS — prevent viewing others' bookings
-- ═══════════════════════════════════════════════════════════════════════

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.bookings;
DROP POLICY IF EXISTS "Enable read access for authenticated users based on admin status" ON public.bookings;
DROP POLICY IF EXISTS "Enable read access for own booking" ON public.bookings;

-- Strict: authenticated users can only see their own bookings
CREATE POLICY "authenticated_read_own_bookings" ON public.bookings
    FOR SELECT
    TO authenticated
    USING (
        created_by_email = auth.email()
        OR created_by_user_id = auth.uid()
        OR public.is_admin()
    );

-- H1 fix: anon can only see their own booking by email
CREATE POLICY "anon_read_own_booking" ON public.bookings
    FOR SELECT
    TO anon
    USING (guest_email = auth.email());

-- Drop old booking insert policies to replace
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.bookings;
DROP POLICY IF EXISTS "Enable insert for anon users" ON public.bookings;
DROP POLICY IF EXISTS "Enable insert for authenticated and anon users" ON public.bookings;

-- Insert: authenticated users can insert (will be set via trigger)
CREATE POLICY "authenticated_insert_booking" ON public.bookings
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Anon can only insert if the guest_email matches their auth email
CREATE POLICY "anon_insert_own_booking" ON public.bookings
    FOR INSERT
    TO anon
    WITH CHECK (guest_email = auth.email());

-- ═══════════════════════════════════════════════════════════════════════
-- H3: Admin-only tables — ensure non-admins cannot read
-- ═══════════════════════════════════════════════════════════════════════

-- POS sync data: only service_role and admin via is_admin()
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.pos_sync_data;
DROP POLICY IF EXISTS "Enable all for anon users" ON public.pos_sync_data;

CREATE POLICY "pos_sync_admin_only" ON public.pos_sync_data
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "pos_sync_service_role" ON public.pos_sync_data
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Revenue table: only service_role and admin
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.revenue;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.revenue;

CREATE POLICY "revenue_admin_only" ON public.revenue
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "revenue_service_role" ON public.revenue
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
