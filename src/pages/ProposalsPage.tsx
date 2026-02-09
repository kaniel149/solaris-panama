import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Sparkles,
  Search,
  Eye,
  MoreHorizontal,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  Zap,
  Trash2,
  ArrowUpDown,
  X,
  MessageCircle,
} from 'lucide-react';
import {
  getAllProposals,
  getProposalStats,
  updateProposalStatus,
  deleteProposal,
  type StoredProposal,
} from '@/services/leadProposalService';
import { getLead } from '@/services/leadStorageService';
import ProposalPreview from '@/components/leads/ProposalPreview';

const cn = (...classes: (string | boolean | undefined | null)[]) =>
  classes.filter(Boolean).join(' ');

type ProposalStatusFilter = StoredProposal['status'] | 'all';
type SortKey = 'date' | 'investment' | 'status' | 'client';

const STATUS_FILTERS: { key: ProposalStatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Sent' },
  { key: 'viewed', label: 'Viewed' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'rejected', label: 'Rejected' },
];

const statusConfig: Record<StoredProposal['status'], { color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  draft: { color: 'text-white/50', bg: 'bg-white/10', icon: Clock },
  sent: { color: 'text-blue-400', bg: 'bg-blue-500/20', icon: Send },
  viewed: { color: 'text-amber-400', bg: 'bg-amber-500/20', icon: Eye },
  accepted: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', icon: CheckCircle2 },
  rejected: { color: 'text-red-400', bg: 'bg-red-500/20', icon: XCircle },
};

const STATUS_ORDER: Record<StoredProposal['status'], number> = {
  draft: 0, sent: 1, viewed: 2, accepted: 3, rejected: 4,
};

