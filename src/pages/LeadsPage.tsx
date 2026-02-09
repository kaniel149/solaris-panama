import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  Download,
  Search,
  LayoutGrid,
  List,
  Filter,
  Building2,
  Zap,
  DollarSign,
  TrendingUp,
  ChevronDown,
  MapPin,
} from 'lucide-react';
import { useLeadManager } from '@/hooks/useLeadManager';
import { LeadCard } from '@/components/leads/LeadCard';
import { LeadExportDialog } from '@/components/leads/LeadExportDialog';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatsCard } from '@/components/ui/StatsCard';
import type { Lead, LeadStatus } from '@/types/lead';
import { LEAD_STATUS_CONFIG, LEAD_KANBAN_COLUMNS } from '@/types/lead';
import { buildWhatsAppUrl, buildCallUrl } from '@/services/ownerResearchService';

const cn = (...classes: (string | boolean | undefined | null)[]) =>
  classes.filter(Boolean).join(' ');

type ViewMode = 'kanban' | 'table';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

function getScoreColor(score: number): string {
  if (score >= 75) return '#00ffcc';
  if (score >= 55) return '#22c55e';
  if (score >= 35) return '#f59e0b';
  return '#ef4444';
}

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);

const fmtNumber = (n: number) =>
  new Intl.NumberFormat('en-US').format(n);

