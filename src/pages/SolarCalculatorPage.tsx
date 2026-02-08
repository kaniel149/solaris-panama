import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Calculator,
  Sun,
  DollarSign,
  Leaf,
  TrendingUp,
  Zap,
  Building2,
  Sliders,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { PageHeader } from '@/components/ui/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import {
  calculateFinancials,
  PANAMA_DEFAULTS,
} from '@/services/solarCalculator';
import type { CalculatorInputs, CalculatorResults } from '@/services/solarCalculator';

const cn = (...classes: (string | boolean | undefined | null)[]) =>
  classes.filter(Boolean).join(' ');

// ===== Animation Variants =====

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// ===== Constants =====

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const BUSINESS_TYPES = ['Supermarket', 'Hotel', 'Warehouse', 'Office', 'Factory', 'Other'] as const;

const CITIES = ['Panama City', 'Colon', 'David', 'Santiago', 'Chitre'] as const;

const CITY_SUN_HOURS: Record<string, number> = {
  'Panama City': 4.5,
  'Colon': 4.2,
  'David': 4.8,
  'Santiago': 4.6,
  'Chitre': 4.7,
};

// ===== Formatters =====

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return '$' + (value / 1_000_000).toFixed(2) + 'M';
  }
  return '$' + Math.round(value).toLocaleString('en-US');
}

function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ===== Glass-styled Chart Tooltips =====

interface CashFlowTooltipPayload {
  year: number;
  annual: number;
  cumulative: number;
}

function CashFlowTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: CashFlowTooltipPayload }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl bg-[#1a1a2e]/95 backdrop-blur-md border border-white/[0.1] px-4 py-3 shadow-2xl">
      <p className="text-xs font-semibold text-[#00ffcc] mb-1.5">Year {d.year}</p>
      <p className="text-xs text-[#f0f0f5]">
        Annual Savings: <span className="font-medium">{formatCurrency(d.annual)}</span>
      </p>
      <p className="text-xs text-[#f0f0f5] mt-0.5">
        Cumulative:{' '}
        <span className={cn('font-medium', d.cumulative >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]')}>
          {formatCurrency(d.cumulative)}
        </span>
      </p>
    </div>
  );
}

interface ProductionTooltipPayload {
  month: string;
  kwh: number;
}

function ProductionTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: ProductionTooltipPayload }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl bg-[#1a1a2e]/95 backdrop-blur-md border border-white/[0.1] px-4 py-3 shadow-2xl">
      <p className="text-xs font-semibold text-[#00ffcc] mb-1">{d.month}</p>
      <p className="text-xs text-[#f0f0f5]">
        Production: <span className="font-medium">{formatNumber(d.kwh)} kWh</span>
      </p>
    </div>
  );
}

// ===== Slider Input =====

interface SliderInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  prefix?: string;
  tooltip?: string;
  onChange: (v: number) => void;
}

function SliderInput({ label, value, min, max, step, unit, prefix, tooltip, onChange }: SliderInputProps) {
  const pct = ((value - min) / (max - min)) * 100;
  const decimals = step < 1 ? (step < 0.01 ? 3 : 2) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-medium text-[#8888a0]">{label}</label>
          {tooltip && (
            <div className="group relative">
              <Info className="w-3 h-3 text-[#555566] cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 rounded-lg bg-[#1a1a2e] border border-white/10 text-[10px] text-[#8888a0] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl">
                {tooltip}
              </div>
            </div>
          )}
        </div>
        <span className="text-sm font-semibold text-[#f0f0f5] tabular-nums">
          {prefix}{formatNumber(value, decimals)}{unit}
        </span>
      </div>
      <div className="relative h-6 flex items-center">
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#00ffcc] to-[#0ea5e9]"
            style={{ width: `${pct}%` }}
            layout
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <motion.div
          className="absolute w-4 h-4 rounded-full bg-[#00ffcc] shadow-[0_0_12px_rgba(0,255,204,0.4)] border-2 border-[#0a0a0f] pointer-events-none"
          style={{ left: `calc(${pct}% - 8px)` }}
          layout
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      </div>
    </div>
  );
}

