-- ============================================================================
-- Migration 004: SaaS Multi-Tenant Transformation
-- Description: Converts single-tenant CMS to multi-tenant SaaS platform.
--              Adds tenant isolation, RBAC, audit logging, and file versioning.
-- Idempotent: Uses IF NOT EXISTS / ON CONFLICT for all destructive operations.
-- Platform:   InsForge (PostgreSQL + RLS)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. TENANTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    domain TEXT UNIQUE DEFAULT '',
    logo_url TEXT DEFAULT '',
    settings_json JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    max_users INT DEFAULT 10,
    storage_limit_mb INT DEFAULT 500,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 2. ADD tenant_id TO ALL CMS TABLES
-- ============================================================================

-- site_navigation
ALTER TABLE site_navigation ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE;

-- site_pages
ALTER TABLE site_pages ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE;

-- faq_items
ALTER TABLE faq_items ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE;

-- content_revisions
ALTER TABLE content_revisions ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE;

-- media_files
ALTER TABLE media_files ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE;

-- site_settings: add tenant_id, drop existing PK, create composite PK
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'site_settings_pkey'
        AND conrelid = 'site_settings'::regclass
    ) THEN
        ALTER TABLE site_settings DROP CONSTRAINT site_settings_pkey;
    END IF;
END $$;

ALTER TABLE site_settings ADD PRIMARY KEY (tenant_id, key);

-- site_pages: drop existing slug unique constraint, add composite unique
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'site_pages_slug_key'
        AND conrelid = 'site_pages'::regclass
    ) THEN
        ALTER TABLE site_pages DROP CONSTRAINT site_pages_slug_key;
    END IF;
END $$;

ALTER TABLE site_pages ADD CONSTRAINT site_pages_tenant_slug_unique UNIQUE (tenant_id, slug);

-- Indexes on tenant_id for all tenant-scoped tables
CREATE INDEX IF NOT EXISTS idx_site_pages_tenant ON site_pages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_site_navigation_tenant ON site_navigation(tenant_id);
CREATE INDEX IF NOT EXISTS idx_faq_items_tenant ON faq_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_content_revisions_tenant ON content_revisions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_media_files_tenant ON media_files(tenant_id);
CREATE INDEX IF NOT EXISTS idx_site_settings_tenant ON site_settings(tenant_id);

-- ============================================================================
-- 3. ADMIN PROFILES (RBAC)
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('super_admin','admin','editor','viewer')),
    display_name TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_profiles_user ON admin_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_profiles_tenant ON admin_profiles(tenant_id);

-- ============================================================================
-- 4. ROLE PERMISSIONS TABLE & SEED
-- ============================================================================
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT NOT NULL,
    resource TEXT NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(role, resource, action)
);

-- Seed: super_admin — full access on all resources
INSERT INTO role_permissions (role, resource, action) VALUES
    ('super_admin', 'page', 'create'),
    ('super_admin', 'page', 'read'),
    ('super_admin', 'page', 'update'),
    ('super_admin', 'page', 'delete'),
    ('super_admin', 'page', 'publish'),
    ('super_admin', 'page', 'rollback'),
    ('super_admin', 'navigation', 'create'),
    ('super_admin', 'navigation', 'read'),
    ('super_admin', 'navigation', 'update'),
    ('super_admin', 'navigation', 'delete'),
    ('super_admin', 'navigation', 'publish'),
    ('super_admin', 'navigation', 'rollback'),
    ('super_admin', 'media', 'create'),
    ('super_admin', 'media', 'read'),
    ('super_admin', 'media', 'update'),
    ('super_admin', 'media', 'delete'),
    ('super_admin', 'media', 'publish'),
    ('super_admin', 'media', 'rollback'),
    ('super_admin', 'setting', 'create'),
    ('super_admin', 'setting', 'read'),
    ('super_admin', 'setting', 'update'),
    ('super_admin', 'setting', 'delete'),
    ('super_admin', 'setting', 'publish'),
    ('super_admin', 'setting', 'rollback'),
    ('super_admin', 'faq', 'create'),
    ('super_admin', 'faq', 'read'),
    ('super_admin', 'faq', 'update'),
    ('super_admin', 'faq', 'delete'),
    ('super_admin', 'faq', 'publish'),
    ('super_admin', 'faq', 'rollback'),
    ('super_admin', 'revision', 'create'),
    ('super_admin', 'revision', 'read'),
    ('super_admin', 'revision', 'update'),
    ('super_admin', 'revision', 'delete'),
    ('super_admin', 'revision', 'publish'),
    ('super_admin', 'revision', 'rollback'),
    ('super_admin', 'user', 'create'),
    ('super_admin', 'user', 'read'),
    ('super_admin', 'user', 'update'),
    ('super_admin', 'user', 'delete'),
    ('super_admin', 'user', 'publish'),
    ('super_admin', 'user', 'rollback'),
    ('super_admin', 'user', 'manage'),
    ('super_admin', 'tenant', 'create'),
    ('super_admin', 'tenant', 'read'),
    ('super_admin', 'tenant', 'update'),
    ('super_admin', 'tenant', 'delete'),
    ('super_admin', 'tenant', 'publish'),
    ('super_admin', 'tenant', 'rollback'),
    ('super_admin', 'tenant', 'manage')
