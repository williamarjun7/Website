import { describe, it, expect, vi, beforeEach } from 'vitest';

const testTenantId = 'tenant-alpha';

// A proper thenable resolves on await so clearAllMocks doesn't break it
const resolveThen = (resolve: Function) => resolve({ data: null, error: null });

const createMockQuery = (returnData: any) => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(
        Array.isArray(returnData)
            ? returnData.length === 1
                ? { data: returnData[0], error: null }
                : { data: returnData[0] || null, error: returnData.length === 0 ? new Error('not found') : null }
            : { data: returnData, error: null }
    ),
    then: resolveThen,
});

const customThen = (resolve: Function) => resolve({ data: null, error: null });

vi.mock('../src/services/insforge', () => ({
    insforge: {
        database: {
            from: vi.fn(() => createMockQuery(null)),
        },
        storage: {
            from: vi.fn(() => ({
                upload: vi.fn().mockResolvedValue({ data: { url: 'https://cdn.example.com/test.jpg', key: 'test.jpg' }, error: null }),
                remove: vi.fn().mockResolvedValue({ data: null, error: null }),
                getPublicUrl: vi.fn(() => 'https://cdn.example.com/test.jpg'),
            })),
        },
    },
    handleInsforgeError: vi.fn((e) => ({ data: null, error: e instanceof Error ? e.message : 'error' })),
}));

vi.mock('../src/services/tenantService', () => ({
    getCurrentTenantId: vi.fn(() => testTenantId),
    getCurrentTenant: vi.fn(() => ({ id: testTenantId, name: 'Test Tenant' })),
    setCurrentTenant: vi.fn(),
}));

vi.mock('../src/services/auditService', () => ({
    logAuditEvent: vi.fn(),
    logPageEvent: vi.fn(),
    logNavEvent: vi.fn(),
    logMediaEvent: vi.fn(),
    logSettingEvent: vi.fn(),
    logFaqEvent: vi.fn(),
    logUserEvent: vi.fn(),
    getAuditLogs: vi.fn(),
}));

vi.mock('../src/services/cacheService', () => ({
    invalidateCmsCache: vi.fn(),
    cmsCache: {
        get: vi.fn(),
        set: vi.fn(),
        invalidate: vi.fn(),
        invalidateAll: vi.fn(),
    },
    cachedQuery: vi.fn((key, fetcher) => fetcher()),
}));

