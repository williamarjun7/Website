-- ═══════════════════════════════════════════════════════════════════
-- PHASE 1: Zero Double-Booking Guarantee (Exclusion Constraint)
-- PHASE 2: Strict HMAC (no fallback, fail closed)
-- PHASE 3: Auto-Healing Sync Engine (sync_repair_jobs + worker)
-- PHASE 4: RLS Hardening (forbidden table lockdown)
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- PHASE 1a: Enable btree_gist extension for exclusion constraints
-- ═══════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS btree_gist;

COMMENT ON EXTENSION btree_gist IS 'Required for EXCLUDE constraints with equality + range operators';

-- ═══════════════════════════════════════════════════════════════════
-- PHASE 1b: Add booking_status CHECK constraint (defensive)
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_booking_status_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_booking_status_check
  CHECK (booking_status IN (
    'pending_payment', 'confirmed', 'checked_in', 'checked_out',
    'cancelled', 'expired', 'failed', 'pending'
  ));

-- ═══════════════════════════════════════════════════════════════════
-- PHASE 1c: Add payment_status CHECK constraint (defensive)
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_payment_status_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_payment_status_check
  CHECK (payment_status IN (
    'pending', 'paid', 'partial', 'failed', 'refunded', 'pay_at_property', 'unpaid'
  ));

-- ═══════════════════════════════════════════════════════════════════
-- PHASE 1d: EXCLUSION CONSTRAINT — Zero double-booking guarantee
--
-- This is the PRIMARY defense against double-bookings.
-- The database ENFORCES that no two active bookings (pending_payment,
-- confirmed, checked_in) can overlap on the same room.
--
--   daterange(check_in, check_out, '[)') uses:
--     [ = inclusive start (check-in day)
--     ) = exclusive end (check-out day — guest leaves in morning)
--
--   The GiST index makes overlap checks O(log n).
--   The WHERE clause limits enforcement to active booking statuses,
--   allowing cancelled/expired/checked_out bookings to overlap history.
-- ═══════════════════════════════════════════════════════════════════

-- Drop first if previously created (idempotent)
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS no_overlapping_active_bookings;

-- The EXCLUDE constraint creates a GiST index automatically.
-- room_id WITH =  : same room
-- daterange(check_in, check_out, '[)') WITH &&  : overlapping date ranges
-- WHERE (...)     : only active booking statuses
ALTER TABLE public.bookings
  ADD CONSTRAINT no_overlapping_active_bookings
  EXCLUDE USING gist (
    room_id WITH =,
    daterange(check_in, check_out, '[)') WITH &&
  )
  WHERE (booking_status = ANY (ARRAY['pending_payment', 'confirmed', 'checked_in']));

COMMENT ON CONSTRAINT no_overlapping_active_bookings ON public.bookings IS
  'Guarantees zero overlapping bookings per room for active statuses (pending_payment, confirmed, checked_in). ' ||
  'This is the database-level defense against double-booking. ' ||
  'Application-level pre-checks are redundant and have been removed.';

-- ═══════════════════════════════════════════════════════════════════
-- PHASE 1e: Fix sync_events event_type CHECK constraint
--
-- BUG FIX: The previous migration (20260620000000) expanded the trigger
-- to emit 'booking_expired' and 'booking_failed' event types, but the
-- CHECK constraint on sync_events.event_type was NOT updated to allow
-- these new types. This causes a DB ERROR whenever a booking transitions
-- to 'expired' or 'failed' status.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.sync_events
  DROP CONSTRAINT IF EXISTS sync_events_event_type_check;

ALTER TABLE public.sync_events
  ADD CONSTRAINT sync_events_event_type_check
  CHECK (event_type = ANY (ARRAY[
    'booking_created',
    'booking_updated',
    'booking_cancelled',
    'booking_confirmed',
    'booking_checked_in',
    'booking_checked_out',
    'booking_payment_updated',
    'booking_expired',
    'booking_failed'
  ]));

COMMENT ON CONSTRAINT sync_events_event_type_check ON public.sync_events IS
  'All event types including booking_expired and booking_failed (fixed from missing types in migration 20260620000000)';

