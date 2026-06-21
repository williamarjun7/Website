-- 20260621200000_create_missing_cms_tables.sql
-- Creates CMS tables that were missed when 003_cms_upgrade.sql wasn't applied.
-- Includes tenant_id from 004_saas_multitenant.sql since that migration was also skipped for these tables.

-- 1. site_navigation
CREATE TABLE IF NOT EXISTS site_navigation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
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
    tenant_id UUID NOT NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    seo_title TEXT DEFAULT '',
    seo_description TEXT DEFAULT '',
    featured_image TEXT DEFAULT '',
    page_content TEXT DEFAULT '',
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft','review','published','archived')),
    template TEXT DEFAULT 'default',
    author TEXT DEFAULT '',
    published_at TIMESTAMPTZ,
    review_notes TEXT DEFAULT '',
    submitted_by TEXT DEFAULT '',
    reviewed_by TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. faq_items
CREATE TABLE IF NOT EXISTS faq_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
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
    tenant_id UUID NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    field_name TEXT DEFAULT '',
    old_value TEXT DEFAULT '',
    new_value TEXT DEFAULT '',
    user_name TEXT DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. media_files
CREATE TABLE IF NOT EXISTS media_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
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
    key TEXT NOT NULL,
    tenant_id UUID NOT NULL,
    value TEXT DEFAULT '',
    type TEXT DEFAULT 'text',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (tenant_id, key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_site_pages_tenant ON site_pages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_site_navigation_tenant ON site_navigation(tenant_id);
CREATE INDEX IF NOT EXISTS idx_faq_items_tenant ON faq_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_content_revisions_tenant ON content_revisions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_media_files_tenant ON media_files(tenant_id);
CREATE INDEX IF NOT EXISTS idx_site_settings_tenant ON site_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_revisions_entity ON content_revisions(entity_type, entity_id);

-- site_pages: composite unique on tenant_id + slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_site_pages_tenant_slug ON site_pages(tenant_id, slug);

-- RLS
ALTER TABLE site_navigation ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies
CREATE POLICY IF NOT EXISTS tenant_isolation_site_navigation ON site_navigation
    USING (tenant_id = (SELECT (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid));
CREATE POLICY IF NOT EXISTS tenant_isolation_site_pages ON site_pages
    USING (tenant_id = (SELECT (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid));
CREATE POLICY IF NOT EXISTS tenant_isolation_faq_items ON faq_items
    USING (tenant_id = (SELECT (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid));
CREATE POLICY IF NOT EXISTS tenant_isolation_content_revisions ON content_revisions
    USING (tenant_id = (SELECT (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid));
CREATE POLICY IF NOT EXISTS tenant_isolation_media_files ON media_files
    USING (tenant_id = (SELECT (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid));
CREATE POLICY IF NOT EXISTS tenant_isolation_site_settings ON site_settings
    USING (tenant_id = (SELECT (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid));

-- Updated-at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_site_navigation_updated_at' AND tgrelid = 'site_navigation'::regclass) THEN
        CREATE TRIGGER set_site_navigation_updated_at BEFORE UPDATE ON site_navigation FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_site_pages_updated_at' AND tgrelid = 'site_pages'::regclass) THEN
        CREATE TRIGGER set_site_pages_updated_at BEFORE UPDATE ON site_pages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_faq_items_updated_at' AND tgrelid = 'faq_items'::regclass) THEN
        CREATE TRIGGER set_faq_items_updated_at BEFORE UPDATE ON faq_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_media_files_updated_at' AND tgrelid = 'media_files'::regclass) THEN
        CREATE TRIGGER set_media_files_updated_at BEFORE UPDATE ON media_files FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 7. site_content (key-value content store)
CREATE TABLE IF NOT EXISTS site_content (
    key TEXT NOT NULL PRIMARY KEY,
    value TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. site_images (page-specific images)
CREATE TABLE IF NOT EXISTS site_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_url TEXT NOT NULL,
    page TEXT NOT NULL DEFAULT '',
    type TEXT DEFAULT '',
    title TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for site_images
CREATE INDEX IF NOT EXISTS idx_site_images_page ON site_images(page);

-- RLS
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow public read site_content" ON site_content FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "Allow public read site_images" ON site_images FOR SELECT USING (true);

SELECT 'Migration 20260621200000 applied — created missing CMS tables' AS status;