ON CONFLICT (role, resource, action) DO NOTHING;

-- Seed: admin — pages, navigation, media, settings, faq (CRUD + publish + rollback); revisions + users (read)
INSERT INTO role_permissions (role, resource, action) VALUES
    ('admin', 'page', 'create'),
    ('admin', 'page', 'read'),
    ('admin', 'page', 'update'),
    ('admin', 'page', 'delete'),
    ('admin', 'page', 'publish'),
    ('admin', 'page', 'rollback'),
    ('admin', 'navigation', 'create'),
    ('admin', 'navigation', 'read'),
    ('admin', 'navigation', 'update'),
    ('admin', 'navigation', 'delete'),
    ('admin', 'navigation', 'publish'),
    ('admin', 'navigation', 'rollback'),
    ('admin', 'media', 'create'),
    ('admin', 'media', 'read'),
    ('admin', 'media', 'update'),
    ('admin', 'media', 'delete'),
    ('admin', 'media', 'publish'),
    ('admin', 'media', 'rollback'),
    ('admin', 'setting', 'create'),
    ('admin', 'setting', 'read'),
    ('admin', 'setting', 'update'),
    ('admin', 'setting', 'delete'),
    ('admin', 'setting', 'publish'),
    ('admin', 'setting', 'rollback'),
    ('admin', 'faq', 'create'),
    ('admin', 'faq', 'read'),
    ('admin', 'faq', 'update'),
    ('admin', 'faq', 'delete'),
    ('admin', 'faq', 'publish'),
    ('admin', 'faq', 'rollback'),
    ('admin', 'revision', 'read'),
    ('admin', 'user', 'read')
ON CONFLICT (role, resource, action) DO NOTHING;

-- Seed: editor — page + faq (CRU); navigation, media, settings, revisions (read)
INSERT INTO role_permissions (role, resource, action) VALUES
    ('editor', 'page', 'create'),
    ('editor', 'page', 'read'),
    ('editor', 'page', 'update'),
    ('editor', 'faq', 'create'),
    ('editor', 'faq', 'read'),
    ('editor', 'faq', 'update'),
    ('editor', 'navigation', 'read'),
    ('editor', 'media', 'read'),
    ('editor', 'setting', 'read'),
    ('editor', 'revision', 'read')
ON CONFLICT (role, resource, action) DO NOTHING;

-- Seed: viewer — read on pages, navigation, media, settings, faq, revisions
INSERT INTO role_permissions (role, resource, action) VALUES
    ('viewer', 'page', 'read'),
    ('viewer', 'navigation', 'read'),
    ('viewer', 'media', 'read'),
    ('viewer', 'setting', 'read'),
    ('viewer', 'faq', 'read'),
    ('viewer', 'revision', 'read')
ON CONFLICT (role, resource, action) DO NOTHING;

-- ============================================================================
-- 5. AUDIT LOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    resource_id TEXT DEFAULT '',
    details JSONB DEFAULT '{}',
    ip_address TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- ============================================================================
-- 6. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Helper function to extract tenant_id from JWT claims
-- Usage: current_setting('request.jwt.claims', true)::json->>'tenant_id'

