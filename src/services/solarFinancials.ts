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
}

const round = (v: number, d = 0) => { const f = 10 ** d; return Math.round(v * f) / f }
const FIRST_YEAR_LID = 0.02
const CO2_KG_PER_KWH = PANAMA_DEFAULTS.gridEmissionFactor // 0.537 tCO2/MWh == kg/kWh

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

  let lifetimeSavings = 0, lifetimeKwh = 0, cum10 = 0
  let cumDiscounted = -price, paybackDisc = life
  for (let y = 1; y <= life; y++) {
    const degFactor = y === 1 ? (1 - FIRST_YEAR_LID) : (1 - FIRST_YEAR_LID) * (1 - degr) ** (y - 2)
    const yKwh = baseline * degFactor
    const ySavings = yKwh * effRate * (1 + esc) ** (y - 1)
    const yCash = ySavings - omAnnual
    lifetimeKwh += yKwh; lifetimeSavings += ySavings
    if (y <= 10) cum10 += ySavings
    const dCash = yCash / (1 + disc) ** y
    const prev = cumDiscounted; cumDiscounted += dCash
    if (paybackDisc === life && cumDiscounted >= 0 && dCash > 0) paybackDisc = y - 1 + Math.abs(prev) / dCash
  }
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
  }
}
