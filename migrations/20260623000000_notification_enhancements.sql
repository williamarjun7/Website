-- 20260623000000_notification_enhancements.sql
-- Add special_requests field + site content for enhanced notifications

-- 1. Add special_requests column to bookings
ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS special_requests TEXT DEFAULT '';

-- 2. Seed notification-related site content
INSERT INTO site_settings (key, value, type) VALUES
    ('notification_checkin_instructions', 'Check-in time is from 2:00 PM onward. Please proceed to the front desk upon arrival. For late check-ins (after 8:00 PM), please call ahead to make arrangements.', 'text'),
    ('notification_required_documents', 'Citizenship Card, National ID Card, Passport, Driver''s License, or any government-issued photo identification', 'text'),
    ('notification_motel_contact', 'Highlands Cafe & Motel Inn, Birendranagar-07, Khajura, Surkhet, Karnali Province, Nepal', 'text')
ON CONFLICT (key) DO NOTHING;

SELECT 'Migration 20260623000000 applied — notification enhancements' AS status;
