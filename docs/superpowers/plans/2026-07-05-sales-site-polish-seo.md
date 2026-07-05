# Solaris Panama Sales Site — Design Polish + SEO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the public sales site design and complete its SEO so Azuero town queries rank #1, with English pages for expats — no rebuild.

**Architecture:** All live public pages are static HTML in `public/` (Vite copies them verbatim to `dist/`; `app.html` is the React CRM entry). Every change happens in `public/`. Root-level HTML files (`landing-page.html`, `servicios.html`, `towns/` at root) are STALE duplicates — never edit or delete them.

**Tech Stack:** Static HTML/CSS (DM Serif Display + DM Sans design system already in each page), Node scripts (`scripts/*.mjs`), Vercel project `landing`, GA4 `G-HSGBK44MXZ`, Google Ads `AW-18049688013`, Meta Pixel `928138543031656`.

**Hard constraints:**
- Do NOT touch `<form id="leadForm">` logic, `/lead-tracking.js`, pixel/gtag init blocks (except ADDING GA4 config line as specified).
- Do NOT delete/archive anything.
- Deploy = `git push` to `main` (Vercel auto-deploys project `landing`). Verify env vars unchanged — this plan adds none.
- Phone/WhatsApp: `+507 6583-1822` → `https://wa.me/50765831822`.

---

## Phase 0 — Baseline

### Task 1: Capture baseline

**Files:**
- Create: `docs/superpowers/plans/2026-07-05-baseline.md`

- [ ] **Step 1: Lighthouse baseline (mobile) on live homepage**

Run:
```bash
npx --yes lighthouse https://solaris-panama.com/ --only-categories=performance,seo,accessibility --preset=perf --form-factor=mobile --screenEmulation.mobile --chrome-flags="--headless" --output=json --output-path=/tmp/lh-baseline.json --quiet
node -e "const r=require('/tmp/lh-baseline.json');console.log(Object.entries(r.categories).map(([k,v])=>k+': '+Math.round(v.score*100)).join('\n'))"
```
Expected: three scores printed (record them).

- [ ] **Step 2: Record baseline doc**

Write the 3 scores + date + top-5 Lighthouse opportunities (from `r.audits` with `details.overallSavingsMs`) into `docs/superpowers/plans/2026-07-05-baseline.md`.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-07-05-baseline.md
git commit -m "docs: lighthouse baseline before sales-site polish"
```

---

## Phase 1 — Technical SEO

### Task 2: SEO audit script (used before AND after)

**Files:**
- Create: `scripts/seo-audit.mjs`

- [ ] **Step 1: Write the audit script**

```js
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
```

- [ ] **Step 2: Run it, save output as the gap list**

Run: `node scripts/seo-audit.mjs | tee /tmp/seo-gaps.txt`
Expected: table of pages with named gaps (ga4/hreflang expected to fail everywhere initially).

- [ ] **Step 3: Commit**

```bash
git add scripts/seo-audit.mjs
git commit -m "feat(seo): add public-pages SEO audit script"
```

### Task 3: GA4 on all static pages

**Files:**
- Modify: every `public/**/*.html` page that has the `AW-18049688013` gtag block; pages without any gtag get the full snippet.

- [ ] **Step 1: Pages WITH existing gtag block** — add one line after `gtag('config', 'AW-18049688013');`:

```js
gtag('config', 'G-HSGBK44MXZ');
```

- [ ] **Step 2: Pages WITHOUT gtag** (check via `grep -L googletagmanager public/**/*.html`) — insert before `</head>`:

```html
<!-- Google tag (GA4 + Ads) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-HSGBK44MXZ"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-HSGBK44MXZ');
  gtag('config', 'AW-18049688013');
