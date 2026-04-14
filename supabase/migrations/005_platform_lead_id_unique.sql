-- ============================================
-- Fix: PostgREST upsert needs a full unique constraint, not partial indexes
-- ============================================

DROP INDEX IF EXISTS idx_leads_meta_dedup;
DROP INDEX IF EXISTS idx_leads_google_dedup;

-- Single full unique index on platform_lead_id (NULL allowed, multiple NULLs allowed in PG)
CREATE UNIQUE INDEX IF NOT EXISTS leads_platform_lead_id_unique
  ON leads(platform_lead_id)
  WHERE platform_lead_id IS NOT NULL;
