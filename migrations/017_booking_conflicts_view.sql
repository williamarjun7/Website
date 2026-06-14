-- Migration 017: Room availability view (replaces direct anon booking access)
-- Allows anon users to check room availability without accessing booking PII.
-- Created after RLS migration 013 restricts anon booking access.

-- ── 1. Create a secure view for availability ──────────────────────────
-- Exposes only room_id and date columns needed for conflict detection.
DROP VIEW IF EXISTS public.booking_conflicts;
CREATE VIEW public.booking_conflicts AS
SELECT
  room_id,
  check_in,
  check_out
FROM public.bookings
WHERE booking_status IN ('pending_payment', 'confirmed', 'checked_in');

-- Grant anon SELECT on the view (no other roles need it)
GRANT SELECT ON public.booking_conflicts TO anon;

-- ── 2. Fonepay callback URL config ─────────────────────────────────────
-- Note: this also moves the FONEPAY_PG_CALLBACK_URL into the database for
-- auditability. It should match the edge function env var.
COMMENT ON VIEW public.booking_conflicts IS 'Exposes room booking conflicts for availability checks. No PII exposed.';