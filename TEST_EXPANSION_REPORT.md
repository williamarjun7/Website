# Test Expansion Report

## Suite Overview

| Suite | Tests | Runner | Status |
|---|---|---|---|
| Unit — Multi-tenant | 9 | Vitest | ✅ Pass |
| Unit — RBAC | 6 | Vitest | ✅ Pass |
| Unit — Cache | 9 | Vitest | ✅ Pass |
| E2E — Runtime audit | 12 | Playwright | ✅ Pass |
| E2E — Smoke | 13 | Playwright | ✅ Pass |
| E2E — Navigation | 12 | Playwright | ✅ Pass |
| **Total** | **61** | | ✅ |

## Unit Tests (24)

### Multi-tenant (`saas_multitenant.test.ts` — 9 tests)

| Test | What it verifies |
|---|---|
| filter pages by tenant_id | `getPages()` calls `.eq('tenant_id', tenantId)` |
| still call getCurrentTenantId when null | Service still invokes tenant context check |
| include tenant_id when creating a page | `createPage` inserts with tenant_id |
| include tenant_id when creating navigation | `addNavItem` inserts with tenant_id |
| include tenant_id when creating FAQ | `addFaqItem` inserts with tenant_id |
| include tenant_id when creating media | `addMediaFile` inserts with tenant_id |
| include tenant_id when creating settings | `updateSetting` upserts with tenant_id |
| include tenant_id when creating revisions | `addRevision` inserts with tenant_id |
| not leak data across tenants via deletion | `deletePage` chains tenant_id + id in eq |

### RBAC (`saas_rbac.test.ts` — 6 tests)

| Test | What it verifies |
|---|---|
| super_admin bypasses permission checks | Always returns `true` |
| admin has full page permissions | create, update, delete, publish all `true` |
| editor cannot delete/publish | create/read/update `true`; delete/publish `false` |
| viewer has read-only access | read `true` on all resources; write `false` |
| reject tenant management for non-super-admin | `admin` role → `false` for `tenant:manage` |
| clear permission cache | Second call hits DB after `clearPermissionCache()` |

### Cache (`saas_cache.test.ts` — 9 tests)

| Test | What it verifies |
|---|---|
| get returns undefined for missing key | Cache miss |
| set and get value | Basic round-trip |
| get returns undefined after TTL expires | Expiration |
| invalidate removes matching keys | Pattern invalidation |
| invalidateAll clears entire cache | Full flush |
| max entries evicts oldest | LRU-like eviction |
| cachedQuery caches result | Wrapper function |
| cachedQuery returns cached data on repeated calls | Cache hit |
| invalidateCmsCache clears CMS patterns | `cms:*` pattern |

## E2E Tests (37)

### Runtime Audit (`runtime-audit.spec.ts` — 12 tests)

- 6 public pages checked: no hardcoded Unsplash images at runtime
- 404 page rendering verified on `/nonexistent`
- 5 footer elements verified from DB data (address, phone, email)

### Smoke (`smoke.spec.ts` — 13 tests)

- 7 public pages load with HTTP 200
- 6 admin pages load with HTTP 200

### Navigation (`navigation.spec.ts` — 12 tests)

- 12 direct page navigations render expected content
