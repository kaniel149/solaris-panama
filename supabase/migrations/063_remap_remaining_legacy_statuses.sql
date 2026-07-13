-- 063: Remap remaining legacy lead statuses missed by migration 061
-- (27 rows from 2026-04-14/16, sources: whatsapp + lp_azuero — predate 061)
-- cold -> contacted, warm/hot -> qualified (same mapping as 061)
UPDATE leads
SET status = CASE status
  WHEN 'cold' THEN 'contacted'
  WHEN 'warm' THEN 'qualified'
  WHEN 'hot'  THEN 'qualified'
END
WHERE status IN ('cold', 'warm', 'hot');
