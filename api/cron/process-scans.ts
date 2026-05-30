/**
 * Async Scan-Engine Cron Worker — runs every 10 minutes.
 *
 * Picks queued scan_requests, fetches OSM buildings via Overpass,
 * scores each building for solar suitability, deduplicates, and
 * inserts results via the insert_detected_roof RPC (which also
 * creates linked leads rows idempotently).
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

// ===== SERVICE-ROLE CLIENT (mirrors stale-leads-alert.ts / upload-google-conversions.ts) =====

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// ===== CONSTANTS =====

const SCANS_PER_RUN = 3;          // max scan_requests to process per invocation
const MAX_BBOX_DEG = 0.2;         // reject bbox with any side > this (degrees)
const MAX_BUILDINGS = 1500;       // cap Overpass results per scan
const DEDUP_DEG = 0.00025;        // ~28 m — minimum centroid distance for a new row
const OVERPASS_TIMEOUT_MS = 30_000;
const OVERPASS_RETRY_DELAY_MS = 5_000;
const PANELS_PER_M2 = 1 / 2.58;  // panels per m² of usable area
const PANEL_WATTS = 580;          // Wp per panel
const USABLE_RATIO = 0.60;        // usable / total roof fraction

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
}

interface ExistingRoof {
  latitude: number;
  longitude: number;
}

interface ScanCounts {
  found: number;
  kept: number;
  deduped: number;
  inserted: number;
  skipped: number;
}

interface ScanResult {
  id: string;
  status: 'done' | 'failed';
  counts?: ScanCounts;
  error?: string;
}

// ===== GEOMETRY HELPERS (replicated from src/services/overpassService.ts — no browser deps) =====

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

// ===== SCORING HELPERS (replicated from src/services/roofClassifier.ts) =====

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
  if (COMMERCIAL_TYPES.has(bt))   return 30;
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

// ===== OVERPASS =====

function buildOverpassQuery(
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

async function fetchOverpass(query: string): Promise<OverpassResponse> {
  const url = process.env.OVERPASS_URL || 'https://overpass-api.de/api/interpreter';

  const attempt = async (): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OVERPASS_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
    res = await attempt();
  } catch (_e) {
    // one retry after backoff
    await new Promise((r) => setTimeout(r, OVERPASS_RETRY_DELAY_MS));
    res = await attempt();
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`overpass_${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json() as Promise<OverpassResponse>;
}

// ===== PROCESS ONE SCAN REQUEST =====

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

  const counts: ScanCounts = { found: 0, kept: 0, deduped: 0, inserted: 0, skipped: 0 };

  try {
    // Fetch OSM buildings
    const query = buildOverpassQuery(minLng, minLat, maxLng, maxLat);
    const overpassData = await fetchOverpass(query);

    const elements = (overpassData.elements || []).slice(0, MAX_BUILDINGS);
    counts.found = overpassData.elements?.length ?? 0;

    // Load existing roofs in bbox once (for dedup)
    const { data: existingRoofs } = await supabase
      .from('roof_scans')
      .select('latitude, longitude')
      .gte('latitude', minLat)
      .lte('latitude', maxLat)
      .gte('longitude', minLng)
      .lte('longitude', maxLng);

    const existing: ExistingRoof[] = existingRoofs || [];

    // Process each building
    for (const element of elements) {
      if (element.type !== 'way' && element.type !== 'relation') continue;

      const coords = extractGeometry(element);

      if (coords.length < 3) {
        counts.skipped++;
        continue;
      }

      const areaM2 = Math.round(calculatePolygonArea(coords));
      if (areaM2 < 10) {
        counts.skipped++;
        continue;
      }

      const centroid = calculateCentroid(coords);
      const tags = element.tags || {};

      // Proximity dedup against existing roof_scans
      const isNearExisting = existing.some(
        (r) =>
          Math.abs(r.latitude - centroid.lat) < DEDUP_DEG &&
          Math.abs(r.longitude - centroid.lon) < DEDUP_DEG
      );

      if (isNearExisting) {
        counts.deduped++;
        continue;
      }

      counts.kept++;

      // Compute derived fields
      const usableM2 = Math.round(areaM2 * USABLE_RATIO);
      const panelCount = Math.floor(usableM2 * PANELS_PER_M2);
      const systemKwp = Math.round((panelCount * PANEL_WATTS) / 1000 * 10) / 10;
      const yearlyKwh = Math.round(systemKwp * 1600); // ~1,600 kWh/kWp/yr for Panama

      // Solar score
      const score = scoreArea(areaM2) + scoreType(tags) + scoreName(tags);
      const priority = priorityFromScore(score);

      // Build address string from OSM tags (best-effort)
      const address =
        [
          tags['addr:housename'] || tags['name'],
          tags['addr:street'],
          tags['addr:city'] || 'Panamá',
        ]
          .filter(Boolean)
          .join(', ') || `${centroid.lat.toFixed(5)}, ${centroid.lon.toFixed(5)}`;

      // Build GeoJSON polygon from footprint coords
      const roofGeom = {
        type: 'Polygon',
        coordinates: [
          [...coords.map((c) => [c.lon, c.lat]), [coords[0].lon, coords[0].lat]],
        ],
      };

      // Call insert_detected_roof RPC (handles idempotency by lat/lng at 5dp)
      const { error: rpcError } = await supabase.rpc('insert_detected_roof', {
        p: {
          address,
          lat: centroid.lat,
          lng: centroid.lon,
          roofGeom: JSON.stringify(roofGeom),
          totalRoofM2: areaM2,
          usableRoofM2: usableM2,
          systemKwp,
          panelCount,
          yearlyKwh,
          source: 'overpass_cron',
          quality: 'ESTIMATED',
          score,
          priority,
        },
      });

      if (rpcError) {
        console.warn(`[process-scans] rpc failed for element ${element.id}:`, rpcError.message);
        counts.skipped++;
      } else {
        counts.inserted++;
        // Add to local dedup list so subsequent buildings in this run also see it
        existing.push({ latitude: centroid.lat, longitude: centroid.lon });
      }
    }

    // Mark done
    await supabase
      .from('scan_requests')
      .update({
        status: 'done',
        counts,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.id);

    return { id: req.id, status: 'done', counts };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[process-scans] scan ${req.id} failed:`, errMsg);

    await supabase
      .from('scan_requests')
      .update({
        status: 'failed',
        error: errMsg,
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
      .select('id, bbox, filters')
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
      status: 'done',
      processed: scans.length,
      scans,
    });
  } catch (err) {
    console.error('[process-scans] handler error:', err);
    return res.status(500).json({ error: String(err) });
  }
}
