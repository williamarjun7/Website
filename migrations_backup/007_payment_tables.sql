-- Payment tracking and audit tables for secure payment processing.
-- Edge function (fonepay-payment) with service-role key is the sole writer.

CREATE TABLE IF NOT EXISTS payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id      UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    prn             TEXT NOT NULL UNIQUE,
    amount          NUMERIC(10,2) NOT NULL,
    currency        TEXT NOT NULL DEFAULT 'NPR',
    payment_method  TEXT NOT NULL CHECK (payment_method IN ('fonepay_qr', 'fonepay_web')),
    status          TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    response_code   TEXT,
    response_msg    TEXT,
    verified_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id      UUID REFERENCES payments(id) ON DELETE CASCADE,
    booking_id      UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    event_type      TEXT NOT NULL CHECK (event_type IN (
                        'payment_initiated',
                        'payment_completed',
                        'payment_failed',
                        'payment_verified',
                        'status_change_attempt',
                        'idempotency_hit',
                        'amount_mismatch',
                        'replay_attempt'
                    )),
    old_status      TEXT,
    new_status      TEXT,
    payload         JSONB,
    ip_address      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_prn ON payments(prn);
CREATE INDEX IF NOT EXISTS idx_payment_events_booking_id ON payment_events(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_payment_id ON payment_events(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_created_at ON payment_events(created_at);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
