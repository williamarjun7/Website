-- Create tenants, admin_profiles, role_permissions tables (SaaS multi-tenant RBAC)
-- Extracted from 004_saas_multitenant.sql (schema-only, no table deps on other tables)

BEGIN;

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

CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT NOT NULL,
    resource TEXT NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(role, resource, action)
);

-- Seed permissions
INSERT INTO role_permissions (role, resource, action) VALUES
    ('super_admin', 'page', 'create'), ('super_admin', 'page', 'read'), ('super_admin', 'page', 'update'),
    ('super_admin', 'page', 'delete'), ('super_admin', 'page', 'publish'), ('super_admin', 'page', 'rollback'),
    ('super_admin', 'navigation', 'create'), ('super_admin', 'navigation', 'read'),
    ('super_admin', 'navigation', 'update'), ('super_admin', 'navigation', 'delete'),
    ('super_admin', 'navigation', 'publish'), ('super_admin', 'navigation', 'rollback'),
    ('super_admin', 'media', 'create'), ('super_admin', 'media', 'read'), ('super_admin', 'media', 'update'),
    ('super_admin', 'media', 'delete'), ('super_admin', 'media', 'publish'), ('super_admin', 'media', 'rollback'),
    ('super_admin', 'setting', 'create'), ('super_admin', 'setting', 'read'), ('super_admin', 'setting', 'update'),
    ('super_admin', 'setting', 'delete'), ('super_admin', 'setting', 'publish'), ('super_admin', 'setting', 'rollback'),
    ('super_admin', 'faq', 'create'), ('super_admin', 'faq', 'read'), ('super_admin', 'faq', 'update'),
    ('super_admin', 'faq', 'delete'), ('super_admin', 'faq', 'publish'), ('super_admin', 'faq', 'rollback'),
    ('super_admin', 'revision', 'create'), ('super_admin', 'revision', 'read'), ('super_admin', 'revision', 'update'),
    ('super_admin', 'revision', 'delete'), ('super_admin', 'revision', 'publish'), ('super_admin', 'revision', 'rollback'),
    ('super_admin', 'user', 'create'), ('super_admin', 'user', 'read'), ('super_admin', 'user', 'update'),
    ('super_admin', 'user', 'delete'), ('super_admin', 'user', 'publish'), ('super_admin', 'user', 'rollback'),
    ('super_admin', 'user', 'manage'),
    ('super_admin', 'tenant', 'create'), ('super_admin', 'tenant', 'read'), ('super_admin', 'tenant', 'update'),
    ('super_admin', 'tenant', 'delete'), ('super_admin', 'tenant', 'publish'), ('super_admin', 'tenant', 'rollback'),
    ('super_admin', 'tenant', 'manage'),
    ('admin', 'page', 'create'), ('admin', 'page', 'read'), ('admin', 'page', 'update'),
    ('admin', 'page', 'delete'), ('admin', 'page', 'publish'), ('admin', 'page', 'rollback'),
    ('admin', 'navigation', 'create'), ('admin', 'navigation', 'read'), ('admin', 'navigation', 'update'),
    ('admin', 'navigation', 'delete'), ('admin', 'navigation', 'publish'), ('admin', 'navigation', 'rollback'),
    ('admin', 'media', 'create'), ('admin', 'media', 'read'), ('admin', 'media', 'update'),
    ('admin', 'media', 'delete'), ('admin', 'media', 'publish'), ('admin', 'media', 'rollback'),
    ('admin', 'setting', 'create'), ('admin', 'setting', 'read'), ('admin', 'setting', 'update'),
    ('admin', 'setting', 'delete'), ('admin', 'setting', 'publish'), ('admin', 'setting', 'rollback'),
    ('admin', 'faq', 'create'), ('admin', 'faq', 'read'), ('admin', 'faq', 'update'),
    ('admin', 'faq', 'delete'), ('admin', 'faq', 'publish'), ('admin', 'faq', 'rollback'),
    ('admin', 'revision', 'read'), ('admin', 'user', 'read'),
    ('editor', 'page', 'create'), ('editor', 'page', 'read'), ('editor', 'page', 'update'),
    ('editor', 'faq', 'create'), ('editor', 'faq', 'read'), ('editor', 'faq', 'update'),
    ('editor', 'navigation', 'read'), ('editor', 'media', 'read'), ('editor', 'setting', 'read'), ('editor', 'revision', 'read'),
    ('viewer', 'page', 'read'), ('viewer', 'navigation', 'read'), ('viewer', 'media', 'read'),
    ('viewer', 'setting', 'read'), ('viewer', 'faq', 'read'), ('viewer', 'revision', 'read')
ON CONFLICT (role, resource, action) DO NOTHING;

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_tenants_updated_at' AND tgrelid = 'tenants'::regclass) THEN
        CREATE TRIGGER set_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_admin_profiles_updated_at' AND tgrelid = 'admin_profiles'::regclass) THEN
        CREATE TRIGGER set_admin_profiles_updated_at BEFORE UPDATE ON admin_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

COMMIT;
