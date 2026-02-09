import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell,
} from 'recharts';
import { GlassCard } from '@/components/ui/GlassCard';
import { CashFlowTable } from '@/components/leads/financial/CashFlowTable';
import { FinancingCalculator } from '@/components/leads/financial/FinancingCalculator';
import type { Lead } from '@/types/lead';

const fmt = (n: number, decimals = 0) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: decimals }).format(n);

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHLY_FRACTIONS = [0.092, 0.090, 0.098, 0.085, 0.075, 0.070, 0.072, 0.070, 0.068, 0.070, 0.075, 0.085];
const FRACTION_SUM = MONTHLY_FRACTIONS.reduce((s, f) => s + f, 0);

const TOOLTIP_STYLE = {
  backgroundColor: '#1a1a2e',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 10,
  color: '#f0f0f5',
  fontSize: 12,
};

interface LeadFinancialTabProps {
  lead: Lead;
}

export function LeadFinancialTab({ lead }: LeadFinancialTabProps) {
  const annualSavings = lead.estimatedAnnualSavings;
  const investment = lead.estimatedInvestment;
  const annualKwh = lead.estimatedAnnualKwh;
  const payback = lead.estimatedPaybackYears;

  // Monthly production data
  const monthlyData = MONTH_LABELS.map((month, i) => ({
    month,
    production: Math.round((annualKwh * MONTHLY_FRACTIONS[i]) / FRACTION_SUM),
  }));

  // 25-year cumulative savings
  const degradation = 0.005; // 0.5% annual panel degradation
  const electricityInflation = 0.03; // 3% annual increase
  const savingsData: Array<{ year: number; savings: number; cumulative: number; noSolar: number }> = [];
  let cumulative = 0;
  let cumulativeNoSolar = 0;
  for (let y = 1; y <= 25; y++) {
    const yearSavings = annualSavings * Math.pow(1 - degradation, y - 1) * Math.pow(1 + electricityInflation, y - 1);
    const yearCost = annualSavings * Math.pow(1 + electricityInflation, y - 1);
    cumulative += yearSavings;
    cumulativeNoSolar += yearCost;
    savingsData.push({
      year: y,
      savings: Math.round(cumulative - investment),
      cumulative: Math.round(cumulative),
      noSolar: Math.round(cumulativeNoSolar),
    });
  }

  // Cost breakdown
  const panelCost = investment * 0.40;
  const inverterCost = investment * 0.15;
  const bosCost = investment * 0.25;
  const laborCost = investment * 0.15;
  const overhead = investment * 0.05;
  const costBreakdown = [
    { name: 'Panels', value: Math.round(panelCost), color: '#00ffcc' },
    { name: 'Inverter', value: Math.round(inverterCost), color: '#8b5cf6' },
    { name: 'BOS', value: Math.round(bosCost), color: '#0ea5e9' },
    { name: 'Labor', value: Math.round(laborCost), color: '#f59e0b' },
    { name: 'Overhead', value: Math.round(overhead), color: '#22c55e' },
  ];

  // ROI metrics
  const roi = investment > 0 ? ((cumulative - investment) / investment * 100) : 0;
  const npv = cumulative * 0.85 - investment; // simplified NPV with ~8% discount rate
  const lcoe = annualKwh > 0 ? (investment / (annualKwh * 25 * 0.88)) : 0; // simplified LCOE

  return (
    <div className="space-y-5">
      {/* ROI Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'ROI (25yr)', value: `${fmt(roi)}%`, color: '#00ffcc' },
          { label: 'Payback', value: `${payback} yrs`, color: '#0ea5e9' },
          { label: 'NPV', value: fmtCurrency(npv), color: '#22c55e' },
          { label: 'LCOE', value: `$${lcoe.toFixed(3)}/kWh`, color: '#f59e0b' },
          { label: 'Total Savings', value: fmtCurrency(cumulative), color: '#8b5cf6' },
        ].map((m) => (
          <GlassCard key={m.label} padding="md">
            <div className="text-[11px] text-[#555570] uppercase tracking-wider mb-1">{m.label}</div>
            <div className="text-xl font-bold" style={{ color: m.color }}>{m.value}</div>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 25-Year Savings Projection */}
        <GlassCard padding="md">
          <h3 className="text-xs font-semibold text-[#8888a0] uppercase tracking-wider mb-4">
            25-Year Net Savings Projection
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={savingsData}>
                <defs>
                  <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00ffcc" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#00ffcc" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="year"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#555566', fontSize: 10 }}
                  tickFormatter={(v) => `Y${v}`}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#555566', fontSize: 10 }}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value: number) => [fmtCurrency(value), 'Net Savings']}
                  labelFormatter={(label) => `Year ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="savings"
                  stroke="#00ffcc"
                  strokeWidth={2}
                  fill="url(#savingsGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Monthly Production Chart */}
        <GlassCard padding="md">
          <h3 className="text-xs font-semibold text-[#8888a0] uppercase tracking-wider mb-4">
            Monthly Production
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} barCategoryGap="15%">
                <defs>
                  <linearGradient id="finBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00ffcc" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#00ffcc" stopOpacity={0.15} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#555566', fontSize: 10 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#555566', fontSize: 10 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value: number) => [fmt(value) + ' kWh', 'Production']}
                />
                <Bar dataKey="production" fill="url(#finBarGrad)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Cost Breakdown Pie */}
        <GlassCard padding="md">
          <h3 className="text-xs font-semibold text-[#8888a0] uppercase tracking-wider mb-4">
            Investment Breakdown
          </h3>
          <div className="flex items-center gap-6">
            <div className="w-40 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={65}
                    dataKey="value"
                    stroke="none"
                  >
                    {costBreakdown.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(value: number) => [fmtCurrency(value)]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {costBreakdown.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-[#8888a0] w-16">{item.name}</span>
                  <span className="text-xs text-[#f0f0f5] font-medium">{fmtCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* With Solar vs Without Solar */}
        <GlassCard padding="md">
          <h3 className="text-xs font-semibold text-[#8888a0] uppercase tracking-wider mb-4">
            With Solar vs Without Solar (25 Years)
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-xl bg-[#22c55e]/5 border border-[#22c55e]/10">
                <div className="text-[11px] text-[#555570] mb-1">With Solar</div>
                <div className="text-lg font-bold text-[#22c55e]">
                  {fmtCurrency(investment)}
                </div>
                <div className="text-[10px] text-[#555570] mt-1">
                  One-time investment, {fmtCurrency(cumulative)} savings
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#ef4444]/5 border border-[#ef4444]/10">
                <div className="text-[11px] text-[#555570] mb-1">Without Solar</div>
                <div className="text-lg font-bold text-[#ef4444]">
                  {fmtCurrency(cumulativeNoSolar)}
                </div>
                <div className="text-[10px] text-[#555570] mt-1">
                  Cumulative electricity cost at 3%/yr inflation
                </div>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#00ffcc]/5 border border-[#00ffcc]/10 text-center">
              <div className="text-[11px] text-[#555570] mb-1">Net Benefit</div>
              <div className="text-2xl font-bold text-[#00ffcc]">
                {fmtCurrency(cumulative - investment)}
              </div>
              <div className="text-[10px] text-[#555570]">
                over 25 years after investment payback
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Cash Flow Table */}
      <CashFlowTable
        annualKwh={annualKwh}
        annualSavings={annualSavings}
        investment={investment}
        systemKwp={lead.estimatedSystemKwp}
        paybackYears={payback}
      />

      {/* Financing Calculator */}
      <FinancingCalculator
        investment={investment}
        annualSavings={annualSavings}
        paybackYears={payback}
      />
    </div>
  );
}
