# Solaris Scanner Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the Solaris Panamá roof scanner (`/tools/scanner`) to "Solar Intelligence" parity — AI-vision roof fallback (Panama isn't in Google Solar coverage), location-accurate irradiance, persistent leads with attribution, inline 25-yr financials, parcel boundaries, and 3-option proposals.

**Architecture:** Phased port of proven TM `solar-intelligence` techniques into the existing Solaris stack, reusing what already exists (`PANAMA_DEFAULTS`, `roof_scans` migration 050, `api/leads/intake.ts` with `inferAttribution`+CAPI, `cadastreService` parcel parsing). No rewrite; keep Solaris's richer owner-enrichment. All values USD + Spanish.

**Tech Stack:** React 18 + TypeScript + Vite, MapLibre GL, Vercel serverless (`api/*.ts`), Supabase (Panama prod `ubuazgwxourbzruanxvs`), Gemini 2.0 Flash (vision), NASA POWER, Google Solar API. Tests: **Vitest** (added in Task 0).

**Spec:** `docs/superpowers/specs/2026-06-03-solaris-scanner-upgrade-design.md`

**Conventions:**
- Branch: `feature/scanner-upgrade` off current HEAD. Do NOT stage the unrelated in-progress SEO files (`public/blog/*`, `public/index.html`, `public/sitemap.xml`, `public/solar-comercial.html`). Always `git add` exact paths.
- Commit only when a task's tests pass.

---

## Task 0: Foundations — branch + Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/services/__tests__/smoke.test.ts`

- [ ] **Step 1: Create the branch (carry, don't stage, the SEO edits)**

```bash
cd ~/Desktop/projects/solar/panama/solaris-panama-repo
git checkout -b feature/scanner-upgrade
git status --short   # SEO files remain modified+unstaged; that's expected
```

- [ ] **Step 2: Install Vitest**

```bash
npm i -D vitest@^2
```

- [ ] **Step 3: Add the `test` script to package.json**

In `package.json` `"scripts"`, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
```

- [ ] **Step 5: Smoke test**

`src/services/__tests__/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
describe('vitest', () => {
  it('runs', () => { expect(1 + 1).toBe(2) })
})
```

- [ ] **Step 6: Run + commit**

```bash
npm test
# Expected: 1 passed
git add package.json package-lock.json vitest.config.ts src/services/__tests__/smoke.test.ts docs/superpowers/
git commit -m "chore: add vitest + scanner-upgrade spec/plan"
```

---

# PHASE 1 — AI-Vision Roof + NASA POWER Irradiance

Closes the Panama coverage gap (Google Solar returns no data for most PA addresses). Adds two fallbacks *above* the crude 5-city estimator: NASA POWER irradiance and Gemini vision on a satellite tile.

## Task 1.1: Irradiance service (port NASA POWER)

**Files:**
- Create: `src/services/irradianceService.ts`
- Test: `src/services/__tests__/irradianceService.test.ts`

- [ ] **Step 1: Write the failing test** (parse logic + cache key)

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { __parseNasaPower, fetchSolarIrradiance, __clearCache } from '@/services/irradianceService'

const SAMPLE = {
  properties: { parameter: {
    ALLSKY_SFC_SW_DWN: { JAN:5.1,FEB:5.4,MAR:5.6,APR:5.2,MAY:4.4,JUN:4.2,JUL:4.3,AUG:4.4,SEP:4.3,OCT:4.1,NOV:4.6,DEC:4.9, ANN:4.7 },
    T2M: { ANN: 27.3 },
  } },
}

describe('parseNasaPower', () => {
  it('extracts annual + monthly + extremes', () => {
    const r = __parseNasaPower(SAMPLE)
    expect(r.annualGHI).toBeCloseTo(4.7, 5)
    expect(r.monthlyGHI).toHaveLength(12)
    expect(r.bestMonth).toBe('March')
    expect(r.worstMonth).toBe('October')
  })
})

describe('fetchSolarIrradiance caching', () => {
  beforeEach(() => __clearCache())
  it('caches by 0.1deg grid (one fetch for nearby coords)', async () => {
    const f = vi.fn().mockResolvedValue({ ok: true, json: async () => SAMPLE })
    vi.stubGlobal('fetch', f)
    await fetchSolarIrradiance(7.966, -80.433)
    await fetchSolarIrradiance(7.961, -80.431) // same 0.1 grid
    expect(f).toHaveBeenCalledTimes(1)
    vi.unstubAllGlobals()
  })
})
```

- [ ] **Step 2: Run → FAIL** (`npx vitest run src/services/__tests__/irradianceService.test.ts`) — "Cannot find module".

- [ ] **Step 3: Implement** `src/services/irradianceService.ts` (ported from TM `nasa-power.ts`, exposing test hooks):

```ts
// NASA POWER climatology irradiance — accurate per-location PSH (replaces 5-city IDW).
export interface NasaPowerData {
  annualGHI: number; monthlyGHI: number[]; annualTemp: number
  bestMonth: string; worstMonth: string
}
const MONTH_KEYS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const cache = new Map<string, NasaPowerData>()
const roundCoord = (n: number) => Math.round(n * 10) / 10
const cacheKey = (lat: number, lng: number) => `${roundCoord(lat)},${roundCoord(lng)}`

export function __clearCache() { cache.clear() }

export function __parseNasaPower(json: any): NasaPowerData {
  const ghi = json?.properties?.parameter?.ALLSKY_SFC_SW_DWN as Record<string, number> | undefined
  const t2m = json?.properties?.parameter?.T2M as Record<string, number> | undefined
  if (!ghi) throw new Error('NASA POWER: missing ALLSKY_SFC_SW_DWN')
  const monthlyGHI = MONTH_KEYS.map((k) => ghi[k] ?? 0)
  const annualGHI = ghi['ANN'] ?? monthlyGHI.reduce((a, b) => a + b, 0) / 12
  const annualTemp = t2m?.['ANN'] ?? 0
  const maxIdx = monthlyGHI.indexOf(Math.max(...monthlyGHI))
  const minIdx = monthlyGHI.indexOf(Math.min(...monthlyGHI))
  return { annualGHI, monthlyGHI, annualTemp, bestMonth: MONTH_NAMES[maxIdx], worstMonth: MONTH_NAMES[minIdx] }
}

export async function fetchSolarIrradiance(lat: number, lng: number): Promise<NasaPowerData> {
  const key = cacheKey(lat, lng)
  const hit = cache.get(key)
  if (hit) return hit
  const params = new URLSearchParams({
    parameters: 'ALLSKY_SFC_SW_DWN,T2M', community: 'RE',
    longitude: String(roundCoord(lng)), latitude: String(roundCoord(lat)),
    format: 'JSON', start: '2001', end: '2020',
  })
  const res = await fetch(`https://power.larc.nasa.gov/api/temporal/climatology/point?${params}`)
  if (!res.ok) throw new Error(`NASA POWER error: ${res.status}`)
  const parsed = __parseNasaPower(await res.json())
  cache.set(key, parsed)
  return parsed
}
```

- [ ] **Step 4: Run → PASS.**

- [ ] **Step 5: Commit**

```bash
git add src/services/irradianceService.ts src/services/__tests__/irradianceService.test.ts
git commit -m "feat(scanner): NASA POWER irradiance service with grid caching"
```

## Task 1.2: Gemini vision API endpoint

**Files:**
- Create: `api/roof-vision.ts`
- Note: `api/roof-scan.ts` already has `action=satellite-image` (returns a Google Static Maps satellite URL/image — confirm by reading lines 120-260 of `api/roof-scan.ts`). Reuse it for the tile.

- [ ] **Step 1: Implement `api/roof-vision.ts`** (ported from TM `api/admin-analyze-roof.ts`, Panama prompt):

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_SOLAR_API_KEY || ''

const PROMPT = `Eres un analista de techos solares. Analiza esta imagen satelital de un techo en Panamá.
Devuelve SOLO JSON válido con estas claves:
{"total_roof_area_m2": number, "usable_area_pct": number (0.65-0.85),
 "orientation": "south"|"east"|"west"|"east-west"|"mixed"|"unknown",
 "roof_type": "concrete"|"tile"|"metal"|"mixed", "shading": "none"|"partial"|"heavy",
 "tilt_estimate_deg": number, "existing_solar": boolean, "confidence": number (0-1)}
