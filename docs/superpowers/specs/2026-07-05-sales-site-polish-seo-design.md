# Solaris Panama — Sales Site Design Polish + SEO (2026-07-05)

## Goal
Rank #1 on Google for Azuero town queries ("paneles solares Pedasí/Chitré/Las Tablas"), build foundation for "paneles solares Panamá", and polish the design of the public site — **without a rebuild**.

## Context & Constraints
- Public site = static HTML: `index` (landing-page.html), `servicios.html`, `nosotros.html`, `contacto.html`, 14 `towns/*.html`, `blog/*.html`. React app (`app.html`) serves CRM + `/lp/*` only.
- **Live campaigns running** (Meta + Google, ~340 events/h). Lead forms, GA4 (`G-HSGBK44MXZ`), Meta Pixel, CAPI, and attribution must NOT break.
- Do not delete/archive anything. Check existing assets before creating new ones.
- Language: Spanish primary + 3–4 focused English pages for expats.

## Phase 1 — Technical SEO (all public HTML pages)
- Unique `<title>` + meta description per page (keyword-targeted per town).
- Canonical, OG/Twitter tags, favicon check.
- JSON-LD schema: `LocalBusiness` (site-wide), `Service`, `FAQPage` (towns + blog), `BreadcrumbList`.
- `robots.txt` + `sitemap.xml` refresh (add new pages, correct lastmod).
- Internal linking: homepage → towns → blog cross-links; footer link block.
- Performance: WebP/lazy images, preconnect/font-display, defer non-critical JS. Target Lighthouse SEO ≥95, mobile perf improvement.

## Phase 2 — Design Polish (no rebuild)
- Homepage: hero clarity, typography scale, spacing rhythm, stronger CTA hierarchy (WhatsApp primary), social proof section (projects/testimonials), trust badges (Ley 417, warranty).
- Mobile-first pass: nav, tap targets, form usability.
- Apply the same tokens (colors/typography/buttons) to servicios/nosotros/contacto + town page headers for consistency.
- **Forms and tracking scripts untouched** — verified working after deploy.

## Phase 3 — English Pages (expats)
- `/en/solar-pedasi.html`, `/en/solar-playa-venao.html`, `/en/solar-panels-azuero.html` (guide) + optional `/en/index.html`.
- `hreflang` pairs ES↔EN on matching pages.
- English lead form → same backend/attribution.

## Phase 4 — Indexing & Off-site
- Google Search Console: verify domain + submit sitemap (needs Kaniel's account — hand-off step).
- Google Business Profile recommendation (Pedasí/Azuero) — hand-off.
- Blog: verify existing 3 posts have schema + internal links; list next 5 post topics (no writing in this scope).

## Success Criteria
- Every public page: unique title/meta, valid JSON-LD (passes Rich Results test), canonical + OG.
- Lighthouse (mobile, homepage): SEO ≥95, Performance improved vs baseline (record before/after).
- Design polish deployed live; lead form E2E verified post-deploy (test lead + GA4/Pixel events firing).
- Sitemap includes all pages incl. `/en/*`; GSC submission ready.

## Testing / Deploy
- Baseline first: Lighthouse + screenshot of homepage before changes.
- Per-phase deploy via Vercel (project `landing`), post-deploy smoke: pages 200, form submits, pixel/GA4 events visible.
- Verify Vercel env vars exist before each deploy (per project rules).

## Out of Scope
- React app/CRM redesign, code-splitting the 2.4MB chunk (separate task), new blog articles, paid campaign changes.
