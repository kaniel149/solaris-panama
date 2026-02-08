import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Plus,
  UserPlus,
  FileText,
  TrendingUp,
  Zap,
  Sun,
  DollarSign,
  Target,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { StatsCard } from '@/components/ui/StatsCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { STAGE_COLORS, STAGE_LABELS } from '@/types/project';
import type { PipelineStage } from '@/types/project';
import type { ActivityType } from '@/types/activity';

const cn = (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' ');

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// Mock pipeline data
const pipelineData: { stage: PipelineStage; count: number }[] = [
  { stage: 'lead', count: 8 },
  { stage: 'qualified', count: 5 },
  { stage: 'site_survey', count: 3 },
  { stage: 'proposal', count: 4 },
  { stage: 'negotiation', count: 2 },
  { stage: 'won', count: 3 },
  { stage: 'permitting', count: 2 },
  { stage: 'procurement', count: 1 },
  { stage: 'installation', count: 1 },
  { stage: 'commissioning', count: 1 },
  { stage: 'monitoring', count: 6 },
  { stage: 'closed_lost', count: 2 },
];

// Mock activities
interface MockActivity {
  id: string;
  type: ActivityType;
  title: string;
  project: string;
  time: string;
}

const recentActivities: MockActivity[] = [
  { id: '1', type: 'stage_change', title: 'Moved to Proposal stage', project: 'Mall Multiplaza 200kWp', time: '15 min ago' },
  { id: '2', type: 'proposal_sent', title: 'Proposal sent to client', project: 'Hotel Marriott 150kWp', time: '1 hour ago' },
  { id: '3', type: 'site_visit', title: 'Site survey completed', project: 'Warehouse PTY-12', time: '2 hours ago' },
  { id: '4', type: 'call', title: 'Follow-up call with CFO', project: 'Hospital Nacional 300kWp', time: '3 hours ago' },
  { id: '5', type: 'installation_started', title: 'Installation crew deployed', project: 'Supermarket El Rey #4', time: '4 hours ago' },
  { id: '6', type: 'permit_approved', title: 'ASEP permit approved', project: 'Office Tower PH 100kWp', time: 'Yesterday' },
  { id: '7', type: 'proposal_accepted', title: 'Proposal accepted!', project: 'Factory Colon FZ 250kWp', time: 'Yesterday' },
  { id: '8', type: 'payment_received', title: 'Down payment received', project: 'Factory Colon FZ 250kWp', time: '2 days ago' },
];

const activityIcons: Partial<Record<ActivityType, React.ReactNode>> = {
  stage_change: <ArrowRight className="w-3.5 h-3.5" />,
  proposal_sent: <FileText className="w-3.5 h-3.5" />,
  site_visit: <MapPin className="w-3.5 h-3.5" />,
  call: <Phone className="w-3.5 h-3.5" />,
  installation_started: <Zap className="w-3.5 h-3.5" />,
  permit_approved: <Target className="w-3.5 h-3.5" />,
  proposal_accepted: <TrendingUp className="w-3.5 h-3.5" />,
  payment_received: <DollarSign className="w-3.5 h-3.5" />,
  email: <Mail className="w-3.5 h-3.5" />,
};

const aiInsights = [
  {
    title: 'Follow up with Hotel Marriott',
    description: 'Proposal was sent 5 days ago with no response. High-value lead ($180K) - recommend a follow-up call today.',
    priority: 'high' as const,
  },
  {
    title: 'Optimal installation window',
    description: 'Dry season starts next week. Schedule 3 pending installations (Supermarket El Rey, Office Tower, Warehouse PTY) to maximize efficiency.',
    priority: 'medium' as const,
  },
  {
    title: 'New lead opportunity detected',
    description: 'Commercial building at Via Espana (4,200 m2 roof) has high solar potential. Monthly bill ~$8,500. Estimated 3.2 year payback.',
    priority: 'low' as const,
  },
];

