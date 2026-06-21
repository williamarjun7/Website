# SaaS Architecture

## Overview

Multi-tenant CMS built on InsForge (BaaS), React with TypeScript, and Vite. Every customer-facing element traces to the database — no hardcoded content.

## Tenant Model

| Concept | Implementation |
|---|---|
| **Tenant resolution** | `tenantService.getCurrentTenantId()` via `TenantProvider` context |
| **Isolation** | Service-layer `WHERE tenant_id = ?` on all queries + DB RLS policies |
| **Seed tenant** | `tenant-highlands` (id `a1b2c3d4-e5f6-7890-abcd-ef1234567890`) |

All 6 CMS tables (`site_pages`, `site_navigation`, `faq_items`, `site_settings`, `content_revisions`, `media_files`) carry a `tenant_id` FK. `site_settings` and `site_pages` use composite unique constraints to prevent cross-tenant collisions.

## Service Layer

| Service | File | Responsibility |
|---|---|---|
| `pageService` | `src/services/pageService.ts` | Page CRUD, publish workflow, tenant filter |
| `settingsService` | `src/services/settingsService.ts` | Key-value settings with `(tenant_id, key)` PK |
| `navigationService` | `src/services/navigationService.ts` | Nav items, ordering, visible toggles |
| `faqService` | `src/services/faqService.ts` | FAQ CRUD, ordering, publish toggle |
| `revisionService` | `src/services/revisionService.ts` | Entity revision history, state tracking |
| `mediaService` | `src/services/mediaService.ts` | File upload, metadata, versioning |
| `tenantService` | `src/services/tenantService.ts` | Tenant CRUD, context, hostname resolution |
| `rbacService` | `src/services/rbacService.ts` | Role/permission checks, admin profiles |
| `cacheService` | `src/services/cacheService.ts` | In-memory TTL cache, pattern invalidation |
| `auditService` | `src/services/auditService.ts` | Structured audit logging, resource helpers |
| `storageService` | `src/services/storageService.ts` | File validation, CDN abstraction, provider switching |

## Auth & RBAC

### Roles

| Role | Scope |
|---|---|
| `super_admin` | Global — bypasses all permission checks, can manage tenants |
| `admin` | Per-tenant — full CRUD on all CMS resources |
| `editor` | Per-tenant — create/read/update pages, nav, FAQ; no delete/publish |
| `viewer` | Per-tenant — read-only access to all CMS resources |

### Permission Cache

`rbacService.checkPermission()` caches results in a `Map<role:resource:action, boolean>`. Cache is invalidated by `clearPermissionCache()` (called on auth check in `AdminGate`). After `clearAllMocks` or session changes, the first call per permission hits the DB; subsequent calls are instant.

### UI Enforcement

- `PermissionGuard` component: hides children unless `can()`
- `PermissionButton` component: disables + tooltip unless `can()`
- `AdminLayout`: sidebar nav items filtered through `can()`
- `AdminGate`: triggers `refreshPermissions()` on mount after auth

## Data Flow

```
React Component → Service → getCurrentTenantId()
                          → insforge.database.from(table)
                              .select('*')
                              .eq('tenant_id', tenantId)
                              [... additional filters]
                              .single() | no single

Service returns { data, error }
Component renders data or error state
```

## Caching

`CacheService` in `cacheService.ts`:

| Feature | Detail |
|---|---|
| **Storage** | In-memory `Map<string, { value, expiresAt }>` |
| **TTL** | Configurable per entry (default 5 min) |
| **Max entries** | Configurable ceiling (default 500) |
| **Pattern invalidation** | `invalidate(keyPattern)` — matches by prefix |
| **cachedQuery** | Wraps `async` fetcher: `cachedQuery('key', fetcher)` |

All mutation services call `invalidateCmsCache(tableName)` after successful writes.

## Audit Logging

`auditService.logAuditEvent()` is fire-and-forget (no `await` on the UI thread). Structured JSONB payload with:

| Field | Description |
|---|---|
| `tenant_id` | Scoped to tenant |
| `user_id` | Admin who performed action |
| `action` | `create \| update \| delete \| publish \| login \| logout` |
| `resource` | `page \| nav \| faq \| media \| setting \| user \| tenant` |
| `details` | JSONB — arbitrary context |
| `ip_address` | Optional request source |

## Mutli-tenant Hostname Resolution

`tenantService.resolveTenantFromHostname()` maps `hostname → tenant`. Not yet wired into routing layer — requires Vite/nginx config for subdomain routing.

## Test Configuration

| Test file | Tests | What it verifies |
|---|---|---|
| `tests/saas_multitenant.test.ts` | 9 | Tenant ID included in all CRUD, deletion scoping |
| `tests/saas_rbac.test.ts` | 6 | Permission checks, role enforcement, cache clearing |
| `tests/saas_cache.test.ts` | 9 | Cache TTL, pattern invalidation, eviction |

All 24 tests pass. TypeScript build: zero errors.
