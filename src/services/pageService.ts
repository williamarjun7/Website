import { insforge, handleInsforgeError } from './insforge';
import { getCurrentTenantId, applyTenantFilter } from './tenantService';
import { invalidateCmsCache } from './cacheService';
import { logPageEvent } from './auditService';
import { can } from './rbacService';

export interface SitePage {
    id: string;
    tenant_id: string;
    title: string;
    slug: string;
    seo_title: string;
    seo_description: string;
    featured_image: string;
    page_content: string;
    status: 'draft' | 'review' | 'published' | 'archived';
    template: string;
    author: string;
    published_at: string;
    created_at: string;
    updated_at: string;
}

export const getPages = async () => {
    try {
        const { data, error } = await applyTenantFilter(
            insforge.database
                .from('site_pages')
                .select('*')
        ).order('created_at', { ascending: false });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const getPublishedPages = async () => {
    try {
        const { data, error } = await applyTenantFilter(
            insforge.database
                .from('site_pages')
                .select('*')
        ).eq('status', 'published').order('created_at', { ascending: false });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const getPageBySlug = async (slug: string) => {
    try {
        const { data, error } = await applyTenantFilter(
            insforge.database
                .from('site_pages')
                .select('*')
        ).eq('slug', slug).maybeSingle();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const getPageById = async (id: string) => {
    try {
        const { data, error } = await applyTenantFilter(
            insforge.database
                .from('site_pages')
                .select('*')
        ).eq('id', id).single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const createPage = async (data: Partial<SitePage>) => {
    try {
        if (!await can('page', 'create')) return { data: null, error: 'Forbidden: insufficient permissions' };
        const tenantId = getCurrentTenantId();
        const { data: page, error } = await insforge.database
            .from('site_pages')
            .insert({ ...data, tenant_id: tenantId })
            .select()
            .single();

        if (error) throw error;
        invalidateCmsCache('site_pages');
        logPageEvent('create', page.id, { title: page.title });
        return { data: page, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const updatePage = async (id: string, data: Partial<SitePage>) => {
    try {
        if (!await can('page', 'update')) return { data: null, error: 'Forbidden: insufficient permissions' };
        const { data: page, error } = await applyTenantFilter(
            insforge.database
                .from('site_pages')
                .update(data)
        ).eq('id', id).select().single();

        if (error) throw error;
        invalidateCmsCache('site_pages');
        logPageEvent('update', id, { changes: Object.keys(data) });
        return { data: page, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const deletePage = async (id: string) => {
    try {
        if (!await can('page', 'delete')) return { data: null, error: 'Forbidden: insufficient permissions' };
        const { data, error } = await applyTenantFilter(
            insforge.database
                .from('site_pages')
                .delete()
        ).eq('id', id).select().single();

        if (error) throw error;
        invalidateCmsCache('site_pages');
        logPageEvent('delete', id);
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const publishPage = async (id: string) => {
    try {
        if (!await can('page', 'publish')) return { data: null, error: 'Forbidden: insufficient permissions' };
        const { data, error } = await applyTenantFilter(
            insforge.database
                .from('site_pages')
                .update({ status: 'published', published_at: new Date().toISOString() })
        ).eq('id', id).select().single();

        if (error) throw error;
        invalidateCmsCache('site_pages');
        logPageEvent('publish', id);
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};