const priorityColors = {
  high: 'text-[#ef4444]',
  medium: 'text-[#f59e0b]',
  low: 'text-[#0ea5e9]',
};

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { stage: string } }> }) => {
  if (active && payload && payload.length) {
    const stage = payload[0].payload.stage as PipelineStage;
    return (
      <div className="rounded-lg bg-[#1a1a2e] border border-white/[0.1] px-3 py-2 shadow-lg">
        <p className="text-xs font-medium text-[#f0f0f5]">{STAGE_LABELS[stage]?.en}</p>
        <p className="text-xs text-[#8888a0]">{payload[0].value} projects</p>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <motion.div
      className="p-6 lg:p-8 max-w-[1400px] mx-auto"
      variants={stagger}
      initial="initial"
      animate="animate"
    >
      {/* Hero Section */}
      <motion.div variants={fadeUp} className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sun className="w-5 h-5 text-[#f59e0b]" />
              <span className="text-sm text-[#8888a0]">{today}</span>
            </div>
            <h1 className="text-3xl font-bold text-[#f0f0f5]">
              Buenos dias, <span className="text-gradient bg-gradient-to-r from-[#00ffcc] to-[#0ea5e9] bg-clip-text text-transparent">Kaniel</span>
            </h1>
            <p className="text-[#8888a0] mt-1">Here is your solar business overview.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => navigate('/projects')}
            >
              {t('projects.newProject')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<Calendar className="w-4 h-4" />}
              onClick={() => navigate('/calendar')}
            >
              {t('nav.calendar')}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats Row */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          label={t('dashboard.totalProjects')}
          value={38}
          icon={<LayoutDashboard className="w-4 h-4" />}
          trend={{ value: 12, label: 'vs last month' }}
        />
        <StatsCard
          label={t('dashboard.activeProjects')}
          value={21}
          icon={<Zap className="w-4 h-4" />}
          trend={{ value: 8, label: 'vs last month' }}
        />
        <StatsCard
          label={t('dashboard.revenue')}
          value={842000}
          format="currency"
          prefix="$"
          icon={<DollarSign className="w-4 h-4" />}
          trend={{ value: 23, label: 'vs last month' }}
        />
        <StatsCard
          label={t('dashboard.conversion')}
          value={34}
          suffix="%"
          icon={<Target className="w-4 h-4" />}
          trend={{ value: -2, label: 'vs last month' }}
        />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Chart - 2 columns */}
        <motion.div variants={fadeUp} className="lg:col-span-2">
          <GlassCard
            header={
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#f0f0f5]">{t('dashboard.pipelineOverview')}</h2>
                <span className="text-xs text-[#555566]">38 total projects</span>
              </div>
            }
          >
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="stage"
                    tick={{ fill: '#555566', fontSize: 10 }}
                    tickFormatter={(val: PipelineStage) => STAGE_LABELS[val]?.en.slice(0, 6) ?? val}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#555566', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {pipelineData.map((entry) => (
                      <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage]} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </motion.div>

        {/* Quick Actions - 1 column */}
        <motion.div variants={fadeUp}>
          <GlassCard
            header={<h2 className="text-sm font-semibold text-[#f0f0f5]">{t('dashboard.quickActions')}</h2>}
          >
            <div className="flex flex-col gap-2">
              <button
                onClick={() => navigate('/projects')}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] hover:bg-[#00ffcc]/[0.06] border border-transparent hover:border-[#00ffcc]/20 transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-[#00ffcc]/10 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-[#00ffcc]" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-[#f0f0f5] group-hover:text-[#00ffcc] transition-colors">
                    {t('projects.newProject')}
                  </div>
                  <div className="text-xs text-[#555566]">Add a new solar project</div>
                </div>
              </button>
              <button
                onClick={() => navigate('/clients')}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] hover:bg-[#8b5cf6]/[0.06] border border-transparent hover:border-[#8b5cf6]/20 transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-[#8b5cf6]/10 flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-[#8b5cf6]" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-[#f0f0f5] group-hover:text-[#8b5cf6] transition-colors">
                    {t('clients.newClient')}
                  </div>
                  <div className="text-xs text-[#555566]">Register a new client</div>
                </div>
              </button>
              <button
                onClick={() => navigate('/proposals')}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] hover:bg-[#0ea5e9]/[0.06] border border-transparent hover:border-[#0ea5e9]/20 transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-[#0ea5e9]/10 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-[#0ea5e9]" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-[#f0f0f5] group-hover:text-[#0ea5e9] transition-colors">
                    Generate Proposal
                  </div>
                  <div className="text-xs text-[#555566]">AI-powered proposal builder</div>
                </div>
              </button>
            </div>
          </GlassCard>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Activity Feed - 2 columns */}
        <motion.div variants={fadeUp} className="lg:col-span-2">
          <GlassCard
            header={
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#f0f0f5]">{t('dashboard.recentActivity')}</h2>
                <button className="text-xs text-[#00ffcc] hover:text-[#00ffcc]/80 transition-colors">
                  {t('common.viewAll')}
                </button>
              </div>
            }
          >
            <div className="flex flex-col divide-y divide-white/[0.04]">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="mt-0.5 w-7 h-7 rounded-full bg-white/[0.04] flex items-center justify-center text-[#8888a0] shrink-0">
                    {activityIcons[activity.type] || <Zap className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#f0f0f5]">{activity.title}</p>
                    <p className="text-xs text-[#555566] truncate">{activity.project}</p>
                  </div>
                  <span className="text-xs text-[#555566] shrink-0 whitespace-nowrap">{activity.time}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* AI Insights - 1 column */}
        <motion.div variants={fadeUp}>
          <GlassCard
            header={
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#00ffcc]" />
                <h2 className="text-sm font-semibold text-[#f0f0f5]">AI Insights</h2>
              </div>
            }
          >
            <div className="flex flex-col gap-3">
              {aiInsights.map((insight, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-[#00ffcc]/10 transition-all"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('text-xs font-medium uppercase', priorityColors[insight.priority])}>
                      {insight.priority}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-[#f0f0f5] mb-1">{insight.title}</p>
                  <p className="text-xs text-[#8888a0] leading-relaxed">{insight.description}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </motion.div>
  );
}
