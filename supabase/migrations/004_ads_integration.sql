-- ============================================
-- Solaris Panama CRM — Ads Integration (Meta + Google)
-- Adds fields for Meta Lead Ads + Google Ads Lead Form webhooks
-- ============================================

-- Add ad-specific tracking fields
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS ad_id TEXT,
  ADD COLUMN IF NOT EXISTS ad_set_id TEXT,
  ADD COLUMN IF NOT EXISTS form_id TEXT,
  ADD COLUMN IF NOT EXISTS gclid TEXT,
  ADD COLUMN IF NOT EXISTS fbclid TEXT,
  ADD COLUMN IF NOT EXISTS page_id TEXT;

-- Indexes for ad attribution queries
CREATE INDEX IF NOT EXISTS idx_leads_ad_id ON leads(ad_id) WHERE ad_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_gclid ON leads(gclid) WHERE gclid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_platform_lead_id
  ON leads(platform_lead_id) WHERE platform_lead_id IS NOT NULL;

-- Dedup unique indexes for webhook idempotency
-- Meta: leadgen_id (platform_lead_id) is globally unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_meta_dedup
  ON leads(platform_lead_id)
  WHERE source = 'meta_ads' AND platform_lead_id IS NOT NULL;

-- Google: lead_id from Google Ads is globally unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_google_dedup
  ON leads(platform_lead_id)
  WHERE source = 'google_ads' AND platform_lead_id IS NOT NULL;

COMMENT ON COLUMN leads.ad_id IS 'Meta ad_id or Google creative_id';
COMMENT ON COLUMN leads.ad_set_id IS 'Meta adset_id or Google ad_group_id';
COMMENT ON COLUMN leads.form_id IS 'Meta form_id or Google form_id';
COMMENT ON COLUMN leads.gclid IS 'Google Click ID for offline conversion upload';
COMMENT ON COLUMN leads.fbclid IS 'Facebook Click ID for CAPI';
COMMENT ON COLUMN leads.page_id IS 'Meta Page ID that received the lead';
