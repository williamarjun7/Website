-- Migration 023: Fix booking conflicts view - expire stale pending_payment,
-- include pay_at_property
DROP VIEW IF EXISTS public.booking_conflicts;

CREATE VIEW public.booking_conflicts AS
SELECT
  room_id,
  check_in,
  check_out
FROM public.bookings
WHERE booking_status IN ('pending_payment', 'confirmed', 'checked_in', 'pay_at_property')
  AND (booking_status != 'pending_payment' OR created_at > now() - interval '24 hours');

GRANT SELECT ON public.booking_conflicts TO anon;

COMMENT ON VIEW public.booking_conflicts IS 'Exposes room booking conflicts for availability checks. Stale pending_payment bookings (>24h) are excluded. pay_at_property bookings are now included.';
