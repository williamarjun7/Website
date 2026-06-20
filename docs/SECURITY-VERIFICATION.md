# Security Verification Checklist — Highlands Cafe & Motel Inn

## Credential Exposure
- [x] `.env` is in `.gitignore`
- [x] `.env` is NOT tracked by git
- [x] `.env.local` is in `.gitignore`
- [x] `.env.local` is NOT tracked by git
- [x] `env.example` contains only placeholder values
- [x] No Fonepay credentials appear in source code (`FONEPAY_PG_MERCHANT_SECRET`, `FONEPAY_USERNAME`, `FONEPAY_PASSWORD`)
- [x] All edge functions read secrets via `Deno.env.get()` (never hardcoded)
- [x] `sync-integration.test.deno.ts` — hardcoded JWT moved to env var (`TEST_API_KEY`) with fallback
- [ ] ⚠️ Fonepay credentials in .env should be rotated (known credentials may have been exposed via git history)

## Data Isolation
- [x] Website DB (project `6aiag3ra`) and POS DB (project `8cvkfu8m`) are separate InsForge projects
- [x] No Web code access to: inventory, stock, suppliers, purchase orders, expenses, staff, payroll, accounting
- [x] All cross-project sync is via HMAC-protected webhooks (no direct DB access)
- [x] `sync_events` table has `service_role`-only RLS — blocked from anon/authenticated users
- [x] `idempotency_keys` table has `service_role`-only RLS
- [x] `sync_reconciliation_logs` table has `service_role`-only RLS

## API Security
- [x] HMAC-SHA256 signing for all webhook payloads (with ±5min timestamp tolerance)
- [x] Loop prevention at 3 layers: DB trigger, edge function, sender filter
- [x] Rate limiting on all edge functions (10-60 req/min per IP)
- [x] CORS origin whitelist on all edge functions
- [x] Zod validation on all API endpoints
- [x] Server-side price calculation (client-provided amounts ignored)
- [x] Content Security Policy headers in netlify.toml + vercel.json
- [x] Payment GET endpoint removed (410 Gone)
- [x] `SECURITY DEFINER` functions locked with `SET search_path = ''`

## Fonepay Payment Security
- [x] HMAC-SHA512 for Fonepay API requests/responses
- [x] Mandatory Fonepay response HMAC verification in reconciliation
- [x] Amount integrity check (Fonepay response amount vs DB amount)
- [x] Nonce replay protection (`used_nonces` table)
- [x] PRN uniqueness via `crypto.randomUUID()` + DB constraint
- [ ] ⚠️ `.env` file still present locally — ensure it is NOT shared or backed up

## Sync Security
- [x] Idempotency framework (crash-safe 3-phase: reserve → execute → complete)
- [x] Circuit breaker (3 failures → OPEN 60s → half-open → probe)
- [x] Dead-letter queue for failed sync events
- [x] Exponential backoff retry (5s → 15s → 30s → 60s → 120s)
- [x] POS rejection handling (409 → Website booking cancelled + refunded)
- [x] No auto-correct in reconciliation engine (detect + log only)

## Phase 1: Zero Double-Booking (20260621000000)
- [x] `btree_gist` extension enabled
- [x] `no_overlapping_active_bookings` EXCLUDE constraint on `bookings` (room_id + daterange)
- [x] `bookings_booking_status_check` — enum constraint on booking_status
- [x] `bookings_payment_status_check` — enum constraint on payment_status
- [x] TOCTOU removed from `create-booking/index.ts` — no more SELECT → INSERT race
- [x] TOCTOU removed from `booking-webhook/index.ts` — exclusion constraint catches conflicts
- [x] TOCTOU removed from `pos-sync-api/index.ts` — exclusion constraint catches conflicts
- [x] Error code `23P01` (exclusion_violation) → clean 409 response
- [x] `sync_events.event_type` CHECK fixed — added `booking_expired`, `booking_failed` (BUG FIX)
- [x] Concurrent tests: concurrent-double-booking.test.deno.ts (10 parallel, expect 1 success)

## Phase 2: Strict HMAC Validation
- [x] Startup check: `BOOKING_WEBHOOK_SECRET` missing → service refuses all requests
- [x] `X-Webhook-Signature` REQUIRED → missing = 401
- [x] `X-Timestamp` REQUIRED → missing = 401
- [x] `verifyHmac()` enforces ±5 minute timestamp tolerance
- [x] Invalid signature → 403
- [x] Stale timestamp (>5min) → 403
- [x] No lenient fallback paths (REMOVED)
- [x] Tests: strict-hmac.test.deno.ts (7 security tests)

## Phase 3: Auto-Healing Sync
- [x] `sync_repair_jobs` table — full audit trail with rollback SQL
- [x] Repair worker: `insforge/functions/auto-heal-repair/index.ts`
- [x] Dry-run mode via `x-repair-mode: dry_run` header
- [x] NEVER auto-fix: missing_booking, duplicate_booking, room_mismatch, orphaned_record
- [x] ALLOWED auto-fix: guest_name, guest_email, guest_phone, payment_status, booking_status, amounts, dates
- [x] `sync_reconciliation_logs` extended with `repair_job_id`, `auto_healable`, `auto_healed_at`
- [x] Deploy config: `insforge/functions/deploy/auto-heal-repair.ts`

## Phase 4: RLS Security Audit
- [x] Comprehensive test suite: rls-security-audit.test.deno.ts
- [x] Tests anon × all tables (SELECT, INSERT, UPDATE, DELETE)
- [x] Tests authenticated × all tables
- [x] Tests service_role × sync tables
- [x] `deny_all()` function for explicit RLS denial
- [x] REVOKE EXECUTE on all sync functions from anon/authenticated
- [x] Checks: 24 forbidden-table tests (4 ops × 8 tables × 2 roles)
- [x] CI integration: score ≥ 95% required to pass

## Phase 5: E2E QA Certification
- [x] Full test matrix: qa-certification.test.deno.ts
- [x] 12 dimensions: creation, double-booking, HMAC, loops, RLS, sync trigger, modification, cancellation, POS check-in/out, reconciliation, idempotency, dead-letter
- [x] Scoring: 0–100 with pass/fail matrix and evidence
- [x] Verdict: PRODUCTION READY ≥ 95%, READY WITH WARNINGS ≥ 80%, NOT READY < 80%

## Actions Required Before Production

1. **Rotate Fonepay credentials**: Change `FONEPAY_PG_MERCHANT_SECRET`, `FONEPAY_USERNAME`, `FONEPAY_PASSWORD` in the Fonepay merchant dashboard
2. **Deploy migration** `20260621000000_zero_double_booking_strict_hmac_auto_heal.sql` to Website DB
3. **Set InsForge secrets**: Configure all `Deno.env.get()` values as InsForge edge function secrets (not env vars)
4. **Deploy updated edge functions**: `create-booking`, `booking-webhook`, `pos-sync-api`, `reconcile-bookings`, `auto-heal-repair`
5. **Run certification suite**: `deno test --no-check --allow-net qa-certification.test.deno.ts`
6. **Enable branch protection**: Require PR reviews before merging to main
7. **Dependency audit**: Run `npm audit` and update any vulnerable dependencies
