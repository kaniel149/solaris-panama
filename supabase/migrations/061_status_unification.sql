-- Applied to prod 2026-07-08 via MCP. Unifies legacy WhatsApp statuses into canonical funnel.
-- ============================================================================
-- Migration 061: status unification (documentation of an already-applied data fix)
--
-- Legacy WhatsApp-bridge flows wrote lead.status values ('cold','warm','hot')
-- that never existed in the canonical funnel. This maps them onto the funnel:
--   cold → contacted, warm → qualified, hot → qualified.
--
-- Idempotent: the WHERE clause only touches the three legacy values, so a
-- second run (after the first has already remapped them) matches zero rows.
-- Data-only — no schema/constraint changes.
-- ============================================================================

UPDATE leads
SET status = CASE status
  WHEN 'cold' THEN 'contacted'
  WHEN 'warm' THEN 'qualified'
  WHEN 'hot'  THEN 'qualified'
  ELSE status
END
WHERE status IN ('cold', 'warm', 'hot');