</script>
```

- [ ] **Step 3: Verify**

Run: `node scripts/seo-audit.mjs | grep ga4`
Expected: no output (no page missing ga4).

- [ ] **Step 4: Commit**

```bash
git add public && git commit -m "feat(seo): GA4 G-HSGBK44MXZ on all static public pages"
```

### Task 4: Close per-page head gaps (title/meta/canonical/OG/schema)

**Files:**
- Modify: every page flagged by `/tmp/seo-gaps.txt` for title/metaDesc/canonical/ogTitle/ogImage/jsonLd/h1.

- [ ] **Step 1: Fix each flagged page.** Rules:
  - Title format: `<Primary keyword> — Solaris Energy` (≤60 chars). Towns: `Paneles Solares en <Town> — Solaris Energy`. Blog: keep H1-derived titles.
  - Meta description 120–160 chars, includes keyword + "Ley 417" + CTA "Cotización gratis".
  - Canonical: absolute `https://solaris-panama.com/<path>` (blog/towns keep `.html`).
  - OG: `og:title`, `og:description`, `og:url`, `og:type=website` (blog: `article`), `og:image` → `https://solaris-panama.com/og-solaris.jpg` (created in Task 7), `og:locale=es_PA`.
  - Pages missing JSON-LD get `BreadcrumbList` + type-appropriate schema: `Service` (servicios, solar-residencial, solar-comercial), `AboutPage` (nosotros), `ContactPage` (contacto), `BlogPosting` (blog posts missing it).
  - Exactly one `<h1>` per page.

BreadcrumbList template (adjust names/urls per page):
```html
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
 {"@type":"ListItem","position":1,"name":"Inicio","item":"https://solaris-panama.com/"},
 {"@type":"ListItem","position":2,"name":"<PAGE NAME>","item":"https://solaris-panama.com/<path>"}]}
</script>
```

- [ ] **Step 2: Verify**

Run: `node scripts/seo-audit.mjs`
Expected: remaining failures ONLY `hreflang` (fixed in Phase 3) and possibly `lazyImg` (Task 6).

- [ ] **Step 3: Commit**

```bash
git add public && git commit -m "feat(seo): unique titles, meta, canonical, OG, schema on all public pages"
```

### Task 5: Internal linking mesh

**Files:**
- Modify: `public/index.html`, all `public/towns/*.html`, `public/blog/*.html`

- [ ] **Step 1: Footer link block on homepage** — inside existing footer, add a "Zonas de servicio" column linking all 13 town pages by name, and a "Guías" column linking the top 5 blog posts (`ley-417-panama`, `cuanto-cuestan-paneles-solares-panama`, `net-metering-panama`, `financiamiento-paneles-solares-panama`, `retorno-inversion-paneles-solares-panama`). Match existing footer markup/classes.

- [ ] **Step 2: Town pages** — before the final CTA section of each town page add:

```html
<section class="related-links" style="padding:3rem 1.5rem;max-width:1100px;margin:0 auto">
  <h2 style="font-size:1.4rem;margin-bottom:1rem">Recursos útiles</h2>
  <ul style="display:grid;gap:.5rem;list-style:none;padding:0">
    <li><a href="/blog/cuanto-cuestan-paneles-solares-panama.html">¿Cuánto cuestan los paneles solares en Panamá? (2026)</a></li>
    <li><a href="/blog/ley-417-panama.html">Ley 417: beneficios fiscales para energía solar</a></li>
    <li><a href="/blog/net-metering-panama.html">Net metering en Panamá: cómo funciona</a></li>
  </ul>
  <p style="margin-top:1rem">También instalamos en: <!-- 3 neighboring towns as links, e.g. Pedasí → Las Tablas, Cañas, Playa Venao --></p>
</section>
```
Neighbor map: pedasi↔[las-tablas,canas,playa-venao] · chitre↔[los-santos,parita,ocu] · las-tablas↔[guarare,pedasi,pocri] · playa-venao↔[pedasi,canas,tonosi] · canas↔[pedasi,tonosi,playa-venao] · los-santos↔[chitre,guarare,macaracas] · guarare↔[las-tablas,los-santos,pocri] · ocu↔[chitre,parita,santiago] · macaracas↔[los-santos,tonosi,las-tablas] · pocri↔[pedasi,las-tablas,guarare] · tonosi↔[macaracas,canas,pedasi] · parita↔[chitre,ocu,santiago] · santiago↔[ocu,parita,chitre].

- [ ] **Step 3: Blog posts** — ensure each post links to ≥1 town page + ≥1 other post (add a short "Zonas donde instalamos" line before the post footer where missing).

