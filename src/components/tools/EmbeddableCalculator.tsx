import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Building2, Zap, DollarSign, Leaf, ArrowRight } from 'lucide-react';
import { quickEstimate } from '@/services/solarCalculator';

const cn = (...classes: (string | boolean | undefined | null)[]) =>
  classes.filter(Boolean).join(' ');

// ===== CONSTANTS =====

const BUSINESS_TYPES = [
  { key: 'Supermarket', icon: '🛒', label: 'Supermarket' },
  { key: 'Hotel', icon: '🏨', label: 'Hotel' },
  { key: 'Warehouse', icon: '🏭', label: 'Warehouse' },
  { key: 'Office', icon: '🏢', label: 'Office' },
  { key: 'Factory', icon: '⚙️', label: 'Factory' },
  { key: 'Other', icon: '🏗️', label: 'Other' },
] as const;

const CITIES = [
  'Panama City',
  'Colon',
  'David',
  'Santiago',
  'Chitre',
] as const;

// ===== ANIMATION VARIANTS =====

const resultCardVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.07, duration: 0.35, ease: 'easeOut' },
  }),
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

// ===== COMPONENT =====

export function EmbeddableCalculator() {
  const [monthlyBill, setMonthlyBill] = useState(3000);
  const [businessType, setBusinessType] = useState('Office');
  const [city, setCity] = useState('Panama City');

  const result = useMemo(
    () => quickEstimate(monthlyBill, businessType, city),
    [monthlyBill, businessType, city]
  );

  const resultKey = `${monthlyBill}-${businessType}-${city}`;

  const resultCards = [
    {
      icon: <Zap className="w-3.5 h-3.5 text-amber-400" />,
      label: 'System Size',
      value: `${result.systemSizeKwp.toFixed(0)}`,
      unit: 'kWp',
      sub: `${result.panelCount} panels`,
      color: 'text-[#f0f0f5]',
    },
    {
      icon: <DollarSign className="w-3.5 h-3.5 text-emerald-400" />,
      label: 'Monthly Savings',
      value: `$${Math.round(result.monthlySavingsUsd).toLocaleString()}`,
      unit: '',
      sub: `$${Math.round(result.annualSavingsUsd).toLocaleString()}/year`,
      color: 'text-emerald-400',
    },
    {
      icon: <Sun className="w-3.5 h-3.5 text-[#00ffcc]" />,
      label: 'Payback Period',
      value: result.paybackYears.toFixed(1),
      unit: 'years',
      sub: 'Simple payback',
      color: 'text-[#00ffcc]',
    },
    {
      icon: <Building2 className="w-3.5 h-3.5 text-violet-400" />,
      label: 'Total Investment',
      value: `$${Math.round(result.totalInvestment).toLocaleString()}`,
      unit: '',
      sub: 'Turnkey installed',
      color: 'text-[#f0f0f5]',
    },
    {
      icon: <Leaf className="w-3.5 h-3.5 text-emerald-400" />,
      label: 'CO2 Offset',
      value: result.co2OffsetTons.toFixed(1),
      unit: 'tons/yr',
      sub: 'Carbon reduction',
      color: 'text-emerald-400',
    },
  ];

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl',
        'bg-[#12121a]/95 backdrop-blur-xl',
        'border border-white/[0.06]',
        'p-6 sm:p-8 w-full max-w-[420px] mx-auto',
        'shadow-2xl shadow-black/40'
      )}
    >
      {/* Background glows */}
      <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-[#00ffcc]/[0.06] blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-violet-500/[0.06] blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative flex items-center gap-3 mb-7">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00ffcc]/20 to-[#00ffcc]/5 flex items-center justify-center border border-[#00ffcc]/10">
          <Zap className="w-4.5 h-4.5 text-[#00ffcc]" />
        </div>
        <div>
          <h3 className="text-lg font-bold bg-gradient-to-r from-[#00ffcc] to-[#00d4aa] bg-clip-text text-transparent">
            Solar Savings Calculator
          </h3>
          <p className="text-[11px] text-[#8888a0] mt-0.5">
            Estimate your commercial solar ROI in Panama
          </p>
        </div>
      </div>

      {/* Bill Slider */}
      <div className="relative space-y-6 mb-7">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-[#8888a0] uppercase tracking-wider">
              Monthly Electric Bill
            </label>
            <span className="text-sm font-bold text-[#f0f0f5] tabular-nums">
              ${monthlyBill.toLocaleString()}
            </span>
          </div>
          <input
            type="range"
            min={500}
            max={20000}
            step={100}
            value={monthlyBill}
            onChange={(e) => setMonthlyBill(parseInt(e.target.value))}
            className={cn(
              'w-full h-1.5 rounded-full appearance-none cursor-pointer',
              'bg-white/[0.06]',
              '[&::-webkit-slider-thumb]:appearance-none',
              '[&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5',
              '[&::-webkit-slider-thumb]:rounded-full',
              '[&::-webkit-slider-thumb]:bg-[#00ffcc]',
              '[&::-webkit-slider-thumb]:shadow-[0_0_14px_rgba(0,255,204,0.5)]',
              '[&::-webkit-slider-thumb]:cursor-pointer',
              '[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#0a0a0f]',
              '[&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5',
              '[&::-moz-range-thumb]:rounded-full',
              '[&::-moz-range-thumb]:bg-[#00ffcc]',
              '[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[#0a0a0f]',
              '[&::-moz-range-thumb]:cursor-pointer'
            )}
          />
          <div className="flex justify-between text-[10px] text-[#555570]">
            <span>$500</span>
            <span>$20,000</span>
          </div>
        </div>

        {/* Business Type Chips */}
        <div className="space-y-2.5">
          <label className="text-xs font-medium text-[#8888a0] uppercase tracking-wider">
            Business Type
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {BUSINESS_TYPES.map((bt) => (
              <button
                key={bt.key}
                onClick={() => setBusinessType(bt.key)}
                className={cn(
                  'flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium',
                  'border transition-all duration-200',
                  businessType === bt.key
                    ? 'bg-[#00ffcc]/10 text-[#00ffcc] border-[#00ffcc]/30 shadow-[0_0_8px_rgba(0,255,204,0.1)]'
                    : 'bg-white/[0.02] text-[#8888a0] border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04]'
                )}
              >
                <span className="text-sm">{bt.icon}</span>
                <span>{bt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* City Select */}
        <div className="space-y-2.5">
          <label className="text-xs font-medium text-[#8888a0] uppercase tracking-wider">
            City
          </label>
          <div className="relative">
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={cn(
                'w-full px-4 py-2.5 rounded-xl text-sm',
                'bg-white/[0.04] border border-white/[0.06] text-[#f0f0f5]',
                'outline-none focus:border-[#00ffcc]/30 focus:ring-1 focus:ring-[#00ffcc]/10',
                'transition-all duration-200 cursor-pointer appearance-none',
                'pr-10'
              )}
            >
              {CITIES.map((c) => (
                <option key={c} value={c} className="bg-[#1a1a2e] text-[#f0f0f5]">
                  {c}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#555570]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent mb-6" />

      {/* Results Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={resultKey}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-2.5 mb-7"
        >
          {/* Top row: 2 cards */}
          <div className="grid grid-cols-2 gap-2.5">
            {resultCards.slice(0, 2).map((card, i) => (
              <motion.div
                key={card.label}
                custom={i}
                variants={resultCardVariants}
                className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.04] hover:border-white/[0.08] transition-colors"
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  {card.icon}
                  <span className="text-[10px] text-[#555570] uppercase tracking-wider font-medium">
                    {card.label}
                  </span>
                </div>
                <p className={cn('text-xl font-bold tabular-nums', card.color)}>
                  {card.value}
                  {card.unit && (
                    <span className="text-xs font-normal text-[#8888a0] ml-1">{card.unit}</span>
                  )}
                </p>
                <p className="text-[10px] text-[#555570] mt-0.5">{card.sub}</p>
              </motion.div>
            ))}
          </div>

          {/* Middle row: 2 cards */}
          <div className="grid grid-cols-2 gap-2.5">
            {resultCards.slice(2, 4).map((card, i) => (
              <motion.div
                key={card.label}
                custom={i + 2}
                variants={resultCardVariants}
                className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.04] hover:border-white/[0.08] transition-colors"
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  {card.icon}
                  <span className="text-[10px] text-[#555570] uppercase tracking-wider font-medium">
                    {card.label}
                  </span>
                </div>
                <p className={cn('text-xl font-bold tabular-nums', card.color)}>
                  {card.value}
                  {card.unit && (
                    <span className="text-xs font-normal text-[#8888a0] ml-1">{card.unit}</span>
                  )}
                </p>
                <p className="text-[10px] text-[#555570] mt-0.5">{card.sub}</p>
              </motion.div>
            ))}
          </div>

          {/* Bottom row: 1 card full width */}
          <motion.div
            custom={4}
            variants={resultCardVariants}
            className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.04] hover:border-white/[0.08] transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  {resultCards[4].icon}
                  <span className="text-[10px] text-[#555570] uppercase tracking-wider font-medium">
                    {resultCards[4].label}
                  </span>
                </div>
                <p className={cn('text-xl font-bold tabular-nums', resultCards[4].color)}>
                  {resultCards[4].value}
                  <span className="text-xs font-normal text-[#8888a0] ml-1">{resultCards[4].unit}</span>
                </p>
              </div>
              <p className="text-[10px] text-[#555570]">{resultCards[4].sub}</p>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* CTA Button */}
      <motion.button
        whileHover={{ scale: 1.02, boxShadow: '0 0 32px rgba(0,255,204,0.35)' }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'relative w-full py-3.5 rounded-xl',
          'font-semibold text-sm text-[#0a0a0f]',
          'bg-gradient-to-r from-[#00ffcc] to-[#00d4aa]',
          'shadow-[0_0_24px_rgba(0,255,204,0.2)]',
          'hover:shadow-[0_0_32px_rgba(0,255,204,0.35)]',
          'transition-shadow duration-300',
          'flex items-center justify-center gap-2',
          'cursor-pointer'
        )}
      >
        Get Detailed Proposal
        <ArrowRight className="w-4 h-4" />
      </motion.button>

      {/* Disclaimer */}
      <p className="text-center text-[10px] text-[#555570] mt-3 leading-relaxed">
        Estimates based on Panama commercial rates ($0.195/kWh). Actual savings may vary.
      </p>
    </div>
  );
}
