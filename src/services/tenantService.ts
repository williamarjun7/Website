import { insforge, handleInsforgeError } from './insforge';

export interface Tenant {
    id: string;
    name: string;
    slug: string;
    domain: string;
    logo_url: string;
    settings_json: Record<string, unknown>;
    is_active: boolean;
    max_users: number;
    storage_limit_mb: number;
    created_at: string;
    updated_at: string;
}

let currentTenantId: string | null = null;
let currentTenant: Tenant | null = null;

export const setCurrentTenant = (tenant: Tenant) => {
    currentTenant = tenant;
    currentTenantId = tenant.id;
};

export const getCurrentTenantId = (): string | null => {
    return currentTenantId;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const applyTenantFilter = (query: any, column = 'tenant_id') => {
    if (!currentTenantId) return query;
    return query.eq(column, currentTenantId);
};

export const getCurrentTenant = (): Tenant | null => {
    return currentTenant;
};

export const getTenantBySlug = async (slug: string) => {
    try {
        const { data, error } = await insforge.database
            .from('tenants')
            .select('*')
            .eq('slug', slug)
            .single();
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const getTenantById = async (id: string) => {
    try {
        const { data, error } = await insforge.database
            .from('tenants')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const getAllTenants = async () => {
    try {
        const { data, error } = await insforge.database
            .from('tenants')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const createTenant = async (data: Partial<Tenant>) => {
    try {
        const { data: tenant, error } = await insforge.database
            .from('tenants')
            .insert(data)
            .select()
            .single();
        if (error) throw error;
        return { data: tenant, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const updateTenant = async (id: string, data: Partial<Tenant>) => {
    try {
        const { data: tenant, error } = await insforge.database
            .from('tenants')
            .update(data)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return { data: tenant, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const resolveTenantFromHostname = async (hostname: string) => {
    try {
        const { data, error } = await insforge.database
            .from('tenants')
            .select('*')
            .eq('domain', hostname)
            .single();
        if (error) {
            const { data: slugData, error: slugError } = await insforge.database
                .from('tenants')
                .select('*')
                .eq('slug', hostname.split('.')[0])
                .single();
            if (slugError) throw slugError;
            return { data: slugData, error: null };
        }
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};
