-- ============================================
-- Solaris Panama CRM — Leads Table
-- Receives leads from: landing page, WhatsApp, manual entry
-- ============================================

CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Contact
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,

  -- Lead data
  monthly_bill NUMERIC,
  message TEXT,
  location TEXT,

  -- Source tracking
  source TEXT NOT NULL DEFAULT 'manual',
  -- Values: google_ads, facebook, instagram, whatsapp, website, manual
  campaign TEXT,
  ad_set TEXT,
  ad_name TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,

  -- Pipeline
  status TEXT NOT NULL DEFAULT 'new',
  -- Values: new, contacted, qualified, proposal_sent, won, lost
  assigned_to UUID REFERENCES auth.users(id),
  lead_score INTEGER DEFAULT 0,
  notes TEXT,

  -- Meta
  platform_lead_id TEXT,
  raw_data JSONB,
  whatsapp_chat_id TEXT
);

-- Indexes
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_assigned ON leads(assigned_to);
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_created ON leads(created_at DESC);

-- Unique constraint to prevent duplicate WhatsApp leads
CREATE UNIQUE INDEX idx_leads_whatsapp_dedup ON leads(phone, source)
  WHERE source = 'whatsapp';

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_leads_updated_at();

-- RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all leads
CREATE POLICY "Authenticated users can read leads"
  ON leads FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert leads
CREATE POLICY "Authenticated users can insert leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update leads
CREATE POLICY "Authenticated users can update leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (true);

-- Anon can insert leads (for landing page form / webhooks)
CREATE POLICY "Anon can insert leads"
  ON leads FOR INSERT
  TO anon
  WITH CHECK (true);

-- Add lead_notes table for conversation history
CREATE TABLE IF NOT EXISTS lead_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage lead notes"
  ON lead_notes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_lead_notes_lead ON lead_notes(lead_id, created_at DESC);
