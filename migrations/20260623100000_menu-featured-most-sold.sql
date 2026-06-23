-- 20260623100000_menu_featured_most_sold.sql
-- Adds is_featured and is_most_sold columns to menu_items

ALTER TABLE menu_items
    ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_most_sold BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN menu_items.is_featured IS 'Show in Featured Dishes section on cafe page';
COMMENT ON COLUMN menu_items.is_most_sold IS 'Mark as most sold / popular item';

SELECT 'Migration 20260623100000 applied — added is_featured, is_most_sold to menu_items' AS status;
