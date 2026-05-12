-- Migration 010: Attribution debug column + backfill index
-- Created: 2026-05-12
-- Purpose: Store per-lead attribution resolution details for debugging and
--          retrospective analysis.  The attribution_debug JSONB column receives
--          a snapshot of every inference decision made in api/lib/attribution.ts
--          (raw UTM values, which rule fired, final resolved utm_source, etc.).
--
-- Companion: scripts/backfill-attribution.ts — backfills utm_source on existing
--            leads where gclid IS NOT NULL but utm_source IS NULL.

-- 1. Add attribution_debug column to leads
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS attribution_debug JSONB;

COMMENT ON COLUMN leads.attribution_debug IS
  'Snapshot of attribution inference: raw UTMs, gclid/fbclid flags, referrer_source, '
  'inferred flag, infer_reason, and final resolved_utm_source. Written by intake API.';

-- 2. Index for querying leads by inferred attribution (useful for dashboards)
CREATE INDEX IF NOT EXISTS idx_leads_attribution_debug_inferred
  ON leads USING gin(attribution_debug)
  WHERE attribution_debug IS NOT NULL;

-- 3. Index to find leads still missing utm_source (for backfill verification)
CREATE INDEX IF NOT EXISTS idx_leads_utm_source_null_gclid
  ON leads(created_at DESC)
  WHERE utm_source IS NULL AND gclid IS NOT NULL;

-- 4. RLS: attribution_debug is internal — no extra policies needed.
--    The existing leads RLS policies (service_role full, authenticated SELECT)
--    already cover this column.
