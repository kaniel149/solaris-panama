-- Public (anonymous) scanner support + solar fields on leads
ALTER TABLE roof_scans ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE roof_scans ADD COLUMN IF NOT EXISTS owner_json JSONB;
ALTER TABLE roof_scans ADD COLUMN IF NOT EXISTS financials_json JSONB;
ALTER TABLE roof_scans ADD COLUMN IF NOT EXISTS finca_number TEXT;
-- 'ai_vision' / 'nasa_estimate' sources
ALTER TABLE roof_scans DROP CONSTRAINT IF EXISTS roof_scans_source_check;
ALTER TABLE roof_scans ADD CONSTRAINT roof_scans_source_check
  CHECK (source IN ('google_solar','local_panama','pvwatts','ai_vision','nasa_estimate','manual'));

ALTER TABLE leads ADD COLUMN IF NOT EXISTS system_kwp NUMERIC(6,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS annual_kwh INT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS est_annual_savings_usd NUMERIC(10,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS payback_years NUMERIC(4,1);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS finca_number TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS roof_area_m2 NUMERIC(8,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS scan_source TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS roof_scan_id UUID REFERENCES roof_scans(id) ON DELETE SET NULL;
