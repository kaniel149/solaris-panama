import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  LayoutGrid,
  List,
  Filter,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SearchInput } from '@/components/ui/SearchInput';
import { KanbanBoard } from '@/components/ui/KanbanBoard';
import { DataTable } from '@/components/ui/DataTable';
import { GlassCard } from '@/components/ui/GlassCard';
import { PIPELINE_STAGES, STAGE_COLORS, STAGE_LABELS } from '@/types/project';
import type { PipelineStage, Project } from '@/types/project';

const cn = (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' ');

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// Mock projects
const mockProjects: Project[] = [
  {
    id: 'p1', name: 'Mall Multiplaza 200kWp', client_id: 'c1', building_id: null, assigned_to: 'u1',
    stage: 'proposal', system_size_kwp: 200, estimated_cost: 180000, estimated_savings_annual: 52000,
    panel_count: 380, inverter_type: 'Huawei SUN2000', priority: 'high', expected_close_date: '2026-03-15',
    actual_close_date: null, lost_reason: null, notes: null, created_at: '2026-01-10T00:00:00Z', updated_at: '2026-02-05T00:00:00Z',
    client: { id: 'c1', company_name: 'Grupo Multiplaza', contact_name: 'Carlos Mendez', email: null, phone: null, whatsapp: null, address: null, city: 'Panama City', sector: 'retail', monthly_bill: null, source: null, assigned_to: null, notes: null, created_at: '', updated_at: '' },
  },
  {
    id: 'p2', name: 'Hotel Marriott 150kWp', client_id: 'c2', building_id: null, assigned_to: 'u1',
    stage: 'negotiation', system_size_kwp: 150, estimated_cost: 142000, estimated_savings_annual: 38000,
    panel_count: 285, inverter_type: 'SolarEdge', priority: 'high', expected_close_date: '2026-03-01',
    actual_close_date: null, lost_reason: null, notes: null, created_at: '2026-01-05T00:00:00Z', updated_at: '2026-02-03T00:00:00Z',
    client: { id: 'c2', company_name: 'Marriott International', contact_name: 'Ana Lucia Torres', email: null, phone: null, whatsapp: null, address: null, city: 'Panama City', sector: 'hospitality', monthly_bill: null, source: null, assigned_to: null, notes: null, created_at: '', updated_at: '' },
  },
  {
    id: 'p3', name: 'Warehouse PTY-12', client_id: 'c3', building_id: null, assigned_to: 'u2',
    stage: 'site_survey', system_size_kwp: 350, estimated_cost: 295000, estimated_savings_annual: 85000,
    panel_count: 665, inverter_type: 'Huawei SUN2000', priority: 'medium', expected_close_date: '2026-04-01',
    actual_close_date: null, lost_reason: null, notes: null, created_at: '2026-01-20T00:00:00Z', updated_at: '2026-02-06T00:00:00Z',
    client: { id: 'c3', company_name: 'Panama Logistics Co', contact_name: 'Roberto Diaz', email: null, phone: null, whatsapp: null, address: null, city: 'Colon', sector: 'warehouse', monthly_bill: null, source: null, assigned_to: null, notes: null, created_at: '', updated_at: '' },
  },
  {
    id: 'p4', name: 'Hospital Nacional 300kWp', client_id: 'c4', building_id: null, assigned_to: 'u1',
    stage: 'qualified', system_size_kwp: 300, estimated_cost: 275000, estimated_savings_annual: 72000,
    panel_count: 570, inverter_type: 'SMA', priority: 'high', expected_close_date: '2026-05-01',
    actual_close_date: null, lost_reason: null, notes: null, created_at: '2026-02-01T00:00:00Z', updated_at: '2026-02-07T00:00:00Z',
    client: { id: 'c4', company_name: 'Hospital Nacional', contact_name: 'Dr. Maria Gonzalez', email: null, phone: null, whatsapp: null, address: null, city: 'Panama City', sector: 'healthcare', monthly_bill: null, source: null, assigned_to: null, notes: null, created_at: '', updated_at: '' },
  },
  {
    id: 'p5', name: 'Supermarket El Rey #4', client_id: 'c5', building_id: null, assigned_to: 'u2',
    stage: 'installation', system_size_kwp: 120, estimated_cost: 108000, estimated_savings_annual: 31000,
    panel_count: 228, inverter_type: 'Enphase', priority: 'medium', expected_close_date: '2026-02-20',
    actual_close_date: null, lost_reason: null, notes: null, created_at: '2025-11-15T00:00:00Z', updated_at: '2026-02-04T00:00:00Z',
    client: { id: 'c5', company_name: 'Supermercados El Rey', contact_name: 'Pedro Ruiz', email: null, phone: null, whatsapp: null, address: null, city: 'David', sector: 'retail', monthly_bill: null, source: null, assigned_to: null, notes: null, created_at: '', updated_at: '' },
  },
  {
    id: 'p6', name: 'Office Tower PH 100kWp', client_id: 'c6', building_id: null, assigned_to: 'u1',
    stage: 'permitting', system_size_kwp: 100, estimated_cost: 92000, estimated_savings_annual: 26000,
    panel_count: 190, inverter_type: 'SolarEdge', priority: 'low', expected_close_date: '2026-03-30',
    actual_close_date: null, lost_reason: null, notes: null, created_at: '2025-12-10T00:00:00Z', updated_at: '2026-02-02T00:00:00Z',
    client: { id: 'c6', company_name: 'PH Ocean Tower', contact_name: 'Diego Aleman', email: null, phone: null, whatsapp: null, address: null, city: 'Panama City', sector: 'commercial', monthly_bill: null, source: null, assigned_to: null, notes: null, created_at: '', updated_at: '' },
  },
  {
    id: 'p7', name: 'Factory Colon FZ 250kWp', client_id: 'c7', building_id: null, assigned_to: 'u2',
    stage: 'won', system_size_kwp: 250, estimated_cost: 225000, estimated_savings_annual: 65000,
    panel_count: 475, inverter_type: 'Huawei SUN2000', priority: 'high', expected_close_date: '2026-02-10',
    actual_close_date: '2026-02-06', lost_reason: null, notes: null, created_at: '2025-10-20T00:00:00Z', updated_at: '2026-02-06T00:00:00Z',
    client: { id: 'c7', company_name: 'Industrias del Caribe', contact_name: 'Juan Carlos Vega', email: null, phone: null, whatsapp: null, address: null, city: 'Colon', sector: 'industrial', monthly_bill: null, source: null, assigned_to: null, notes: null, created_at: '', updated_at: '' },
  },
  {
    id: 'p8', name: 'Universidad de Panama', client_id: 'c8', building_id: null, assigned_to: null,
    stage: 'lead', system_size_kwp: 500, estimated_cost: 420000, estimated_savings_annual: 120000,
    panel_count: 950, inverter_type: null, priority: 'medium', expected_close_date: null,
    actual_close_date: null, lost_reason: null, notes: null, created_at: '2026-02-05T00:00:00Z', updated_at: '2026-02-05T00:00:00Z',
    client: { id: 'c8', company_name: 'Universidad de Panama', contact_name: 'Prof. Luis Ortega', email: null, phone: null, whatsapp: null, address: null, city: 'Panama City', sector: 'education', monthly_bill: null, source: null, assigned_to: null, notes: null, created_at: '', updated_at: '' },
  },
  {
    id: 'p9', name: 'Costa del Este Residences', client_id: 'c9', building_id: null, assigned_to: null,
    stage: 'lead', system_size_kwp: 80, estimated_cost: 74000, estimated_savings_annual: 20000,
    panel_count: 152, inverter_type: null, priority: 'low', expected_close_date: null,
    actual_close_date: null, lost_reason: null, notes: null, created_at: '2026-02-07T00:00:00Z', updated_at: '2026-02-07T00:00:00Z',
    client: { id: 'c9', company_name: 'Costa del Este HOA', contact_name: 'Isabella Chen', email: null, phone: null, whatsapp: null, address: null, city: 'Panama City', sector: 'residential_complex', monthly_bill: null, source: null, assigned_to: null, notes: null, created_at: '', updated_at: '' },
  },
  {
    id: 'p10', name: 'Clinic San Fernando 75kWp', client_id: 'c10', building_id: null, assigned_to: 'u1',
    stage: 'monitoring', system_size_kwp: 75, estimated_cost: 68000, estimated_savings_annual: 19000,
    panel_count: 142, inverter_type: 'SolarEdge', priority: null, expected_close_date: null,
    actual_close_date: '2025-12-01', lost_reason: null, notes: null, created_at: '2025-06-15T00:00:00Z', updated_at: '2026-01-15T00:00:00Z',
    client: { id: 'c10', company_name: 'Clinica San Fernando', contact_name: 'Dr. Ricardo Arias', email: null, phone: null, whatsapp: null, address: null, city: 'Panama City', sector: 'healthcare', monthly_bill: null, source: null, assigned_to: null, notes: null, created_at: '', updated_at: '' },
  },
];

