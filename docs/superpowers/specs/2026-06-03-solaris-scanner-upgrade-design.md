# Solaris Panamá Scanner — Upgrade to "Solar Intelligence" Level

**Date:** 2026-06-03
**Repo:** `solaris-panama-repo` (`solaris-panama-platform`)
**Route:** `/tools/scanner` → `src/pages/RoofScannerPage.tsx`
**Benchmark:** TM Energy `solar-intelligence` (a.k.a. bustan-energy.com/platform — same codebase, different brand)
**Goal:** Bring the Solaris roof scanner + owner-finder to parity with the TM "Solar Intelligence" engine, localized for Panama.

---

## 1. Context

The Solaris scanner is already **decent**, and in owner enrichment it is actually *richer* than the benchmark (ANATI cadastre + Google Places + Nominatim + Panama Emprende + OpenCorporates + Apollo). The gaps are concentrated in four areas:

| Dimension | Solaris today | Benchmark (TM) | Gap |
|---|---|---|---|
| Roof scanning | Google Solar API + OSM Overpass + 5-city PSH fallback | **Gemini Vision roof analysis** + NASA POWER irradiance | Google Solar **does not cover Panama** → frequent crude fallback |
| Owner/parcel | Multi-source enrichment, finca # found | Parcel boundary + registry deep-links | No parcel polygon on map; registry link only |
| Financials | 20-yr NPV exists but **not inline** in scanner | 25-yr NPV (degradation, blended tariff, discounted payback, CO₂) inline | Not shown on building select |
| Lead → CRM | **LocalStorage only** | Supabase pipeline + activity log + attribution | Data loss; no CRM/attribution link |

**Decisive technical insight:** Google Solar API returns `NOT_FOUND` for most Panamanian addresses (Panama is outside standard & expanded coverage). So the highest-accuracy upgrade is an **AI-vision + NASA POWER fallback** that works anywhere.

**Approach (chosen):** Phased port of proven, portable TM modules into Solaris — not a rewrite. Keep Solaris's superior owner-enrichment stack. Localize everything for Panama (USD, Spanish, ANATI, Panama tariffs/grid factor).

---

## 2. Architecture

All work isolated on branch `feature/scanner-upgrade` (do NOT disturb in-progress SEO changes in the working tree).

```
src/
  pages/RoofScannerPage.tsx        (wire new panels/results)
  services/
    roofScannerService.ts          (extend fallback chain)
    aiVisionRoofService.ts   [NEW] (Phase 1, client wrapper)
    irradianceService.ts     [NEW] (Phase 1, NASA POWER client)
    solarFinancials.ts       [NEW] (Phase 3, ported, USD/Panama)
    scanPersistenceService.ts [NEW](Phase 2, Supabase writes)
  components/scanner/
    SolarFinancialsPanel.tsx [NEW] (Phase 3)
    ParcelBoundaryLayer.tsx  [NEW] (Phase 4)
api/
  roof-scan.ts                     (add action=ai-vision, action=nasa-power)
  roof-vision.ts           [NEW]   (Phase 1, Gemini vision proxy)
  generate-proposal.ts             (extend to 3-option, Phase 5)
  leads/                           (extend for scan→lead persistence, Phase 2)
supabase/migrations/
  0XX_roof_scans.sql       [NEW]   (Phase 2)
```

Fallback chain (Phase 1):
`Google Solar API` → if `NOT_FOUND`/low-quality → `AI-Vision (Gemini on satellite tile)` → if vision fails → `NASA POWER irradiance + OSM footprint area` → last resort `local PSH estimator`.

---

## 3. Phase 1 — AI-Vision Roof + NASA POWER Irradiance

**Why first:** Closes the Panama coverage gap; biggest accuracy lift.

