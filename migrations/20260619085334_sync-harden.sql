-- Create sync trigger helper functions and trigger
CREATE OR REPLACE FUNCTION public.mark_sync_event_processed(p_event_id UUID, p_status TEXT DEFAULT 'processed', p_pos_booking_id TEXT DEFAULT NULL, p_response_body JSONB DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.sync_events SET status = p_status, pos_booking_id = COALESCE(p_pos_booking_id, pos_booking_id), response_body = COALESCE(p_response_body, response_body)
  WHERE id = p_event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_sync_event(p_event_id UUID, p_error_message TEXT, p_max_retries INTEGER DEFAULT 5)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_retry_count INTEGER; v_max_retries INTEGER;
BEGIN
  SELECT retry_count, max_retries INTO v_retry_count, v_max_retries FROM public.sync_events WHERE id = p_event_id;
  IF v_retry_count >= COALESCE(v_max_retries, p_max_retries) THEN
    UPDATE public.sync_events SET status = 'dead_letter', last_error = p_error_message WHERE id = p_event_id;
  ELSE
    UPDATE public.sync_events SET status = 'retrying', retry_count = v_retry_count + 1, last_error = p_error_message,
      next_retry_at = NOW() + (CASE v_retry_count WHEN 0 THEN INTERVAL '5 seconds' WHEN 1 THEN INTERVAL '15 seconds' WHEN 2 THEN INTERVAL '30 seconds' WHEN 3 THEN INTERVAL '60 seconds' ELSE INTERVAL '120 seconds' END)
    WHERE id = p_event_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.emit_booking_sync_event_v2()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $body$
DECLARE v_origin text; v_trace_id uuid; v_parent_id uuid;
BEGIN
  IF NEW.source = 'pos' THEN v_origin := 'pos'; ELSE v_origin := 'website'; END IF;
  IF v_origin = 'pos' THEN RETURN NEW; END IF;
  v_trace_id := COALESCE((NEW.metadata #>> '{trace_id}')::uuid, gen_random_uuid());
  v_parent_id := (NEW.metadata #>> '{parent_event_id}')::uuid;
  INSERT INTO public.sync_events (event_type, entity_id, entity_type, payload, source, origin_system, trace_id, parent_event_id, status, retry_count, max_retries)
  VALUES (
    CASE WHEN NEW.booking_status = 'confirmed' THEN 'booking_confirmed'
         WHEN NEW.booking_status = 'pending_payment' THEN 'booking_created'
         WHEN NEW.booking_status = 'cancelled' THEN 'booking_cancelled'
         WHEN NEW.booking_status = 'checked_in' THEN 'booking_checked_in'
         WHEN NEW.booking_status = 'checked_out' THEN 'booking_checked_out'
         ELSE 'booking_updated' END,
    NEW.id, 'booking',
    jsonb_build_object('room_id', NEW.room_id, 'guest_name', NEW.guest_name, 'guest_email', NEW.guest_email, 'guest_phone', NEW.guest_phone, 'check_in', NEW.check_in, 'check_out', NEW.check_out, 'adults', NEW.adults, 'children', NEW.children, 'total_price', NEW.total_price, 'advance_amount', NEW.advance_amount, 'balance_amount', NEW.balance_amount, 'nightly_rate', NEW.nightly_rate, 'payment_status', NEW.payment_status, 'booking_status', NEW.booking_status, 'source', NEW.source, 'pos_booking_id', NEW.pos_booking_id, 'trace_id', v_trace_id, 'parent_event_id', v_parent_id),
    'website', v_origin, v_trace_id, v_parent_id, 'pending', 0, 5
  );
  RETURN NEW;
END;
$body$;

-- Fix event_type check constraint to match underscore convention used by app code
ALTER TABLE IF EXISTS public.sync_events DROP CONSTRAINT IF EXISTS sync_events_event_type_check;
ALTER TABLE public.sync_events ADD CONSTRAINT sync_events_event_type_check CHECK (event_type = ANY (ARRAY['booking_created', 'booking_updated', 'booking_cancelled', 'booking_confirmed', 'booking_checked_in', 'booking_checked_out', 'booking_payment_updated']));

DROP TRIGGER IF EXISTS trg_booking_sync_event ON public.bookings;
CREATE TRIGGER trg_booking_sync_event AFTER INSERT OR UPDATE OF booking_status, payment_status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.emit_booking_sync_event_v2();
