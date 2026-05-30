-- Roof scans table
CREATE TABLE IF NOT EXISTS roof_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  
  -- Location
  address TEXT NOT NULL,
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  
  -- Scan metadata
  source TEXT NOT NULL CHECK (source IN ('google_solar', 'local_panama', 'pvwatts', 'pvwatts_estimate', 'manual')),
  quality TEXT NOT NULL CHECK (quality IN ('HIGH', 'MEDIUM', 'BASE', 'ESTIMATED')),
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Roof data
  total_roof_m2 NUMERIC(8,2),
  usable_roof_m2 NUMERIC(8,2),
  roof_segments JSONB DEFAULT '[]'::jsonb,
  
  -- System design
  panel_count INT,
  system_kwp NUMERIC(6,2),
  yearly_kwh INT,
  monthly_kwh JSONB DEFAULT '[]'::jsonb,
  
  -- Panel layout (manual override)
  panel_layout JSONB,
  custom_placement BOOLEAN DEFAULT false,
  
  -- Sharing
  public_share_token TEXT UNIQUE,
  shared_at TIMESTAMPTZ,
  
  -- Raw API responses
  raw_api_response JSONB,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_roof_scans_company ON roof_scans(company_id);
CREATE INDEX IF NOT EXISTS idx_roof_scans_project ON roof_scans(project_id);
CREATE INDEX IF NOT EXISTS idx_roof_scans_lead ON roof_scans(lead_id);
CREATE INDEX IF NOT EXISTS idx_roof_scans_share_token ON roof_scans(public_share_token);
CREATE INDEX IF NOT EXISTS idx_roof_scans_created_by ON roof_scans(created_by);

-- RLS policies
ALTER TABLE roof_scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their company's scans" ON roof_scans;
CREATE POLICY "Users can view their company's scans"
  ON roof_scans FOR SELECT
  TO authenticated
  USING (true);

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

DROP POLICY IF EXISTS "Service role can manage scans" ON roof_scans;
CREATE POLICY "Service role can manage scans"
  ON roof_scans FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Public share tokens accessible by anyone" ON roof_scans;
CREATE POLICY "Public share tokens accessible by anyone"
  ON roof_scans FOR SELECT
  USING (public_share_token IS NOT NULL);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_roof_scans_updated_at ON roof_scans;
CREATE TRIGGER update_roof_scans_updated_at
  BEFORE UPDATE ON roof_scans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
