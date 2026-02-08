import type { Client } from './client';
import type { Building } from './building';
import type { TeamMember } from './team';

export type PipelineStage =
  | 'lead'
  | 'qualified'
  | 'site_survey'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'permitting'
  | 'procurement'
  | 'installation'
  | 'commissioning'
  | 'monitoring'
  | 'closed_lost';

export const PIPELINE_STAGES: PipelineStage[] = [
  'lead',
  'qualified',
  'site_survey',
  'proposal',
  'negotiation',
  'won',
  'permitting',
  'procurement',
  'installation',
  'commissioning',
  'monitoring',
  'closed_lost',
];

export const STAGE_LABELS: Record<PipelineStage, { en: string; es: string }> = {
  lead: { en: 'Lead', es: 'Prospecto' },
  qualified: { en: 'Qualified', es: 'Calificado' },
  site_survey: { en: 'Site Survey', es: 'Visita Tecnica' },
  proposal: { en: 'Proposal', es: 'Propuesta' },
  negotiation: { en: 'Negotiation', es: 'Negociacion' },
  won: { en: 'Won', es: 'Ganado' },
  permitting: { en: 'Permitting', es: 'Permisos' },
  procurement: { en: 'Procurement', es: 'Compras' },
  installation: { en: 'Installation', es: 'Instalacion' },
  commissioning: { en: 'Commissioning', es: 'Puesta en Marcha' },
  monitoring: { en: 'Monitoring', es: 'Monitoreo' },
  closed_lost: { en: 'Closed Lost', es: 'Perdido' },
};

export const STAGE_COLORS: Record<PipelineStage, string> = {
  lead: '#6366f1',
  qualified: '#8b5cf6',
  site_survey: '#3b82f6',
  proposal: '#0ea5e9',
  negotiation: '#f59e0b',
  won: '#10b981',
  permitting: '#f97316',
  procurement: '#ec4899',
  installation: '#14b8a6',
  commissioning: '#06b6d4',
  monitoring: '#22c55e',
  closed_lost: '#ef4444',
};

export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Project {
  id: string;
  name: string;
  client_id: string;
  building_id: string | null;
  assigned_to: string | null;
  stage: PipelineStage;
  system_size_kwp: number | null;
  estimated_cost: number | null;
  estimated_savings_annual: number | null;
  panel_count: number | null;
  inverter_type: string | null;
  priority: ProjectPriority | null;
  expected_close_date: string | null;
  actual_close_date: string | null;
  lost_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  client?: Client;
  building?: Building;
  assigned_member?: TeamMember;
}

export type ProjectInsert = Omit<Project, 'id' | 'created_at' | 'updated_at' | 'client' | 'building' | 'assigned_member'>;
export type ProjectUpdate = Partial<ProjectInsert>;

export interface ProjectFilters {
  search?: string;
  stage?: PipelineStage | PipelineStage[];
  assignedTo?: string;
  priority?: ProjectPriority;
  clientId?: string;
  page?: number;
  limit?: number;
}

export interface ProjectStats {
  total: number;
  byStage: Record<PipelineStage, number>;
  totalValue: number;
  totalCapacity: number;
  wonThisMonth: number;
  lostThisMonth: number;
}
