import { ScanLine, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface DrawToolbarProps {
  isScanning: boolean;
  onScanViewport: () => void;
  onClear: () => void;
}

export default function DrawToolbar({
  isScanning,
  onScanViewport,
  onClear,
}: DrawToolbarProps) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-1.5 p-1.5 rounded-2xl bg-[#12121a]/80 backdrop-blur-xl border border-white/[0.06]">
      {/* Scan Viewport */}
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
        title="Scan buildings in view"
      >
        <ScanLine
          className={`w-5 h-5 ${isScanning ? 'animate-spin' : ''}`}
        />
      </motion.button>

      {/* Clear All */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClear}
        className="w-10 h-10 rounded-xl flex items-center justify-center text-[#8888a0] hover:bg-white/[0.06] hover:text-white/80 transition-all"
        title="Clear all buildings"
      >
        <X className="w-5 h-5" />
      </motion.button>
    </div>
  );
}
