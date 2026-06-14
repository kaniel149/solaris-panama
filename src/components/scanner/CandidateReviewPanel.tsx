/**
 * CandidateReviewPanel — Panama port of Bustan's candidate triage queue.
 *
 * Desktop: sits inside a side panel container provided by the integrator.
 * Mobile:  designed to work inside a bottom sheet (full-width rows, no fixed
 *          positioning — the parent BottomSheet handles that).
 *
 * Behavior mirrors Bustan CandidateReviewPanel:
 *   - Scrollable rows with emoji, title, tier/grade badges, area, capacity, PV status.
 *   - Per-row ✓ approve / ✗ reject (inline reason menu).
 *   - Checkbox for bulk select → bulk approve / bulk reject bar.
 *   - "Re-escanear" applies learned filters server-side then calls onReScan.
 *   - Click row → onFocus (map highlight).
 *
 * Styling: Panama dark glassmorphism (#0a0a0f / #12121a / white/[0.06] borders,
 *          golden #D4A843 accent, cyan #00ffcc confirm, Spanish UI).
 *          Container style matches ScanRequestsPanel.tsx.
 */

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, X, Loader2, RefreshCw, CheckCircle2,
  MapPin, Zap,
} from 'lucide-react';
import type { ScanCandidate, CandidateRejectionReason } from '@/services/candidateService';

// ===== TYPES =====

export interface CandidateReviewPanelProps {
  candidates: ScanCandidate[];
  onApprove: (id: string) => void;
  onReject: (id: string, reason: CandidateRejectionReason) => void;
  onBulkApprove: (ids: string[]) => void;
  onBulkReject: (ids: string[]) => void;
  onReScan: () => void;
  onFocus: (candidate: ScanCandidate) => void;
  selectedId?: string | null;
  loading?: boolean;
  kind: 'roof' | 'land';
}

// ===== HELPERS =====

const cn = (...classes: (string | boolean | undefined | null)[]) =>
  classes.filter(Boolean).join(' ');

/** Grade → color mapping */
const GRADE_COLOR: Record<ScanCandidate['grade'], string> = {
  A: '#00E676',
  B: '#D4A843',
  C: '#f97316',
  D: '#ef4444',
};

/** Tier badge for land candidates */
const TIER_LABEL: Record<NonNullable<ScanCandidate['tier']>, { label: string; bg: string; text: string }> = {
  comercial: { label: 'Comercial', bg: 'bg-blue-500/20', text: 'text-blue-300' },
  agro: { label: 'Agro', bg: 'bg-[#D4A843]/20', text: 'text-[#D4A843]' },
  utility: { label: 'Utility', bg: 'bg-purple-500/20', text: 'text-purple-300' },
};

/** Reason options shown in the inline reject menu */
const REJECT_REASONS: { value: CandidateRejectionReason; label: string }[] = [
  { value: 'has_pv', label: 'Tiene PV' },
  { value: 'not_a_roof', label: 'No es techo' },
  { value: 'too_small', label: 'Muy pequeño' },
  { value: 'other', label: 'Otro' },
];

// ===== INLINE REJECT MENU =====

interface RejectMenuProps {
  onPick: (reason: CandidateRejectionReason) => void;
  onCancel: () => void;
}

function RejectMenu({ onPick, onCancel }: RejectMenuProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: -4 }}
      transition={{ duration: 0.12 }}
      className="flex flex-wrap gap-1"
    >
      {REJECT_REASONS.map((r) => (
        <button
          key={r.value}
          onClick={(e) => { e.stopPropagation(); onPick(r.value); }}
          className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-red-500/15 border border-red-500/25 text-red-400 hover:bg-red-500/25 transition-colors whitespace-nowrap"
        >
          {r.label}
        </button>
      ))}
      <button
        onClick={(e) => { e.stopPropagation(); onCancel(); }}
        className="px-1.5 py-0.5 rounded text-[9px] text-[#555566] hover:text-[#8888a0] border border-white/[0.06] transition-colors"
      >
        ×
      </button>
    </motion.div>
  );
}

// ===== CANDIDATE ROW =====

interface RowProps {
  candidate: ScanCandidate;
  selected: boolean;
  working: boolean;
  rejectingId: string | null;
  isFocused: boolean;
  onSelect: (id: string) => void;
  onFocus: (c: ScanCandidate) => void;
  onApprove: (id: string) => void;
  onRejectStart: (id: string) => void;
  onRejectPick: (id: string, reason: CandidateRejectionReason) => void;
  onRejectCancel: () => void;
}