**3.1 Gemini vision roof analysis** (port `api/admin-analyze-roof.ts`)
- New `api/roof-vision.ts` (Vercel function): input `{lat,lng,zoom}` → fetch a satellite tile image (Google Static Maps `maptype=satellite`, fallback ESRI World Imagery) → send to Gemini 2.0 Flash with JSON-mode prompt.
- Output JSON: `total_roof_area_m2`, `usable_area_pct` (0.65–0.85), `orientation`, `roof_type`, `shading` (none/partial/heavy), `tilt_estimate_deg`, `existing_solar` (bool), `confidence` (0–1).
- Panel sizing reused from BOM (e.g. 580W ≈ 2.28 m²): `panels = floor(usable_area / panel_area)`, `kWp = panels × W / 1000`.
- Env: `GEMINI_API_KEY` (server-only). Reuse `GOOGLE_MAPS_API_KEY` for static tiles.

**3.2 NASA POWER irradiance** (port `src/lib/nasa-power.ts`)
- New `irradianceService.ts` + `api/roof-scan.ts?action=nasa-power`: fetch `ALLSKY_SFC_SW_DWN` climatology for lat/lng, cache by 0.1° grid; return annual + monthly PSH.
- Replaces the hardcoded 5-city interpolation as the production-grade irradiance source for Panama.

**3.3 Integration**
- `roofScannerService.ts`: insert vision + NASA POWER into the fallback chain; tag result with `source: 'google_solar' | 'ai_vision' | 'nasa_estimate' | 'local'` and a quality/confidence badge in the UI.

**Acceptance:** A Panama address where Google Solar returns NOT_FOUND yields a roof-area + kWp + annual-kWh estimate from vision+NASA, with a visible source/confidence badge.

---

## 4. Phase 2 — Supabase Persistence + Attribution

**Why:** Scans/leads currently die in LocalStorage. Connect to the existing Panama CRM + attribution stack (migrations 008/010, `inferAttribution()`, `webhook_logs`).

**4.1 Schema** (Panama Supabase `ubuazgwxourbzruanxvs`)
- New migration `roof_scans`: `id, created_at, lat, lng, address, finca_number, roof_area_m2, usable_area_m2, system_kwp, annual_kwh, source, confidence, shading, orientation, owner_json (jsonb), solar_json (jsonb), financials_json (jsonb), lead_id (fk), session_id, utm jsonb`.
- Extend existing `leads` with solar columns if absent: `system_kwp, annual_kwh, est_annual_savings_usd, payback_years, finca_number, roof_area_m2, scan_source`.
- RLS: insert via anon (public scanner) writes to `roof_scans` only; lead creation goes through existing leads API (service role).

**4.2 Persistence service**
- `scanPersistenceService.ts`: on scan complete → upsert `roof_scans`. On "Guardar como Lead" → POST existing `api/leads/` with solar + owner + **attribution** (UTM via existing `inferAttribution()`), returns `lead_id`, link back to scan.
- Migrate `leadStorageService` to read/write Supabase (keep LocalStorage as offline cache only).

**Acceptance:** A scan persists a `roof_scans` row; "Save as Lead" creates a `leads` row with attribution + solar fields, visible in the Solaris CRM.

---

## 5. Phase 3 — Inline Financial Engine (25-yr NPV, USD/Panama)

**Port `src/lib/solar-financials.ts`** → `src/services/solarFinancials.ts`, pure function, Panama-localized constants (all in one config object, easy to tune):
- Currency **USD** (Panama uses USD).
- `retail_rate_usd_kwh` default **0.20** (CONFIRM ENSA/EDEMET tariff), `export_rate` for net metering (medición neta, Ley 37 — CONFIRM).
- Self-consumption: 60% grid-tied / 85% battery → blended rate.
- PR 0.77 × soiling 0.97 = 0.7469 (tropical, reuse). Degradation: yr1 2% LID, then 0.5%/yr. O&M 1%/yr. Escalation 3%/yr. Discount 8%. Life 25 yr.
- Panama grid CO₂ factor (hydro-heavy) — CONFIRM value (~0.3–0.5 kg/kWh).
- Outputs: system_kwp, annual_kwh, annual_savings_usd, payback_simple, payback_discounted, savings_10yr, savings_25yr, CO₂ yr1 + 25yr.

