export const getCurrentTenantId = (): string | null => {
    try {
        return localStorage.getItem('saas_tenant_id');
    } catch {
        return null;
    }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const applyTenantFilter = (query: any, column = 'tenant_id') => {
    const tenantId = getCurrentTenantId();
    if (!tenantId) return query;
    return query.eq(column, tenantId);
};
