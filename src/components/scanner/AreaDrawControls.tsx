import { motion, AnimatePresence } from 'framer-motion';
import { Pentagon, Square, X } from 'lucide-react';

interface AreaDrawControlsProps {
  isDrawing: boolean;
  drawMode: 'polygon' | 'rectangle' | null;
  onStartDraw: (mode: 'polygon' | 'rectangle') => void;
  onCancelDraw: () => void;
}

export default function AreaDrawControls({
  isDrawing,
  drawMode,
  onStartDraw,
  onCancelDraw,
}: AreaDrawControlsProps) {
  return (
    <div className="flex flex-col gap-1.5 p-1.5 rounded-2xl bg-[#12121a]/80 backdrop-blur-xl border border-white/[0.06]">
      {/* Draw Polygon */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onStartDraw('polygon')}
        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
          drawMode === 'polygon'
            ? 'bg-[#00ffcc]/10 text-[#00ffcc] shadow-[0_0_12px_rgba(0,255,204,0.2)]'
            : 'text-[#8888a0] hover:bg-white/[0.06] hover:text-white/80'
        }`}
        title="Draw polygon area"
      >
        <Pentagon className="w-5 h-5" />
      </motion.button>

      {/* Draw Rectangle */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onStartDraw('rectangle')}
        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
          drawMode === 'rectangle'
            ? 'bg-[#00ffcc]/10 text-[#00ffcc] shadow-[0_0_12px_rgba(0,255,204,0.2)]'
            : 'text-[#8888a0] hover:bg-white/[0.06] hover:text-white/80'
        }`}
        title="Draw rectangle area"
      >
        <Square className="w-5 h-5" />
      </motion.button>

      {/* Cancel - visible only when drawing */}
      <AnimatePresence>
        {isDrawing && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onCancelDraw}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-[#ef4444] hover:bg-[#ef4444]/10 transition-all"
            title="Cancel drawing"
          >
            <X className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
