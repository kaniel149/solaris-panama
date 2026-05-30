-- ============================================================================
-- Migration 051: Scanner upgrade — RLS fix, roof_geom, RPCs, scan_requests
-- Created: 2026-05-30
-- ============================================================================
--
-- COMPANY SCOPING NOTE:
--   This repo is single-tenant (one Panama company). The `leads` table has no
--   company_id column and its RLS uses USING (true) for all authenticated users.
--   `roof_scans` has a company_id column but it is never populated by any
--   migration or RLS rule — it is a placeholder only.
--
--   Therefore ALL company-scoped policies in this migration scope by
--   created_by = auth.uid(), matching the pattern already used in the
--   existing INSERT / UPDATE policies on roof_scans (migration 050).
--   The company_id column on roof_scans and scan_requests is kept for
--   future multi-tenant use but is NOT used in any policy predicate here.
-- ============================================================================


-- ============================================================================
-- A. Fix RLS on roof_scans
--    Old SELECT policy: USING (true)  →  every authenticated user sees ALL rows.
--    New SELECT policy: scope to rows the caller created, OR rows they can reach
--    via the public_share_token path (preserved from migration 050).
-- ============================================================================

-- Drop the over-broad authenticated SELECT policy from migration 050.
DROP POLICY IF EXISTS "Users can view their company's scans" ON roof_scans;

-- Replacement: authenticated users see only their own scans.
CREATE POLICY "Users can view their own scans"
  ON roof_scans FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- Preserve the public share-token path from migration 050 (no-op if it already
-- exists; DROP + re-CREATE keeps this file fully idempotent).
DROP POLICY IF EXISTS "Public share tokens accessible by anyone" ON roof_scans;
CREATE POLICY "Public share tokens accessible by anyone"
  ON roof_scans FOR SELECT
  USING (public_share_token IS NOT NULL);

-- Service role policy is unchanged (already in 050, kept idempotent).
DROP POLICY IF EXISTS "Service role can manage scans" ON roof_scans;
CREATE POLICY "Service role can manage scans"
  ON roof_scans FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- INSERT / UPDATE policies from 050 are already correctly scoped to
-- created_by = auth.uid(); re-declare them here idempotently to be safe.
DROP POLICY IF EXISTS "Users can insert scans for their company" ON roof_scans;
CREATE POLICY "Users can insert scans for their company"
  ON roof_scans FOR INSERT
  TO authenticated
  WITH CHECK (created_by IS NULL OR created_by = auth.uid());

DROP POLICY IF EXISTS "Users can update their company's scans" ON roof_scans;
CREATE POLICY "Users can update their company's scans"
  ON roof_scans FOR UPDATE
  TO authenticated
  USING (created_by IS NULL OR created_by = auth.uid())
  WITH CHECK (created_by IS NULL OR created_by = auth.uid());


-- ============================================================================
-- B. roof_geom column + save_roof_geom RPC
-- ============================================================================

-- B1. Column
ALTER TABLE roof_scans
  ADD COLUMN IF NOT EXISTS roof_geom JSONB;

COMMENT ON COLUMN roof_scans.roof_geom IS
  'GeoJSON Polygon representing the usable roof outline drawn by the user.';

