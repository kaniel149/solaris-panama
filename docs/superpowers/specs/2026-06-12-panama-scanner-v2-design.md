# Panama Scanner v2 — Bustan Feature Port (Design)

**Date:** 2026-06-12 · **Branch:** `fable/scanner-v2-bustan-port`
**Goal:** Port the best customer-facing features from `bustan-energy.com/platform` (Thailand) into the public Panama scanner at `solaris-panama.com/tools/scanner`, adapted for the Panama market. All existing Panama features stay untouched.

## Scope (4 features)

### 1. Bill Scanner with OCR (new public entry point)
- New CTA in the scanner flow: **"Sube tu factura"** — upload photo/PDF of an electricity bill (Naturgy/EDEMET, ENSA).
- New serverless endpoint `api/bill-ocr.ts` using Gemini Vision (`GEMINI_API_KEY`), prompt adapted from Bustan's PEA bill scanner to Panama bill formats. Extracts: monthly kWh (and history if present), total USD, tariff/rate code, client name, service address, utility (Naturgy/ENSA/EDEMET), NIS/meter number.
- Extracted kWh + address pre-fill the existing scanner → existing sizing → existing 3-option proposal flow.
- Fallback: OCR failure or low confidence → existing manual kWh entry (no dead ends). Reuse the manual-entry logic from `dashboard/bill-scanner.html` where useful.
- Rate limit + size cap on the endpoint (public-facing); no image persisted unless lead is captured.

### 2. Panel Layout Visualization
- Port Bustan's SVG panel tessellation module → new `src/components/scanner/PanelLayoutOverlay.tsx`.
- Input: roof polygon/segments from existing Google Solar detection or manual drawing (better input than Bustan's Gemini-only detection).
- Renders panel grid on the map/roof view; shows panel count, kWp, orientation. Spanish labels.

### 3. Map Layer Switcher
- Add layer control to `ScannerMap.tsx` (MapLibre): existing satellite + Sentinel-2 recent imagery + streets basemap. No new paid keys; raster sources as in Bustan.

### 4. Financial Model Upgrade (NPV / IRR / LCOE)
- Port Bustan's 25-year financial functions into the existing Panama financial service (`SolarFinancialsPanel` / proposal math).
- Panama parameters preserved: $0.195/kWh, PSH IDW interpolation, Ley 417 incentives, net-metering cap, 0.537 tCO₂/MWh.
- New metrics shown in `SolarFinancialsPanel` and the 3-option proposal comparison (Spanish: VAN/TIR/LCOE).

## Not in scope
- Bustan internal views (Pipeline Kanban, Dashboard KPIs, leads grid, Colliers portfolio).
- No changes to: Google Solar detection, ANATI cadastre, lead capture/WhatsApp/attribution, async zone scanning, PDF generation, crons.

## Architecture notes
- All UI in the existing React SPA (`src/pages/RoofScannerPage.tsx` + `src/components/scanner/`), following existing patterns (Zustand, services layer).
- New service: `src/services/billOcrService.ts` → calls `api/bill-ocr.ts`.
- Financial functions added to the existing service (pure functions, unit-testable).

## Env / Ops
- **Required:** `GEMINI_API_KEY` in Vercel project (verify before deploy; free-tier quota caveat — same as Bustan F1 issue).
- No new Supabase migrations expected (bill data rides on existing lead/scan records; add columns only if needed → would be migration 054).

## Error handling
- OCR endpoint: timeouts → 504 with friendly Spanish message; invalid file → 400; quota → graceful fallback to manual entry.
- Panel layout: degenerate polygons → hide overlay, no crash.

## Testing
- Unit tests for financial functions (NPV/IRR/LCOE known-value cases).
- Manual E2E via webapp-testing: bill upload → prefill → proposal; layer switcher; panel overlay on a known Panama City roof.
- Single-scene verification before full deploy.
