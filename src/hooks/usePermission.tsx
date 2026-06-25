import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { checkPermission, type Role, type Resource, type Action, type AdminProfile } from '../services/rbacService';
import { getCurrentAdmin, getAdminProfileForCurrentUser } from '../services/authService';

interface PermissionContextValue {
    profile: AdminProfile | null;
    role: Role | null;
    loading: boolean;
    can: (resource: Resource, action: Action) => Promise<boolean>;
    refreshPermissions: () => Promise<void>;
    hasAnyRole: (...roles: Role[]) => boolean;
}

const PermissionContext = createContext<PermissionContextValue>({
    profile: null,
    role: null,
    loading: true,
    can: async () => false,
    refreshPermissions: async () => {},
    hasAnyRole: () => false,
});

export const PermissionProvider = ({ children }: { children: ReactNode }) => {
    const [profile, setProfile] = useState<AdminProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshPermissions = useCallback(async () => {
        setLoading(true);
        try {
            const { data: user } = await getCurrentAdmin();
            if (user?.user?.id) {
                const { data: userProfile } = await getAdminProfileForCurrentUser();
                if (userProfile) {
                    setProfile(userProfile as AdminProfile);
                    localStorage.setItem('saas_user_id', user.user.id);
                } else {
                    setProfile(null);
                }
            } else {
                setProfile(null);
            }
        } catch {
            setProfile(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshPermissions();
    }, [refreshPermissions]);

    const checkAccess = useCallback(async (resource: Resource, action: Action): Promise<boolean> => {
        if (!profile) return false;
        if (profile.role === 'super_admin') return true;
        return checkPermission(profile.role, resource, action);
    }, [profile]);

    const hasAnyRole = useCallback((...roles: Role[]): boolean => {
        if (!profile) return false;
        return roles.includes(profile.role);
    }, [profile]);

    return (
        <PermissionContext.Provider value={{
            profile,
            role: profile?.role || null,
            loading,
            can: checkAccess,
            refreshPermissions,
            hasAnyRole,
        }}>
            {children}
        </PermissionContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const usePermission = () => useContext(PermissionContext);
