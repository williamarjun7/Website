-- Seed 7 rooms for Highlands Motel & Cafe
-- Each room configured with unique room_number, proper pricing, occupancy, and amenities

INSERT INTO public.rooms (name, description, price_per_night, max_guests, is_active, room_type, amenities, room_size, bed_type, policies, room_number, has_ac, floor_number, availability_status)
VALUES
  ('Room 302', 'Standard Double Room on the 3rd floor. Comfortable and budget-friendly accommodation with essential amenities.', 1700, 2, true, 'Double Room', ARRAY['WiFi', 'TV', 'Hot Water', 'Room Service', 'Attached Bathroom'], '250 sq.ft', 'Double Bed', 'Check-in: 02:00 PM | Check-out: 11:00 AM', '302', false, 3, 'available'),

  ('Room 303', 'Standard Double Room on the 3rd floor. Cozy room ideal for couples or friends traveling together.', 1700, 2, true, 'Double Room', ARRAY['WiFi', 'TV', 'Hot Water', 'Room Service', 'Attached Bathroom'], '250 sq.ft', 'Double Bed', 'Check-in: 02:00 PM | Check-out: 11:00 AM', '303', false, 3, 'available'),

  ('Room 402', 'Comfortable Single Room with Air Conditioning on the 4th floor. Perfect for solo travelers seeking comfort.', 2500, 1, true, 'Single Room', ARRAY['Air Conditioning (AC)', 'WiFi', 'TV', 'Hot Water', 'Room Service', 'Attached Bathroom'], '200 sq.ft', 'Single Bed', 'Check-in: 02:00 PM | Check-out: 11:00 AM', '402', true, 4, 'available'),

  ('Room 501', 'Spacious Double Room with Air Conditioning on the 5th floor. Enjoy a premium stay with cool comfort.', 2500, 2, true, 'Double Room', ARRAY['Air Conditioning (AC)', 'WiFi', 'TV', 'Hot Water', 'Room Service', 'Attached Bathroom', 'City View'], '300 sq.ft', 'Queen Bed', 'Check-in: 02:00 PM | Check-out: 11:00 AM', '501', true, 5, 'available'),

  ('Room 201', 'Standard Single Room on the 2nd floor. A budget-friendly option for solo travelers.', 2000, 1, true, 'Single Room', ARRAY['WiFi', 'TV', 'Hot Water', 'Room Service', 'Attached Bathroom'], '200 sq.ft', 'Single Bed', 'Check-in: 02:00 PM | Check-out: 11:00 AM', '201', false, 2, 'available'),

  ('Room 301', 'Standard Single Room on the 3rd floor. Well-appointed room for solo travelers at an affordable price.', 2000, 1, true, 'Single Room', ARRAY['WiFi', 'TV', 'Hot Water', 'Room Service', 'Attached Bathroom'], '200 sq.ft', 'Single Bed', 'Check-in: 02:00 PM | Check-out: 11:00 AM', '301', false, 3, 'available'),

  ('Room 401', 'Premium Single Room with Air Conditioning on the 4th floor. Enjoy a cool and relaxing stay.', 2500, 1, true, 'Single Room', ARRAY['Air Conditioning (AC)', 'WiFi', 'TV', 'Hot Water', 'Room Service', 'Attached Bathroom'], '200 sq.ft', 'Single Bed', 'Check-in: 02:00 PM | Check-out: 11:00 AM', '401', true, 4, 'available')
ON CONFLICT (room_number) DO NOTHING;
