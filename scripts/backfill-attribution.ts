/**
 * Backfill attribution for existing leads where utm_source IS NULL AND gclid IS NOT NULL.
 *
 * These leads came from Google Ads (confirmed by gclid presence) but were inserted
 * before the inferAttribution() logic was added in api/lib/attribution.ts.
 * Setting utm_source='google' and utm_medium='cpc' on them restores their attribution
 * so the CRM dashboard, reports, and Google offline conversion cron all work correctly.
 *
 * DO NOT EXECUTE AUTOMATICALLY. Run manually after verifying the count:
 *
 *   # Dry-run (see how many rows would be updated):
 *   DRY_RUN=true npx tsx scripts/backfill-attribution.ts
 *
 *   # Live run:
 *   npx tsx scripts/backfill-attribution.ts
 *
 * Required env vars (same as intake API):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * You can source them from the whatsapp-bridge/.env:
 *   export $(grep -v '^#' ../whatsapp-bridge/.env | xargs)
 *   npx tsx scripts/backfill-attribution.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const DRY_RUN = process.env.DRY_RUN === 'true';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('[backfill] ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  console.log('[backfill] Starting attribution backfill...');
  console.log('[backfill] DRY_RUN:', DRY_RUN);
  console.log('[backfill] Supabase project:', SUPABASE_URL.match(/\/\/([^.]+)/)?.[1] ?? 'unknown');

  // 1. Count leads that need backfill
  const { count, error: countError } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .is('utm_source', null)
    .not('gclid', 'is', null);

  if (countError) {
    console.error('[backfill] Count query failed:', countError);
    process.exit(1);
  }

  console.log(`[backfill] Leads to update: ${count ?? 0}`);

  if (!count || count === 0) {
    console.log('[backfill] Nothing to backfill. Exiting.');
    process.exit(0);
  }

  if (DRY_RUN) {
    console.log('[backfill] DRY_RUN=true — no rows were modified.');
    console.log('[backfill] Re-run without DRY_RUN=true to apply changes.');
    process.exit(0);
  }

  // 2. Fetch IDs of leads to update (batch of 200 — all should fit for current DB size)
  const { data: leads, error: fetchError } = await supabase
    .from('leads')
    .select('id, gclid, utm_campaign, created_at')
    .is('utm_source', null)
    .not('gclid', 'is', null)
    .order('created_at', { ascending: true })
    .limit(500);

  if (fetchError || !leads) {
    console.error('[backfill] Fetch failed:', fetchError);
    process.exit(1);
  }

  console.log(`[backfill] Fetched ${leads.length} rows. Updating...`);

  let updated = 0;
  let failed = 0;

  for (const lead of leads) {
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        utm_source: 'google',
        utm_medium: 'cpc',
        // Preserve existing utm_campaign if set; otherwise mark as backfilled
        utm_campaign: lead.utm_campaign || 'gclid_inferred',
        attribution_debug: {
          backfilled: true,
          backfill_reason: 'gclid_present_utm_missing',
          backfill_date: new Date().toISOString(),
          raw_utm_source: null,
          gclid_present: true,
          fbclid_present: false,
          inferred: true,
          infer_reason: 'gclid_present',
          resolved_utm_source: 'google',
        },
      })
      .eq('id', lead.id);

    if (updateError) {
      console.error(`[backfill] Failed to update lead ${lead.id}:`, updateError.message);
      failed++;
    } else {
      updated++;
    }
  }

  console.log(`[backfill] Done. Updated: ${updated} | Failed: ${failed}`);

  // 3. Verify result
  const { count: remaining } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .is('utm_source', null)
    .not('gclid', 'is', null);

  console.log(`[backfill] Remaining leads with gclid but no utm_source: ${remaining ?? 'unknown'}`);
}

main().catch((err) => {
  console.error('[backfill] Unhandled error:', err);
  process.exit(1);
});
