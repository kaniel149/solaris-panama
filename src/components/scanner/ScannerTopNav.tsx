/**
 * ScannerTopNav — unified immersive top bar for the Panama roof/land scanner.
 *
 * Port of Bustan's FilterBar (functional parity) with Panama's dark-glass aesthetic:
 *   #0a0a0f base · #12121a/85 glass panels · white/[0.06] borders · #D4A843 golden
 *   active accent · #00ffcc confirm/cyan · Spanish UI · LTR (no RTL flip needed).
 *
 * Sections (left → right):
 *   Tipo toggle (Techos/Terrenos) · Mode tabs (Mapa/Escáner/Panel/Leads)
 *   · Zone chips (horizontally scrollable) · Grade filter (All/A/B/C/D)
 *   · Legend button
 *
 * Exports:
 *   - ScannerTopNav (default)
 *   - PANAMA_ZONES (named) — array used by the map flyTo logic
 *   - ScannerTopNavProps (type)
 */

import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Map as MapIcon, Grid, BarChart2, Users, BookOpen, ChevronLeft, ChevronRight,
  Menu as MenuIcon, Globe,
} from 'lucide-react';

// ===== TYPES =====

export type ScannerMode = 'mapa' | 'escaner' | 'panel' | 'leads';
export type ScannerTipo = 'roof' | 'land';
export type GradeFilter = 'all' | 'A' | 'B' | 'C' | 'D';

export interface PanamaZone {
  id: string;
  label: string;
  /** [lng, lat] map center for flyTo */
  center: [number, number];
  zoom: number;
}

export interface ScannerTopNavProps {
  tipo: ScannerTipo;
  onTipo: (t: ScannerTipo) => void;
  mode: ScannerMode;
  onMode: (m: ScannerMode) => void;
  zone?: string;
  onZone: (zone: PanamaZone) => void;
  gradeFilter: GradeFilter;
  onGrade: (g: GradeFilter) => void;
  onOpenLegend: () => void;
  counts?: {
    roofs: number;
    land: number;
    pending: number;
  };
}

// ===== ZONE DATA =====

/** Scan zones covering Panama's main solar markets */
export const PANAMA_ZONES: PanamaZone[] = [
  { id: 'panama-city', label: 'Ciudad de Panamá', center: [-79.52, 8.98], zoom: 12 },
  { id: 'chitre',      label: 'Chitré',            center: [-80.43, 7.96], zoom: 13 },
  { id: 'pedasi',      label: 'Pedasí',            center: [-80.03, 7.53], zoom: 13 },
  { id: 'venao',       label: 'Playa Venao',       center: [-80.19, 7.43], zoom: 13 },
  { id: 'las-tablas',  label: 'Las Tablas',        center: [-80.28, 7.77], zoom: 13 },
  { id: 'guarare',     label: 'Guararé',           center: [-80.28, 7.81], zoom: 14 },
  { id: 'tonosi',      label: 'Tonosí',            center: [-80.44, 7.40], zoom: 13 },
];

/** Translation key for each zone label — used so the display name follows the active language */
const ZONE_LABEL_KEYS: Record<string, string> = {
  'panama-city': 'tools.scanner.zones.panamaCity',
  'chitre': 'tools.scanner.zones.chitre',
  'pedasi': 'tools.scanner.zones.pedasi',
  'venao': 'tools.scanner.zones.venao',
  'las-tablas': 'tools.scanner.zones.lasTablas',
  'guarare': 'tools.scanner.zones.guarare',
  'tonosi': 'tools.scanner.zones.tonosi',
};

// ===== CONSTANTS =====

const cn = (...classes: (string | boolean | undefined | null)[]) =>
  classes.filter(Boolean).join(' ');

const MODE_DEFS: { mode: ScannerMode; tKey: string; Icon: typeof MapIcon }[] = [
  { mode: 'mapa',    tKey: 'tools.scanner.topnav.map',     Icon: MapIcon },
  { mode: 'escaner', tKey: 'tools.scanner.topnav.scanner', Icon: Grid },
  { mode: 'panel',   tKey: 'tools.scanner.topnav.panel',   Icon: BarChart2 },
  { mode: 'leads',   tKey: 'tools.scanner.topnav.leads',   Icon: Users },
];

const LANG_OPTIONS: { code: string; label: string }[] = [
  { code: 'es', label: 'ES' },
  { code: 'en', label: 'EN' },
  { code: 'he', label: 'עב' },
];

/** Grade → display color */
const GRADE_COLOR: Record<GradeFilter, string> = {
  all: '#8888a0',
  A: '#00E676',
  B: '#D4A843',
  C: '#f97316',
  D: '#ef4444',
};

// ===== SUB-COMPONENTS =====

function GlassPill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'bg-[#12121a]/85 backdrop-blur-xl border border-white/[0.06] rounded-xl overflow-hidden flex shrink-0',
        className
      )}
    >
      {children}
    </div>
  );
}

// ===== MAIN COMPONENT =====

