import { describe, it, expect } from 'vitest'
import { calculateSolarFinancials, npv, irr, lcoe } from '@/services/solarFinancials'

describe('calculateSolarFinancials (Panama, USD)', () => {
  const r = calculateSolarFinancials({ systemSizeKwp: 10, pshAvg: 4.5 })
  it('year-1 production applies 2% LID', () => {
    // 10*4.5*365*0.80 = 13140 ; *0.98 = 12877
    expect(r.annual_kwh).toBe(12877)
  })
  it('year-1 savings = kWh * rate(0.20) * selfConsumption(0.70)', () => {
    // 12877.2 * 0.14 = 1802.8
    expect(r.annual_savings_usd).toBe(1803)
  })
  it('simple payback = price(9500) / year1 savings', () => {
    expect(r.payback_simple_years).toBeCloseTo(5.3, 1) // 9500/1802.8
  })
  it('CO2 yr1 = kWh * 0.537', () => {
    expect(r.co2_saved_kg_year1).toBe(6915) // 12877.2*0.537
  })
  it('25yr savings exceed 10yr; discounted payback positive', () => {
    expect(r.savings_25yr_usd).toBeGreaterThan(r.savings_10yr_usd)
    expect(r.payback_discounted_years).toBeGreaterThan(0)
  })
  it('npv_usd is populated (positive for a viable project)', () => {
    expect(r.npv_usd).toBeGreaterThan(0)
  })
  it('irr is a decimal between 0 and 1 for a viable project', () => {
    expect(r.irr).toBeGreaterThan(0)
    expect(r.irr).toBeLessThan(1)
  })
  it('lcoe_usd_per_kwh is less than the retail electricity rate (project viable)', () => {
    // LCOE should be below $0.20/kWh (retail rate) for the project to make sense
    expect(r.lcoe_usd_per_kwh).toBeGreaterThan(0)
    expect(r.lcoe_usd_per_kwh).toBeLessThan(0.20)
  })
})

describe('npv() pure function', () => {
  it('returns -investment when all cashflows are 0', () => {
    // t=0: -1000, t=1..3: 0 → NPV = -1000
    expect(npv([-1000, 0, 0, 0], 0.1)).toBeCloseTo(-1000, 0)
  })

  it('single period: -1000 + 1100 at 10% = 0', () => {
    // NPV = -1000 + 1100/1.1 = -1000 + 1000 = 0
    expect(npv([-1000, 1100], 0.1)).toBeCloseTo(0, 4)
  })

  it('known multi-period case', () => {
    // -1000 + 500/1.1 + 500/1.21 + 500/1.331
    // = -1000 + 454.55 + 413.22 + 375.66 = 243.43
    const result = npv([-1000, 500, 500, 500], 0.1)
    expect(result).toBeCloseTo(243.43, 0)
  })

  it('returns positive NPV when cashflows dwarf initial cost', () => {
    expect(npv([-100, 1000, 1000], 0.05)).toBeGreaterThan(0)
  })

  it('returns negative NPV when discount rate is very high', () => {
    expect(npv([-10000, 500, 500, 500], 0.99)).toBeLessThan(0)
  })
})

describe('irr() pure function', () => {
  it('returns 0 when total inflows <= initial outlay', () => {
    // -1000, +200, +200, +200 = total inflow 600 < 1000
    expect(irr([-1000, 200, 200, 200])).toBe(0)
  })

  it('known case: -1000, +1100 → IRR = 10%', () => {
    expect(irr([-1000, 1100])).toBeCloseTo(0.10, 3)
  })

  it('known case: -1000, +500, +500, +500 → IRR ≈ 23.4%', () => {
    // Verified: NPV(-1000,500,500,500) at 23.4% ≈ 0
    const result = irr([-1000, 500, 500, 500])
    expect(result).toBeGreaterThan(0.23)
    expect(result).toBeLessThan(0.24)
  })

  it('typical 10-kWp Panama solar project has IRR > 8% (hurdle rate)', () => {
    const r = calculateSolarFinancials({ systemSizeKwp: 10, pshAvg: 4.5 })
    expect(r.irr).toBeGreaterThan(0.08)
  })
})

describe('lcoe() pure function', () => {
  it('returns 0 when production array is empty', () => {
    expect(lcoe(1000, 50, [], 0.08)).toBe(0)
  })

  it('simple 1-year case', () => {
    // initialCost=1000, omAnnual=0, production=[1000 kWh], rate=0
    // LCOE = (1000 + 0/1) / (1000/1) = 1.0 $/kWh
    expect(lcoe(1000, 0, [1000], 0)).toBeCloseTo(1.0, 4)
  })

  it('with discount: LCOE increases as rate increases', () => {
    const lowRate = lcoe(1000, 50, [500, 490, 480], 0.03)
    const highRate = lcoe(1000, 50, [500, 490, 480], 0.15)
    expect(highRate).toBeGreaterThan(lowRate)
  })

  it('typical 10-kWp Panama solar LCOE is well below $0.195/kWh grid rate', () => {
    const r = calculateSolarFinancials({ systemSizeKwp: 10, pshAvg: 4.5 })
    expect(r.lcoe_usd_per_kwh).toBeLessThan(0.195)
  })
})
