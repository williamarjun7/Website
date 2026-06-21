import { describe, it, expect, vi, beforeEach } from 'vitest';

// Resolves await to { data: null, error: null }
const resolveThen = (resolve: Function) => resolve({ data: null, error: null });

vi.mock('../src/services/insforge', () => ({
    insforge: {
        database: {
            from: vi.fn(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: null, error: new Error('not found') }),
                order: vi.fn().mockReturnThis(),
                then: resolveThen,
            })),
        },
    },
    handleInsforgeError: vi.fn((e) => ({ data: null, error: e instanceof Error ? e.message : 'error' })),
}));

vi.mock('../src/services/tenantService', () => ({
    getCurrentTenantId: vi.fn(() => 'tenant-alpha'),
}));

describe('RBAC Permission Enforcement', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        try { localStorage.clear(); } catch { }
    });

    it('super_admin should bypass permission checks', async () => {
        const { checkPermission } = await import('../src/services/rbacService');
        const { insforge } = await import('../src/services/insforge');
        (insforge.database.from as any).mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'perm-1' }, error: null }),
            order: vi.fn().mockReturnThis(),
            then: resolveThen,
        }));
        const result = await checkPermission('super_admin', 'page', 'create');
        expect(result).toBe(true);
    });

    it('admin should have page create/update/delete/publish permissions', async () => {
        const { checkPermission } = await import('../src/services/rbacService');
        const { insforge } = await import('../src/services/insforge');

        (insforge.database.from as any).mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'perm-1' }, error: null }),
            order: vi.fn().mockReturnThis(),
            then: resolveThen,
        }));

        expect(await checkPermission('admin', 'page', 'create')).toBe(true);
        expect(await checkPermission('admin', 'page', 'update')).toBe(true);
        expect(await checkPermission('admin', 'page', 'delete')).toBe(true);
        expect(await checkPermission('admin', 'page', 'publish')).toBe(true);
    });

    it('editor should NOT have page delete/publish', async () => {
        const { checkPermission } = await import('../src/services/rbacService');
        const { insforge } = await import('../src/services/insforge');

        // Build a chainable object where single resolves based on the action value
        const chainable = (action: string) => {
            const hasPerm = ['create', 'read', 'update'].includes(action);
            return {
                eq: vi.fn((f: string, v: string) => chainable(v)),
                single: vi.fn().mockResolvedValue(
                    hasPerm ? { data: { id: 'perm-1' }, error: null } : { data: null, error: new Error('not found') }
                ),
                select: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                then: resolveThen,
            };
        };
        (insforge.database.from as any).mockReturnValue(chainable(''));

        expect(await checkPermission('editor', 'page', 'create')).toBe(true);
        expect(await checkPermission('editor', 'page', 'read')).toBe(true);
        expect(await checkPermission('editor', 'page', 'update')).toBe(true);
        expect(await checkPermission('editor', 'page', 'delete')).toBe(false);
        expect(await checkPermission('editor', 'page', 'publish')).toBe(false);
    });

    it('viewer should ONLY have read access', async () => {
        const { checkPermission } = await import('../src/services/rbacService');
        const { insforge } = await import('../src/services/insforge');

        const chainable = (action: string) => {
            const hasPerm = action === 'read';
            return {
                eq: vi.fn((f: string, v: string) => chainable(v)),
                single: vi.fn().mockResolvedValue(
                    hasPerm ? { data: { id: 'perm-1' }, error: null } : { data: null, error: new Error('not found') }
                ),
                select: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                then: resolveThen,
            };
        };
        (insforge.database.from as any).mockReturnValue(chainable(''));

        expect(await checkPermission('viewer', 'page', 'read')).toBe(true);
        expect(await checkPermission('viewer', 'page', 'create')).toBe(false);
        expect(await checkPermission('viewer', 'page', 'update')).toBe(false);
        expect(await checkPermission('viewer', 'page', 'delete')).toBe(false);
        expect(await checkPermission('viewer', 'navigation', 'read')).toBe(true);
        expect(await checkPermission('viewer', 'media', 'read')).toBe(true);
    });

    it('should reject tenant management for non-super-admin roles', async () => {
        const { checkPermission } = await import('../src/services/rbacService');
        const { insforge } = await import('../src/services/insforge');
        (insforge.database.from as any).mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('not found') }),
            order: vi.fn().mockReturnThis(),
            then: resolveThen,
        }));
        const result = await checkPermission('admin', 'tenant', 'manage');
        expect(result).toBe(false);
    });

    it('should clear permission cache', async () => {
        const { checkPermission, clearPermissionCache } = await import('../src/services/rbacService');
        const { insforge } = await import('../src/services/insforge');

        let dbCalls = 0;
        (insforge.database.from as any).mockImplementation(() => {
            dbCalls++;
            return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { id: 'perm-1' }, error: null }),
                order: vi.fn().mockReturnThis(),
                then: resolveThen,
            };
        });

        await checkPermission('admin', 'page', 'read');
        await checkPermission('admin', 'page', 'read');
        expect(dbCalls).toBe(1); // Cached, second call doesn't hit DB

        clearPermissionCache();

        await checkPermission('admin', 'page', 'read');
        expect(dbCalls).toBe(2); // After cache clear, hits DB again
    });
});
