import { insforge, handleInsforgeError } from './insforge';
import { getCurrentTenantId } from './tenantService';
import { invalidateCmsCache } from './cacheService';

export interface SiteSetting {
    key: string;
    tenant_id: string;
    value: string;
    type: string;
    created_at: string;
    updated_at: string;
}

export const getSetting = async (key: string) => {
    try {
        const tenantId = getCurrentTenantId();
        const { data, error } = await insforge.database
            .from('site_settings')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('key', key)
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const getAllSettings = async () => {
    try {
        const tenantId = getCurrentTenantId();
        const { data, error } = await insforge.database
            .from('site_settings')
            .select('*')
            .eq('tenant_id', tenantId);

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const updateSetting = async (key: string, value: string) => {
    try {
        const tenantId = getCurrentTenantId();
        const { data, error } = await insforge.database
            .from('site_settings')
            .upsert({ key, tenant_id: tenantId, value, updated_at: new Date().toISOString() })
            .select()
            .single();

        if (error) throw error;
        invalidateCmsCache('site_settings');
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const getSettingsMap = async () => {
    try {
        const tenantId = getCurrentTenantId();
        const { data, error } = await insforge.database
            .from('site_settings')
            .select('key, value')
            .eq('tenant_id', tenantId);

        if (error) throw error;
        const map: Record<string, string> = {};
        if (data) {
            for (const item of data) {
                if (item.key) map[item.key] = item.value;
            }
        }
        return { data: map, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};
