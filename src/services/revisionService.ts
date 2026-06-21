import { insforge, handleInsforgeError } from './insforge';
import { getCurrentTenantId } from './tenantService';

export interface ContentRevision {
    id: string;
    tenant_id: string;
    entity_type: string;
    entity_id: string;
    field_name: string;
    old_value: string;
    new_value: string;
    user_name: string;
    created_at: string;
}

export const addRevision = async (data: Partial<ContentRevision>) => {
    try {
        const tenantId = getCurrentTenantId();
        const { data: revision, error } = await insforge.database
            .from('content_revisions')
            .insert({ ...data, tenant_id: tenantId })
            .select()
            .single();

        if (error) throw error;
        return { data: revision, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const getRevisions = async (entityType?: string, entityId?: string) => {
    try {
        const tenantId = getCurrentTenantId();
        let query = insforge.database
            .from('content_revisions')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        if (entityType) {
            query = query.eq('entity_type', entityType);
        }
        if (entityId) {
            query = query.eq('entity_id', entityId);
        }

        const { data, error } = await query;

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const getAllRevisions = async () => {
    try {
        const tenantId = getCurrentTenantId();
        const { data, error } = await insforge.database
            .from('content_revisions')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};