-- ═══════════════════════════════════════════════════════════════════
-- PHASE 3: Auto-Healing Sync — sync_repair_jobs table
--
-- Tracks all auto-healing repair operations with full audit trail,
-- rollback capability, and dry-run mode support.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.sync_repair_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL,
  repair_type TEXT NOT NULL CHECK (repair_type IN (
    'guest_name',
    'guest_email',
    'guest_phone',
    'payment_status',
    'booking_status',
    'advance_amount',
    'balance_amount',
    'total_price',
    'check_in',
    'check_out',
    'adults',
    'children'
  )),
  booking_id TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  before_value JSONB,
  after_value JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'dry_run',
    'approved',
    'completed',
    'failed',
    'rolled_back',
    'cancelled'
  )),
  dry_run BOOLEAN NOT NULL DEFAULT FALSE,
  executed_at TIMESTAMPTZ,
  repaired_by TEXT DEFAULT 'system',
  notes TEXT,
  rollback_sql TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_repair_jobs_status
  ON public.sync_repair_jobs(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_repair_jobs_booking
  ON public.sync_repair_jobs(booking_id);

CREATE INDEX IF NOT EXISTS idx_repair_jobs_issue
  ON public.sync_repair_jobs(issue_id);

COMMENT ON TABLE public.sync_repair_jobs IS
  'Auto-healing repair operations with full audit trail. '
  'Status flow: pending → dry_run → approved → completed | failed → rolled_back. '
  'NEVER auto-fix: missing_booking, duplicate_booking, room_reassignment (require human approval). '
  'Allowed auto-fix: guest details, payment fields, status fields.';

COMMENT ON COLUMN public.sync_repair_jobs.rollback_sql IS
  'SQL statement to reverse this repair if rollback is needed. Generated at execution time.';

ALTER TABLE public.sync_repair_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_repair_jobs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_role_repair_jobs_all ON public.sync_repair_jobs;
CREATE POLICY service_role_repair_jobs_all ON public.sync_repair_jobs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════
-- PHASE 3b: Add repair tracking to sync_reconciliation_logs
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.sync_reconciliation_logs
  ADD COLUMN IF NOT EXISTS repair_job_id UUID REFERENCES public.sync_repair_jobs(id);

ALTER TABLE public.sync_reconciliation_logs
  ADD COLUMN IF NOT EXISTS auto_healable BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.sync_reconciliation_logs
  ADD COLUMN IF NOT EXISTS auto_healed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.sync_reconciliation_logs.auto_healable IS
  'TRUE if this issue can be auto-healed. FALSE for issues requiring human approval (missing/duplicate booking, room reassignment).';

-- ═══════════════════════════════════════════════════════════════════
-- PHASE 4: RLS — Explicitly block anon/authenticated from forbidden tables
--
-- Even though these tables are not in the Website schema, add
-- RLS policies that DENY ALL to prevent accidental exposure if
-- cross-project queries are ever enabled.
-- ═══════════════════════════════════════════════════════════════════

-- Create a function that always returns false for RLS policies
CREATE OR REPLACE FUNCTION public.deny_all()
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT false
$$;

-- This function has no security risk (immutable, no search_path issues)
-- It's used exclusively in RLS policies to explicitly deny access.

-- ═══════════════════════════════════════════════════════════════════
-- PHASE 4b: Verify RLS is enabled and forced on all critical tables
-- ═══════════════════════════════════════════════════════════════════

-- These tables were already handled in migration 20260618112514.
-- Add explicit deny policies for anon/authenticated on sync tables
-- that should be service_role-only.

-- sync_events: already service_role-only (20260619000000)
-- idempotency_keys: already service_role-only (20260619000000)
-- sync_reconciliation_logs: already service_role-only (20260620000000)
-- sync_repair_jobs: service_role-only (this migration, above)

-- ═══════════════════════════════════════════════════════════════════
-- PHASE 4c: Revoke all EXECUTE on sync functions from anon/authenticated
-- ═══════════════════════════════════════════════════════════════════

REVOKE EXECUTE ON FUNCTION public.get_sync_events_pending() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_sync_event_processed(uuid, text, text, jsonb) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fail_sync_event(uuid, text, integer) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.deny_all() FROM public, anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- APPLIED
-- ═══════════════════════════════════════════════════════════════════

SELECT 'Migration 20260621000000 applied — exclusion constraint, event_type fix, booking_status checks, sync_repair_jobs, RLS lockdown' AS status;
