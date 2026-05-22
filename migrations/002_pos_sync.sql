-- Migration: POS Synchronization support
-- Adds source tracking, sync_events table, and trigger functions
-- Does NOT modify existing booking logic

-- 1. Add source column to bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'website'
  CHECK (source IN ('website', 'pos'));

-- 2. Add pos_booking_id for external reference
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS pos_booking_id text;

-- 3. Index for POS lookups
CREATE INDEX IF NOT EXISTS idx_bookings_source ON public.bookings (source);
CREATE INDEX IF NOT EXISTS idx_bookings_pos_booking_id ON public.bookings (pos_booking_id);

-- 4. Sync Events table (outbox pattern)
CREATE TABLE IF NOT EXISTS public.sync_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type text NOT NULL CHECK (event_type IN (
        'booking.created',
        'booking.updated',
        'booking.cancelled',
        'booking.checked_in',
        'booking.checked_out',
        'booking.payment_updated'
    )),
    entity_id uuid NOT NULL,
    entity_type text NOT NULL DEFAULT 'booking',
    payload jsonb NOT NULL DEFAULT '{}',
    source text NOT NULL DEFAULT 'website',
    processed boolean DEFAULT false,
    delivered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_events_unprocessed
    ON public.sync_events (created_at)
    WHERE processed = false;

CREATE INDEX IF NOT EXISTS idx_sync_events_type
    ON public.sync_events (event_type);

-- 4b. Add retry tracking columns
ALTER TABLE public.sync_events
  ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0;
ALTER TABLE public.sync_events
  ADD COLUMN IF NOT EXISTS max_retries integer DEFAULT 5;
ALTER TABLE public.sync_events
  ADD COLUMN IF NOT EXISTS error_message text;
ALTER TABLE public.sync_events
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamp with time zone;

-- 5. Trigger function: Emit sync event on booking changes
CREATE OR REPLACE FUNCTION public.emit_booking_sync_event()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_event_type text;
    v_payload jsonb;
    v_source text;
BEGIN
    -- Determine event type and source
    v_source := COALESCE(NEW.source, 'website');

    IF TG_OP = 'INSERT' THEN
        v_event_type := 'booking.created';
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.booking_status = 'cancelled' AND OLD.booking_status != 'cancelled' THEN
            v_event_type := 'booking.cancelled';
        ELSIF NEW.booking_status = 'checked_in' AND OLD.booking_status != 'checked_in' THEN
            v_event_type := 'booking.checked_in';
        ELSIF NEW.booking_status = 'checked_out' AND OLD.booking_status != 'checked_out' THEN
            v_event_type := 'booking.checked_out';
        ELSIF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
            v_event_type := 'booking.payment_updated';
        ELSE
            v_event_type := 'booking.updated';
        END IF;
    END IF;

    -- Build payload
    v_payload := jsonb_build_object(
        'id', NEW.id,
        'room_id', NEW.room_id,
        'guest_name', NEW.guest_name,
        'guest_email', NEW.guest_email,
        'guest_phone', NEW.guest_phone,
        'check_in', NEW.check_in,
        'check_out', NEW.check_out,
        'total_price', NEW.total_price,
        'booking_status', NEW.booking_status,
        'payment_status', NEW.payment_status,
        'source', v_source,
        'pos_booking_id', NEW.pos_booking_id,
        'created_at', NEW.created_at
    );

    -- Insert sync event (only for website-originated events to prevent loop)
    IF v_source = 'website' THEN
        INSERT INTO public.sync_events (event_type, entity_id, entity_type, payload, source)
        VALUES (v_event_type, NEW.id, 'booking', v_payload, v_source);
    END IF;

    RETURN NEW;
END;
$$;

-- 6. Trigger on bookings table
DROP TRIGGER IF EXISTS trg_booking_sync_event ON public.bookings;
CREATE TRIGGER trg_booking_sync_event
    AFTER INSERT OR UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.emit_booking_sync_event();

-- 7. RLS policies for sync_events
ALTER TABLE public.sync_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_admin_policy" ON public.sync_events;
CREATE POLICY "project_admin_policy" ON public.sync_events
    FOR ALL TO project_admin USING (true) WITH CHECK (true);

-- 8. Grant permissions
GRANT ALL ON TABLE public.sync_events TO anon;
GRANT ALL ON TABLE public.sync_events TO authenticated;
GRANT ALL ON TABLE public.sync_events TO project_admin;
GRANT USAGE ON SEQUENCE public.sync_events_id_seq TO anon;
GRANT USAGE ON SEQUENCE public.sync_events_id_seq TO authenticated;