Suma el área de TODOS los edificios visibles, no solo el mayor.`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!GEMINI_API_KEY) return res.status(503).json({ error: 'GEMINI_API_KEY not configured', code: 'NO_API_KEY' })

  const lat = parseFloat(String(req.query.lat)); const lng = parseFloat(String(req.query.lng))
  const zoom = parseInt(String(req.query.zoom || '20'), 10)
  if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ error: 'lat/lng required' })

  try {
    // 1. Fetch satellite tile as base64
    const tileUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=640x640&maptype=satellite&key=${GOOGLE_MAPS_API_KEY}`
    const img = await fetch(tileUrl)
    if (!img.ok) return res.status(502).json({ error: 'satellite tile fetch failed' })
    const b64 = Buffer.from(await img.arrayBuffer()).toString('base64')

    // 2. Gemini vision, JSON mode
    const gem = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: PROMPT }, { inlineData: { mimeType: 'image/png', data: b64 } }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
        }) }
    )
    if (!gem.ok) return res.status(502).json({ error: 'gemini error', detail: await gem.text() })
    const gj = await gem.json()
    const text = gj?.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    return res.status(200).json({ ...JSON.parse(text), lat, lng, zoom })
  } catch (err) {
    return res.status(500).json({ error: 'vision failed', detail: String(err) })
  }
}
```

- [ ] **Step 2: Commit** (no unit test — external API; verified manually in Task 1.6)

```bash
git add api/roof-vision.ts
git commit -m "feat(scanner): Gemini vision roof-analysis endpoint"
```

## Task 1.3: AI-vision client service + result mapping

**Files:**
- Create: `src/services/aiVisionRoofService.ts`
- Test: `src/services/__tests__/aiVisionRoofService.test.ts`

- [ ] **Step 1: Failing test** (maps vision JSON → partial RoofScanResult; guards bad input):

```ts
import { describe, it, expect } from 'vitest'
import { visionToRoofScan } from '@/services/aiVisionRoofService'

describe('visionToRoofScan', () => {
  it('computes kWp/panels from usable area', () => {
    const r = visionToRoofScan(
      { total_roof_area_m2: 400, usable_area_pct: 0.75, orientation: 'south',
        roof_type: 'concrete', shading: 'none', tilt_estimate_deg: 10,
        existing_solar: false, confidence: 0.82 },
      8.43, -80.43, 4.7,
    )
    expect(r.source).toBe('ai_vision')
    expect(r.quality).toBe('MEDIUM')
    expect(r.totalRoofAreaM2).toBe(400)
    expect(r.usableRoofAreaM2).toBe(300)         // 400 * 0.75
    expect(r.maxPanelCount).toBe(Math.floor(300 / 2.58)) // 116
    expect(r.maxSystemSizeKwp).toBeCloseTo(116 * 580 / 1000, 2) // 67.28
    // annual ≈ kWp * PSH(4.7) * 365 * PR(0.80)
    expect(r.yearlyEnergyKwh).toBe(Math.round(67.28 * 4.7 * 365 * 0.80))
  })
  it('throws on missing area', () => {
    expect(() => visionToRoofScan({} as any, 0, 0, 4.7)).toThrow()
  })
})
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement** `src/services/aiVisionRoofService.ts`:

