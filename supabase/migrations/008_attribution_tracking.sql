-- Migration 008: Attribution, CAPI dedup, bridge heartbeat, webhook logs
-- Created: 2026-04-17
-- Unlocks: Google Enhanced/Offline Conversions + Meta CAPI + Bridge uptime monitoring

-- ============================================================
-- 1. Lead attribution columns (for offline conversions + CAPI)
-- ============================================================
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS deal_value NUMERIC,
  ADD COLUMN IF NOT EXISTS deal_currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS won_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS google_conversion_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS meta_capi_lead_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS meta_capi_purchase_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS event_id TEXT, -- UUID for CAPI/pixel dedup
  ADD COLUMN IF NOT EXISTS fbc TEXT,       -- _fbc cookie value
  ADD COLUMN IF NOT EXISTS fbp TEXT,       -- _fbp cookie value
  ADD COLUMN IF NOT EXISTS client_user_agent TEXT,
  ADD COLUMN IF NOT EXISTS client_ip TEXT;

-- Index: find leads ready for Google offline upload (status=won, not yet uploaded)
CREATE INDEX IF NOT EXISTS idx_leads_google_upload_pending
  ON leads(won_at)
  WHERE status = 'won' AND google_conversion_uploaded_at IS NULL AND gclid IS NOT NULL;

-- Index: Meta CAPI lead dedup
CREATE INDEX IF NOT EXISTS idx_leads_event_id ON leads(event_id) WHERE event_id IS NOT NULL;

-- ============================================================
-- 1b. WhatsApp delivery tracking (status 3=delivered, 4=read)
-- ============================================================
ALTER TABLE whatsapp_outbound_queue
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_wa_outbound_undelivered
  ON whatsapp_outbound_queue(sent_at)
  WHERE status = 'sent' AND delivered_at IS NULL;

-- ============================================================
-- 2. Bridge heartbeat (dead-man's switch)
-- ============================================================
CREATE TABLE IF NOT EXISTS bridge_heartbeat (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  last_ping TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hostname TEXT,
  version TEXT,
  queue_size INT DEFAULT 0,
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO bridge_heartbeat (id, last_ping, hostname)
VALUES (1, NOW(), 'init')
ON CONFLICT (id) DO NOTHING;

-- Track every outage event for postmortems
CREATE TABLE IF NOT EXISTS bridge_outage_log (
  id BIGSERIAL PRIMARY KEY,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_ping_before TIMESTAMPTZ,
  minutes_down INT,
  alerted BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ
);

-- ============================================================
-- 3. Webhook logs (debugging + observability)
-- ============================================================
CREATE TABLE IF NOT EXISTS webhook_logs (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,        -- 'meta' | 'google' | 'intake' | 'capi' | 'enhanced_conv'
  direction TEXT DEFAULT 'in', -- 'in' | 'out'
  status_code INT,
  payload JSONB,
  response JSONB,
  error TEXT,
  duration_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_source_date
  ON webhook_logs(source, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_errors
  ON webhook_logs(created_at DESC)
  WHERE error IS NOT NULL;

-- Auto-cleanup logs older than 60 days
CREATE OR REPLACE FUNCTION cleanup_old_webhook_logs() RETURNS void AS $$
BEGIN
  DELETE FROM webhook_logs WHERE created_at < NOW() - INTERVAL '60 days';
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

-- ============================================================
-- 4. RLS
-- ============================================================
ALTER TABLE bridge_heartbeat ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridge_outage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can write; authenticated users can read heartbeat status
DROP POLICY IF EXISTS "Service role full access heartbeat" ON bridge_heartbeat;
CREATE POLICY "Service role full access heartbeat" ON bridge_heartbeat
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Auth read heartbeat" ON bridge_heartbeat;
CREATE POLICY "Auth read heartbeat" ON bridge_heartbeat
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Service role webhook logs" ON webhook_logs;
CREATE POLICY "Service role webhook logs" ON webhook_logs
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role outage log" ON bridge_outage_log;
CREATE POLICY "Service role outage log" ON bridge_outage_log
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- 5. Helper: mark lead won (sets won_at + deal_value atomically)
-- ============================================================
CREATE OR REPLACE FUNCTION mark_lead_won(
  p_lead_id UUID,
  p_deal_value NUMERIC,
  p_deal_currency TEXT DEFAULT 'USD'
) RETURNS leads AS $$
DECLARE
  updated leads;
BEGIN
  UPDATE leads
  SET status = 'won',
      won_at = COALESCE(won_at, NOW()),
      deal_value = p_deal_value,
      deal_currency = p_deal_currency,
      updated_at = NOW()
  WHERE id = p_lead_id
  RETURNING * INTO updated;
  RETURN updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
