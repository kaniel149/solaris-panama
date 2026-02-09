import { PANAMA_DEFAULTS } from '@/services/solarCalculator';

// ===== CORE GEODETIC FUNCTIONS =====

const EARTH_RADIUS = 6371000; // meters
const DEG_TO_RAD = Math.PI / 180;

/**
 * Haversine distance between two points in meters
 */
export function haversineDistance(
  p1: { lat: number; lon: number },
  p2: { lat: number; lon: number }
): number {
  const dLat = (p2.lat - p1.lat) * DEG_TO_RAD;
  const dLon = (p2.lon - p1.lon) * DEG_TO_RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(p1.lat * DEG_TO_RAD) *
      Math.cos(p2.lat * DEG_TO_RAD) *
      Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calculate polygon area in m² using the Shoelace formula with geodetic correction.
 * Projects lat/lng to meters using local approximation for accurate small-area calculations.
 */
export function calculatePolygonArea(
  coordinates: Array<{ lat: number; lon: number }>
): number {
  if (coordinates.length < 3) return 0;

  // Use centroid as projection origin for local meter conversion
  const centroid = calculateCentroid(coordinates);
  const cosLat = Math.cos(centroid.lat * DEG_TO_RAD);

  // Convert lat/lon to local meters relative to centroid
  const points = coordinates.map((c) => ({
    x: (c.lon - centroid.lon) * DEG_TO_RAD * EARTH_RADIUS * cosLat,
    y: (c.lat - centroid.lat) * DEG_TO_RAD * EARTH_RADIUS,
  }));

  // Shoelace formula
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }

  return Math.abs(area) / 2;
}

/**
 * Calculate the length of each edge in meters using Haversine formula
 */
export function calculateEdgeLengths(
  coordinates: Array<{ lat: number; lon: number }>
): number[] {
  if (coordinates.length < 2) return [];

  const lengths: number[] = [];
  for (let i = 0; i < coordinates.length; i++) {
    const next = coordinates[(i + 1) % coordinates.length];
    lengths.push(haversineDistance(coordinates[i], next));
  }
  return lengths;
}

/**
 * Calculate total perimeter in meters
 */
export function calculatePerimeter(
  coordinates: Array<{ lat: number; lon: number }>
): number {
  return calculateEdgeLengths(coordinates).reduce((sum, len) => sum + len, 0);
}

/**
 * Calculate centroid of a polygon
 */
export function calculateCentroid(
  coordinates: Array<{ lat: number; lon: number }>
): { lat: number; lon: number } {
  if (coordinates.length === 0) return { lat: 0, lon: 0 };
  if (coordinates.length === 1) return coordinates[0];

  const sum = coordinates.reduce(
    (acc, c) => ({ lat: acc.lat + c.lat, lon: acc.lon + c.lon }),
    { lat: 0, lon: 0 }
  );

  return {
    lat: sum.lat / coordinates.length,
    lon: sum.lon / coordinates.length,
  };
}

/**
 * Get the midpoint of an edge (for dimension labels)
 */
export function edgeMidpoint(
  p1: { lat: number; lon: number },
  p2: { lat: number; lon: number }
): { lat: number; lon: number } {
  return {
    lat: (p1.lat + p2.lat) / 2,
    lon: (p1.lon + p2.lon) / 2,
  };
}

// ===== SOLAR PANEL ESTIMATION =====

export interface PanelLayoutResult {
  panelCount: number;
  usableArea: number;
  totalPanelArea: number;
  coveragePercent: number;
  systemKwp: number;
  annualKwh: number;
}

/**
 * Estimate how many solar panels fit on a roof.
 * Uses Panama defaults from solarCalculator for consistency.
 */
export function estimatePanelLayout(
  roofAreaM2: number,
  options?: {
    panelWidthM?: number;
    panelHeightM?: number;
    spacingM?: number;
    usablePercent?: number;
    excludeAreaM2?: number;
  }
): PanelLayoutResult {
  if (roofAreaM2 <= 0) {
    return { panelCount: 0, usableArea: 0, totalPanelArea: 0, coveragePercent: 0, systemKwp: 0, annualKwh: 0 };
  }

  const panelW = options?.panelWidthM ?? 1.134;
  const panelH = options?.panelHeightM ?? 2.278;
  const spacing = options?.spacingM ?? 0.5;
  const usablePct = options?.usablePercent ?? 0.6;
  const excludeArea = options?.excludeAreaM2 ?? 0;

  const usableArea = Math.max(0, roofAreaM2 * usablePct - excludeArea);
  const panelArea = panelW * panelH;
  const panelWithSpacing = panelW * (panelH + spacing);
  const panelCount = Math.floor(usableArea / panelWithSpacing);
  const totalPanelArea = panelCount * panelArea;
  const coveragePercent = roofAreaM2 > 0 ? (totalPanelArea / roofAreaM2) * 100 : 0;

  // System size using Panama defaults
  const systemKwp = (panelCount * PANAMA_DEFAULTS.panelWattage) / 1000;
  const annualKwh =
    systemKwp *
    PANAMA_DEFAULTS.peakSunHours *
    365 *
    PANAMA_DEFAULTS.performanceRatio;

  return {
    panelCount,
    usableArea: Math.round(usableArea),
    totalPanelArea: Math.round(totalPanelArea),
    coveragePercent: Math.round(coveragePercent),
    systemKwp: Math.round(systemKwp * 10) / 10,
    annualKwh: Math.round(annualKwh),
  };
}

// ===== FORMATTING =====

/**
 * Format area display (m² or hectares depending on size)
 */
export function formatArea(areaM2: number): string {
  if (areaM2 >= 10000) {
    return `${(areaM2 / 10000).toFixed(2)} ha`;
  }
  return `${Math.round(areaM2).toLocaleString()} m\u00B2`;
}

/**
 * Format distance display (m or km depending on size)
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters * 10) / 10} m`;
}

/**
 * Get suitability grade from score
 */
export function getGradeFromScore(score: number): { grade: string; label: string; color: string } {
  if (score >= 80) return { grade: 'A', label: 'Excellent', color: '#10b981' };
  if (score >= 60) return { grade: 'B', label: 'Good', color: '#f59e0b' };
  if (score >= 40) return { grade: 'C', label: 'Fair', color: '#f97316' };
  return { grade: 'D', label: 'Poor', color: '#ef4444' };
}

/**
 * Grade color mapping for map layers
 */
export const GRADE_COLORS = {
  A: '#10b981', // emerald
  B: '#f59e0b', // amber
  C: '#f97316', // orange
  D: '#ef4444', // red
} as const;
