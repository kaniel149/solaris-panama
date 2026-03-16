-- Roof scans table
CREATE TABLE IF NOT EXISTS roof_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  
  -- Location
  address TEXT NOT NULL,
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  
  -- Scan metadata
  source TEXT NOT NULL CHECK (source IN ('google_solar', 'local_panama', 'pvwatts', 'manual')),
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
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_roof_scans_company ON roof_scans(company_id);
CREATE INDEX idx_roof_scans_project ON roof_scans(project_id);
CREATE INDEX idx_roof_scans_lead ON roof_scans(lead_id);
CREATE INDEX idx_roof_scans_share_token ON roof_scans(public_share_token);
CREATE INDEX idx_roof_scans_created_by ON roof_scans(created_by);

-- RLS policies
ALTER TABLE roof_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's scans"
  ON roof_scans FOR SELECT
  USING (company_id IN (SELECT company_id FROM team_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert scans for their company"
  ON roof_scans FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM team_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their company's scans"
  ON roof_scans FOR UPDATE
  USING (company_id IN (SELECT company_id FROM team_members WHERE user_id = auth.uid()));

CREATE POLICY "Public share tokens accessible by anyone"
  ON roof_scans FOR SELECT
  USING (public_share_token IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_roof_scans_updated_at
  BEFORE UPDATE ON roof_scans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
