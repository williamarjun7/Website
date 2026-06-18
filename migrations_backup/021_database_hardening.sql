-- Migration 021: Database hardening for payment reliability
-- Applied after 020_fix_confirm_booking_payment_rpc.sql
--
-- Changes:
-- 1. Partial unique index: prevent duplicate pending payments per booking (C-1)
-- 2. Indexes for reconciliation query (C-2)
-- 3. tax_refund_submitted_at + tax_refund_response for idempotency (M-1)
-- 4. Missing indexes for payments lookup
-- 5. Extend payment_events event_type CHECK for new event types (Task 9)

-- ── 1. Prevent duplicate pending payments per booking ───────────────────────
-- Only one pending payment per booking at a time. Once completed/failed/refunded,
-- another can be created.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_one_pending_per_booking
  ON payments(booking_id) WHERE status = 'pending';

-- ── 2. Index for reconciliation: find old pending payments efficiently ──────
CREATE INDEX IF NOT EXISTS idx_payments_pending_created
  ON payments(created_at) WHERE status = 'pending';

-- ── 3. Tax refund idempotency columns ───────────────────────────────────────
ALTER TABLE payments ADD COLUMN IF NOT EXISTS tax_refund_submitted_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS tax_refund_response JSONB;

-- ── 4. Missing indexes ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_payments_booking_id_status
  ON payments(booking_id, status);

CREATE INDEX IF NOT EXISTS idx_payments_status
  ON payments(status);

-- ── 5. Extend payment_events event_type for observability (Task 9) ─────────
ALTER TABLE payment_events DROP CONSTRAINT IF EXISTS payment_events_event_type_check;
ALTER TABLE payment_events ADD CONSTRAINT payment_events_event_type_check
  CHECK (event_type IN (
    'payment_initiated',
    'payment_completed',
    'payment_failed',
    'payment_verified',
    'payment_reconciled',
    'status_change_attempt',
    'idempotency_hit',
    'amount_mismatch',
    'replay_attempt',
    'qr_created',
    'qr_reused',
    'booking_confirmed',
    'tax_refund_submitted',
    'tax_refund_failed'
  ));

-- ── 6. Fonepay trace ID index improvements ─────────────────────────────────
DROP INDEX IF EXISTS idx_payments_fonepay_trace_id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_fonepay_trace_id
  ON payments(fonepay_trace_id) WHERE fonepay_trace_id IS NOT NULL AND fonepay_trace_id != '';

SELECT 'Migration 021 applied successfully' AS status;
