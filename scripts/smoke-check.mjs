import { existsSync, readFileSync } from 'node:fs';

const envFiles = ['.env.vercel-pull.local', '.env.local', '.env.secrets.local'];

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const idx = trimmed.indexOf('=');
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] ||= value.replace(/\\n/g, '').trim();
  }
}

for (const file of envFiles) loadEnvFile(file);

const requiredClient = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
const requiredServer = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CRON_SECRET'];
const recommended = [
  'META_WEBHOOK_VERIFY_TOKEN',
  'META_APP_SECRET',
  'META_PAGE_ACCESS_TOKEN',
  'META_PIXEL_ID',
  'META_CAPI_TOKEN',
  'GOOGLE_LEADS_WEBHOOK_KEY',
  'GOOGLE_ADS_DEVELOPER_TOKEN',
  'GOOGLE_ADS_REFRESH_TOKEN',
  'GOOGLE_ADS_CONVERSION_ACTION_ID',
  'GOOGLE_SOLAR_API_KEY',
  'AUTOMATION_SECRET',
  'WHATSAPP_SYNC_SECRET',
];

function present(key) {
  return Boolean(process.env[key] && !String(process.env[key]).startsWith('your-'));
}

function reportKeys(title, keys) {
  console.log(`\n${title}`);
  for (const key of keys) {
    console.log(`${present(key) ? 'ok  ' : 'miss'} ${key}`);
  }
}

console.log('Solaris Panama platform smoke check');
console.log(`cwd: ${process.cwd()}`);

reportKeys('Client env', requiredClient);
reportKeys('Server env', requiredServer);
reportKeys('Recommended integrations', recommended);

const appFiles = ['app.html', 'vercel.json', 'src/App.tsx', 'api/leads/intake.ts'];
console.log('\nRequired files');
for (const file of appFiles) {
  console.log(`${existsSync(file) ? 'ok  ' : 'miss'} ${file}`);
}

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (url && key) {
  const res = await fetch(`${url}/rest/v1/leads?select=id`, {
    method: 'HEAD',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'count=exact',
    },
  });
  console.log('\nSupabase leads table');
  console.log(`${res.ok ? 'ok  ' : 'fail'} HTTP ${res.status}`);
  const count = res.headers.get('content-range')?.split('/')?.[1];
  if (count) console.log(`ok   lead rows: ${count}`);
} else {
  console.log('\nSupabase leads table');
  console.log('skip missing Supabase env');
}
