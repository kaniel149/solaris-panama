-- ============================================
-- WhatsApp Automation — outbound queue + lead automation flags
-- Vercel serverless writes to queue, the local bridge polls and sends.
-- ============================================

CREATE TABLE IF NOT EXISTS whatsapp_outbound_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Automation metadata
  automation_type TEXT NOT NULL,  -- 'meta_ack' | 'wa_discovery' | 'followup' | 'manual'
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'sent' | 'failed' | 'cancelled'
  sent_at TIMESTAMPTZ,
  error TEXT,
  wa_message_id TEXT,

  -- Guard against double-fire
  idempotency_key TEXT UNIQUE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_queue_pending ON whatsapp_outbound_queue(status, scheduled_for)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_wa_queue_lead ON whatsapp_outbound_queue(lead_id);

-- Add automation tracking to leads table
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS auto_wa_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_wa_type TEXT;

-- RLS: service_role has full access, bridge uses it
ALTER TABLE whatsapp_outbound_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_queue_service_all" ON whatsapp_outbound_queue;
CREATE POLICY "wa_queue_service_all" ON whatsapp_outbound_queue
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "wa_queue_auth_read" ON whatsapp_outbound_queue;
CREATE POLICY "wa_queue_auth_read" ON whatsapp_outbound_queue
  FOR SELECT TO authenticated USING (true);

COMMENT ON TABLE whatsapp_outbound_queue IS 'Messages queued for the local WhatsApp bridge to pick up and send';
COMMENT ON COLUMN whatsapp_outbound_queue.automation_type IS 'meta_ack | wa_discovery | followup | manual';
COMMENT ON COLUMN whatsapp_outbound_queue.idempotency_key IS 'Prevents duplicate sends (e.g. lead_id + automation_type)';
COMMENT ON COLUMN leads.auto_wa_sent_at IS 'When the auto WA message was sent (NULL = not yet)';
