import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import type { LeadZone } from '@/types/lead';

interface ZoneSelectorProps {
  zones: LeadZone[];
  selectedZoneId: string | null;
  onSelectZone: (zoneId: string) => void;
  onClearZone: () => void;
}

const stagger = {
  animate: { transition: { staggerChildren: 0.03 } },
};

const chipVariant = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
};

export default function ZoneSelector({
  zones,
  selectedZoneId,
  onSelectZone,
  onClearZone,
}: ZoneSelectorProps) {
  return (
    <motion.div
      className="flex gap-2 overflow-x-auto scrollbar-hide py-1 px-0.5"
      variants={stagger}
      initial="initial"
      animate="animate"
    >
      {/* All / Clear chip */}
      <motion.button
        variants={chipVariant}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClearZone}
        className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
          selectedZoneId === null
            ? 'bg-[#00ffcc]/10 border border-[#00ffcc]/30 text-[#00ffcc]'
            : 'bg-white/[0.02] border border-white/[0.06] text-[#8888a0] hover:bg-white/[0.04] hover:text-[#f0f0f5]'
        }`}
      >
        <MapPin className="w-3 h-3" />
        All
      </motion.button>

      {zones.map((zone) => {
        const isSelected = selectedZoneId === zone.id;
        return (
          <motion.button
            key={zone.id}
            variants={chipVariant}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelectZone(zone.id)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              isSelected
                ? 'border text-white'
                : 'bg-white/[0.02] border border-white/[0.06] text-[#8888a0] hover:bg-white/[0.04] hover:text-[#f0f0f5]'
            }`}
            style={
              isSelected
                ? {
                    borderColor: `${zone.color}50`,
                    backgroundColor: `${zone.color}15`,
                    color: zone.color,
                  }
                : undefined
            }
          >
            <MapPin className="w-3 h-3" />
            {zone.name}
          </motion.button>
        );
      })}
    </motion.div>
  );
}
