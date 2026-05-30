// Scanner RPC Service
// Frontend wrappers for Supabase RPCs added in migration 051:
//   save_roof_geom, insert_detected_roof, create_scan_request
// Plus direct-query helpers for the scan_requests table.

import { supabase } from './supabase';

// Re-use roofScannerService constants so kWp math stays in sync with the scanner.
// PANEL_WATT, PANEL_AREA_M2, USABLE_ROOF_RATIO, SYSTEM_LOSSES are not exported
// from roofScannerService, so we redeclare them here mirroring those values exactly.
const PANEL_WATT = 580;        // W per panel (580W bifacial)
const PANEL_AREA_M2 = 2.58;   // m² per panel
const USABLE_ROOF_RATIO = 0.6; // 60% of roof usable for panels
const SYSTEM_LOSSES = 14;      // % DC→AC losses (wiring, inverter, soiling, shading)

// ===== TYPES =====

/** GeoJSON Polygon geometry (RFC 7946) */
export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

/**
 * Candidate object passed to insert_detected_roof.
 * Property names match the jsonb keys expected by the SQL function (camelCase).
 */
export interface DetectedRoofCandidate {
  address?: string;
  lat: number;
  lng: number;
  roofGeom?: GeoJSONPolygon | null;
  totalRoofM2: number;
  usableRoofM2: number;
  systemKwp: number;
  panelCount: number;
  yearlyKwh: number;
  source?: 'google_solar' | 'local_panama' | 'pvwatts' | 'manual';
  quality?: 'HIGH' | 'MEDIUM' | 'BASE' | 'ESTIMATED';
  score?: number;
}

/**
 * Row returned by the scan_requests table.
 * Column names match the migration 051 DDL exactly.
 */
export interface ScanRequest {
  id: string;
  company_id?: string | null;
  area_geojson?: unknown | null;
  bbox?: number[] | null;
  filters: Record<string, unknown>;
  status: 'queued' | 'running' | 'done' | 'failed';
  counts: Record<string, unknown>;
  error?: string | null;
  requested_by?: string | null;
  created_at: string;
  updated_at: string;
}

// ===== SAVE ROOF GEOM =====

/**
 * Persist a user-drawn roof polygon onto an existing roof_scans row.
 * Calls the save_roof_geom(p_id, p_geom, p_area, p_kwp) RPC.
 *
 * @throws if the scan row is not found or the caller lacks access.
 */
export async function saveRoofGeom(
  scanId: string,
  geom: GeoJSONPolygon,
  areaSqm: number,
  kwp: number
): Promise<void> {
  const { error } = await supabase.rpc('save_roof_geom', {
    p_id: scanId,
    p_geom: geom,
    p_area: areaSqm,
    p_kwp: kwp,
  });

  if (error) throw new Error(`Failed to save roof geometry: ${error.message}`);
}

// ===== INSERT DETECTED ROOF =====

/**
 * Insert an auto-detected roof candidate into roof_scans (and a linked leads row).
 * Idempotent on lat/lng — returns the existing scan id if a row already exists.
 * Calls the insert_detected_roof(p jsonb) RPC.
 *
 * @returns UUID of the created (or existing) roof_scans row.
 */
export async function insertDetectedRoof(
  candidate: DetectedRoofCandidate
): Promise<string> {
  const { data, error } = await supabase.rpc('insert_detected_roof', {
    p: candidate,
  });

  if (error) throw new Error(`Failed to insert detected roof: ${error.message}`);
  if (!data) throw new Error('insert_detected_roof returned no id');
  return data as string;
}

// ===== CREATE SCAN REQUEST =====

/**
 * Queue a new area scan request.
 * Calls the create_scan_request(p_area, p_bbox, p_filters) RPC.
 *
 * @param areaGeojson  GeoJSON geometry of the area to scan (any GeoJSON type).
 * @param bbox         Bounding box [minLng, minLat, maxLng, maxLat].
 * @param filters      Optional key/value scan filters (building type, min area, …).
 * @returns UUID of the created scan_requests row.
 */
export async function createScanRequest(
  areaGeojson: unknown,
  bbox: number[],
  filters: Record<string, unknown> = {}
): Promise<string> {
  const { data, error } = await supabase.rpc('create_scan_request', {
    p_area: areaGeojson,
    p_bbox: bbox,
    p_filters: filters,
  });

  if (error) throw new Error(`Failed to create scan request: ${error.message}`);
  if (!data) throw new Error('create_scan_request returned no id');
  return data as string;
}

// ===== GET SINGLE SCAN REQUEST =====

/**
 * Fetch a single scan_requests row by id.
 *
 * @returns The row, or null if not found / not visible to the caller.
 */
export async function getScanRequest(id: string): Promise<ScanRequest | null> {
  const { data, error } = await supabase
    .from('scan_requests')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as ScanRequest;
}

// ===== LIST MY SCAN REQUESTS =====

/**
 * List the caller's recent scan requests, newest first.
 *
 * @param limit Maximum rows to return (default 20).
 */
export async function listMyScanRequests(limit = 20): Promise<ScanRequest[]> {
  const { data, error } = await supabase
    .from('scan_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch scan requests: ${error.message}`);
  return (data ?? []) as ScanRequest[];
}

// ===== COMPUTE ESTIMATED KWP =====

/**
 * Estimate system kWp from total roof area.
 *
 * Formula (mirrors roofScannerService.ts constants):
 *   usable area  = roofAreaSqm × USABLE_ROOF_RATIO (0.60)
 *   panel count  = floor(usable / PANEL_AREA_M2)   (2.58 m²/panel, 580 W)
 *   dc kWp       = panelCount × PANEL_WATT / 1000
 *   ac kWp       = dc kWp × (1 − SYSTEM_LOSSES / 100)  (14 % losses)
 *
 * Consistent with: roofScannerService.ts → USABLE_ROOF_RATIO, PANEL_AREA_M2,
 * PANEL_WATT, SYSTEM_LOSSES and solarCalculator.ts → PANAMA_DEFAULTS.panelWattage /
 * panelAreaM2 / performanceRatio.
 *
 * @param roofAreaSqm  Total roof area in square metres.
 * @returns Estimated AC system size in kWp.
 */
export function computeEstimatedKwp(roofAreaSqm: number): number {
  const usableArea = roofAreaSqm * USABLE_ROOF_RATIO;
  const panelCount = Math.floor(usableArea / PANEL_AREA_M2);
  const dcKwp = (panelCount * PANEL_WATT) / 1000;
  const acKwp = dcKwp * (1 - SYSTEM_LOSSES / 100);
  return Math.round(acKwp * 100) / 100; // round to 2 dp
}
