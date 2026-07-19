import { ScanLine, X, Radar, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface DrawToolbarProps {
  isScanning: boolean;
  onScanViewport: () => void;
  onClear: () => void;
  /** Queue an async background scan of the current viewport / drawn area. */
  onQueueScan?: () => void;
  /** True while the background-scan request is being created. */
  isQueuing?: boolean;
}

export default function DrawToolbar({
  isScanning,
  onScanViewport,
  onClear,
  onQueueScan,
  isQueuing = false,
}: DrawToolbarProps) {
  const { t } = useTranslation();
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-1.5 p-1.5 rounded-2xl bg-[#12121a]/80 backdrop-blur-xl border border-white/[0.06]">
      {/* Scan Viewport (instant) */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onScanViewport}
        disabled={isScanning}
        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
          isScanning
            ? 'bg-[#00ffcc]/10 text-[#00ffcc]'
            : 'text-[#8888a0] hover:bg-white/[0.06] hover:text-white/80'
        }`}
        title={t('tools.scanner.draw.scanTooltip')}
      >
        <ScanLine
          className={`w-5 h-5 ${isScanning ? 'animate-spin' : ''}`}
        />
      </motion.button>

      {/* Queue Background Scan (async, large areas) */}
      {onQueueScan && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onQueueScan}
          disabled={isQueuing}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            isQueuing
              ? 'bg-[#0ea5e9]/10 text-[#0ea5e9]'
              : 'text-[#8888a0] hover:bg-[#0ea5e9]/10 hover:text-[#0ea5e9]'
          }`}
          title={t('tools.scanner.draw.queueTooltip')}
        >
          {isQueuing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Radar className="w-5 h-5" />
          )}
        </motion.button>
      )}

      {/* Clear All */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClear}
        className="w-10 h-10 rounded-xl flex items-center justify-center text-[#8888a0] hover:bg-white/[0.06] hover:text-white/80 transition-all"
        title={t('tools.scanner.draw.clearTooltip')}
      >
        <X className="w-5 h-5" />
      </motion.button>
    </div>
  );
}
