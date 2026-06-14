-- Migration 014: Fix room_images column mismatch
-- The room_images table was created with column `url` but frontend code
-- (roomService.ts RoomImage interface) references `image_url`.
-- This migration renames url -> image_url if needed, and ensures alt_text exists.

-- ── 1. Rename `url` to `image_url` if `url` exists and `image_url` does not ──
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'room_images' AND column_name = 'url'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'room_images' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE public.room_images RENAME COLUMN url TO image_url;
  END IF;
END $$;

-- ── 2. Add `image_url` if neither `url` nor `image_url` exists ──
ALTER TABLE public.room_images ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ── 3. Ensure `alt_text` column exists ──
ALTER TABLE public.room_images ADD COLUMN IF NOT EXISTS alt_text TEXT;
