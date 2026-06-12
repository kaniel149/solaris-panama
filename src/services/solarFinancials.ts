import { PANAMA_DEFAULTS } from '@/services/solarCalculator'

export const SOLAR_FINANCIAL_VERSION = 'pa-financials-2026-06-v1'

export interface SolarFinancialInput {
  systemSizeKwp: number
  pshAvg?: number
  retailRateUsd?: number          // default 0.20
  selfConsumptionPct?: number     // default 0.70 (0.85 with battery)
  batteryKwh?: number
  totalPriceUsd?: number          // default kWp*1000*costPerWp
  performanceRatio?: number       // default 0.80
}

export interface SolarFinancialOutput {
  version: string
  system_size_kwp: number
  effective_rate_usd: number
  annual_kwh: number
  monthly_kwh: number
  annual_savings_usd: number
  monthly_savings_usd: number
  total_price_usd: number
  payback_simple_years: number
  payback_discounted_years: number
  savings_10yr_usd: number
  savings_25yr_usd: number
  co2_saved_kg_year1: number
  co2_tons_25yr: number
  // ── 25-year financial model metrics ──────────────────────────────────────
  npv_usd: number           // Net Present Value at 8% discount rate (USD)
  irr: number               // Internal Rate of Return (decimal, e.g. 0.18 = 18%)
  lcoe_usd_per_kwh: number  // Levelized Cost of Energy (USD/kWh)
}

const round = (v: number, d = 0) => { const f = 10 ** d; return Math.round(v * f) / f }
const FIRST_YEAR_LID = 0.02
const CO2_KG_PER_KWH = PANAMA_DEFAULTS.gridEmissionFactor // 0.537 tCO2/MWh == kg/kWh

// ── Pure financial math functions ────────────────────────────────────────────
// Exported for testing and reuse. Panama discount rate: 8% (PANAMA_DEFAULTS.discountRate).
//
// npv(cashflows, rate):
//   cashflows[0] = -initialInvestment (negative), cashflows[1..n] = annual net cashflows.
//   Returns sum of CF_t / (1+r)^t for t=0..n.
//
// irr(cashflows):
//   Bisection method over [-50%, +200%]. Reliable for typical solar cashflow patterns
//   (single sign change: negative t=0, positive thereafter).
//   Returns rate as decimal. Returns 0 if total cashflow <= 0 (project never profitable).
//
// lcoe(initialCost, annualOMCost, annualProductionKwh, discountRate, systemLifeYears):
//   NREL/IEA definition: sum(discounted costs) / sum(discounted energy).
//   Costs = initial capex + discounted O&M per year.
//   Energy = degraded annual production discounted per year.
//   Returns $/kWh.

export function npv(cashflows: number[], rate: number): number {
  return cashflows.reduce((sum, cf, t) => sum + cf / Math.pow(1 + rate, t), 0)
}

export function irr(cashflows: number[]): number {
  const totalCashFlow = cashflows.slice(1).reduce((s, cf) => s + cf, 0)
  // If total inflows never exceed the initial outlay, IRR is undefined / negative
  if (totalCashFlow <= Math.abs(cashflows[0])) return 0

  let lo = -0.5
  let hi = 2.0
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    const n = npv(cashflows, mid)
    if (n > 0) lo = mid; else hi = mid
    if (hi - lo < 1e-7) break
  }
  return (lo + hi) / 2
}

export function lcoe(
  initialCost: number,
  annualOMCost: number,
  annualProductionKwhByYear: number[],
  discountRate: number,
): number {
  let totalDiscountedCost = initialCost
  let totalDiscountedEnergy = 0
  for (let i = 0; i < annualProductionKwhByYear.length; i++) {
    const df = Math.pow(1 + discountRate, i + 1)
    totalDiscountedCost += annualOMCost / df
    totalDiscountedEnergy += annualProductionKwhByYear[i] / df
  }
  return totalDiscountedEnergy > 0 ? totalDiscountedCost / totalDiscountedEnergy : 0
}

export function calculateSolarFinancials(input: SolarFinancialInput): SolarFinancialOutput {
  const kwp = input.systemSizeKwp || 0
  const psh = input.pshAvg ?? PANAMA_DEFAULTS.peakSunHours
  const pr = input.performanceRatio ?? PANAMA_DEFAULTS.performanceRatio
  const rate = input.retailRateUsd ?? 0.20
  const selfPct = input.selfConsumptionPct ?? ((input.batteryKwh || 0) > 0 ? 0.85 : PANAMA_DEFAULTS.selfConsumptionRatio)
  const effRate = rate * selfPct
  const price = input.totalPriceUsd ?? kwp * 1000 * PANAMA_DEFAULTS.costPerWp
  const omAnnual = kwp * PANAMA_DEFAULTS.omCostPerKwpYear
  const esc = PANAMA_DEFAULTS.rateEscalation
  const disc = PANAMA_DEFAULTS.discountRate
  const degr = PANAMA_DEFAULTS.degradationRate
  const life = PANAMA_DEFAULTS.systemLifetime

  const baseline = kwp * psh * 365 * pr
  const year1Kwh = baseline * (1 - FIRST_YEAR_LID)
  const year1Savings = year1Kwh * effRate

  // Build yearly cashflows and production arrays for NPV/IRR/LCOE
  const cashflows: number[] = [-price]
  const yearlyKwhArr: number[] = []

  let lifetimeSavings = 0, lifetimeKwh = 0, cum10 = 0
  let cumDiscounted = -price, paybackDisc = life

  for (let y = 1; y <= life; y++) {
    const degFactor = y === 1 ? (1 - FIRST_YEAR_LID) : (1 - FIRST_YEAR_LID) * (1 - degr) ** (y - 2)
    const yKwh = baseline * degFactor
    const ySavings = yKwh * effRate * (1 + esc) ** (y - 1)
    const yCash = ySavings - omAnnual
    lifetimeKwh += yKwh; lifetimeSavings += ySavings
    if (y <= 10) cum10 += ySavings

    cashflows.push(yCash)
    yearlyKwhArr.push(yKwh)

    const dCash = yCash / (1 + disc) ** y
    const prev = cumDiscounted; cumDiscounted += dCash
    if (paybackDisc === life && cumDiscounted >= 0 && dCash > 0) paybackDisc = y - 1 + Math.abs(prev) / dCash
  }

  const npvUsd = npv(cashflows, disc)
  const irrDecimal = irr(cashflows)
  const lcoeUsd = lcoe(price, omAnnual, yearlyKwhArr, disc)

  return {
    version: SOLAR_FINANCIAL_VERSION,
    system_size_kwp: round(kwp, 2),
    effective_rate_usd: round(effRate, 3),
    annual_kwh: Math.round(year1Kwh),
    monthly_kwh: Math.round(year1Kwh / 12),
    annual_savings_usd: Math.round(year1Savings),
    monthly_savings_usd: Math.round(year1Savings / 12),
    total_price_usd: Math.round(price),
    payback_simple_years: year1Savings > 0 ? round(price / year1Savings, 1) : 0,
    payback_discounted_years: price > 0 ? round(paybackDisc, 1) : 0,
    savings_10yr_usd: Math.round(cum10),
    savings_25yr_usd: Math.round(lifetimeSavings),
    co2_saved_kg_year1: Math.round(year1Kwh * CO2_KG_PER_KWH),
    co2_tons_25yr: round((lifetimeKwh * CO2_KG_PER_KWH) / 1000, 1),
    npv_usd: Math.round(npvUsd),
    irr: round(irrDecimal, 4),
    lcoe_usd_per_kwh: round(lcoeUsd, 4),
  }
}
