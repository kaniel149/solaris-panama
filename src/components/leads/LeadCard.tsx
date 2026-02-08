import { motion } from 'framer-motion';
import { Building2, MapPin } from 'lucide-react';
import type { Lead } from '@/types/lead';
import { LEAD_STATUS_CONFIG } from '@/types/lead';

const cn = (...classes: (string | boolean | undefined | null)[]) =>
  classes.filter(Boolean).join(' ');

function getScoreColor(score: number): string {
  if (score >= 75) return '#00ffcc';
  if (score >= 55) return '#22c55e';
  if (score >= 35) return '#f59e0b';
  return '#ef4444';
}

interface LeadCardProps {
  lead: Lead;
  selected?: boolean;
  onClick?: () => void;
}

export function LeadCard({ lead, selected, onClick }: LeadCardProps) {
  const statusConfig = LEAD_STATUS_CONFIG[lead.status];
  const scoreColor = getScoreColor(lead.leadScore);
  const displayName = lead.enrichment?.businessName || lead.buildingName;

  return (
    <motion.div
      whileHover={{ scale: 1.01, borderColor: 'rgba(255,255,255,0.12)' }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={onClick}
      className={cn(
        'rounded-xl p-4 cursor-pointer transition-colors duration-200',
        'bg-[#12121a]/80 backdrop-blur-xl border',
        selected
          ? 'border-[#00ffcc]/40 shadow-[0_0_16px_rgba(0,255,204,0.08)]'
          : 'border-white/[0.06] hover:border-white/[0.12]'
      )}
    >
      {/* Name + Type */}
      <div className="flex items-start gap-2.5 mb-3">
        <div className="w-7 h-7 rounded-lg bg-[#8b5cf6]/10 flex items-center justify-center shrink-0 mt-0.5">
          <Building2 className="w-3.5 h-3.5 text-[#8b5cf6]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[#f0f0f5] truncate">
            {displayName}
          </h3>
          <span className="text-[11px] text-[#555570] capitalize">
            {lead.buildingType} &middot; {Math.round(lead.area)} m²
          </span>
        </div>
      </div>

      {/* Score bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[#555570] uppercase tracking-wider">
            Score
          </span>
          <span
            className="text-xs font-bold"
            style={{ color: scoreColor }}
          >
            {lead.leadScore}
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${lead.leadScore}%`,
              backgroundColor: scoreColor,
            }}
          />
        </div>
      </div>

      {/* Status badge + zone */}
      <div className="flex items-center justify-between">
        <span
          className="px-2 py-0.5 text-[10px] font-semibold rounded-full"
          style={{
            backgroundColor: statusConfig.bgColor,
            color: statusConfig.color,
          }}
        >
          {statusConfig.label}
        </span>

        {lead.zone && (
          <span className="flex items-center gap-1 text-[10px] text-[#555570]">
            <MapPin className="w-2.5 h-2.5" />
            {lead.zone}
          </span>
        )}
      </div>
    </motion.div>
  );
}
