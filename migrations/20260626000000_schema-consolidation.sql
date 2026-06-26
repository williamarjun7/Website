-- 20260626000000_schema-consolidation.sql
-- Creates missing tables and columns identified by repository audit:
-- Tables: used_nonces, admins, site_pages, site_navigation, media_files, file_versions, content_revisions
-- Columns: bookings.hold_expires_at, bookings.active_prn, menu_items.deleted_at

-- ═══════════════════════════════════════════════════════════════════
-- 1. used_nonces — Fonepay nonce replay protection
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.used_nonces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nonce TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════
-- 2. admins — Admin profiles for dashboard access
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT admins_user_id_unique UNIQUE (user_id)
);

-- ═══════════════════════════════════════════════════════════════════
-- 3. site_pages — CMS pages (legacy from SaaS template)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.site_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    slug TEXT NOT NULL DEFAULT '',
    seo_title TEXT NOT NULL DEFAULT '',
    seo_description TEXT NOT NULL DEFAULT '',
    featured_image TEXT NOT NULL DEFAULT '',
    page_content TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft',
    template TEXT NOT NULL DEFAULT '',
    author TEXT NOT NULL DEFAULT '',
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_pages_tenant_id ON public.site_pages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_site_pages_slug ON public.site_pages(slug);

-- ═══════════════════════════════════════════════════════════════════
-- 4. site_navigation — CMS navigation menu items (legacy from SaaS)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.site_navigation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    label TEXT NOT NULL DEFAULT '',
    url TEXT NOT NULL DEFAULT '',
    parent_id UUID REFERENCES public.site_navigation(id) ON DELETE SET NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_visible BOOLEAN NOT NULL DEFAULT true,
    target TEXT NOT NULL DEFAULT '_self',
    icon TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_navigation_tenant_id ON public.site_navigation(tenant_id);
CREATE INDEX IF NOT EXISTS idx_site_navigation_parent_id ON public.site_navigation(parent_id);

-- ═══════════════════════════════════════════════════════════════════
-- 5. media_files — CMS media library (legacy from SaaS)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.media_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    url TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL DEFAULT '',
    mime_type TEXT NOT NULL DEFAULT '',
    size BIGINT NOT NULL DEFAULT 0,
    folder TEXT NOT NULL DEFAULT '',
    alt_text TEXT NOT NULL DEFAULT '',
    current_version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_files_tenant_id ON public.media_files(tenant_id);

-- ═══════════════════════════════════════════════════════════════════
-- 6. file_versions — CMS file versioning (legacy from SaaS)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.file_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_file_id UUID NOT NULL REFERENCES public.media_files(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    url TEXT NOT NULL DEFAULT '',
    size BIGINT NOT NULL DEFAULT 0,
    mime_type TEXT NOT NULL DEFAULT '',
    uploaded_by TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_file_versions_media_file_id ON public.file_versions(media_file_id);

-- ═══════════════════════════════════════════════════════════════════
-- 7. content_revisions — Audit trail for CMS content changes
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.content_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    entity_type TEXT NOT NULL DEFAULT '',
    entity_id UUID NOT NULL,
    field_name TEXT NOT NULL DEFAULT '',
    old_value TEXT,
    new_value TEXT,
    user_name TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_revisions_entity ON public.content_revisions(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_content_revisions_tenant_id ON public.content_revisions(tenant_id);

-- ═══════════════════════════════════════════════════════════════════
-- 8. Add missing columns to bookings
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS hold_expires_at TIMESTAMPTZ;

ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS active_prn TEXT;

-- ═══════════════════════════════════════════════════════════════════
-- 9. Add soft-delete column to menu_items
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE public.menu_items
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

SELECT 'Migration 20260626000000 applied — schema consolidation' AS status;
