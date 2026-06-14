-- 057: create_scan_request reads scan_type from filters->>'scan_type' and sets
-- the scan_requests.scan_type column, so land scans actually trigger the cron
-- land branch (frontend passes filters.scan_type = 'land'). Applied to prod 2026-06-14.
CREATE OR REPLACE FUNCTION create_scan_request(p_area jsonb, p_bbox numeric[], p_filters jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_id uuid; v_scan_type text;
BEGIN
  v_scan_type := COALESCE(p_filters->>'scan_type', 'roof');
  IF v_scan_type NOT IN ('roof','land') THEN v_scan_type := 'roof'; END IF;
  INSERT INTO scan_requests (area_geojson, bbox, filters, status, scan_type, requested_by)
  VALUES (p_area, p_bbox, COALESCE(p_filters,'{}'), 'queued', v_scan_type, auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
GRANT EXECUTE ON FUNCTION create_scan_request(jsonb, numeric[], jsonb) TO authenticated;
