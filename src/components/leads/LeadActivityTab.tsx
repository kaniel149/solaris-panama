import { useState, useMemo } from 'react';
import { LeadActivityLog } from '@/components/leads/LeadActivityLog';
import type { LeadActivity, LeadActivityType } from '@/types/leadActivity';

const FILTER_OPTIONS: Array<{ label: string; types: LeadActivityType[] }> = [
  { label: 'All', types: [] },
  { label: 'Research', types: ['enriched', 'owner_researched'] },
  { label: 'Contact', types: ['call_made', 'whatsapp_sent'] },
  { label: 'Status', types: ['status_changed'] },
  { label: 'Proposals', types: ['proposal_generated', 'proposal_sent'] },
  { label: 'Other', types: ['created', 'note_added', 'tag_added', 'tag_removed', 'exported'] },
];

interface LeadActivityTabProps {
  activities: LeadActivity[];
}

export function LeadActivityTab({ activities }: LeadActivityTabProps) {
  const [filterIdx, setFilterIdx] = useState(0);

  const filteredActivities = useMemo(() => {
    const filter = FILTER_OPTIONS[filterIdx];
    if (filter.types.length === 0) return activities;
    return activities.filter((a) => filter.types.includes(a.type));
  }, [activities, filterIdx]);

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTER_OPTIONS.map((opt, i) => {
          const isActive = filterIdx === i;
          const count = opt.types.length === 0
            ? activities.length
            : activities.filter((a) => opt.types.includes(a.type)).length;
          return (
            <button
              key={opt.label}
              onClick={() => setFilterIdx(i)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all border ${
                isActive
                  ? 'bg-[#00ffcc]/10 text-[#00ffcc] border-[#00ffcc]/30'
                  : 'bg-white/[0.03] text-[#555570] border-white/[0.06] hover:text-[#8888a0]'
              }`}
            >
              {opt.label}
              {count > 0 && (
                <span className="ml-1.5 text-[10px] opacity-70">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Full activity log (no max limit) */}
      <LeadActivityLog activities={filteredActivities} maxVisible={999} />
    </div>
  );
}
