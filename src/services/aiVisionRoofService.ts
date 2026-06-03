import { PANAMA_DEFAULTS } from '@/services/solarCalculator'
import type { RoofScanResult } from '@/services/roofScannerService'

export interface VisionRoofResult {
  total_roof_area_m2: number; usable_area_pct: number; orientation: string
  roof_type: string; shading: 'none' | 'partial' | 'heavy'
  tilt_estimate_deg: number; existing_solar: boolean; confidence: number
}

const azimuthFromOrientation: Record<string, number> = {
  south: 180, east: 90, west: 270, 'east-west': 135, mixed: 180, unknown: 180,
}

export async function fetchVisionRoof(lat: number, lng: number, zoom = 20): Promise<VisionRoofResult> {
  const res = await fetch(`/api/roof-vision?lat=${lat}&lng=${lng}&zoom=${zoom}`)
  if (!res.ok) throw new Error(`vision endpoint ${res.status}`)
  return res.json()
}

/** Map vision output + local irradiance (PSH) into a RoofScanResult. */
export function visionToRoofScan(v: VisionRoofResult, lat: number, lng: number, pshAvg: number): RoofScanResult {
  if (!v || !v.total_roof_area_m2) throw new Error('vision result missing roof area')
  const usablePct = Math.min(0.85, Math.max(0.5, v.usable_area_pct || 0.7))
  const usable = v.total_roof_area_m2 * usablePct
  const panels = Math.floor(usable / PANAMA_DEFAULTS.panelAreaM2)
  const kwp = (panels * PANAMA_DEFAULTS.panelWattage) / 1000
  const yearly = Math.round(kwp * pshAvg * 365 * PANAMA_DEFAULTS.performanceRatio)
  const quality: RoofScanResult['quality'] = v.confidence >= 0.75 ? 'MEDIUM' : 'BASE'
  return {
    address: '', latitude: lat, longitude: lng,
    source: 'ai_vision', quality,
    totalRoofAreaM2: v.total_roof_area_m2, usableRoofAreaM2: Math.round(usable),
    roofSegments: [{ areaM2: v.total_roof_area_m2, pitchDegrees: v.tilt_estimate_deg || 5,
      azimuthDegrees: azimuthFromOrientation[v.orientation] ?? 180, center: { lat, lng } }],
    maxPanelCount: panels, maxSystemSizeKwp: kwp, yearlyEnergyKwh: yearly,
    peakSunHoursPerYear: Math.round(pshAvg * 365),
    panelConfigs: [0.25, 0.5, 0.75, 1].map((r) => ({
      panelsCount: Math.round(panels * r), yearlyEnergyDcKwh: Math.round(yearly * r) })),
    visionMeta: { orientation: v.orientation, roofType: v.roof_type, shading: v.shading,
      existingSolar: v.existing_solar, confidence: v.confidence },
  }
}
