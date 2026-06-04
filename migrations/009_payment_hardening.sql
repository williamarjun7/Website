-- Payment hardening: booking hold system, new statuses, reconciliation support.
-- Applied after 008_cleanup_unused_tables.sql.

-- ── 1. Extend booking_status CHECK constraint ──────────────────────────
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_booking_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_booking_status_check
  CHECK (booking_status IN (
    'pending_payment', 'confirmed', 'paid', 'failed', 'expired',
    'cancelled', 'checked_in', 'checked_out'
  ));

-- ── 2. Columns for hold/reconciliation ─────────────────────────────────
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS hold_expires_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS active_prn TEXT;

-- ── 3. Payments: add Fonepay trace columns ─────────────────────────────
ALTER TABLE payments ADD COLUMN IF NOT EXISTS fonepay_trace_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_reference TEXT;

-- Partial unique index: only non-null fonepay_trace_id values are unique.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_fonepay_trace_id
  ON payments(fonepay_trace_id) WHERE fonepay_trace_id IS NOT NULL;

-- ── 4. Index for scheduled reconciliation ──────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bookings_pending_payment_hold
  ON bookings(hold_expires_at)
  WHERE booking_status = 'pending_payment';

-- ── 5. Ensure payment_events.event_type covers new types ───────────────
-- (dropped strict CHECK in 008; keep permissive to avoid migration pain)
-- No-op if already permissive.

-- ── 6. Atomic booking payment confirmation (transaction-safe) ──────────
-- Called by fonepay-payment and payment-reconciliation edge functions.
-- Wraps payment update + booking confirm + hold release in a single transaction.
CREATE OR REPLACE FUNCTION confirm_booking_payment(
  p_payment_id UUID,
  p_booking_id UUID,
  p_prn TEXT,
  p_amount NUMERIC(10,2),
  p_fonepay_trace_id TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_payment_status TEXT;
  v_booking_status TEXT;
  v_booking_payment_status TEXT;
  v_result JSONB;
BEGIN
  -- Lock the payment row to prevent concurrent updates
  SELECT status INTO v_payment_status
  FROM payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false, 'message', 'Payment record not found', 'code', 'NOT_FOUND'
    );
  END IF;

  -- Idempotency: already completed
  IF v_payment_status = 'completed' THEN
    RETURN jsonb_build_object(
      'success', true, 'message', 'Payment already processed', 'code', 'IDEMPOTENT'
    );
  END IF;

  -- Must be pending
  IF v_payment_status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', false, 'message', 'Payment cannot be processed (status: ' || v_payment_status || ')',
      'code', 'INVALID_STATE'
    );
  END IF;

  -- Lock the booking row
  SELECT booking_status, payment_status INTO v_booking_status, v_booking_payment_status
  FROM bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false, 'message', 'Booking not found', 'code', 'NOT_FOUND'
    );
  END IF;

  -- Booking must be in pending_payment with pending payment
  IF v_booking_status != 'pending_payment' OR v_booking_payment_status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', false, 'message',
      'Booking cannot be confirmed (status: ' || v_booking_status || ', payment: ' || v_booking_payment_status || ')',
      'code', 'INVALID_STATE'
    );
  END IF;

  -- Amount integrity check against the stored booking amount
  IF p_amount IS NOT NULL AND p_amount > 0 THEN
    IF (SELECT total_price FROM bookings WHERE id = p_booking_id) != p_amount THEN
      RETURN jsonb_build_object(
        'success', false, 'message', 'Payment amount mismatch', 'code', 'AMOUNT_MISMATCH'
      );
    END IF;
  END IF;

  -- All checks passed — execute the atomic update
  UPDATE payments
  SET
    status = 'completed',
    verified_at = now(),
    fonepay_trace_id = COALESCE(NULLIF(p_fonepay_trace_id, ''), fonepay_trace_id),
    updated_at = now()
  WHERE id = p_payment_id;

  UPDATE bookings
  SET
    payment_status = 'paid',
    booking_status = 'confirmed',
    hold_expires_at = NULL,
    active_prn = NULL
  WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'success', true, 'message', 'Payment confirmed and booking updated', 'code', 'SUCCESS'
  );
END;
$$;