-- site_pages
ALTER TABLE site_pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_site_pages ON site_pages;
CREATE POLICY tenant_isolation_site_pages ON site_pages
    USING (tenant_id = (SELECT (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid));

-- site_navigation
ALTER TABLE site_navigation ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_site_navigation ON site_navigation;
CREATE POLICY tenant_isolation_site_navigation ON site_navigation
    USING (tenant_id = (SELECT (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid));

-- faq_items
ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_faq_items ON faq_items;
CREATE POLICY tenant_isolation_faq_items ON faq_items
    USING (tenant_id = (SELECT (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid));

-- content_revisions
ALTER TABLE content_revisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_content_revisions ON content_revisions;
CREATE POLICY tenant_isolation_content_revisions ON content_revisions
    USING (tenant_id = (SELECT (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid));

-- media_files
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_media_files ON media_files;
CREATE POLICY tenant_isolation_media_files ON media_files
    USING (tenant_id = (SELECT (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid));

-- site_settings
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_site_settings ON site_settings;
CREATE POLICY tenant_isolation_site_settings ON site_settings
    USING (tenant_id = (SELECT (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid));

-- tenants table: only super_admins can manage, users see their own tenant
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_tenants ON tenants;
CREATE POLICY tenant_isolation_tenants ON tenants
    USING (id = (SELECT (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid));

-- admin_profiles: users see own profile; super_admins see all
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_own_profile ON admin_profiles;
CREATE POLICY user_own_profile ON admin_profiles
    USING (user_id = (SELECT (current_setting('request.jwt.claims', true)::json->>'sub')::uuid));

DROP POLICY IF EXISTS super_admin_read_all ON admin_profiles;
CREATE POLICY super_admin_read_all ON admin_profiles
    USING ((SELECT role FROM admin_profiles WHERE user_id = (SELECT (current_setting('request.jwt.claims', true)::json->>'sub')::uuid) LIMIT 1) = 'super_admin');

DROP POLICY IF EXISTS tenant_scoped_admin_profiles ON admin_profiles;
CREATE POLICY tenant_scoped_admin_profiles ON admin_profiles
    USING (tenant_id = (SELECT (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid));

-- audit_logs: tenant-scoped access
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_audit_logs ON audit_logs;
CREATE POLICY tenant_isolation_audit_logs ON audit_logs
    USING (tenant_id = (SELECT (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid));

-- file_versions
ALTER TABLE file_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_file_versions ON file_versions;
CREATE POLICY tenant_isolation_file_versions ON file_versions
    USING (media_file_id IN (SELECT id FROM media_files WHERE tenant_id = (SELECT (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid)));

-- role_permissions: readable by all authenticated users
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS role_permissions_read_all ON role_permissions;
CREATE POLICY role_permissions_read_all ON role_permissions
    USING (true);

-- ============================================================================
-- 7. DRAFT/REVIEW/PUBLISHED/ARCHIVED WORKFLOW — site_pages enhancements
-- ============================================================================

-- Ensure status check constraint covers all 4 workflow states
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'site_pages_status_check'
        AND conrelid = 'site_pages'::regclass
    ) THEN
        ALTER TABLE site_pages DROP CONSTRAINT site_pages_status_check;
    END IF;
END $$;

ALTER TABLE site_pages ADD CONSTRAINT site_pages_status_check
    CHECK (status IN ('draft', 'review', 'published', 'archived'));

-- Add workflow columns (idempotent)
ALTER TABLE site_pages ADD COLUMN IF NOT EXISTS review_notes TEXT DEFAULT '';
ALTER TABLE site_pages ADD COLUMN IF NOT EXISTS submitted_by TEXT DEFAULT '';
ALTER TABLE site_pages ADD COLUMN IF NOT EXISTS reviewed_by TEXT DEFAULT '';

-- ============================================================================
-- 8. FILE VERSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS file_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_file_id UUID NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    url TEXT NOT NULL,
    size INT DEFAULT 0,
    mime_type TEXT DEFAULT '',
    uploaded_by TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(media_file_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_file_versions_media ON file_versions(media_file_id);

-- ============================================================================
-- 9. SEED DEFAULT TENANT
-- ============================================================================
INSERT INTO tenants (name, slug, domain, settings_json)
VALUES (
    'Highlands Cafe & Motel Inn',
    'highlands',
    'highlandsmotel.com',
    '{"theme": "default", "timezone": "Asia/Kathmandu", "currency": "NPR"}'
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 10. updated_at TRIGGER FUNCTION (reusable across all tables)
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'set_tenants_updated_at'
        AND tgrelid = 'tenants'::regclass
    ) THEN
        CREATE TRIGGER set_tenants_updated_at
            BEFORE UPDATE ON tenants
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'set_site_navigation_updated_at'
        AND tgrelid = 'site_navigation'::regclass
    ) THEN
        CREATE TRIGGER set_site_navigation_updated_at
            BEFORE UPDATE ON site_navigation
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'set_site_pages_updated_at'
        AND tgrelid = 'site_pages'::regclass
    ) THEN
        CREATE TRIGGER set_site_pages_updated_at
            BEFORE UPDATE ON site_pages
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'set_faq_items_updated_at'
        AND tgrelid = 'faq_items'::regclass
    ) THEN
        CREATE TRIGGER set_faq_items_updated_at
            BEFORE UPDATE ON faq_items
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'set_media_files_updated_at'
        AND tgrelid = 'media_files'::regclass
    ) THEN
        CREATE TRIGGER set_media_files_updated_at
            BEFORE UPDATE ON media_files
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'set_admin_profiles_updated_at'
        AND tgrelid = 'admin_profiles'::regclass
    ) THEN
        CREATE TRIGGER set_admin_profiles_updated_at
            BEFORE UPDATE ON admin_profiles
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

COMMIT;
