import { insforge, handleInsforgeError } from './insforge';
import { getCurrentTenantId } from './tenantService';

export type Role = 'super_admin' | 'admin' | 'editor' | 'viewer';
export type Resource = 'page' | 'navigation' | 'media' | 'setting' | 'faq' | 'revision' | 'user' | 'tenant';
export type Action = 'create' | 'read' | 'update' | 'delete' | 'publish' | 'rollback' | 'manage';

export interface AdminProfile {
    id: string;
    user_id: string;
    tenant_id: string;
    role: Role;
    display_name: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface RolePermission {
    id: string;
    role: Role;
    resource: Resource;
    action: Action;
}

const permissionCache = new Map<string, boolean>();

export const clearPermissionCache = () => permissionCache.clear();

export const getAdminProfile = async (userId: string) => {
    try {
        const tenantId = getCurrentTenantId();
        if (!tenantId) return { data: null, error: 'No tenant context' };
        const { data, error } = await insforge.database
            .from('admin_profiles')
            .select('*')
            .eq('user_id', userId)
            .eq('tenant_id', tenantId)
            .single();
        if (error) throw error;
        return { data: data as AdminProfile, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const getProfileByUserId = async (userId: string) => {
    try {
        const { data, error } = await insforge.database
            .from('admin_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();
        if (error) throw error;
        return { data: data as AdminProfile, error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const getRolePermissions = async (role: Role) => {
    try {
        const { data, error } = await insforge.database
            .from('role_permissions')
            .select('*')
            .eq('role', role);
        if (error) throw error;
        return { data: data as RolePermission[], error: null };
    } catch (error) {
        return handleInsforgeError(error);
    }
};

export const checkPermission = async (role: Role, resource: Resource, action: Action): Promise<boolean> => {
    const cacheKey = `${role}:${resource}:${action}`;
    if (permissionCache.has(cacheKey)) return permissionCache.get(cacheKey)!;
    try {
        const { data, error } = await insforge.database
            .from('role_permissions')
            .select('id')
            .eq('role', role)
            .eq('resource', resource)
            .eq('action', action)
            .single();
        const hasPermission = !error && !!data;
        permissionCache.set(cacheKey, hasPermission);
        return hasPermission;
    } catch {
        return false;
    }
};

export const can = async (resource: Resource, action: Action): Promise<boolean> => {
    try {
        const { data: userData } = await insforge.auth.getCurrentUser();
        if (!userData?.user?.id) return false;
        const { data: profile } = await getAdminProfile(userData.user.id);
        if (!profile || !profile.is_active) return false;
        if (profile.role === 'super_admin') return true;
        return checkPermission(profile.role, resource, action);
    } catch {
        return false;
    }
};


