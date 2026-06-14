# Scanner Bustan Parity — Design

**Date:** 2026-06-14 · **Branch:** `fable/scanner-bustan-parity`
**Goal:** Bring the Panama roof scanner (`solaris-panama.com/tools/scanner`) to full parity with the Bustan platform (`bustan-energy.com/he/platform`): roofs **+ land parcels**, a **candidate-review queue**, and a **unified top nav** (land/roof toggle, mode tabs, zone tabs, A/B/C/D grade filter, legend) — navigated the same way.

Panama already has ~70%: ScannerMap (MapLibre), async scan cron, ANATI cadastre, financials (NPV/IRR/LCOE), leads pipeline, candidate confirm/reject markers. This spec fills the gaps.

## Phase 1 — Unified Scanner Top Nav (visible "navigate the same way")
A persistent top bar inside the immersive scanner (Spanish, dark glass, golden accent):
- **Tipo toggle:** `Techos` (roofs) / `Terrenos` (land). Switches map candidate layer + review list + scan mode.
- **Mode tabs:** `Mapa` / `Escáner` (grid list) / `Panel` (dashboard) / `Leads`. Routes within the tool (Mapa+Escáner in-place; Panel/Leads navigate to /dashboard, /leads).
- **Zone tabs:** quick-fly chips — Ciudad de Panamá, Chitré, Pedasí, Playa Venao, Las Tablas, Guararé, Tonosí (reuse zone bboxes from the scans already run).
- **Grade filter:** All / A / B / C / D (color-coded) filtering candidates + roofs.
- **Legend** panel (roof score ramp, land tiers, grid).
Replaces ad-hoc FABs where it makes sense; keeps Menú/Panel escape.

## Phase 2 — Candidate Review Queue
- New table `scan_candidates` (kind roof|land, status pending|added|rejected, geom, area, kwp/mwp, tier, grade, existing_solar, scan_request_id) + `scan_exclusions` (learned rejects, ~30m).
- Cron `process-scans.ts` writes **candidates** (status=pending) for new scan_requests instead of inserting roofs/leads directly. (Existing 3,612 roof_scans/leads untouched — they're already "approved".)
- `CandidateReviewPanel` (port of Bustan): rows with area + kWp/MWp + tier + grade + PV badge, ✓ approve / ✗ reject (reason), bulk select, "Re-escanear" (apply learned filters).
- RPCs: `insert_scan_candidate`, `set_scan_candidate_status`, `reject_scan_candidate` (seeds exclusions), `approve_scan_candidate` (→ existing `insert_detected_roof` → roof_scans + lead), `apply_learned_filters`.
- PV check: `existing_solar` column; when unknown → "Verificación PV pendiente" badge. (Gemini PV detection deferred — same quota gate as enrichment; stub as pending.)

## Phase 3 — Land / Ground Scanning (Terrenos)
- `scan_requests.scan_type` ('roof'|'land', default 'roof').
- Cron land branch: Overpass `landuse` = farmland/meadow/grass/orchard/farmyard/greenfield/plantation/pasture within bbox → polygons.
- Ground-mount sizing (Panama): `usable = area_m2 × 0.75`; `MWp = usable_ha × 1.0` (1 MWp/ha mono-PERC); area in hectares (not rai).
- Tier: ≤1 MWp `comercial`, 1–9 `agro`, >9 `utility`. Grade: utility→A, agro≥5MWp→B, else C.
- Min area 15,000 m² (~1.5 ha). Dedup by centroid.
- Map: land polygons rendered as purple/magenta fill+dashed outline (distinct from roof score ramp). Legend entry.
- Land candidates flow through the same review queue; approve → lead tagged `scan_type='land'` with MWp + ha + ANATI parcel owner.

## Reuse / Build-new
- **Reuse:** ScannerMap, cron geometry helpers, cadastreService/ParcelBoundaryLayer, solarFinancials, leads pipeline, insert_detected_roof, Overpass UA+fallback.
- **New:** scan_candidates table+RPCs, CandidateReviewPanel, land Overpass+sizing, land map layer, unified top nav, tier/grade classifiers.

## Out of scope
- Gemini PV-existing detection at scale (quota-gated). Owner auto-research agent (Bustan's triggerFindContact). Land lease financial model (use EPC ground-mount capex; refine later).

## Verify
Per phase: `tsc` + vitest + `npm run build` + prod smoke test. Migrations applied via Supabase MCP and saved as files (056+). No breakage to existing 3,612 leads.
