-- Migration 015: Add missing performance indexes
-- Composite index for room availability queries, guest lookups,
-- dashboard ordering, and room image lookups.

-- 1. Composite index on bookings for availability queries
-- Used by: checkRoomAvailability(), getAvailableRooms(), create-booking edge fn
CREATE INDEX IF NOT EXISTS idx_bookings_room_dates_status
  ON public.bookings (room_id, check_in, check_out, booking_status);

-- 2. Index on guest_email for guest lookup
-- Used by: getBookingsByEmail()
CREATE INDEX IF NOT EXISTS idx_bookings_guest_email
  ON public.bookings (guest_email);

-- 3. Index on created_at for dashboard queries and ordering
-- Used by: getAllBookings(), admin dashboards
CREATE INDEX IF NOT EXISTS idx_bookings_created_at
  ON public.bookings (created_at DESC);

-- 4. Index on room_images.room_id for room image lookups
-- Used by: roomService.ts queries via room_images(*) join
CREATE INDEX IF NOT EXISTS idx_room_images_room_id
  ON public.room_images (room_id);