describe('Multi-Tenant Isolation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should filter pages by tenant_id', async () => {
        const { getPages } = await import('../src/services/pageService');
        const { insforge } = await import('../src/services/insforge');

        // Custom chain that records eq calls for tenant_id
        let eqTenantValue = '';
        const chain = {
            select: vi.fn(() => chain),
            order: vi.fn(() => chain),
            eq: vi.fn((f: string, v: string) => {
                if (f === 'tenant_id') eqTenantValue = v;
                return chain;
            }),
            then: customThen,
        };
        (insforge.database.from as any).mockReturnValue(chain);

        await getPages();

        expect(insforge.database.from).toHaveBeenCalledWith('site_pages');
        expect(eqTenantValue).toBe(testTenantId);
    });

    it('should still call getCurrentTenantId when tenant_id is null', async () => {
        const { getCurrentTenantId } = await import('../src/services/tenantService');
        (getCurrentTenantId as any).mockReturnValueOnce(null);

        const { getPages } = await import('../src/services/pageService');
        await getPages();

        expect(getCurrentTenantId).toHaveBeenCalled();
    });

    it('should include tenant_id when creating a page', async () => {
        const { createPage } = await import('../src/services/pageService');
        const { insforge } = await import('../src/services/insforge');

        let capturedInsertData: any = null;
        (insforge.database.from as any).mockImplementation((table: string) => {
            if (table === 'site_pages') {
                return {
                    insert: (data: any) => {
                        capturedInsertData = data;
                        return {
                            select: vi.fn(() => ({
                                single: vi.fn().mockResolvedValue({
                                    data: { id: 'new', ...data },
                                    error: null,
                                }),
                            })),
                        };
                    },
                };
            }
            return createMockQuery(null);
        });

        await createPage({ title: 'Test', slug: 'test' });
        expect(capturedInsertData).not.toBeNull();
        if (capturedInsertData) {
            expect(capturedInsertData.tenant_id).toBe(testTenantId);
        }
    });

    it('should include tenant_id when creating navigation', async () => {
        const { addNavItem } = await import('../src/services/navigationService');
        const { insforge } = await import('../src/services/insforge');

        let capturedData: any = null;
        (insforge.database.from as any).mockImplementation((table: string) => ({
            insert: (data: any) => {
                capturedData = data;
                return { select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: 'n1' }, error: null }) })) };
            },
        }));

        await addNavItem({ label: 'Home', url: '/' });
        expect(capturedData).not.toBeNull();
        if (capturedData) {
            expect(capturedData.tenant_id).toBe(testTenantId);
        }
    });

    it('should include tenant_id when creating FAQ items', async () => {
        const { addFaqItem } = await import('../src/services/faqService');
        const { insforge } = await import('../src/services/insforge');

        let capturedData: any = null;
        (insforge.database.from as any).mockImplementation((table: string) => ({
            insert: (data: any) => {
                capturedData = data;
                return { select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: 'f1' }, error: null }) })) };
            },
        }));

        await addFaqItem({ question: 'Test?', answer: 'Answer' });
        expect(capturedData).not.toBeNull();
        if (capturedData) {
            expect(capturedData.tenant_id).toBe(testTenantId);
        }
    });

    it('should include tenant_id when creating media', async () => {
        const { addMediaFile } = await import('../src/services/mediaService');
        const { insforge } = await import('../src/services/insforge');

        let capturedData: any = null;
        (insforge.database.from as any).mockImplementation((table: string) => ({
            insert: (data: any) => {
                capturedData = data;
                return { select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: 'm1' }, error: null }) })) };
            },
        }));

        await addMediaFile({ name: 'photo.jpg', url: 'https://example.com/photo.jpg' });
        expect(capturedData).not.toBeNull();
        if (capturedData) {
            expect(capturedData.tenant_id).toBe(testTenantId);
        }
    });

    it('should include tenant_id when creating settings', async () => {
        const { updateSetting } = await import('../src/services/settingsService');
        const { insforge } = await import('../src/services/insforge');

        let capturedUpsertData: any = null;
        (insforge.database.from as any).mockImplementation((table: string) => ({
            upsert: (data: any) => {
                capturedUpsertData = data;
                return { select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { key: 'site_name' }, error: null }) })) };
            },
        }));

        await updateSetting('site_name', 'New Name');
        expect(capturedUpsertData).not.toBeNull();
        if (capturedUpsertData) {
            expect(capturedUpsertData.tenant_id).toBe(testTenantId);
        }
    });

    it('should include tenant_id when creating revisions', async () => {
        const { addRevision } = await import('../src/services/revisionService');
        const { insforge } = await import('../src/services/insforge');

        let capturedData: any = null;
        (insforge.database.from as any).mockImplementation((table: string) => ({
            insert: (data: any) => {
                capturedData = data;
                return { select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: 'r1' }, error: null }) })) };
            },
        }));

        await addRevision({ entity_type: 'page', entity_id: 'p1' });
        expect(capturedData).not.toBeNull();
        if (capturedData) {
            expect(capturedData.tenant_id).toBe(testTenantId);
        }
    });

    it('should not leak data across tenants via deletion', async () => {
        const { deletePage } = await import('../src/services/pageService');
        const { insforge } = await import('../src/services/insforge');

        const eqCalls: string[] = [];
        // Build a chainable object for delete → eq → eq → select → single
        const chain = {
            eq: (field: string, value: string) => {
                eqCalls.push(`${field}=${value}`);
                return chain;
            },
            select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
        };
        (insforge.database.from as any).mockReturnValue({
            delete: vi.fn(() => chain),
        });

        await deletePage('page-123');
        expect(eqCalls).toContain('tenant_id=' + testTenantId);
        expect(eqCalls).toContain('id=page-123');
    });
});
