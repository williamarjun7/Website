export const getCurrentTenantId = (): string | null => {
    return null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const applyTenantFilter = (query: any, column = 'tenant_id') => {
    return query.eq(column, '00000000-0000-0000-0000-000000000000');
};
