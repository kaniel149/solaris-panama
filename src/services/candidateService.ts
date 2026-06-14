// Candidate Service — typed client for scan_candidates table and related RPCs.
// Mirrors the pattern established in scannerRpcService.ts.
// New table: scan_candidates (migration 056+)

import { supabase } from './supabase';

// ===== TYPES =====

export interface ScanCandidate {
  /** UUID of the scan_candidates row */
  id: string;
  /** FK → scan_requests.id */
  scan_request_id: string;
  /** Candidate type: rooftop or land parcel */
  kind: 'roof' | 'land';
  /** Triage status */
  status: 'pending' | 'added' | 'rejected';
  /** Centroid latitude */
  latitude: number;
  /** Centroid longitude */
  longitude: number;
  /** PostGIS geometry stored as GeoJSON (Polygon) */
  geom: Record<string, unknown> | null;
  /** Roof or parcel footprint area in square metres */
  area_m2: number;
  /** Area in hectares (land parcels) */
  area_ha: number;
  /** Area in rai (kept as 0 for Panama — rai is Thailand-specific) */
  area_rai: number;
  /** Estimated AC system size in kWp (roofs) */
  estimated_kwp: number;
  /** Estimated AC system size in MWp (land, = estimated_kwp / 1000) */
  estimated_mwp: number;
  /** Land-parcel tier (land kind only) */
  tier?: 'comercial' | 'agro' | 'utility';
  /** OSM landuse tag (land kind only) */
  landuse?: string;
  /** Composite solar-suitability score 0–100 */
  score: number;
  /** Letter grade derived from score */
  grade: 'A' | 'B' | 'C' | 'D';
  /** Whether rooftop already has PV installed (null = not yet checked) */
  existing_solar?: boolean | null;
  /** Human-readable address (optional, from reverse geocode) */
  address?: string | null;
  /** FK → leads.id — set after approve_scan_candidate promotes this candidate */
  lead_id?: string | null;
}

/** Options for fetchCandidates */
export interface FetchCandidatesOptions {
  kind?: 'roof' | 'land';
  status?: 'pending' | 'added' | 'rejected';
  /** [minLng, minLat, maxLng, maxLat] bounding box filter */
  bbox?: [number, number, number, number];
}

/** Rejection reason codes — must match the SQL RPC enum */
export type CandidateRejectionReason =
  | 'has_pv'
  | 'not_a_roof'
  | 'too_small'
  | 'other';

// ===== FETCH CANDIDATES =====

/**
 * Fetch scan candidates from the scan_candidates table.
 * Defaults to status='pending' when no status filter is provided.
 *
 * @param opts  Optional kind, bbox, and status filters.
 * @returns Array of ScanCandidate rows ordered by score descending.
 */
export async function fetchCandidates(
  opts: FetchCandidatesOptions = {}
): Promise<ScanCandidate[]> {
  const { kind, status = 'pending', bbox } = opts;

  let query = supabase
    .from('scan_candidates')
    .select('*')
    .eq('status', status)
    .order('score', { ascending: false });

  if (kind) {
    query = query.eq('kind', kind);
  }

  if (bbox) {
    const [minLng, minLat, maxLng, maxLat] = bbox;
    query = query
      .gte('longitude', minLng)
      .lte('longitude', maxLng)
      .gte('latitude', minLat)
      .lte('latitude', maxLat);
  }

  const { data, error } = await query;

  if (error) throw new Error(`fetchCandidates failed: ${error.message}`);
  return (data ?? []) as ScanCandidate[];
}

// ===== APPROVE =====

/**
 * Promote a pending candidate to an approved lead.
 * Calls the approve_scan_candidate(p_id) RPC which internally calls
 * insert_detected_roof → roof_scans + leads.
 *
 * @param id  UUID of the scan_candidates row.
 * @returns UUID of the created leads row.
 */
export async function approveCandidate(id: string): Promise<string> {
  const { data, error } = await supabase.rpc('approve_scan_candidate', {
    p_id: id,
  });

  if (error) throw new Error(`approveCandidate failed: ${error.message}`);
  if (!data) throw new Error('approve_scan_candidate returned no lead_id');
  return data as string;
}

// ===== REJECT =====

/**
 * Reject a candidate and seed the scan_exclusions table with a ~30m buffer
 * so the same spot is auto-filtered on the next scan run.
 * Calls the reject_scan_candidate(p_id, p_reason) RPC.
 *
 * @param id      UUID of the scan_candidates row.
 * @param reason  Structured rejection reason for learned-filter training.
 */
export async function rejectCandidate(
  id: string,
  reason: CandidateRejectionReason
): Promise<void> {
  const { error } = await supabase.rpc('reject_scan_candidate', {
    p_id: id,
    p_reason: reason,
  });

  if (error) throw new Error(`rejectCandidate failed: ${error.message}`);
}

// ===== SET STATUS =====

/**
 * Directly update the status field on a scan_candidates row.
 * Lower-level escape hatch — prefer approveCandidate / rejectCandidate.
 *
 * @param id      UUID of the scan_candidates row.
 * @param status  New status value.
 */
export async function setCandidateStatus(
  id: string,
  status: ScanCandidate['status']
): Promise<void> {
  const { error } = await supabase
    .from('scan_candidates')
    .update({ status })
    .eq('id', id);

  if (error) throw new Error(`setCandidateStatus failed: ${error.message}`);
}

// ===== APPLY LEARNED FILTERS =====

/**
 * Trigger the apply_learned_filters() RPC which auto-rejects candidates
 * that fall inside previously rejected exclusion zones or already have PV.
 *
 * @returns Number of candidates auto-rejected by the learned filters.
 */
export async function applyLearnedFilters(): Promise<number> {
  const { data, error } = await supabase.rpc('apply_learned_filters');

  if (error) throw new Error(`applyLearnedFilters failed: ${error.message}`);
  // The RPC returns the count of rows auto-rejected; default 0 if null.
  return typeof data === 'number' ? data : 0;
}
