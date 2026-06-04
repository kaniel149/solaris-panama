import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as svc from '@/services/roofScannerService'
import * as vision from '@/services/aiVisionRoofService'
import * as irr from '@/services/irradianceService'

describe('scanRoof fallback chain', () => {
  beforeEach(() => vi.restoreAllMocks())
  it('uses AI vision when Google Solar returns null', async () => {
    vi.spyOn(svc, 'scanWithGoogleSolar').mockResolvedValue(null)
    vi.spyOn(irr, 'fetchSolarIrradiance').mockResolvedValue({ annualGHI: 4.7, monthlyGHI: [], annualTemp: 27, bestMonth: 'March', worstMonth: 'October' })
    vi.spyOn(vision, 'fetchVisionRoof').mockResolvedValue({ total_roof_area_m2: 400, usable_area_pct: 0.75, orientation: 'south', roof_type: 'concrete', shading: 'none', tilt_estimate_deg: 8, existing_solar: false, confidence: 0.8 })
    const r = await svc.scanRoof({ latitude: 8.43, longitude: -80.43 })
    expect(r.source).toBe('ai_vision')
    expect(r.maxSystemSizeKwp).toBeGreaterThan(0)
  })
})
