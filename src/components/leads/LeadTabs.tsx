import { motion } from 'framer-motion';

export type LeadTab = 'overview' | 'research' | 'proposal' | 'financial' | 'activity';

const TABS: Array<{ id: LeadTab; label: string; icon: string }> = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'research', label: 'Research', icon: '🔍' },
  { id: 'proposal', label: 'Proposal', icon: '📄' },
  { id: 'financial', label: 'Financial', icon: '💰' },
  { id: 'activity', label: 'Activity', icon: '📋' },
];

interface LeadTabsProps {
  activeTab: LeadTab;
  onTabChange: (tab: LeadTab) => void;
  proposalCount?: number;
  activityCount?: number;
}

export function LeadTabs({ activeTab, onTabChange, proposalCount, activityCount }: LeadTabsProps) {
  return (
    <div className="flex gap-1 overflow-x-auto scrollbar-none border-b border-white/[0.06] pb-px">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const badge =
          tab.id === 'proposal' && proposalCount
            ? proposalCount
            : tab.id === 'activity' && activityCount
            ? activityCount
            : null;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
              isActive
                ? 'text-[#f0f0f5]'
                : 'text-[#555570] hover:text-[#8888a0]'
            }`}
          >
            <span className="flex items-center gap-2">
              {tab.label}
              {badge != null && badge > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#8b5cf6]/15 text-[#8b5cf6] font-semibold">
                  {badge}
                </span>
              )}
            </span>
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#00ffcc] rounded-full"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
