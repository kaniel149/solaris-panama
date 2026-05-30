-- ============================================================================
-- CRM hardening: idempotent constraints/indexes for the lead flow
-- ============================================================================

-- Keep existing deployments safe while documenting the statuses/sources the app
-- already uses in production.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leads_status_check'
  ) THEN
    ALTER TABLE leads
      ADD CONSTRAINT leads_status_check
      CHECK (status IN (
        'new',
        'contacted',
        'qualified',
        'proposal_sent',
        'won',
        'lost',
        'cold',
        'warm',
        'hot',
        'vendor',
        'partner',
        'not_a_lead'
      )) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leads_source_check'
  ) THEN
    ALTER TABLE leads
      ADD CONSTRAINT leads_source_check
      CHECK (source IN (
        'google_ads',
        'meta_ads',
        'lp_azuero',
        'facebook',
        'instagram',
        'whatsapp',
        'website',
        'manual',
        'referral',
        'cold_call',
        'event',
        'debug_test',
        'capi_verify'
      )) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_leads_updated_at ON leads(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_won_at ON leads(won_at DESC) WHERE won_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_stale_open ON leads(status, updated_at)
  WHERE status IN ('new', 'contacted', 'qualified', 'proposal_sent');

-- Useful when support/debugging needs to see queue health from the CRM.
CREATE INDEX IF NOT EXISTS idx_wa_queue_status_created ON whatsapp_outbound_queue(status, created_at DESC);
