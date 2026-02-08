import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MessageSquare,
  MapPin,
  DollarSign,
  FolderKanban,
  FileText,
  Edit3,
  User,
  Clock,
  PhoneCall,
  Send,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { Client, Project, Activity } from '@/types';

const cn = (...classes: (string | boolean | undefined | null)[]) =>
  classes.filter(Boolean).join(' ');

const MOCK_CLIENT: Client & { projects_count: number } = {
  id: '1',
  company_name: 'Grupo Motta S.A.',
  contact_name: 'Ricardo Motta',
  email: 'rmotta@grupomotta.com',
  phone: '+507 6700-1234',
  whatsapp: '+507 6700-1234',
  address: 'Torre Motta, Costa del Este, Panama City',
  city: 'Panama City',
  sector: 'Commercial',
  monthly_bill: 12500,
  source: 'Referral',
  assigned_to: 'team-1',
  notes: 'Key account - 3 buildings in Costa del Este. Decision maker is CEO directly.',
  created_at: '2026-01-15T10:00:00Z',
  updated_at: '2026-02-01T10:00:00Z',
  projects_count: 3,
  assigned_member: {
    id: 'team-1',
    email: 'carlos@solaris.pa',
    full_name: 'Carlos Rivera',
    role: 'sales',
    avatar_url: null,
    phone: null,
    is_active: true,
    created_at: '',
    updated_at: '',
  },
};

const MOCK_PROJECTS: Partial<Project>[] = [
  {
    id: 'p1',
    name: 'Torre Motta - Rooftop 300kWp',
    stage: 'proposal',
    system_size_kwp: 300,
    estimated_cost: 285000,
    priority: 'high',
    created_at: '2026-01-20T10:00:00Z',
  },
  {
    id: 'p2',
    name: 'Motta Parking - Carport 150kWp',
    stage: 'site_survey',
    system_size_kwp: 150,
    estimated_cost: 165000,
    priority: 'medium',
    created_at: '2026-01-25T10:00:00Z',
  },
  {
    id: 'p3',
    name: 'Warehouse Tocumen - 200kWp',
    stage: 'lead',
    system_size_kwp: 200,
    estimated_cost: 190000,
    priority: 'low',
    created_at: '2026-02-01T10:00:00Z',
  },
];

const MOCK_ACTIVITIES: Activity[] = [
  {
    id: 'a1',
    project_id: 'p1',
    client_id: '1',
    user_id: 'team-1',
    type: 'proposal_sent',
    title: 'Proposal v2 sent to client',
    description: '300kWp rooftop system proposal with updated pricing',
    metadata: { proposal_id: 'prop-1' },
    created_at: '2026-02-07T14:30:00Z',
    user: { full_name: 'Carlos Rivera', avatar_url: null },
  },
  {
    id: 'a2',
    project_id: 'p2',
    client_id: '1',
    user_id: 'team-1',
    type: 'site_visit',
    title: 'Site survey completed - Parking structure',
    description: 'Measured roof area: 1,200 sqm. Good structural condition for carport install.',
    metadata: { duration_minutes: 90 },
    created_at: '2026-02-05T11:00:00Z',
    user: { full_name: 'Carlos Rivera', avatar_url: null },
  },
  {
    id: 'a3',
    project_id: null,
    client_id: '1',
    user_id: 'team-1',
    type: 'call',
    title: 'Follow-up call with Ricardo Motta',
    description: 'Discussed pricing for all 3 projects. Client wants bundle discount.',
    metadata: { duration_minutes: 25 },
    created_at: '2026-02-03T16:00:00Z',
    user: { full_name: 'Carlos Rivera', avatar_url: null },
  },
  {
    id: 'a4',
    project_id: 'p1',
    client_id: '1',
    user_id: 'team-2',
    type: 'stage_change',
    title: 'Torre Motta project moved to Proposal stage',
    description: null,
    metadata: { from_stage: 'site_survey', to_stage: 'proposal' },
    created_at: '2026-02-01T09:00:00Z',
    user: { full_name: 'Ana Martinez', avatar_url: null },
  },
  {
    id: 'a5',
    project_id: null,
    client_id: '1',
    user_id: 'team-1',
    type: 'meeting',
    title: 'Initial meeting with Grupo Motta',
    description: 'Met CEO at Costa del Este office. Interested in solar for 3 properties.',
    metadata: { duration_minutes: 60 },
    created_at: '2026-01-15T10:00:00Z',
    user: { full_name: 'Carlos Rivera', avatar_url: null },
  },
];

const stageColors: Record<string, string> = {
  lead: 'bg-indigo-500/20 text-indigo-400',
  qualified: 'bg-violet-500/20 text-violet-400',
  site_survey: 'bg-blue-500/20 text-blue-400',
  proposal: 'bg-cyan-500/20 text-cyan-400',
  negotiation: 'bg-amber-500/20 text-amber-400',
  won: 'bg-emerald-500/20 text-emerald-400',
  closed_lost: 'bg-red-500/20 text-red-400',
};

const activityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  call: PhoneCall,
  meeting: User,
  proposal_sent: Send,
  site_visit: MapPin,
  stage_change: CheckCircle2,
  email: Mail,
  note: FileText,
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const ClientDetailPage: React.FC = () => {
  const { id: _id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [_editOpen, setEditOpen] = useState(false);

  // In production, fetch client by id. Using mock for now.
  const client = MOCK_CLIENT;

  const totalValue = MOCK_PROJECTS.reduce((sum, p) => sum + (p.estimated_cost ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/clients')}
            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{client.company_name}</h1>
            <p className="text-sm text-white/40">{client.contact_name} &middot; {client.sector}</p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setEditOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white/70 hover:text-white hover:border-white/[0.12] transition-all text-sm"
        >
          <Edit3 className="w-4 h-4" />
          {t('common.edit', 'Edit')}
        </motion.button>
      </motion.div>

      {/* Stats row */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        {[
          { label: t('clients.totalProjects', 'Total Projects'), value: MOCK_PROJECTS.length, icon: FolderKanban, color: '#8b5cf6' },
          { label: t('clients.totalValue', 'Total Value'), value: `$${(totalValue / 1000).toFixed(0)}K`, icon: DollarSign, color: '#00ffcc' },
          { label: t('clients.activeProposals', 'Active Proposals'), value: 2, icon: FileText, color: '#3b82f6' },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            variants={fadeUp}
            className="bg-[#12121a]/80 backdrop-blur-sm border border-white/[0.06] rounded-xl p-4 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.color}15` }}>
              <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-white/40">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Client info */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1 space-y-4"
        >
          {/* Contact card */}
          <div className="bg-[#12121a]/80 backdrop-blur-sm border border-white/[0.06] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
              {t('clients.contactInfo', 'Contact Information')}
            </h3>
            <div className="space-y-3">
              {[
                { icon: Building2, label: 'Company', value: client.company_name },
                { icon: User, label: 'Contact', value: client.contact_name },
                { icon: Mail, label: 'Email', value: client.email },
                { icon: Phone, label: 'Phone', value: client.phone },
                { icon: MessageSquare, label: 'WhatsApp', value: client.whatsapp },
                { icon: MapPin, label: 'Address', value: client.address },
                { icon: DollarSign, label: 'Monthly Bill', value: client.monthly_bill ? `$${client.monthly_bill.toLocaleString()}/mo` : null },
              ]
                .filter((row) => row.value)
                .map((row) => (
                  <div key={row.label} className="flex items-start gap-3">
                    <row.icon className="w-4 h-4 text-white/20 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-white/30">{row.label}</p>
                      <p className="text-sm text-white/80">{row.value}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Assigned */}
          {client.assigned_member && (
            <div className="bg-[#12121a]/80 backdrop-blur-sm border border-white/[0.06] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">
                {t('clients.assignedTo', 'Assigned To')}
              </h3>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#8b5cf6]/20 flex items-center justify-center text-sm font-bold text-[#8b5cf6]">
                  {client.assigned_member.full_name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-white/80">{client.assigned_member.full_name}</p>
                  <p className="text-xs text-white/30 capitalize">{client.assigned_member.role}</p>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {client.notes && (
            <div className="bg-[#12121a]/80 backdrop-blur-sm border border-white/[0.06] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Notes</h3>
              <p className="text-sm text-white/50 leading-relaxed">{client.notes}</p>
            </div>
          )}
        </motion.div>

        {/* Right: Projects + Activity */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Projects */}
          <div className="bg-[#12121a]/80 backdrop-blur-sm border border-white/[0.06] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
                {t('clients.projects', 'Projects')}
              </h3>
              <span className="text-xs text-white/30">{MOCK_PROJECTS.length} total</span>
            </div>
            <div className="space-y-3">
              {MOCK_PROJECTS.map((project) => (
                <div
                  key={project.id}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.1] cursor-pointer transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white/80 truncate">{project.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-white/30">{project.system_size_kwp} kWp</span>
                      <span className="text-xs text-white/30">${((project.estimated_cost ?? 0) / 1000).toFixed(0)}K</span>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-md text-xs font-medium capitalize',
                      stageColors[project.stage ?? ''] || 'bg-white/10 text-white/50'
                    )}
                  >
                    {(project.stage ?? '').replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity feed */}
          <div className="bg-[#12121a]/80 backdrop-blur-sm border border-white/[0.06] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">
              {t('clients.activityFeed', 'Activity Feed')}
            </h3>
            <div className="space-y-0">
              {MOCK_ACTIVITIES.map((activity, i) => {
                const Icon = activityIcons[activity.type] || AlertCircle;
                const isLast = i === MOCK_ACTIVITIES.length - 1;
                return (
                  <div key={activity.id} className="flex gap-3 relative">
                    {/* Timeline line */}
                    {!isLast && (
                      <div className="absolute left-[15px] top-8 bottom-0 w-px bg-white/[0.06]" />
                    )}
                    {/* Icon */}
                    <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0 z-10">
                      <Icon className="w-3.5 h-3.5 text-white/40" />
                    </div>
                    {/* Content */}
                    <div className="pb-5 min-w-0">
                      <p className="text-sm text-white/70">{activity.title}</p>
                      {activity.description && (
                        <p className="text-xs text-white/30 mt-0.5">{activity.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-white/20" />
                        <span className="text-xs text-white/20">
                          {new Date(activity.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {activity.user && (
                          <>
                            <span className="text-xs text-white/10">&middot;</span>
                            <span className="text-xs text-white/20">{activity.user.full_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ClientDetailPage;
