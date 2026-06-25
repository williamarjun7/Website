import { insforge, handleInsforgeError } from './insforge';
import { getCurrentTenantId } from './tenantService';
import { invalidateCmsCache } from './cacheService';
import { logFaqEvent } from './auditService';
import { can } from './rbacService';

export interface FaqItem {
    id: string;
    tenant_id: string;
    question: string;
    answer: string;
    sort_order: number;
    category: string;
    published: boolean;
    created_at: string;
    updated_at: string;
}

export const getFaqItems = async () => {
    try {
        const tenantId = getCurrentTenantId();
        const { data, error } = await insforge.database
            .from('faq_items')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('category', { ascending: true })
            .order('sort_order', { ascending: true });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const getPublishedFaqItems = async () => {
    try {
        const tenantId = getCurrentTenantId();
        const { data, error } = await insforge.database
            .from('faq_items')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('published', true)
            .order('category', { ascending: true })
            .order('sort_order', { ascending: true });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const addFaqItem = async (data: Partial<FaqItem>) => {
    try {
        if (!await can('faq', 'create')) return { data: null, error: 'Forbidden: insufficient permissions' };
        const tenantId = getCurrentTenantId();
        const { data: item, error } = await insforge.database
            .from('faq_items')
            .insert({ ...data, tenant_id: tenantId })
            .select()
            .single();

        if (error) throw error;
        invalidateCmsCache('faq_items');
        logFaqEvent('create', item.id, { question: item.question });
        return { data: item, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const updateFaqItem = async (id: string, data: Partial<FaqItem>) => {
    try {
        if (!await can('faq', 'update')) return { data: null, error: 'Forbidden: insufficient permissions' };
        const tenantId = getCurrentTenantId();
        const { data: item, error } = await insforge.database
            .from('faq_items')
            .update(data)
            .eq('tenant_id', tenantId)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        invalidateCmsCache('faq_items');
        logFaqEvent('update', id, { changes: Object.keys(data) });
        return { data: item, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const deleteFaqItem = async (id: string) => {
    try {
        if (!await can('faq', 'delete')) return { data: null, error: 'Forbidden: insufficient permissions' };
        const tenantId = getCurrentTenantId();
        const { error } = await insforge.database
            .from('faq_items')
            .delete()
            .eq('tenant_id', tenantId)
            .eq('id', id);

        if (error) throw error;
        invalidateCmsCache('faq_items');
        logFaqEvent('delete', id);
        return { data: true, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const getFaqCategories = async () => {
    try {
        const tenantId = getCurrentTenantId();
        const { data, error } = await insforge.database
            .from('faq_items')
            .select('category')
            .eq('tenant_id', tenantId);

        if (error) throw error;
        const categories: string[] = [];
        if (data) {
            const seen = new Set<string>();
            for (const item of data) {
                if (item.category && !seen.has(item.category)) {
                    seen.add(item.category);
                    categories.push(item.category);
                }
            }
        }
        return { data: categories, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};