```ts
import { PANAMA_DEFAULTS } from '@/services/solarCalculator'
import type { RoofScanResult } from '@/services/roofScannerService'

export interface VisionRoofResult {
  total_roof_area_m2: number; usable_area_pct: number; orientation: string
  roof_type: string; shading: 'none' | 'partial' | 'heavy'
  tilt_estimate_deg: number; existing_solar: boolean; confidence: number
}

const azimuthFromOrientation: Record<string, number> = {
  south: 180, east: 90, west: 270, 'east-west': 135, mixed: 180, unknown: 180,
}

export async function fetchVisionRoof(lat: number, lng: number, zoom = 20): Promise<VisionRoofResult> {
  const res = await fetch(`/api/roof-vision?lat=${lat}&lng=${lng}&zoom=${zoom}`)
  if (!res.ok) throw new Error(`vision endpoint ${res.status}`)
  return res.json()
}

/** Map vision output + local irradiance (PSH) into a RoofScanResult. */
export function visionToRoofScan(v: VisionRoofResult, lat: number, lng: number, pshAvg: number): RoofScanResult {
  if (!v || !v.total_roof_area_m2) throw new Error('vision result missing roof area')
  const usablePct = Math.min(0.85, Math.max(0.5, v.usable_area_pct || 0.7))
  const usable = v.total_roof_area_m2 * usablePct
  const panels = Math.floor(usable / PANAMA_DEFAULTS.panelAreaM2)
  const kwp = (panels * PANAMA_DEFAULTS.panelWattage) / 1000
  const yearly = Math.round(kwp * pshAvg * 365 * PANAMA_DEFAULTS.performanceRatio)
  const quality: RoofScanResult['quality'] = v.confidence >= 0.75 ? 'MEDIUM' : 'BASE'
  return {
    address: '', latitude: lat, longitude: lng,
    source: 'ai_vision', quality,
    totalRoofAreaM2: v.total_roof_area_m2, usableRoofAreaM2: Math.round(usable),
    roofSegments: [{ areaM2: v.total_roof_area_m2, pitchDegrees: v.tilt_estimate_deg || 5,
      azimuthDegrees: azimuthFromOrientation[v.orientation] ?? 180, center: { lat, lng } }],
    maxPanelCount: panels, maxSystemSizeKwp: kwp, yearlyEnergyKwh: yearly,
    peakSunHoursPerYear: Math.round(pshAvg * 365),
    panelConfigs: [0.25, 0.5, 0.75, 1].map((r) => ({
      panelsCount: Math.round(panels * r), yearlyEnergyDcKwh: Math.round(yearly * r) })),
    visionMeta: { orientation: v.orientation, roofType: v.roof_type, shading: v.shading,
      existingSolar: v.existing_solar, confidence: v.confidence },
  }
}
```

- [ ] **Step 4:** In `src/services/roofScannerService.ts`, extend the `source`/`quality` unions and `RoofScanResult` to support vision + NASA. Modify lines 39-41 and add a field:

```ts
  source: 'google_solar' | 'pvwatts_estimate' | 'local_panama' | 'ai_vision' | 'nasa_estimate' | 'manual';
  quality: 'HIGH' | 'MEDIUM' | 'BASE' | 'ESTIMATED';
```
And add inside the `RoofScanResult` interface (after `rawPvWattsData?`):
```ts
  visionMeta?: { orientation: string; roofType: string; shading: string; existingSolar: boolean; confidence: number };
```

- [ ] **Step 5: Run → PASS. Commit**

```bash
git add src/services/aiVisionRoofService.ts src/services/roofScannerService.ts src/services/__tests__/aiVisionRoofService.test.ts
git commit -m "feat(scanner): AI-vision roof client + RoofScanResult vision fields"
```

## Task 1.4: Wire vision + NASA into the fallback chain

**Files:**
- Modify: `src/services/roofScannerService.ts` (`scanRoof`, lines 404-475)
- Test: `src/services/__tests__/scanRoof.fallback.test.ts`

- [ ] **Step 1: Failing test** (Google Solar null → vision used; vision null → NASA estimate):

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as svc from '@/services/roofScannerService'
import * as vision from '@/services/aiVisionRoofService'
import * as irr from '@/services/irradianceService'

