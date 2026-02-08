import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  FileText,
  Sparkles,
  Search,
  Eye,
  Download,
  MoreHorizontal,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  Zap,
} from 'lucide-react';
import type { ProposalStatus } from '@/types';

const cn = (...classes: (string | boolean | undefined | null)[]) =>
  classes.filter(Boolean).join(' ');

interface MockProposal {
  id: string;
  projectName: string;
  clientName: string;
  systemSize: number;
  totalCost: number;
  annualSavings: number;
  paybackYears: number;
  status: ProposalStatus;
  aiGenerated: boolean;
  sentAt: string | null;
  createdAt: string;
}

const STATUS_FILTERS: { key: ProposalStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Sent' },
  { key: 'viewed', label: 'Viewed' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'rejected', label: 'Rejected' },
];

const statusConfig: Record<ProposalStatus, { color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  draft: { color: 'text-white/50', bg: 'bg-white/10', icon: Clock },
  sent: { color: 'text-blue-400', bg: 'bg-blue-500/20', icon: Send },
  viewed: { color: 'text-amber-400', bg: 'bg-amber-500/20', icon: Eye },
  accepted: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', icon: CheckCircle2 },
  rejected: { color: 'text-red-400', bg: 'bg-red-500/20', icon: XCircle },
};

const MOCK_PROPOSALS: MockProposal[] = [
  {
    id: 'prop-1',
    projectName: 'Torre Motta - Rooftop 300kWp',
    clientName: 'Grupo Motta S.A.',
    systemSize: 300,
    totalCost: 285000,
    annualSavings: 72000,
    paybackYears: 3.96,
    status: 'sent',
    aiGenerated: true,
    sentAt: '2026-02-07T14:30:00Z',
    createdAt: '2026-02-06T10:00:00Z',
  },
  {
    id: 'prop-2',
    projectName: 'Hotel Riu Rooftop 450kWp',
    clientName: 'Hotel Riu Plaza Panama',
    systemSize: 450,
    totalCost: 420000,
    annualSavings: 108000,
    paybackYears: 3.89,
    status: 'viewed',
    aiGenerated: true,
    sentAt: '2026-02-05T09:00:00Z',
    createdAt: '2026-02-04T16:00:00Z',
  },
  {
    id: 'prop-3',
    projectName: 'Super 99 Multi-branch 1.2MWp',
    clientName: 'Super 99 - Multimax',
    systemSize: 1200,
    totalCost: 1080000,
    annualSavings: 280000,
    paybackYears: 3.86,
    status: 'accepted',
    aiGenerated: false,
    sentAt: '2026-01-25T11:00:00Z',
    createdAt: '2026-01-20T14:00:00Z',
  },
  {
    id: 'prop-4',
    projectName: 'Hospital Nacional 500kWp',
    clientName: 'Hospital Nacional',
    systemSize: 500,
    totalCost: 475000,
    annualSavings: 120000,
    paybackYears: 3.96,
    status: 'draft',
    aiGenerated: true,
    sentAt: null,
    createdAt: '2026-02-08T08:00:00Z',
  },
  {
    id: 'prop-5',
    projectName: 'Cerveceria Factory 800kWp',
    clientName: 'Cerveceria Nacional S.A.',
    systemSize: 800,
    totalCost: 720000,
    annualSavings: 185000,
    paybackYears: 3.89,
    status: 'sent',
    aiGenerated: true,
    sentAt: '2026-02-06T15:00:00Z',
    createdAt: '2026-02-05T10:00:00Z',
  },
  {
    id: 'prop-6',
    projectName: 'UTP Campus 350kWp',
    clientName: 'Universidad Tecnologica de Panama',
    systemSize: 350,
    totalCost: 315000,
    annualSavings: 84000,
    paybackYears: 3.75,
    status: 'rejected',
    aiGenerated: false,
    sentAt: '2026-01-28T10:00:00Z',
    createdAt: '2026-01-22T09:00:00Z',
  },
  {
    id: 'prop-7',
    projectName: 'Canal Admin Building 250kWp',
    clientName: 'Autoridad del Canal de Panama',
    systemSize: 250,
    totalCost: 240000,
    annualSavings: 62000,
    paybackYears: 3.87,
    status: 'viewed',
    aiGenerated: true,
    sentAt: '2026-02-04T11:00:00Z',
    createdAt: '2026-02-03T14:00:00Z',
  },
  {
    id: 'prop-8',
    projectName: 'Pricesmart Condado 200kWp',
    clientName: 'Pricesmart Panama',
    systemSize: 200,
    totalCost: 185000,
    annualSavings: 48000,
    paybackYears: 3.85,
    status: 'draft',
    aiGenerated: true,
    sentAt: null,
    createdAt: '2026-02-08T10:00:00Z',
  },
];

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
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | 'all'>('all');

  const filtered = useMemo(() => {
    return MOCK_PROPOSALS.filter((p) => {
      const matchesSearch =
        !search ||
        p.projectName.toLowerCase().includes(search.toLowerCase()) ||
        p.clientName.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  const stats = useMemo(() => {
    const total = MOCK_PROPOSALS.length;
    const pending = MOCK_PROPOSALS.filter((p) => ['draft', 'sent', 'viewed'].includes(p.status)).length;
    const accepted = MOCK_PROPOSALS.filter((p) => p.status === 'accepted').length;
    const rejected = MOCK_PROPOSALS.filter((p) => p.status === 'rejected').length;
    const decided = accepted + rejected;
    const conversionRate = decided > 0 ? Math.round((accepted / decided) * 100) : 0;
    return { total, pending, accepted, conversionRate };
  }, []);

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
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00ffcc] to-[#00e6b8] text-[#0a0a0f] font-semibold text-sm hover:shadow-lg hover:shadow-[#00ffcc]/20 transition-shadow"
        >
          <Sparkles className="w-4 h-4" />
          {t('proposals.generate', 'Generate Proposal')}
        </motion.button>
      </div>

      {/* Stats */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          { label: t('proposals.total', 'Total Proposals'), value: stats.total, icon: FileText, color: '#8b5cf6' },
          { label: t('proposals.pending', 'Pending'), value: stats.pending, icon: Clock, color: '#f59e0b' },
          { label: t('proposals.accepted', 'Accepted'), value: stats.accepted, icon: CheckCircle2, color: '#10b981' },
          { label: t('proposals.conversionRate', 'Conversion Rate'), value: `${stats.conversionRate}%`, icon: TrendingUp, color: '#00ffcc' },
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
            <p className="text-2xl font-bold text-white">{stat.value}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Search + Status filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('proposals.search', 'Search proposals...')}
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
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#12121a]/80 backdrop-blur-sm border border-white/[0.06] rounded-xl overflow-hidden"
      >
        {/* Desktop table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Project', 'Client', 'System', 'Cost', 'Status', 'Date', ''].map((h) => (
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
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white/80">{proposal.projectName}</span>
                        {proposal.aiGenerated && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#8b5cf6]/20 text-[#8b5cf6] text-[10px] font-semibold">
                            <Zap className="w-2.5 h-2.5" />
                            AI
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-white/50">{proposal.clientName}</td>
                    <td className="px-4 py-3 text-sm text-white/50">{proposal.systemSize} kWp</td>
                    <td className="px-4 py-3 text-sm text-white/60 font-medium">${(proposal.totalCost / 1000).toFixed(0)}K</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium', sc.bg, sc.color)}>
                        <StatusIcon className="w-3 h-3" />
                        {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/30">
                      {new Date(proposal.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors">
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors">
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
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
