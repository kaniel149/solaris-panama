// scripts/seo-audit.mjs — scan public/ HTML for SEO gaps. Zero deps.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'public';
const SKIP = new Set(['portal.html', 'dekel-panama-leads.html', 'google18e971113caa3730.html', 'home.html']);
const files = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) { if (!['data'].includes(f)) walk(p); }
    else if (f.endsWith('.html') && !SKIP.has(f)) files.push(p);
  }
})(ROOT);

const checks = {
  title: h => /<title>[^<]{10,65}<\/title>/i.test(h),
  metaDesc: h => /<meta name="description" content="[^"]{50,165}"/i.test(h),
  canonical: h => /<link rel="canonical"/i.test(h),
  ogTitle: h => /property="og:title"/i.test(h),
  ogImage: h => /property="og:image"/i.test(h),
  jsonLd: h => /application\/ld\+json/i.test(h),
  ga4: h => /G-HSGBK44MXZ/.test(h),
  hreflang: h => /hreflang=/.test(h),
  lazyImg: h => !/<img(?![^>]*loading=)[^>]*src="(?!data:)/i.test(h) || !/<img/i.test(h),
  h1: h => (h.match(/<h1[\s>]/gi) || []).length === 1,
};
let fails = 0;
for (const f of files.sort()) {
  const html = readFileSync(f, 'utf8');
  const bad = Object.entries(checks).filter(([, fn]) => !fn(html)).map(([k]) => k);
  if (bad.length) { fails++; console.log(`✗ ${f}: ${bad.join(', ')}`); }
}
console.log(`\n${files.length} pages scanned, ${fails} with issues`);
process.exit(0);
