-- Migration: all-fields-sync + reconciliation
-- 1. Expands booking sync trigger to fire on all reservation-related fields.
-- 2. Creates sync_reconciliation_logs table for drift detection.

-- ═══════════════════════════════════════════════════════════════════
-- 1. Replace trigger function — fire on ALL booking field changes
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.emit_booking_sync_event_v2()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
DECLARE
  v_origin text;
  v_trace_id uuid;
  v_parent_id uuid;
  v_sync_fields_changed boolean;
BEGIN
  -- Read origin from the row: bookings originating from POS carry source='pos'
  IF NEW.source = 'pos' THEN
    v_origin := 'pos';
  ELSE
    v_origin := 'website';
  END IF;

  -- LOOP PREVENTION: NEVER emit sync event if this booking came from POS.
  IF v_origin = 'pos' THEN
    RETURN NEW;
  END IF;

  -- Dedup: on UPDATE, only emit if one of the tracked fields actually changed.
  -- This prevents duplicate sync events when the same value is re-applied.
  IF TG_OP = 'UPDATE' THEN
    v_sync_fields_changed := (
      NEW.booking_status IS DISTINCT FROM OLD.booking_status
      OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
      OR NEW.guest_name IS DISTINCT FROM OLD.guest_name
      OR NEW.guest_phone IS DISTINCT FROM OLD.guest_phone
      OR NEW.guest_email IS DISTINCT FROM OLD.guest_email
      OR NEW.check_in IS DISTINCT FROM OLD.check_in
      OR NEW.check_out IS DISTINCT FROM OLD.check_out
      OR NEW.total_price IS DISTINCT FROM OLD.total_price
      OR NEW.advance_amount IS DISTINCT FROM OLD.advance_amount
      OR NEW.balance_amount IS DISTINCT FROM OLD.balance_amount
      OR NEW.adults IS DISTINCT FROM OLD.adults
      OR NEW.children IS DISTINCT FROM OLD.children
    );
    IF NOT v_sync_fields_changed THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Extract lineage from the booking's metadata, or generate new.
  v_trace_id := COALESCE(
    (NEW.metadata #>> '{trace_id}')::uuid,
    gen_random_uuid()
  );
  v_parent_id := (NEW.metadata #>> '{parent_event_id}')::uuid;

  INSERT INTO public.sync_events (
    event_type,
    entity_id,
    payload,
    source,
    origin_system,
    trace_id,
    parent_event_id,
    status,
    retry_count,
    max_retries
  ) VALUES (
    CASE
      WHEN NEW.booking_status = 'confirmed' THEN 'booking_confirmed'
      WHEN NEW.booking_status = 'pending_payment' THEN 'booking_created'
      WHEN NEW.booking_status = 'cancelled' THEN 'booking_cancelled'
      WHEN NEW.booking_status = 'checked_in' THEN 'booking_checked_in'
      WHEN NEW.booking_status = 'checked_out' THEN 'booking_checked_out'
      WHEN NEW.booking_status = 'expired' THEN 'booking_expired'
      WHEN NEW.booking_status = 'failed' THEN 'booking_failed'
      ELSE 'booking_updated'
    END,
    NEW.id::text,
    jsonb_build_object(
      'room_id', NEW.room_id,
      'guest_name', NEW.guest_name,
      'guest_email', NEW.guest_email,
      'guest_phone', NEW.guest_phone,
      'check_in', NEW.check_in,
      'check_out', NEW.check_out,
      'adults', NEW.adults,
      'children', NEW.children,
      'total_price', NEW.total_price,
      'advance_amount', NEW.advance_amount,
      'balance_amount', NEW.balance_amount,
      'paid_amount', CASE
        WHEN NEW.payment_status = 'paid' THEN NEW.total_price
        WHEN NEW.payment_status = 'pay_at_property' THEN NEW.advance_amount
        ELSE 0
      END,
      'nightly_rate', NEW.nightly_rate,
      'payment_status', NEW.payment_status,
      'booking_status', NEW.booking_status,
      'source', NEW.source,
      'pos_booking_id', NEW.pos_booking_id,
      'trace_id', v_trace_id,
      'parent_event_id', v_parent_id
    ),
    'website',
    v_origin,
    v_trace_id,
    v_parent_id,
    'pending',
    0,
    5
  );

  RETURN NEW;
END;
$$;

-- Drop old trigger and recreate with expanded field list
DROP TRIGGER IF EXISTS trg_booking_sync_event ON public.bookings;
CREATE TRIGGER trg_booking_sync_event
  AFTER INSERT OR UPDATE OF
    booking_status,
    payment_status,
    guest_name,
    guest_phone,
    guest_email,
    check_in,
    check_out,
    total_price,
    advance_amount,
    balance_amount,
    adults,
    children
  ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.emit_booking_sync_event_v2();

COMMENT ON TRIGGER trg_booking_sync_event ON public.bookings IS
  'Emits sync_event when any reservation-tracked field changes. Dedup on UPDATE to skip no-op changes.';

-- ═══════════════════════════════════════════════════════════════════
-- 2. Function to get pending sync events (used by sync-webhook-sender)
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_sync_events_pending()
RETURNS JSONB
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_result
  FROM (
    SELECT *
    FROM public.sync_events
    WHERE status = 'pending'
       OR (status = 'retrying' AND next_retry_at <= NOW())
    ORDER BY created_at ASC
    LIMIT 50
    FOR UPDATE SKIP LOCKED
  ) t;

  RETURN jsonb_build_object('data', v_result);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_sync_events_pending() FROM public, anon;

-- ═══════════════════════════════════════════════════════════════════
-- 3. Create sync_reconciliation_logs table
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.sync_reconciliation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  issue_type TEXT NOT NULL CHECK (issue_type IN (
    'missing_booking',
    'stale_booking',
    'status_mismatch',
    'payment_mismatch',
    'guest_name_mismatch',
    'guest_phone_mismatch',
    'guest_email_mismatch',
    'date_mismatch',
    'amount_mismatch',
    'orphaned_record',
    'room_mismatch'
  )),
  website_value JSONB,
  pos_value JSONB,
  details TEXT,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  sync_attempted BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_recon_logs_severity
  ON public.sync_reconciliation_logs(severity, detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_recon_logs_booking
  ON public.sync_reconciliation_logs(booking_id);

CREATE INDEX IF NOT EXISTS idx_recon_logs_unresolved
  ON public.sync_reconciliation_logs(detected_at)
  WHERE resolved_at IS NULL;

COMMENT ON TABLE public.sync_reconciliation_logs IS
  'Records all drift/mismatch findings between Website and POS. Read-only until auto-correct activated.';

ALTER TABLE public.sync_reconciliation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_reconciliation_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_admin_recon_all ON public.sync_reconciliation_logs;
CREATE POLICY project_admin_recon_all ON public.sync_reconciliation_logs
  FOR ALL TO project_admin USING (true) WITH CHECK (true);

SELECT 'Migration 20260620000000 applied — expanded sync trigger, reconciliation logs table' AS status;
