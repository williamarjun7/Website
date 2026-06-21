interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

type CacheKey = string;

class CacheService {
    private store = new Map<CacheKey, CacheEntry<unknown>>();
    private maxEntries: number;
    private defaultTtlMs: number;

    constructor(maxEntries = 500, defaultTtlMs = 300000) {
        this.maxEntries = maxEntries;
        this.defaultTtlMs = defaultTtlMs;
    }

    get<T>(key: CacheKey): T | null {
        const entry = this.store.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return null;
        }
        return entry.data as T;
    }

    set<T>(key: CacheKey, data: T, ttlMs?: number): void {
        if (this.store.size >= this.maxEntries) {
            const oldest = this.store.keys().next().value;
            if (oldest) this.store.delete(oldest);
        }
        this.store.set(key, {
            data,
            expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
        });
    }

    invalidate(pattern?: string): void {
        if (!pattern) {
            this.store.clear();
            return;
        }
        for (const key of this.store.keys()) {
            if (key.startsWith(pattern)) {
                this.store.delete(key);
            }
        }
    }

    invalidateAll(): void {
        this.store.clear();
    }

    get size(): number {
        return this.store.size;
    }
}

export const cmsCache = new CacheService(500, 300000);

export const cachedQuery = async <T>(
    cacheKey: string,
    fetcher: () => Promise<{ data: T | null; error: string | null }>,
    ttlMs?: number
): Promise<{ data: T | null; error: string | null }> => {
    const cached = cmsCache.get<T>(cacheKey);
    if (cached !== null) return { data: cached, error: null };
    const result = await fetcher();
    if (result.data !== null && !result.error) {
        cmsCache.set(cacheKey, result.data, ttlMs);
    }
    return result;
};

export const invalidateCmsCache = (entityType?: string) => {
    if (entityType) {
        cmsCache.invalidate(entityType);
    } else {
        cmsCache.invalidateAll();
    }
};
