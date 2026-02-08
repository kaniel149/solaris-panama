import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  DollarSign,
  Zap,
  Calendar,
  User,
  FileText,
  Shield,
  Wrench,
  Activity,
  Clock,
  Phone,
  Mail,
  CheckCircle2,
  Sun,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { PIPELINE_STAGES, STAGE_COLORS, STAGE_LABELS } from '@/types/project';
import type { PipelineStage } from '@/types/project';

const cn = (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' ');

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// Mock project detail
const mockProject = {
  id: 'p1',
  name: 'Mall Multiplaza 200kWp',
  stage: 'proposal' as PipelineStage,
  priority: 'high',
  client: {
    company_name: 'Grupo Multiplaza',
    contact_name: 'Carlos Mendez',
    email: 'cmendez@multiplaza.com',
    phone: '+507 6789-1234',
    city: 'Panama City',
    sector: 'retail',
  },
  system_size_kwp: 200,
  panel_count: 380,
  inverter_type: 'Huawei SUN2000-100KTL',
  roof_area: 1800,
  estimated_cost: 180000,
  estimated_savings_annual: 52000,
  estimated_production_kwh: 310000,
  payback_years: 3.5,
  co2_offset_tons: 145,
  expected_close_date: '2026-03-15',
  created_at: '2026-01-10',
  assigned_member: { name: 'Kaniel Tordjman', role: 'Sales Lead' },
};

const tabs = [
  { key: 'overview', label: 'Overview', icon: <Sun className="w-4 h-4" /> },
  { key: 'proposals', label: 'Proposals', icon: <FileText className="w-4 h-4" /> },
  { key: 'permits', label: 'Permits', icon: <Shield className="w-4 h-4" /> },
  { key: 'installation', label: 'Installation', icon: <Wrench className="w-4 h-4" /> },
  { key: 'monitoring', label: 'Monitoring', icon: <Activity className="w-4 h-4" /> },
];

const activityFeed = [
  { id: '1', action: 'Proposal draft created', time: '2 hours ago', user: 'Kaniel' },
  { id: '2', action: 'Site survey photos uploaded', time: '1 day ago', user: 'Carlos' },
  { id: '3', action: 'Moved to Proposal stage', time: '2 days ago', user: 'System' },
  { id: '4', action: 'Client meeting scheduled', time: '3 days ago', user: 'Kaniel' },
  { id: '5', action: 'Roof analysis completed', time: '5 days ago', user: 'AI Scanner' },
  { id: '6', action: 'Lead created from website form', time: '4 weeks ago', user: 'System' },
];

const documents = [
  { name: 'Site Survey Report.pdf', size: '2.4 MB', date: 'Feb 5, 2026' },
  { name: 'Roof Analysis - AI.pdf', size: '1.8 MB', date: 'Feb 3, 2026' },
  { name: 'Electrical Diagram.dwg', size: '5.1 MB', date: 'Feb 1, 2026' },
  { name: 'Client Meeting Notes.docx', size: '128 KB', date: 'Jan 28, 2026' },
];

const formatCurrency = (n: number) => '$' + n.toLocaleString('en-US');

