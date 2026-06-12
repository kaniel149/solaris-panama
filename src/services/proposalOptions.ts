import { calculateSolarFinancials, type SolarFinancialInput } from '@/services/solarFinancials'

export interface ProposalOption {
  id: 'epc' | 'ppa' | 'epc_battery'
  label_es: string
  upfront_usd: number
  annual_savings_usd: number
  payback_years: number
  savings_25yr_usd: number
  co2_tons_25yr: number
  // 25-year financial model metrics
  npv_usd: number
  irr: number               // decimal, e.g. 0.18 = 18%
  lcoe_usd_per_kwh: number
}

export function buildProposalOptions(base: SolarFinancialInput): ProposalOption[] {
  const epc = calculateSolarFinancials(base)
  const bat = calculateSolarFinancials({ ...base, batteryKwh: 10 })
  // PPA: modelled as 40% of EPC savings with no capital outlay.
  // NPV/IRR/LCOE are not meaningful for PPA from the customer's perspective.
  return [
    {
      id: 'epc',
      label_es: 'Compra (EPC)',
      upfront_usd: epc.total_price_usd,
      annual_savings_usd: epc.annual_savings_usd,
      payback_years: epc.payback_discounted_years,
      savings_25yr_usd: epc.savings_25yr_usd,
      co2_tons_25yr: epc.co2_tons_25yr,
      npv_usd: epc.npv_usd,
      irr: epc.irr,
      lcoe_usd_per_kwh: epc.lcoe_usd_per_kwh,
    },
    {
      id: 'ppa',
      label_es: 'PPA (sin inversión inicial)',
      upfront_usd: 0,
      annual_savings_usd: Math.round(epc.annual_savings_usd * 0.4),
      payback_years: 0,
      savings_25yr_usd: Math.round(epc.savings_25yr_usd * 0.4),
      co2_tons_25yr: epc.co2_tons_25yr,
      npv_usd: 0,
      irr: 0,
      lcoe_usd_per_kwh: 0,
    },
    {
      id: 'epc_battery',
      label_es: 'EPC + Batería',
      upfront_usd: bat.total_price_usd + 4000,
      annual_savings_usd: bat.annual_savings_usd,
      payback_years: bat.payback_discounted_years,
      savings_25yr_usd: bat.savings_25yr_usd,
      co2_tons_25yr: bat.co2_tons_25yr,
      npv_usd: bat.npv_usd,
      irr: bat.irr,
      lcoe_usd_per_kwh: bat.lcoe_usd_per_kwh,
    },
  ]
}
