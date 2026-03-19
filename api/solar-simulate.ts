// ==========================================
// Solar Simulation API — Vercel Serverless Function (Solaris Panama)
// Accepts a SimulationInput and returns a SimulationResult.
// Priority: NREL PVWatts v8 → PySAM service (if configured) → regional constants
// ==========================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

// ===== CONFIG =====

const PYSAM_API_URL = process.env.PYSAM_API_URL || '';
const NREL_API_KEY = process.env.NREL_API_KEY || '';
const REQUEST_TIMEOUT_PYSAM_MS = 5_000;
const REQUEST_TIMEOUT_PVWATTS_MS = 10_000;

// ===== TYPES =====

interface SimulationInput {
  lat: number;
  lon: number;
  systemCapacityKw: number;
  tilt: number;
  azimuth: number;
  losses?: number;
  moduleType?: number;
  arrayType?: number;
  dcAcRatio?: number;
  invEff?: number;
}

interface SimulationResult {
  annualKwh: number;
  kwhPerKwp: number;
  capacityFactor: number;
  solarRadiationKwhM2Day: number;
  monthlyKwh: number[];
  performanceRatio: number;
  source: 'pysam' | 'pvwatts-api' | 'regional-constant';
  lossesBreakdown?: Record<string, number>;
}

// ===== HELPERS =====

function setCorsHeaders(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function validateInput(body: unknown): body is SimulationInput {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.lat === 'number' &&
    typeof b.lon === 'number' &&
    typeof b.systemCapacityKw === 'number' &&
    typeof b.tilt === 'number' &&
    typeof b.azimuth === 'number' &&
    b.systemCapacityKw > 0
  );
}

// ===== REGIONAL CONSTANTS =====

function getRegionalKwhPerKwp(lat: number, lon: number): number {
  if (lat >= 29 && lat <= 33 && lon >= 34 && lon <= 36) {
    return Math.round(1900 - ((lat - 29) / (33 - 29)) * 300);
  }
  if (lat >= 5 && lat <= 20 && lon >= 97 && lon <= 106) {
    return Math.round(1600 - ((lat - 5) / (20 - 5)) * 200);
  }
  if (lat >= 7 && lat <= 10 && lon >= -83 && lon <= -77) {
    return 1500;
  }
  if (lat >= -55 && lat <= -22) {
    return Math.round(1700 - ((-lat - 22) / (55 - 22)) * 500);
  }
  if (lat >= 25 && lat <= 50 && lon >= -125 && lon <= -65) {
    return Math.round(2100 - ((lat - 25) / (50 - 25)) * 800);
  }
  return 1500;
}

function buildMonthlyProfile(lat: number, annualKwh: number): number[] {
  // Panama dry season (Dec-Apr) is peak — use Panama-specific fractions for lat 7-10
  if (lat >= 7 && lat <= 10) {
    const panamaFractions = [0.092, 0.090, 0.098, 0.085, 0.075, 0.070, 0.072, 0.070, 0.068, 0.070, 0.075, 0.085];
    const sum = panamaFractions.reduce((s, v) => s + v, 0);
    return panamaFractions.map(f => Math.round((f / sum) * annualKwh));
  }

  const isSouthernHemisphere = lat < 0;
  const peakMonth = isSouthernHemisphere ? 11 : 5;
  const raw = Array.from({ length: 12 }, (_, i) => {
    const dist = Math.min(Math.abs(i - peakMonth), 12 - Math.abs(i - peakMonth));
    return 0.75 + 0.25 * Math.cos((dist / 6) * Math.PI);
  });
  const sum = raw.reduce((s, v) => s + v, 0);
  return raw.map(v => Math.round((v / sum) * annualKwh));
}

function getRegionalEstimate(input: SimulationInput): SimulationResult {
  const kwhPerKwp = getRegionalKwhPerKwp(input.lat, input.lon);
  const annualKwh = kwhPerKwp * input.systemCapacityKw;
  return {
    annualKwh: Math.round(annualKwh),
    kwhPerKwp,
    capacityFactor: Math.round((annualKwh / (input.systemCapacityKw * 8760)) * 1000) / 1000,
    solarRadiationKwhM2Day: Math.round((kwhPerKwp / 365) * 100) / 100,
    monthlyKwh: buildMonthlyProfile(input.lat, annualKwh),
    performanceRatio: 0.80,
    source: 'regional-constant',
  };
}

// ===== PYSAM SERVICE =====