describe('scanRoof fallback chain', () => {
  beforeEach(() => vi.restoreAllMocks())
  it('uses AI vision when Google Solar returns null', async () => {
    vi.spyOn(svc, 'scanWithGoogleSolar').mockResolvedValue(null)
    vi.spyOn(irr, 'fetchSolarIrradiance').mockResolvedValue({ annualGHI: 4.7, monthlyGHI: [], annualTemp: 27, bestMonth: 'March', worstMonth: 'October' })
    vi.spyOn(vision, 'fetchVisionRoof').mockResolvedValue({ total_roof_area_m2: 400, usable_area_pct: 0.75, orientation: 'south', roof_type: 'concrete', shading: 'none', tilt_estimate_deg: 8, existing_solar: false, confidence: 0.8 })
    const r = await svc.scanRoof({ latitude: 8.43, longitude: -80.43 })
    expect(r.source).toBe('ai_vision')
    expect(r.maxSystemSizeKwp).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run → FAIL** (still falls to local_panama).

- [ ] **Step 3: Edit `scanRoof`** — insert between the Google Solar block (ends line 426) and the local estimator (line 428). Replace lines 428-434 region's lead-in with:

```ts
  // 3. AI-vision fallback (Panama lacks Google Solar coverage)
  let pshAvg = 4.5
  try {
    const irradiance = await fetchSolarIrradiance(lat, lng)
    pshAvg = irradiance.annualGHI
  } catch { /* keep default PSH */ }

  try {
    const v = await fetchVisionRoof(lat, lng)
    const visionResult = visionToRoofScan(v, lat, lng, pshAvg)
    return { ...visionResult, address }
  } catch {
    console.log('[roofScanner] vision unavailable, using NASA/local estimate')
  }

  // 4. NASA/local estimator fallback (uses pshAvg from NASA POWER when available)
```
Then update the existing local estimate to use `pshAvg`: change the local estimate so `source: 'nasa_estimate'` when NASA succeeded, else `'local_panama'`. Add near the result object: `source: pshAvg !== 4.5 ? 'nasa_estimate' : 'local_panama',`. Add imports at top of file:
```ts
import { fetchSolarIrradiance } from './irradianceService';
import { fetchVisionRoof, visionToRoofScan } from './aiVisionRoofService';
```

- [ ] **Step 4: Run → PASS. Commit**

```bash
git add src/services/roofScannerService.ts src/services/__tests__/scanRoof.fallback.test.ts
git commit -m "feat(scanner): vision+NASA fallback chain above local estimator"
```

## Task 1.5: Source/confidence badge in UI

**Files:**
- Modify: `src/pages/RoofScannerPage.tsx` (building detail / result panel)

- [ ] **Step 1:** Add a small badge component near where `RoofScanResult` is rendered. Map `source` → label/color:

```tsx
const SOURCE_LABELS: Record<string, { es: string; tone: string }> = {
  google_solar: { es: 'Google Solar (alta precisión)', tone: 'emerald' },
  ai_vision:    { es: 'Análisis IA (satélite)',        tone: 'sky' },
  nasa_estimate:{ es: 'Estimación NASA POWER',          tone: 'amber' },
  local_panama: { es: 'Estimación local Panamá',        tone: 'zinc' },
}
// render: SOURCE_LABELS[result.source] + (result.visionMeta?.confidence ? ` · ${Math.round(result.visionMeta.confidence*100)}%` : '')
```

- [ ] **Step 2: Manual verify** (Task uses webapp-testing skill): `npm run dev` → `/tools/scanner` → scan an Azuero/Chitré address where Google Solar returns nothing → badge shows "Análisis IA (satélite) · NN%" and a non-zero kWp.

- [ ] **Step 3: Commit**

```bash
git add src/pages/RoofScannerPage.tsx
git commit -m "feat(scanner): data-source + confidence badge"
```

---

# PHASE 2 — Supabase Persistence + Attribution

Reuse the existing `roof_scans` table (migration 050) and the `api/leads/intake.ts` lead path (already does attribution + CAPI + WhatsApp alert). The public scanner is anonymous, so persistence goes through **server endpoints with the service role** (RLS on `roof_scans` is auth-scoped).

## Task 2.1: Migration — public scan column + leads solar columns

**Files:**
- Create: `supabase/migrations/051_scanner_public_and_solar.sql`

- [ ] **Step 1: Write migration**

```sql
-- Public (anonymous) scanner support + solar fields on leads
ALTER TABLE roof_scans ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE roof_scans ADD COLUMN IF NOT EXISTS owner_json JSONB;
ALTER TABLE roof_scans ADD COLUMN IF NOT EXISTS financials_json JSONB;
ALTER TABLE roof_scans ADD COLUMN IF NOT EXISTS finca_number TEXT;
-- 'ai_vision' / 'nasa_estimate' sources
ALTER TABLE roof_scans DROP CONSTRAINT IF EXISTS roof_scans_source_check;
ALTER TABLE roof_scans ADD CONSTRAINT roof_scans_source_check
  CHECK (source IN ('google_solar','local_panama','pvwatts','ai_vision','nasa_estimate','manual'));

ALTER TABLE leads ADD COLUMN IF NOT EXISTS system_kwp NUMERIC(6,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS annual_kwh INT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS est_annual_savings_usd NUMERIC(10,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS payback_years NUMERIC(4,1);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS finca_number TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS roof_area_m2 NUMERIC(8,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS scan_source TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS roof_scan_id UUID REFERENCES roof_scans(id) ON DELETE SET NULL;
```

- [ ] **Step 2: Apply** (via Supabase MCP `apply_migration` to project `ubuazgwxourbzruanxvs`, or `supabase db push`). Verify with: `select column_name from information_schema.columns where table_name='leads' and column_name='system_kwp';` → 1 row.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/051_scanner_public_and_solar.sql
git commit -m "feat(db): scanner public columns + leads solar fields (migration 051)"
```

## Task 2.2: Scan-save endpoint (service role)

**Files:**
- Create: `api/scans/save.ts`

- [ ] **Step 1: Implement** (mirrors `intake.ts` server-client pattern):

```ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import * as crypto from 'crypto'

function client() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return url && key ? createClient(url, key) : null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const supabase = client()
  if (!supabase) return res.status(500).json({ error: 'Server configuration error' })

  const b = req.body || {}
  if (!b.latitude || !b.longitude) return res.status(400).json({ error: 'latitude/longitude required' })
  const token = crypto.randomUUID()
  const { data, error } = await supabase.from('roof_scans').insert({
    address: b.address || '', latitude: b.latitude, longitude: b.longitude,
    source: b.source || 'local_panama', quality: b.quality || 'ESTIMATED',
    total_roof_m2: b.totalRoofAreaM2 ?? null, usable_roof_m2: b.usableRoofAreaM2 ?? null,
    roof_segments: b.roofSegments ?? [], panel_count: b.maxPanelCount ?? null,
    system_kwp: b.maxSystemSizeKwp ?? null, yearly_kwh: b.yearlyEnergyKwh ?? null,
    finca_number: b.fincaNumber ?? null, owner_json: b.owner ?? null,
    financials_json: b.financials ?? null, session_id: b.sessionId ?? null,
    public_share_token: token, raw_api_response: b.raw ?? null,
  }).select('id, public_share_token').single()
  if (error) return res.status(500).json({ error: 'save failed', detail: error.message })
  return res.status(201).json({ ok: true, id: data.id, share_token: data.public_share_token })
}
```

- [ ] **Step 2: Commit**

```bash
git add api/scans/save.ts
git commit -m "feat(scanner): persist scans to roof_scans via service role"
```

## Task 2.3: Persistence client + replace LocalStorage as source of truth

**Files:**
- Create: `src/services/scanPersistenceService.ts`
- Modify: `src/services/leadStorageService.ts` (keep LocalStorage as offline cache; add remote save)

- [ ] **Step 1:** Implement `scanPersistenceService.ts`:

```ts
import type { RoofScanResult } from '@/services/roofScannerService'
import type { EnrichedOwnerResult } from '@/types/enrichment'

export interface SavedScan { id: string; shareToken: string }

function sessionId(): string {
  const k = 'solaris-scan-session'
  let v = localStorage.getItem(k)
  if (!v) { v = crypto.randomUUID(); localStorage.setItem(k, v) }
  return v
}

export async function persistScan(
  scan: RoofScanResult, owner: EnrichedOwnerResult | null, financials: unknown,
): Promise<SavedScan | null> {
  try {
    const res = await fetch('/api/scans/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...scan, fincaNumber: owner?.cadastre?.fincaNumber ?? null,
        owner, financials, sessionId: sessionId() }),
    })
    if (!res.ok) return null
    const j = await res.json()
    return { id: j.id, shareToken: j.share_token }
  } catch { return null }
}
```

- [ ] **Step 2: Manual verify:** scan a building → network shows `POST /api/scans/save` 201 → row appears in `roof_scans` (`select count(*) from roof_scans where session_id is not null`).

- [ ] **Step 3: Commit**

```bash
git add src/services/scanPersistenceService.ts
git commit -m "feat(scanner): client persistence of scans (remote + offline cache)"
```

## Task 2.4: "Guardar como Lead" → intake with attribution + solar fields

**Files:**
- Modify: `api/leads/intake.ts` (accept solar fields + `roof_scan_id`)
- Modify: scanner UI (Save-as-Lead handler) — `src/hooks/useLeadManager.ts` or `RoofScannerPage.tsx`

- [ ] **Step 1:** In `api/leads/intake.ts`, destructure new optional fields (add to the `req.body` destructure, line 33-59): `system_kwp, annual_kwh, est_annual_savings_usd, payback_years, finca_number, roof_area_m2, scan_source, roof_scan_id`. Then add them to the `.insert({...})` object (after `status: 'new',`):

```ts
        system_kwp: system_kwp ?? null,
        annual_kwh: annual_kwh ?? null,
        est_annual_savings_usd: est_annual_savings_usd ?? null,
        payback_years: payback_years ?? null,
        finca_number: finca_number ?? null,
        roof_area_m2: roof_area_m2 ?? null,
        scan_source: scan_source ?? null,
        roof_scan_id: roof_scan_id ?? null,
