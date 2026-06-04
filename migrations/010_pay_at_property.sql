-- Pay at Property: advance_amount (60%) and balance_amount (40%) support.
-- Applied after 009_payment_hardening.sql.

-- ── 1. Add advance_amount and balance_amount columns ───────────────────
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS advance_amount NUMERIC(10,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS balance_amount NUMERIC(10,2);

-- ── 2. Update the booking_status CHECK constraint to include pay_at_property_confirmed ──
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_booking_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_booking_status_check
  CHECK (booking_status IN (
    'pending_payment', 'confirmed', 'paid', 'failed', 'expired',
    'cancelled', 'checked_in', 'checked_out'
  ));

-- ── 3. Extend payment_status to support partial statuses ─────────────────
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_payment_status_check
  CHECK (payment_status IN (
    'pending', 'paid', 'failed', 'pay_at_property'
  ));

-- ── 4. Update confirm_booking_payment to support partial (60%) payments ──
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
  v_booking_total NUMERIC(10,2);
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
  SELECT booking_status, payment_status, total_price
    INTO v_booking_status, v_booking_payment_status, v_booking_total
  FROM bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false, 'message', 'Booking not found', 'code', 'NOT_FOUND'
    );
  END IF;

  -- Booking must be in pending_payment with pending or pay_at_property payment status
  IF v_booking_status != 'pending_payment' OR v_booking_payment_status NOT IN ('pending', 'pay_at_property') THEN
    RETURN jsonb_build_object(
      'success', false, 'message',
      'Booking cannot be confirmed (status: ' || v_booking_status || ', payment: ' || v_booking_payment_status || ')',
      'code', 'INVALID_STATE'
    );
  END IF;

  -- Amount integrity check
  IF p_amount IS NOT NULL AND p_amount > 0 THEN
    IF p_amount > v_booking_total THEN
      RETURN jsonb_build_object(
        'success', false, 'message', 'Payment amount exceeds booking total', 'code', 'AMOUNT_MISMATCH'
      );
    END IF;
  END IF;

  -- Determine if this is a partial payment (pay_at_property with 60% advance)
  -- If payment amount < total_price, it's a partial (advance) payment
  -- If payment amount >= total_price, it's a full payment
  DECLARE
    v_is_partial BOOLEAN;
  BEGIN
    v_is_partial := (p_amount < v_booking_total);

    -- All checks passed — execute the atomic update
    UPDATE payments
    SET
      status = 'completed',
      verified_at = now(),
      fonepay_trace_id = COALESCE(NULLIF(p_fonepay_trace_id, ''), fonepay_trace_id),
      updated_at = now()
    WHERE id = p_payment_id;

    IF v_is_partial THEN
      -- Partial payment: keep payment_status as 'pay_at_property', confirm booking
      UPDATE bookings
      SET
        payment_status = 'pay_at_property',
        booking_status = 'confirmed',
        hold_expires_at = NULL,
        active_prn = NULL
      WHERE id = p_booking_id;
    ELSE
      -- Full payment: mark as paid
      UPDATE bookings
      SET
        payment_status = 'paid',
        booking_status = 'confirmed',
        hold_expires_at = NULL,
        active_prn = NULL
      WHERE id = p_booking_id;
    END IF;
  END;

  RETURN jsonb_build_object(
    'success', true, 'message', 'Payment confirmed and booking updated', 'code', 'SUCCESS'
  );
END;
$$;
