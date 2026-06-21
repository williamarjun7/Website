import { insforge, handleInsforgeError } from './insforge';
import { getCurrentTenantId } from './tenantService';
import { invalidateCmsCache } from './cacheService';
import { logPageEvent } from './auditService';

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
        const tenantId = getCurrentTenantId();
        const { data, error } = await insforge.database
            .from('site_pages')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const getPublishedPages = async () => {
    try {
        const tenantId = getCurrentTenantId();
        const { data, error } = await insforge.database
            .from('site_pages')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('status', 'published')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const getPageBySlug = async (slug: string) => {
    try {
        const tenantId = getCurrentTenantId();
        const { data, error } = await insforge.database
            .from('site_pages')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('slug', slug)
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const getPageById = async (id: string) => {
    try {
        const tenantId = getCurrentTenantId();
        const { data, error } = await insforge.database
            .from('site_pages')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('id', id)
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const createPage = async (data: Partial<SitePage>) => {
    try {
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
        const tenantId = getCurrentTenantId();
        const { data: page, error } = await insforge.database
            .from('site_pages')
            .update(data)
            .eq('tenant_id', tenantId)
            .eq('id', id)
            .select()
            .single();

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
        const tenantId = getCurrentTenantId();
        const { data, error } = await insforge.database
            .from('site_pages')
            .delete()
            .eq('tenant_id', tenantId)
            .eq('id', id)
            .select()
            .single();

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
        const tenantId = getCurrentTenantId();
        const { data, error } = await insforge.database
            .from('site_pages')
            .update({ status: 'published', published_at: new Date().toISOString() })
            .eq('tenant_id', tenantId)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        invalidateCmsCache('site_pages');
        logPageEvent('publish', id);
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};
