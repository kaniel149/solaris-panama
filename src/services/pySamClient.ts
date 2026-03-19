/**
 * PySAM Solar Simulation Client
 * Calls the PySAM API service for accurate per-location solar yield estimates.
 * Falls back to NREL PVWatts v8 API, then to regional constants.
 */

export interface SimulationInput {
  lat: number;
  lon: number;
  systemCapacityKw: number;
  tilt: number;
  azimuth: number;
  losses?: number;       // Default: 14%
  moduleType?: number;   // 0=standard, 1=premium, 2=thin-film
  arrayType?: number;    // 0=fixed, 1=open-rack, 2=1-axis, 3=2-axis
  dcAcRatio?: number;    // Default: 1.2
  invEff?: number;       // Default: 96%
}

export interface SimulationResult {
  annualKwh: number;
  kwhPerKwp: number;
  capacityFactor: number;
  solarRadiationKwhM2Day: number;
  monthlyKwh: number[];      // 12 values
  performanceRatio: number;
  source: 'pysam' | 'pvwatts-api' | 'regional-constant';
  lossesBreakdown?: Record<string, number>;
}

// ===== CACHE =====

interface CacheEntry {
  result: SimulationResult;
  timestamp: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const simulationCache = new Map<string, CacheEntry>();

function getCacheKey(input: SimulationInput): string {
  return `${input.lat.toFixed(2)}_${input.lon.toFixed(2)}_${input.systemCapacityKw}_${input.tilt}_${input.azimuth}`;
}

function getCached(key: string): SimulationResult | null {
  const entry = simulationCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    simulationCache.delete(key);
    return null;
  }
  return entry.result;
}

function setCache(key: string, result: SimulationResult): void {
  simulationCache.set(key, { result, timestamp: Date.now() });
}

// ===== REGIONAL CONSTANTS =====

/**
 * Estimate kWh/kWp based on lat/lon region.
 * Used as last-resort fallback when both PySAM and PVWatts API are unavailable.
 */
function getRegionalKwhPerKwp(lat: number, lon: number): number {
  // Israel
  if (lat >= 29 && lat <= 33 && lon >= 34 && lon <= 36) {
    return Math.round(1900 - ((lat - 29) / (33 - 29)) * 300);
  }

  // Thailand
  if (lat >= 5 && lat <= 20 && lon >= 97 && lon <= 106) {
    return Math.round(1600 - ((lat - 5) / (20 - 5)) * 200);
  }

  // Panama
  if (lat >= 7 && lat <= 10 && lon >= -83 && lon <= -77) {
    return 1500;
  }

  // Argentina — scale from ~1200 (far south, lat -55) to ~1700 (north, lat -22)
  if (lat >= -55 && lat <= -22) {
    return Math.round(1700 - ((-lat - 22) / (55 - 22)) * 500);
  }

  // United States — scale from ~1300 (north, lat 50) to ~2100 (south, lat 25)
  if (lat >= 25 && lat <= 50 && lon >= -125 && lon <= -65) {
    return Math.round(2100 - ((lat - 25) / (50 - 25)) * 800);
  }

  // Default
  return 1500;
}

/**
 * Build a flat monthly production profile for a regional estimate.
 * Uses a simple sinusoidal approximation scaled to northern/southern hemisphere.
 */
function buildRegionalMonthlyProfile(lat: number, annualKwh: number): number[] {
  const isSouthernHemisphere = lat < 0;
  const peakMonth = isSouthernHemisphere ? 11 : 5;
  const raw = Array.from({ length: 12 }, (_, i) => {
    const distFromPeak = Math.min(
      Math.abs(i - peakMonth),
      12 - Math.abs(i - peakMonth)
    );
    return 0.75 + 0.25 * Math.cos((distFromPeak / 6) * Math.PI);
  });

  const rawSum = raw.reduce((s, v) => s + v, 0);
  return raw.map(v => Math.round((v / rawSum) * annualKwh));
}

