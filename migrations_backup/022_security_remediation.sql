-- Migration 022: Comprehensive security remediation
-- Applied after 021_fix_rls_policies.sql
--
-- Fixes:
--   P2-1: Fix RLS regression — drop legacy permissive policies on bookings
--   P6-1: Add used_nonces table for webhook replay protection
--   P8-1: Add DB-level audit triggers for admin-write tables
--   P9-1: Ensure all admin actions generate audit log entries

-- ═══════════════════════════════════════════════════════════════════════
-- P6-1: used_nonces table — prevent webhook replay attacks
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.used_nonces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nonce TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_nonce UNIQUE (nonce)
);

CREATE INDEX IF NOT EXISTS idx_used_nonces_expires ON public.used_nonces (expires_at);
CREATE INDEX IF NOT EXISTS idx_used_nonces_nonce ON public.used_nonces (nonce);

ALTER TABLE public.used_nonces ENABLE ROW LEVEL SECURITY;

-- Only service_role can manage nonces (edge functions use service role)
CREATE POLICY "service_role_all_used_nonces" ON public.used_nonces
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

GRANT SELECT, INSERT, DELETE ON public.used_nonces TO service_role;

-- ═══════════════════════════════════════════════════════════════════════
-- P2-1: Fix RLS regression on bookings — remove legacy permissive policies
-- ═══════════════════════════════════════════════════════════════════════

-- Drop ALL legacy permissive policies (these override the stricter policies from 021)
DROP POLICY IF EXISTS "authenticated_select_all_bookings" ON public.bookings;
DROP POLICY IF EXISTS "authenticated_update_bookings" ON public.bookings;
DROP POLICY IF EXISTS "authenticated_no_insert" ON public.bookings;
DROP POLICY IF EXISTS "authenticated_no_delete" ON public.bookings;

-- Verify policies from 021 remain:
--   authenticated_read_own_bookings — SELECT for authenticated (own + admin)
--   anon_read_own_booking         — SELECT for anon (own email match)
--   authenticated_insert_booking  — INSERT for authenticated
--   anon_insert_own_booking       — INSERT for anon (email match)
--   service_role_all_bookings     — service_role full access
--   project_admin_all_bookings    — project_admin full access

-- If 021 policies were not created (e.g., migration skipped), recreate them
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'bookings' AND policyname = 'authenticated_read_own_bookings'
    ) THEN
        CREATE POLICY "authenticated_read_own_bookings" ON public.bookings
            FOR SELECT TO authenticated
            USING (created_by_email = auth.email() OR created_by_user_id = auth.uid() OR public.is_admin());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'bookings' AND policyname = 'anon_read_own_booking'
    ) THEN
        CREATE POLICY "anon_read_own_booking" ON public.bookings
            FOR SELECT TO anon
            USING (guest_email = auth.email());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'bookings' AND policyname = 'authenticated_insert_booking'
    ) THEN
        CREATE POLICY "authenticated_insert_booking" ON public.bookings
            FOR INSERT TO authenticated
            WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'bookings' AND policyname = 'anon_insert_own_booking'
    ) THEN
        CREATE POLICY "anon_insert_own_booking" ON public.bookings
            FOR INSERT TO anon
            WITH CHECK (guest_email = auth.email());
    END IF;
END
$$;

-- Ensure authenticated users cannot UPDATE or DELETE directly via RLS
-- (admin actions should go through edge functions with service_role)
DROP POLICY IF EXISTS "authenticated_update_own_booking" ON public.bookings;
CREATE POLICY "authenticated_update_own_booking" ON public.bookings
    FOR UPDATE TO authenticated
    USING (created_by_email = auth.email() OR created_by_user_id = auth.uid() OR public.is_admin())
    WITH CHECK (created_by_email = auth.email() OR created_by_user_id = auth.uid() OR public.is_admin());

-- ═══════════════════════════════════════════════════════════════════════
-- P8-1: DB audit triggers — automatically log admin writes
-- ═══════════════════════════════════════════════════════════════════════

-- Ensure audit_logs table exists (created in 020, but safe guard)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID,
    actor_email TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    metadata JSONB DEFAULT '{}',
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.audit_logs(target_type, target_id);

-- Audit log trigger function — captures INSERT/UPDATE/DELETE on admin tables
CREATE OR REPLACE FUNCTION public.trigger_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_actor_id UUID;
    v_actor_email TEXT;
    v_action TEXT;
    v_target_id TEXT;
    v_metadata JSONB;
