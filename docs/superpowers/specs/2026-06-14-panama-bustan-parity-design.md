# Panama → Bustan Parity + Assembly Animation + toprank SEO

**Date:** 2026-06-14
**Repo:** `kaniel149/solaris-panama` · branch `fable/panama-bustan-parity`
**Goal:** Raise solaris-panama.com to bustan-energy.com premium level, port the solar
assembly-scroll animation (Panama-specific frames), and apply full toprank SEO. Spanish (Panama).

## Source / Target
- **Target aesthetic:** `~/Desktop/projects/solar/bustan/bustan-energy`
  - `src/pages/HomePage.tsx` (1139 lines): Hero, GatewaySplit, StatsBar (count-up),
    ServicesSection, ScrollAnimationSection → `<SolarInstallationScroll/>`, WhySection,
    ProcessSection, ProjectsSection, FAQSection, CTASection. SEOHead + schemas + i18n + framer-motion.
  - `src/components/SolarInstallationScroll.tsx` (420 lines): canvas, scroll-driven. Loads
    `public/frames-smooth/<type>/*.webp` (manifest.json, interpolated) with legacy
    `public/frames/<type>/001..063.jpg` fallback. `HOUSE_TYPES` defines tabs.
  - `src/components/layout/StickyWhatsApp.tsx`: segment-aware sticky CTA.
- **Current site:** `~/Desktop/projects/solar/panama/solaris-panama-repo` — Vite+React+TS SPA.
  Routes: `/`→HomePage, `/servicios`, `/nosotros`, `/proyectos`, `/landing`, `/lp/azuero`. Spanish i18n. No frames yet.

## Tracks
**A — Premium rebuild (Spanish):** port Bustan HomePage sections → `HomePage.tsx`; GatewaySplit =
Residencial / Comercial-Industrial; rebuild Servicios/Nosotros/Proyectos; segment-aware sticky WhatsApp
(Panama number); light premium theme tokens (ADDITIVE — must not break CRM/dashboard styling).

**B — Panama assembly frames (7 types):** `concrete, villa, tropical, factory, largeroof, field, parking`.
Image-to-image from the 7 reference PNGs (Nano Banana Pro, Gemini paid ✓ verified) following timing
contract (001-008 bare → 009-017 civil → 018-028 racking → 029-039 panels → 040-049 complete →
050-063 orbit) → `scripts/interpolate-frames.sh` → frames-smooth webp + manifest → `public/frames*`.
CPU-gated (interpolation serialized, monitored <80%). Component is frame-agnostic; Bustan frames
copied as fallback so the animation ships immediately.

**C — toprank SEO:** JSON-LD (Organization, LocalBusiness Panamá, Service, FAQ, BreadcrumbList) ·
per-page meta/OG · sitemap.xml + robots · Panama town/location pages (`towns/`) · Spanish keywords · GEO.

## Execution
- **Workflow 1 (code+SEO, frame-agnostic):** Understand → Foundation (theme/i18n/UI primitives/copy
  Bustan frames as fallback) → Build (HomePage ‖ Scroll ‖ pages ‖ sticky WhatsApp) → SEO → Verify
  (`npm run build` + typecheck + adversarial review + fix loop). No image cost, controlled CPU.
- **Track B frames:** controlled follow-up — generate (network-bound) + interpolate (CPU-gated), swap in.

## Constraints
- No commit/push or deploy unless user asks. Work on branch only.
- Gemini paid verified active (gemini-3-pro-image probe succeeded).
- Theme changes additive — do not regress CRM/dashboard.
- Mobile safe mode: keep CPU <80%; serialize heavy interpolation.
