-- ============================================
-- WhatsApp Messages — stores all conversations from the WhatsApp Bridge
-- Linked to leads via lead_id
-- ============================================

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

  -- WhatsApp identifiers (unique per message globally)
  wa_message_id TEXT UNIQUE NOT NULL,
  wa_chat_id TEXT NOT NULL,

  -- Contact
  phone TEXT NOT NULL,

  -- Direction & content
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  body TEXT,
  media_type TEXT,  -- image | video | audio | ptt | document | location | sticker | null
  media_url TEXT,

  -- Metadata
  is_from_me BOOLEAN NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  raw_data JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_wa_messages_lead ON whatsapp_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_wa_messages_phone ON whatsapp_messages(phone);
CREATE INDEX IF NOT EXISTS idx_wa_messages_chat ON whatsapp_messages(wa_chat_id);
CREATE INDEX IF NOT EXISTS idx_wa_messages_timestamp ON whatsapp_messages(timestamp DESC);

-- RLS: service_role has full access (bridge uses service key).
-- Authenticated users can read their company's messages via leads join.
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_messages_service_all" ON whatsapp_messages;
CREATE POLICY "whatsapp_messages_service_all" ON whatsapp_messages
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "whatsapp_messages_auth_read" ON whatsapp_messages;
CREATE POLICY "whatsapp_messages_auth_read" ON whatsapp_messages
  FOR SELECT TO authenticated USING (true);

COMMENT ON TABLE whatsapp_messages IS 'All WhatsApp conversations synced via the bridge (whatsapp-bridge/)';
COMMENT ON COLUMN whatsapp_messages.wa_message_id IS 'WhatsApp unique message ID (idempotency key)';
COMMENT ON COLUMN whatsapp_messages.direction IS 'inbound=from customer, outbound=from us (Omri)';
COMMENT ON COLUMN whatsapp_messages.is_from_me IS 'true if sent from the linked WhatsApp account (Omri)';
