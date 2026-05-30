-- ============================================================================
-- Migration 052: Harden scanner RPC grants
-- ============================================================================
-- Postgres grants EXECUTE on functions to PUBLIC by default, which exposed the
-- new SECURITY DEFINER scanner RPCs to the anon role (flagged by the Supabase
-- security advisor, lint 0028/0029). Revoke PUBLIC/anon and grant only to the
-- intended roles: authenticated callers + service_role (the cron worker).
-- ============================================================================

REVOKE EXECUTE ON FUNCTION save_roof_geom(uuid, jsonb, numeric, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION insert_detected_roof(jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION create_scan_request(jsonb, numeric[], jsonb) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION save_roof_geom(uuid, jsonb, numeric, numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION insert_detected_roof(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION create_scan_request(jsonb, numeric[], jsonb) TO authenticated, service_role;
