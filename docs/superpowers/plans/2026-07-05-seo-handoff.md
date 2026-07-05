# Solaris Panama — SEO Handoff (2026-07-05)

All 3 phases live on https://solaris-panama.com (technical SEO · design polish · English pages).
Post-deploy verification passed: Lighthouse SEO 100 (/, /en/solar-pedasi.html), structured data valid on 4 key pages, lead form E2E → 201.

## 1. Google Search Console (Kaniel — ~10 min)

Verification is already in place: `public/google18e971113caa3730.html` is deployed **and** the meta tag is in the homepage `<head>`.

1. Go to https://search.google.com/search-console → Add property → **URL prefix** `https://solaris-panama.com` → verification should pass automatically (HTML file / meta tag).
2. Sitemaps (left menu) → submit `sitemap.xml`.
3. URL Inspection → **Request indexing** for each of:
   - `https://solaris-panama.com/`
   - `https://solaris-panama.com/en/solar-pedasi.html`
   - `https://solaris-panama.com/towns/solar-pedasi.html`
   - `https://solaris-panama.com/towns/solar-chitre.html`
   - `https://solaris-panama.com/towns/solar-las-tablas.html`
4. After ~1 week: check Coverage report — towns + /en/ pages should start appearing. Legal pages (privacidad/términos) are **noindex by design** — do not "fix".

## 2. Google Business Profile (Kaniel — ~20 min)

1. https://business.google.com → Create profile: **Solaris Energy**.
2. Business type: **Service-area business** (no storefront address shown).
3. Service areas: **Pedasí, Chitré, Las Tablas, Los Santos** (Azuero region).
4. Primary category: **Solar energy company** (secondary: Solar energy contractor).
5. Website: `https://solaris-panama.com` · Phone: +507 6583-1822 (same as site → NAP consistency) · add WhatsApp as chat/message option.
6. Upload **5 real installation photos** (panels on roofs, team at work — no stock).
7. Verification is usually by phone/video for service-area businesses in Panama.

## 3. Next 5 Blog Topics

| # | Lang | Topic / target query |
|---|------|----------------------|
| 1 | EN | Cost of solar panels in Panama for expats (2026 prices, real quotes) |
| 2 | EN | Panama net metering explained in English (Ley 417, how credits work) |
| 3 | EN | Solar for beach houses: salt air, humidity & what equipment survives |
| 4 | ES | Paneles solares en Chitré: caso real con números (factura antes/después) |
| 5 | ES | Energía solar para hoteles en Pedasí: ROI para hospitalidad |

Pattern: publish under `/blog/` (ES) and `/en/` (EN), add BreadcrumbList + Article schema like `ley-417-panama.html`, interlink to the matching town page.

## 4. Known Leftovers (non-blocking)

- **`lang-toggle.js` missing** — all 13 `/towns/*.html` pages load `../lang-toggle.js`, which does not exist in `public/` → silent 404, toggle button CSS exists but no behavior. Either add the script or strip the references.
- **Comercial project-card photo** is an electrician stock-style photo — swap for a real commercial install photo when available.
- **Legal pages noindex** (`politica-de-privacidad`, `terminos-de-servicio`) — intentional, leave as is.
- **Performance 58/100 (mobile)** — LCP 9.4s dominated by hero image + 2.4 MB JS chunk. Code splitting is already on the project TODO; that's the real lever, not micro-optimizations.

## 5. Verification Snapshot (2026-07-05)

- Lighthouse mobile `/`: Performance 58 · Accessibility 88 · SEO 100 (baseline: 56/88/100).
- Lighthouse `/en/solar-pedasi.html`: SEO 100.
- JSON-LD valid on `/`, `/towns/solar-pedasi.html`, `/en/solar-pedasi.html`, `/blog/ley-417-panama.html` (FAQPage, LocalBusiness/ElectricalContractor, BreadcrumbList, Article, Service — all required fields present).
- Form smoke: POST `/api/leads/intake` → **201**, lead `358e97d9-984e-45fa-afdf-59b2c107c508` ("TEST Fable — borrar / do not call", +50700000000) → **delete from CRM** after review.