function CandidateRow({
  candidate: c,
  selected,
  working,
  rejectingId,
  isFocused,
  onSelect,
  onFocus,
  onApprove,
  onRejectStart,
  onRejectPick,
  onRejectCancel,
}: RowProps) {
  const isLand = c.kind === 'land';
  const isRejectingThis = rejectingId === c.id;
  const gradeColor = GRADE_COLOR[c.grade];
  const tier = c.tier ? TIER_LABEL[c.tier] : null;
  const hasPv = c.existing_solar === true;
  const pvPending = c.existing_solar == null;

  const areaLabel = isLand
    ? `${c.area_ha.toFixed(2)} ha`
    : `${Math.round(c.area_m2).toLocaleString('es')} m²`;

  const capacityLabel = isLand
    ? c.estimated_mwp > 0 ? `${c.estimated_mwp.toFixed(1)} MWp` : '—'
    : c.estimated_kwp > 0 ? `${Math.round(c.estimated_kwp)} kWp` : '—';

  const title = c.address ?? (isLand ? 'Terreno' : 'Techo');

  return (
    <div
      className={cn(
        'flex items-start gap-2 px-3 py-2.5 border-b border-white/[0.05] transition-colors',
        isFocused && 'bg-[#D4A843]/[0.05]',
        !isFocused && selected && 'bg-white/[0.04]',
        !isFocused && !selected && 'hover:bg-white/[0.02]',
        hasPv && 'opacity-60'
      )}
    >
      {/* Checkbox */}
      <button
        onClick={() => onSelect(c.id)}
        className={cn(
          'w-4 h-4 mt-0.5 rounded border shrink-0 flex items-center justify-center transition-colors',
          selected
            ? 'bg-[#D4A843] border-[#D4A843]'
            : 'border-white/20 hover:border-white/40'
        )}
        aria-label={selected ? 'Deseleccionar' : 'Seleccionar'}
      >
        {selected && <Check size={9} className="text-black" />}
      </button>

      {/* Main info — click focuses map */}
      <button
        onClick={() => onFocus(c)}
        className="flex-1 min-w-0 text-left"
        disabled={working}
        aria-label={`Enfocar ${title} en mapa`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          <span className="text-xs shrink-0">{isLand ? '🌾' : '🏠'}</span>
          <span className="text-xs text-[#f0f0f5] truncate max-w-[90px]">{title}</span>

          {/* Tier badge (land only) */}
          {tier && (
            <span className={cn('shrink-0 px-1 py-0.5 rounded text-[8px] font-bold', tier.bg, tier.text)}>
              {tier.label}
            </span>
          )}

          {/* Grade badge */}
          <span
            className="shrink-0 px-1 py-0.5 rounded text-[8px] font-bold"
            style={{ backgroundColor: `${gradeColor}22`, color: gradeColor }}
          >
            {c.grade}
          </span>

          {/* PV badges */}
          {hasPv && (
            <span className="shrink-0 px-1 py-0.5 rounded text-[8px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              ☀️ Tiene PV
            </span>
          )}
          {!hasPv && pvPending && (
            <span className="shrink-0 text-[8px] text-white/25 italic">⏳ Verificación PV pendiente</span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-[#555566] flex items-center gap-0.5">
            <MapPin size={8} className="shrink-0" />
            {areaLabel}
          </span>
          {capacityLabel !== '—' && (
            <span className="text-[10px] text-[#D4A843] flex items-center gap-0.5">
              <Zap size={8} className="shrink-0" />
              {capacityLabel}
            </span>
          )}
        </div>
      </button>

      {/* Action buttons or reject reason menu */}
      <div className="flex items-center gap-1 shrink-0 mt-0.5">
        {working ? (
          <Loader2 size={14} className="animate-spin text-[#555566]" />
        ) : isRejectingThis ? (
          <AnimatePresence>
            <RejectMenu
              onPick={(reason) => onRejectPick(c.id, reason)}
              onCancel={onRejectCancel}
            />
          </AnimatePresence>
        ) : (
          <>
            <button
              onClick={() => onApprove(c.id)}
              className="w-7 h-7 rounded-lg bg-[#00ffcc]/10 border border-[#00ffcc]/25 text-[#00ffcc] flex items-center justify-center hover:bg-[#00ffcc]/20 transition-colors"
              aria-label="Aprobar — agregar como lead"
              title="Aprobar"
            >
              <Check size={12} />
            </button>
            <button
              onClick={() => onRejectStart(c.id)}
              className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition-colors"
              aria-label="Rechazar candidato"
              title="Rechazar"
            >
              <X size={12} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ===== MAIN PANEL =====

export default function CandidateReviewPanel({
  candidates,
  onApprove,
  onReject,
  onBulkApprove,
  onBulkReject,
  onReScan,
  onFocus,
  selectedId,
  loading = false,
  kind,
}: CandidateReviewPanelProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [bulkWorking, setBulkWorking] = useState(false);
  const [reScanWorking, setReScanWorking] = useState(false);
  // Track locally how many were approved this session for the tally badge
  const [approvedToday, setApprovedToday] = useState(0);

  // Sort by score descending (highest potential first)
  const sorted = useMemo(
    () => [...candidates].sort((a, b) => b.score - a.score),
    [candidates]
  );

  const pendingCount = sorted.length;
  const kindLabel = kind === 'land' ? 'terrenos' : 'techos';

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(sorted.map((c) => c.id)));
  }, [sorted]);

  const clearSelected = useCallback(() => setSelected(new Set()), []);

  const handleApprove = useCallback((id: string) => {
    onApprove(id);
    setApprovedToday((n) => n + 1);
    setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
  }, [onApprove]);

  const handleRejectPick = useCallback((id: string, reason: CandidateRejectionReason) => {
    setRejectingId(null);
    onReject(id, reason);
    setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
  }, [onReject]);

  const handleBulkApprove = useCallback(async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBulkWorking(true);
    onBulkApprove(ids);
    setApprovedToday((n) => n + ids.length);
    setSelected(new Set());
    setBulkWorking(false);
  }, [selected, onBulkApprove]);

  const handleBulkReject = useCallback(async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBulkWorking(true);
    onBulkReject(ids);
    setSelected(new Set());
    setBulkWorking(false);
  }, [selected, onBulkReject]);

  const handleReScan = useCallback(async () => {
    setReScanWorking(true);
    try {
      await onReScan();
    } finally {
      setReScanWorking(false);
    }
  }, [onReScan]);

  return (
    <div className="flex flex-col bg-[#0a0a0f]/95 backdrop-blur-xl overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#D4A843] shrink-0" />
          <span className="text-xs font-semibold text-[#f0f0f5]">
            Revisión de candidatos
          </span>
          <span className="text-[10px] font-bold text-[#D4A843] bg-[#D4A843]/10 rounded-full px-1.5 py-0.5">
            {pendingCount} pendientes
          </span>
          {approvedToday > 0 && (
            <span className="text-[10px] text-[#00ffcc]">
              · {approvedToday} aprobados hoy
            </span>
          )}
        </div>

        <button
          onClick={handleReScan}
          disabled={reScanWorking || loading}
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-lg border text-[9px] font-semibold transition-colors',
            'border-[#D4A843]/40 text-[#D4A843]/80 hover:border-[#D4A843]/70 hover:text-[#D4A843]',
            'disabled:opacity-40'
          )}
          title={`Re-escanear ${kindLabel} con filtros aprendidos`}
        >
          {reScanWorking
            ? <Loader2 size={9} className="animate-spin" />
            : <RefreshCw size={9} />
          }
          Re-escanear
        </button>
      </div>

      {/* ── Bulk action bar (visible when rows are selected) ── */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.02] border-b border-white/[0.05]">
              <button
                onClick={selectAll}
                className="text-[10px] text-[#555566] hover:text-[#8888a0] transition-colors"
              >
                Todos
              </button>
              <span className="text-[10px] text-[#555566] flex-1">
                {selected.size} seleccionados
              </span>
              {bulkWorking ? (
                <Loader2 size={12} className="animate-spin text-[#555566]" />
              ) : (
                <>
                  <button
                    onClick={handleBulkApprove}
                    className="px-2 py-1 rounded-lg bg-[#00ffcc]/10 border border-[#00ffcc]/25 text-[#00ffcc] text-[10px] font-semibold hover:bg-[#00ffcc]/20 transition-colors flex items-center gap-1"
                  >
                    <Check size={10} /> Aprobar
                  </button>
                  <button
                    onClick={handleBulkReject}
                    className="px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-semibold hover:bg-red-500/20 transition-colors flex items-center gap-1"
                  >
                    <X size={10} /> Rechazar
                  </button>
                  <button
                    onClick={clearSelected}
                    className="text-[10px] text-[#555566] hover:text-[#8888a0] transition-colors"
                  >
                    Limpiar
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Select-all row (when nothing selected yet) ── */}
      {selected.size === 0 && sorted.length > 0 && (
        <div className="flex items-center justify-end px-3 py-1.5 border-b border-white/[0.04]">
          <button
            onClick={selectAll}
            className="text-[10px] text-[#555566] hover:text-[#8888a0] transition-colors"
          >
            Seleccionar todos
          </button>
        </div>
      )}

      {/* ── Scrollable candidate list ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {loading && sorted.length === 0 && (
          <div className="flex items-center justify-center py-10 gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#D4A843]" />
            <span className="text-xs text-[#555566]">Cargando candidatos…</span>
          </div>
        )}

        {!loading && sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <span className="text-2xl mb-2">{kind === 'land' ? '🌾' : '🏠'}</span>
            <p className="text-xs text-[#555566]">
              No hay {kindLabel} pendientes de revisión.
            </p>
            <p className="text-[10px] text-[#3a3a4f] mt-1">
              Ejecuta un escaneo para generar candidatos.
            </p>
          </div>
        )}

        {sorted.map((c) => (
          <CandidateRow
            key={c.id}
            candidate={c}
            selected={selected.has(c.id)}
            working={false}
            rejectingId={rejectingId}
            isFocused={selectedId === c.id}
            onSelect={toggleSelect}
            onFocus={onFocus}
            onApprove={handleApprove}
            onRejectStart={(id) => setRejectingId(id)}
            onRejectPick={handleRejectPick}
            onRejectCancel={() => setRejectingId(null)}
          />
        ))}
      </div>
    </div>
  );
}
