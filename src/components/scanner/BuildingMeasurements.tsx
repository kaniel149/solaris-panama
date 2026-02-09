import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Ruler, Zap, DollarSign, Sun, BarChart3, Save } from 'lucide-react';
import { PANAMA_DEFAULTS } from '@/services/solarCalculator';
import {
  calculatePolygonArea,
  calculateEdgeLengths,
  calculatePerimeter,
  estimatePanelLayout,
  formatArea,
  formatDistance,
  getGradeFromScore,
} from '@/utils/geoCalculations';
import type { DiscoveredBuilding } from '@/hooks/useRoofScanner';

interface BuildingMeasurementsProps {
  building: DiscoveredBuilding;
  onFullAnalysis?: () => void;
  onSave?: () => void;
}

const fmt = (n: number, decimals = 0) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: decimals }).format(n);

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);

export default function BuildingMeasurements({
  building,
  onFullAnalysis,
  onSave,
}: BuildingMeasurementsProps) {
  const measurements = useMemo(() => {
    const coords = building.coordinates;
    const area = calculatePolygonArea(coords);
    const edgeLengths = calculateEdgeLengths(coords);
    const perimeter = calculatePerimeter(coords);
    const longestEdge = edgeLengths.length > 0 ? Math.max(...edgeLengths) : 0;
    const panel = estimatePanelLayout(area > 0 ? area : building.area);
    const grade = getGradeFromScore(building.suitability.score);

    // Financial quick estimates
    const investment = panel.systemKwp * 1000 * PANAMA_DEFAULTS.costPerWp;
    const annualSavings =
      panel.annualKwh *
      PANAMA_DEFAULTS.electricityRate *
      PANAMA_DEFAULTS.selfConsumptionRatio;
    const payback = annualSavings > 0 ? investment / annualSavings : 0;

    return {
      area: area > 0 ? area : building.area,
      edgeLengths,
      perimeter,
      longestEdge,
      panel,
      grade,
      investment,
      annualSavings,
      payback,
    };
  }, [building]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="w-[280px] max-h-[calc(100vh-80px)] overflow-y-auto rounded-xl bg-[#12121a]/90 backdrop-blur-xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#8b5cf6]/10 flex items-center justify-center">
            <Ruler className="w-3.5 h-3.5 text-[#8b5cf6]" />
          </div>
          <h3 className="text-sm font-semibold text-[#f0f0f5]">Building Measurements</h3>
        </div>
      </div>

      {/* Measurements */}
      <div className="px-4 py-3 space-y-2.5">
        <MeasurementRow
          label="Roof Area"
          value={formatArea(measurements.area)}
        />
        <MeasurementRow
          label="Usable Area"
          value={`${fmt(measurements.panel.usableArea)} m\u00B2`}
          sub={`(${Math.round((measurements.panel.usableArea / measurements.area) * 100)}%)`}
        />
        <MeasurementRow
          label="Perimeter"
          value={formatDistance(measurements.perimeter)}
        />
        <MeasurementRow
          label="Longest Edge"
          value={formatDistance(measurements.longestEdge)}
        />
        <MeasurementRow
          label="Grade"
          value={`${measurements.grade.grade} - ${measurements.grade.label}`}
          valueColor={measurements.grade.color}
        />
      </div>

      {/* Solar Estimate */}
      <div className="px-4 py-3 border-t border-white/[0.04]">
        <div className="flex items-center gap-1.5 mb-3">
          <Zap className="w-3.5 h-3.5 text-[#00ffcc]" />
          <span className="text-xs font-semibold text-[#8888a0] uppercase tracking-wider">
            Quick Solar Estimate
          </span>
        </div>

        <div className="space-y-2.5">
          <MeasurementRow
            label="Panels"
            value={`~${fmt(measurements.panel.panelCount)} \u00D7 ${PANAMA_DEFAULTS.panelWattage}W`}
            icon={<Sun className="w-3 h-3 text-[#f59e0b]" />}
          />
          <MeasurementRow
            label="System"
            value={`${fmt(measurements.panel.systemKwp, 1)} kWp`}
            icon={<Zap className="w-3 h-3 text-[#00ffcc]" />}
          />
          <MeasurementRow
            label="Annual"
            value={`~${fmt(measurements.panel.annualKwh)} kWh`}
            icon={<BarChart3 className="w-3 h-3 text-[#0ea5e9]" />}
          />
          <MeasurementRow
            label="Investment"
            value={`~${fmtCurrency(measurements.investment)}`}
            icon={<DollarSign className="w-3 h-3 text-[#8b5cf6]" />}
          />
          <MeasurementRow
            label="Payback"
            value={`~${measurements.payback.toFixed(1)} years`}
            icon={<DollarSign className="w-3 h-3 text-[#22c55e]" />}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-white/[0.04] flex gap-2">
        {onFullAnalysis && (
          <button
            onClick={onFullAnalysis}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#00ffcc]/[0.08] border border-[#00ffcc]/20 text-xs font-medium text-[#00ffcc] hover:bg-[#00ffcc]/[0.14] transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Full Analysis
          </button>
        )}
        {onSave && (
          <button
            onClick={onSave}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs font-medium text-[#8888a0] hover:text-[#f0f0f5] hover:bg-white/[0.06] transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            Save
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ===== SUB-COMPONENTS =====

function MeasurementRow({
  label,
  value,
  sub,
  valueColor,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xs text-[#555566]">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        <span
          className="text-xs font-medium"
          style={{ color: valueColor ?? '#f0f0f5' }}
        >
          {value}
        </span>
        {sub && <span className="text-[10px] text-[#555566]">{sub}</span>}
      </div>
    </div>
  );
}
