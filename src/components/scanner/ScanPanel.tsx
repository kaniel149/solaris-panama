import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, MapPin, ScanLine, Building2, Filter, ChevronDown,
  ArrowUpDown, Zap, Target, Map as MapIcon, Sun,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import ZoneSelector from '@/components/scanner/ZoneSelector';
import BatchActions from '@/components/scanner/BatchActions';
import type { LeadZone } from '@/types/lead';

const cn = (...classes: (string | boolean | undefined | null)[]) =>
  classes.filter(Boolean).join(' ');

// ===== TYPES =====

interface ScanPanelBuilding {
  id: number;
  name: string;
  area: number;
  buildingType: string;
  suitability: {
    score: number;
    grade: string;
    factors: Record<string, number>;
    recommendation: string;
  };
}

interface ScanPanelStats {
  total: number;
  suitable: number;
  excellent: number;
  avgScore: number;
  totalKwpPotential: number;
}

interface ScanPanelProps {
  buildings: ScanPanelBuilding[];
  selectedBuildingId: number | null;
  isScanning: boolean;
  stats: ScanPanelStats;
  onSearch: (address: string) => void;
  onScanViewport: () => void;
  onBuildingSelect: (id: number) => void;
  onFilterChange: (filters: { minArea: number; minScore: number }) => void;
  // Lead pipeline props
  zones?: LeadZone[];
  selectedZoneId?: string | null;
  onSelectZone?: (zoneId: string) => void;
  onClearZone?: () => void;
  onSaveAllAsLeads?: () => void;
  onEnrichAll?: () => void;
  onAnalyzeTop?: (count: number) => void;
  isSavingLeads?: boolean;
  isEnriching?: boolean;
  enrichProgress?: { completed: number; total: number } | null;
}

// ===== HELPERS =====

type SortKey = 'score' | 'area' | 'name';

function getScoreColor(score: number): string {
  if (score >= 80) return '#00ffcc';
  if (score >= 60) return '#22c55e';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

const stagger = {
  animate: { transition: { staggerChildren: 0.04 } },
};

const listItem = {
  initial: { opacity: 0, x: -12 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3 } },
};

// ===== COMPONENT =====