function getRegionalEstimate(input: SimulationInput): SimulationResult {
  const kwhPerKwp = getRegionalKwhPerKwp(input.lat, input.lon);
  const annualKwh = kwhPerKwp * input.systemCapacityKw;
  const monthlyKwh = buildRegionalMonthlyProfile(input.lat, annualKwh);
  const capacityFactor = annualKwh / (input.systemCapacityKw * 8760);

  return {
    annualKwh: Math.round(annualKwh),
    kwhPerKwp,
    capacityFactor: Math.round(capacityFactor * 1000) / 1000,
    solarRadiationKwhM2Day: Math.round((kwhPerKwp / 365) * 100) / 100,
    monthlyKwh,
    performanceRatio: 0.80,
    source: 'regional-constant',
  };
}

// ===== PVWATTS v8 FALLBACK =====

async function callPvWattsApi(input: SimulationInput): Promise<SimulationResult> {
  const apiKey = import.meta.env.VITE_NREL_API_KEY;
  if (!apiKey) throw new Error('VITE_NREL_API_KEY not set');

  const params = new URLSearchParams({
    api_key: apiKey,
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
    // PVWatts auto-detects the correct dataset from lat/lon
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(
      `https://developer.nrel.gov/api/pvwatts/v8.json?${params}`,
      { signal: controller.signal }
    );

    if (!response.ok) {
      throw new Error(`PVWatts API returned ${response.status}`);
    }

    const data = await response.json();

    if (data.errors?.length) {
      throw new Error(`PVWatts API error: ${data.errors.join(', ')}`);
    }

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
      monthlyKwh: monthlyKwh.map(v => Math.round(v)),
      performanceRatio: Math.round(
        (annualKwh / (input.systemCapacityKw * solarRadiationKwhM2Day * 365)) * 100
      ) / 100,
      source: 'pvwatts-api',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ===== PYSAM SERVICE CALL =====

async function callPySamService(input: SimulationInput): Promise<SimulationResult> {
  const baseUrl = import.meta.env.VITE_PYSAM_API_URL || 'http://localhost:8000';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5_000);

  try {
    const response = await fetch(`${baseUrl}/simulate`, {
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

    if (!response.ok) {
      throw new Error(`PySAM service returned ${response.status}`);
    }

    const data = await response.json();

    return {
      annualKwh: Math.round(data.annual_kwh),
      kwhPerKwp: Math.round(data.kwh_per_kwp),
      capacityFactor: Math.round(data.capacity_factor * 1000) / 1000,
      solarRadiationKwhM2Day: Math.round(data.solar_radiation_kwh_m2_day * 100) / 100,
      monthlyKwh: (data.monthly_kwh as number[]).map(v => Math.round(v)),
      performanceRatio: Math.round(data.performance_ratio * 100) / 100,
      source: 'pysam',
      lossesBreakdown: data.losses_breakdown,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ===== PUBLIC API =====

/**
 * Run a solar production simulation for a given location and system.
 * Tries NREL PVWatts v8 API first, then PySAM service (if configured), then regional constants.
 * Results are cached in-memory for 1 hour (keyed by lat/lon/capacity).
 */
export async function simulateSolar(input: SimulationInput): Promise<SimulationResult> {
  const cacheKey = getCacheKey(input);
  const cached = getCached(cacheKey);
  if (cached) return cached;

  // 1. Try NREL PVWatts v8 API (free, no server needed)
  try {
    const result = await callPvWattsApi(input);
    setCache(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('[solarClient] PVWatts API unavailable:', (err as Error).message);
  }

  // 2. Try PySAM service (if configured — Option B)
  const pySamUrl = import.meta.env.VITE_PYSAM_API_URL;
  if (pySamUrl) {
    try {
      const result = await callPySamService(input);
      setCache(cacheKey, result);
      return result;
    } catch (err) {
      console.warn('[solarClient] PySAM service unavailable:', (err as Error).message);
    }
  }

  // 3. Regional constant fallback
  const result = getRegionalEstimate(input);
  setCache(cacheKey, result);
  return result;
}
