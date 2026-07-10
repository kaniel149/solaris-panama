/**
 * Creates the Roi sales user + team_members row + monitor-state seed.
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/create-monitored-sales-user.mjs
 * Prints the generated 6-digit password ONCE — deliver it to the user, do not store it.
 */
import { createClient } from '@supabase/supabase-js';
import { randomInt } from 'node:crypto';

const EMAIL = 'tesler.roi@gmail.com';
const FULL_NAME = 'Roi Tesler';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const supabase = createClient(url, key);

const password = String(randomInt(100000, 1000000)); // 6 digits, crypto-random

let userId;
let passwordNote;

const { data: created, error: authErr } = await supabase.auth.admin.createUser({
  email: EMAIL,
  password,
  email_confirm: true,
});

if (authErr) {
  // Already exists? Look it up and continue seeding (re-run safety). Any other error → abort.
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = list?.users?.find((u) => u.email?.toLowerCase() === EMAIL);
  if (listErr || !existing) {
    console.error('Auth user creation failed:', authErr.message);
    process.exit(1);
  }
  userId = existing.id;
  passwordNote = '(existing user — password UNCHANGED; the one printed on the first successful run still applies)';
  console.log('ℹ️  Auth user already exists — continuing with team_members/state seeding.');
} else {
  userId = created.user.id;
  passwordNote = password + '  ← deliver to Roi, recommend changing on first login';
}

const { error: tmErr } = await supabase
  .from('team_members')
  .upsert({ email: EMAIL, full_name: FULL_NAME, role: 'sales', is_active: true }, { onConflict: 'email' });
if (tmErr) {
  console.error('team_members upsert failed:', tmErr.message);
  process.exit(1);
}

const { error: stateErr } = await supabase
  .from('activity_monitor_state')
  .upsert({ user_id: userId });
if (stateErr) {
  console.error('monitor state seed failed:', stateErr.message);
  process.exit(1);
}

console.log('✅ User ready');
console.log('   user_id :', userId);
console.log('   email   :', EMAIL);
console.log('   password:', passwordNote);