- [ ] **Step 4: Verify + commit**

Run: `node -e "const{execSync}=require('child_process');const o=execSync('grep -L related-links public/towns/*.html').toString();console.log(o||'all towns linked')"` → expect `all towns linked`.
```bash
git add public && git commit -m "feat(seo): internal linking mesh (footer, towns, blog)"
```

### Task 6: Performance pass

**Files:**
- Modify: `public/index.html` + any page with external/unoptimized images
- Create: `public/img/` (self-hosted WebP)

- [ ] **Step 1: Self-host the 2 Unsplash images on the homepage.** Download each at width 1600, convert:

```bash
mkdir -p public/img
# for each unsplash URL found via: grep -o 'https://images.unsplash[^"]*' public/index.html
curl -sL "<URL>&w=1600&fm=webp&q=78" -o public/img/<descriptive-name>.webp
```
Replace `src` with `/img/<name>.webp`, add `width`/`height` matching aspect ratio, `loading="lazy"` (NOT on the hero/LCP image — hero gets `fetchpriority="high"`).

- [ ] **Step 2: All other `<img>` across public/**: add `loading="lazy"` + explicit `width`/`height` (skip first/LCP image per page).

- [ ] **Step 3: Fonts** — confirm `&display=swap` in every Google Fonts URL; add `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` where missing.

- [ ] **Step 4: Verify + commit**

Run: `node scripts/seo-audit.mjs | grep lazyImg` → expect empty.
```bash
git add public && git commit -m "perf: self-hosted webp images, lazy loading, font preconnect"
```

### Task 7: OG image + sitemap regen + deploy Phase 1

**Files:**
- Create: `public/og-solaris.jpg` (1200×630), `scripts/generate-sitemap.mjs`
- Modify: `public/sitemap.xml`

- [ ] **Step 1: OG image** — build 1200×630 JPG: deep-green `#0B3D2E` background, gold `#D4A843` accent bar, white "Solaris Energy" + "Paneles Solares en Azuero, Panamá" (DM Serif Display), logo from `public/solaris-logo-dark.png`. Generate with an HTML file + headless Chrome screenshot:

```bash
npx --yes playwright screenshot --viewport-size=1200,630 /tmp/og.html public/og-solaris.jpg
```
(If playwright unavailable, use existing `webapp-testing` skill tooling — never install new deps globally.)

- [ ] **Step 2: Sitemap generator**

```js
// scripts/generate-sitemap.mjs — regenerate public/sitemap.xml from public/ contents
import { readdirSync, writeFileSync } from 'node:fs';
const BASE = 'https://solaris-panama.com';
const today = new Date().toISOString().slice(0, 10);
const EXCLUDE = new Set(['app.html','portal.html','home.html','dekel-panama-leads.html','google18e971113caa3730.html','politica-de-privacidad.html','terminos-de-servicio.html']);
const urls = [{ loc: `${BASE}/`, pri: '1.0', freq: 'weekly' }];
const add = (dir, prefix, pri) => { try { for (const f of readdirSync(`public${dir}`)) if (f.endsWith('.html') && !EXCLUDE.has(f) && f !== 'index.html') urls.push({ loc: `${BASE}${prefix}/${f}`, pri, freq: 'monthly' }); } catch {} };
for (const f of readdirSync('public')) if (f.endsWith('.html') && !EXCLUDE.has(f) && f !== 'index.html') urls.push({ loc: `${BASE}/${f}`, pri: '0.7', freq: 'monthly' });
add('/towns', '/towns', '0.8'); add('/blog', '/blog', '0.9'); add('/en', '/en', '0.8');
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><changefreq>${u.freq}</changefreq><priority>${u.pri}</priority></url>`).join('\n')}\n</urlset>\n`;
writeFileSync('public/sitemap.xml', xml);
console.log(`sitemap: ${urls.length} URLs`);
```

- [ ] **Step 3: Run + verify** — `node scripts/generate-sitemap.mjs` → expect ≥33 URLs; `git diff public/sitemap.xml` sanity check (no CRM/portal URLs).

- [ ] **Step 4: Build + deploy Phase 1**

```bash
npm run build 2>&1 | tail -3        # expect exit 0
git add public scripts && git commit -m "feat(seo): og image + regenerated sitemap"
git push origin main
```
Post-deploy smoke (wait ~2 min): `curl -s -o /dev/null -w '%{http_code}\n' https://solaris-panama.com/ https://solaris-panama.com/sitemap.xml https://solaris-panama.com/towns/solar-pedasi.html` → all `200`. Verify live page contains `G-HSGBK44MXZ`.

---

## Phase 2 — Design Polish

### Task 8: Visual audit (browser) → fix list

- [ ] **Step 1:** Screenshot live homepage (mobile 390×844 + desktop 1440) via Chrome tools or Playwright. Also servicios/contacto/one town page (mobile).
- [ ] **Step 2:** Write concrete fix list to `docs/superpowers/plans/2026-07-05-design-fixes.md`, scored P0/P1. Judge against: CTA visibility above fold, tap targets ≥44px, contrast, spacing rhythm, hero clarity, testimonial credibility, trust signals.

### Task 9: Homepage polish (P0 fixes + specified upgrades)

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1: Trust badge row** directly under hero CTA (use existing design tokens):

```html
<div class="trust-row" style="display:flex;flex-wrap:wrap;gap:1rem 1.75rem;margin-top:1.5rem;font-size:.85rem;color:var(--gray-600)">
  <span>✓ Ley 417 — 100% deducible</span>
  <span>✓ Garantía 25 años en paneles</span>
  <span>✓ Instalación en 1–3 días</span>
  <span>✓ Equipo local en Azuero</span>
</div>
```

- [ ] **Step 2: CTA hierarchy** — primary button = WhatsApp (gold `--gold-500`), secondary = lead form scroll. Ensure sticky mobile CTA bar has WhatsApp first.
- [ ] **Step 3:** Apply P0 items from Task 8 fix list (each as its own commit if non-trivial).
- [ ] **Step 4: Mobile check** — re-screenshot at 390px; no horizontal scroll, tap targets ok.
- [ ] **Step 5: Commit** — `git commit -m "polish: homepage trust badges, CTA hierarchy, P0 visual fixes"`

### Task 10: Inner pages consistency

**Files:**
- Modify: `public/servicios.html`, `public/nosotros.html`, `public/contacto.html`, `public/solar-residencial.html`, `public/solar-comercial.html`

- [ ] **Step 1:** Align header/nav, button styles, footer (with new link block) to homepage tokens. Add WhatsApp float (copy exact markup from `public/towns/solar-pedasi.html:292`) where missing.
- [ ] **Step 2:** Screenshot each at 390px — verify consistent.
- [ ] **Step 3:** `npm run build` ok → commit → push (Phase 2 deploy). Post-deploy smoke: homepage 200 + submit test lead via form → verify it arrives (check CRM leads or Supabase `leads` table) + `fbq` PageView fires (browser network tab).

---

## Phase 3 — English Pages

### Task 11: Create `/en/` pages (3 + hub)

**Files:**
- Create: `public/en/index.html`, `public/en/solar-pedasi.html`, `public/en/solar-playa-venao.html`, `public/en/solar-panels-azuero.html`

- [ ] **Step 1: Template** — copy `public/towns/solar-pedasi.html` structure/design verbatim; translate ALL visible text to natural English (US spelling); `<html lang="en">`. WhatsApp links use English text: `https://wa.me/50765831822?text=Hi%2C%20I%27d%20like%20a%20solar%20quote%20for%20Pedasi`. Keep identical tracking blocks + GA4.

Per-page targeting:
| Page | Title (≤60) | H1 | Primary keyword |
|---|---|---|---|
| en/solar-pedasi.html | Solar Panels in Pedasí, Panama — Solaris Energy | Solar Panels in Pedasí | solar panels pedasi panama |
| en/solar-playa-venao.html | Solar Panels in Playa Venao — Solaris Energy | Solar Power in Playa Venao | solar playa venao |
| en/solar-panels-azuero.html | Solar Panels in Azuero, Panama: 2026 Guide — Solaris | Going Solar in the Azuero Peninsula: Complete Guide | solar panels azuero peninsula |
| en/index.html | Solar Installation in Panama (Azuero) — Solaris Energy | Solar Energy for Your Home in Panama | solar installation panama expat |

Required content blocks per page (write full copy, ~600–900 words each): intro for expat homeowners (US-style billing comparison in USD), "Why solar in <place>" (sun hours, Naturgy/ENSA rates), Law 417 tax benefits explained for foreigners, net metering, process (site visit → design → install 1–3 days), FAQ ×5 (translated from ES FAQ + expat-specific: "Can foreigners get the Law 417 benefit?", "Do you speak English?"), CTA sections. FAQPage + LocalBusiness JSON-LD in English.

- [ ] **Step 2: hreflang pairs** — add to BOTH sides:

In `public/en/solar-pedasi.html` and `public/towns/solar-pedasi.html`:
```html
<link rel="alternate" hreflang="es-PA" href="https://solaris-panama.com/towns/solar-pedasi.html">
<link rel="alternate" hreflang="en" href="https://solaris-panama.com/en/solar-pedasi.html">
<link rel="alternate" hreflang="x-default" href="https://solaris-panama.com/towns/solar-pedasi.html">
```
Same pattern: `towns/solar-playa-venao.html` ↔ `en/solar-playa-venao.html`; `index.html` ↔ `en/index.html`; `en/solar-panels-azuero.html` self-referencing (`hreflang="en"` + x-default only). All other ES pages: NO hreflang (audit script: hreflang check will still flag them — update the script to only require hreflang on the 6 paired files, i.e. change the `hreflang` check to `(h,f)=>!PAIRED.has(f)||/hreflang=/.test(h)` with `const PAIRED=new Set([...])`).

- [ ] **Step 3: Language switcher** — small "EN/ES" link in nav of the 6 paired pages pointing at the counterpart.

- [ ] **Step 4: Verify + regen sitemap + deploy**

```bash
node scripts/seo-audit.mjs           # expect: 0 issues
node scripts/generate-sitemap.mjs    # now includes /en/*
npm run build 2>&1 | tail -3
git add public scripts && git commit -m "feat(seo): English pages for expats + hreflang + language switcher"
git push origin main
```
Post-deploy: `curl -s -o /dev/null -w '%{http_code}\n' https://solaris-panama.com/en/solar-pedasi.html` → 200.

---

## Phase 4 — Indexing & Verification

### Task 12: GSC + GBP + final verification

- [ ] **Step 1: GSC** — site already has verification meta (`google-site-verification` in index). Hand-off note to Kaniel: open https://search.google.com/search-console → property `solaris-panama.com` → Sitemaps → submit `https://solaris-panama.com/sitemap.xml` → Request indexing for `/`, `/en/solar-pedasi.html`, top 3 towns.
- [ ] **Step 2: GBP hand-off note** — create profile "Solaris Energy" service-area business (Pedasí + Azuero), category "Solar energy company", link site + WhatsApp, upload 5 install photos.
- [ ] **Step 3: Rich results** — test 3 URLs (home, one town, one EN page) at https://search.google.com/test/rich-results → FAQ + LocalBusiness detected, 0 errors.
- [ ] **Step 4: Lighthouse after** — same command as Task 1; append scores to baseline doc. Expected: SEO ≥95, perf ≥ baseline+10.
- [ ] **Step 5: E2E smoke** — submit test lead on live form; confirm arrival (CRM/Supabase); confirm GA4 realtime shows the visit.
- [ ] **Step 6: Next-content list** — append to baseline doc: 5 next blog topics (EN: "cost of solar panels in panama for expats", "panama net metering explained", "solar for beach houses humidity/salt"; ES: "paneles solares Chitré caso real", "solar para hoteles Pedasí").
- [ ] **Step 7: Final commit + update CLAUDE.md** Last Session + session-history per session rules.

---

## Self-Review Notes
- Spec coverage: Phase 1→Tasks 2-7, Phase 2→8-10, Phase 3→11, Phase 4→12, baseline/success criteria→1,12. ✓
- All edits confined to `public/`, `scripts/`, `docs/`. Root HTML duplicates untouched. ✓
- Tracking preserved; only additive GA4 line. ✓
