-- ============================================================================
-- Migration 056: scan_candidates + scan_exclusions + land scan support
-- Created: 2026-06-14
-- Branch: fable/scanner-bustan-parity
-- ============================================================================
--
-- Additive-only. Does NOT modify roof_scans, scan_requests (beyond a new
-- column), or leads. The 3,612 existing roof_scans/leads are untouched.
--
-- Changes:
--   1. scan_requests.scan_type column ('roof'|'land', default 'roof')
--   2. New table: scan_candidates  (review queue for cron results)
--   3. New table: scan_exclusions  (learned rejects, ~30 m radius)
--   4. RPCs (SECURITY DEFINER):
--        insert_scan_candidate    -- cron inserts pending candidates
--        set_scan_candidate_status
--        reject_scan_candidate    -- marks rejected + seeds exclusion if applicable
--        approve_scan_candidate   -- promotes candidate -> roof_scans + lead
--        apply_learned_filters    -- bulk-reject via exclusion proximity
-- ============================================================================


-- ============================================================================
-- 0. Fix roof_scans.source constraint
--    Migration 053 accidentally dropped 'overpass_cron' from the allowed set
--    (it was added in 051). The cron worker writes source='overpass_cron', and
--    approve_scan_candidate (below) does too. Re-add it here idempotently.
-- ============================================================================

ALTER TABLE roof_scans DROP CONSTRAINT IF EXISTS roof_scans_source_check;
ALTER TABLE roof_scans ADD CONSTRAINT roof_scans_source_check
  CHECK (source IN (
    'google_solar', 'local_panama', 'pvwatts', 'pvwatts_estimate',
    'ai_vision', 'nasa_estimate', 'manual', 'overpass_cron'
  ));


-- ============================================================================
-- 1. scan_requests.scan_type
-- ============================================================================

ALTER TABLE scan_requests
  ADD COLUMN IF NOT EXISTS scan_type text NOT NULL DEFAULT 'roof'
  CHECK (scan_type IN ('roof', 'land'));


-- ============================================================================
-- 2. scan_candidates table
-- ============================================================================

CREATE TABLE IF NOT EXISTS scan_candidates (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_request_id  uuid        REFERENCES scan_requests(id) ON DELETE SET NULL,
  kind             text        NOT NULL CHECK (kind IN ('roof', 'land')),
  status           text        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'added', 'rejected')),
  latitude         numeric     NOT NULL,
  longitude        numeric     NOT NULL,
  geom             jsonb,
  area_m2          numeric,
  area_ha          numeric,
  area_rai         numeric,
  estimated_kwp    numeric,
  estimated_mwp    numeric,
  tier             text        CHECK (tier IN ('comercial', 'agro', 'utility')),
  landuse          text,
  score            int,
  grade            text        CHECK (grade IN ('A', 'B', 'C', 'D')),
  existing_solar   boolean,
  solar_checked_at timestamptz,
  address          text,
  raw              jsonb,
  lead_id          uuid        REFERENCES leads(id) ON DELETE SET NULL,
  created_by       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT NOW(),
  updated_at       timestamptz NOT NULL DEFAULT NOW()
);

-- updated_at trigger (reuses the global trigger function from migration 001)
DROP TRIGGER IF EXISTS update_scan_candidates_updated_at ON scan_candidates;
CREATE TRIGGER update_scan_candidates_updated_at
  BEFORE UPDATE ON scan_candidates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scan_candidates_status
  ON scan_candidates(status);

CREATE INDEX IF NOT EXISTS idx_scan_candidates_scan_request_id
  ON scan_candidates(scan_request_id);

