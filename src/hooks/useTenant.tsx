import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { getTenantBySlug, getTenantById, setCurrentTenant, getCurrentTenant, type Tenant } from '../services/tenantService';

interface TenantContextValue {
    tenant: Tenant | null;
    loading: boolean;
    error: string | null;
    resolveTenant: (slugOrId: string, isId?: boolean) => Promise<void>;
    setTenantFromStorage: () => void;
}

const TenantContext = createContext<TenantContextValue>({
    tenant: null,
    loading: false,
    error: null,
    resolveTenant: async () => {},
    setTenantFromStorage: () => {},
});

export const TenantProvider = ({ children }: { children: ReactNode }) => {
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const resolveTenant = useCallback(async (slugOrId: string, isId = false) => {
        setLoading(true);
        setError(null);
        try {
            const result = isId
                ? await getTenantById(slugOrId)
                : await getTenantBySlug(slugOrId);
            if (result.error || !result.data) {
                setError(result.error || 'Tenant not found');
                setTenant(null);
            } else {
                setTenant(result.data);
                setCurrentTenant(result.data);
                localStorage.setItem('saas_tenant_id', result.data.id);
            }
        } catch (e) {
            setError('Failed to resolve tenant');
            setTenant(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const setTenantFromStorage = useCallback(() => {
        const tid = localStorage.getItem('saas_tenant_id');
        if (tid && !tenant) {
            resolveTenant(tid, true);
        }
    }, [resolveTenant, tenant]);

    useEffect(() => {
        const current = getCurrentTenant();
        if (current) {
            setTenant(current);
            return;
        }
        setTenantFromStorage();
    }, [setTenantFromStorage]);

    return (
        <TenantContext.Provider value={{ tenant, loading, error, resolveTenant, setTenantFromStorage }}>
            {children}
        </TenantContext.Provider>
    );
};

export const useTenant = () => useContext(TenantContext);
