import { useMemo, useState } from 'react'
import { calculateSolarFinancials } from '@/services/solarFinancials'

export function SolarFinancialsPanel({ systemKwp, pshAvg }: { systemKwp: number; pshAvg?: number }) {
  const [battery, setBattery] = useState(false)
  const f = useMemo(() => calculateSolarFinancials({ systemSizeKwp: systemKwp, pshAvg, batteryKwh: battery ? 10 : 0 }), [systemKwp, pshAvg, battery])
  return (
    <div className="rounded-xl bg-zinc-900/60 p-4 space-y-2 text-sm">
      <div className="flex justify-between"><span>Sistema</span><b>{f.system_size_kwp} kWp</b></div>
      <div className="flex justify-between"><span>Ahorro anual</span><b>${f.annual_savings_usd.toLocaleString()}</b></div>
      <div className="flex justify-between"><span>Recuperación</span><b>{f.payback_discounted_years} años</b></div>
      <div className="flex justify-between"><span>Ahorro 25 años</span><b>${f.savings_25yr_usd.toLocaleString()}</b></div>
      <div className="flex justify-between"><span>CO₂ evitado</span><b>{f.co2_tons_25yr} t (25 a)</b></div>
      <label className="flex items-center gap-2 pt-2 text-xs">
        <input type="checkbox" checked={battery} onChange={(e) => setBattery(e.target.checked)} /> Con batería (85% autoconsumo)
      </label>
    </div>
  )
}
