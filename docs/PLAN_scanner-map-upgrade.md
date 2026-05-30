# Plan — Panama Scanner: Map + Scan Engine + Scraping/Owner Upgrade
**Date:** 2026-05-30 · **Repo:** `solaris-panama 2/platform` · **Reference:** `solar-intelligence` bustan map upgrade (P0–P4 + Python heavy tier)

Porting the proven bustan/solar-intelligence patterns into the Panama scanner at `/tools/scanner`.

---

## Gap analysis — Panama (now) vs Bustan (reference)

| Capability | Panama today | Bustan reference | Action |
|---|---|---|---|
| Map provider | MapLibre + Carto/Esri | MapLibre + multi-tile | ✅ keep |
| Fit-to-bounds / fly-to-selected | partial | P0 done | **PORT** |
| Persisted map style + legend synced to colors | style switch only | P0 done | **PORT** |
| Roof polygon overlay colored by score | building polygons (grade color) | P1 (score color-ramp) | enhance |
| **Draw/measure roof → persist geom + kWp** | ❌ missing | P2 done | **PORT (high value)** |
| **Candidate confirm/reject review layer** | ❌ missing | P3 done | **PORT** |
| Scan area | synchronous viewport Overpass | **async cron worker** (scan_requests) | **PORT** |
| Big-area / background scan + auto-dedup→lead | ❌ | P4b cron /10min | **PORT** |
| **CV false-positive validation** (satellite) | ❌ | roof_detector.py | **PORT (Python)** |
| **Owner enrichment batch pipeline** | per-building live (Places/ANATI/OpenCorp/Emprende) | Overture xref + Places batch | **enhance → batch** |
| Owner data quality scoring | confidence scoring exists | grade-gated enrichment | reuse |
| Lead attribution / UTM on shares | ❌ (separate issue) | n/a | track separately |
| RLS multi-tenant safety | `roof_scans` USING(true) 🔴 | company-scoped | fix |

**Net:** Panama already has a strong *live* owner-research stack (ANATI, OpenCorporates, Emprende, Places) that bustan lacks. Bustan adds 4 things Panama is missing: **(1) richer map UX, (2) manual roof drawing, (3) candidate review, (4) async batch scan + CV validation + batch owner enrichment.**

---

## Phase 0 — Production-safe prerequisites (½ day)
1. Fix `roof_scans` RLS → `USING (company_id = <auth company>)` for SELECT; keep public-share token path.
2. share token → full UUID (drop `.slice(0,20)`).
3. Confirm env vars in Vercel: `GOOGLE_SOLAR_API_KEY`, `GOOGLE_MAPS_API_KEY` (Places), `NREL_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, add `CRON_SECRET`, `OVERPASS_URL`.

## Phase 1 — Map UX parity (P0/P1) (1 day)
Ref: `SolarMap.tsx` lines 214–486.
- `useEffect` fit-to-bounds on result set change → `fitBounds({padding:80,maxZoom:15,duration:1000})`.
- fly-to-selected building on `selectedBuilding` change.
- Persist `mapStyle` to localStorage + Supabase user pref; legend chips synced to exact grade/score colors.
- Roof overlay: color-ramp **by solar score** (0 red→90 green) not just A/B/C/D grade; dashed outline for synthetic (area-derived) vs solid for real geom.
- Files: `components/scanner/ScannerMap.tsx`, new `lib/roofFeature.ts` (`buildRoofFeature()` real-vs-synthetic), `hooks/useRoofScanner.ts`.

## Phase 2 — Draw/measure roof tool (P2) (1–1.5 days)  ← biggest UX win
Ref: `SolarMap.tsx` 546–631 + `save_roof_geom` RPC.
- Extend existing `DrawToolbar` with a "Draw Roof" mode: click vertices → dbl-click/Enter finish, Esc cancel, crosshair cursor, disable dbl-click zoom.
- On finish: `@turf/area` → m² → `computeEstimatedKwp()` → persist.
- DB migration `051_roof_geom.sql`: add `roof_geom jsonb` + `panel_layout jsonb` to `roof_scans`; RPC `save_roof_geom(p_id,p_geom,p_area,p_kwp)` SECURITY DEFINER, role-gated.
- Wire `panel_layout`/`custom_placement` (currently always null).

## Phase 3 — Candidate review layer (P3) (1 day)
Ref: `SolarMap.tsx` 488–544 + `insert_detected_roof` RPC.
- Render detector/Overpass candidates as dashed purple polygons; click → review panel (title/area/kWp) → Confirm (creates lead via RPC) / Reject (removes).
- DB migration `052_detected_roofs.sql`: `insert_detected_roof(p jsonb)` upsert across `roof_scans`+`leads` idempotent (ON CONFLICT DO NOTHING for lead).

## Phase 4 — Async scan engine (P4a/P4b) (2 days)  ← "scan ability"
Ref: `api/cron-process-scans.ts` + `004_scan_requests.sql`.
- DB migration `053_scan_requests.sql`: `scan_requests` (area_geojson, bbox numeric[], filters jsonb, status, requested_by, counts jsonb, error) + RPC `create_scan_request(area,bbox,filters)` role-gated + RLS.
- Frontend "⊕ Scan this area" → reads map bounds → `create_scan_request` → status panel polls (queued/running/done + counts).
- New `api/cron-process-scans.ts` (Vercel cron /10min): poll queued (limit 3) → Overpass acquire (bbox cap `MAX_BBOX_DEG=0.2`, `MAX_BUILDINGS=1500`) → shoelace area → solar score → dedup (`DEDUP_DEG=0.00025` ~28m vs existing leads) → upsert `leads`+`roof_scans` → set status+counts.
- Constants: `USABLE_RATIO=0.65`, panama PSH from existing local estimator (reuse `roofScannerService` weighting, **not** Thailand 4.8).
- `vercel.json` cron entry + `CRON_SECRET` bearer.

## Phase 5 — Heavy tier: CV validation + batch owner scraping (2–3 days)  ← "scraping + find owner"
Ref: `scripts/roof_detector.py` + `scripts/enrich_owners.py`.
- **`scripts/roof_detector.py` (Panama)**: dedup → satellite-tile validate (cv2/numpy/PIL; reject water/vegetation false positives, Google z=19) → discover missed buildings (z=18 contours) → re-score. Input `roof_scans` export JSON → output validated JSON. Run per high-value scan (not cron).
- **`scripts/enrich_owners.py` (Panama)**: gate to Grade A/B without owner → batch enrich. Keep Panama sources (ANATI cadastre, OpenCorporates PA, Emprende, Google Places `GOOGLE_MAPS_API_KEY`) but run as **batch with rate-limit** (0.1s) + confidence scoring, instead of one-at-a-time live. Optional Overture cross-ref for name/category seed.
- Output writes back owner fields to `leads` via service role.
- These stay Python workers (heavy/long); cron stays light (Overpass + score only).

---

## Suggested order of execution
P0 → P2 (draw, visible value) → P4 (async scan) → P3 (candidates) → P1 (polish) → P5 (Python heavy tier).
Reason: draw tool + async scan are the user-facing "map + scan" wins; owner-scraping heavy tier is back-office and can lag.

## Open decisions
- Reuse bustan Supabase project or keep Panama project? (Panama uses `ubuazgwxourbzruanxvs`). → keep Panama, mirror schema.
- Run CV/owner Python on local Mac vs a worker host? (cron can't run heavy CV).
- Overture Panama coverage — verify before relying on it; ANATI may be better locally.
