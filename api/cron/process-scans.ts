/**
 * Async Scan-Engine Cron Worker — runs every 10 minutes.
 *
 * Picks queued scan_requests, fetches OSM data via Overpass,
 * scores each result, deduplicates, and inserts results as
 * scan_candidates (status=pending) via the insert_scan_candidate RPC.
 *
 * scan_type='roof': OSM buildings query (existing behaviour, now queued for review).
 * scan_type='land': OSM landuse polygons, ground-mount sizing, Panama tier/grade.
 *
 * Required env vars:
 *   CRON_SECRET              — shared secret for cron auth
 *   SUPABASE_URL             — Supabase project URL (or VITE_SUPABASE_URL fallback)
 *   SUPABASE_SERVICE_ROLE_KEY — service-role key (bypasses RLS)
 *
 * Optional env vars:
 *   OVERPASS_URL             — custom Overpass endpoint
 *                             (default: https://overpass-api.de/api/interpreter)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// ===== SERVICE-ROLE CLIENT =====

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// ===== CONSTANTS =====

const SCANS_PER_RUN        = 3;          // max scan_requests to process per invocation
const MAX_BBOX_DEG         = 0.2;         // reject bbox with any side > this (degrees)
const MAX_BUILDINGS        = 1500;        // cap Overpass results per roof scan
const MAX_LAND_POLYGONS    = 800;         // cap Overpass results per land scan
const DEDUP_DEG            = 0.00025;     // ~28 m — minimum centroid distance for a new candidate
const OVERPASS_TIMEOUT_MS  = 30_000;
const OVERPASS_RETRY_DELAY_MS = 5_000;

// Roof constants
const PANELS_PER_M2  = 1 / 2.58;  // panels per m² of usable area
const PANEL_WATTS    = 580;         // Wp per panel
const USABLE_RATIO   = 0.60;        // usable / total roof fraction
const KWH_PER_KWP    = 1600;        // kWh/kWp/yr for Panama

// Land constants
const LAND_USABLE_RATIO = 0.75;     // usable / total land area
const MW_PER_HA         = 1.0;      // 1 MWp per usable hectare (mono-PERC ground-mount)
const MIN_LAND_M2       = 15_000;   // ~1.5 ha minimum parcel size

// ===== TYPES =====

interface OverpassElement {
  type: 'way' | 'relation';
  id: number;
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
  bounds?: { minlat: number; minlon: number; maxlat: number; maxlon: number };
  members?: Array<{
    type: string;
    role: string;
    geometry?: Array<{ lat: number; lon: number }>;
  }>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

interface ScanRequest {
  id: string;
  bbox: number[];            // [minLng, minLat, maxLng, maxLat]
  filters: Record<string, unknown>;
  scan_type: 'roof' | 'land';
}

interface ExistingCandidate {
  latitude: number;
  longitude: number;
}

interface ScanCounts {
  found: number;
  kept: number;
  deduped: number;
  candidates_inserted: number;
  skipped: number;
}

interface ScanResult {
  id: string;
  status: 'done' | 'failed';
  counts?: ScanCounts;
  error?: string;
}

// ===== GEOMETRY HELPERS =====

function calculatePolygonArea(
  coords: Array<{ lat: number; lon: number }>
): number {
  if (coords.length < 3) return 0;

  const avgLat = coords.reduce((sum, c) => sum + c.lat, 0) / coords.length;
  const latRad = (avgLat * Math.PI) / 180;

  const mPerDegLat = 110574;
  const mPerDegLon = 111320 * Math.cos(latRad);

  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    const xi = coords[i].lon * mPerDegLon;
    const yi = coords[i].lat * mPerDegLat;
    const xj = coords[j].lon * mPerDegLon;
    const yj = coords[j].lat * mPerDegLat;
    area += xi * yj - xj * yi;
  }

  return Math.abs(area / 2);
}

function calculateCentroid(
  coords: Array<{ lat: number; lon: number }>
): { lat: number; lon: number } {
  if (coords.length === 0) return { lat: 0, lon: 0 };
  const sum = coords.reduce(
    (acc, c) => ({ lat: acc.lat + c.lat, lon: acc.lon + c.lon }),
    { lat: 0, lon: 0 }
  );
  return { lat: sum.lat / coords.length, lon: sum.lon / coords.length };
}

function extractGeometry(
  element: OverpassElement
): Array<{ lat: number; lon: number }> {
  if (element.type === 'way' && element.geometry) {
    return element.geometry;
  }
  if (element.type === 'relation' && element.members) {
    const outer = element.members.find(
      (m) => m.role === 'outer' && m.geometry && m.geometry.length > 0
    );
    if (outer?.geometry) return outer.geometry;

    const allCoords: Array<{ lat: number; lon: number }> = [];
    for (const member of element.members) {
      if (member.geometry) allCoords.push(...member.geometry);
    }
    return allCoords;
  }
  return [];
}

// ===== ROOF SCORING HELPERS =====

const COMMERCIAL_TYPES = new Set([
  'commercial', 'retail', 'industrial', 'warehouse', 'supermarket',
]);
const INSTITUTIONAL_TYPES = new Set([
  'office', 'hotel', 'hospital', 'school', 'university', 'public', 'civic', 'government',
]);

function scoreArea(areaM2: number): number {
  if (areaM2 < 50)    return 0;
  if (areaM2 < 200)   return 15;
  if (areaM2 < 500)   return 30;
  if (areaM2 < 2000)  return 45;
  if (areaM2 <= 10000) return 50;
  return 45;
}

function scoreType(tags: Record<string, string>): number {
  const bt = (tags['building'] || '').toLowerCase();
  if (COMMERCIAL_TYPES.has(bt))    return 30;
  if (INSTITUTIONAL_TYPES.has(bt)) return 25;
  if (bt === 'residential' || bt === 'apartments') return 15;
  return 10;
}

function scoreName(tags: Record<string, string>): number {
  let s = 0;
  if (tags['name'])        s += 15;
  if (tags['addr:street']) s += 5;
  return Math.min(s, 20);
}

function priorityFromScore(score: number): 'A' | 'B' | 'C' | 'D' {
  if (score >= 75) return 'A';
  if (score >= 55) return 'B';
  if (score >= 35) return 'C';
  return 'D';
}

// ===== LAND SIZING HELPERS =====

function landTier(mwp: number): 'comercial' | 'agro' | 'utility' {
  if (mwp <= 1) return 'comercial';
  if (mwp <= 9) return 'agro';
  return 'utility';
}

function landGrade(mwp: number): 'A' | 'B' | 'C' | 'D' {
  if (mwp > 9)  return 'A';   // utility-scale
  if (mwp >= 5) return 'B';   // large agro
  return 'C';                  // small/comercial
}

function landScoreFromGrade(grade: 'A' | 'B' | 'C' | 'D'): number {
  switch (grade) {
    case 'A': return 90;
    case 'B': return 70;
    case 'C': return 50;
    default:  return 25;
  }
}

// ===== OVERPASS =====

function buildRoofOverpassQuery(
  minLng: number, minLat: number, maxLng: number, maxLat: number
): string {
  // Overpass bbox order: south,west,north,east
  const bbox = `${minLat},${minLng},${maxLat},${maxLng}`;
  return `[out:json][timeout:30];
(
  way["building"](${bbox});
  relation["building"](${bbox});
);
out geom;`;
}

function buildLandOverpassQuery(
  minLng: number, minLat: number, maxLng: number, maxLat: number
): string {
  const bbox = `${minLat},${minLng},${maxLat},${maxLng}`;
  return `[out:json][timeout:30];
(
  way["landuse"~"farmland|meadow|grass|orchard|farmyard|greenfield|plantation|pasture"](${bbox});
  relation["landuse"~"farmland|meadow|grass|orchard|farmyard|greenfield|plantation|pasture"](${bbox});
);
out geom;`;
}

async function fetchOverpass(query: string): Promise<OverpassResponse> {
  const primary = process.env.OVERPASS_URL || 'https://overpass-api.de/api/interpreter';
  const fallback = 'https://overpass.kumi.systems/api/interpreter';

  const attempt = async (url: string): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OVERPASS_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          // overpass-api.de returns 406 for requests without a User-Agent
          'User-Agent': 'SolarisPanama/1.0 (roof scanner; solaris-panama.com)',
          Accept: 'application/json',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      return res;
    } finally {
      clearTimeout(timer);
    }
  };

  let res: Response;
  try {
    res = await attempt(primary);
    if (!res.ok && res.status !== 400) {
      // server-side rejection (406/429/504...) — try the fallback mirror
      await new Promise((r) => setTimeout(r, OVERPASS_RETRY_DELAY_MS));
      res = await attempt(fallback);
    }
  } catch (_e) {
    // network error — one retry on the fallback mirror after backoff
    await new Promise((r) => setTimeout(r, OVERPASS_RETRY_DELAY_MS));
    res = await attempt(fallback);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`overpass_${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json() as Promise<OverpassResponse>;
}

// ===== PROCESS ROOF SCAN REQUEST =====

async function processRoofScan(req: ScanRequest): Promise<ScanResult> {
  const [minLng, minLat, maxLng, maxLat] = req.bbox;

  const counts: ScanCounts = { found: 0, kept: 0, deduped: 0, candidates_inserted: 0, skipped: 0 };

  // Fetch OSM buildings
  const query = buildRoofOverpassQuery(minLng, minLat, maxLng, maxLat);
  const overpassData = await fetchOverpass(query);

  const elements = (overpassData.elements || []).slice(0, MAX_BUILDINGS);
  counts.found = overpassData.elements?.length ?? 0;

  // Load existing candidates in bbox (for in-process dedup)
  const { data: existingCandidates } = await supabase
    .from('scan_candidates')
    .select('latitude, longitude')
    .eq('kind', 'roof')
    .in('status', ['pending', 'added'])
    .gte('latitude', minLat)
    .lte('latitude', maxLat)
    .gte('longitude', minLng)
    .lte('longitude', maxLng);

  const existing: ExistingCandidate[] = existingCandidates || [];

  for (const element of elements) {
    if (element.type !== 'way' && element.type !== 'relation') continue;

    const coords = extractGeometry(element);
    if (coords.length < 3) { counts.skipped++; continue; }

    const areaM2 = Math.round(calculatePolygonArea(coords));
    if (areaM2 < 10) { counts.skipped++; continue; }

    const centroid = calculateCentroid(coords);
    const tags = element.tags || {};

    // Proximity dedup against existing candidates
    const isNearExisting = existing.some(
      (r) =>
        Math.abs(r.latitude  - centroid.lat) < DEDUP_DEG &&
        Math.abs(r.longitude - centroid.lon) < DEDUP_DEG
    );
    if (isNearExisting) { counts.deduped++; continue; }

    counts.kept++;

    const usableM2   = Math.round(areaM2 * USABLE_RATIO);
    const panelCount = Math.floor(usableM2 * PANELS_PER_M2);
    const systemKwp  = Math.round((panelCount * PANEL_WATTS) / 1000 * 10) / 10;
    const yearlyKwh  = Math.round(systemKwp * KWH_PER_KWP);

    const score    = scoreArea(areaM2) + scoreType(tags) + scoreName(tags);
    const grade    = priorityFromScore(score);

    const address =
      [
        tags['addr:housename'] || tags['name'],
        tags['addr:street'],
        tags['addr:city'] || 'Panamá',
      ]
        .filter(Boolean)
        .join(', ') || `${centroid.lat.toFixed(5)}, ${centroid.lon.toFixed(5)}`;

    const geom = {
      type: 'Polygon',
      coordinates: [
        [...coords.map((c) => [c.lon, c.lat]), [coords[0].lon, coords[0].lat]],
      ],
    };

    const { data: newId, error: rpcError } = await supabase.rpc('insert_scan_candidate', {
      p: {
        scan_request_id: req.id,
        kind:            'roof',
        latitude:        centroid.lat,
        longitude:       centroid.lon,
        geom:            JSON.stringify(geom),
        area_m2:         areaM2,
        area_ha:         Math.round(areaM2 / 10000 * 1000) / 1000,
        estimated_kwp:   systemKwp,
        estimated_mwp:   Math.round(systemKwp / 1000 * 1000) / 1000,
        score,
        grade,
        address,
        raw: JSON.stringify({
          osm_id: element.id,
          tags,
          usableM2,
          panelCount,
          yearlyKwh,
        }),
      },
    });

    if (rpcError) {
      console.warn(`[process-scans] insert_scan_candidate failed for element ${element.id}:`, rpcError.message);
      counts.skipped++;
    } else if (newId !== null) {
      counts.candidates_inserted++;
      // Add to local dedup list
      existing.push({ latitude: centroid.lat, longitude: centroid.lon });
    } else {
      // RPC returned NULL — skipped (dedup or exclusion)
      counts.deduped++;
    }
  }

  return { id: req.id, status: 'done', counts };
}

// ===== PROCESS LAND SCAN REQUEST =====

async function processLandScan(req: ScanRequest): Promise<ScanResult> {
  const [minLng, minLat, maxLng, maxLat] = req.bbox;

  const counts: ScanCounts = { found: 0, kept: 0, deduped: 0, candidates_inserted: 0, skipped: 0 };

  const query = buildLandOverpassQuery(minLng, minLat, maxLng, maxLat);
  const overpassData = await fetchOverpass(query);

  const elements = (overpassData.elements || []).slice(0, MAX_LAND_POLYGONS);
  counts.found = overpassData.elements?.length ?? 0;

  // Load existing land candidates in bbox for in-process dedup
  const { data: existingCandidates } = await supabase
    .from('scan_candidates')
    .select('latitude, longitude')
    .eq('kind', 'land')
    .in('status', ['pending', 'added'])
    .gte('latitude', minLat)
    .lte('latitude', maxLat)
    .gte('longitude', minLng)
    .lte('longitude', maxLng);

  const existing: ExistingCandidate[] = existingCandidates || [];

  for (const element of elements) {
    if (element.type !== 'way' && element.type !== 'relation') continue;

    const coords = extractGeometry(element);
    if (coords.length < 3) { counts.skipped++; continue; }

    const areaM2 = Math.round(calculatePolygonArea(coords));
    if (areaM2 < MIN_LAND_M2) { counts.skipped++; continue; }

    const centroid = calculateCentroid(coords);
    const tags     = element.tags || {};
    const landuse  = tags['landuse'] || 'unknown';

    // Proximity dedup
    const isNearExisting = existing.some(
      (r) =>
        Math.abs(r.latitude  - centroid.lat) < DEDUP_DEG &&
        Math.abs(r.longitude - centroid.lon) < DEDUP_DEG
    );
    if (isNearExisting) { counts.deduped++; continue; }

    counts.kept++;

    // Ground-mount sizing (Panama)
    const areaHa    = areaM2 / 10000;
    const usableHa  = areaHa * LAND_USABLE_RATIO;
    const mwp       = Math.round(usableHa * MW_PER_HA * 100) / 100;   // 2 dp
    const kwp       = Math.round(mwp * 1000 * 10) / 10;               // 1 dp
    const yearlyKwh = Math.round(kwp * KWH_PER_KWP);

    const tier  = landTier(mwp);
    const grade = landGrade(mwp);
    const score = landScoreFromGrade(grade);

    // Address: no reverse-geocode — descriptive string
    const address = `Terreno ${landuse} ~${areaHa.toFixed(1)}ha`;

    const geom = {
      type: 'Polygon',
      coordinates: [
        [...coords.map((c) => [c.lon, c.lat]), [coords[0].lon, coords[0].lat]],
      ],
    };

    const { data: newId, error: rpcError } = await supabase.rpc('insert_scan_candidate', {
      p: {
        scan_request_id: req.id,
        kind:            'land',
        latitude:        centroid.lat,
        longitude:       centroid.lon,
        geom:            JSON.stringify(geom),
        area_m2:         areaM2,
        area_ha:         Math.round(areaHa * 1000) / 1000,
        estimated_kwp:   kwp,
        estimated_mwp:   mwp,
        tier,
        landuse,
        score,
        grade,
        address,
        raw: JSON.stringify({
          osm_id:   element.id,
          tags,
          usableHa: Math.round(usableHa * 1000) / 1000,
          yearlyKwh,
        }),
      },
    });

    if (rpcError) {
      console.warn(`[process-scans] insert_scan_candidate (land) failed for element ${element.id}:`, rpcError.message);
      counts.skipped++;
    } else if (newId !== null) {
      counts.candidates_inserted++;
      existing.push({ latitude: centroid.lat, longitude: centroid.lon });
    } else {
      counts.deduped++;
    }
  }

  return { id: req.id, status: 'done', counts };
}

// ===== PROCESS ONE SCAN REQUEST (dispatch by type) =====

async function processScan(req: ScanRequest): Promise<ScanResult> {
  const [minLng, minLat, maxLng, maxLat] = req.bbox;

  // Guard: bbox side limit
  if (Math.abs(maxLng - minLng) > MAX_BBOX_DEG || Math.abs(maxLat - minLat) > MAX_BBOX_DEG) {
    return { id: req.id, status: 'failed', error: 'bbox too large' };
  }

  // Mark running
  await supabase
    .from('scan_requests')
    .update({ status: 'running', updated_at: new Date().toISOString() })
    .eq('id', req.id);

  try {
    const scanType = req.scan_type ?? 'roof';
    let result: ScanResult;

    if (scanType === 'land') {
      result = await processLandScan(req);
    } else {
      result = await processRoofScan(req);
    }

    // Mark done
    await supabase
      .from('scan_requests')
      .update({
        status:     'done',
        counts:     result.counts ?? {},
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.id);

    return result;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[process-scans] scan ${req.id} failed:`, errMsg);

    await supabase
      .from('scan_requests')
      .update({
        status:     'failed',
        error:      errMsg,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.id);

    return { id: req.id, status: 'failed', error: errMsg };
  }
}

// ===== HANDLER =====

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Auth: mirror stale-leads-alert.ts / upload-google-conversions.ts
  if (
    process.env.CRON_SECRET &&
    req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    // Poll queued scan_requests, oldest first
    const { data: queued, error: fetchError } = await supabase
      .from('scan_requests')
      .select('id, bbox, filters, scan_type')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(SCANS_PER_RUN);

    if (fetchError) {
      console.error('[process-scans] fetch error:', fetchError);
      return res.status(500).json({ error: 'fetch_failed' });
    }

    if (!queued || queued.length === 0) {
      return res.status(200).json({ status: 'no_pending', processed: 0 });
    }

    const scans: ScanResult[] = [];
    for (const row of queued) {
      const result = await processScan(row as ScanRequest);
      scans.push(result);
    }

    return res.status(200).json({
      status:    'done',
      processed: scans.length,
      scans,
    });
  } catch (err) {
    console.error('[process-scans] handler error:', err);
    return res.status(500).json({ error: String(err) });
  }
}
