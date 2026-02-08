import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Building2, Sun, Zap, DollarSign, ExternalLink,
  Layers, Ruler, BarChart3, ArrowRight, Sparkles, MapPin,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { PANAMA_DEFAULTS } from '@/services/solarCalculator';
import type { RoofScanResult } from '@/services/roofScannerService';
import type { SuitabilityResult } from '@/services/roofClassifier';

// ===== TYPES =====

export interface DetailBuilding {
  id: number;
  name: string;
  area: number;
  buildingType: string;
  center: { lat: number; lng: number };
  suitability: SuitabilityResult;
  analyzed: boolean;
  solarAnalysis?: RoofScanResult;
}

interface BuildingDetailProps {
  building: DetailBuilding | null;
  isAnalyzing: boolean;
  onClose: () => void;
  onAnalyze: () => void;
}

// ===== CONSTANTS =====

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHLY_FRACTIONS = [0.092, 0.090, 0.098, 0.085, 0.075, 0.070, 0.072, 0.070, 0.068, 0.070, 0.075, 0.085];
const FRACTION_SUM = MONTHLY_FRACTIONS.reduce((s, f) => s + f, 0);

// ===== HELPERS =====

function getScoreColor(score: number): string {
  if (score >= 80) return '#00ffcc';
  if (score >= 60) return '#22c55e';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function getGradeLabel(grade: string): string {
  switch (grade) {
    case 'A': return 'Excellent';
    case 'B': return 'Good';
    case 'C': return 'Fair';
    case 'D': return 'Poor';
    default: return grade;
  }
}

const fmt = (n: number, decimals = 0) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: decimals }).format(n);

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

// ===== COMPONENT =====

