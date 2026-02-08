// Overpass API client for fetching building footprints from OpenStreetMap
// Uses Vercel proxy at /api/roof-scan?action=overpass to avoid CORS

// ===== TYPES =====

export interface OSMBuilding {
  id: number;
  tags: Record<string, string>;
  center: { lat: number; lon: number };
  coordinates: Array<{ lat: number; lon: number }>;
  area: number; // m²
}

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

interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

// ===== GEOMETRY HELPERS =====

/**
 * Calculate polygon area using the Shoelace formula with latitude correction.
 * At Panama latitude (~9°N):
 *   1° lat ≈ 110,574 m
 *   1° lon ≈ 109,639 m × cos(9°) ≈ 108,242 m
 */
function calculatePolygonArea(
  coords: Array<{ lat: number; lon: number }>
): number {
  if (coords.length < 3) return 0;

  // Average latitude for longitude correction
  const avgLat =
    coords.reduce((sum, c) => sum + c.lat, 0) / coords.length;
  const latRad = (avgLat * Math.PI) / 180;

  // Meters per degree at this latitude
  const mPerDegLat = 110574;
  const mPerDegLon = 111320 * Math.cos(latRad);

  // Shoelace formula in projected meters
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

/**
 * Calculate the centroid of a polygon.
 */
function calculateCenter(
  coords: Array<{ lat: number; lon: number }>
): { lat: number; lon: number } {
  if (coords.length === 0) return { lat: 0, lon: 0 };

  const sum = coords.reduce(
    (acc, c) => ({ lat: acc.lat + c.lat, lon: acc.lon + c.lon }),
    { lat: 0, lon: 0 }
  );

  return {
    lat: sum.lat / coords.length,
    lon: sum.lon / coords.length,
  };
}

/**
 * Extract geometry coordinates from an Overpass element.
 * Ways have direct geometry; relations use outer member geometry.
 */
function extractGeometry(
  element: OverpassElement
): Array<{ lat: number; lon: number }> {
  if (element.type === 'way' && element.geometry) {
    return element.geometry;
  }

  if (element.type === 'relation' && element.members) {
    // Use the first outer ring
    const outer = element.members.find(
      (m) => m.role === 'outer' && m.geometry && m.geometry.length > 0
    );
    if (outer?.geometry) return outer.geometry;

    // Fallback: concatenate all member geometries
    const allCoords: Array<{ lat: number; lon: number }> = [];
    for (const member of element.members) {
      if (member.geometry) {
        allCoords.push(...member.geometry);
      }
    }
    return allCoords;
  }

  return [];
}

// ===== OVERPASS QUERY =====

/**
 * Build Overpass QL query for buildings within a bounding box.
 */
function buildOverpassQuery(
  south: number,
  west: number,
  north: number,
  east: number
): string {
  const bbox = `${south},${west},${north},${east}`;
  return `[out:json][timeout:30];
(
  way["building"](${bbox});
  relation["building"](${bbox});
);
out geom;`;
}

// ===== API =====

/**
 * Fetch buildings within a bounding box from OpenStreetMap via Overpass API.
 * In dev mode, calls Overpass directly (no CORS issue with POST).
 * In production, routes through Vercel proxy.
 */
export async function fetchBuildingsInBounds(
  bounds: MapBounds
): Promise<OSMBuilding[]> {
  const query = buildOverpassQuery(bounds.south, bounds.west, bounds.north, bounds.east);

  const isDev = import.meta.env.DEV;
  const url = isDev
    ? 'https://overpass-api.de/api/interpreter'
    : '/api/roof-scan?action=overpass';

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': isDev ? 'application/x-www-form-urlencoded' : 'text/plain' },
    body: isDev ? `data=${encodeURIComponent(query)}` : query,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ||
        `Overpass API error: ${response.status}`
    );
  }

  const data: OverpassResponse = await response.json();

  if (!data.elements || !Array.isArray(data.elements)) {
    return [];
  }

  const buildings: OSMBuilding[] = [];

  for (const element of data.elements) {
    if (element.type !== 'way' && element.type !== 'relation') continue;

    const coordinates = extractGeometry(element);
    if (coordinates.length < 3) continue;

    const area = calculatePolygonArea(coordinates);
    if (area < 10) continue; // Skip tiny fragments

    const center = calculateCenter(coordinates);
    const tags = element.tags || {};

    buildings.push({
      id: element.id,
      tags,
      center,
      coordinates,
      area: Math.round(area),
    });
  }

  return buildings;
}
