-- Migration: Cafe ordering system (production schema)
-- Production has: orders, order_items, menu_items, menu_categories

-- Sequence for human-readable order numbers
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 1;

-- Add customer info columns for cafe delivery/takeaway orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_address text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_area text;

-- Trigger function to auto-generate order_number
CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'ORD-' || LPAD(NEXTVAL('public.order_number_seq')::text, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on orders table
DROP TRIGGER IF EXISTS trg_set_order_number ON public.orders;
CREATE TRIGGER trg_set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL)
  EXECUTE FUNCTION public.set_order_number();

-- Grant usage on sequence
GRANT USAGE ON SEQUENCE public.order_number_seq TO anon;
GRANT USAGE ON SEQUENCE public.order_number_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.order_number_seq TO project_admin;
