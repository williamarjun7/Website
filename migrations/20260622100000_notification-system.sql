-- 20260622100000_notification_system.sql
-- Automated communication system: notification logging, settings, deduplication

-- 1. notification_logs — audit trail for every sent notification
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL,
    tenant_id UUID,
    channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
    recipient_type TEXT NOT NULL CHECK (recipient_type IN ('customer', 'staff')),
    recipient_address TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'booking_created', 'booking_confirmed', 'booking_updated', 'booking_cancelled'
    )),
    subject TEXT DEFAULT '',
    body_preview TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'retrying')),
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    last_error TEXT DEFAULT '',
    dedup_key TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT now(),
    delivered_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_booking ON notification_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_dedup ON notification_logs(dedup_key);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at);

-- 2. notification_settings — per-tenant channel toggles (optional enhancement)
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
    recipient_type TEXT NOT NULL CHECK (recipient_type IN ('customer', 'staff')),
    event_type TEXT NOT NULL CHECK (event_type IN (
        'booking_created', 'booking_confirmed', 'booking_updated', 'booking_cancelled'
    )),
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (tenant_id, channel, recipient_type, event_type)
);

CREATE INDEX IF NOT EXISTS idx_notification_settings_tenant ON notification_settings(tenant_id);

-- RLS
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Admin full access notification_logs" ON notification_logs
    USING (true);

CREATE POLICY IF NOT EXISTS "Admin full access notification_settings" ON notification_settings
    USING (true);

-- Updated-at trigger for notification_settings
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_notification_settings_updated_at' AND tgrelid = 'notification_settings'::regclass) THEN
        CREATE TRIGGER set_notification_settings_updated_at BEFORE UPDATE ON notification_settings
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

SELECT 'Migration 20260622100000 applied — notification system schema created' AS status;
