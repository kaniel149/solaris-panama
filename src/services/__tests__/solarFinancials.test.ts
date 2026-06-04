import { describe, it, expect } from 'vitest'
import { calculateSolarFinancials } from '@/services/solarFinancials'

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
})
