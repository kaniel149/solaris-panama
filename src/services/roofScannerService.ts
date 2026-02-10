// Roof Scanner Service
// Google Solar API + Local Panama Estimator (primary) + PVWatts (optional enrichment)
// Scans any building's roof and assesses solar potential

import { geocodeAddress } from './geocodingService';
import {
  PANAMA_DEFAULTS,
  calculateMonthlyProduction,
} from './solarCalculator';

// ===== INTERFACES =====

export interface RoofScanRequest {
  address?: string;
  latitude?: number;
  longitude?: number;
  roofAreaM2?: number; // Pass actual building area for better estimates
}

export interface RoofSegment {
  areaM2: number;
  pitchDegrees: number;
  azimuthDegrees: number;
  center: { lat: number; lng: number };
}

export interface PanelConfig {
  panelsCount: number;
  yearlyEnergyDcKwh: number;
}

export interface RoofScanResult {
  // Location
  address: string;
  latitude: number;
  longitude: number;

  // Scan status
  source: 'google_solar' | 'pvwatts_estimate' | 'local_panama' | 'manual';
  quality: 'HIGH' | 'MEDIUM' | 'BASE' | 'ESTIMATED';

  // Roof data
  totalRoofAreaM2: number;
  usableRoofAreaM2: number;
  roofSegments: RoofSegment[];

  // Solar potential
  maxPanelCount: number;
  maxSystemSizeKwp: number;
  yearlyEnergyKwh: number;
  peakSunHoursPerYear: number;

  // Panel configs (different size options)
  panelConfigs: PanelConfig[];

  // Imagery
  imageryDate?: string;

  // Raw data for debugging
  rawGoogleSolarData?: unknown;
  rawPvWattsData?: unknown;
}

export interface PvWattsResult {
  yearlyEnergyKwh: number;
  monthlyEnergyKwh: number[];
  solarRadiationAnnual: number;
  capacityFactor: number;
}

// ===== CONSTANTS =====

// Standard panel specs (580W bifacial, ~2.58 m2)
const PANEL_WATT = 580;
const PANEL_AREA_M2 = 2.58;
const USABLE_ROOF_RATIO = 0.6; // 60% of roof usable for panels (setbacks, obstructions, HVAC)
const SYSTEM_LOSSES = 14; // % losses (wiring, inverter, soiling, shading)

// ===== PANAMA CITY-LEVEL SOLAR DATA =====
// Used for latitude/longitude-based PSH interpolation

interface CityReference {
  name: string;
  lat: number;
  lng: number;
  psh: number; // Peak sun hours/day
}

const PANAMA_CITIES: CityReference[] = [
  { name: 'Panama City', lat: 8.9824, lng: -79.5199, psh: 4.5 },
  { name: 'Colón',       lat: 9.3547, lng: -79.9016, psh: 4.2 },
  { name: 'David',       lat: 8.4333, lng: -82.4333, psh: 4.8 },
  { name: 'Santiago',    lat: 8.1000, lng: -80.9833, psh: 4.6 },
  { name: 'Chitré',      lat: 7.9667, lng: -80.4333, psh: 4.7 },
];

/**
 * Get peak sun hours for a location using inverse-distance-weighted interpolation
 * from known Panama city data points.
 */
function getPeakSunHoursForLocation(lat: number, lng: number): number {
  // Calculate distance to each reference city (Haversine simplified for short distances)
  const distances = PANAMA_CITIES.map(city => {
    const dLat = (lat - city.lat) * 111; // ~111 km per degree latitude
    const dLng = (lng - city.lng) * 111 * Math.cos((lat * Math.PI) / 180);
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);
    return { city, dist: Math.max(dist, 0.1) }; // Avoid division by zero
  });

  // Check if we're very close to a known city (within ~5 km)
  const closest = distances.reduce((a, b) => (a.dist < b.dist ? a : b));
  if (closest.dist < 5) {
    return closest.city.psh;
  }

  // Inverse-distance weighting (IDW) with power=2
  let weightedSum = 0;
  let weightTotal = 0;
  for (const { city, dist } of distances) {
    const weight = 1 / (dist * dist);
    weightedSum += city.psh * weight;
    weightTotal += weight;
  }

  const interpolated = weightedSum / weightTotal;

  // Clamp to reasonable Panama range (4.0 - 5.0 PSH)
  return Math.max(4.0, Math.min(5.0, interpolated));
}

