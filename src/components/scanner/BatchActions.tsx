import { motion } from 'framer-motion';
import { UserPlus, Sparkles, Zap, Loader2 } from 'lucide-react';

interface BatchActionsProps {
  buildingCount: number;
  onSaveAllAsLeads: () => void;
  onEnrichAll: () => void;
  onAnalyzeTop: (count: number) => void;
  isSaving: boolean;
  isEnriching: boolean;
  enrichProgress: { completed: number; total: number } | null;
}

export default function BatchActions({
  buildingCount,
  onSaveAllAsLeads,
  onEnrichAll,
  onAnalyzeTop,
  isSaving,
  isEnriching,
  enrichProgress,
}: BatchActionsProps) {
  const disabled = buildingCount === 0;
  const progressPct =
    enrichProgress && enrichProgress.total > 0
      ? Math.round((enrichProgress.completed / enrichProgress.total) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
      {/* Save All as Leads */}
      <motion.button
        whileHover={disabled || isSaving ? {} : { scale: 1.01 }}
        whileTap={disabled || isSaving ? {} : { scale: 0.99 }}
        onClick={onSaveAllAsLeads}
        disabled={disabled || isSaving}
        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
          disabled || isSaving
            ? 'opacity-40 cursor-not-allowed bg-white/[0.02] text-[#8888a0] border border-white/[0.04]'
            : 'bg-[#00ffcc]/10 text-[#00ffcc] border border-[#00ffcc]/20 hover:bg-[#00ffcc]/20 hover:border-[#00ffcc]/40 hover:shadow-[0_0_20px_rgba(0,255,204,0.15)]'
        }`}
      >
        {isSaving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <UserPlus className="w-4 h-4" />
        )}
        Save All as Leads ({buildingCount})
      </motion.button>

      {/* Enrich All */}
      <div className="relative">
        <motion.button
          whileHover={disabled || isEnriching ? {} : { scale: 1.01 }}
          whileTap={disabled || isEnriching ? {} : { scale: 0.99 }}
          onClick={onEnrichAll}
          disabled={disabled || isEnriching}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            disabled || isEnriching
              ? 'opacity-40 cursor-not-allowed bg-white/[0.02] text-[#8888a0] border border-white/[0.04]'
              : 'bg-[#0ea5e9]/10 text-[#0ea5e9] border border-[#0ea5e9]/20 hover:bg-[#0ea5e9]/20 hover:border-[#0ea5e9]/40 hover:shadow-[0_0_20px_rgba(14,165,233,0.15)]'
          }`}
        >
          {isEnriching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {isEnriching
            ? `Enriching ${enrichProgress?.completed || 0}/${enrichProgress?.total || 0}`
            : `Enrich All (${buildingCount})`}
        </motion.button>

        {/* Progress bar */}
        {isEnriching && enrichProgress && enrichProgress.total > 0 && (
          <div className="mt-1.5 h-1 rounded-full bg-white/[0.04] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-[#0ea5e9]"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        )}
      </div>

      {/* Analyze Top 10 */}
      <motion.button
        whileHover={disabled ? {} : { scale: 1.01 }}
        whileTap={disabled ? {} : { scale: 0.99 }}
        onClick={() => onAnalyzeTop(10)}
        disabled={disabled}
        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
          disabled
            ? 'opacity-40 cursor-not-allowed bg-white/[0.02] text-[#8888a0] border border-white/[0.04]'
            : 'bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20 hover:bg-[#8b5cf6]/20 hover:border-[#8b5cf6]/40 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]'
        }`}
      >
        <Zap className="w-4 h-4" />
        Analyze Top 10
      </motion.button>
    </div>
  );
}
