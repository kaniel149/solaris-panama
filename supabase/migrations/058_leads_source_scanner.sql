-- 058_leads_source_scanner.sql
-- The roof scanner posts leads with source='scanner'
-- (RoofScannerPage.tsx → POST /api/leads/intake → leads.insert({ source })).
-- But leads_source_check (migration 009) never included 'scanner', so EVERY
-- scanner-originated lead violated the CHECK and was rejected at insert time
-- (the lead was silently lost). Add 'scanner' to the allow-list so scanner
-- leads persist while keeping their true attribution (rather than masquerading
-- them as 'manual').

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_source_check;

ALTER TABLE leads
  ADD CONSTRAINT leads_source_check
  CHECK (source IN (
    'google_ads',
    'meta_ads',
    'lp_azuero',
    'facebook',
    'instagram',
    'whatsapp',
    'website',
    'manual',
    'referral',
    'cold_call',
    'event',
    'debug_test',
    'capi_verify',
    'scanner'
  )) NOT VALID;
