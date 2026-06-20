# Deployment Guide — All-Fields Sync + Payment Fields + Reconciliation

## Prerequisites
- InsForge CLI installed and authenticated
- Access to both projects: Website (`6aiag3ra`) and POS (`8cvkfu8m`)
- Fonepay dashboard credentials for rotation
- `.env` file with all required secrets (see `env.example`)

---

## Step 1 — Rotate Fonepay Credentials (PRE-DEPLOY)

1. Log into Fonepay merchant dashboard
2. Rotate `FONEPAY_PG_MERCHANT_SECRET`, `FONEPAY_USERNAME`, `FONEPAY_PASSWORD`
3. Update `FONEPAY_PG_CALLBACK_URL` if domain changed
4. Update `.env` with new credentials

## Step 2 — Deploy Database Migration

```bash
# Apply migration to Website database (6aiag3ra)
insforge db execute migrations/20260620000000_all_fields_sync_reconciliation.sql \
  --project 6aiag3ra
```

This creates:
- Replaced `emit_booking_sync_event_v2()` trigger function (12-field payload + dedup)
- `sync_reconciliation_logs` table (service_role RLS)
- Updated `get_sync_events_pending()` with `FOR UPDATE SKIP LOCKED`

## Step 3 — Set Edge Function Secrets

```bash
# For each edge function, set required secrets
insforge secrets set FONEPAY_PG_MERCHANT_SECRET "<value>" --project 6aiag3ra
insforge secrets set FONEPAY_PG_MERCHANT_CODE "<value>" --project 6aiag3ra
insforge secrets set FONEPAY_PG_URL "<value>" --project 6aiag3ra
insforge secrets set FONEPAY_PG_CALLBACK_URL "<value>" --project 6aiag3ra
insforge secrets set FONEPAY_MERCHANT_BASE "<value>" --project 6aiag3ra
insforge secrets set FONEPAY_CLIENT_BASE "<value>" --project 6aiag3ra
insforge secrets set FONEPAY_USERNAME "<value>" --project 6aiag3ra
insforge secrets set FONEPAY_PASSWORD "<value>" --project 6aiag3ra
insforge secrets set SUPABASE_SERVICE_ROLE_KEY "<value>" --project 6aiag3ra
insforge secrets set RESEND_API_KEY "<value>" --project 6aiag3ra
insforge secrets set CLIENT_URL "<value>" --project 6aiag3ra
insforge secrets set POS_WEBHOOK_URL "<value>" --project 6aiag3ra
insforge secrets set POS_WEBHOOK_SECRET "<value>" --project 6aiag3ra
insforge secrets set BOOKING_WEBHOOK_SECRET "<value>" --project 6aiag3ra
```

## Step 4 — Deploy Updated Edge Functions

```bash
# Deploy all updated edge functions
insforge functions deploy sync-webhook-sender --project 6aiag3ra
insforge functions deploy booking-webhook --project 6aiag3ra
insforge functions deploy pos-sync-api --project 6aiag3ra
```

## Step 5 — Deploy & Schedule Reconciliation Engine

```bash
# Deploy with schedule trigger
insforge functions deploy reconcile-bookings \
  --project 6aiag3ra \
  --trigger-type schedule \
  --schedule "*/15 * * * *"
```

Alternatively, use cron-job.org:
1. Create a job calling `POST /functions/reconcile-bookings`
2. Set schedule to `*/15 * * * *`
3. Add header `x-reconcile-key: <RECONCILE_API_KEY>` (if configured)

## Step 6 — Verify Deployment

```bash
# 1. Run integration tests
deno test --no-check --allow-net --allow-env sync-integration.test.deno.ts

# 2. Create a manual booking on the Website
# 3. Check sync_events table for the booking event
# 4. Modify guest_name, guest_email, or guest_phone on the booking
# 5. Verify a second sync_event is generated
# 6. Trigger reconcile-bookings and check logs
```

## Step 7 — Monitor

- Monitor `sync_reconciliation_logs` for drift entries
- Monitor `sync_events` for delivery failures
- Check circuit breaker status (3 failures → auto-pause 60s)

## Rollback

```bash
# Rollback migration
insforge db execute "DROP TABLE IF EXISTS sync_reconciliation_logs; DROP FUNCTION IF EXISTS get_sync_events_pending();" --project 6aiag3ra

# Deploy previous function versions
insforge functions deploy sync-webhook-sender:v1 --project 6aiag3ra
```

## Post-Deploy Verification Checklist

- [ ] Fonepay credentials rotated
- [ ] Migration applied to Website DB
- [ ] Edge function secrets set (all 15)
- [ ] `sync-webhook-sender` deployed
- [ ] `booking-webhook` deployed
- [ ] `pos-sync-api` deployed
- [ ] `reconcile-bookings` deployed + scheduled
- [ ] Integration tests pass
- [ ] Manual booking creates sync event
- [ ] Guest info change creates second sync event
- [ ] Reconciliation runs with zero false positives
- [ ] Circuit breaker healthy
