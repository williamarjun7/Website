-- Migration 016: Add booking validation constraints
-- Adds CHECK and NOT NULL constraints to ensure booking data integrity.

-- ── 1. CHECK: check_out must be after check_in ─────────────────────────
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_check_out_after_in;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_check_out_after_in
  CHECK (check_out > check_in);

-- ── 2. CHECK: guests must be positive ──────────────────────────────────
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_guests_positive;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_guests_positive
  CHECK (guests IS NULL OR guests > 0);

-- ── 3. CHECK: total_price must be non-negative ─────────────────────────
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_total_price_non_negative;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_total_price_non_negative
  CHECK (total_price >= 0);

-- ── 4. NOT NULL constraints on critical fields ─────────────────────────
-- Use DO blocks to set NOT NULL only if the column exists and is nullable.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'guest_name'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.bookings ALTER COLUMN guest_name SET NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'guest_email'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.bookings ALTER COLUMN guest_email SET NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'check_in'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.bookings ALTER COLUMN check_in SET NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'check_out'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.bookings ALTER COLUMN check_out SET NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'room_id'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.bookings ALTER COLUMN room_id SET NOT NULL;
  END IF;
END $$;
