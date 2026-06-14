-- 055: Single-team visibility — every authenticated user sees & edits ALL
-- roof_scans + scan_requests (previously scoped to created_by/requested_by = auth.uid()).
-- leads already had a permissive SELECT (true). Applied to prod 2026-06-14.

-- roof_scans
DROP POLICY IF EXISTS "Users can view their own scans" ON roof_scans;
DROP POLICY IF EXISTS "Users can update their company's scans" ON roof_scans;
CREATE POLICY "Authenticated can read all scans" ON roof_scans
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can update all scans" ON roof_scans
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- scan_requests
DROP POLICY IF EXISTS "Users can view their own scan requests" ON scan_requests;
CREATE POLICY "Authenticated can read all scan requests" ON scan_requests
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage scan requests" ON scan_requests
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