export default function LeadsPage() {
  const navigate = useNavigate();
  const {
    leads,
    allLeads,
    stats,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    updateLeadStatus,
    enrichLead,
    logCallMade,
    logWhatsAppSent,
  } = useLeadManager();

  // Quick action handlers for LeadCard
  const handleCall = (lead: Lead) => {
    if (!lead.enrichment?.phone) return;
    window.open(buildCallUrl(lead.enrichment.phone), '_self');
    logCallMade(lead.id, lead.enrichment.phone);
  };

  const handleWhatsApp = (lead: Lead) => {
    if (!lead.enrichment?.phone) return;
    const url = buildWhatsAppUrl(
      lead.enrichment.phone,
      lead.enrichment?.businessName || undefined
    );
    window.open(url, '_blank');
    logWhatsAppSent(lead.id, lead.enrichment.phone);
  };

  const handleStatusChange = (lead: Lead, status: LeadStatus) => {
    updateLeadStatus(lead.id, status);
  };

  const handleEnrich = (lead: Lead) => {
    enrichLead(lead.id);
  };

  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [exportOpen, setExportOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  // Group leads by status for Kanban
  const kanbanData = useMemo(() => {
    const groups: Record<LeadStatus, typeof leads> = {
      new: [],
      contacted: [],
      qualified: [],
      proposal_sent: [],
      won: [],
      lost: [],
    };
    for (const lead of leads) {
      groups[lead.status].push(lead);
    }
    return groups;
  }, [leads]);

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00ffcc]/10 flex items-center justify-center border border-[#00ffcc]/20">
            <Target className="w-5 h-5 text-[#00ffcc]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#f0f0f5]">Lead Pipeline</h1>
            <p className="text-xs text-[#555570]">Manage solar prospects from discovery to close</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<Download className="w-4 h-4" />}
            onClick={() => setExportOpen(true)}
            disabled={allLeads.length === 0}
          >
            Export
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      {stats.total > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatsCard
            label="Total Leads"
            value={stats.total}
            icon={<Building2 className="w-4 h-4" />}
          />
          <StatsCard
            label="Avg Score"
            value={stats.avgScore}
            icon={<TrendingUp className="w-4 h-4" />}
          />
          <StatsCard
            label="Total kWp"
            value={stats.totalKwp}
            suffix=" kWp"
            icon={<Zap className="w-4 h-4" />}
          />
          <StatsCard
            label="Pipeline Value"
            value={stats.totalInvestment}
            format="currency"
            icon={<DollarSign className="w-4 h-4" />}
          />
          <StatsCard
            label="Annual Savings"
            value={stats.totalAnnualSavings}
            format="currency"
            icon={<DollarSign className="w-4 h-4" />}
          />
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search leads..."
          showShortcut={false}
          className="w-full sm:w-72"
        />

        {/* Status filter */}
        <div className="relative">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all',
              'bg-[#12121a] border border-white/[0.06] text-[#8888a0]',
              'hover:border-white/[0.12]',
              statusFilter !== 'all' && 'border-[#00ffcc]/30 text-[#00ffcc]'
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            {statusFilter === 'all'
              ? 'All Status'
              : LEAD_STATUS_CONFIG[statusFilter].label}
            <ChevronDown className="w-3 h-3" />
          </button>

          <AnimatePresence>
            {filterOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setFilterOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full left-0 mt-1 z-40 w-48 rounded-xl bg-[#12121a]/95 backdrop-blur-xl border border-white/[0.06] shadow-2xl overflow-hidden"
                >
                  <button
                    onClick={() => {
                      setStatusFilter('all');
                      setFilterOpen(false);
                    }}
                    className={cn(
                      'w-full px-4 py-2.5 text-left text-sm transition-colors',
                      statusFilter === 'all'
                        ? 'text-[#00ffcc] bg-[#00ffcc]/5'
                        : 'text-[#c0c0d0] hover:bg-white/[0.04]'
                    )}
                  >
                    All Status
                  </button>
                  {LEAD_KANBAN_COLUMNS.map((status) => {
                    const config = LEAD_STATUS_CONFIG[status];
                    return (
                      <button
                        key={status}
                        onClick={() => {
                          setStatusFilter(status);
                          setFilterOpen(false);
                        }}
                        className={cn(
                          'w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center gap-2',
                          statusFilter === status
                            ? 'bg-white/[0.04]'
                            : 'hover:bg-white/[0.04]'
                        )}
                        style={{
                          color:
                            statusFilter === status
                              ? config.color
                              : undefined,
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: config.color }}
                        />
                        <span className={statusFilter === status ? '' : 'text-[#c0c0d0]'}>
                          {config.label}
                        </span>
                      </button>
                    );
                  })}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Sort selector */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="px-3 py-2 rounded-lg text-sm bg-[#12121a] border border-white/[0.06] text-[#8888a0] outline-none cursor-pointer hover:border-white/[0.12]"
        >
          <option value="score">Sort: Score</option>
          <option value="date">Sort: Date</option>
          <option value="area">Sort: Area</option>
          <option value="name">Sort: Name</option>
        </select>

        {/* View toggle */}
        <div className="flex items-center gap-1 ml-auto bg-[#12121a] border border-white/[0.06] rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('kanban')}
            className={cn(
              'p-2 rounded-md transition-all',
              viewMode === 'kanban'
                ? 'bg-[#00ffcc]/10 text-[#00ffcc]'
                : 'text-[#555570] hover:text-[#8888a0]'
            )}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={cn(
              'p-2 rounded-md transition-all',
              viewMode === 'table'
                ? 'bg-[#00ffcc]/10 text-[#00ffcc]'
                : 'text-[#555570] hover:text-[#8888a0]'
            )}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {allLeads.length === 0 ? (
        <EmptyState
          icon={<Target className="w-12 h-12" />}
          title="No leads yet"
          description="Use the Roof Scanner to discover buildings and save them as leads."
          action={
            <Button
              variant="primary"
              icon={<Search className="w-4 h-4" />}
              onClick={() => navigate('/tools/scanner')}
            >
              Go to Scanner
            </Button>
          }
        />
      ) : leads.length === 0 ? (
        <EmptyState
          icon={<Filter className="w-12 h-12" />}
          title="No leads match your filters"
          description="Try adjusting your search or filter criteria."
          action={
            <Button
              variant="ghost"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
            >
              Clear Filters
            </Button>
          }
        />
      ) : viewMode === 'kanban' ? (
        /* ===== KANBAN VIEW ===== */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {LEAD_KANBAN_COLUMNS.map((status) => {
            const config = LEAD_STATUS_CONFIG[status];
            const columnLeads = kanbanData[status];

            return (
              <div
                key={status}
                className="flex-shrink-0 w-[280px]"
              >
                {/* Column header */}
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: config.color }}
                  />
                  <span className="text-sm font-semibold text-[#f0f0f5]">
                    {config.label}
                  </span>
                  <span className="text-xs text-[#555570] ml-auto">
                    {columnLeads.length}
                  </span>
                </div>

                {/* Column body */}
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-2.5"
                >
                  {columnLeads.map((lead) => (
                    <motion.div key={lead.id} variants={itemVariants}>
                      <LeadCard
                        lead={lead}
                        compact
                        onClick={() => navigate(`/leads/${lead.id}`)}
                        onCall={handleCall}
                        onWhatsApp={handleWhatsApp}
                        onStatusChange={handleStatusChange}
                        onEnrich={handleEnrich}
                      />
                    </motion.div>
                  ))}
                  {columnLeads.length === 0 && (
                    <div className="rounded-xl border border-dashed border-white/[0.06] p-6 text-center">
                      <span className="text-xs text-[#555570]">No leads</span>
                    </div>
                  )}
                </motion.div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ===== TABLE VIEW ===== */
        <GlassCard padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Name', 'Zone', 'Area', 'Score', 'System kWp', 'Investment', 'Status', 'Date'].map(
                    (header) => (
                      <th
                        key={header}
                        className="px-4 py-3 text-left text-[10px] font-semibold text-[#555570] uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <motion.tbody
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {leads.map((lead) => {
                  const config = LEAD_STATUS_CONFIG[lead.status];
                  const scoreColor = getScoreColor(lead.leadScore);

                  return (
                    <motion.tr
                      key={lead.id}
                      variants={itemVariants}
                      onClick={() => navigate(`/leads/${lead.id}`)}
                      className="border-b border-white/[0.03] cursor-pointer hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Building2 className="w-4 h-4 text-[#8b5cf6] shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-[#f0f0f5] truncate max-w-[200px]">
                              {lead.enrichment?.businessName || lead.buildingName}
                            </div>
                            <div className="text-[11px] text-[#555570] capitalize">
                              {lead.buildingType}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {lead.zone ? (
                          <span className="flex items-center gap-1 text-xs text-[#8888a0]">
                            <MapPin className="w-3 h-3" />
                            {lead.zone}
                          </span>
                        ) : (
                          <span className="text-xs text-[#555570]">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#c0c0d0]">
                        {fmtNumber(Math.round(lead.area))} m²
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-sm font-bold"
                          style={{ color: scoreColor }}
                        >
                          {lead.leadScore}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#c0c0d0]">
                        {lead.estimatedSystemKwp.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#c0c0d0]">
                        {fmtCurrency(lead.estimatedInvestment)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 text-[10px] font-semibold rounded-full"
                          style={{
                            backgroundColor: config.bgColor,
                            color: config.color,
                          }}
                        >
                          {config.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#555570]">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </td>
                    </motion.tr>
                  );
                })}
              </motion.tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Export Dialog */}
      <LeadExportDialog
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        leads={leads}
      />
    </div>
  );
}
