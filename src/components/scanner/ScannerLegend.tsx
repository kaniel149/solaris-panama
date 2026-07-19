/**
 * ScannerLegend — dismissible popover legend for the Panama scanner map.
 *
 * Shows:
 *   1. Roof score color ramp (red → green, 0–100)
 *   2. Land tier swatches (Comercial/Agro/Utility) in purple/blue/gold
 *   3. Grid line, substation, and data center map swatches
 *
 * Floats below the top nav bar (positioned by parent). Dark glassmorphism,
 * golden accent, Spanish labels. Dismissed via close button or clicking outside.
 */

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// ===== TYPES =====

export interface ScannerLegendProps {
  open: boolean;
  onClose: () => void;
}

// ===== HELPERS =====

const cn = (...classes: (string | boolean | undefined | null)[]) =>
  classes.filter(Boolean).join(' ');

// ===== SUB-COMPONENTS =====

function LegendSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="text-[9px] text-[#555566] uppercase tracking-wider font-semibold mb-2">
        {title}
      </div>
      {children}
    </div>
  );
}

function Swatch({ color, label, border }: { color: string; label: string; border?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-6 h-3.5 rounded shrink-0"
        style={{
          backgroundColor: color,
          border: border ? `1px solid ${border}` : undefined,
        }}
      />
      <span className="text-[11px] text-[#8888a0]">{label}</span>
    </div>
  );
}

function DashedSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-6 h-0 shrink-0 rounded"
        style={{
          borderTop: `2px dashed ${color}`,
        }}
      />
      <span className="text-[11px] text-[#8888a0]">{label}</span>
    </div>
  );
}

// ===== COMPONENT =====

export default function ScannerLegend({ open, onClose }: ScannerLegendProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.15 }}
          className={cn(
            'absolute top-[60px] right-3 z-30 w-56',
            'bg-[#0a0a0f]/96 backdrop-blur-xl',
            'border border-white/[0.08] rounded-xl shadow-2xl',
            'p-4'
          )}
          role="dialog"
          aria-label={t('tools.scanner.legend.ariaLabel')}
          aria-modal="false"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#f0f0f5]">{t('tools.scanner.legend.title')}</span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[#555566] hover:text-[#8888a0] hover:bg-white/[0.04] transition-colors"
              aria-label={t('tools.scanner.legend.close')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Section 1: Roof score ramp */}
          <LegendSection title={t('tools.scanner.legend.roofScore')}>
            {/* Gradient ramp */}
            <div className="relative mb-1.5">
              <div
                className="h-3 rounded"
                style={{
                  background:
                    'linear-gradient(to right, #ef4444, #f59e0b, #22c55e, #00ffcc)',
                }}
              />
            </div>
            <div className="flex justify-between">
              <span className="text-[9px] text-[#555566]">{t('tools.scanner.legend.scoreLow')}</span>
              <span className="text-[9px] text-[#555566]">{t('tools.scanner.legend.scoreHigh')}</span>
            </div>
            <div className="mt-2 space-y-1.5">
              <Swatch color="#00ffcc" label={t('tools.scanner.legend.gradeA')} />
              <Swatch color="#22c55e" label={t('tools.scanner.legend.gradeB')} />
              <Swatch color="#f59e0b" label={t('tools.scanner.legend.gradeC')} />
              <Swatch color="#ef4444" label={t('tools.scanner.legend.gradeD')} />
            </div>
          </LegendSection>

          {/* Divider */}
          <div className="border-t border-white/[0.05] mb-3" />

          {/* Section 2: Land tiers */}
          <LegendSection title={t('tools.scanner.legend.landTier')}>
            <div className="space-y-1.5">
              <Swatch
                color="rgba(139,92,246,0.45)"
                border="rgba(139,92,246,0.6)"
                label={t('tools.scanner.legend.tierUtility')}
              />
              <Swatch
                color="rgba(212,168,67,0.35)"
                border="rgba(212,168,67,0.5)"
                label={t('tools.scanner.legend.tierAgro')}
              />
              <Swatch
                color="rgba(59,130,246,0.35)"
                border="rgba(59,130,246,0.5)"
                label={t('tools.scanner.legend.tierCommercial')}
              />
            </div>
            <p className="text-[9px] text-[#3a3a4f] mt-1.5">
              {t('tools.scanner.legend.landTierNote')}
            </p>
          </LegendSection>

          {/* Divider */}
          <div className="border-t border-white/[0.05] mb-3" />

          {/* Section 3: Map features */}
          <LegendSection title={t('tools.scanner.legend.infrastructure')}>
            <div className="space-y-1.5">
              <DashedSwatch color="#facc15" label={t('tools.scanner.legend.gridLine')} />
              <Swatch
                color="rgba(250,204,21,0.2)"
                border="rgba(250,204,21,0.5)"
                label={t('tools.scanner.legend.substation')}
              />
              <Swatch
                color="rgba(168,85,247,0.25)"
                border="rgba(168,85,247,0.5)"
                label={t('tools.scanner.legend.dataCenter')}
              />
            </div>
          </LegendSection>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
