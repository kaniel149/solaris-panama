-- ============================================================================
-- Migration 059: lead_events table + zone column on leads
-- Additive only — no constraints on existing columns.
-- ============================================================================

-- Lead events table: meetings and follow-ups linked to CRM leads
CREATE TABLE IF NOT EXISTS lead_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  event_type text NOT NULL DEFAULT 'meeting' CHECK (event_type IN ('meeting','follow_up','other')),
  title text NOT NULL,
  notes text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','done','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_events_starts_at ON lead_events(starts_at);
CREATE INDEX IF NOT EXISTS idx_lead_events_lead_id ON lead_events(lead_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_lead_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lead_events_updated_at ON lead_events;
CREATE TRIGGER lead_events_updated_at
  BEFORE UPDATE ON lead_events
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_events_updated_at();

-- RLS — mirrors the pattern from migration 002 (leads table policies)
ALTER TABLE lead_events ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all lead_events
CREATE POLICY "Authenticated users can read lead_events"
  ON lead_events FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert lead_events
CREATE POLICY "Authenticated users can insert lead_events"
  ON lead_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update lead_events
CREATE POLICY "Authenticated users can update lead_events"
  ON lead_events FOR UPDATE
  TO authenticated
  USING (true);

-- Authenticated users can delete lead_events
CREATE POLICY "Authenticated users can delete lead_events"
  ON lead_events FOR DELETE
  TO authenticated
  USING (true);

-- Add zone column to leads (free-text, no constraint — safe for existing rows)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS zone text;
CREATE INDEX IF NOT EXISTS idx_leads_zone ON leads(zone) WHERE zone IS NOT NULL;