**UI:** `SolarFinancialsPanel.tsx` in BuildingDetail — instant ROI/payback/savings when a building is selected; financing toggle (cash/loan/PPA). Persist into `roof_scans.financials_json`.

**Acceptance:** Selecting a building shows annual savings ($), discounted payback (yrs), and 25-yr savings inline, in Spanish, USD.

---

## 6. Phase 4 — Owner / Parcel Polish

- **Parcel boundary on map:** `ParcelBoundaryLayer.tsx` renders the ANATI cadastre polygon (already returned by `cadastre-lookup`) as a MapLibre GeoJSON layer over the selected building.
- **Registry deep-link:** surface the existing Registro Público URL (`/consultas/finca/{fincaNumber}`) as a one-click button in BuildingDetail; add an `owner_resolution` deep-link builder (Google Maps, Registro Público, ANATI) mirroring TM's `owner-resolution.ts`, PDPA/data-privacy-safe (manual verification, no auto-scrape of personal data).
- Flag untitled / Derecho Posesorio parcels explicitly when finca is absent.

**Acceptance:** Selected building shows its parcel outline + a working Registro Público link + owner confidence/source.

---

## 7. Phase 5 — 3-Option Proposal (PDF)

- Extend existing `api/generate-proposal.ts` to a **3-option** layout (EPC / PPA / EPC+Battery), Spanish + USD, Solaris branding, adapting TM's `generate-3opt.mjs` logic.
- Trigger from a scan/lead: "Generar Propuesta" → HTML→PDF (jsPDF or server HTML), comparison table + savings viz + CO₂ + payback per option.
- Store proposal ref on the lead; optional email via existing Resend integration.

**Acceptance:** From a saved lead, one click produces a branded 3-option PDF proposal in Spanish.

---

## 8. Env Vars (add to Vercel)

`GEMINI_API_KEY` (vision), confirm `GOOGLE_SOLAR_API_KEY`, `GOOGLE_MAPS_API_KEY`, `NREL_API_KEY` set. NASA POWER needs no key. Supabase service role already present for Panama project.

## 9. Testing

- Unit: `solarFinancials.ts` (deterministic, golden-value tests vs TM `FORMULAS.md`), `irradianceService` cache keying, vision JSON parsing/guards.
- Integration: fallback chain (mock Google Solar NOT_FOUND → vision → NASA). Persistence: roof_scans insert + lead create with attribution.
- Manual (webapp-testing skill): scan a real Panama address (e.g. Chitré/Azuero), verify source badge, financials panel, parcel layer, save-as-lead in CRM.

## 10. Risks / Open Questions (to confirm with user)

1. ~~**Panama tariff**~~ → **RESOLVED: `retail_rate_usd_kwh = 0.20`** (configurable). Net-metering export rate still to confirm (default = retail × 0.9 placeholder).
2. **Panama grid CO₂ factor** — placeholder (~0.4 kg/kWh, hydro-heavy); confirm official value later (non-blocking, config constant).
3. **Gemini cost/rate** — vision per-scan cost; mitigate with caching keyed by rounded lat/lng (3-decimal ≈ 110 m).
4. ~~**Supabase project**~~ → **RESOLVED: Panama prod `ubuazgwxourbzruanxvs`**, reuse existing `leads` + attribution schema; add `roof_scans` table + extend `leads` columns.
5. **PDF engine** — jsPDF (client) vs server HTML render; default jsPDF for simplicity unless branding needs richer layout.

## 11. Out of Scope (YAGNI)

Mobile offline field-survey app; manual roof-polygon drawing editor; premium imagery (Nearmap/EagleView — no Panama coverage); multi-language beyond Spanish; automated scraping of personal owner data (kept manual for privacy compliance).

---

## 12. Phase Order & Shipping

1 → 2 → 3 → 4 → 5. Each phase ships independently and is verifiable. Phases 1–3 deliver the core "level-up"; 4–5 complete parity.
