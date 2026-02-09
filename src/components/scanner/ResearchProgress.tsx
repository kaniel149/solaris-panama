import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Loader2, Circle } from 'lucide-react';
import type { ProgressStatus } from '@/types/enrichment';

export interface ResearchStep {
  source: string;
  label: string;
  status: ProgressStatus;
  dataPoints?: number;
}

interface ResearchProgressProps {
  steps: ResearchStep[];
  overallProgress: number; // 0-100
}

function StatusIcon({ status }: { status: ProgressStatus }) {
  switch (status) {
    case 'done':
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-5 h-5 rounded-full bg-[#10b981]/15 flex items-center justify-center"
        >
          <Check className="w-3 h-3 text-[#10b981]" />
        </motion.div>
      );
    case 'error':
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-5 h-5 rounded-full bg-[#ef4444]/15 flex items-center justify-center"
        >
          <X className="w-3 h-3 text-[#ef4444]" />
        </motion.div>
      );
    case 'loading':
      return (
        <div className="w-5 h-5 flex items-center justify-center">
          <Loader2 className="w-3.5 h-3.5 text-[#00ffcc] animate-spin" />
        </div>
      );
    default:
      return (
        <div className="w-5 h-5 flex items-center justify-center">
          <Circle className="w-3 h-3 text-[#555566]" />
        </div>
      );
  }
}

export function ResearchProgress({ steps, overallProgress }: ResearchProgressProps) {
  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {steps.map((step) => (
          <motion.div
            key={step.source}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2.5"
          >
            <StatusIcon status={step.status} />
            <span
              className={`text-xs flex-1 ${
                step.status === 'loading'
                  ? 'text-[#f0f0f5]'
                  : step.status === 'done'
                  ? 'text-[#c0c0d0]'
                  : step.status === 'error'
                  ? 'text-[#555566]'
                  : 'text-[#555566]'
              }`}
            >
              {step.label}
              {step.status === 'loading' && '...'}
            </span>
            {step.status === 'done' && step.dataPoints != null && step.dataPoints > 0 && (
              <span className="text-[10px] text-[#10b981] bg-[#10b981]/10 px-1.5 py-0.5 rounded-full">
                {step.dataPoints} {step.dataPoints === 1 ? 'point' : 'points'}
              </span>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Progress bar */}
      <div className="pt-1">
        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#00ffcc] to-[#0ea5e9]"
            initial={{ width: 0 }}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-[#555566]">
            {steps.filter((s) => s.status === 'done' || s.status === 'error').length}/{steps.length} sources
          </span>
          <span className="text-[10px] text-[#8888a0]">{Math.round(overallProgress)}%</span>
        </div>
      </div>
    </div>
  );
}
