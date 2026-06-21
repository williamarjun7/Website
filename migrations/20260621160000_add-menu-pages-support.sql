ALTER TABLE IF EXISTS site_images ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

UPDATE site_images SET sort_order = 0 WHERE sort_order IS NULL;

SELECT 'Migration 20260621160000 applied — added sort_order to site_images' AS status;
