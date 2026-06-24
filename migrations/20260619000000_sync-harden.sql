-- Migration: sync-harden
-- Hardens Website-side sync: idempotency table, event lineage, loop prevention trigger.

-- ═══════════════════════════════════════════════════════════════════
-- 1. Create idempotency_keys table (crash-safe dedup)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  key_hash TEXT PRIMARY KEY,
  operation TEXT NOT NULL,
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_idempotency_completed
  ON public.idempotency_keys(completed_at)
  WHERE completed_at IS NULL;

COMMENT ON TABLE public.idempotency_keys IS 'Crash-safe idempotency: reserve → execute → complete';

ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys FORCE ROW LEVEL SECURITY;

-- Only edge functions (project_admin) can access; block public/anon/authenticated.
DROP POLICY IF EXISTS project_admin_idempotency_all ON public.idempotency_keys;
CREATE POLICY project_admin_idempotency_all ON public.idempotency_keys
  FOR ALL TO project_admin USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════
-- 2. Extend sync_events with lineage tracking
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.sync_events
  ADD COLUMN IF NOT EXISTS origin_system TEXT
    NOT NULL DEFAULT 'website'
    CHECK (origin_system IN ('website', 'pos'));

ALTER TABLE public.sync_events
  ADD COLUMN IF NOT EXISTS trace_id UUID;

ALTER TABLE public.sync_events
  ADD COLUMN IF NOT EXISTS parent_event_id UUID;

ALTER TABLE public.sync_events
  ADD COLUMN IF NOT EXISTS response_body JSONB;

ALTER TABLE public.sync_events
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;

ALTER TABLE public.sync_events
  ADD COLUMN IF NOT EXISTS last_error TEXT;

ALTER TABLE public.sync_events
  ADD COLUMN IF NOT EXISTS pos_booking_id TEXT;

-- Add status enum for finer-grained tracking
ALTER TABLE public.sync_events
  ALTER COLUMN status TYPE TEXT USING COALESCE(
    CASE WHEN processed = true THEN 'processed'
         WHEN retry_count >= max_retries THEN 'dead_letter'
         ELSE 'pending'
    END, 'pending'
  );

COMMENT ON COLUMN public.sync_events.origin_system IS 'Origin of this event: website or pos. NEVER emit if origin_system=pos (loop prevention).';
COMMENT ON COLUMN public.sync_events.trace_id IS 'End-to-end trace identifier for this booking lifecycle.';
COMMENT ON COLUMN public.sync_events.parent_event_id IS 'ID of the event that triggered this event (null for root events).';

CREATE INDEX IF NOT EXISTS idx_sync_events_status_origin
  ON public.sync_events(status, origin_system, created_at)
  WHERE status = 'pending';

-- ═══════════════════════════════════════════════════════════════════
-- 3. Loop Prevention: NEVER emit sync_event if origin_system = 'pos'
--    This is enforced at the TRIGGER level (cannot be bypassed by app).
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

  -- Extract lineage from the booking's metadata, or generate new.
  -- The booking row may carry trace info in a metadata jsonb field.
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

-- Replace old trigger with new one
DROP TRIGGER IF EXISTS trg_booking_sync_event ON public.bookings;
CREATE TRIGGER trg_booking_sync_event
  AFTER INSERT OR UPDATE OF booking_status, payment_status
  ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.emit_booking_sync_event_v2();

-- ═══════════════════════════════════════════════════════════════════
-- 4. Add metadata column to bookings for lineage tracking
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.bookings.metadata IS 'Booking metadata including sync lineage: trace_id, parent_event_id, origin_system';

-- ═══════════════════════════════════════════════════════════════════
-- 5. Function to mark sync_event as processed (clean interface)
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.mark_sync_event_processed(
  p_event_id UUID,
  p_status TEXT DEFAULT 'processed',
  p_pos_booking_id TEXT DEFAULT NULL,
  p_response_body JSONB DEFAULT NULL
)
RETURNS VOID
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.sync_events
  SET
    status = p_status,
    pos_booking_id = COALESCE(p_pos_booking_id, pos_booking_id),
    response_body = COALESCE(p_response_body, response_body)
  WHERE id = p_event_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_sync_event_processed(uuid, text, text, jsonb) FROM public, anon;

-- ═══════════════════════════════════════════════════════════════════
-- 6. Function to fail sync_event with retry/dead-letter
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fail_sync_event(
  p_event_id UUID,
  p_error_message TEXT,
  p_max_retries INTEGER DEFAULT 5
)
RETURNS VOID
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
DECLARE
  v_retry_count INTEGER;
  v_max_retries INTEGER;
BEGIN
  SELECT retry_count, max_retries INTO v_retry_count, v_max_retries
  FROM public.sync_events WHERE id = p_event_id;

  IF v_retry_count >= COALESCE(v_max_retries, p_max_retries) THEN
    UPDATE public.sync_events
    SET status = 'dead_letter', last_error = p_error_message
    WHERE id = p_event_id;
  ELSE
    UPDATE public.sync_events
    SET
      status = 'retrying',
      retry_count = v_retry_count + 1,
      last_error = p_error_message,
      next_retry_at = NOW() + (
        CASE v_retry_count
          WHEN 0 THEN INTERVAL '5 seconds'
          WHEN 1 THEN INTERVAL '15 seconds'
          WHEN 2 THEN INTERVAL '30 seconds'
          WHEN 3 THEN INTERVAL '60 seconds'
          ELSE INTERVAL '120 seconds'
        END
      )
    WHERE id = p_event_id;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fail_sync_event(uuid, text, integer) FROM public, anon;

-- ═══════════════════════════════════════════════════════════════════
-- 7. RLS for sync_events (project_admin only)
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.sync_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_admin_sync_events_all ON public.sync_events;
CREATE POLICY project_admin_sync_events_all ON public.sync_events
  FOR ALL TO project_admin USING (true) WITH CHECK (true);

SELECT 'Migration 20260619000000 applied — sync hardened, idempotency_keys, loop prevention, lineage' AS status;
