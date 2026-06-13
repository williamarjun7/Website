-- Migration 011: Recreate order_counter table (was dropped in 008_cleanup_unused_tables.sql)
-- The place-cafe-order edge function uses CAS (Compare-And-Swap) on this table for order numbers.

CREATE TABLE IF NOT EXISTS public.order_counter (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_number INTEGER NOT NULL DEFAULT 0
);

INSERT INTO public.order_counter (id, last_number) VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

-- Recreate the order_number_seq for other uses
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 1;

GRANT ALL ON public.order_counter TO anon;
GRANT ALL ON public.order_counter TO authenticated;
GRANT ALL ON public.order_counter TO service_role;
GRANT USAGE ON SEQUENCE public.order_number_seq TO anon;
GRANT USAGE ON SEQUENCE public.order_number_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.order_number_seq TO service_role;
