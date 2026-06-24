-- Migration: Create reviews / testimonials table
-- Adds a guest review system tied to rooms (optional) and the site overall.

CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    guest_name TEXT NOT NULL CHECK (char_length(guest_name) BETWEEN 2 AND 200),
    guest_email TEXT CHECK (guest_email IS NULL OR guest_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL CHECK (char_length(comment) BETWEEN 5 AND 5000),
    is_approved BOOLEAN NOT NULL DEFAULT false,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for approved/featured queries (common read path)
CREATE INDEX IF NOT EXISTS idx_reviews_approved_featured
    ON public.reviews (is_approved, is_featured DESC, created_at DESC)
    WHERE is_approved = true;

CREATE INDEX IF NOT EXISTS idx_reviews_room_id
    ON public.reviews (room_id)
    WHERE room_id IS NOT NULL;

COMMENT ON TABLE public.reviews IS 'Guest reviews and testimonials for rooms and overall site';
COMMENT ON COLUMN public.reviews.room_id IS 'Optional: link review to a specific room';
COMMENT ON COLUMN public.reviews.is_featured IS 'Show on homepage / landing sections';

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews FORCE ROW LEVEL SECURITY;

-- RLS: anyone can read approved reviews
DROP POLICY IF EXISTS "anon_can_read_approved_reviews" ON public.reviews;
CREATE POLICY "anon_can_read_approved_reviews" ON public.reviews
    FOR SELECT
    USING (is_approved = true);

-- RLS: project_admin full access
DROP POLICY IF EXISTS "project_admin_full_access_reviews" ON public.reviews;
CREATE POLICY "project_admin_full_access_reviews" ON public.reviews
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reviews_updated_at ON public.reviews;
CREATE TRIGGER trg_reviews_updated_at
    BEFORE UPDATE ON public.reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.update_reviews_updated_at();

SELECT 'Migration 20260621100000 applied: reviews table created' AS status;
