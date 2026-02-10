import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Zap, DollarSign, TrendingUp, Leaf, Phone, MessageCircle } from 'lucide-react';
import { estimateLocalSolar } from '@/services/roofScannerService';
import { PANAMA_DEFAULTS } from '@/services/solarCalculator';
import { getGradeFromScore } from '@/utils/geoCalculations';
import { PUBLIC_CONFIG } from '@/config/public';
import type { DiscoveredBuilding } from '@/hooks/useRoofScanner';

// ===== Constants =====

const PANEL_AREA_M2 = 2.58;
const PANEL_WATT = 580;
const USABLE_ROOF_RATIO = 0.6;

const GRADE_LABELS: Record<string, string> = {
  A: 'Excelente',
  B: 'Bueno',
  C: 'Aceptable',
  D: 'Limitado',
};

// ===== Types =====

interface BuildingSolarCardProps {
  building: DiscoveredBuilding;
  onClose: () => void;
}

interface SolarEstimate {
  panels: number;
  systemKwp: number;
  yearlyKwh: number;
  annualSavings: number;
  investment: number;
  paybackYears: number;
  co2Tons: number;
}

// ===== Helpers =====

function calculateEstimate(building: DiscoveredBuilding): SolarEstimate {
  const usableArea = building.area * USABLE_ROOF_RATIO;
  const panels = Math.floor(usableArea / PANEL_AREA_M2);
  const systemKwp = (panels * PANEL_WATT) / 1000;

  const local = estimateLocalSolar(
    building.center.lat,
    building.center.lng,
    systemKwp
  );
  const yearlyKwh = local.yearlyEnergyKwh;

  // Savings: self-consumed at full rate + exported credited at 25%
  const selfConsumed = yearlyKwh * PANAMA_DEFAULTS.selfConsumptionRatio;
  const credited = (yearlyKwh - selfConsumed) * PANAMA_DEFAULTS.netMeteringCap;
  const annualSavings = (selfConsumed + credited) * PANAMA_DEFAULTS.electricityRate;

  const investment = systemKwp * 1000 * PANAMA_DEFAULTS.costPerWp;
  const paybackYears = annualSavings > 0 ? investment / annualSavings : 99;
  const co2Tons = (yearlyKwh / 1000) * PANAMA_DEFAULTS.gridEmissionFactor;

  return { panels, systemKwp, yearlyKwh, annualSavings, investment, paybackYears, co2Tons };
}

function buildWhatsAppUrl(building: DiscoveredBuilding, estimate: SolarEstimate): string {
  const message = [
    'Hola, vi mi edificio en el Mapa Solar y me interesa recibir un informe gratuito de energ\u00eda solar.',
    '',
    `\ud83d\udccd Edificio: ${building.name}`,
    `\ud83d\udcd0 \u00c1rea: ${Math.round(building.area)}m\u00b2`,
    `\u26a1 Sistema: ${estimate.systemKwp.toFixed(1)} kWp`,
    `\ud83d\udcb0 Ahorro: $${formatNumber(estimate.annualSavings)}/a\u00f1o`,
    '',
    'Me gustar\u00eda m\u00e1s informaci\u00f3n.',
  ].join('\n');

  return `https://wa.me/${PUBLIC_CONFIG.whatsappPhone}?text=${encodeURIComponent(message)}`;
}

function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

// ===== Component =====

export default function BuildingSolarCard({ building, onClose }: BuildingSolarCardProps) {
  const estimate = useMemo(() => calculateEstimate(building), [building]);
  const grade = getGradeFromScore(building.suitability.score);
  const whatsappUrl = useMemo(() => buildWhatsAppUrl(building, estimate), [building, estimate]);

  const metrics = [
    {
      icon: <Zap className="w-4 h-4" />,
      label: 'Sistema Solar',
      value: `${estimate.systemKwp.toFixed(1)} kWp`,
      sub: `${estimate.panels} paneles`,
      color: '#00ffcc',
    },
    {
      icon: <DollarSign className="w-4 h-4" />,
      label: 'Ahorro Anual',
      value: `$${formatNumber(estimate.annualSavings)}`,
      sub: 'por a\u00f1o',
      color: '#22c55e',
    },
    {
      icon: <TrendingUp className="w-4 h-4" />,
      label: 'Retorno',
      value: `${estimate.paybackYears.toFixed(1)}`,
      sub: 'a\u00f1os',
      color: '#f59e0b',
    },
    {
      icon: <Leaf className="w-4 h-4" />,
      label: 'Impacto',
      value: `${estimate.co2Tons.toFixed(1)}`,
      sub: 'ton CO\u2082/a\u00f1o',
      color: '#22c55e',
    },
  ];

  const cardContent = (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-[#f0f0f5] truncate">
            {building.name}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-[#8888a0] capitalize">
              {building.buildingType}
            </span>
            <span className="text-[#555566]">&middot;</span>
            <span className="text-xs text-[#8888a0]">
              {Math.round(building.area)} m&sup2;
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="px-2.5 py-1 rounded-full text-xs font-bold"
            style={{
              background: `${grade.color}15`,
              color: grade.color,
              border: `1px solid ${grade.color}30`,
            }}
          >
            {grade.grade} &middot; {GRADE_LABELS[grade.grade] || 'N/A'}
          </span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4 text-[#8888a0]" />
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2.5 mb-5">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]"
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <span style={{ color: m.color }}>{m.icon}</span>
              <span className="text-[10px] text-[#8888a0] uppercase tracking-wider font-medium">
                {m.label}
              </span>
            </div>
            <div className="text-lg font-bold text-[#f0f0f5]">{m.value}</div>
            <div className="text-[11px] text-[#555566]">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* WhatsApp CTA */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all hover:brightness-110 active:scale-[0.98]"
        style={{ background: '#25D366' }}
      >
        <MessageCircle className="w-5 h-5" />
        Solicitar Informe Gratuito
      </a>

      {/* Call CTA */}
      <a
        href={`tel:+${PUBLIC_CONFIG.whatsappPhone}`}
        className="flex items-center justify-center gap-2 w-full py-3 mt-2 rounded-xl text-sm font-medium text-[#8888a0] bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-all"
      >
        <Phone className="w-4 h-4" />
        Llamar Ahora
      </a>

      {/* Disclaimer */}
      <p className="text-[10px] text-[#555566] text-center mt-4 leading-relaxed px-2">
        Estimaciones basadas en datos satelitales.
        Un ingeniero confirmar&aacute; los valores con una visita t&eacute;cnica.
      </p>
    </>
  );

  return (
    <>
      {/* Desktop: right panel */}
      <motion.div
        initial={{ x: 420, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 420, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        className="hidden md:flex flex-col absolute top-14 right-0 bottom-0 w-[400px] z-30 p-5 overflow-y-auto backdrop-blur-xl bg-[#0a0a0f]/90 border-l border-white/[0.06]"
      >
        {cardContent}
      </motion.div>

      {/* Mobile: bottom sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: '0%' }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.3}
        onDragEnd={(_e, info) => {
          if (info.offset.y > 100) onClose();
        }}
        className="md:hidden fixed left-0 right-0 bottom-0 z-30 max-h-[70vh] overflow-y-auto rounded-t-2xl p-5 pt-3 backdrop-blur-xl bg-[#0a0a0f]/95 border-t border-white/[0.06]"
      >
        {/* Drag handle */}
        <div className="flex justify-center mb-3">
          <div className="w-10 h-1 rounded-full bg-white/[0.15]" />
        </div>
        {cardContent}
      </motion.div>
    </>
  );
}
