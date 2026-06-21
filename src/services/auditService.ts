import { insforge, handleInsforgeError } from './insforge';
import { getCurrentTenantId } from './tenantService';

export interface AuditLogEntry {
    id: string;
    tenant_id: string;
    user_id: string;
    action: string;
    resource: string;
    resource_id: string;
    details: Record<string, unknown>;
    ip_address: string;
    created_at: string;
}

export const logAuditEvent = async (
    action: string,
    resource: string,
    resourceId: string = '',
    details: Record<string, unknown> = {}
) => {
    try {
        const tenantId = getCurrentTenantId();
        const userId = localStorage.getItem('saas_user_id') || '';
        if (!tenantId) return { data: null, error: 'No tenant context' };
        const { data, error } = await insforge.database
            .from('audit_logs')
            .insert({
                tenant_id: tenantId,
                user_id: userId,
                action,
                resource,
                resource_id: resourceId,
                details,
                ip_address: '',
            })
            .select()
            .single();
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const logPageEvent = (action: string, pageId: string, details?: Record<string, unknown>) =>
    logAuditEvent(action, 'page', pageId, details);
export const logNavEvent = (action: string, navId: string, details?: Record<string, unknown>) =>
    logAuditEvent(action, 'navigation', navId, details);
export const logMediaEvent = (action: string, mediaId: string, details?: Record<string, unknown>) =>
    logAuditEvent(action, 'media', mediaId, details);
export const logSettingEvent = (action: string, key: string, details?: Record<string, unknown>) =>
    logAuditEvent(action, 'setting', key, details);
export const logFaqEvent = (action: string, faqId: string, details?: Record<string, unknown>) =>
    logAuditEvent(action, 'faq', faqId, details);
export const logUserEvent = (action: string, userId: string, details?: Record<string, unknown>) =>
    logAuditEvent(action, 'user', userId, details);

export const getAuditLogs = async (tenantId?: string, limit = 100) => {
    try {
        const tid = tenantId || getCurrentTenantId();
        if (!tid) return { data: null, error: 'No tenant context' };
        const { data, error } = await insforge.database
            .from('audit_logs')
            .select('*')
            .eq('tenant_id', tid)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return { data: data as AuditLogEntry[], error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const getAuditLogsByResource = async (resource: string, resourceId: string, limit = 20) => {
    try {
        const tenantId = getCurrentTenantId();
        if (!tenantId) return { data: null, error: 'No tenant context' };
        const { data, error } = await insforge.database
            .from('audit_logs')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('resource', resource)
            .eq('resource_id', resourceId)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return { data: data as AuditLogEntry[], error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};