```
(These columns exist from migration 051; `raw_data` already preserves everything as backup.)

- [ ] **Step 2:** In the scanner Save-as-Lead handler, POST to `/api/leads/intake` with `source: 'scanner'`, the owner's phone/name, the solar fields, and **client attribution** captured the same way the LP does — read UTM/gclid/fbclid from `sessionStorage`/cookies (reuse the existing LP capture util if present; otherwise pass `referrer_url: document.referrer`). On success, store `roof_scan_id` linkage by also calling persistScan first and passing its `id`.

```ts
const saved = await persistScan(scan, owner, financials)
await fetch('/api/leads/intake', { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: owner?.ownerName || scan.address || 'Scanner lead',
    phone: owner?.phone || '50760000000', // require/validate before enabling button
    source: 'scanner', location: scan.address,
    system_kwp: scan.maxSystemSizeKwp, annual_kwh: scan.yearlyEnergyKwh,
    est_annual_savings_usd: financials?.annual_savings_usd, payback_years: financials?.payback_discounted_years,
    finca_number: owner?.cadastre?.fincaNumber, roof_area_m2: scan.totalRoofAreaM2,
    scan_source: scan.source, roof_scan_id: saved?.id,
    utm_source, utm_medium, utm_campaign, gclid, fbclid, referrer_url: document.referrer,
  }) })
```
Guard: only enable the button when a valid Panama phone is present (reuse `PA_PHONE_RE` logic client-side).

- [ ] **Step 3: Manual verify:** Save a scanned building as a lead → `leads` row has `source='scanner'`, `system_kwp`, `roof_scan_id` set, `attribution_debug` populated; WhatsApp alert fires; CRM at `/crm-leads` shows it.

- [ ] **Step 4: Commit**

```bash
git add api/leads/intake.ts src/hooks/useLeadManager.ts src/pages/RoofScannerPage.tsx
git commit -m "feat(scanner): scan → lead via intake with attribution + solar fields"
```

---

# PHASE 3 — Inline Financial Engine (25-yr, USD/Panama)

Algorithm from TM `solar-financials.ts` (degradation curve, escalation, discounted payback, CO₂), localized with `PANAMA_DEFAULTS` (USD). Default residential tariff **$0.20/kWh** (user-confirmed; `PANAMA_DEFAULTS.electricityRate=0.195` is the commercial value).

## Task 3.1: solarFinancials.ts (pure module) + golden tests

**Files:**
- Create: `src/services/solarFinancials.ts`
- Test: `src/services/__tests__/solarFinancials.test.ts`

- [ ] **Step 1: Failing test** (hand-computed golden case: 10 kWp, PSH 4.5, PR 0.80, rate $0.20, self-consumption 0.70, costPerWp 0.95):

```ts
import { describe, it, expect } from 'vitest'
import { calculateSolarFinancials } from '@/services/solarFinancials'

