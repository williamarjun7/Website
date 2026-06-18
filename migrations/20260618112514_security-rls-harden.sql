-- Migration: security-rls-harden
-- Enables RLS on all public tables, creates proper anon SELECT policies,
-- drops dangerous permissive policies from {public} role,
-- and protects SECURITY DEFINER functions.

-- ═══════════════════════════════════════════════════════════════════
-- 1. Enable RLS on all unprotected tables
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms FORCE ROW LEVEL SECURITY;

ALTER TABLE public.room_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_images FORCE ROW LEVEL SECURITY;

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_content FORCE ROW LEVEL SECURITY;

ALTER TABLE public.site_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_images FORCE ROW LEVEL SECURITY;

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items FORCE ROW LEVEL SECURITY;

ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories FORCE ROW LEVEL SECURITY;

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events FORCE ROW LEVEL SECURITY;

ALTER TABLE public.bookings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.payments FORCE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════
-- 2. Anon SELECT policies for public display data
-- ═══════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS anon_select_rooms ON public.rooms;
CREATE POLICY anon_select_rooms ON public.rooms FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS anon_select_room_images ON public.room_images;
CREATE POLICY anon_select_room_images ON public.room_images FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS anon_select_site_content ON public.site_content;
CREATE POLICY anon_select_site_content ON public.site_content FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS anon_select_site_images ON public.site_images;
CREATE POLICY anon_select_site_images ON public.site_images FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS anon_select_menu_items ON public.menu_items;
CREATE POLICY anon_select_menu_items ON public.menu_items FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS anon_select_menu_categories ON public.menu_categories;
CREATE POLICY anon_select_menu_categories ON public.menu_categories FOR SELECT TO anon USING (true);

-- ═══════════════════════════════════════════════════════════════════
-- 3. Drop dangerous permissive policies on {public} role
--    service_role bypasses RLS by default — no replacement needed
-- ═══════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS service_role_all_bookings ON public.bookings;
DROP POLICY IF EXISTS service_role_all_payments ON public.payments;
DROP POLICY IF EXISTS service_role_all_audit_logs ON public.audit_logs;

-- ═══════════════════════════════════════════════════════════════════
-- 4. Anon booking/payment lookup by guest_email
-- ═══════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS anon_select_own_booking ON public.bookings;
CREATE POLICY anon_select_own_booking ON public.bookings FOR SELECT TO anon USING (guest_email = auth.email());

DROP POLICY IF EXISTS anon_select_own_payments ON public.payments;
CREATE POLICY anon_select_own_payments ON public.payments FOR SELECT TO anon USING (
  EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = payments.booking_id AND bookings.guest_email = auth.email())
);

-- ═══════════════════════════════════════════════════════════════════
-- 5. Protect SECURITY DEFINER functions with search_path
-- ═══════════════════════════════════════════════════════════════════

ALTER FUNCTION public.is_admin() SECURITY DEFINER SET search_path = '';
ALTER FUNCTION public.confirm_booking_payment(uuid, uuid, text, numeric, text) SECURITY DEFINER SET search_path = '';
ALTER FUNCTION public.emit_booking_sync_event() SECURITY DEFINER SET search_path = '';
ALTER FUNCTION public.trigger_audit_log() SECURITY DEFINER SET search_path = '';
ALTER FUNCTION public.log_admin_action(text, text, text, text, jsonb, text) SECURITY DEFINER SET search_path = '';
ALTER FUNCTION public.insert_used_nonce(text, timestamptz) SECURITY DEFINER SET search_path = '';

-- ═══════════════════════════════════════════════════════════════════
-- 6. Revoke dangerous EXECUTE from public
-- ═══════════════════════════════════════════════════════════════════

REVOKE EXECUTE ON FUNCTION public.confirm_booking_payment(uuid, uuid, text, numeric, text) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.insert_used_nonce(text, timestamptz) FROM public, anon;

SELECT 'Migration 20260618112514 applied — RLS hardened, dangerous policies dropped, SEARCH_PATH protected' AS status;
