# Security Audit

## Tenant Isolation

| Layer | Mechanism | Status |
|---|---|---|
| **Service layer** | All queries include `WHERE tenant_id = ?` via `getCurrentTenantId()` | ✅ |
| **Database RLS** | Row-level security policies on all 6 CMS tables | ✅ |
| **Composite unique** | `site_pages(tenant_id, slug)`, `site_settings(tenant_id, key)` | ✅ |
| **Deletion scoping** | `deletePage` chains `.eq('tenant_id', tenant).eq('id', id)` — verified by test | ✅ |

## RBAC

| Principle | Implementation | Status |
|---|---|---|
| **Least privilege** | Viewer=read only, Editor=no delete/publish, Admin=full (tenant), Super Admin=global | ✅ |
| **Defense in depth** | UI guards (components) + service layer (RLS) | ✅ |
| **Permission cache** | Cleared on auth refresh via `AdminGate` | ✅ |
| **Tenant management** | Only `super_admin` can manage tenants | ✅ |

## Authentication

| Concern | Implementation |
|---|---|
| **Session** | InsForge JWT-based auth via `authService.ts` |
| **Admin profile** | Links user → tenant via `admin_profiles` table |
| **Permission state** | `PermissionProvider` context — refreshed on login |

## Storage Security

| Concern | Implementation |
|---|---|
| **File validation** | `storageService.validateFile()` checks type + size before upload |
| **Image validation** | `validateImageDimensions()` limits max width/height |
| **Provider abstraction** | CDN-ready: switch providers via `VITE_STORAGE_PROVIDER` without code changes |

## Audit Trail

| Concern | Implementation |
|---|---|
| **All mutations logged** | Create, update, delete, publish — all recorded in `audit_logs` |
| **Resource granularity** | Page, nav, FAQ, media, settings, user, tenant |
| **IP capture** | `ip_address` field available for request-level attribution |

## Data Protection

| Concern | Implementation |
|---|---|
| **No hardcoded content** | All customer-facing elements trace to DB — verified by runtime Playwright audit (12 tests) |
| **No secrets in code** | API keys via `VITE_INSFORGE_ANON_KEY` env vars only |
| **Input validation** | TypeScript types + service-level field checks |

## Findings

| ID | Severity | Finding | Recommendation |
|---|---|---|---|
| SEC-001 | Low | Tenant hostname resolution not wired to routing | Configure subdomain → tenant mapping in Vite/nginx |
| SEC-002 | Low | No rate limiting on auth endpoints | Add InsForge function rate limiting or Cloudflare WAF |
