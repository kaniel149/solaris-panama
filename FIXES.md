# Solaris Panama — Fixes (2026-03-16)

## 1. Build Fixed
- **Root cause:** The root `index.html` was a static marketing page (46KB of inline HTML/CSS) with no reference to `src/main.tsx`. Vite was building the static page instead of the React SPA.
- **Fix:** Moved the static marketing page to `marketing.html` and created a proper React SPA entry point `index.html` with `<div id="root">` and `<script type="module" src="/src/main.tsx">`.
- **Result:** `npm run build` now correctly builds all 2,633 React modules into `dist/`.

## 2. Duplicate Brand Assets Removed
Removed root-level copies that were duplicated in `brand/`:
- `logo-dark.png` (identical to `brand/logos/solaris logo.png`)
- `logo-light.png` (identical to `brand/logos/solaris logo White Background2.png`)
- `logo-light-large.png` (identical to `brand/logos/solaris logo-1 White Background.png`)
- `business-card.html`, `business-card-omri.html` (older versions referencing root logos)
- `email-signature.html`, `email-signature-omri.html` (older versions with base64 logo + old email domain)
- `color-palette.html`, `letterhead.html`, `presentation-template.html`, `social-media-templates.html`
- `lang-toggle.js` (used only by static pages)

**Canonical location:** `brand/` folder contains the authoritative versions.

## 3. Duplicate Ads Cleaned Up
- `ads/creatives/` contained older ad creatives (Inter font, dark theme, old brand colors)
- `ads-creatives/` contained updated brand-aligned versions (DM Sans + Playfair Display, light theme, correct Solaris brand palette)
- **Removed** `ads/creatives/` (old versions)
- **Kept** `ads-creatives/` (current brand-aligned versions)
- Updated `vercel.json` rewrite rule from `/ads/creatives/` to `/ads-creatives/`

## 4. Missing Dev Dependency
- Added `@vercel/node` to devDependencies (was referenced by `api/generate-proposal.ts` and `api/roof-scan.ts` but not installed)

## 5. Deployed to Vercel
- Production deployment: https://solaris-panama.com
- Build: 2,633 modules, 137KB CSS, 2.4MB JS (681KB gzipped)