// ===== Select Input =====

interface SelectInputProps {
  label: string;
  value: string;
  options: readonly string[];
  icon?: React.ReactNode;
  onChange: (v: string) => void;
}

function SelectInput({ label, value, options, icon, onChange }: SelectInputProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-[#8888a0]">{label}</label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555566] pointer-events-none">
            {icon}
          </div>
        )}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'w-full appearance-none rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-[#f0f0f5] py-2.5 pr-10 outline-none transition-all',
            'focus:border-[#00ffcc]/30 focus:ring-1 focus:ring-[#00ffcc]/20',
            'hover:border-white/[0.12]',
            icon ? 'pl-10' : 'pl-3',
          )}
        >
          {options.map((opt) => (
            <option key={opt} value={opt} className="bg-[#12121a] text-[#f0f0f5]">
              {opt}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555566] pointer-events-none" />
      </div>
    </div>
  );
}

// ===== Collapsible Section =====

interface CollapsibleProps {
  title: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function Collapsible({ title, icon, open, onToggle, children }: CollapsibleProps) {
  return (
    <div className="border-t border-white/[0.06] pt-4">
      <button onClick={onToggle} className="flex items-center justify-between w-full group">
        <div className="flex items-center gap-2">
          <span className="text-[#8888a0] group-hover:text-[#00ffcc] transition-colors">{icon}</span>
          <span className="text-sm font-medium text-[#8888a0] group-hover:text-[#f0f0f5] transition-colors">
            {title}
          </span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-[#555566]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#555566]" />
        )}
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-4 space-y-4"
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}

// ===== Hero Metric Card =====

interface HeroMetricProps {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  color: string;
  glowColor: string;
  index: number;
}

function HeroMetric({ label, value, sub, icon, color, glowColor, index }: HeroMetricProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.08 + index * 0.08, duration: 0.5, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-xl bg-[#12121a]/80 backdrop-blur-xl border border-white/[0.06] p-5 hover:border-white/[0.1] transition-all duration-300 group"
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `radial-gradient(circle at 50% 120%, ${glowColor}, transparent 70%)` }}
      />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-medium text-[#8888a0] uppercase tracking-wider">{label}</span>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}15` }}
          >
            <span style={{ color }}>{icon}</span>
          </div>
        </div>
        <p className="text-2xl font-bold text-[#f0f0f5] tabular-nums">{value}</p>
        <p className="text-xs text-[#555566] mt-0.5">{sub}</p>
      </div>
    </motion.div>
  );
}

// ===== Net Metering Segment =====

interface MeterSegmentProps {
  label: string;
  value: number;
  total: number;
  color: string;
}

function MeterSegment({ label, value, total, color }: MeterSegmentProps) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#8888a0]">{label}</span>
        <span className="text-[#f0f0f5] font-medium tabular-nums">{formatNumber(value)} kWh</span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <div className="text-right text-[10px] text-[#555566] tabular-nums">{pct.toFixed(1)}%</div>
    </div>
  );
}

// ===== MAIN PAGE COMPONENT =====