async function callPySam(input: SimulationInput): Promise<SimulationResult> {
  if (!PYSAM_API_URL) throw new Error('PYSAM_API_URL not configured');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_PYSAM_MS);

  try {
    const response = await fetch(`${PYSAM_API_URL}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: input.lat,
        lon: input.lon,
        system_capacity: input.systemCapacityKw,
        tilt: input.tilt,
        azimuth: input.azimuth,
        losses: input.losses ?? 14,
        module_type: input.moduleType ?? 0,
        array_type: input.arrayType ?? 0,
        dc_ac_ratio: input.dcAcRatio ?? 1.2,
        inv_eff: input.invEff ?? 96,
      }),
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`PySAM service ${response.status}`);

    const data = await response.json();
    return {
      annualKwh: Math.round(data.annual_kwh),
      kwhPerKwp: Math.round(data.kwh_per_kwp),
      capacityFactor: Math.round(data.capacity_factor * 1000) / 1000,
      solarRadiationKwhM2Day: Math.round(data.solar_radiation_kwh_m2_day * 100) / 100,
      monthlyKwh: (data.monthly_kwh as number[]).map((v: number) => Math.round(v)),
      performanceRatio: Math.round(data.performance_ratio * 100) / 100,
      source: 'pysam',
      lossesBreakdown: data.losses_breakdown,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ===== PVWATTS v8 =====

async function callPvWatts(input: SimulationInput): Promise<SimulationResult> {
  if (!NREL_API_KEY) throw new Error('NREL_API_KEY not configured');

  const params = new URLSearchParams({
    api_key: NREL_API_KEY,
    lat: input.lat.toString(),
    lon: input.lon.toString(),
    system_capacity: input.systemCapacityKw.toString(),
    tilt: input.tilt.toString(),
    azimuth: input.azimuth.toString(),
    losses: (input.losses ?? 14).toString(),
    module_type: (input.moduleType ?? 0).toString(),
    array_type: (input.arrayType ?? 0).toString(),
    dc_ac_ratio: (input.dcAcRatio ?? 1.2).toString(),
    inv_eff: (input.invEff ?? 96).toString(),
    timeframe: 'monthly',
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_PVWATTS_MS);

  try {
    const response = await fetch(
      `https://developer.nrel.gov/api/pvwatts/v8.json?${params}`,
      { signal: controller.signal }
    );

    if (!response.ok) throw new Error(`PVWatts API ${response.status}`);

    const data = await response.json();
    if (data.errors?.length) throw new Error(`PVWatts: ${data.errors.join(', ')}`);

    const outputs = data.outputs;
    const annualKwh: number = outputs.ac_annual;
    const monthlyKwh: number[] = outputs.ac_monthly;
    const solarRadiationKwhM2Day: number = outputs.solrad_annual;
    const capacityFactor: number = outputs.capacity_factor / 100;
    const kwhPerKwp = annualKwh / input.systemCapacityKw;

    return {
      annualKwh: Math.round(annualKwh),
      kwhPerKwp: Math.round(kwhPerKwp),
      capacityFactor: Math.round(capacityFactor * 1000) / 1000,
      solarRadiationKwhM2Day: Math.round(solarRadiationKwhM2Day * 100) / 100,
      monthlyKwh: monthlyKwh.map((v: number) => Math.round(v)),
      performanceRatio: Math.round(
        (annualKwh / (input.systemCapacityKw * solarRadiationKwhM2Day * 365)) * 100
      ) / 100,
      source: 'pvwatts-api',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ===== HANDLER =====

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const input = req.body as unknown;
  if (!validateInput(input)) {
    return res.status(400).json({
      error: 'Invalid input. Required: lat, lon, systemCapacityKw, tilt, azimuth',
    });
  }

  // 1. Try NREL PVWatts v8 (free, no server needed)
  try {
    const result = await callPvWatts(input);
    return res.status(200).json(result);
  } catch (err) {
    console.warn('[solar-simulate] PVWatts API unavailable:', (err as Error).message);
  }

  // 2. Try PySAM service (if configured)
  if (PYSAM_API_URL) {
    try {
      const result = await callPySam(input);
      return res.status(200).json(result);
    } catch (err) {
      console.warn('[solar-simulate] PySAM unavailable:', (err as Error).message);
    }
  }

  // 3. Regional constant fallback
  const result = getRegionalEstimate(input);
  return res.status(200).json(result);
}
