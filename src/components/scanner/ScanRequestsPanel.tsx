import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radar, ChevronDown, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { ScanRequest } from '@/services/scannerRpcService';

interface ScanRequestsPanelProps {
  requests: ScanRequest[];
}

// status -> color + icon + i18n label key
const STATUS_META: Record<
  ScanRequest['status'],
  { color: string; labelKey: string; icon: React.ReactNode; spin?: boolean }
> = {
  queued: {
    color: '#f59e0b',
    labelKey: 'tools.scanner.requests.statusQueued',
    icon: <Clock className="w-3 h-3" />,
  },
  running: {
    color: '#0ea5e9',
    labelKey: 'tools.scanner.requests.statusRunning',
    icon: <Loader2 className="w-3 h-3 animate-spin" />,
    spin: true,
  },
  done: {
    color: '#22c55e',
    labelKey: 'tools.scanner.requests.statusDone',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  failed: {
    color: '#ef4444',
    labelKey: 'tools.scanner.requests.statusFailed',
    icon: <XCircle className="w-3 h-3" />,
  },
};

function shortId(id: string): string {
  return id.slice(0, 8);
}

function leadsLabel(req: ScanRequest, t: TFunction): string | null {
  if (req.status !== 'done') return null;
  const counts = req.counts || {};
  const inserted = Number(counts.inserted ?? counts.kept ?? counts.found ?? 0);
  if (!Number.isFinite(inserted)) return null;
  return t('tools.scanner.requests.leadsCount', { count: inserted });
}

export default function ScanRequestsPanel({ requests }: ScanRequestsPanelProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);

  if (requests.length === 0) return null;

  const activeCount = requests.filter(
    (r) => r.status === 'queued' || r.status === 'running'
  ).length;

  return (
    <div className="absolute bottom-4 left-3 z-20 w-[252px]">
      <div className="rounded-xl bg-[#12121a]/85 backdrop-blur-xl border border-white/[0.06] overflow-hidden">
        {/* Header — collapse toggle */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-white/[0.03] transition-colors"
        >
          <Radar className="w-4 h-4 text-[#00ffcc] shrink-0" />
          <span className="text-xs font-semibold text-[#f0f0f5] flex-1 text-left">
            {t('tools.scanner.requests.title')}
          </span>
          {activeCount > 0 && (
            <span className="text-[10px] font-bold text-[#0ea5e9] bg-[#0ea5e9]/10 rounded-full px-1.5 py-0.5">
              {t('tools.scanner.requests.activeCount', { count: activeCount })}
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-[#555566] shrink-0 transition-transform ${open ? '' : '-rotate-90'}`}
          />
        </button>

        {/* Rows */}
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="px-1.5 pb-1.5 max-h-[240px] overflow-y-auto space-y-1">
                {requests.map((req) => {
                  const meta = STATUS_META[req.status];
                  const leads = leadsLabel(req, t);
                  return (
                    <div
                      key={req.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.02]"
                    >
                      <span className="text-[11px] font-mono text-[#8888a0] shrink-0">
                        {shortId(req.id)}
                      </span>
                      <span
                        className="flex items-center gap-1 text-[10px] font-medium rounded-full px-1.5 py-0.5 shrink-0"
                        style={{ color: meta.color, backgroundColor: `${meta.color}1a` }}
                      >
                        {meta.icon}
                        {t(meta.labelKey)}
                      </span>
                      <span className="flex-1 text-right text-[10px] text-[#8888a0] truncate">
                        {leads ?? (req.status === 'failed' && req.error ? t('tools.scanner.requests.errorLabel') : '')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