function formatCurrency(n: number): string {
  if (Math.abs(n) >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M';
  return '$' + Math.round(n).toLocaleString('en-US');
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const ProposalsPage: React.FC = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProposalStatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [selectedProposal, setSelectedProposal] = useState<StoredProposal | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  // Read from localStorage (re-read on changes)
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const allProposals = useMemo(() => getAllProposals(), [refreshKey]);
  const stats = useMemo(() => getProposalStats(), [refreshKey]);

  const filtered = useMemo(() => {
    let result = allProposals;

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.clientName.toLowerCase().includes(q) ||
          p.coverTitle.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter);
    }

    // Sort
    switch (sortBy) {
      case 'date':
        result = [...result].sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
        break;
      case 'investment':
        result = [...result].sort((a, b) => b.totalInvestment - a.totalInvestment);
        break;
      case 'status':
        result = [...result].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
        break;
      case 'client':
        result = [...result].sort((a, b) => a.clientName.localeCompare(b.clientName));
        break;
    }

    return result;
  }, [allProposals, search, statusFilter, sortBy]);

  const handleStatusChange = useCallback(
    (id: string, status: StoredProposal['status']) => {
      const sentAt = status === 'sent' ? new Date().toISOString() : undefined;
      updateProposalStatus(id, status, sentAt);
      setActionMenuId(null);
      refresh();
    },
    [refresh]
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteProposal(id);
      setActionMenuId(null);
      if (selectedProposal?.id === id) setSelectedProposal(null);
      refresh();
    },
    [refresh, selectedProposal]
  );

  const handleWhatsApp = useCallback(
    (proposal: StoredProposal) => {
      const lead = getLead(proposal.leadId);
      const phone = lead?.enrichment?.phone || '';
      const text = [
        `Propuesta Solar - ${proposal.clientName}`,
        '',
        `Sistema: ${proposal.systemKwp} kWp`,
        `Inversion: ${formatCurrency(proposal.totalInvestment)}`,
        `Ahorro anual: ${formatCurrency(proposal.annualSavings)}`,
        `Recuperacion: ${proposal.paybackYears.toFixed(1)} anos`,
        '',
        'Generado por Solaris Panama',
      ].join('\n');
      const encoded = encodeURIComponent(text);
      const url = phone
        ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${encoded}`
        : `https://wa.me/?text=${encoded}`;
      window.open(url, '_blank');
    },
    []
  );

  // ===== Selected proposal detail view =====
  if (selectedProposal) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedProposal(null)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#8888a0] bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all"
          >
            <X className="w-3.5 h-3.5" />
            Back to List
          </button>
          <h2 className="text-lg font-bold text-white">{selectedProposal.clientName}</h2>
        </div>
        <ProposalPreview
          proposal={selectedProposal}
          onWhatsApp={() => handleWhatsApp(selectedProposal)}
          onStatusChange={(status) => {
            handleStatusChange(selectedProposal.id, status);
            setSelectedProposal({ ...selectedProposal, status });
          }}
        />
      </div>
    );
  }

  // ===== Empty state =====
  if (allProposals.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00ffcc]/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-[#00ffcc]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{t('proposals.title', 'Proposals')}</h1>
            <p className="text-sm text-white/40">{t('proposals.subtitle', 'Generate and track solar proposals')}</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-20 rounded-xl bg-[#12121a]/80 border border-white/[0.06]">
          <FileText className="w-12 h-12 text-white/10 mb-4" />
          <h3 className="text-lg font-semibold text-white/60 mb-2">No proposals yet</h3>
          <p className="text-sm text-white/30 max-w-md text-center mb-6">
            Generate proposals from the Lead Detail page or use the AI Proposal Generator tool.
            Proposals linked to leads will appear here.
          </p>
          <a
            href="/proposal-generator"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00ffcc] to-[#00e6b8] text-[#0a0a0f] font-semibold text-sm hover:shadow-lg hover:shadow-[#00ffcc]/20 transition-shadow"
          >
            <Sparkles className="w-4 h-4" />
            Go to Proposal Generator
          </a>
        </div>
      </div>
    );
  }

  // ===== Main list view =====
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00ffcc]/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-[#00ffcc]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{t('proposals.title', 'Proposals')}</h1>
            <p className="text-sm text-white/40">{t('proposals.subtitle', 'Generate and track solar proposals')}</p>
          </div>
        </div>
        <a
          href="/proposal-generator"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00ffcc] to-[#00e6b8] text-[#0a0a0f] font-semibold text-sm hover:shadow-lg hover:shadow-[#00ffcc]/20 transition-shadow"
        >
          <Sparkles className="w-4 h-4" />
          {t('proposals.generate', 'Generate Proposal')}
        </a>
      </div>

      {/* Stats */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-5 gap-4"
      >
        {[
          { label: 'Total', value: stats.total, icon: FileText, color: '#8b5cf6' },
          { label: 'Drafts', value: stats.draft, icon: Clock, color: '#f59e0b' },
          { label: 'Sent', value: stats.sent, icon: Send, color: '#0ea5e9' },
          { label: 'Accepted', value: stats.accepted, icon: CheckCircle2, color: '#10b981' },
          { label: 'Conversion', value: `${stats.conversionRate}%`, icon: TrendingUp, color: '#00ffcc' },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            variants={fadeUp}
            className="bg-[#12121a]/80 backdrop-blur-sm border border-white/[0.06] rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              <span className="text-xs text-white/40">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-white tabular-nums">{stat.value}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Search + filters + sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('proposals.search', 'Search by client name...')}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:border-[#00ffcc]/40 transition-colors text-sm"
          />
        </div>
        <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          {STATUS_FILTERS.map((sf) => (
            <button
              key={sf.key}
              onClick={() => setStatusFilter(sf.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                statusFilter === sf.key
                  ? 'bg-[#00ffcc]/20 text-[#00ffcc]'
                  : 'text-white/40 hover:text-white/60'
              )}
            >
              {sf.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <button
            onClick={() => {
              const keys: SortKey[] = ['date', 'investment', 'status', 'client'];
              const idx = keys.indexOf(sortBy);
              setSortBy(keys[(idx + 1) % keys.length]);
            }}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-xs text-white/60 hover:text-white/80 transition-colors"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            Sort: {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}
          </button>
        </div>
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#12121a]/80 backdrop-blur-sm border border-white/[0.06] rounded-xl overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Client', 'System', 'Investment', 'Savings', 'Payback', 'Status', 'Date', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-white/30 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((proposal, i) => {
                const sc = statusConfig[proposal.status];
                const StatusIcon = sc.icon;
                return (
                  <motion.tr
                    key={proposal.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-pointer"
                    onClick={() => setSelectedProposal(proposal)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white/80">{proposal.clientName}</span>
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#8b5cf6]/20 text-[#8b5cf6] text-[10px] font-semibold">
                          <Zap className="w-2.5 h-2.5" />
                          v{proposal.version}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-white/50 tabular-nums">{proposal.systemKwp} kWp</td>
                    <td className="px-4 py-3 text-sm text-white/60 font-medium tabular-nums">{formatCurrency(proposal.totalInvestment)}</td>
                    <td className="px-4 py-3 text-sm text-[#22c55e] font-medium tabular-nums">{formatCurrency(proposal.annualSavings)}/yr</td>
                    <td className="px-4 py-3 text-sm text-white/50 tabular-nums">{proposal.paybackYears.toFixed(1)} yrs</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium', sc.bg, sc.color)}>
                        <StatusIcon className="w-3 h-3" />
                        {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/30">
                      {new Date(proposal.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedProposal(proposal)}
                          className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
                          title="View"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleWhatsApp(proposal)}
                          className="p-1.5 rounded-lg text-white/30 hover:text-[#25d366] hover:bg-[#25d366]/10 transition-colors"
                          title="WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => setActionMenuId(actionMenuId === proposal.id ? null : proposal.id)}
                            className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                          <AnimatePresence>
                            {actionMenuId === proposal.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-0 top-8 z-20 w-44 rounded-xl bg-[#1a1a24] border border-white/[0.08] shadow-xl overflow-hidden"
                              >
                                {proposal.status === 'draft' && (
                                  <button
                                    onClick={() => handleStatusChange(proposal.id, 'sent')}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-blue-400 hover:bg-white/[0.04] transition-colors"
                                  >
                                    <Send className="w-3 h-3" />
                                    Mark as Sent
                                  </button>
                                )}
                                {(proposal.status === 'sent' || proposal.status === 'viewed') && (
                                  <>
                                    <button
                                      onClick={() => handleStatusChange(proposal.id, 'accepted')}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-emerald-400 hover:bg-white/[0.04] transition-colors"
                                    >
                                      <CheckCircle2 className="w-3 h-3" />
                                      Mark Accepted
                                    </button>
                                    <button
                                      onClick={() => handleStatusChange(proposal.id, 'rejected')}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-white/[0.04] transition-colors"
                                    >
                                      <XCircle className="w-3 h-3" />
                                      Mark Rejected
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => handleDelete(proposal.id)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors border-t border-white/[0.06]"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Delete
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <FileText className="w-8 h-8 text-white/10 mx-auto mb-2" />
                    <p className="text-sm text-white/30">{t('proposals.noResults', 'No proposals found')}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default ProposalsPage;
