-- Migration 020: Fix confirm_booking_payment to use payment.amount (stored at QR time)
-- rather than total_price from bookings. Prevents TOCTOU race if booking price
-- changes between QR generation and payment verification.
--
-- Also fixes: accepts pay_at_property partial payments correctly.
-- Replaces the v010 version that compared against total_price.

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

  -- Amount check: p_amount must NOT exceed booking total_price
  -- p_amount is the payment record's stored amount (set at QR generation time)
  -- This allows advance payments (p_amount < total_price) for pay_at_property
  IF p_amount IS NOT NULL AND p_amount > 0 THEN
    IF p_amount > v_booking_total THEN
      RETURN jsonb_build_object(
        'success', false, 'message', 'Payment amount exceeds booking total', 'code', 'AMOUNT_MISMATCH'
      );
    END IF;
  END IF;

  DECLARE
    v_is_partial BOOLEAN;
  BEGIN
    v_is_partial := (p_amount < v_booking_total);

    UPDATE payments
    SET
      status = 'completed',
      verified_at = now(),
      fonepay_trace_id = COALESCE(NULLIF(p_fonepay_trace_id, ''), fonepay_trace_id),
      updated_at = now()
    WHERE id = p_payment_id;

    IF v_is_partial THEN
      UPDATE bookings
      SET
        payment_status = 'pay_at_property',
        booking_status = 'confirmed',
        hold_expires_at = NULL,
        active_prn = NULL
      WHERE id = p_booking_id;
    ELSE
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

-- Also add fonepay_trace_id index if missing (backfill from 009)
CREATE INDEX IF NOT EXISTS idx_payments_fonepay_trace_id
  ON payments(fonepay_trace_id) WHERE fonepay_trace_id IS NOT NULL;