export default function ScanPanel({
  buildings,
  selectedBuildingId,
  isScanning,
  stats,
  onSearch,
  onScanViewport,
  onBuildingSelect,
  onFilterChange,
  zones,
  selectedZoneId,
  onSelectZone,
  onClearZone,
  onSaveAllAsLeads,
  onEnrichAll,
  onAnalyzeTop,
  isSavingLeads,
  isEnriching,
  enrichProgress,
}: ScanPanelProps) {
  const [searchValue, setSearchValue] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [minArea, setMinArea] = useState(0);
  const [minScore, setMinScore] = useState(0);
  const [sortBy, setSortBy] = useState<SortKey>('score');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = () => {
    if (searchValue.trim()) {
      onSearch(searchValue.trim());
    }
  };

  const handleFilterChange = (newMinArea: number, newMinScore: number) => {
    setMinArea(newMinArea);
    setMinScore(newMinScore);
    onFilterChange({ minArea: newMinArea, minScore: newMinScore });
  };

  // Sort buildings locally
  const sortedBuildings = [...buildings].sort((a, b) => {
    if (sortBy === 'score') return b.suitability.score - a.suitability.score;
    if (sortBy === 'area') return b.area - a.area;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="w-[380px] h-full flex flex-col bg-[#0a0a0f]/95 backdrop-blur-xl border-r border-white/[0.06] overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-lg bg-[#00ffcc]/10 flex items-center justify-center">
            <ScanLine className="w-4.5 h-4.5 text-[#00ffcc]" />
          </div>
          <div>
            <h1 className="text-base font-bold bg-gradient-to-r from-[#00ffcc] via-[#0ea5e9] to-[#8b5cf6] bg-clip-text text-transparent leading-tight">
              AI Roof Scanner
            </h1>
            <p className="text-[10px] text-[#555566] mt-0.5">
              Discover solar opportunities
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 pb-3">
        <div className="relative flex items-center bg-[#12121a]/80 backdrop-blur-xl border border-white/[0.06] rounded-xl overflow-hidden focus-within:border-[#00ffcc]/30 transition-colors">
          <MapPin className="w-4 h-4 text-[#555566] ml-3.5 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search address in Panama..."
            className="flex-1 bg-transparent text-[#f0f0f5] placeholder-[#555566] px-3 py-3 text-sm outline-none"
          />
          <button
            onClick={handleSearch}
            disabled={!searchValue.trim()}
            className="p-2.5 mr-1 text-[#555566] hover:text-[#00ffcc] transition-colors disabled:opacity-30"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Zone Selector */}
      {zones && zones.length > 0 && onSelectZone && onClearZone && (
        <div className="px-4 pb-3">
          <ZoneSelector
            zones={zones}
            selectedZoneId={selectedZoneId ?? null}
            onSelectZone={onSelectZone}
            onClearZone={onClearZone}
          />
        </div>
      )}

      {/* Scan Controls */}
      <div className="px-4 pb-4">
        <Button
          variant="primary"
          fullWidth
          icon={<ScanLine className="w-4 h-4" />}
          loading={isScanning}
          onClick={onScanViewport}
        >
          {isScanning ? 'Scanning Area...' : 'Scan This Area'}
        </Button>
      </div>

      {/* Results Summary */}
      {buildings.length > 0 && (
        <div className="px-4 pb-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Total', value: stats.total, icon: Building2, color: '#8b5cf6' },
              { label: 'Suitable', value: stats.suitable, icon: Target, color: '#22c55e' },
              { label: 'Excellent', value: stats.excellent, icon: Zap, color: '#00ffcc' },
              { label: 'Potential', value: `${Math.round(stats.totalKwpPotential)} kWp`, icon: Sun, color: '#f59e0b' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <stat.icon className="w-3 h-3" style={{ color: stat.color }} />
                  <span className="text-[10px] text-[#555566] uppercase tracking-wider">
                    {stat.label}
                  </span>
                </div>
                <div className="text-sm font-bold text-[#f0f0f5]">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Batch Actions */}
      {buildings.length > 0 && onSaveAllAsLeads && onEnrichAll && onAnalyzeTop && (
        <div className="px-4 pb-3">
          <BatchActions
            buildingCount={buildings.length}
            onSaveAllAsLeads={onSaveAllAsLeads}
            onEnrichAll={onEnrichAll}
            onAnalyzeTop={onAnalyzeTop}
            isSaving={isSavingLeads ?? false}
            isEnriching={isEnriching ?? false}
            enrichProgress={enrichProgress ?? null}
          />
        </div>
      )}

      {/* Filters Row */}
      <div className="px-4 pb-3">
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="flex items-center gap-2 text-xs text-[#8888a0] hover:text-[#f0f0f5] transition-colors w-full"
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Filters</span>
          <ChevronDown
            className={cn(
              'w-3.5 h-3.5 ml-auto transition-transform duration-200',
              filtersOpen && 'rotate-180'
            )}
          />
        </button>

        <AnimatePresence>
          {filtersOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-3 space-y-3">
                {/* Min Area */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-[#555566]">Min Area</span>
                    <span className="text-[11px] text-[#8888a0] font-medium">{minArea} m²</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={5000}
                    step={100}
                    value={minArea}
                    onChange={(e) => handleFilterChange(Number(e.target.value), minScore)}
                    className="w-full h-1 bg-white/[0.06] rounded-full appearance-none cursor-pointer accent-[#00ffcc]"
                  />
                </div>

                {/* Min Score */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-[#555566]">Min Score</span>
                    <span className="text-[11px] text-[#8888a0] font-medium">{minScore}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={minScore}
                    onChange={(e) => handleFilterChange(minArea, Number(e.target.value))}
                    className="w-full h-1 bg-white/[0.06] rounded-full appearance-none cursor-pointer accent-[#00ffcc]"
                  />
                </div>

                {/* Sort By */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <ArrowUpDown className="w-3 h-3 text-[#555566]" />
                    <span className="text-[11px] text-[#555566]">Sort by</span>
                  </div>
                  <div className="flex gap-1.5">
                    {([
                      { key: 'score' as SortKey, label: 'Score' },
                      { key: 'area' as SortKey, label: 'Area' },
                      { key: 'name' as SortKey, label: 'Name' },
                    ]).map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => setSortBy(opt.key)}
                        className={cn(
                          'px-2.5 py-1 text-[11px] rounded-md border transition-all',
                          sortBy === opt.key
                            ? 'border-[#00ffcc]/30 bg-[#00ffcc]/[0.06] text-[#00ffcc]'
                            : 'border-white/[0.06] text-[#555566] hover:text-[#8888a0]'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-white/[0.04]" />

      {/* Building List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
        {sortedBuildings.length > 0 ? (
          <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-1.5">
            {sortedBuildings.map((building) => {
              const selected = building.id === selectedBuildingId;
              const scoreColor = getScoreColor(building.suitability.score);
              return (
                <motion.button
                  key={building.id}
                  variants={listItem}
                  onClick={() => onBuildingSelect(building.id)}
                  className={cn(
                    'w-full text-left p-3 rounded-xl border transition-all',
                    selected
                      ? 'border-[#00ffcc]/40 bg-[#00ffcc]/[0.04]'
                      : 'border-white/[0.04] hover:border-white/[0.08] bg-white/[0.01]'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Icon */}
                    <div className="w-8 h-8 rounded-lg bg-white/[0.03] flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-[#8888a0]" />
                    </div>

                    {/* Center */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[#f0f0f5] font-medium truncate">
                        {building.name || `Building #${building.id}`}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-[#555566]">
                          {building.area.toLocaleString()} m²
                        </span>
                        <span className="px-1.5 py-0.5 text-[9px] rounded bg-white/[0.04] text-[#8888a0] uppercase tracking-wider">
                          {building.buildingType}
                        </span>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className="text-sm font-bold"
                        style={{ color: scoreColor }}
                      >
                        {building.suitability.score}
                      </span>
                      <div className="w-12 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${building.suitability.score}%`,
                            backgroundColor: scoreColor,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] flex items-center justify-center mb-4">
              <MapIcon className="w-7 h-7 text-[#555566]" />
            </div>
            <p className="text-sm text-[#8888a0] mb-2">
              Search an address or scan the map area to discover buildings
            </p>
            <p className="text-xs text-[#555566]">
              Tip: Zoom into a commercial area for best results
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
