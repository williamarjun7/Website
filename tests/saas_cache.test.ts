import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cmsCache, cachedQuery, invalidateCmsCache } from '../src/services/cacheService';

describe('CMS Cache Service', () => {
    beforeEach(() => {
        cmsCache.invalidateAll();
    });

    it('should store and retrieve values', () => {
        cmsCache.set('page:home', { title: 'Home' });
        expect(cmsCache.get('page:home')).toEqual({ title: 'Home' });
    });

    it('should return null for expired entries', async () => {
        cmsCache.set('page:about', { title: 'About' }, 1);
        await new Promise(r => setTimeout(r, 10));
        expect(cmsCache.get('page:about')).toBeNull();
    });

    it('should invalidate by pattern', () => {
        cmsCache.set('page:home', { title: 'Home' });
        cmsCache.set('page:about', { title: 'About' });
        cmsCache.set('nav:main', { items: [] });
        cmsCache.invalidate('page');
        expect(cmsCache.get('page:home')).toBeNull();
        expect(cmsCache.get('page:about')).toBeNull();
        expect(cmsCache.get('nav:main')).toBeDefined();
    });

    it('should invalidate all entries', () => {
        cmsCache.set('page:home', { title: 'Home' });
        cmsCache.set('nav:main', { items: [] });
        cmsCache.invalidateAll();
        expect(cmsCache.size).toBe(0);
    });

    it('should enforce max entries', () => {
        const smallCache = new (cmsCache.constructor as any)(3, 60000);
        smallCache.set('a', 1);
        smallCache.set('b', 2);
        smallCache.set('c', 3);
        smallCache.set('d', 4);
        expect(smallCache.size <= 3).toBe(true);
    });

    it('should use cachedQuery to wrap fetchers', async () => {
        const fetcher = vi.fn().mockResolvedValue({ data: { id: 1 }, error: null });
        const result1 = await cachedQuery('test-key', fetcher);
        expect(result1.data).toEqual({ id: 1 });
        const result2 = await cachedQuery('test-key', fetcher);
        expect(fetcher).toHaveBeenCalledTimes(1);
        expect(result2.data).toEqual({ id: 1 });
    });

    it('should skip cache when fetcher returns error', async () => {
        const fetcher = vi.fn().mockResolvedValue({ data: null, error: 'fail' });
        const result = await cachedQuery('error-key', fetcher);
        expect(result.error).toBe('fail');
        const cached = cmsCache.get('error-key');
        expect(cached).toBeNull();
    });

    it('should invalidate specific entity type', () => {
        cmsCache.set('page:home', {});
        cmsCache.set('page:about', {});
        cmsCache.set('media:logo', {});
        invalidateCmsCache('page');
        expect(cmsCache.get('page:home')).toBeNull();
        expect(cmsCache.get('page:about')).toBeNull();
        expect(cmsCache.get('media:logo')).toBeDefined();
    });

    it('should invalidate all when no entity type given', () => {
        cmsCache.set('page:home', {});
        cmsCache.set('media:logo', {});
        invalidateCmsCache();
        expect(cmsCache.size).toBe(0);
    });
});
