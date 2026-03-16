// Roof Scan Persistence Service
// Save, retrieve, and share roof scan results via Supabase

import { supabase } from './supabase';

// ===== INTERFACES =====

export interface RoofScanRow {
  id: string;
  company_id?: string;
  project_id?: string;
  lead_id?: string;
  address: string;
  latitude: number;
  longitude: number;
  source: 'google_solar' | 'local_panama' | 'pvwatts' | 'manual';
  quality: 'HIGH' | 'MEDIUM' | 'BASE' | 'ESTIMATED';
  scanned_at: string;
  total_roof_m2: number;
  usable_roof_m2: number;
  roof_segments: unknown[];
  panel_count: number;
  system_kwp: number;
  yearly_kwh: number;
  monthly_kwh: number[];
  panel_layout?: unknown;
  custom_placement: boolean;
  public_share_token?: string;
  shared_at?: string;
  raw_api_response?: unknown;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SaveRoofScanInput {
  address: string;
  latitude: number;
  longitude: number;
  source: 'google_solar' | 'local_panama' | 'pvwatts' | 'manual';
  quality: 'HIGH' | 'MEDIUM' | 'BASE' | 'ESTIMATED';
  total_roof_m2: number;
  usable_roof_m2: number;
  roof_segments?: unknown[];
  panel_count: number;
  system_kwp: number;
  yearly_kwh: number;
  monthly_kwh?: number[];
  raw_api_response?: unknown;
  project_id?: string;
  lead_id?: string;
}

// ===== SAVE SCAN =====

export async function saveRoofScan(input: SaveRoofScanInput): Promise<RoofScanRow> {
  const { data, error } = await supabase
    .from('roof_scans')
    .insert([{
      ...input,
      roof_segments: input.roof_segments ?? [],
      monthly_kwh: input.monthly_kwh ?? [],
    }])
    .select()
    .single();

  if (error) throw new Error(`Failed to save roof scan: ${error.message}`);
  return data as RoofScanRow;
}

// ===== GET SCANS =====

export async function getRoofScans(filters?: {
  project_id?: string;
  lead_id?: string;
  limit?: number;
}): Promise<RoofScanRow[]> {
  let query = supabase
    .from('roof_scans')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.project_id) {
    query = query.eq('project_id', filters.project_id);
  }
  if (filters?.lead_id) {
    query = query.eq('lead_id', filters.lead_id);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch roof scans: ${error.message}`);
  return (data ?? []) as RoofScanRow[];
}

// ===== GET SINGLE SCAN =====

export async function getRoofScanById(id: string): Promise<RoofScanRow | null> {
  const { data, error } = await supabase
    .from('roof_scans')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as RoofScanRow;
}

// ===== SHARE TOKEN =====

export async function generateShareToken(scanId: string): Promise<string> {
  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 20);

  const { error } = await supabase
    .from('roof_scans')
    .update({
      public_share_token: token,
      shared_at: new Date().toISOString(),
    })
    .eq('id', scanId);

  if (error) throw new Error(`Failed to generate share token: ${error.message}`);
  return token;
}

export async function getRoofScanByToken(token: string): Promise<RoofScanRow | null> {
  const { data, error } = await supabase
    .from('roof_scans')
    .select('*')
    .eq('public_share_token', token)
    .single();

  if (error) return null;
  return data as RoofScanRow;
}

// ===== BUILD SHARE URL =====

export function buildShareUrl(token: string): string {
  const base = window.location.origin;
  return `${base}/scan/${token}`;
}

export function buildWhatsAppShareUrl(token: string, address: string): string {
  const url = buildShareUrl(token);
  const text = encodeURIComponent(
    `Solar roof analysis for ${address}\n${url}`
  );
  return `https://wa.me/?text=${text}`;
}

export function buildEmailShareUrl(
  token: string,
  address: string,
  systemKwp: number,
  yearlyKwh: number
): string {
  const url = buildShareUrl(token);
  const subject = encodeURIComponent(`Solar Roof Analysis - ${address}`);
  const body = encodeURIComponent(
    `Solar roof scan results for ${address}:\n\n` +
    `System size: ${systemKwp.toFixed(1)} kWp\n` +
    `Annual production: ${yearlyKwh.toLocaleString()} kWh\n\n` +
    `View full report: ${url}`
  );
  return `mailto:?subject=${subject}&body=${body}`;
}

// ===== DELETE SCAN =====

export async function deleteRoofScan(scanId: string): Promise<void> {
  const { error } = await supabase
    .from('roof_scans')
    .delete()
    .eq('id', scanId);

  if (error) throw new Error(`Failed to delete roof scan: ${error.message}`);
}

// ===== CONVERT FROM SCANNER RESULT =====

/**
 * Convert a RoofScanResult from the scanner service into a SaveRoofScanInput
 */
export function scanResultToInput(
  result: {
    address: string;
    latitude: number;
    longitude: number;
    source: string;
    quality: string;
    totalRoofAreaM2: number;
    usableRoofAreaM2: number;
    roofSegments?: unknown[];
    maxPanelCount: number;
    maxSystemSizeKwp: number;
    yearlyEnergyKwh: number;
    panelConfigs?: Array<{ panelsCount: number; yearlyEnergyDcKwh: number }>;
  },
  extras?: { project_id?: string; lead_id?: string }
): SaveRoofScanInput {
  // Estimate monthly from yearly (Panama: ~equal distribution, slight wet season dip)
  const monthlyFactors = [0.088, 0.085, 0.090, 0.082, 0.075, 0.072, 0.074, 0.076, 0.074, 0.078, 0.080, 0.086];
  const monthlyKwh = monthlyFactors.map(f => Math.round(result.yearlyEnergyKwh * f));

  return {
    address: result.address,
    latitude: result.latitude,
    longitude: result.longitude,
    source: result.source as SaveRoofScanInput['source'],
    quality: result.quality as SaveRoofScanInput['quality'],
    total_roof_m2: result.totalRoofAreaM2,
    usable_roof_m2: result.usableRoofAreaM2,
    roof_segments: result.roofSegments ?? [],
    panel_count: result.maxPanelCount,
    system_kwp: result.maxSystemSizeKwp,
    yearly_kwh: result.yearlyEnergyKwh,
    monthly_kwh: monthlyKwh,
    raw_api_response: result,
    ...extras,
  };
}