export default function ScannerTopNav({
  tipo,
  onTipo,
  mode,
  onMode,
  zone,
  onZone,
  gradeFilter,
  onGrade,
  onOpenLegend,
  counts,
}: ScannerTopNavProps) {
  const { t, i18n } = useTranslation();
  const zoneScrollRef = useRef<HTMLDivElement>(null);

  const scrollZones = (dir: -1 | 1) => {
    if (!zoneScrollRef.current) return;
    zoneScrollRef.current.scrollBy({ left: dir * 140, behavior: 'smooth' });
  };

  const currentLang = LANG_OPTIONS.find((l) => l.code === i18n.language) ?? LANG_OPTIONS[0];

  // Cycle language on click: es → en → he → es (single click switches, no dropdown).
  const cycleLanguage = () => {
    const idx = LANG_OPTIONS.findIndex((l) => l.code === currentLang.code);
    const next = LANG_OPTIONS[(idx + 1) % LANG_OPTIONS.length];
    i18n.changeLanguage(next.code);
    try { localStorage.setItem('solaris_lang', next.code); } catch { /* ignore */ }
  };

  const handleMenuClick = () => {
    window.dispatchEvent(new CustomEvent('open-app-drawer'));
  };

  return (
    <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
      <div className="pointer-events-auto mx-3 mt-3 flex items-center gap-2 flex-wrap">

        {/* ── Hamburger / App drawer ── */}
        <button
          onClick={handleMenuClick}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-2.5 text-xs font-semibold min-h-[44px]',
            'bg-[#12121a]/85 backdrop-blur-xl border border-white/[0.06] rounded-xl',
            'text-[#555566] hover:text-[#D4A843] hover:border-[#D4A843]/25 hover:bg-white/[0.03] transition-colors'
          )}
          aria-label={t('tools.scanner.topnav.menu')}
          title={t('tools.scanner.topnav.menu')}
        >
          <MenuIcon className="w-4 h-4 shrink-0" />
        </button>

        {/* ── Tipo toggle: Techos / Terrenos ── */}
        <GlassPill>
          <button
            onClick={() => onTipo('roof')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors min-h-[44px]',
              tipo === 'roof'
                ? 'bg-[#D4A843]/15 text-[#D4A843]'
                : 'text-[#555566] hover:text-[#8888a0] hover:bg-white/[0.03]'
            )}
            aria-pressed={tipo === 'roof'}
            aria-label={t('tools.scanner.topnav.roofs')}
          >
            <span role="img" aria-hidden="true">🏠</span>
            <span className="hidden sm:inline">{t('tools.scanner.topnav.roofs')}</span>
            {counts && counts.roofs > 0 && (
              <span
                className={cn(
                  'text-[9px] font-bold rounded-full px-1.5 py-0.5 leading-none shrink-0',
                  tipo === 'roof'
                    ? 'bg-[#D4A843]/20 text-[#D4A843]'
                    : 'bg-white/[0.06] text-[#555566]'
                )}
              >
                {counts.roofs}
              </span>
            )}
          </button>
          <button
            onClick={() => onTipo('land')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors border-l border-white/[0.06] min-h-[44px]',
              tipo === 'land'
                ? 'bg-[#D4A843]/15 text-[#D4A843]'
                : 'text-[#555566] hover:text-[#8888a0] hover:bg-white/[0.03]'
            )}
            aria-pressed={tipo === 'land'}
            aria-label={t('tools.scanner.topnav.lands')}
          >
            <span role="img" aria-hidden="true">🌾</span>
            <span className="hidden sm:inline">{t('tools.scanner.topnav.lands')}</span>
            {counts && counts.land > 0 && (
              <span
                className={cn(
                  'text-[9px] font-bold rounded-full px-1.5 py-0.5 leading-none shrink-0',
                  tipo === 'land'
                    ? 'bg-[#D4A843]/20 text-[#D4A843]'
                    : 'bg-white/[0.06] text-[#555566]'
                )}
              >
                {counts.land}
              </span>
            )}
          </button>
        </GlassPill>

        {/* ── Mode tabs: Mapa / Escáner / Panel / Leads ── */}
        <GlassPill>
          {MODE_DEFS.map(({ mode: m, tKey, Icon }, idx) => {
            const isEscaner = m === 'escaner';
            const showBadge = isEscaner && counts && counts.pending > 0;
            return (
              <button
                key={m}
                onClick={() => onMode(m)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors min-h-[44px]',
                  idx > 0 && 'border-l border-white/[0.06]',
                  mode === m
                    ? 'bg-[#00ffcc]/[0.07] text-[#00ffcc]'
                    : 'text-[#555566] hover:text-[#8888a0] hover:bg-white/[0.03]'
                )}
                aria-pressed={mode === m}
                aria-label={t(tKey)}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden md:inline">{t(tKey)}</span>
                {showBadge && (
                  <span
                    className={cn(
                      'text-[9px] font-black rounded-full px-1.5 py-0.5 shrink-0 leading-none',
                      mode === m
                        ? 'bg-[#D4A843]/20 text-[#D4A843]'
                        : 'bg-[#D4A843]/15 text-[#D4A843] animate-pulse'
                    )}
                    aria-label={t('tools.scanner.topnav.pendingCandidatesAria', { count: counts!.pending })}
                  >
                    {counts!.pending > 99 ? '99+' : counts!.pending}
                  </span>
                )}
              </button>
            );
          })}
        </GlassPill>

        {/* ── Zone chips (horizontally scrollable) ── */}
        <div className="flex items-center gap-1 shrink-0 max-w-[280px] sm:max-w-[360px] md:max-w-none">
          {/* Left arrow — shown on narrow viewports */}
          <button
            onClick={() => scrollZones(-1)}
            className="shrink-0 w-7 h-[44px] flex items-center justify-center text-[#555566] hover:text-[#8888a0] transition-colors md:hidden"
            aria-label={t('tools.scanner.topnav.scrollZonesLeft')}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div
            ref={zoneScrollRef}
            className="bg-[#12121a]/85 backdrop-blur-xl border border-white/[0.06] rounded-xl overflow-x-auto flex items-center"
            style={{ scrollbarWidth: 'none' }}
            role="listbox"
            aria-label={t('tools.scanner.topnav.zonesListLabel')}
          >
            {PANAMA_ZONES.map((z) => (
              <button
                key={z.id}
                onClick={() => onZone(z)}
                className={cn(
                  'shrink-0 px-3 py-2.5 text-xs font-medium transition-colors whitespace-nowrap select-none min-h-[44px]',
                  'border-r border-white/[0.06] last:border-r-0',
                  zone === z.id
                    ? 'bg-[#D4A843]/15 text-[#D4A843]'
                    : 'text-[#555566] hover:text-[#8888a0] hover:bg-white/[0.03]'
                )}
                role="option"
                aria-selected={zone === z.id}
              >
                {t(ZONE_LABEL_KEYS[z.id])}
              </button>
            ))}
          </div>

          {/* Right arrow */}
          <button
            onClick={() => scrollZones(1)}
            className="shrink-0 w-7 h-[44px] flex items-center justify-center text-[#555566] hover:text-[#8888a0] transition-colors md:hidden"
            aria-label={t('tools.scanner.topnav.scrollZonesRight')}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* ── Grade filter: All / A / B / C / D ── */}
        <GlassPill>
          {(['all', 'A', 'B', 'C', 'D'] as const).map((g, idx) => {
            const color = GRADE_COLOR[g];
            const isActive = gradeFilter === g;
            return (
              <button
                key={g}
                onClick={() => onGrade(g)}
                className={cn(
                  'px-2.5 py-2.5 text-xs font-bold transition-all min-h-[44px] min-w-[36px]',
                  idx > 0 && 'border-l border-white/[0.06]',
                  !isActive && 'text-[#555566] hover:text-[#8888a0]'
                )}
                style={isActive ? { color, backgroundColor: `${color}18` } : undefined}
                aria-pressed={isActive}
                aria-label={t('tools.scanner.topnav.filterGradeAria', { grade: g === 'all' ? t('tools.scanner.topnav.all') : g })}
              >
                {g === 'all' ? t('tools.scanner.topnav.all') : g}
              </button>
            );
          })}
        </GlassPill>

        {/* ── Legend button ── */}
        <button
          onClick={onOpenLegend}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium min-h-[44px]',
            'bg-[#12121a]/85 backdrop-blur-xl border border-white/[0.06] rounded-xl',
            'text-[#555566] hover:text-[#8888a0] hover:bg-white/[0.03] transition-colors'
          )}
          aria-label={t('tools.scanner.topnav.legend')}
          title={t('tools.scanner.topnav.legend')}
        >
          <BookOpen className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden lg:inline">{t('tools.scanner.topnav.legend')}</span>
        </button>

        {/* ── Language switcher: single click cycles es → en → he ── */}
        <button
          onClick={cycleLanguage}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-2.5 text-xs font-bold min-h-[44px] shrink-0',
            'bg-[#12121a]/85 backdrop-blur-xl border border-white/[0.06] rounded-xl',
            'text-[#8888a0] hover:text-white hover:border-[#00ffcc]/35 hover:bg-white/[0.03] transition-colors'
          )}
          aria-label={t('tools.scanner.topnav.languageAria', { lang: currentLang.label })}
          title={t('tools.scanner.topnav.languageTitle', { lang: currentLang.label })}
        >
          <Globe className="w-3.5 h-3.5 shrink-0" />
          <span className="tracking-wider">{currentLang.label}</span>
        </button>

        {/* ── Pending badge (far right) ── */}
        {counts && counts.pending > 0 && (
          <div className="shrink-0 ml-auto bg-[#D4A843]/10 backdrop-blur-xl border border-[#D4A843]/25 rounded-xl px-3 py-2.5 flex items-center gap-1.5 min-h-[44px]">
            <div className="w-2 h-2 rounded-full bg-[#D4A843] animate-pulse shrink-0" />
            <span className="text-[11px] font-semibold text-[#D4A843] whitespace-nowrap">
              {t('tools.scanner.topnav.pendingBadge', { count: counts.pending })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