export default function SolarCalculatorPage() {
  // --- Basic form state ---
  const [monthlyBill, setMonthlyBill] = useState(3000);
  const [businessType, setBusinessType] = useState<string>('Supermarket');
  const [city, setCity] = useState<string>('Panama City');

  // --- Advanced settings (collapsed by default) ---
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [systemSizeOverride, setSystemSizeOverride] = useState(0);
  const [costPerWp, setCostPerWp] = useState(PANAMA_DEFAULTS.costPerWp);
  const [electricityRate, setElectricityRate] = useState(PANAMA_DEFAULTS.electricityRate);
  const [rateEscalation, setRateEscalation] = useState(PANAMA_DEFAULTS.rateEscalation * 100);
  const [selfConsumption, setSelfConsumption] = useState(PANAMA_DEFAULTS.selfConsumptionRatio * 100);
  const [discountRate, setDiscountRate] = useState(PANAMA_DEFAULTS.discountRate * 100);

  // --- Financing (collapsed by default) ---
  const [showFinancing, setShowFinancing] = useState(false);
  const [financingType, setFinancingType] = useState<'cash' | 'loan'>('cash');
  const [loanAmountPct, setLoanAmountPct] = useState(80);
  const [loanInterestRate, setLoanInterestRate] = useState(7);
  const [loanTermYears, setLoanTermYears] = useState(7);

  // --- Build calculator inputs ---
  const inputs: CalculatorInputs = useMemo(
    () => ({
      monthlyBill,
      electricityRate,
      rateEscalation: rateEscalation / 100,
      systemSizeKwp: systemSizeOverride > 0 ? systemSizeOverride : undefined,
      costPerWp,
      peakSunHours: CITY_SUN_HOURS[city] ?? 4.5,
      discountRate: discountRate / 100,
      selfConsumptionRatio: selfConsumption / 100,
      financingType,
      loanAmountPct: loanAmountPct / 100,
      loanInterestRate: loanInterestRate / 100,
      loanTermYears,
    }),
    [
      monthlyBill, electricityRate, rateEscalation, systemSizeOverride, costPerWp,
      city, discountRate, selfConsumption, financingType, loanAmountPct, loanInterestRate, loanTermYears,
    ],
  );

  // --- Calculate results (instant recalculation) ---
  const results: CalculatorResults = useMemo(() => calculateFinancials(inputs), [inputs]);

  // --- Chart data ---
  const cashFlowData = useMemo(
    () =>
      results.cumulativeCashFlow.map((cumulative, i) => ({
        year: i + 1,
        annual: results.annualCashFlow[i],
        cumulative,
      })),
    [results.cumulativeCashFlow, results.annualCashFlow],
  );

  const monthlyProductionData = useMemo(
    () =>
      results.monthlyProductionKwh.map((kwh, i) => ({
        month: MONTH_LABELS[i],
        kwh: Math.round(kwh),
      })),
    [results.monthlyProductionKwh],
  );

  const totalProduction = results.year1ProductionKwh;

  return (
    <motion.div
      className="p-6 lg:p-8 max-w-[1600px] mx-auto"
      variants={stagger}
      initial="initial"
      animate="animate"
    >
      {/* ===== Page Header ===== */}
      <motion.div variants={fadeUp}>
        <PageHeader
          title="Solar Financial Calculator"
          description="Simulate ROI, payback, and savings for commercial rooftop solar in Panama"
          gradient
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20">
                <Leaf className="w-3.5 h-3.5 text-[#22c55e]" />
                <span className="text-xs font-medium text-[#22c55e]">Ley 417 Tax Benefits</span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0ea5e9]/10 border border-[#0ea5e9]/20">
                <span className="text-xs text-[#0ea5e9]">0% Import Duty</span>
                <span className="text-[#555566] text-xs">+</span>
                <span className="text-xs text-[#0ea5e9]">0% VAT</span>
              </div>
            </div>
          }
        />
      </motion.div>

      {/* ===== Split Layout: Left 40% / Right 60% ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ===== LEFT PANEL - INPUT FORM (40%) ===== */}
        <motion.div variants={fadeUp} className="lg:col-span-2 space-y-5">
          {/* Section 1: Basic Info */}
          <GlassCard
            variant="elevated"
            header={
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[#00ffcc]" />
                <h2 className="text-sm font-semibold text-[#f0f0f5]">System Parameters</h2>
              </div>
            }
          >
            <div className="space-y-5">
              <SliderInput
                label="Monthly Electricity Bill"
                value={monthlyBill}
                min={500}
                max={20000}
                step={100}
                prefix="$"
                tooltip="Average monthly commercial electricity bill"
                onChange={setMonthlyBill}
              />

              <SelectInput
                label="Business Type"
                value={businessType}
                options={BUSINESS_TYPES}
                icon={<Building2 className="w-4 h-4" />}
                onChange={setBusinessType}
              />

              <SelectInput
                label="City"
                value={city}
                options={CITIES}
                icon={<Sun className="w-4 h-4" />}
                onChange={setCity}
              />

              {/* Estimated consumption info bar */}
              <div className="flex items-center gap-2.5 p-3 rounded-lg bg-[#00ffcc]/[0.04] border border-[#00ffcc]/10">
                <Info className="w-4 h-4 text-[#00ffcc] shrink-0" />
                <p className="text-xs text-[#8888a0]">
                  Estimated consumption:{' '}
                  <span className="text-[#f0f0f5] font-medium">
                    {formatNumber(Math.round(monthlyBill / electricityRate))} kWh/month
                  </span>
                  {' '}at {CITY_SUN_HOURS[city] ?? 4.5} peak sun hours/day
                </p>
              </div>

              {/* Advanced Settings (collapsible) */}
              <Collapsible
                title="Advanced Settings"
                icon={<Sliders className="w-4 h-4" />}
                open={showAdvanced}
                onToggle={() => setShowAdvanced((v) => !v)}
              >
                <SliderInput
                  label="System Size Override"
                  value={systemSizeOverride}
                  min={0}
                  max={500}
                  step={5}
                  unit=" kWp"
                  tooltip="Leave at 0 for auto-sizing from bill"
                  onChange={setSystemSizeOverride}
                />
                <p className="text-[10px] text-[#555566] -mt-2">0 = auto-size from electricity bill</p>

                <SliderInput
                  label="Cost per Wp"
                  value={costPerWp}
                  min={0.70}
                  max={1.30}
                  step={0.01}
                  prefix="$"
                  tooltip="Installed cost per watt-peak including labor"
                  onChange={setCostPerWp}
                />

                <SliderInput
                  label="Electricity Rate"
                  value={electricityRate}
                  min={0.10}
                  max={0.35}
                  step={0.005}
                  prefix="$"
                  unit="/kWh"
                  tooltip="Commercial electricity rate"
                  onChange={setElectricityRate}
                />

                <SliderInput
                  label="Rate Escalation"
                  value={rateEscalation}
                  min={0}
                  max={8}
                  step={0.5}
                  unit="%"
                  tooltip="Annual electricity rate increase"
                  onChange={setRateEscalation}
                />

                <SliderInput
                  label="Self-Consumption Ratio"
                  value={selfConsumption}
                  min={30}
                  max={100}
                  step={1}
                  unit="%"
                  tooltip="Percentage of production consumed on-site"
                  onChange={setSelfConsumption}
                />

                <SliderInput
                  label="Discount Rate"
                  value={discountRate}
                  min={3}
                  max={15}
                  step={0.5}
                  unit="%"
                  tooltip="For NPV / LCOE calculation"
                  onChange={setDiscountRate}
                />
              </Collapsible>

              {/* Financing Options (collapsible) */}
              <Collapsible
                title="Financing Options"
                icon={<DollarSign className="w-4 h-4" />}
                open={showFinancing}
                onToggle={() => setShowFinancing((v) => !v)}
              >
                {/* Cash / Loan toggle */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setFinancingType('cash')}
                    className={cn(
                      'flex-1 py-2.5 rounded-lg text-sm font-medium transition-all border',
                      financingType === 'cash'
                        ? 'bg-[#00ffcc]/10 text-[#00ffcc] border-[#00ffcc]/30'
                        : 'bg-white/[0.02] text-[#8888a0] border-white/[0.06] hover:border-white/[0.12]',
                    )}
                  >
                    Cash
                  </button>
                  <button
                    onClick={() => setFinancingType('loan')}
                    className={cn(
                      'flex-1 py-2.5 rounded-lg text-sm font-medium transition-all border',
                      financingType === 'loan'
                        ? 'bg-[#8b5cf6]/10 text-[#8b5cf6] border-[#8b5cf6]/30'
                        : 'bg-white/[0.02] text-[#8888a0] border-white/[0.06] hover:border-white/[0.12]',
                    )}
                  >
                    Loan
                  </button>
                </div>

                {financingType === 'loan' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <SliderInput
                      label="Loan Amount"
                      value={loanAmountPct}
                      min={10}
                      max={100}
                      step={5}
                      unit="%"
                      tooltip="Percentage of system cost financed"
                      onChange={setLoanAmountPct}
                    />
                    <SliderInput
                      label="Interest Rate"
                      value={loanInterestRate}
                      min={3}
                      max={15}
                      step={0.25}
                      unit="%"
                      onChange={setLoanInterestRate}
                    />
                    <SliderInput
                      label="Term"
                      value={loanTermYears}
                      min={3}
                      max={20}
                      step={1}
                      unit=" years"
                      onChange={setLoanTermYears}
                    />

                    {/* Loan summary */}
                    {results.monthlyLoanPayment !== undefined && (
                      <div className="p-3 rounded-lg bg-[#8b5cf6]/[0.06] border border-[#8b5cf6]/15 space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-[#8888a0]">Monthly Payment</span>
                          <span className="text-[#f0f0f5] font-medium tabular-nums">
                            {formatCurrency(results.monthlyLoanPayment)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-[#8888a0]">Total Interest</span>
                          <span className="text-[#f0f0f5] font-medium tabular-nums">
                            {formatCurrency(results.totalInterestPaid ?? 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-[#8888a0]">Net Savings (Year 1)</span>
                          <span
                            className={cn(
                              'font-medium tabular-nums',
                              (results.netSavingsAfterLoan ?? 0) >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]',
                            )}
                          >
                            {formatCurrency(results.netSavingsAfterLoan ?? 0)}/yr
                          </span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </Collapsible>
            </div>
          </GlassCard>

          {/* System Summary Card */}
          <GlassCard>
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00ffcc]/[0.06] border border-[#00ffcc]/15">
                <Zap className="w-3 h-3 text-[#00ffcc]" />
                <span className="text-xs font-medium text-[#00ffcc]">Total Investment</span>
              </div>
              <p className="text-3xl font-bold text-[#f0f0f5] tabular-nums">
                {formatCurrency(results.totalSystemCost)}
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-[10px] text-[#555566] uppercase tracking-wider mb-0.5">Panels</p>
                  <p className="text-sm font-semibold text-[#f0f0f5] tabular-nums">{results.panelCount}</p>
                  <p className="text-[10px] text-[#555566]">580W LONGi</p>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-[10px] text-[#555566] uppercase tracking-wider mb-0.5">Roof Area</p>
                  <p className="text-sm font-semibold text-[#f0f0f5] tabular-nums">
                    {formatNumber(results.requiredRoofAreaM2)} m&sup2;
                  </p>
                  <p className="text-[10px] text-[#555566]">incl. spacing</p>
                </div>
              </div>

              {/* Ley 417 Notice */}
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#22c55e]/[0.04] border border-[#22c55e]/10 text-left">
                <Sun className="w-4 h-4 text-[#22c55e] mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] font-medium text-[#22c55e] mb-0.5">Ley 417 Savings Applied</p>
                  <p className="text-[10px] text-[#8888a0] leading-relaxed">
                    0% import duty and 0% VAT on solar equipment already reflected in system cost.
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* ===== RIGHT PANEL - RESULTS DASHBOARD (60%) ===== */}
        <motion.div variants={fadeUp} className="lg:col-span-3 space-y-6">
          {/* Hero Metrics Row - 4 cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <HeroMetric
              label="System Size"
              value={`${formatNumber(results.systemSizeKwp, 1)} kWp`}
              sub={`${results.panelCount} panels`}
              icon={<Sun className="w-4 h-4" />}
              color="#00ffcc"
              glowColor="rgba(0, 255, 204, 0.08)"
              index={0}
            />
            <HeroMetric
              label="Annual Savings"
              value={formatCurrency(results.year1Savings)}
              sub={`${formatCurrency(results.monthlySavings)}/month`}
              icon={<DollarSign className="w-4 h-4" />}
              color="#22c55e"
              glowColor="rgba(34, 197, 94, 0.08)"
              index={1}
            />
            <HeroMetric
              label="Payback Period"
              value={`${results.simplePaybackYears.toFixed(1)} yrs`}
              sub={`${results.roi25Year.toFixed(0)}% ROI (25yr)`}
              icon={<TrendingUp className="w-4 h-4" />}
              color="#8b5cf6"
              glowColor="rgba(139, 92, 246, 0.08)"
              index={2}
            />
            <HeroMetric
              label="NPV (25yr)"
              value={formatCurrency(results.npv25Year)}
              sub={`${(results.irr * 100).toFixed(1)}% IRR`}
              icon={<Calculator className="w-4 h-4" />}
              color="#0ea5e9"
              glowColor="rgba(14, 165, 233, 0.08)"
              index={3}
            />
          </div>

          {/* 25-Year Cumulative Cash Flow Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            <GlassCard
              variant="elevated"
              header={
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#00ffcc]" />
                    <h3 className="text-sm font-semibold text-[#f0f0f5]">25-Year Cumulative Cash Flow</h3>
                  </div>
                  <span className="text-xs text-[#555566]">
                    Breakeven at Year {Math.ceil(results.simplePaybackYears)}
                  </span>
                </div>
              }
            >
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cashFlowData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="cfGradientPos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis
                      dataKey="year"
                      tick={{ fill: '#555566', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      interval={4}
                      tickFormatter={(v: number) => `Yr ${v}`}
                    />
                    <YAxis
                      tick={{ fill: '#555566', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => {
                        if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
                        if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
                        return `$${v}`;
                      }}
                    />
                    <Tooltip content={<CashFlowTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="cumulative"
                      stroke="#22c55e"
                      strokeWidth={2}
                      fill="url(#cfGradientPos)"
                      dot={false}
                      activeDot={{
                        r: 5,
                        fill: '#22c55e',
                        stroke: '#0a0a0f',
                        strokeWidth: 2,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </motion.div>

          {/* Monthly Production + Environmental Impact */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Monthly Production Bar Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.5 }}
            >
              <GlassCard
                header={
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[#00ffcc]" />
                      <h3 className="text-sm font-semibold text-[#f0f0f5]">Monthly Production</h3>
                    </div>
                    <span className="text-xs text-[#555566] tabular-nums">
                      {formatNumber(results.year1ProductionKwh)} kWh/yr
                    </span>
                  </div>
                }
              >
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyProductionData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="barCyanGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#00ffcc" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.5} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis
                        dataKey="month"
                        tick={{ fill: '#555566', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: '#555566', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip content={<ProductionTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                      <Bar
                        dataKey="kwh"
                        fill="url(#barCyanGradient)"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={36}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[10px] text-[#555566] mt-2">
                  Dry season (Dic-Abr) = peak production months
                </p>
              </GlassCard>
            </motion.div>

            {/* Environmental Impact */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.5 }}
            >
              <GlassCard
                header={
                  <div className="flex items-center gap-2">
                    <Leaf className="w-4 h-4 text-[#22c55e]" />
                    <h3 className="text-sm font-semibold text-[#f0f0f5]">Environmental Impact</h3>
                  </div>
                }
              >
                <div className="grid grid-cols-3 gap-3">
                  {/* CO2 Offset */}
                  <div className="text-center p-4 rounded-xl bg-[#22c55e]/[0.04] border border-[#22c55e]/10">
                    <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[#22c55e]/10 flex items-center justify-center">
                      <Leaf className="w-5 h-5 text-[#22c55e]" />
                    </div>
                    <p className="text-lg font-bold text-[#f0f0f5] tabular-nums">
                      {formatNumber(results.annualCO2OffsetTons, 1)}
                    </p>
                    <p className="text-[10px] text-[#555566] mt-0.5">tCO2/year</p>
                  </div>
                  {/* Trees Equivalent */}
                  <div className="text-center p-4 rounded-xl bg-[#22c55e]/[0.04] border border-[#22c55e]/10">
                    <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[#22c55e]/10 flex items-center justify-center text-lg">
                      <span>&#x1F333;</span>
                    </div>
                    <p className="text-lg font-bold text-[#f0f0f5] tabular-nums">
                      {formatNumber(results.equivalentTreesPlanted)}
                    </p>
                    <p className="text-[10px] text-[#555566] mt-0.5">trees (25yr)</p>
                  </div>
                  {/* Cars Removed */}
                  <div className="text-center p-4 rounded-xl bg-[#22c55e]/[0.04] border border-[#22c55e]/10">
                    <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[#22c55e]/10 flex items-center justify-center text-lg">
                      <span>&#x1F697;</span>
                    </div>
                    <p className="text-lg font-bold text-[#f0f0f5] tabular-nums">
                      {formatNumber(results.equivalentCarsRemoved, 1)}
                    </p>
                    <p className="text-[10px] text-[#555566] mt-0.5">cars/year</p>
                  </div>
                </div>

                {/* Lifetime totals */}
                <div className="mt-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#8888a0]">Lifetime CO2 Offset (25yr)</span>
                    <span className="text-[#22c55e] font-semibold tabular-nums">
                      {formatNumber(results.lifetimeCO2OffsetTons)} tons
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#8888a0]">Lifetime Savings</span>
                    <span className="text-[#22c55e] font-semibold tabular-nums">
                      {formatCurrency(results.lifetimeSavings25Year)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#8888a0]">LCOE</span>
                    <span className="text-[#f0f0f5] font-medium tabular-nums">
                      ${results.lcoe.toFixed(3)}/kWh
                    </span>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </div>

          {/* Net Metering Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <GlassCard
              header={
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#8b5cf6]" />
                    <h3 className="text-sm font-semibold text-[#f0f0f5]">Net Metering Breakdown</h3>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20">
                    25% credit cap
                  </span>
                </div>
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <MeterSegment
                  label="Self-Consumed"
                  value={results.selfConsumedKwh}
                  total={totalProduction}
                  color="#00ffcc"
                />
                <MeterSegment
                  label="Exported to Grid"
                  value={results.exportedKwh}
                  total={totalProduction}
                  color="#8b5cf6"
                />
                <MeterSegment
                  label="Credited (25% of exported)"
                  value={results.creditedKwh}
                  total={totalProduction}
                  color="#0ea5e9"
                />
                <MeterSegment
                  label="Lost (uncredited export)"
                  value={results.lostKwh}
                  total={totalProduction}
                  color="#ef4444"
                />
              </div>

              {/* Visual stacked distribution bar */}
              <div className="mt-5 pt-4 border-t border-white/[0.04]">
                <div className="text-xs text-[#8888a0] mb-2">Energy Distribution</div>
                <div className="h-5 rounded-full overflow-hidden flex bg-white/[0.02]">
                  {totalProduction > 0 && (
                    <>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(results.selfConsumedKwh / totalProduction) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                        className="bg-[#00ffcc] h-full"
                      />
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(results.creditedKwh / totalProduction) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
                        className="bg-[#0ea5e9] h-full"
                      />
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(results.lostKwh / totalProduction) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.6, ease: 'easeOut' }}
                        className="bg-[#ef4444]/60 h-full"
                      />
                    </>
                  )}
                </div>
                <div className="flex items-center gap-5 mt-2.5 text-[10px] text-[#555566]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#00ffcc]" />
                    Self-consumed
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#0ea5e9]" />
                    Credited
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]/60" />
                    Lost
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