export default function BuildingDetail({
  building,
  isAnalyzing,
  onClose,
  onAnalyze,
}: BuildingDetailProps) {
  if (!building) return null;

  const scoreColor = getScoreColor(building.suitability.score);

  // Calculate solar financials when analyzed
  const analysis = building.solarAnalysis;
  const kwp = analysis?.maxSystemSizeKwp ?? 0;
  const yearlyKwh = analysis?.yearlyEnergyKwh ?? 0;
  const panelCount = analysis?.maxPanelCount ?? 0;
  const investment = kwp * 1000 * PANAMA_DEFAULTS.costPerWp;
  const savings = yearlyKwh * PANAMA_DEFAULTS.electricityRate * PANAMA_DEFAULTS.selfConsumptionRatio;
  const payback = savings > 0 ? investment / savings : 0;
  const co2 = (yearlyKwh / 1000) * PANAMA_DEFAULTS.gridEmissionFactor;

  // Monthly production data
  const monthlyData = MONTH_LABELS.map((month, i) => ({
    month,
    production: Math.round((yearlyKwh * MONTHLY_FRACTIONS[i]) / FRACTION_SUM),
  }));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="absolute right-0 top-0 bottom-0 w-[420px] z-20 bg-[#0a0a0f]/98 backdrop-blur-2xl border-l border-white/[0.06] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-[#f0f0f5] truncate">
              {building.name || `Building #${building.id}`}
            </h2>
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className="px-3 py-1 text-xs font-semibold rounded-full"
                style={{
                  backgroundColor: `${scoreColor}15`,
                  color: scoreColor,
                }}
              >
                {building.suitability.score} - {getGradeLabel(building.suitability.grade)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#555566] hover:text-[#f0f0f5] hover:bg-white/[0.04] transition-all shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">
          {/* Score Breakdown */}
          <GlassCard padding="md">
            <h3 className="text-xs font-semibold text-[#8888a0] uppercase tracking-wider mb-3">
              Suitability Breakdown
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Roof Area', score: building.suitability.factors.area ?? 0, max: 50 },
                { label: 'Building Type', score: building.suitability.factors.type ?? 0, max: 30 },
                { label: 'Name Match', score: building.suitability.factors.name ?? 0, max: 20 },
              ].map((factor) => (
                <div key={factor.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#8888a0]">{factor.label}</span>
                    <span className="text-xs font-medium text-[#f0f0f5]">
                      {factor.score}/{factor.max}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${(factor.score / factor.max) * 100}%`,
                        backgroundColor: getScoreColor((factor.score / factor.max) * 100),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Building Info */}
          <GlassCard padding="md">
            <h3 className="text-xs font-semibold text-[#8888a0] uppercase tracking-wider mb-3">
              Building Info
            </h3>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#8b5cf6]/10 flex items-center justify-center">
                  <Ruler className="w-3.5 h-3.5 text-[#8b5cf6]" />
                </div>
                <div>
                  <div className="text-[11px] text-[#555566]">Area</div>
                  <div className="text-sm text-[#f0f0f5] font-medium">
                    {fmt(building.area)} m²
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#0ea5e9]/10 flex items-center justify-center">
                  <Building2 className="w-3.5 h-3.5 text-[#0ea5e9]" />
                </div>
                <div>
                  <div className="text-[11px] text-[#555566]">Type</div>
                  <div className="text-sm text-[#f0f0f5] font-medium capitalize">
                    {building.buildingType}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#22c55e]/10 flex items-center justify-center">
                  <MapPin className="w-3.5 h-3.5 text-[#22c55e]" />
                </div>
                <div>
                  <div className="text-[11px] text-[#555566]">Location</div>
                  <div className="text-sm text-[#f0f0f5] font-medium">
                    {building.center.lat.toFixed(5)}, {building.center.lng.toFixed(5)}
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Solar Analysis */}
          {!building.analyzed && !isAnalyzing && (
            <div className="py-2">
              <Button
                variant="primary"
                fullWidth
                size="lg"
                icon={<Sparkles className="w-5 h-5" />}
                onClick={onAnalyze}
              >
                Analyze Solar Potential
              </Button>
            </div>
          )}

          {isAnalyzing && (
            <GlassCard padding="md">
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-[#00ffcc]" />
                  <span className="text-sm font-medium text-[#f0f0f5]">
                    Analyzing...
                  </span>
                </div>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <div
                      className="h-3 rounded bg-white/[0.04] animate-pulse"
                      style={{ width: `${60 + Math.random() * 30}%` }}
                    />
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {building.analyzed && analysis && (
            <>
              {/* Hero Metrics */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: 'System Size', value: `${fmt(kwp, 1)} kWp`, icon: Zap, color: '#00ffcc' },
                  { label: 'Annual Energy', value: `${fmt(yearlyKwh)} kWh`, icon: Sun, color: '#f59e0b' },
                  { label: 'Panels', value: `${fmt(panelCount)}`, icon: Layers, color: '#8b5cf6' },
                  { label: 'Investment', value: fmtCurrency(investment), icon: DollarSign, color: '#0ea5e9' },
                ].map((metric) => (
                  <div
                    key={metric.label}
                    className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]"
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <metric.icon className="w-3.5 h-3.5" style={{ color: metric.color }} />
                      <span className="text-[10px] text-[#555566] uppercase tracking-wider">
                        {metric.label}
                      </span>
                    </div>
                    <div className="text-base font-bold text-[#f0f0f5]">{metric.value}</div>
                  </div>
                ))}
              </div>

              {/* Monthly Production Chart */}
              <GlassCard padding="md">
                <h3 className="text-xs font-semibold text-[#8888a0] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-[#0ea5e9]" />
                  Monthly Production
                </h3>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} barCategoryGap="15%">
                      <defs>
                        <linearGradient id="detailBarGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#00ffcc" stopOpacity={0.8} />
                          <stop offset="100%" stopColor="#00ffcc" stopOpacity={0.15} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#555566', fontSize: 9 }}
                      />
                      <YAxis hide />
                      <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                        contentStyle={{
                          backgroundColor: '#1a1a2e',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: 10,
                          color: '#f0f0f5',
                          fontSize: 12,
                        }}
                        formatter={(value: number) => [fmt(value) + ' kWh', 'Production']}
                      />
                      <Bar dataKey="production" fill="url(#detailBarGrad)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>

              {/* Financial Row */}
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="text-[10px] text-[#555566] mb-1">Savings/yr</div>
                  <div className="text-sm font-bold text-[#22c55e]">{fmtCurrency(savings)}</div>
                </div>
                <div className="text-center p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="text-[10px] text-[#555566] mb-1">Payback</div>
                  <div className="text-sm font-bold text-[#0ea5e9]">{payback.toFixed(1)} yrs</div>
                </div>
                <div className="text-center p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="text-[10px] text-[#555566] mb-1">CO₂/yr</div>
                  <div className="text-sm font-bold text-[#00ffcc]">{fmt(co2, 1)} t</div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons (fixed bottom) */}
        {building.analyzed && (
          <div className="px-5 py-4 border-t border-white/[0.06] space-y-2">
            <Button
              variant="primary"
              fullWidth
              icon={<ArrowRight className="w-4 h-4" />}
              onClick={() => { window.location.hash = '#/tools/proposal-generator'; }}
            >
              Generate Proposal
            </Button>
            <Button
              variant="accent"
              fullWidth
              icon={<ExternalLink className="w-4 h-4" />}
              onClick={() => { window.location.hash = '#/projects'; }}
            >
              Save to Project
            </Button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
