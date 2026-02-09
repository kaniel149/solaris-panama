import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Sparkles,
  Search,
  ArrowRight,
  FileText,
  Tag,
  X,
  Phone,
  MessageCircle,
  Download,
  Clock,
  ChevronDown,
} from 'lucide-react';
import type { LeadActivity, LeadActivityType } from '@/types/leadActivity';
import { ACTIVITY_COLOR_MAP } from '@/types/leadActivity';

const cn = (...classes: (string | boolean | undefined | null)[]) =>
  classes.filter(Boolean).join(' ');

// Icon mapping by activity type
const ICON_COMPONENTS: Record<LeadActivityType, React.ComponentType<{ className?: string }>> = {
  created: Plus,
  enriched: Sparkles,
  owner_researched: Search,
  status_changed: ArrowRight,
  note_added: FileText,
  tag_added: Tag,
  tag_removed: X,
  call_made: Phone,
  whatsapp_sent: MessageCircle,
  exported: Download,
};

// Relative time formatter
function getRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  if (days < 30) return `${Math.floor(days / 7)}w ago`;

  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

interface LeadActivityLogProps {
  activities: LeadActivity[];
  maxVisible?: number;
  className?: string;
}

const itemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.04, duration: 0.25 },
  }),
};

export function LeadActivityLog({
  activities,
  maxVisible = 8,
  className,
}: LeadActivityLogProps) {
  const [expanded, setExpanded] = useState(false);
  const [displayActivities, setDisplayActivities] = useState<LeadActivity[]>([]);

  useEffect(() => {
    setDisplayActivities(
      expanded ? activities : activities.slice(0, maxVisible)
    );
  }, [activities, expanded, maxVisible]);

  if (activities.length === 0) {
    return (
      <div className={cn('text-center py-6', className)}>
        <Clock className="w-5 h-5 text-[#555570] mx-auto mb-2" />
        <p className="text-xs text-[#555570]">No activity yet</p>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {/* Vertical timeline line */}
      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-white/[0.06]" />

      {/* Activity items */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {displayActivities.map((activity, index) => {
            const IconComponent = ICON_COMPONENTS[activity.type];
            const color = ACTIVITY_COLOR_MAP[activity.type];

            return (
              <motion.div
                key={activity.id}
                custom={index}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, x: -8 }}
                className="flex items-start gap-3 relative"
              >
                {/* Dot / Icon */}
                <div
                  className="relative z-10 w-[23px] h-[23px] rounded-full flex items-center justify-center shrink-0 border"
                  style={{
                    backgroundColor: `${color}15`,
                    borderColor: `${color}30`,
                    color,
                  }}
                >
                  <IconComponent className="w-2.5 h-2.5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-xs text-[#c0c0d0] leading-relaxed truncate">
                    {activity.description}
                  </p>
                  <span className="text-[10px] text-[#555570]">
                    {getRelativeTime(activity.timestamp)}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Show more / less button */}
      {activities.length > maxVisible && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1.5 text-[10px] text-[#8888a0] hover:text-[#00ffcc] transition-colors ml-8"
        >
          <ChevronDown
            className={cn(
              'w-3 h-3 transition-transform',
              expanded && 'rotate-180'
            )}
          />
          {expanded ? 'Show less' : `Show ${activities.length - maxVisible} more`}
        </button>
      )}
    </div>
  );
}