-- B2. RPC
CREATE OR REPLACE FUNCTION save_roof_geom(
  p_id   uuid,
  p_geom jsonb,
  p_area numeric,
  p_kwp  numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Only the row's creator may update it (mirrors the UPDATE policy above).
  IF NOT EXISTS (
    SELECT 1 FROM roof_scans
    WHERE id = p_id
      AND (created_by = auth.uid() OR auth.role() = 'service_role')
  ) THEN
    RAISE EXCEPTION 'roof_scan not found or access denied';
  END IF;

  UPDATE roof_scans
  SET
    roof_geom        = p_geom,
    usable_roof_m2   = p_area,
    system_kwp       = p_kwp,
    custom_placement = true,
    updated_at       = NOW()
  WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION save_roof_geom(uuid, jsonb, numeric, numeric) TO authenticated;


-- ============================================================================
-- C. insert_detected_roof RPC
--    Accepts a JSON candidate object, inserts a roof_scans row and a minimal
--    leads row linked via roof_scans.lead_id. Idempotent on lat/lng.
--
--    leads columns used (only those that exist in the leads schema):
--      name, location, source, status
--    Columns NOT used (do not exist on leads): address, latitude, longitude.
--    The leads table has `location TEXT` (not lat/lng coords) and `name TEXT`.
-- ============================================================================

CREATE OR REPLACE FUNCTION insert_detected_roof(p jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_scan_id  uuid;
  v_lead_id  uuid;
  v_lat      numeric;
  v_lng      numeric;
  v_source   text;
  v_quality  text;
BEGIN
  v_lat     := (p->>'lat')::numeric;
  v_lng     := (p->>'lng')::numeric;
  v_source  := COALESCE(p->>'source',  'manual');
  v_quality := COALESCE(p->>'quality', 'ESTIMATED');

  -- Idempotency: return existing scan id if a row already exists at this
  -- lat/lng (compared to 5 decimal places ≈ 1 m precision).
  SELECT id INTO v_scan_id
  FROM roof_scans
  WHERE ROUND(latitude::numeric,  5) = ROUND(v_lat, 5)
    AND ROUND(longitude::numeric, 5) = ROUND(v_lng, 5)
  LIMIT 1;

  IF v_scan_id IS NOT NULL THEN
    RETURN v_scan_id;
  END IF;

  -- Create minimal leads row so roof_scans.lead_id FK is satisfied.
  -- Only columns confirmed to exist on leads are populated.
  INSERT INTO leads (name, location, source, status)
  VALUES (
    COALESCE(p->>'address', 'Detected roof — ' || v_lat::text || ', ' || v_lng::text),
    p->>'address',   -- location TEXT
    'manual',
    'new'
  )
  RETURNING id INTO v_lead_id;

  -- Insert the roof scan row.
  INSERT INTO roof_scans (
    address,
    latitude,
    longitude,
    source,
    quality,
    total_roof_m2,
    usable_roof_m2,
    system_kwp,
    panel_count,
    yearly_kwh,
    roof_geom,
    lead_id,
    created_by
  )
  VALUES (
    COALESCE(p->>'address', v_lat::text || ', ' || v_lng::text),
    v_lat,
    v_lng,
    v_source,
    v_quality,
    (p->>'totalRoofM2')::numeric,
    (p->>'usableRoofM2')::numeric,
    (p->>'systemKwp')::numeric,
    (p->>'panelCount')::integer,
    (p->>'yearlyKwh')::integer,
    CASE WHEN p ? 'roofGeom' AND p->>'roofGeom' IS NOT NULL
         THEN (p->>'roofGeom')::jsonb
         ELSE NULL
    END,
    v_lead_id,
    auth.uid()
  )
  RETURNING id INTO v_scan_id;

  RETURN v_scan_id;
END;
$$;

GRANT EXECUTE ON FUNCTION insert_detected_roof(jsonb) TO authenticated;


-- ============================================================================
-- D. scan_requests table + create_scan_request RPC
-- ============================================================================

-- D1. Table
CREATE TABLE IF NOT EXISTS scan_requests (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid,                                -- reserved for future multi-tenant use
  area_geojson jsonb,
  bbox         numeric[],
  filters      jsonb       NOT NULL DEFAULT '{}',
  status       text        NOT NULL DEFAULT 'queued'
                           CHECK (status IN ('queued', 'running', 'done', 'failed')),
  counts       jsonb       NOT NULL DEFAULT '{}',
  error        text,
  requested_by uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT NOW(),
  updated_at   timestamptz NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scan_requests_status
  ON scan_requests(status);

CREATE INDEX IF NOT EXISTS idx_scan_requests_company
  ON scan_requests(company_id);

CREATE INDEX IF NOT EXISTS idx_scan_requests_requested_by
  ON scan_requests(requested_by);

-- updated_at trigger (reuse the global trigger function from migration 001)
DROP TRIGGER IF EXISTS update_scan_requests_updated_at ON scan_requests;
CREATE TRIGGER update_scan_requests_updated_at
  BEFORE UPDATE ON scan_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- D2. RLS
ALTER TABLE scan_requests ENABLE ROW LEVEL SECURITY;

-- Authenticated users see their own requests (scoped by requested_by = auth.uid()).
DROP POLICY IF EXISTS "Users can view their own scan requests" ON scan_requests;
CREATE POLICY "Users can view their own scan requests"
  ON scan_requests FOR SELECT
  TO authenticated
  USING (requested_by = auth.uid());

-- INSERT is only allowed through the create_scan_request RPC (SECURITY DEFINER),
-- so no direct INSERT policy is granted to authenticated / anon.
-- Service role (cron worker) bypasses RLS by default — no policy needed.

-- Service role explicit full-access policy for clarity / consistency with other tables.
DROP POLICY IF EXISTS "Service role can manage scan requests" ON scan_requests;
CREATE POLICY "Service role can manage scan requests"
  ON scan_requests FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- D3. RPC
CREATE OR REPLACE FUNCTION create_scan_request(
  p_area    jsonb,
  p_bbox    numeric[],
  p_filters jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO scan_requests (
    area_geojson,
    bbox,
    filters,
    status,
    requested_by
    -- company_id intentionally omitted: single-tenant, no derivation mechanism
  )
  VALUES (
    p_area,
    p_bbox,
    COALESCE(p_filters, '{}'),
    'queued',
    auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_scan_request(jsonb, numeric[], jsonb) TO authenticated;
