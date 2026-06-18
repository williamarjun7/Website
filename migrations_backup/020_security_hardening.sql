-- Migration 020: Security hardening — rate limiting, audit logging, order_counter lock down
-- Applied after 019_edge_function_security_fixes.sql

-- ═══════════════════════════════════════════════════════════════════════
-- C4: Lock down order_counter — revoke excessive privileges
-- ═══════════════════════════════════════════════════════════════════════
REVOKE ALL ON public.order_counter FROM anon;
REVOKE ALL ON public.order_counter FROM authenticated;
GRANT SELECT ON public.order_counter TO authenticated;

REVOKE ALL ON SEQUENCE public.order_number_seq FROM anon;
REVOKE ALL ON SEQUENCE public.order_number_seq FROM authenticated;
GRANT USAGE ON SEQUENCE public.order_number_seq TO service_role;

-- ═══════════════════════════════════════════════════════════════════════
-- C1: Rate limiting infrastructure (distributed, survives cold starts)
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    count INTEGER NOT NULL DEFAULT 1,
    max_requests INTEGER NOT NULL,
    window_seconds INTEGER NOT NULL DEFAULT 60,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_rate_limit_key_window UNIQUE (key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup
    ON public.rate_limits (window_start)
    WHERE window_start < now() - interval '1 hour';

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service_role can access rate_limits
CREATE POLICY "service_role_all_rate_limits" ON public.rate_limits
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Rate limit check function (atomic upsert)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_key TEXT,
    p_max_requests INTEGER DEFAULT 10,
    p_window_seconds INTEGER DEFAULT 60
) RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_window_start TIMESTAMPTZ;
    v_count INTEGER;
    v_retry_after INTEGER;
    v_result JSONB;
BEGIN
    v_window_start := date_trunc('minute', now());

    -- Cleanup old entries periodically
    DELETE FROM public.rate_limits
    WHERE window_start < now() - (interval '1 hour')
      AND window_start < v_window_start;

    -- Insert or increment counter (atomic)
    INSERT INTO public.rate_limits (key, window_start, count, max_requests, window_seconds)
    VALUES (p_key, v_window_start, 1, p_max_requests, p_window_seconds)
    ON CONFLICT (key, window_start)
    DO UPDATE SET count = rate_limits.count + 1
    RETURNING count INTO v_count;

    -- Check if rate limited
    IF v_count > p_max_requests THEN
        v_retry_after := p_window_seconds - EXTRACT(EPOCH FROM now() - v_window_start)::INTEGER;
        RETURN jsonb_build_object(
            'allowed', false,
            'retry_after', GREATEST(v_retry_after, 0)
        );
    END IF;

    RETURN jsonb_build_object('allowed', true, 'count', v_count);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════
-- H3: Admin audit logging table
-- ═══════════════════════════════════════════════════════════════════════
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

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only service_role can write; is_admin() can read
CREATE POLICY "service_role_all_audit_logs" ON public.audit_logs
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Audit log helper function (insert-only via service_role)
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
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.audit_logs (actor_email, action, target_type, target_id, metadata, ip_address)
    VALUES (p_actor_email, p_action, p_target_type, p_target_id, p_metadata, p_ip_address)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════
-- Add trusted_client_ip to bookings for ownership tracking
-- ═══════════════════════════════════════════════════════════════════════
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS created_by_user_id UUID;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS created_by_email TEXT;

-- Grant restricted access
GRANT SELECT ON public.rate_limits TO service_role;
GRANT SELECT, INSERT ON public.audit_logs TO service_role;