describe('calculateSolarFinancials (Panama, USD)', () => {
  const r = calculateSolarFinancials({ systemSizeKwp: 10, pshAvg: 4.5 })
  it('year-1 production applies 2% LID', () => {
    // 10*4.5*365*0.80 = 13140 ; *0.98 = 12877
    expect(r.annual_kwh).toBe(12877)
  })
  it('year-1 savings = kWh * rate(0.20) * selfConsumption(0.70)', () => {
    // 12877.2 * 0.14 = 1802.8
    expect(r.annual_savings_usd).toBe(1803)
  })
  it('simple payback = price(9500) / year1 savings', () => {
    expect(r.payback_simple_years).toBeCloseTo(5.3, 1) // 9500/1802.8
  })
  it('CO2 yr1 = kWh * 0.537', () => {
    expect(r.co2_saved_kg_year1).toBe(6915) // 12877.2*0.537
  })
  it('25yr savings exceed 10yr; discounted payback positive', () => {
    expect(r.savings_25yr_usd).toBeGreaterThan(r.savings_10yr_usd)
    expect(r.payback_discounted_years).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement** `src/services/solarFinancials.ts`:

```ts
import { PANAMA_DEFAULTS } from '@/services/solarCalculator'

export const SOLAR_FINANCIAL_VERSION = 'pa-financials-2026-06-v1'

export interface SolarFinancialInput {
  systemSizeKwp: number
  pshAvg?: number
  retailRateUsd?: number          // default 0.20
  selfConsumptionPct?: number     // default 0.70 (0.85 with battery)
  batteryKwh?: number
  totalPriceUsd?: number          // default kWp*1000*costPerWp
  performanceRatio?: number       // default 0.80
}

export interface SolarFinancialOutput {
  version: string
  system_size_kwp: number
  effective_rate_usd: number
  annual_kwh: number
  monthly_kwh: number
  annual_savings_usd: number
  monthly_savings_usd: number
  total_price_usd: number
  payback_simple_years: number
  payback_discounted_years: number
  savings_10yr_usd: number
  savings_25yr_usd: number
  co2_saved_kg_year1: number
  co2_tons_25yr: number
}

const round = (v: number, d = 0) => { const f = 10 ** d; return Math.round(v * f) / f }
const FIRST_YEAR_LID = 0.02
const CO2_KG_PER_KWH = PANAMA_DEFAULTS.gridEmissionFactor // 0.537 tCO2/MWh == kg/kWh

export function calculateSolarFinancials(input: SolarFinancialInput): SolarFinancialOutput {
  const kwp = input.systemSizeKwp || 0
  const psh = input.pshAvg ?? PANAMA_DEFAULTS.peakSunHours
  const pr = input.performanceRatio ?? PANAMA_DEFAULTS.performanceRatio
  const rate = input.retailRateUsd ?? 0.20
  const selfPct = input.selfConsumptionPct ?? ((input.batteryKwh || 0) > 0 ? 0.85 : PANAMA_DEFAULTS.selfConsumptionRatio)
  const effRate = rate * selfPct
  const price = input.totalPriceUsd ?? kwp * 1000 * PANAMA_DEFAULTS.costPerWp
  const omAnnual = kwp * PANAMA_DEFAULTS.omCostPerKwpYear
  const esc = PANAMA_DEFAULTS.rateEscalation
  const disc = PANAMA_DEFAULTS.discountRate
  const degr = PANAMA_DEFAULTS.degradationRate
  const life = PANAMA_DEFAULTS.systemLifetime

  const baseline = kwp * psh * 365 * pr
  const year1Kwh = baseline * (1 - FIRST_YEAR_LID)
  const year1Savings = year1Kwh * effRate

  let lifetimeSavings = 0, lifetimeKwh = 0, cum10 = 0
  let cumDiscounted = -price, paybackDisc = life
  for (let y = 1; y <= life; y++) {
    const degFactor = y === 1 ? (1 - FIRST_YEAR_LID) : (1 - FIRST_YEAR_LID) * (1 - degr) ** (y - 2)
    const yKwh = baseline * degFactor
    const ySavings = yKwh * effRate * (1 + esc) ** (y - 1)
    const yCash = ySavings - omAnnual
    lifetimeKwh += yKwh; lifetimeSavings += ySavings
    if (y <= 10) cum10 += ySavings
    const dCash = yCash / (1 + disc) ** y
    const prev = cumDiscounted; cumDiscounted += dCash
    if (paybackDisc === life && cumDiscounted >= 0 && dCash > 0) paybackDisc = y - 1 + Math.abs(prev) / dCash
  }
  return {
    version: SOLAR_FINANCIAL_VERSION,
    system_size_kwp: round(kwp, 2),
    effective_rate_usd: round(effRate, 3),
    annual_kwh: Math.round(year1Kwh),
    monthly_kwh: Math.round(year1Kwh / 12),
    annual_savings_usd: Math.round(year1Savings),
    monthly_savings_usd: Math.round(year1Savings / 12),
    total_price_usd: Math.round(price),
    payback_simple_years: year1Savings > 0 ? round(price / year1Savings, 1) : 0,
    payback_discounted_years: price > 0 ? round(paybackDisc, 1) : 0,
    savings_10yr_usd: Math.round(cum10),
    savings_25yr_usd: Math.round(lifetimeSavings),
    co2_saved_kg_year1: Math.round(year1Kwh * CO2_KG_PER_KWH),
    co2_tons_25yr: round((lifetimeKwh * CO2_KG_PER_KWH) / 1000, 1),
  }
}
```

- [ ] **Step 4: Run → PASS. Commit**

```bash
git add src/services/solarFinancials.ts src/services/__tests__/solarFinancials.test.ts
git commit -m "feat(scanner): Panama USD 25-yr financial engine (port of TM model)"
```

## Task 3.2: Inline financials panel + persist

**Files:**
- Create: `src/components/scanner/SolarFinancialsPanel.tsx`
- Modify: building-detail render in `RoofScannerPage.tsx`

- [ ] **Step 1: Implement** `SolarFinancialsPanel.tsx` — props `{ systemKwp, pshAvg }`; local state for financing toggle (cash / battery); calls `calculateSolarFinancials` and shows (Spanish): Ahorro anual ($), Recuperación (años, discounted), Ahorro 25 años ($), CO₂ evitado (ton/año). Recompute on toggle via `useMemo`.

```tsx
import { useMemo, useState } from 'react'
import { calculateSolarFinancials } from '@/services/solarFinancials'

export function SolarFinancialsPanel({ systemKwp, pshAvg }: { systemKwp: number; pshAvg?: number }) {
  const [battery, setBattery] = useState(false)
  const f = useMemo(() => calculateSolarFinancials({ systemSizeKwp: systemKwp, pshAvg, batteryKwh: battery ? 10 : 0 }), [systemKwp, pshAvg, battery])
  return (
    <div className="rounded-xl bg-zinc-900/60 p-4 space-y-2 text-sm">
      <div className="flex justify-between"><span>Sistema</span><b>{f.system_size_kwp} kWp</b></div>
      <div className="flex justify-between"><span>Ahorro anual</span><b>${f.annual_savings_usd.toLocaleString()}</b></div>
      <div className="flex justify-between"><span>Recuperación</span><b>{f.payback_discounted_years} años</b></div>
      <div className="flex justify-between"><span>Ahorro 25 años</span><b>${f.savings_25yr_usd.toLocaleString()}</b></div>
      <div className="flex justify-between"><span>CO₂ evitado</span><b>{f.co2_tons_25yr} t (25 a)</b></div>
      <label className="flex items-center gap-2 pt-2 text-xs">
        <input type="checkbox" checked={battery} onChange={(e) => setBattery(e.target.checked)} /> Con batería (85% autoconsumo)
      </label>
    </div>
  )
}
```

- [ ] **Step 2:** Render `<SolarFinancialsPanel systemKwp={result.maxSystemSizeKwp} pshAvg={result.peakSunHoursPerYear/365} />` in the building-detail area. Include `calculateSolarFinancials(...)` output in the `financials` passed to `persistScan` (Task 2.3) so `financials_json` is stored.

- [ ] **Step 3: Manual verify** + **Commit**

```bash
git add src/components/scanner/SolarFinancialsPanel.tsx src/pages/RoofScannerPage.tsx
git commit -m "feat(scanner): inline 25-yr financials panel with battery toggle"
```

---

# PHASE 4 — Parcel Boundary + Registry Deep-Link

`cadastreService.lookupParcel` already returns `parcelBoundary` (`{lat,lng}[]`) and `registroPublicoUrl`. This phase renders them.

## Task 4.1: Parcel boundary layer on MapLibre

**Files:**
- Create: `src/components/scanner/ParcelBoundaryLayer.tsx`
- Modify: map render in `RoofScannerPage.tsx`

- [ ] **Step 1:** Implement a `Source`/`Layer` (react-map-gl/maplibre) that converts `parcelBoundary` to a GeoJSON polygon:

```tsx
import { Source, Layer } from 'react-map-gl/maplibre'
export function ParcelBoundaryLayer({ boundary }: { boundary?: { lat: number; lng: number }[] }) {
  if (!boundary || boundary.length < 3) return null
  const ring = boundary.map((p) => [p.lng, p.lat])
  ring.push(ring[0])
  const data = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] }, properties: {} } as const
  return (
    <Source id="parcel" type="geojson" data={data as any}>
      <Layer id="parcel-fill" type="fill" paint={{ 'fill-color': '#f59e0b', 'fill-opacity': 0.12 }} />
      <Layer id="parcel-line" type="line" paint={{ 'line-color': '#f59e0b', 'line-width': 2, 'line-dasharray': [2, 1] }} />
    </Source>
  )
}
```

- [ ] **Step 2:** When a building is selected, call `lookupParcel(center.lat, center.lng)`; render `<ParcelBoundaryLayer boundary={cadastre?.parcelBoundary} />` inside the `<Map>`.

- [ ] **Step 3: Manual verify** (titled urban address shows dashed amber parcel outline). **Commit**

```bash
git add src/components/scanner/ParcelBoundaryLayer.tsx src/pages/RoofScannerPage.tsx
git commit -m "feat(scanner): render ANATI parcel boundary on map"
```

## Task 4.2: Registro Público button + untitled flag

**Files:**
- Modify: building-detail render in `RoofScannerPage.tsx`

- [ ] **Step 1:** When `cadastre?.fincaNumber` exists, show a button linking to `cadastre.registroPublicoUrl` (`getRegistroPublicoUrl`), target `_blank`. When absent, show a Spanish note: *"Sin finca registrada — posible Derecho Posesorio (requiere verificación en campo)."*

```tsx
{cadastre?.fincaNumber ? (
  <a href={cadastre.registroPublicoUrl} target="_blank" rel="noreferrer" className="btn">
    Ver finca {cadastre.fincaNumber} en Registro Público
  </a>
) : (
  <p className="text-amber-400 text-xs">Sin finca registrada — posible Derecho Posesorio (verificación en campo).</p>
)}
```

- [ ] **Step 2: Manual verify + Commit**

```bash
git add src/pages/RoofScannerPage.tsx
git commit -m "feat(scanner): Registro Público link + untitled-parcel flag"
```

---

# PHASE 5 — 3-Option Proposal (EPC / PPA / Battery)

Extend the existing `api/generate-proposal.ts`. Compute three options from the scan's financials.

## Task 5.1: Proposal options builder + test

**Files:**
- Create: `src/services/proposalOptions.ts`
- Test: `src/services/__tests__/proposalOptions.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest'
import { buildProposalOptions } from '@/services/proposalOptions'
describe('buildProposalOptions', () => {
  const opts = buildProposalOptions({ systemSizeKwp: 10, pshAvg: 4.5 })
  it('returns EPC, PPA, EPC+Battery', () => {
    expect(opts.map(o => o.id)).toEqual(['epc', 'ppa', 'epc_battery'])
  })
  it('battery option uses higher self-consumption → higher annual savings than EPC', () => {
    const epc = opts.find(o => o.id === 'epc')!
    const bat = opts.find(o => o.id === 'epc_battery')!
    expect(bat.annual_savings_usd).toBeGreaterThan(epc.annual_savings_usd)
  })
  it('PPA has zero upfront', () => {
    expect(opts.find(o => o.id === 'ppa')!.upfront_usd).toBe(0)
  })
})
```

- [ ] **Step 2: Run → FAIL. Step 3: Implement**

```ts
import { calculateSolarFinancials, type SolarFinancialInput } from '@/services/solarFinancials'

export interface ProposalOption {
  id: 'epc' | 'ppa' | 'epc_battery'
  label_es: string; upfront_usd: number
  annual_savings_usd: number; payback_years: number; savings_25yr_usd: number; co2_tons_25yr: number
}

export function buildProposalOptions(base: SolarFinancialInput): ProposalOption[] {
  const epc = calculateSolarFinancials(base)
  const bat = calculateSolarFinancials({ ...base, batteryKwh: 10 })
  return [
    { id: 'epc', label_es: 'Compra (EPC)', upfront_usd: epc.total_price_usd,
      annual_savings_usd: epc.annual_savings_usd, payback_years: epc.payback_discounted_years,
      savings_25yr_usd: epc.savings_25yr_usd, co2_tons_25yr: epc.co2_tons_25yr },
    { id: 'ppa', label_es: 'PPA (sin inversión inicial)', upfront_usd: 0,
      annual_savings_usd: Math.round(epc.annual_savings_usd * 0.4), payback_years: 0,
      savings_25yr_usd: Math.round(epc.savings_25yr_usd * 0.4), co2_tons_25yr: epc.co2_tons_25yr },
    { id: 'epc_battery', label_es: 'EPC + Batería', upfront_usd: bat.total_price_usd + 4000,
      annual_savings_usd: bat.annual_savings_usd, payback_years: bat.payback_discounted_years,
      savings_25yr_usd: bat.savings_25yr_usd, co2_tons_25yr: bat.co2_tons_25yr },
  ]
}
```

- [ ] **Step 4: Run → PASS. Commit**

```bash
git add src/services/proposalOptions.ts src/services/__tests__/proposalOptions.test.ts
git commit -m "feat(scanner): 3-option proposal builder (EPC/PPA/Battery)"
```

## Task 5.2: Wire into proposal generation + trigger

**Files:**
- Modify: `api/generate-proposal.ts` (accept `options[]`, render a Spanish 3-column comparison; keep existing single-option path working)
- Modify: scanner/lead UI — "Generar Propuesta" button

- [ ] **Step 1:** Read `api/generate-proposal.ts` to learn its current input/template shape. Add an optional `options: ProposalOption[]` to the request; when present, render a comparison table (columns = the 3 options; rows = Inversión inicial, Ahorro anual, Recuperación, Ahorro 25 años, CO₂). Reuse the existing HTML→PDF path.

- [ ] **Step 2:** In the lead/scan detail, add "Generar Propuesta" → POST to `/api/generate-proposal` with `buildProposalOptions({ systemSizeKwp, pshAvg })` + owner/address; open/download the returned PDF; store the proposal ref/URL on the lead (set `status='proposal_sent'`).

- [ ] **Step 3: Manual verify** (PDF lists 3 options in Spanish/USD with correct numbers from the financial engine). **Commit**

```bash
git add api/generate-proposal.ts src/pages/RoofScannerPage.tsx
git commit -m "feat(scanner): generate 3-option Spanish PDF proposal from a scan"
```

---

## Final: verification + PR

- [ ] Run full suite: `npm test` → all green.
- [ ] Build: `npm run build` → succeeds.
- [ ] Manual end-to-end (webapp-testing skill): scan Azuero address → AI-vision badge → financials panel → parcel/registry → save as lead (appears in CRM with attribution) → generate 3-option proposal.
- [ ] Open PR (only when user asks): `feature/scanner-upgrade` → base. Do NOT include the unrelated SEO working-tree changes.

---

## Notes / resolved decisions
- **Tariff:** $0.20/kWh residential (user-confirmed), configurable per call.
- **CO₂ factor:** 0.537 kg/kWh from `PANAMA_DEFAULTS.gridEmissionFactor` (resolved — no longer open).
- **Lead path:** reuse `api/leads/intake.ts` (attribution + CAPI + WhatsApp alert already wired) — do NOT build a parallel writer.
- **roof_scans table:** already exists (migration 050); migration 051 only *adds* public/solar columns.
- **Out of scope (YAGNI):** manual polygon-drawing editor, Nearmap/EagleView (no Panama coverage), offline field app, owner personal-data scraping (kept manual).