export default function ProjectDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: _id } = useParams();
  const [activeTab, setActiveTab] = useState('overview');

  const currentStageIndex = PIPELINE_STAGES.indexOf(mockProject.stage);

  return (
    <motion.div
      className="p-6 lg:p-8 max-w-[1400px] mx-auto"
      initial="initial"
      animate="animate"
      variants={{ animate: { transition: { staggerChildren: 0.06 } } }}
    >
      {/* Header */}
      <motion.div variants={fadeUp}>
        <PageHeader
          title={mockProject.name}
          description={`${mockProject.client.company_name} - ${mockProject.client.city}`}
          breadcrumbs={[
            { label: t('nav.projects'), onClick: () => navigate('/projects') },
            { label: mockProject.name },
          ]}
          actions={
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/projects')}>
                {t('common.back')}
              </Button>
              <Button variant="primary" size="sm" icon={<FileText className="w-4 h-4" />}>
                Generate Proposal
              </Button>
            </div>
          }
        />
      </motion.div>

      {/* Pipeline Progress */}
      <motion.div variants={fadeUp} className="mb-6">
        <GlassCard padding="sm">
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            {PIPELINE_STAGES.map((stage, i) => {
              const isCurrent = stage === mockProject.stage;
              const isPast = i < currentStageIndex;
              const color = STAGE_COLORS[stage];
              return (
                <div key={stage} className="flex items-center shrink-0">
                  <div
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all',
                      isCurrent && 'ring-1 ring-offset-1 ring-offset-[#12121a]',
                      isPast ? 'opacity-60' : !isCurrent ? 'opacity-30' : ''
                    )}
                    style={{
                      backgroundColor: (isCurrent || isPast) ? `${color}15` : 'transparent',
                      color: (isCurrent || isPast) ? color : '#555566',
                      ...(isCurrent ? { outline: `1px solid ${color}` } : {}),
                    }}
                  >
                    {isPast && <CheckCircle2 className="w-3 h-3" />}
                    <span>{STAGE_LABELS[stage]?.en}</span>
                  </div>
                  {i < PIPELINE_STAGES.length - 1 && (
                    <div
                      className="w-4 h-px mx-0.5"
                      style={{ backgroundColor: isPast ? color : 'rgba(255,255,255,0.06)' }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </GlassCard>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={fadeUp} className="flex items-center gap-1 mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
              activeTab === tab.key
                ? 'bg-[#00ffcc]/10 text-[#00ffcc] border border-[#00ffcc]/20'
                : 'text-[#555566] hover:text-[#8888a0] hover:bg-white/[0.02]'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* System Details */}
          <motion.div variants={fadeUp}>
            <GlassCard
              header={
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#00ffcc]" />
                  <h3 className="text-sm font-semibold text-[#f0f0f5]">System Details</h3>
                </div>
              }
            >
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-5 gap-x-4">
                <div>
                  <div className="text-xs text-[#555566] mb-1">System Size</div>
                  <div className="text-lg font-bold text-[#f0f0f5]">{mockProject.system_size_kwp} kWp</div>
                </div>
                <div>
                  <div className="text-xs text-[#555566] mb-1">Panel Count</div>
                  <div className="text-lg font-bold text-[#f0f0f5]">{mockProject.panel_count}</div>
                </div>
                <div>
                  <div className="text-xs text-[#555566] mb-1">Inverter</div>
                  <div className="text-sm font-medium text-[#f0f0f5]">{mockProject.inverter_type}</div>
                </div>
                <div>
                  <div className="text-xs text-[#555566] mb-1">Roof Area</div>
                  <div className="text-lg font-bold text-[#f0f0f5]">{mockProject.roof_area} m2</div>
                </div>
                <div>
                  <div className="text-xs text-[#555566] mb-1">Est. Annual Production</div>
                  <div className="text-lg font-bold text-[#f0f0f5]">{(mockProject.estimated_production_kwh / 1000).toFixed(0)} MWh</div>
                </div>
                <div>
                  <div className="text-xs text-[#555566] mb-1">CO2 Offset</div>
                  <div className="text-lg font-bold text-[#22c55e]">{mockProject.co2_offset_tons} tons/yr</div>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Financial Summary */}
          <motion.div variants={fadeUp}>
            <GlassCard
              header={
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#00ffcc]" />
                  <h3 className="text-sm font-semibold text-[#f0f0f5]">Financial Summary</h3>
                </div>
              }
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-y-5 gap-x-4">
                <div>
                  <div className="text-xs text-[#555566] mb-1">Project Cost</div>
                  <div className="text-lg font-bold text-[#f0f0f5]">{formatCurrency(mockProject.estimated_cost)}</div>
                </div>
                <div>
                  <div className="text-xs text-[#555566] mb-1">Annual Savings</div>
                  <div className="text-lg font-bold text-[#22c55e]">{formatCurrency(mockProject.estimated_savings_annual)}</div>
                </div>
                <div>
                  <div className="text-xs text-[#555566] mb-1">Payback Period</div>
                  <div className="text-lg font-bold text-[#f0f0f5]">{mockProject.payback_years} years</div>
                </div>
                <div>
                  <div className="text-xs text-[#555566] mb-1">25yr ROI</div>
                  <div className="text-lg font-bold text-[#00ffcc]">
                    {Math.round(((mockProject.estimated_savings_annual * 25 - mockProject.estimated_cost) / mockProject.estimated_cost) * 100)}%
                  </div>
                </div>
              </div>
              <div className="mt-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[#8888a0]">Payback Progress</span>
                  <span className="text-xs text-[#555566]">{mockProject.payback_years} yrs / 25 yrs</span>
                </div>
                <ProgressBar value={Math.round((mockProject.payback_years / 25) * 100)} max={100} />
              </div>
            </GlassCard>
          </motion.div>

          {/* Documents */}
          <motion.div variants={fadeUp}>
            <GlassCard
              header={
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#8b5cf6]" />
                    <h3 className="text-sm font-semibold text-[#f0f0f5]">{t('projects.documents')}</h3>
                  </div>
                  <Button variant="ghost" size="sm">Upload</Button>
                </div>
              }
            >
              <div className="flex flex-col divide-y divide-white/[0.04]">
                {documents.map((doc) => (
                  <div key={doc.name} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#8b5cf6]/10 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-[#8b5cf6]" />
                      </div>
                      <div>
                        <div className="text-sm text-[#f0f0f5]">{doc.name}</div>
                        <div className="text-xs text-[#555566]">{doc.size}</div>
                      </div>
                    </div>
                    <span className="text-xs text-[#555566]">{doc.date}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </div>

        {/* Right Column - 1/3 */}
        <div className="flex flex-col gap-6">
          {/* Client Info */}
          <motion.div variants={fadeUp}>
            <GlassCard
              header={
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-[#0ea5e9]" />
                  <h3 className="text-sm font-semibold text-[#f0f0f5]">Client</h3>
                </div>
              }
            >
              <div className="flex flex-col gap-3">
                <div>
                  <div className="text-base font-semibold text-[#f0f0f5]">{mockProject.client.company_name}</div>
                  <div className="text-xs text-[#8888a0]">{mockProject.client.contact_name}</div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs text-[#8888a0]">
                    <Mail className="w-3.5 h-3.5 text-[#555566]" />
                    {mockProject.client.email}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#8888a0]">
                    <Phone className="w-3.5 h-3.5 text-[#555566]" />
                    {mockProject.client.phone}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#8888a0]">
                    <MapPin className="w-3.5 h-3.5 text-[#555566]" />
                    {mockProject.client.city}
                  </div>
                </div>
                <Badge variant="purple" size="sm">{mockProject.client.sector}</Badge>
              </div>
            </GlassCard>
          </motion.div>

          {/* Assigned Team */}
          <motion.div variants={fadeUp}>
            <GlassCard
              header={<h3 className="text-sm font-semibold text-[#f0f0f5]">Assigned Team</h3>}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00ffcc]/20 to-[#8b5cf6]/20 flex items-center justify-center text-sm font-bold text-[#00ffcc]">
                  KT
                </div>
                <div>
                  <div className="text-sm font-medium text-[#f0f0f5]">{mockProject.assigned_member.name}</div>
                  <div className="text-xs text-[#8888a0]">{mockProject.assigned_member.role}</div>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Key Dates */}
          <motion.div variants={fadeUp}>
            <GlassCard
              header={
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#f59e0b]" />
                  <h3 className="text-sm font-semibold text-[#f0f0f5]">Key Dates</h3>
                </div>
              }
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#8888a0]">Created</span>
                  <span className="text-xs text-[#f0f0f5]">{new Date(mockProject.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#8888a0]">Expected Close</span>
                  <span className="text-xs text-[#00ffcc]">{new Date(mockProject.expected_close_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#8888a0]">Priority</span>
                  <Badge variant="warning" size="sm">{mockProject.priority}</Badge>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Activity Feed */}
          <motion.div variants={fadeUp}>
            <GlassCard
              header={
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#8888a0]" />
                  <h3 className="text-sm font-semibold text-[#f0f0f5]">Activity</h3>
                </div>
              }
            >
              <div className="flex flex-col gap-3">
                {activityFeed.map((item) => (
                  <div key={item.id} className="flex items-start gap-2">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#00ffcc]/50 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-[#f0f0f5]">{item.action}</div>
                      <div className="text-[10px] text-[#555566]">{item.user} - {item.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