type ViewMode = 'kanban' | 'list';

const stageBadgeVariant = (stage: PipelineStage): 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple' => {
  if (stage === 'won' || stage === 'monitoring' || stage === 'commissioning') return 'success';
  if (stage === 'closed_lost') return 'error';
  if (stage === 'negotiation' || stage === 'proposal') return 'warning';
  if (stage === 'installation' || stage === 'procurement') return 'purple';
  return 'info';
};

const formatCurrency = (n: number) => '$' + n.toLocaleString('en-US');
const formatKWp = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)} MWp` : `${n} kWp`);

export default function ProjectsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>('kanban');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<PipelineStage | ''>('');

  const filteredProjects = useMemo(() => {
    return mockProjects.filter((p) => {
      if (search) {
        const q = search.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchClient = p.client?.company_name.toLowerCase().includes(q);
        if (!matchName && !matchClient) return false;
      }
      if (stageFilter && p.stage !== stageFilter) return false;
      return true;
    });
  }, [search, stageFilter]);

  const kanbanColumns = useMemo(() => {
    return PIPELINE_STAGES.map((stage) => ({
      id: stage,
      title: STAGE_LABELS[stage]?.en ?? stage,
      color: STAGE_COLORS[stage],
      items: filteredProjects.filter((p) => p.stage === stage),
    }));
  }, [filteredProjects]);

  const tableColumns = [
    {
      key: 'name',
      header: t('projects.projectName'),
      sortable: true,
      render: (row: Project) => (
        <div>
          <span className="font-medium text-[#f0f0f5]">{row.name}</span>
          <div className="text-xs text-[#555566]">{row.client?.company_name}</div>
        </div>
      ),
    },
    {
      key: 'stage',
      header: t('projects.stage'),
      render: (row: Project) => (
        <Badge variant={stageBadgeVariant(row.stage)} dot size="sm">
          {STAGE_LABELS[row.stage]?.en}
        </Badge>
      ),
    },
    {
      key: 'system_size_kwp',
      header: t('projects.systemSize'),
      sortable: true,
      render: (row: Project) => (
        <span className="text-[#8888a0]">{row.system_size_kwp ? formatKWp(row.system_size_kwp) : '-'}</span>
      ),
    },
    {
      key: 'estimated_cost',
      header: t('projects.value'),
      sortable: true,
      align: 'right' as const,
      render: (row: Project) => (
        <span className="font-medium">{row.estimated_cost ? formatCurrency(row.estimated_cost) : '-'}</span>
      ),
    },
    {
      key: 'priority',
      header: t('projects.priority'),
      render: (row: Project) => {
        if (!row.priority) return <span className="text-[#555566]">-</span>;
        const colors: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
          urgent: 'error', high: 'warning', medium: 'info', low: 'default',
        };
        return <Badge variant={colors[row.priority] ?? 'default'} size="sm">{row.priority}</Badge>;
      },
    },
    {
      key: 'updated_at',
      header: t('projects.lastUpdated'),
      sortable: true,
      render: (row: Project) => (
        <span className="text-xs text-[#555566]">{new Date(row.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
      ),
    },
  ];

  return (
    <motion.div
      className="p-6 lg:p-8 max-w-[1400px] mx-auto"
      initial="initial"
      animate="animate"
      variants={{ animate: { transition: { staggerChildren: 0.06 } } }}
    >
      <motion.div variants={fadeUp}>
        <PageHeader
          title={t('projects.title')}
          description={t('projects.subtitle')}
          gradient
          actions={
            <Button variant="primary" icon={<Plus className="w-4 h-4" />}>
              {t('projects.newProject')}
            </Button>
          }
        />
      </motion.div>

      {/* Toolbar */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t('common.search')}
          className="w-full sm:w-72"
        />
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as PipelineStage | '')}
              className="appearance-none bg-[#12121a]/80 border border-white/[0.06] text-[#8888a0] text-xs rounded-lg px-3 py-2 pr-8 focus:outline-none focus:border-[#00ffcc]/30"
            >
              <option value="">All Stages</option>
              {PIPELINE_STAGES.map((s) => (
                <option key={s} value={s}>{STAGE_LABELS[s]?.en}</option>
              ))}
            </select>
            <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#555566] pointer-events-none" />
          </div>
          <div className="flex rounded-lg border border-white/[0.06] overflow-hidden">
            <button
              onClick={() => setView('kanban')}
              className={cn(
                'p-2 transition-colors',
                view === 'kanban' ? 'bg-[#00ffcc]/10 text-[#00ffcc]' : 'text-[#555566] hover:text-[#8888a0] hover:bg-white/[0.02]'
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('list')}
              className={cn(
                'p-2 transition-colors',
                view === 'list' ? 'bg-[#00ffcc]/10 text-[#00ffcc]' : 'text-[#555566] hover:text-[#8888a0] hover:bg-white/[0.02]'
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div variants={fadeUp}>
        {view === 'kanban' ? (
          <KanbanBoard
            columns={kanbanColumns}
            getItemId={(p) => p.id}
            renderCard={(project) => (
              <GlassCard
                variant="interactive"
                padding="sm"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <div className="flex flex-col gap-2">
                  <div className="text-sm font-medium text-[#f0f0f5] leading-tight">{project.name}</div>
                  <div className="text-xs text-[#555566]">{project.client?.company_name}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#8888a0]">
                      {project.system_size_kwp ? formatKWp(project.system_size_kwp) : '-'}
                    </span>
                    <span className="text-xs font-medium text-[#00ffcc]">
                      {project.estimated_cost ? formatCurrency(project.estimated_cost) : '-'}
                    </span>
                  </div>
                  {project.priority && (
                    <Badge
                      variant={
                        project.priority === 'urgent' ? 'error' :
                        project.priority === 'high' ? 'warning' :
                        project.priority === 'medium' ? 'info' : 'default'
                      }
                      size="sm"
                    >
                      {project.priority}
                    </Badge>
                  )}
                </div>
              </GlassCard>
            )}
          />
        ) : (
          <DataTable
            columns={tableColumns}
            data={filteredProjects}
            getRowKey={(p) => p.id}
            onRowClick={(p) => navigate(`/projects/${p.id}`)}
            pageSize={10}
            emptyMessage="No projects found"
          />
        )}
      </motion.div>
    </motion.div>
  );
}
