-- Mega-roofs (Albrook Mall etc.) exceed NUMERIC(6,2) cap of 9,999.99 kWp.
-- Applied to prod 2026-06-12.
ALTER TABLE roof_scans ALTER COLUMN system_kwp TYPE NUMERIC(9,2);
