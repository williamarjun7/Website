-- Migration 012: Prevent double-booking via exclusion constraint
-- An EXCLUDE constraint using GiST allows PostgreSQL to enforce that
-- no two bookings exist for the same room_id with overlapping daterange
-- and an active booking_status.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap;
ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    room_id WITH =,
    daterange(check_in::date, check_out::date, '[)') WITH &&
  ) WHERE (booking_status IN ('pending_payment', 'confirmed', 'checked_in'));
