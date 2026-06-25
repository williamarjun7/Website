-- Seed rooms table with known UUIDs used by integration tests
-- The test suite creates bookings against rooms 5f4d5e3a-713e-47d0-88b2-e85a48b8591a and 6ac86da7-46f6-4a78-8cf6-1471fa37a9fe
-- These must exist in the database for any booking to succeed.

INSERT INTO public.rooms (id, name, description, price_per_night, max_guests, is_active, maintenance, discount_percent, room_number, room_type, bed_type, has_ac, floor_number, amenities, policies)
VALUES
    ('5f4d5e3a-713e-47d0-88b2-e85a48b8591a', 'Deluxe Double Room', 'Spacious double room with mountain views, perfect for couples or solo travelers.', 3500, 2, true, false, 0, '101', 'double', 'King', true, 1, ARRAY['WiFi', 'AC', 'Smart TV', 'Mini Bar', 'Room Service'], 'Check-in: 2:00 PM | Check-out: 12:00 PM'),
    ('6ac86da7-46f6-4a78-8cf6-1471fa37a9fe', 'Standard Single Room', 'Cozy single room with all essential amenities for a comfortable stay.', 2500, 1, true, false, 0, '102', 'single', 'Single', false, 1, ARRAY['WiFi', 'Fan', 'Smart TV', 'Room Service'], 'Check-in: 2:00 PM | Check-out: 12:00 PM')
ON CONFLICT (id) DO NOTHING;

SELECT 'Migration 20260625000000 applied — rooms seeded with known UUIDs for test suite' AS status;