// ===== LOCAL PANAMA SOLAR ESTIMATOR =====

/**
 * Estimate solar production using built-in Panama-calibrated data.
 * No external API calls needed — uses solarCalculator constants.
 *
 * Returns PvWattsResult-compatible output so it can replace PVWatts seamlessly.
 */
export function estimateLocalSolar(
  lat: number,
  lng: number,
  systemSizeKwp: number,
  _roofAreaM2?: number
): PvWattsResult {
  // Get location-specific peak sun hours
  const psh = getPeakSunHoursForLocation(lat, lng);
  const performanceRatio = PANAMA_DEFAULTS.performanceRatio; // 0.80

  // Annual energy: system size * PSH * 365 * performance ratio
  const yearlyEnergyKwh = Math.round(
    systemSizeKwp * psh * 365 * performanceRatio
  );

  // Monthly breakdown using Panama seasonal profile
  const monthlyEnergyKwh = calculateMonthlyProduction(yearlyEnergyKwh).map(Math.round);

  // Solar radiation (kWh/m2/day annual average)
  const solarRadiationAnnual = psh;

  // Capacity factor: actual output / theoretical max
  const capacityFactor = yearlyEnergyKwh / (systemSizeKwp * 8760);

  return {
    yearlyEnergyKwh,
    monthlyEnergyKwh,
    solarRadiationAnnual,
    capacityFactor,
  };
}

// ===== GOOGLE SOLAR API =====

interface GoogleSolarRoofSegment {
  stats: {
    areaMeters2: number;
    sunshineQuantiles: number[];
    groundAreaMeters2: number;
  };
  center: { latitude: number; longitude: number };
  boundingBox: {
    sw: { latitude: number; longitude: number };
    ne: { latitude: number; longitude: number };
  };
  pitchDegrees: number;
  azimuthDegrees: number;
  planeHeightAtCenterMeters: number;
}

interface GoogleSolarPanelConfig {
  panelsCount: number;
  yearlyEnergyDcKwh: number;
  roofSegmentSummaries: Array<{
    pitchDegrees: number;
    azimuthDegrees: number;
    panelsCount: number;
    yearlyEnergyDcKwh: number;
    segmentIndex: number;
  }>;
}

interface GoogleSolarResponse {
  name?: string;
  center?: { latitude: number; longitude: number };
  imageryDate?: { year: number; month: number; day: number };
  imageryProcessedDate?: { year: number; month: number; day: number };
  postalCode?: string;
  administrativeArea?: string;
  statisticalArea?: string;
  regionCode?: string;
  solarPotential?: {
    maxArrayPanelsCount: number;
    maxArrayAreaMeters2: number;
    maxSunshineHoursPerYear: number;
    carbonOffsetFactorKgPerMwh: number;
    wholeRoofStats: {
      areaMeters2: number;
      sunshineQuantiles: number[];
      groundAreaMeters2: number;
    };
    roofSegmentStats: GoogleSolarRoofSegment[];
    solarPanelConfigs: GoogleSolarPanelConfig[];
    panelCapacityWatts: number;
    panelHeightMeters: number;
    panelWidthMeters: number;
    panelLifetimeYears: number;
    buildingStats: {
      areaMeters2: number;
      sunshineQuantiles: number[];
      groundAreaMeters2: number;
    };
  };
  imageryQuality?: 'HIGH' | 'MEDIUM' | 'LOW';
  error?: { code: number; message: string; status: string };
}

/**
 * Scan roof using Google Solar API via our server proxy.
 * Returns null if the location isn't covered by Google Solar.
 */
