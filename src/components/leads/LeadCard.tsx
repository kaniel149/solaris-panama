import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  MapPin,
  Phone,
  MessageCircle,
  ChevronDown,
  Sparkles,
  User,
  Zap,
  DollarSign,
  Clock,
} from 'lucide-react';
import type { Lead, LeadStatus } from '@/types/lead';
import { LEAD_STATUS_CONFIG, LEAD_KANBAN_COLUMNS } from '@/types/lead';
import { LeadSatelliteImage } from '@/components/leads/LeadSatelliteImage';

const cn = (...classes: (string | boolean | undefined | null)[]) =>
  classes.filter(Boolean).join(' ');

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);

interface LeadCardProps {
  lead: Lead;
  selected?: boolean;
  compact?: boolean; // kanban mode: hide satellite image
  onClick?: () => void;
  onCall?: (lead: Lead) => void;
  onWhatsApp?: (lead: Lead) => void;
  onStatusChange?: (lead: Lead, status: LeadStatus) => void;
  onEnrich?: (lead: Lead) => void;
}

export function LeadCard({
  lead,
  selected,
  compact = false,
  onClick,
  onCall,
  onWhatsApp,
  onStatusChange,
  onEnrich,
}: LeadCardProps) {
  const [statusOpen, setStatusOpen] = useState(false);
  const statusConfig = LEAD_STATUS_CONFIG[lead.status];
  const displayName = lead.enrichment?.businessName || lead.buildingName;
  const ownerName = lead.enrichment?.ownerName;
  const phone = lead.enrichment?.phone;
  const hasEnrichment = !!lead.enrichment;

  return (
    <motion.div
      whileHover={{ scale: 1.01, borderColor: 'rgba(255,255,255,0.12)' }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'rounded-xl overflow-hidden cursor-pointer transition-colors duration-200',
        'bg-[#12121a]/80 backdrop-blur-xl border',
        selected
          ? 'border-[#00ffcc]/40 shadow-[0_0_16px_rgba(0,255,204,0.08)]'
          : 'border-white/[0.06] hover:border-white/[0.12]'
      )}
    >
      {/* Satellite Image (skip in compact/kanban mode) */}
      {!compact && (
        <div onClick={onClick}>
          <LeadSatelliteImage
            lat={lead.center.lat}
            lng={lead.center.lng}
            zoom={18}
            size="400x200"
            aspectRatio="16/9"
          />
        </div>
      )}

      <div className="p-3.5" onClick={onClick}>
        {/* Name + Type */}
        <div className="flex items-start gap-2.5 mb-2">
          <div className="w-7 h-7 rounded-lg bg-[#8b5cf6]/10 flex items-center justify-center shrink-0 mt-0.5">
            <Building2 className="w-3.5 h-3.5 text-[#8b5cf6]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-[#f0f0f5] truncate">
              {displayName}
            </h3>
            <span className="text-[11px] text-[#555570] capitalize">
              {lead.buildingType} &middot; {Math.round(lead.area).toLocaleString()} m&sup2;
            </span>
          </div>
        </div>

        {/* Owner / Contact row */}
        {(ownerName || phone) && (
          <div className="flex items-center gap-2 mb-2 ml-[38px]">
            {ownerName && (
              <span className="flex items-center gap-1 text-[11px] text-[#8888a0] truncate">
                <User className="w-2.5 h-2.5 text-[#0ea5e9]" />
                {ownerName}
              </span>
            )}
            {ownerName && phone && (
              <span className="text-[#555570] text-[10px]">|</span>
            )}
            {phone && (
              <span className="text-[11px] text-[#8888a0] truncate">
                {phone}
              </span>
            )}
          </div>
        )}

        {/* Financial metrics row */}
        <div className="flex items-center gap-3 mb-3 ml-[38px]">
          <span className="flex items-center gap-1 text-[11px] text-[#c0c0d0]">
            <Zap className="w-2.5 h-2.5 text-[#f59e0b]" />
            {lead.estimatedSystemKwp} kWp
          </span>
          <span className="flex items-center gap-1 text-[11px] text-[#c0c0d0]">
            <DollarSign className="w-2.5 h-2.5 text-[#22c55e]" />
            {fmtCurrency(lead.estimatedInvestment)}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-[#c0c0d0]">
            <Clock className="w-2.5 h-2.5 text-[#0ea5e9]" />
            {lead.estimatedPaybackYears} yrs
          </span>
        </div>
      </div>

      {/* Bottom action bar */}
      <div
        className="flex items-center justify-between px-3.5 pb-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Status badge + dropdown */}
        <div className="relative">
          <button
            onClick={() => setStatusOpen(!statusOpen)}
            className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full transition-all hover:ring-1 hover:ring-white/[0.1]"
            style={{
              backgroundColor: statusConfig.bgColor,
              color: statusConfig.color,
            }}
          >
            {statusConfig.label}
            <ChevronDown className="w-2.5 h-2.5" />
          </button>

          <AnimatePresence>
            {statusOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setStatusOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full left-0 mb-1 z-40 w-36 rounded-lg bg-[#12121a]/95 backdrop-blur-xl border border-white/[0.06] shadow-2xl overflow-hidden"
                >
                  {LEAD_KANBAN_COLUMNS.map((s) => {
                    const config = LEAD_STATUS_CONFIG[s];
                    return (
                      <button
                        key={s}
                        onClick={() => {
                          onStatusChange?.(lead, s);
                          setStatusOpen(false);
                        }}
                        className={cn(
                          'w-full px-3 py-2 text-left text-[11px] transition-colors flex items-center gap-2',
                          lead.status === s
                            ? 'bg-white/[0.04]'
                            : 'hover:bg-white/[0.04]'
                        )}
                        style={{
                          color: lead.status === s ? config.color : '#c0c0d0',
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: config.color }}
                        />
                        {config.label}
                      </button>
                    );
                  })}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-1">
          {phone && (
            <button
              onClick={() => onCall?.(lead)}
              className="w-7 h-7 rounded-md flex items-center justify-center bg-[#22c55e]/10 hover:bg-[#22c55e]/20 transition-colors"
              title="Call"
            >
              <Phone className="w-3 h-3 text-[#22c55e]" />
            </button>
          )}
          {phone && (
            <button
              onClick={() => onWhatsApp?.(lead)}
              className="w-7 h-7 rounded-md flex items-center justify-center bg-[#25d366]/10 hover:bg-[#25d366]/20 transition-colors"
              title="WhatsApp"
            >
              <MessageCircle className="w-3 h-3 text-[#25d366]" />
            </button>
          )}
          {!hasEnrichment && (
            <button
              onClick={() => onEnrich?.(lead)}
              className="w-7 h-7 rounded-md flex items-center justify-center bg-[#8b5cf6]/10 hover:bg-[#8b5cf6]/20 transition-colors"
              title="Enrich"
            >
              <Sparkles className="w-3 h-3 text-[#8b5cf6]" />
            </button>
          )}
        </div>

        {/* Zone indicator */}
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
