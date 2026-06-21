-- 003_cms_upgrade.sql
-- Complete CMS upgrade: navigation, pages, faq, revisions, media, settings

-- 1. site_navigation
CREATE TABLE IF NOT EXISTS site_navigation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT NOT NULL,
    url TEXT NOT NULL DEFAULT '/',
    parent_id UUID REFERENCES site_navigation(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT true,
    target TEXT DEFAULT '_self',
    icon TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. site_pages
CREATE TABLE IF NOT EXISTS site_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    seo_title TEXT DEFAULT '',
    seo_description TEXT DEFAULT '',
    featured_image TEXT DEFAULT '',
    page_content TEXT DEFAULT '',
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft','review','published','archived')),
    template TEXT DEFAULT 'default',
    author TEXT DEFAULT '',
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. faq_items
CREATE TABLE IF NOT EXISTS faq_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    category TEXT DEFAULT 'General',
    published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. content_revisions
CREATE TABLE IF NOT EXISTS content_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    field_name TEXT DEFAULT '',
    old_value TEXT DEFAULT '',
    new_value TEXT DEFAULT '',
    user_name TEXT DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_revisions_entity ON content_revisions(entity_type, entity_id);

-- 5. media_files
CREATE TABLE IF NOT EXISTS media_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT DEFAULT 'image',
    mime_type TEXT DEFAULT '',
    size INTEGER DEFAULT 0,
    folder TEXT DEFAULT '/',
    alt_text TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. site_settings
CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT DEFAULT '',
    type TEXT DEFAULT 'text',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default settings
INSERT INTO site_settings (key, value, type) VALUES
    ('site_name', 'Highlands Cafe & Motel Inn', 'text'),
    ('site_description', 'Experience cozy comfort in the heart of the highlands', 'text'),
    ('contact_email', 'highlandscafemotelinn@gmail.com', 'text'),
    ('contact_phone', '+977 9763215874', 'text'),
    ('address', 'Birendranagar-07, Khajura, Surkhet, Karnali Province, Nepal', 'text'),
    ('social_facebook', 'https://www.facebook.com/profile.php?id=61587029831121', 'text'),
    ('social_instagram', 'https://www.instagram.com/highlandscafemotel', 'text'),
    ('social_twitter', '', 'text'),
    ('social_youtube', '', 'text'),
    ('footer_text', 'Experience cozy comfort in the heart of the highlands. Your perfect retreat with breathtaking views, warm hospitality, and unforgettable memories waiting to be created.', 'text'),
    ('checkin_time', '2:00 PM', 'text'),
    ('checkout_time', '12:00 PM', 'text'),
    ('cafe_hours_text', '7:00 AM - 8:00 PM', 'text'),
    ('btn_book_stay', 'Book Your Stay', 'text'),
    ('btn_book_now', 'Book Now', 'text'),
    ('btn_view_menu', 'View Menu', 'text'),
    ('footer_social_facebook', 'https://www.facebook.com/profile.php?id=61587029831121', 'text'),
    ('footer_social_instagram', 'https://www.instagram.com/highlandscafemotel', 'text'),
    ('footer_social_whatsapp', 'https://wa.me/9779763215874', 'text'),
    ('footer_social_tiktok', 'https://www.tiktok.com/@highlandscafe1', 'text'),
    ('navbar_phone', '+977 9763215874', 'text'),
    ('navbar_email', 'highlandscafemotelinn@gmail.com', 'text'),
    ('contact_address', 'Birendranagar-07, Khajura, Surkhet', 'text'),
    ('contact_phone_label', 'Phone & WhatsApp', 'text'),
    ('contact_email_label', 'Email', 'text'),
    ('contact_address_label', 'Address', 'text'),
    ('contact_checkinout_label', 'Check-in / Check-out', 'text')
ON CONFLICT (key) DO NOTHING;

-- Seed default navigation
INSERT INTO site_navigation (label, url, sort_order, is_visible, target) VALUES
    ('Home', '/', 0, true, '_self'),
    ('About', '/about', 1, true, '_self'),
    ('Sports', '/#sports', 2, true, '_self'),
    ('Gallery', '/gallery', 3, true, '_self'),
    ('Events', '/events', 4, true, '_self'),
    ('Contact', '/contact', 5, true, '_self'),
    ('FAQ', '/faq', 6, true, '_self')
ON CONFLICT DO NOTHING;

-- Seed default published page
INSERT INTO site_pages (title, slug, page_content, status, author, featured_image) VALUES
    ('About Us', 'about', '<h2>Welcome to Arjun Sports Academy</h2><p>We are dedicated to nurturing sports talent and building champions.</p>', 'published', 'admin', ''),
    ('Contact', 'contact', '<h2>Get in Touch</h2><p>Reach out to us for any inquiries about our programs.</p>', 'published', 'admin', ''),
    ('FAQ', 'faq', '<h2>Frequently Asked Questions</h2><p>Find answers to common questions about our academy.</p>', 'published', 'admin', ''),
    ('Gallery', 'gallery', '<h2>Our Gallery</h2><p>Browse through our collection of moments.</p>', 'published', 'admin', ''),
    ('Events', 'events', '<h2>Upcoming Events</h2><p>Stay updated with our latest events and activities.</p>', 'published', 'admin', ''),
    ('Terms of Service', 'terms', '<h2>Terms of Service</h2><p>Welcome to our website. By using our services, you agree to these terms.</p><h3>Booking & Reservations</h3><p>Valid government-issued ID required at check-in. Guests must be 18 years or older to book independently.</p><h3>Payment Terms</h3><p>We accept credit cards, debit cards, and cash. All rates include applicable taxes.</p><h3>Cancellation Policy</h3><p>Cancellations made 12+ hours before check-in are eligible for a full refund.</p>', 'published', 'admin', ''),
    ('Privacy Policy', 'privacy', '<h2>Privacy Policy</h2><p>We are committed to protecting your privacy and ensuring the security of your personal information.</p><h3>Information We Collect</h3><p>We collect personal information you provide including name, contact details, and billing information.</p><h3>Data Security</h3><p>We implement SSL encryption and secure payment processing systems.</p>', 'published', 'admin', '')
ON CONFLICT (slug) DO NOTHING;

-- Seed sample FAQ
INSERT INTO faq_items (question, answer, sort_order, category, published) VALUES
    ('What sports do you offer?', 'We offer cricket, football, basketball, swimming, athletics, and more.', 0, 'General', true),
    ('What is the admission process?', 'Visit our academy, fill out the registration form, and attend a trial session.', 1, 'Admissions', true),
    ('What are the age requirements?', 'We accept students from age 5 to 18 years across all programs.', 2, 'General', true),
    ('What is the fee structure?', 'Our fees vary by program. Please contact us for detailed fee information.', 3, 'Fees', true),
    ('Do you provide coaching certifications?', 'Yes, we provide certificates for completed programs and achievements.', 4, 'General', true)
ON CONFLICT DO NOTHING;