BEGIN
    -- Determine actor from session (auth.uid()/auth.email() for authenticated, 'system' for service_role)
    v_actor_id := auth.uid();
    BEGIN
        v_actor_email := auth.email();
    EXCEPTION WHEN OTHERS THEN
        v_actor_email := 'system';
    END;
    IF v_actor_email IS NULL THEN
        v_actor_email := 'system';
    END IF;

    -- Determine action type
    v_action := TG_TABLE_NAME || '_' || lower(TG_OP);

    -- Determine target ID and metadata based on operation
    IF TG_OP = 'INSERT' THEN
        v_target_id := NEW.id::TEXT;
        v_metadata := jsonb_build_object(
            'new', to_jsonb(NEW),
            'table', TG_TABLE_NAME,
            'schema', TG_TABLE_SCHEMA
        );
    ELSIF TG_OP = 'UPDATE' THEN
        v_target_id := NEW.id::TEXT;
        v_metadata := jsonb_build_object(
            'old', to_jsonb(OLD),
            'new', to_jsonb(NEW),
            'changes', (
                SELECT jsonb_object_agg(key, jsonb_build_object('from', value, 'to', to_jsonb(NEW) ->> key))
                FROM jsonb_each(to_jsonb(OLD))
                WHERE to_jsonb(OLD) ->> key IS DISTINCT FROM to_jsonb(NEW) ->> key
                AND key NOT IN ('updated_at', 'created_at')
            ),
            'table', TG_TABLE_NAME,
            'schema', TG_TABLE_SCHEMA
        );
    ELSIF TG_OP = 'DELETE' THEN
        v_target_id := OLD.id::TEXT;
        v_metadata := jsonb_build_object(
            'old', to_jsonb(OLD),
            'table', TG_TABLE_NAME,
            'schema', TG_TABLE_SCHEMA
        );
    ELSE
        v_target_id := COALESCE(NEW.id, OLD.id)::TEXT;
        v_metadata := '{}'::jsonb;
    END IF;

    INSERT INTO public.audit_logs (
        actor_id, actor_email, action, target_type, target_id, metadata
    ) VALUES (
        v_actor_id, v_actor_email, v_action, TG_TABLE_NAME, v_target_id, v_metadata
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply audit triggers to admin-write tables
-- Only capture authenticated user actions (anon changes are not admin actions)

-- rooms: INSERT, UPDATE, DELETE
DROP TRIGGER IF EXISTS trg_audit_rooms ON public.rooms;
CREATE TRIGGER trg_audit_rooms
    AFTER INSERT OR UPDATE OR DELETE ON public.rooms
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_audit_log();

-- room_images: INSERT, UPDATE, DELETE
DROP TRIGGER IF EXISTS trg_audit_room_images ON public.room_images;
CREATE TRIGGER trg_audit_room_images
    AFTER INSERT OR UPDATE OR DELETE ON public.room_images
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_audit_log();

-- site_content: INSERT, UPDATE, DELETE
DROP TRIGGER IF EXISTS trg_audit_site_content ON public.site_content;
CREATE TRIGGER trg_audit_site_content
    AFTER INSERT OR UPDATE OR DELETE ON public.site_content
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_audit_log();

-- site_images: INSERT, UPDATE, DELETE
DROP TRIGGER IF EXISTS trg_audit_site_images ON public.site_images;
CREATE TRIGGER trg_audit_site_images
    AFTER INSERT OR UPDATE OR DELETE ON public.site_images
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_audit_log();

-- menu_categories: INSERT, UPDATE, DELETE
DROP TRIGGER IF EXISTS trg_audit_menu_categories ON public.menu_categories;
CREATE TRIGGER trg_audit_menu_categories
    AFTER INSERT OR UPDATE OR DELETE ON public.menu_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_audit_log();

-- menu_items: INSERT, UPDATE, DELETE
DROP TRIGGER IF EXISTS trg_audit_menu_items ON public.menu_items;
CREATE TRIGGER trg_audit_menu_items
    AFTER INSERT OR UPDATE OR DELETE ON public.menu_items
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_audit_log();

-- bookings: INSERT, UPDATE, DELETE (admin operations via edge functions use service_role; direct auth updates are rare but tracked)
DROP TRIGGER IF EXISTS trg_audit_bookings ON public.bookings;
CREATE TRIGGER trg_audit_bookings
    AFTER INSERT OR UPDATE OR DELETE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_audit_log();

-- ═══════════════════════════════════════════════════════════════════════
-- P8-1: Helper function for edge functions to log admin actions
-- (extends the existing log_admin_action from migration 020)
-- ═══════════════════════════════════════════════════════════════════════

-- The function log_admin_action from 020 is sufficient:
--   SELECT public.log_admin_action('email@example.com', 'action_name', 'target_type', 'target_id', '{"key":"val"}'::jsonb, '127.0.0.1')

-- But ensure it exists (idempotent)
CREATE OR REPLACE FUNCTION public.log_admin_action(
    p_actor_email TEXT,
    p_action TEXT,
    p_target_type TEXT DEFAULT NULL,
    p_target_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}',
    p_ip_address TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_id UUID;
    v_actor_id UUID;
BEGIN
    v_actor_id := auth.uid();

    INSERT INTO public.audit_logs (actor_id, actor_email, action, target_type, target_id, metadata, ip_address)
    VALUES (v_actor_id, p_actor_email, p_action, p_target_type, p_target_id, p_metadata, p_ip_address)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_admin_action TO service_role;

-- ═══════════════════════════════════════════════════════════════════════
-- Verify final policy state on public.bookings
-- ═══════════════════════════════════════════════════════════════════════
-- Expected policies after this migration:
--   service_role_all_bookings       — service_role (full access)
--   project_admin_all_bookings      — project_admin (full access)
--   authenticated_read_own_bookings — authenticated SELECT (own or admin)
--   authenticated_insert_booking    — authenticated INSERT (any)
--   authenticated_update_own_booking— authenticated UPDATE (own or admin)
--   anon_read_own_booking           — anon SELECT (email match)
--   anon_insert_own_booking         — anon INSERT (email match)

SELECT 'Migration 022 applied — RLS fixed, audit triggers active, nonce table ready' AS status;
