import { describe, it, expect } from 'vitest'
import { visionToRoofScan } from '@/services/aiVisionRoofService'

describe('visionToRoofScan', () => {
  it('computes kWp/panels from usable area', () => {
    const r = visionToRoofScan(
      { total_roof_area_m2: 400, usable_area_pct: 0.75, orientation: 'south',
        roof_type: 'concrete', shading: 'none', tilt_estimate_deg: 10,
        existing_solar: false, confidence: 0.82 },
      8.43, -80.43, 4.7,
    )
    expect(r.source).toBe('ai_vision')
    expect(r.quality).toBe('MEDIUM')
    expect(r.totalRoofAreaM2).toBe(400)
    expect(r.usableRoofAreaM2).toBe(300)         // 400 * 0.75
    expect(r.maxPanelCount).toBe(Math.floor(300 / 2.58)) // 116
    expect(r.maxSystemSizeKwp).toBeCloseTo(116 * 580 / 1000, 2) // 67.28
    // annual ≈ kWp * PSH(4.7) * 365 * PR(0.80)
    expect(r.yearlyEnergyKwh).toBe(Math.round(67.28 * 4.7 * 365 * 0.80))
  })
  it('throws on missing area', () => {
    expect(() => visionToRoofScan({} as any, 0, 0, 4.7)).toThrow()
  })
})
