-- ====================================================================
-- FIX ROOMS SCHEMA: Migrate live table to match frontend expectations
-- The backup schema had: name, description, price_per_night, max_guests, is_active,
--   room_type, amenities, room_size, bed_type, policies, room_images (separate table)
-- The live schema has: number, type, status, rate, guest_name, check_in, check_out
-- Run each statement individually in Insforge SQL console.
-- ====================================================================

-- 1. Rename existing columns to match frontend code
ALTER TABLE public.rooms RENAME COLUMN number TO room_number;
ALTER TABLE public.rooms RENAME COLUMN type TO room_type;
ALTER TABLE public.rooms RENAME COLUMN status TO availability_status;
ALTER TABLE public.rooms RENAME COLUMN rate TO price_per_night;

-- 2. Add missing columns needed by the frontend
ALTER TABLE public.rooms ADD COLUMN name TEXT;
ALTER TABLE public.rooms ADD COLUMN description TEXT;
ALTER TABLE public.rooms ADD COLUMN max_guests INTEGER DEFAULT 2;
ALTER TABLE public.rooms ADD COLUMN is_active BOOLEAN DEFAULT true;
ALTER TABLE public.rooms ADD COLUMN amenities TEXT[] DEFAULT '{}';
ALTER TABLE public.rooms ADD COLUMN room_size TEXT;
ALTER TABLE public.rooms ADD COLUMN bed_type TEXT;
ALTER TABLE public.rooms ADD COLUMN policies TEXT;

-- 3. Add new metadata columns
ALTER TABLE public.rooms ADD COLUMN has_ac BOOLEAN DEFAULT false;
ALTER TABLE public.rooms ADD COLUMN floor_number INTEGER;
ALTER TABLE public.rooms ADD COLUMN featured BOOLEAN DEFAULT false;
ALTER TABLE public.rooms ADD COLUMN discount_percent NUMERIC(5,2) DEFAULT 0;
ALTER TABLE public.rooms ADD COLUMN maintenance BOOLEAN DEFAULT false;
ALTER TABLE public.rooms ADD COLUMN seasonal_pricing JSONB DEFAULT '{}'::jsonb;

-- 4. Add unique constraint on room_number (run only after rename succeeds)
ALTER TABLE public.rooms ADD CONSTRAINT rooms_room_number_key UNIQUE (room_number);

-- 5. Populate name from room_number for any existing rooms
UPDATE public.rooms SET name = CONCAT('Room ', room_number) WHERE name IS NULL;

-- 6. Set description for existing rooms
UPDATE public.rooms SET description = 'A comfortable room at Highlands Motel & Cafe.' WHERE description IS NULL;

-- 7. Set is_active and availability_status for existing rows
UPDATE public.rooms SET is_active = true WHERE is_active IS NULL;
UPDATE public.rooms SET availability_status = 'available' WHERE availability_status IS NULL;

-- ====================================================================
-- 8. Seed the 7 new rooms (run individually)
-- ====================================================================
INSERT INTO public.rooms (name, description, price_per_night, max_guests, is_active, room_type, amenities, room_size, bed_type, policies, room_number, has_ac, floor_number, availability_status) VALUES ('Room 201', 'Standard Single Room on the 2nd floor. A budget-friendly option for solo travelers.', 2000, 1, true, 'Single Room', '{WiFi,TV,"Hot Water","Room Service","Attached Bathroom"}', '200 sq.ft', 'Single Bed', 'Check-in: 02:00 PM | Check-out: 11:00 AM', '201', false, 2, 'available');

INSERT INTO public.rooms (name, description, price_per_night, max_guests, is_active, room_type, amenities, room_size, bed_type, policies, room_number, has_ac, floor_number, availability_status) VALUES ('Room 301', 'Standard Single Room on the 3rd floor. Well-appointed room for solo travelers at an affordable price.', 2000, 1, true, 'Single Room', '{WiFi,TV,"Hot Water","Room Service","Attached Bathroom"}', '200 sq.ft', 'Single Bed', 'Check-in: 02:00 PM | Check-out: 11:00 AM', '301', false, 3, 'available');

INSERT INTO public.rooms (name, description, price_per_night, max_guests, is_active, room_type, amenities, room_size, bed_type, policies, room_number, has_ac, floor_number, availability_status) VALUES ('Room 302', 'Standard Double Room on the 3rd floor. Comfortable and budget-friendly accommodation with essential amenities.', 1700, 2, true, 'Double Room', '{WiFi,TV,"Hot Water","Room Service","Attached Bathroom"}', '250 sq.ft', 'Double Bed', 'Check-in: 02:00 PM | Check-out: 11:00 AM', '302', false, 3, 'available');

INSERT INTO public.rooms (name, description, price_per_night, max_guests, is_active, room_type, amenities, room_size, bed_type, policies, room_number, has_ac, floor_number, availability_status) VALUES ('Room 303', 'Standard Double Room on the 3rd floor. Cozy room ideal for couples or friends traveling together.', 1700, 2, true, 'Double Room', '{WiFi,TV,"Hot Water","Room Service","Attached Bathroom"}', '250 sq.ft', 'Double Bed', 'Check-in: 02:00 PM | Check-out: 11:00 AM', '303', false, 3, 'available');

INSERT INTO public.rooms (name, description, price_per_night, max_guests, is_active, room_type, amenities, room_size, bed_type, policies, room_number, has_ac, floor_number, availability_status) VALUES ('Room 401', 'Premium Single Room with Air Conditioning on the 4th floor. Enjoy a cool and relaxing stay.', 2500, 1, true, 'Single Room', '{"Air Conditioning (AC)",WiFi,TV,"Hot Water","Room Service","Attached Bathroom"}', '200 sq.ft', 'Single Bed', 'Check-in: 02:00 PM | Check-out: 11:00 AM', '401', true, 4, 'available');

INSERT INTO public.rooms (name, description, price_per_night, max_guests, is_active, room_type, amenities, room_size, bed_type, policies, room_number, has_ac, floor_number, availability_status) VALUES ('Room 402', 'Comfortable Single Room with Air Conditioning on the 4th floor. Perfect for solo travelers seeking comfort.', 2500, 1, true, 'Single Room', '{"Air Conditioning (AC)",WiFi,TV,"Hot Water","Room Service","Attached Bathroom"}', '200 sq.ft', 'Single Bed', 'Check-in: 02:00 PM | Check-out: 11:00 AM', '402', true, 4, 'available');

INSERT INTO public.rooms (name, description, price_per_night, max_guests, is_active, room_type, amenities, room_size, bed_type, policies, room_number, has_ac, floor_number, availability_status) VALUES ('Room 501', 'Spacious Double Room with Air Conditioning on the 5th floor. Enjoy a premium stay with cool comfort.', 2500, 2, true, 'Double Room', '{"Air Conditioning (AC)",WiFi,TV,"Hot Water","Room Service","Attached Bathroom","City View"}', '300 sq.ft', 'Queen Bed', 'Check-in: 02:00 PM | Check-out: 11:00 AM', '501', true, 5, 'available');
