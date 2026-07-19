import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { calculateSolarFinancials } from '@/services/solarFinancials'
import { PANAMA_DEFAULTS } from '@/services/solarCalculator'

interface SolarFinancialsPanelProps {
  systemKwp: number
  pshAvg?: number
  /**
   * Monthly kWh override sourced from a scanned electricity bill.
   * When provided, the panel sizes the system to cover this consumption
   * instead of using the default production estimate derived from kWp alone.
   *
   * Sizing logic: required kWp = monthlyKwh * 12 / (PSH * 365 * PR * selfPct)
   * The resulting kWp replaces systemKwp in the financial model so the user
   * sees financials calibrated to their actual consumption.
   */
  monthlyKwhOverride?: number | null
}

export function SolarFinancialsPanel({ systemKwp, pshAvg, monthlyKwhOverride }: SolarFinancialsPanelProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language?.startsWith('es') ? 'es-PA' : 'en-US'
  const [battery, setBattery] = useState(false)

  // Derive effective kWp: if a monthly kWh reading was scanned from a bill,
  // back-calculate the system size needed to cover that consumption.
  const effectiveKwp = useMemo(() => {
    if (!monthlyKwhOverride || monthlyKwhOverride <= 0) return systemKwp
    const psh = pshAvg ?? PANAMA_DEFAULTS.peakSunHours
    const pr = PANAMA_DEFAULTS.performanceRatio
    const selfPct = battery ? 0.85 : PANAMA_DEFAULTS.selfConsumptionRatio
    const annualKwh = monthlyKwhOverride * 12
    // Solve: annualKwh = kWp * psh * 365 * pr * selfPct
    const derived = annualKwh / (psh * 365 * pr * selfPct)
    // Clamp to [0.5, 500] kWp — sane residential/commercial range
    return Math.max(0.5, Math.min(500, derived))
  }, [monthlyKwhOverride, systemKwp, pshAvg, battery])

  const f = useMemo(
    () => calculateSolarFinancials({ systemSizeKwp: effectiveKwp, pshAvg, batteryKwh: battery ? 10 : 0 }),
    [effectiveKwp, pshAvg, battery]
  )
  const billOverrideActive = !!monthlyKwhOverride && monthlyKwhOverride > 0

  return (
    <div className="rounded-xl bg-zinc-900/60 p-4 space-y-2 text-sm">
      {/* Bill override indicator */}
      {billOverrideActive && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#00ffcc]/[0.07] border border-[#00ffcc]/20 mb-1">
          <span className="text-[10px] text-[#00ffcc]">
            {t('tools.scanner.financials.billSized')} <strong>{t('tools.scanner.financials.kwhPerMonth', { value: monthlyKwhOverride!.toLocaleString(locale) })}</strong>
          </span>
        </div>
      )}

      <div className="flex justify-between">
        <span className="text-zinc-400">{t('tools.scanner.financials.system')}</span>
        <b className={billOverrideActive ? 'text-[#00ffcc]' : undefined}>{f.system_size_kwp} kWp</b>
      </div>
      <div className="flex justify-between"><span>{t('tools.scanner.financials.annualSavings')}</span><b>${f.annual_savings_usd.toLocaleString()}</b></div>
      <div className="flex justify-between"><span>{t('tools.scanner.financials.payback')}</span><b>{t('tools.scanner.financials.years', { count: f.payback_discounted_years })}</b></div>
      <div className="flex justify-between"><span>{t('tools.scanner.financials.savings25yr')}</span><b>${f.savings_25yr_usd.toLocaleString()}</b></div>
      <div className="flex justify-between"><span>{t('tools.scanner.financials.co2Avoided')}</span><b>{t('tools.scanner.financials.tons25yr', { count: f.co2_tons_25yr })}</b></div>

      {/* ── 25-year model metrics ──────────────────────────────────────────── */}
      <div className="border-t border-zinc-700/50 pt-2 mt-1 space-y-2">
        <div className="flex justify-between">
          <span className="text-zinc-400">{t('tools.scanner.financials.npv')}</span>
          <b className={f.npv_usd >= 0 ? 'text-emerald-400' : 'text-red-400'}>
            ${f.npv_usd.toLocaleString()}
          </b>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-400">{t('tools.scanner.financials.irr')}</span>
          <b className={f.irr >= 0.08 ? 'text-emerald-400' : 'text-amber-400'}>
            {(f.irr * 100).toFixed(1)}%
          </b>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-400">{t('tools.scanner.financials.lcoe')}</span>
          <b>${f.lcoe_usd_per_kwh.toFixed(3)}/kWh</b>
        </div>
      </div>

      <label className="flex items-center gap-2 pt-2 text-xs">
        <input type="checkbox" checked={battery} onChange={(e) => setBattery(e.target.checked)} /> {t('tools.scanner.financials.withBattery')}
      </label>
    </div>
  )
}
