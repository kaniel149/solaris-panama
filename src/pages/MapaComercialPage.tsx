import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Search,
  Download,
  MapPin,
  Zap,
  DollarSign,
  TrendingUp,
  ChevronDown,
  X,
  ScanLine,
  ExternalLink,
  Filter,
  LayoutGrid,
  List,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { DEKEL_LEADS } from '@/data/dekelLeads';
import type { DekelLead } from '@/data/dekelLeads';

// ─── helpers ────────────────────────────────────────────────────────────────

const cn = (...classes: (string | boolean | undefined | null)[]) =>
  classes.filter(Boolean).join(' ');

const fmtUSD = (n: number) =>
  '$' + Math.round(n).toLocaleString('en-US');

const fmtKwp = (n: number) =>
  n >= 1000 ? (n / 1000).toFixed(2) + ' MW' : Math.round(n) + ' kW';

const sum = (rows: DekelLead[], key: keyof DekelLead) =>
  rows.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);

// ─── confidence badge ────────────────────────────────────────────────────────

const CONFIDENCE_STYLE: Record<DekelLead['confidence'], { bg: string; text: string }> = {
  High:         { bg: 'bg-[#00ffcc]/10 border border-[#00ffcc]/20', text: 'text-[#00ffcc]' },
  Medium:       { bg: 'bg-[#D4A843]/10 border border-[#D4A843]/20', text: 'text-[#D4A843]' },
  'Low-Medium': { bg: 'bg-[#f59e0b]/10 border border-[#f59e0b]/20', text: 'text-[#f59e0b]' },
  Low:          { bg: 'bg-[#ef4444]/10 border border-[#ef4444]/20', text: 'text-[#ef4444]' },
};

function ConfidenceBadge({ value }: { value: DekelLead['confidence'] }) {
  const s = CONFIDENCE_STYLE[value];
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide whitespace-nowrap', s.bg, s.text)}>
      {value}
    </span>
  );
}

// ─── sort options ────────────────────────────────────────────────────────────

type SortKey = 'rank' | 'kwp' | 'epc_gp' | 'ppa_npv';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'rank',    label: 'Ranking' },
  { value: 'kwp',     label: 'Mayor capacidad' },
  { value: 'epc_gp',  label: 'Mayor EPC GP' },
  { value: 'ppa_npv', label: 'Mayor PPA NPV' },
];

// ─── unique segments ─────────────────────────────────────────────────────────

const ALL_SEGMENTS = ['', ...Array.from(new Set(DEKEL_LEADS.map((r) => r.segment))).sort()];

// ─── animation variants ──────────────────────────────────────────────────────

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28 } },
};

// ─── lead card (grid) ────────────────────────────────────────────────────────

