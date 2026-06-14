/**
 * savedRoofsService.ts
 * Query the roof_scans table for already-persisted roof scan results
 * within a given bounding box.  Used by the scanner map to render a
 * "Techos guardados" layer so operators can see historical scan coverage.
 */

import { supabase } from './supabase';

// ===== TYPES =====

/**
 * A row from roof_scans selected for map rendering.
 * Column names match the Supabase roof_scans table exactly.
 */
export interface SavedRoof {
  id: string;
  latitude: number;
  longitude: number;
  total_roof_m2: number | null;
  usable_roof_m2: number | null;
  system_kwp: number | null;
  /** 'HIGH' | 'MEDIUM' | 'BASE' | 'ESTIMATED' — matches roof_scans.quality */
  quality: string | null;
  /** GeoJSON Polygon stored as jsonb in the DB */
  roof_geom: GeoJSON.Polygon | null;
  lead_id: string | null;
  address: string | null;
}

// ===== QUERY =====

/**
 * Fetch saved roof scans within a lat/lng bounding box.
 * Ordered by system_kwp DESC so the largest (most suspicious/interesting)
 * roofs render on top when features overlap.
 * Hard-capped at 2000 rows to keep map performance safe.
 */
export async function fetchSavedRoofs(
  bbox: [minLng: number, minLat: number, maxLng: number, maxLat: number]
): Promise<SavedRoof[]> {
  const [minLng, minLat, maxLng, maxLat] = bbox;

  const { data, error } = await supabase
    .from('roof_scans')
    .select(
      'id, latitude, longitude, total_roof_m2, usable_roof_m2, system_kwp, quality, roof_geom, lead_id, address'
    )
    .gte('latitude', minLat)
    .lte('latitude', maxLat)
    .gte('longitude', minLng)
    .lte('longitude', maxLng)
    .order('system_kwp', { ascending: false, nullsFirst: false })
    .limit(2000);

  if (error) {
    console.error('[savedRoofsService] fetchSavedRoofs error:', error);
    return [];
  }

  // Filter out rows without coordinates (should not happen, but type-safe guard)
  return (data ?? []).filter(
    (row): row is SavedRoof =>
      typeof row.latitude === 'number' && typeof row.longitude === 'number'
  );
}