export async function scanWithGoogleSolar(
  lat: number,
  lng: number
): Promise<RoofScanResult | null> {
  try {
    const response = await fetch(
      `/api/roof-scan?action=google-solar&lat=${lat}&lng=${lng}`
    );
    if (!response.ok) return null;

    const data: GoogleSolarResponse = await response.json();
    if (data.error || !data.solarPotential) return null;

    const sp = data.solarPotential;

    // Map roof segments
    const roofSegments: RoofSegment[] = (sp.roofSegmentStats || []).map(
      (seg) => ({
        areaM2: seg.stats.areaMeters2,
        pitchDegrees: seg.pitchDegrees,
        azimuthDegrees: seg.azimuthDegrees,
        center: { lat: seg.center.latitude, lng: seg.center.longitude },
      })
    );

    // Build panel config options (25%, 50%, 75%, 100%)
    const allConfigs = sp.solarPanelConfigs || [];
    const panelConfigs: PanelConfig[] = [];
    if (allConfigs.length > 0) {
      const maxPanels = sp.maxArrayPanelsCount;
      const targets = [0.25, 0.5, 0.75, 1.0];
      for (const ratio of targets) {
        const targetCount = Math.round(maxPanels * ratio);
        // Find closest config
        let closest = allConfigs[0];
        let closestDiff = Math.abs(closest.panelsCount - targetCount);
        for (const cfg of allConfigs) {
          const diff = Math.abs(cfg.panelsCount - targetCount);
          if (diff < closestDiff) {
            closest = cfg;
            closestDiff = diff;
          }
        }
        // Avoid duplicates
        if (
          panelConfigs.length === 0 ||
          panelConfigs[panelConfigs.length - 1].panelsCount !==
            closest.panelsCount
        ) {
          panelConfigs.push({
            panelsCount: closest.panelsCount,
            yearlyEnergyDcKwh: closest.yearlyEnergyDcKwh,
          });
        }
      }
    }

    // Determine quality from imageryQuality
    const qualityMap: Record<string, RoofScanResult['quality']> = {
      HIGH: 'HIGH',
      MEDIUM: 'MEDIUM',
      LOW: 'BASE',
    };
    const quality = qualityMap[data.imageryQuality || ''] || 'BASE';

    // Build imagery date string
    let imageryDate: string | undefined;
    if (data.imageryDate) {
      const { year, month, day } = data.imageryDate;
      imageryDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    // Max system size
    const panelWatts = sp.panelCapacityWatts || PANEL_WATT;
    const maxSystemSizeKwp = (sp.maxArrayPanelsCount * panelWatts) / 1000;

    // Yearly energy from the max config
    const maxConfig = allConfigs.length
      ? allConfigs[allConfigs.length - 1]
      : null;
    const yearlyEnergyKwh = maxConfig
      ? maxConfig.yearlyEnergyDcKwh * (1 - SYSTEM_LOSSES / 100)
      : 0;

    return {
      address: '',
      latitude: lat,
      longitude: lng,
      source: 'google_solar',
      quality,
      totalRoofAreaM2: sp.wholeRoofStats?.areaMeters2 || 0,
      usableRoofAreaM2: sp.maxArrayAreaMeters2 || 0,
      roofSegments,
      maxPanelCount: sp.maxArrayPanelsCount,
      maxSystemSizeKwp,
      yearlyEnergyKwh: Math.round(yearlyEnergyKwh),
      peakSunHoursPerYear: sp.maxSunshineHoursPerYear || 0,
      panelConfigs,
      imageryDate,
      rawGoogleSolarData: data,
    };
  } catch {
    return null;
  }
}

// ===== PVWATTS (OPTIONAL ENRICHMENT) =====

interface PvWattsApiResponse {
  outputs?: {
    ac_annual: number;
    ac_monthly: number[];
    solrad_annual: number;
    capacity_factor: number;
  };
  errors?: string[];
}

/**
 * Estimate solar potential using NREL PVWatts v8 API.
 * Now used as OPTIONAL enrichment — not on the critical path.
 * The local Panama estimator is the primary fallback after Google Solar.
 */
export async function estimateWithPvWatts(
  lat: number,
  lng: number,
  systemSizeKw: number
): Promise<PvWattsResult> {
  const response = await fetch(
    `/api/roof-scan?action=pvwatts&lat=${lat}&lng=${lng}&system_capacity=${systemSizeKw}`
  );

  if (!response.ok) {
    throw new Error(`PVWatts API error: ${response.status}`);
  }

  const data: PvWattsApiResponse = await response.json();

  if (data.errors && data.errors.length > 0) {
    throw new Error(`PVWatts: ${data.errors.join(', ')}`);
  }

  if (!data.outputs) {
    throw new Error('PVWatts returned no output data');
  }

  return {
    yearlyEnergyKwh: Math.round(data.outputs.ac_annual),
    monthlyEnergyKwh: data.outputs.ac_monthly.map(Math.round),
    solarRadiationAnnual: data.outputs.solrad_annual,
    capacityFactor: data.outputs.capacity_factor,
  };
}

// ===== MAIN SCAN FUNCTION =====

/**
 * Scan a roof — pipeline:
 *   1. Google Solar API (highest quality, pixel-level data)
 *   2. Local Panama Estimator (always available, Panama-calibrated)
 *   3. PVWatts enrichment (optional cross-validation, not critical)
 *
 * Accepts either an address (geocoded automatically) or coordinates.
 */
export async function scanRoof(
  request: RoofScanRequest
): Promise<RoofScanResult> {
  // 1. Resolve coordinates
  let lat = request.latitude;
  let lng = request.longitude;
  let address = request.address || '';

  if (!lat || !lng) {
    if (!address) {
      throw new Error('Address or coordinates required');
    }
    const geo = await geocodeAddress(address);
    lat = geo.lat;
    lng = geo.lng;
    address = geo.displayName;
  }

  // 2. Try Google Solar API first (highest quality data)
  const googleResult = await scanWithGoogleSolar(lat, lng);
  if (googleResult) {
    return { ...googleResult, address };
  }

  // 3. Local Panama Estimator (primary fallback — no API keys needed)
  const estimatedRoofM2 = request.roofAreaM2 ?? 500;
  const usableArea = estimatedRoofM2 * USABLE_ROOF_RATIO;
  const maxPanels = Math.floor(usableArea / PANEL_AREA_M2);
  const estimatedSystemKwp = (maxPanels * PANEL_WATT) / 1000;

  const localEstimate = estimateLocalSolar(lat, lng, estimatedSystemKwp, estimatedRoofM2);

  const panelConfigs: PanelConfig[] = [0.25, 0.5, 0.75, 1.0].map((ratio) => ({
    panelsCount: Math.round(maxPanels * ratio),
    yearlyEnergyDcKwh: Math.round(localEstimate.yearlyEnergyKwh * ratio),
  }));

  const result: RoofScanResult = {
    address,
    latitude: lat,
    longitude: lng,
    source: 'local_panama',
    quality: 'ESTIMATED',
    totalRoofAreaM2: estimatedRoofM2,
    usableRoofAreaM2: usableArea,
    roofSegments: [
      {
        areaM2: estimatedRoofM2,
        pitchDegrees: 5,
        azimuthDegrees: 180,
        center: { lat, lng },
      },
    ],
    maxPanelCount: maxPanels,
    maxSystemSizeKwp: estimatedSystemKwp,
    yearlyEnergyKwh: localEstimate.yearlyEnergyKwh,
    peakSunHoursPerYear: localEstimate.solarRadiationAnnual * 365,
    panelConfigs,
  };

  // 4. Optional PVWatts enrichment (cross-validate, non-blocking)
  try {
    const pvwatts = await estimateWithPvWatts(lat, lng, estimatedSystemKwp);
    // If PVWatts succeeds, attach as raw data for comparison but keep local estimate as primary
    result.rawPvWattsData = pvwatts;
  } catch {
    // PVWatts failed — no problem, local estimate is sufficient
    console.log('[roofScanner] PVWatts enrichment unavailable, using local Panama estimate');
  }

  return result;
}
