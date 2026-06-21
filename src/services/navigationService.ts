import { insforge, handleInsforgeError } from './insforge';
import { getCurrentTenantId, applyTenantFilter } from './tenantService';
import { invalidateCmsCache } from './cacheService';
import { logNavEvent } from './auditService';

export interface NavItem {
    id: string;
    tenant_id: string;
    label: string;
    url: string;
    parent_id: string | null;
    sort_order: number;
    is_visible: boolean;
    target: string;
    icon: string;
    created_at: string;
    updated_at: string;
}

export const getNavigation = async () => {
    try {
        const { data, error } = await applyTenantFilter(
            insforge.database
                .from('site_navigation')
                .select('*')
        ).order('sort_order', { ascending: true });

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const addNavItem = async (data: Partial<NavItem>) => {
    try {
        const tenantId = getCurrentTenantId();
        const { data: item, error } = await insforge.database
            .from('site_navigation')
            .insert({ ...data, tenant_id: tenantId })
            .select()
            .single();

        if (error) throw error;
        invalidateCmsCache('site_navigation');
        logNavEvent('create', item.id, { label: item.label });
        return { data: item, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const updateNavItem = async (id: string, data: Partial<NavItem>) => {
    try {
        const { data: item, error } = await applyTenantFilter(
            insforge.database
                .from('site_navigation')
                .update(data)
        ).eq('id', id).select().single();

        if (error) throw error;
        invalidateCmsCache('site_navigation');
        logNavEvent('update', id, { changes: Object.keys(data) });
        return { data: item, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const deleteNavItem = async (id: string) => {
    try {
        const { error } = await applyTenantFilter(
            insforge.database
                .from('site_navigation')
                .delete()
        ).eq('id', id);

        if (error) throw error;
        invalidateCmsCache('site_navigation');
        logNavEvent('delete', id);
        return { data: true, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const reorderNavItems = async (items: { id: string; sort_order: number }[]) => {
    try {
        for (const item of items) {
            const { error } = await applyTenantFilter(
                insforge.database
                    .from('site_navigation')
                    .update({ sort_order: item.sort_order })
            ).eq('id', item.id);

            if (error) throw error;
        }
        invalidateCmsCache('site_navigation');
        logNavEvent('reorder', '');
        return { data: true, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};
