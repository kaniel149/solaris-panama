// Roof Scanner Service
// Google Solar API + PVWatts fallback + Geocoding integration
// Scans any building's roof and assesses solar potential

import { geocodeAddress } from './geocodingService';

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
  source: 'google_solar' | 'pvwatts_estimate' | 'manual';
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

// ===== PVWATTS FALLBACK =====

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
 * Works globally - used as fallback when Google Solar isn't available.
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
 * Scan a roof - tries Google Solar first, falls back to PVWatts estimate.
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

  // 2. Try Google Solar API first (higher quality data)
  const googleResult = await scanWithGoogleSolar(lat, lng);
  if (googleResult) {
    return { ...googleResult, address };
  }

  // 3. Fallback: PVWatts estimate
  // Estimate a typical commercial flat roof
  const estimatedRoofM2 = request.roofAreaM2 ?? 500;
  const usableArea = estimatedRoofM2 * USABLE_ROOF_RATIO;
  const maxPanels = Math.floor(usableArea / PANEL_AREA_M2);
  const estimatedSystemKwp = (maxPanels * PANEL_WATT) / 1000;

  try {
    const pvwatts = await estimateWithPvWatts(lat, lng, estimatedSystemKwp);

    const panelConfigs: PanelConfig[] = [0.25, 0.5, 0.75, 1.0].map((ratio) => {
      const panels = Math.round(maxPanels * ratio);
      const energy = Math.round(pvwatts.yearlyEnergyKwh * ratio);
      return { panelsCount: panels, yearlyEnergyDcKwh: energy };
    });

    return {
      address,
      latitude: lat,
      longitude: lng,
      source: 'pvwatts_estimate',
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
      yearlyEnergyKwh: pvwatts.yearlyEnergyKwh,
      peakSunHoursPerYear: pvwatts.solarRadiationAnnual * 365,
      panelConfigs,
      rawPvWattsData: pvwatts,
    };
  } catch {
    // 4. Final fallback: local estimate (no API keys needed)
    // Panama average: ~4.5 peak sun hours/day → ~1,643 kWh/kWp/year
    const PANAMA_PSH = 4.5;
    const yearlyKwhPerKwp = PANAMA_PSH * 365 * (1 - SYSTEM_LOSSES / 100);
    const yearlyEnergy = Math.round(estimatedSystemKwp * yearlyKwhPerKwp);

    const panelConfigs: PanelConfig[] = [0.25, 0.5, 0.75, 1.0].map((ratio) => ({
      panelsCount: Math.round(maxPanels * ratio),
      yearlyEnergyDcKwh: Math.round(yearlyEnergy * ratio),
    }));

    return {
      address,
      latitude: lat,
      longitude: lng,
      source: 'manual' as const,
      quality: 'ESTIMATED' as const,
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
      yearlyEnergyKwh: yearlyEnergy,
      peakSunHoursPerYear: PANAMA_PSH * 365,
      panelConfigs,
    };
  }
}
