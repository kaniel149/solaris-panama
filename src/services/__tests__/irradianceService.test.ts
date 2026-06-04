import { describe, it, expect, vi, beforeEach } from 'vitest'
import { __parseNasaPower, fetchSolarIrradiance, __clearCache } from '@/services/irradianceService'

const SAMPLE = {
  properties: { parameter: {
    ALLSKY_SFC_SW_DWN: { JAN:5.1,FEB:5.4,MAR:5.6,APR:5.2,MAY:4.4,JUN:4.2,JUL:4.3,AUG:4.4,SEP:4.3,OCT:4.1,NOV:4.6,DEC:4.9, ANN:4.7 },
    T2M: { ANN: 27.3 },
  } },
}

describe('parseNasaPower', () => {
  it('extracts annual + monthly + extremes', () => {
    const r = __parseNasaPower(SAMPLE)
    expect(r.annualGHI).toBeCloseTo(4.7, 5)
    expect(r.monthlyGHI).toHaveLength(12)
    expect(r.bestMonth).toBe('March')
    expect(r.worstMonth).toBe('October')
  })
})

describe('fetchSolarIrradiance caching', () => {
  beforeEach(() => __clearCache())
  it('caches by 0.1deg grid (one fetch for nearby coords)', async () => {
    const f = vi.fn().mockResolvedValue({ ok: true, json: async () => SAMPLE })
    vi.stubGlobal('fetch', f)
    await fetchSolarIrradiance(7.966, -80.433)
    await fetchSolarIrradiance(7.961, -80.431) // same 0.1 grid
    expect(f).toHaveBeenCalledTimes(1)
    vi.unstubAllGlobals()
  })
})