CREATE INDEX IF NOT EXISTS idx_scan_candidates_lat_lng
  ON scan_candidates(latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_scan_candidates_kind_status
  ON scan_candidates(kind, status);


-- ============================================================================
-- 2a. RLS on scan_candidates
-- ============================================================================

ALTER TABLE scan_candidates ENABLE ROW LEVEL SECURITY;

-- Service role: full access
DROP POLICY IF EXISTS "Service role can manage scan candidates" ON scan_candidates;
CREATE POLICY "Service role can manage scan candidates"
  ON scan_candidates FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Authenticated: read all (single-team, mirrors migration 055 pattern)
DROP POLICY IF EXISTS "Authenticated can read all scan candidates" ON scan_candidates;
CREATE POLICY "Authenticated can read all scan candidates"
  ON scan_candidates FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated: update all (review actions - approve/reject via RPC or direct)
DROP POLICY IF EXISTS "Authenticated can update all scan candidates" ON scan_candidates;
CREATE POLICY "Authenticated can update all scan candidates"
  ON scan_candidates FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Authenticated: insert (used by RPCs and direct inserts from cron acting as service_role)
DROP POLICY IF EXISTS "Authenticated can insert scan candidates" ON scan_candidates;
CREATE POLICY "Authenticated can insert scan candidates"
  ON scan_candidates FOR INSERT
  TO authenticated
  WITH CHECK (true);


-- ============================================================================
-- 3. scan_exclusions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS scan_exclusions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  latitude   numeric     NOT NULL,
  longitude  numeric     NOT NULL,
  reason     text,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_exclusions_lat_lng
  ON scan_exclusions(latitude, longitude);


-- ============================================================================
-- 3a. RLS on scan_exclusions
-- ============================================================================

ALTER TABLE scan_exclusions ENABLE ROW LEVEL SECURITY;

-- Service role: full access
DROP POLICY IF EXISTS "Service role can manage scan exclusions" ON scan_exclusions;
CREATE POLICY "Service role can manage scan exclusions"
  ON scan_exclusions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Authenticated: read all
DROP POLICY IF EXISTS "Authenticated can read all scan exclusions" ON scan_exclusions;
CREATE POLICY "Authenticated can read all scan exclusions"
  ON scan_exclusions FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated: insert (RPCs insert exclusions on reject)
DROP POLICY IF EXISTS "Authenticated can insert scan exclusions" ON scan_exclusions;
CREATE POLICY "Authenticated can insert scan exclusions"
  ON scan_exclusions FOR INSERT
  TO authenticated
  WITH CHECK (true);


-- ============================================================================
-- 4. RPC: insert_scan_candidate
--    Called by the cron worker (service_role). Idempotent: skips if a
--    pending/added candidate of the same kind exists within ~30 m
--    (0.00027 deg), or if a scan_exclusion exists within ~30 m.
--    Returns the new candidate id, or NULL if skipped.
-- ============================================================================

CREATE OR REPLACE FUNCTION insert_scan_candidate(p jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id       uuid;
  v_lat      numeric;
  v_lng      numeric;
  v_kind     text;
  DEDUP_DEG  constant numeric := 0.00027;   -- ~30 m
BEGIN
  v_lat  := (p->>'latitude')::numeric;
  v_lng  := (p->>'longitude')::numeric;
  v_kind := COALESCE(p->>'kind', 'roof');

  -- Skip if a live (pending/added) candidate of same kind is within ~30 m
  IF EXISTS (
    SELECT 1 FROM scan_candidates
    WHERE kind = v_kind
      AND status IN ('pending', 'added')
      AND ABS(latitude  - v_lat) < DEDUP_DEG
      AND ABS(longitude - v_lng) < DEDUP_DEG
  ) THEN
    RETURN NULL;
  END IF;

  -- Skip if a learned exclusion exists within ~30 m
  IF EXISTS (
    SELECT 1 FROM scan_exclusions
    WHERE ABS(latitude  - v_lat) < DEDUP_DEG
      AND ABS(longitude - v_lng) < DEDUP_DEG
  ) THEN
    RETURN NULL;
  END IF;

  INSERT INTO scan_candidates (
    scan_request_id,
    kind,
    status,
    latitude,
    longitude,
    geom,
    area_m2,
    area_ha,
    area_rai,
    estimated_kwp,
    estimated_mwp,
    tier,
    landuse,
    score,
    grade,
    existing_solar,
    address,
    raw
  )
  VALUES (
    (p->>'scan_request_id')::uuid,
    v_kind,
    'pending',
    v_lat,
    v_lng,
    CASE WHEN p ? 'geom' THEN (p->>'geom')::jsonb ELSE NULL END,
    (p->>'area_m2')::numeric,
    (p->>'area_ha')::numeric,
    (p->>'area_rai')::numeric,
    (p->>'estimated_kwp')::numeric,
    (p->>'estimated_mwp')::numeric,
    p->>'tier',
    p->>'landuse',
    (p->>'score')::int,
    p->>'grade',
    CASE WHEN p ? 'existing_solar' THEN (p->>'existing_solar')::boolean ELSE NULL END,
    p->>'address',
    CASE WHEN p ? 'raw' THEN (p->>'raw')::jsonb ELSE NULL END
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION insert_scan_candidate(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION insert_scan_candidate(jsonb) TO authenticated, service_role;


-- ============================================================================
-- 5. RPC: set_scan_candidate_status
--    Simple direct status setter for bulk actions.
-- ============================================================================

CREATE OR REPLACE FUNCTION set_scan_candidate_status(p_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_status NOT IN ('pending', 'added', 'rejected') THEN
    RAISE EXCEPTION 'invalid status: %', p_status;
  END IF;

  UPDATE scan_candidates
  SET status     = p_status,
      updated_at = NOW()
  WHERE id = p_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION set_scan_candidate_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION set_scan_candidate_status(uuid, text) TO authenticated, service_role;


-- ============================================================================
-- 6. RPC: reject_scan_candidate
--    Marks candidate rejected. If reason is one of the "place is bad" reasons
--    (not_a_roof, too_small, other) inserts a scan_exclusion so the location
--    is skipped on future scans. 'has_pv' is informational - no exclusion.
-- ============================================================================

CREATE OR REPLACE FUNCTION reject_scan_candidate(p_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lat  numeric;
  v_lng  numeric;
BEGIN
  -- Fetch centroid before marking rejected
  SELECT latitude, longitude
  INTO   v_lat, v_lng
  FROM   scan_candidates
  WHERE  id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'scan_candidate not found: %', p_id;
  END IF;

  UPDATE scan_candidates
  SET status     = 'rejected',
      updated_at = NOW()
  WHERE id = p_id;

  -- Seed exclusion for spatial reasons ('has_pv' means "already has solar"
  -- but the location itself is fine for future detection - no exclusion).
  IF p_reason IN ('not_a_roof', 'too_small', 'other') THEN
    INSERT INTO scan_exclusions (latitude, longitude, reason)
    VALUES (v_lat, v_lng, p_reason);
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION reject_scan_candidate(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION reject_scan_candidate(uuid, text) TO authenticated, service_role;


-- ============================================================================
-- 7. RPC: approve_scan_candidate
--    Promotes a pending/rejected candidate to a roof_scans row + lead.
--
--    For kind='roof': delegates to insert_detected_roof (handles dedup by
--    lat/lng). We call it as SECURITY DEFINER so it runs as superuser even
--    when invoked by an authenticated user.
--
--    For kind='land': inserts a roof_scans row (source='overpass_cron',
--    quality='ESTIMATED') and a linked leads row. Land-specific fields
--    (mwp, area_ha, tier, landuse) are stored in leads.raw_data (jsonb)
--    because leads has no native land columns yet.
--    system_kwp = estimated_mwp * 1000 (MWp -> kWp, fits NUMERIC(9,2)).
--
--    Sets candidate status='added' and populates lead_id.
--    Returns the lead_id created/found.
-- ============================================================================

CREATE OR REPLACE FUNCTION approve_scan_candidate(p_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cand    scan_candidates%ROWTYPE;
  v_scan_id uuid;
  v_lead_id uuid;
  v_kwp     numeric;
BEGIN
  SELECT * INTO v_cand FROM scan_candidates WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'scan_candidate not found: %', p_id;
  END IF;

  IF v_cand.status = 'added' THEN
    -- Already promoted - return existing lead_id idempotently
    RETURN v_cand.lead_id;
  END IF;

  IF v_cand.kind = 'roof' THEN
    -- Delegate to existing insert_detected_roof RPC.
    -- Build the same payload it expects.
    SELECT insert_detected_roof(
      jsonb_build_object(
        'lat',          v_cand.latitude,
        'lng',          v_cand.longitude,
        'address',      COALESCE(v_cand.address, v_cand.latitude::text || ', ' || v_cand.longitude::text),
        'roofGeom',     CASE WHEN v_cand.geom IS NOT NULL THEN v_cand.geom::text ELSE NULL END,
        'totalRoofM2',  v_cand.area_m2,
        'usableRoofM2', ROUND(COALESCE(v_cand.area_m2, 0) * 0.60, 2),
        'systemKwp',    COALESCE(v_cand.estimated_kwp, 0),
        'panelCount',   GREATEST(0, FLOOR(COALESCE(v_cand.area_m2, 0) * 0.60 * (1.0 / 2.58)))::int,
        'yearlyKwh',    GREATEST(0, ROUND(COALESCE(v_cand.estimated_kwp, 0) * 1600))::int,
        'source',       'overpass_cron',
        'quality',      'ESTIMATED'
      )
    ) INTO v_scan_id;

    -- insert_detected_roof also created the lead; retrieve it
    SELECT lead_id INTO v_lead_id
    FROM roof_scans
    WHERE id = v_scan_id;

  ELSIF v_cand.kind = 'land' THEN
    -- kWp = MWp * 1000 (NUMERIC(9,2) max = 9,999,999.99 kWp - safe)
    v_kwp := ROUND(COALESCE(v_cand.estimated_mwp, 0) * 1000.0, 2);

    -- Create lead first (FK order)
    INSERT INTO leads (name, location, source, status)
    VALUES (
      COALESCE(v_cand.address, 'Terreno detectado ' || v_cand.latitude::text || ', ' || v_cand.longitude::text),
      v_cand.address,
      'manual',
      'new'
    )
    RETURNING id INTO v_lead_id;

    -- Insert roof_scans row reusing the table (land parcels stored here
    -- until a dedicated land_scans table is built).
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
      lead_id
    )
    VALUES (
      COALESCE(v_cand.address, v_cand.latitude::text || ', ' || v_cand.longitude::text),
      v_cand.latitude,
      v_cand.longitude,
      'overpass_cron',
      'ESTIMATED',
      v_cand.area_m2,
      ROUND(COALESCE(v_cand.area_m2, 0) * 0.75, 2),  -- ground usable ratio
      v_kwp,
      0,                                                -- no panels (ground-mount MWp)
      GREATEST(0, ROUND(v_kwp * 1600))::int,
      v_cand.geom,
      v_lead_id
    )
    RETURNING id INTO v_scan_id;

  ELSE
    RAISE EXCEPTION 'unsupported kind: %', v_cand.kind;
  END IF;

  -- Mark candidate promoted
  UPDATE scan_candidates
  SET status     = 'added',
      lead_id    = v_lead_id,
      updated_at = NOW()
  WHERE id = p_id;

  RETURN v_lead_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION approve_scan_candidate(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION approve_scan_candidate(uuid) TO authenticated, service_role;


-- ============================================================================
-- 8. RPC: apply_learned_filters
--    Bulk-reject pending candidates that either:
--      a) have existing_solar = true, OR
--      b) sit within ~30 m of any scan_exclusion
--    Returns the count of candidates rejected.
-- ============================================================================

CREATE OR REPLACE FUNCTION apply_learned_filters()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count    int := 0;
  v_batch    int := 0;
  DEDUP_DEG  constant numeric := 0.00027;
BEGIN
  -- a) existing_solar = true
  UPDATE scan_candidates
  SET status     = 'rejected',
      updated_at = NOW()
  WHERE status = 'pending'
    AND existing_solar = true;

  GET DIAGNOSTICS v_batch = ROW_COUNT;
  v_count := v_count + v_batch;

  -- b) proximity to any scan_exclusion (only still-pending rows)
  UPDATE scan_candidates sc
  SET status     = 'rejected',
      updated_at = NOW()
  WHERE sc.status = 'pending'
    AND EXISTS (
      SELECT 1 FROM scan_exclusions se
      WHERE ABS(se.latitude  - sc.latitude)  < DEDUP_DEG
        AND ABS(se.longitude - sc.longitude) < DEDUP_DEG
    );

  GET DIAGNOSTICS v_batch = ROW_COUNT;
  v_count := v_count + v_batch;

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION apply_learned_filters() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION apply_learned_filters() TO authenticated, service_role;
