-- Migration 003: Add room metadata columns for enhanced room management
-- Adds support for: room_number, AC status, floor_number, availability_status
-- Future-ready: featured, discount, maintenance, seasonal pricing

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS room_number TEXT,
  ADD COLUMN IF NOT EXISTS has_ac BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS floor_number INTEGER,
  ADD COLUMN IF NOT EXISTS availability_status TEXT DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS maintenance BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS seasonal_pricing JSONB DEFAULT '{}'::jsonb;

-- Add unique constraint on room_number
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rooms_room_number_key'
  ) THEN
    ALTER TABLE public.rooms ADD CONSTRAINT rooms_room_number_key UNIQUE (room_number);
  END IF;
END $$;
