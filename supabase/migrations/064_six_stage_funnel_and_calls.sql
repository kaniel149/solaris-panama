-- 064: Six-stage funnel + call logging
-- New canonical funnel: new -> contacted (llamada) -> visit_scheduled (visita)
--                       -> proposal_sent -> signed (firmado) -> paid (pagado)
-- leads.status has no CHECK constraint (verified) — data remap only.

-- 1. Allow 'call' events (for the "Registrar llamada" quick action + call counts)
ALTER TABLE lead_events DROP CONSTRAINT IF EXISTS lead_events_event_type_check;
ALTER TABLE lead_events ADD CONSTRAINT lead_events_event_type_check
  CHECK (event_type = ANY (ARRAY['meeting'::text, 'follow_up'::text, 'call'::text, 'other'::text]));

-- 2. Remap legacy statuses to the new funnel
--    qualified with WhatsApp tier L3 (= cotización enviada) -> proposal_sent
UPDATE leads SET status = 'proposal_sent'
WHERE status = 'qualified' AND (raw_data->>'contact_tier') = '3';
--    remaining qualified (conversations) -> contacted
UPDATE leads SET status = 'contacted' WHERE status = 'qualified';
--    won -> signed (paid is the new final stage)
UPDATE leads SET status = 'signed' WHERE status = 'won';
