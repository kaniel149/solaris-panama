-- 062: user attribution on activity tables + activity monitor state
-- Enables per-user activity tracking (Roi alerts) with zero frontend changes.

-- ── attribution columns ──
ALTER TABLE lead_events ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();
ALTER TABLE tasks       ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();
ALTER TABLE lead_status_history ADD COLUMN IF NOT EXISTS changed_by uuid;
ALTER TABLE leads       ADD COLUMN IF NOT EXISTS updated_by uuid;

CREATE INDEX IF NOT EXISTS idx_lead_events_created_by ON lead_events(created_by, created_at DESC) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by, created_at DESC) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lead_status_history_changed_by ON lead_status_history(changed_by, changed_at DESC) WHERE changed_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_updated_by ON leads(updated_by, updated_at DESC) WHERE updated_by IS NOT NULL;

-- ── stamp changed_by in the existing status-history trigger ──
CREATE OR REPLACE FUNCTION record_lead_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO lead_status_history(lead_id, old_status, new_status, changed_at, changed_by)
    VALUES (NEW.id, NULL, NEW.status, now(), auth.uid());
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO lead_status_history(lead_id, old_status, new_status, changed_at, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, now(), auth.uid());
  END IF;
  RETURN NULL;
END;
$$;

-- ── stamp updated_by on leads updates (keeps previous value for service-role writes) ──
CREATE OR REPLACE FUNCTION stamp_leads_updated_by()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_by = COALESCE(auth.uid(), NEW.updated_by);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_updated_by ON leads;
CREATE TRIGGER trg_leads_updated_by
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION stamp_leads_updated_by();

-- ── cron state (service-role access only — RLS on, no policies) ──
CREATE TABLE IF NOT EXISTS activity_monitor_state (
  user_id uuid PRIMARY KEY,
  last_seen_sign_in_at timestamptz,
  session_started_at timestamptz,
  session_last_activity_at timestamptz,
  last_summary_sent_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE activity_monitor_state ENABLE ROW LEVEL SECURITY;
