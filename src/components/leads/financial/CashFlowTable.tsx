import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);

interface CashFlowRow {
  year: number;
  production: number;
  savings: number;
  oAndM: number;
  netCashFlow: number;
  cumulative: number;
}

interface CashFlowTableProps {
  annualKwh: number;
  annualSavings: number;
  investment: number;
  systemKwp: number;
  paybackYears: number;
}

export function CashFlowTable({
  annualKwh,
  annualSavings,
  investment,
  systemKwp,
  paybackYears: _paybackYears,
}: CashFlowTableProps) {
  const [expanded, setExpanded] = useState(false);
  const degradation = 0.005;
  const electricityInflation = 0.03;
  const oAndMPerKwp = 15; // $/kWp/year

  const rows: CashFlowRow[] = [];
  let cumulative = -investment; // Start negative (investment)

  for (let y = 1; y <= 25; y++) {
    const production = Math.round(annualKwh * Math.pow(1 - degradation, y - 1));
    const savings = Math.round(annualSavings * Math.pow(1 - degradation, y - 1) * Math.pow(1 + electricityInflation, y - 1));
    const oAndM = Math.round(oAndMPerKwp * systemKwp * Math.pow(1.02, y - 1)); // 2% O&M inflation
    const netCashFlow = savings - oAndM;
    cumulative += netCashFlow;

    rows.push({ year: y, production, savings, oAndM, netCashFlow, cumulative: Math.round(cumulative) });
  }

  const visibleRows = expanded ? rows : rows.slice(0, 5);
  const paybackRowIdx = rows.findIndex((r) => r.cumulative >= 0);

  return (
    <GlassCard padding="md">
      <h3 className="text-xs font-semibold text-[#8888a0] uppercase tracking-wider mb-4">
        Cash Flow Table (25 Years)
      </h3>
      <div className="rounded-lg border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-white/[0.03]">
                <th className="text-left py-2.5 px-3 text-[#555570] font-medium">Year</th>
                <th className="text-right py-2.5 px-3 text-[#555570] font-medium">Production</th>
                <th className="text-right py-2.5 px-3 text-[#555570] font-medium">Savings</th>
                <th className="text-right py-2.5 px-3 text-[#555570] font-medium">O&M</th>
                <th className="text-right py-2.5 px-3 text-[#555570] font-medium">Net Cash Flow</th>
                <th className="text-right py-2.5 px-3 text-[#555570] font-medium">Cumulative</th>
              </tr>
            </thead>
            <tbody>
              {/* Investment row */}
              <tr className="border-t border-white/[0.04]">
                <td className="py-2 px-3 text-[#8888a0]">0</td>
                <td className="py-2 px-3 text-right text-[#555570]">-</td>
                <td className="py-2 px-3 text-right text-[#555570]">-</td>
                <td className="py-2 px-3 text-right text-[#555570]">-</td>
                <td className="py-2 px-3 text-right text-[#ef4444] font-medium">{fmtCurrency(-investment)}</td>
                <td className="py-2 px-3 text-right text-[#ef4444] font-medium">{fmtCurrency(-investment)}</td>
              </tr>
              {visibleRows.map((row, i) => {
                const isPaybackRow = i === paybackRowIdx;
                return (
                  <tr
                    key={row.year}
                    className={`border-t border-white/[0.04] ${
                      isPaybackRow ? 'bg-[#22c55e]/5' : ''
                    }`}
                  >
                    <td className={`py-2 px-3 ${isPaybackRow ? 'text-[#22c55e] font-semibold' : 'text-[#8888a0]'}`}>
                      {row.year}
                      {isPaybackRow && (
                        <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-[#22c55e]/10 text-[#22c55e]">
                          Payback
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right text-[#c0c0d0]">{fmt(row.production)} kWh</td>
                    <td className="py-2 px-3 text-right text-[#22c55e]">{fmtCurrency(row.savings)}</td>
                    <td className="py-2 px-3 text-right text-[#f59e0b]">{fmtCurrency(row.oAndM)}</td>
                    <td className="py-2 px-3 text-right text-[#f0f0f5] font-medium">{fmtCurrency(row.netCashFlow)}</td>
                    <td className={`py-2 px-3 text-right font-medium ${row.cumulative >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                      {fmtCurrency(row.cumulative)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-3 flex items-center gap-1.5 text-xs text-[#8888a0] hover:text-[#00ffcc] transition-colors mx-auto"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          Show all 25 years
        </button>
      )}
      {expanded && (
        <button
          onClick={() => setExpanded(false)}
          className="mt-3 flex items-center gap-1.5 text-xs text-[#8888a0] hover:text-[#00ffcc] transition-colors mx-auto"
        >
          <ChevronDown className="w-3.5 h-3.5 rotate-180" />
          Show less
        </button>
      )}
    </GlassCard>
  );
}