function LeadGridCard({ lead }: { lead: DekelLead }) {
  return (
    <motion.article variants={item}>
      <GlassCard
        variant="default"
        padding="none"
        className="h-full flex flex-col hover:border-[#D4A843]/30 transition-colors"
      >
        {/* top accent stripe */}
        <div className="h-0.5 w-full bg-gradient-to-r from-[#D4A843]/60 to-transparent rounded-t-xl" />

        <div className="p-4 flex flex-col flex-1">
          {/* header row */}
          <div className="flex items-start gap-3 mb-3">
            <div className="min-w-[30px] h-[30px] rounded-full bg-[#D4A843]/15 border border-[#D4A843]/30 flex items-center justify-center shrink-0">
              <span className="text-[11px] font-bold text-[#D4A843]">{lead.rank}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-[#f0f0f5] leading-tight line-clamp-2">
                {lead.name}
              </h3>
              <p className="text-[11px] text-[#555570] mt-0.5 truncate">{lead.segment}</p>
            </div>
            <ConfidenceBadge value={lead.confidence} />
          </div>

          {/* hebrew brief */}
          <p
            dir="rtl"
            className="text-xs text-[#8888a0] leading-relaxed mb-3 line-clamp-3"
          >
            {lead.brief}
          </p>

          {/* economics grid */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-[#D4A843]/5 border border-[#D4A843]/15 rounded-lg p-2">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-[#555570] mb-0.5">
                Fase 1
              </span>
              <span className="text-sm font-bold text-[#D4A843]">{fmtKwp(lead.kwp)}</span>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-2">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-[#555570] mb-0.5">
                EPC GP
              </span>
              <span className="text-sm font-bold text-[#00ffcc]">{fmtUSD(lead.epc_gp)}</span>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-2">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-[#555570] mb-0.5">
                PPA Anual
              </span>
              <span className="text-sm font-bold text-[#8b5cf6]">{fmtUSD(lead.ppa_margin)}</span>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-2">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-[#555570] mb-0.5">
                PPA NPV
              </span>
              <span className="text-sm font-bold text-[#0ea5e9]">{fmtUSD(lead.ppa_npv)}</span>
            </div>
          </div>

          {/* address */}
          <div className="flex items-start gap-1.5 mb-3">
            <MapPin className="w-3 h-3 text-[#555570] mt-0.5 shrink-0" />
            <span className="text-[11px] text-[#555570] line-clamp-2">{lead.address}</span>
          </div>

          {/* why */}
          <p className="text-[11px] text-[#8888a0] italic line-clamp-2 mb-4">
            {lead.why}
          </p>

          {/* CTAs */}
          <div className="flex gap-2 mt-auto">
            <a
              href={lead.maps}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold bg-[#D4A843]/10 border border-[#D4A843]/20 text-[#D4A843] hover:bg-[#D4A843]/20 hover:border-[#D4A843]/40 transition-all"
            >
              <MapPin className="w-3 h-3" />
              Ver en mapa
            </a>
            <Link
              to="/tools/scanner"
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold bg-white/[0.03] border border-white/[0.08] text-[#8888a0] hover:bg-[#00ffcc]/5 hover:border-[#00ffcc]/20 hover:text-[#00ffcc] transition-all"
            >
              <ScanLine className="w-3 h-3" />
              Escanear
            </Link>
          </div>
        </div>
      </GlassCard>
    </motion.article>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

type ViewMode = 'grid' | 'table';

export default function MapaComercialPage() {
  const [search, setSearch]           = useState('');
  const [segment, setSegment]         = useState('');
  const [confidence, setConfidence]   = useState<DekelLead['confidence'] | ''>('');
  const [minKwp, setMinKwp]           = useState<number>(0);
  const [sortKey, setSortKey]         = useState<SortKey>('rank');
  const [viewMode, setViewMode]       = useState<ViewMode>('grid');
  const [filterOpen, setFilterOpen]   = useState(false);

  // ── filtered + sorted data ──
  const filtered = useMemo(() => {
    let rows = DEKEL_LEADS.filter((r) => {
      const hay = Object.values(r).join(' ').toLowerCase();
      const q = search.trim().toLowerCase();
      return (
        (!q || hay.includes(q)) &&
        (!segment || r.segment === segment) &&
        (!confidence || r.confidence === confidence) &&
        r.kwp >= minKwp
      );
    });
    rows = [...rows].sort((a, b) =>
      sortKey === 'rank'
        ? Number(a.rank) - Number(b.rank)
        : (b[sortKey] as number) - (a[sortKey] as number)
    );
    return rows;
  }, [search, segment, confidence, minKwp, sortKey]);

  // ── aggregate stats ──
  const stats = useMemo(() => ({
    count:      filtered.length,
    totalKwp:   sum(filtered, 'kwp'),
    totalEpc:   sum(filtered, 'epc_gp'),
    totalPpa:   sum(filtered, 'ppa_margin'),
    totalNpv:   sum(filtered, 'ppa_npv'),
  }), [filtered]);

  // ── CSV export ──
  function exportCsv() {
    const cols: (keyof DekelLead)[] = ['rank', 'name', 'brief', 'segment', 'address', 'size', 'epc_gp', 'ppa_margin', 'ppa_npv', 'confidence', 'maps'];
    const csv = [
      cols.join(','),
      ...DEKEL_LEADS.map((r) =>
        cols.map((c) => '"' + String(r[c] ?? '').replace(/"/g, '""') + '"').join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'solaris_panama_dekel_leads.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function resetFilters() {
    setSearch('');
    setSegment('');
    setConfidence('');
    setMinKwp(0);
    setSortKey('rank');
  }

  const hasActiveFilters = search || segment || confidence || minKwp > 0;

  return (
    <div className="min-h-screen p-6 space-y-6">

      {/* ── hero header ────────────────────────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden relative">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://solaris-panama-share.vercel.app/assets/site/rooftop-warehouse-solar.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d0d1a]/95 via-[#0d0d1a]/80 to-[#0d0d1a]/60" />
        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#D4A843]/15 border border-[#D4A843]/30 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-[#D4A843]" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#D4A843]">
                  Solaris Panama × Dekel
                </span>
              </div>
              <h1
                dir="rtl"
                className="text-2xl sm:text-3xl font-bold text-[#f0f0f5] leading-tight mb-2"
              >
                ממשק לידים לדקל: אילו לקוחות אפשר להביא ל‑Solaris?
              </h1>
              <p
                dir="rtl"
                className="text-sm text-[#8888a0] leading-relaxed max-w-2xl"
              >
                כלי עבודה אינטראקטיבי — 54 לקוחות ונכסים מסחריים בפנמה. בכל כרטיס: מי הלקוח, איפה הנכס, גודל הנכס, גודל מערכת מומלץ לשלב ראשון, ואומדן רווח ב-EPC וב-PPA.
                גודל <strong className="text-[#D4A843]">שלב 1</strong> הוא לא ניצול מלא של כל הגג — אלא מערכת ריאלית לפתיחת עסקה.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                icon={<Download className="w-4 h-4" />}
                onClick={exportCsv}
              >
                Exportar CSV
              </Button>
              <a
                href="https://solaris-panama-share.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#D4A843] text-[#0d0d1a] hover:bg-[#D4A843]/90 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Solaris Plan
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── stats row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Clientes',        value: stats.count.toString(),          icon: <Building2 className="w-4 h-4" />,    color: '#f0f0f5' },
          { label: 'Capacidad Fase 1', value: fmtKwp(stats.totalKwp),        icon: <Zap className="w-4 h-4" />,         color: '#D4A843' },
          { label: 'EPC GP total',    value: fmtUSD(stats.totalEpc),          icon: <DollarSign className="w-4 h-4" />,  color: '#00ffcc' },
          { label: 'PPA margen/año',  value: fmtUSD(stats.totalPpa),          icon: <TrendingUp className="w-4 h-4" />,  color: '#8b5cf6' },
          { label: 'PPA NPV 20 años', value: fmtUSD(stats.totalNpv),          icon: <TrendingUp className="w-4 h-4" />,  color: '#0ea5e9' },
        ].map((s) => (
          <GlassCard key={s.label} padding="sm" className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5" style={{ color: s.color }}>
              {s.icon}
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#555570]">
                {s.label}
              </span>
            </div>
            <span className="text-lg font-bold" style={{ color: s.color }}>
              {s.value}
            </span>
          </GlassCard>
        ))}
      </div>

      {/* ── toolbar ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">

        {/* search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555570] pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar: Super 99, Tocumen, logística..."
            className="w-full pl-9 pr-8 py-2 rounded-lg text-sm bg-[#12121a] border border-white/[0.06] text-[#c0c0d0] placeholder:text-[#555570] outline-none focus:border-[#D4A843]/40"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#555570] hover:text-[#f0f0f5]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* segment dropdown */}
        <div className="relative">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all',
              'bg-[#12121a] border border-white/[0.06] text-[#8888a0]',
              'hover:border-white/[0.12]',
              (segment || confidence) && 'border-[#D4A843]/30 text-[#D4A843]'
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            Filtros
            {(segment || confidence) && (
              <span className="w-4 h-4 rounded-full bg-[#D4A843] text-[#0d0d1a] text-[9px] font-bold flex items-center justify-center">
                {[segment, confidence].filter(Boolean).length}
              </span>
            )}
            <ChevronDown className="w-3 h-3" />
          </button>

          <AnimatePresence>
            {filterOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setFilterOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full left-0 mt-1 z-40 w-64 rounded-xl bg-[#12121a]/95 backdrop-blur-xl border border-white/[0.08] shadow-2xl overflow-hidden p-3 space-y-3"
                >
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#555570] mb-1.5">
                      Sector
                    </label>
                    <select
                      value={segment}
                      onChange={(e) => setSegment(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg text-sm bg-[#1a1a2e] border border-white/[0.06] text-[#c0c0d0] outline-none"
                    >
                      <option value="">Todos los sectores</option>
                      {ALL_SEGMENTS.filter(Boolean).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#555570] mb-1.5">
                      Confianza
                    </label>
                    <select
                      value={confidence}
                      onChange={(e) => setConfidence(e.target.value as DekelLead['confidence'] | '')}
                      className="w-full px-2 py-1.5 rounded-lg text-sm bg-[#1a1a2e] border border-white/[0.06] text-[#c0c0d0] outline-none"
                    >
                      <option value="">Todos los niveles</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low-Medium">Low-Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#555570] mb-1.5">
                      Capacidad mínima
                    </label>
                    <select
                      value={minKwp}
                      onChange={(e) => setMinKwp(Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded-lg text-sm bg-[#1a1a2e] border border-white/[0.06] text-[#c0c0d0] outline-none"
                    >
                      <option value={0}>Sin mínimo</option>
                      <option value={250}>250 kW+</option>
                      <option value={500}>500 kW+</option>
                      <option value={1000}>1 MW+</option>
                      <option value={2000}>2 MW+</option>
                    </select>
                  </div>
                  {hasActiveFilters && (
                    <button
                      onClick={() => { resetFilters(); setFilterOpen(false); }}
                      className="w-full py-1.5 rounded-lg text-xs font-semibold text-[#ef4444] bg-[#ef4444]/5 border border-[#ef4444]/15 hover:bg-[#ef4444]/10 transition-colors"
                    >
                      Limpiar filtros
                    </button>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* sort */}
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="px-3 py-2 rounded-lg text-sm bg-[#12121a] border border-white/[0.06] text-[#8888a0] outline-none cursor-pointer hover:border-white/[0.12]"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>Ordenar: {o.label}</option>
          ))}
        </select>

        {/* view toggle */}
        <div className="flex items-center gap-1 ml-auto bg-[#12121a] border border-white/[0.06] rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-2 rounded-md transition-all',
              viewMode === 'grid'
                ? 'bg-[#D4A843]/10 text-[#D4A843]'
                : 'text-[#555570] hover:text-[#8888a0]'
            )}
            title="Vista en cuadrícula"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={cn(
              'p-2 rounded-md transition-all',
              viewMode === 'table'
                ? 'bg-[#D4A843]/10 text-[#D4A843]'
                : 'text-[#555570] hover:text-[#8888a0]'
            )}
            title="Vista en tabla"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── empty state ─────────────────────────────────────────────────────── */}
      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/[0.08] p-12 text-center">
          <Building2 className="w-10 h-10 text-[#555570] mx-auto mb-3" />
          <p className="text-sm text-[#555570]">No se encontraron resultados.</p>
          <button
            onClick={resetFilters}
            className="mt-3 text-xs text-[#D4A843] hover:underline"
          >
            Limpiar filtros
          </button>
        </div>
      )}

      {/* ── GRID VIEW ───────────────────────────────────────────────────────── */}
      {filtered.length > 0 && viewMode === 'grid' && (
        <motion.div
          key="grid"
          variants={container}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {filtered.map((lead) => (
            <LeadGridCard key={lead.rank} lead={lead} />
          ))}
        </motion.div>
      )}

      {/* ── TABLE VIEW ──────────────────────────────────────────────────────── */}
      {filtered.length > 0 && viewMode === 'table' && (
        <GlassCard padding="none">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['#', 'Cliente', 'Sector', 'Confianza', 'Fase 1', 'EPC GP', 'PPA Anual', 'PPA NPV', 'Acciones'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[10px] font-semibold text-[#555570] uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <motion.tbody variants={container} initial="hidden" animate="visible">
                {filtered.map((lead) => (
                  <motion.tr
                    key={lead.rank}
                    variants={item}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="w-6 h-6 rounded-full bg-[#D4A843]/15 border border-[#D4A843]/25 flex items-center justify-center text-[10px] font-bold text-[#D4A843]">
                        {lead.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[220px]">
                      <div className="text-sm font-medium text-[#f0f0f5] leading-tight">{lead.name}</div>
                      <div dir="rtl" className="text-[11px] text-[#555570] mt-0.5 line-clamp-2">{lead.brief}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#8888a0] max-w-[140px]">
                      <span className="line-clamp-2">{lead.segment}</span>
                    </td>
                    <td className="px-4 py-3">
                      <ConfidenceBadge value={lead.confidence} />
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-[#D4A843] whitespace-nowrap">
                      {fmtKwp(lead.kwp)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#00ffcc] whitespace-nowrap">
                      {fmtUSD(lead.epc_gp)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#8b5cf6] whitespace-nowrap">
                      {fmtUSD(lead.ppa_margin)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#0ea5e9] whitespace-nowrap">
                      {fmtUSD(lead.ppa_npv)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <a
                          href={lead.maps}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#D4A843]/10 border border-[#D4A843]/20 text-[#D4A843] hover:bg-[#D4A843]/20 transition-all whitespace-nowrap"
                        >
                          <MapPin className="w-3 h-3" />
                          Mapa
                        </a>
                        <Link
                          to="/tools/scanner"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white/[0.03] border border-white/[0.08] text-[#8888a0] hover:text-[#00ffcc] hover:border-[#00ffcc]/20 transition-all whitespace-nowrap"
                        >
                          <ScanLine className="w-3 h-3" />
                          Escanear
                        </Link>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* ── footer disclaimer ───────────────────────────────────────────────── */}
      <GlassCard padding="sm">
        <p className="text-[11px] text-[#555570] leading-relaxed">
          <span className="font-semibold text-[#8888a0]">Supuestos:</span>{' '}
          producción 1,450 kWh/kWp/año · EPC GP $250/kWp · PPA $0.13/kWh · O&M $18/kWp/año · NPV a 20 años al 10%.{' '}
          Verificación requerida: factura eléctrica 12 meses, techo, propiedad, distribuidora y aprobación autoconsumo.
        </p>
      </GlassCard>

    </div>
  );
}
