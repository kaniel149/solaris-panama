import { supabase } from './supabase';
import type {
  Project,
  ProjectInsert,
  ProjectUpdate,
  ProjectFilters,
  ProjectStats,
  PipelineStage,
} from '../types/project';

const DEFAULT_LIMIT = 50;

const PROJECT_SELECT = `
  *,
  client:clients(*),
  building:buildings(*),
  assigned_member:team_members!assigned_to(*)
`;

export async function getProjects(filters?: ProjectFilters): Promise<{ data: Project[]; count: number }> {
  const page = filters?.page ?? 0;
  const limit = filters?.limit ?? DEFAULT_LIMIT;
  const from = page * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('projects')
    .select(PROJECT_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%`
    );
  }
  if (filters?.stage) {
    if (Array.isArray(filters.stage)) {
      query = query.in('stage', filters.stage);
    } else {
      query = query.eq('stage', filters.stage);
    }
  }
  if (filters?.assignedTo) {
    query = query.eq('assigned_to', filters.assignedTo);
  }
  if (filters?.priority) {
    query = query.eq('priority', filters.priority);
  }
  if (filters?.clientId) {
    query = query.eq('client_id', filters.clientId);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data as Project[]) ?? [], count: count ?? 0 };
}

export async function getProject(id: string): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .select(PROJECT_SELECT)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Project;
}

export async function createProject(project: ProjectInsert): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert(project)
    .select()
    .single();
  if (error) throw error;
  return data as Project;
}

export async function updateProject(id: string, updates: ProjectUpdate): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Project;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}

export async function updateProjectStage(id: string, stage: PipelineStage): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update({ stage })
    .eq('id', id)
    .select(PROJECT_SELECT)
    .single();
  if (error) throw error;
  return data as Project;
}

export async function getProjectsByStage(): Promise<Record<PipelineStage, Project[]>> {
  const { data, error } = await supabase
    .from('projects')
    .select(PROJECT_SELECT)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const grouped: Record<string, Project[]> = {};
  for (const project of (data as Project[]) ?? []) {
    if (!grouped[project.stage]) grouped[project.stage] = [];
    grouped[project.stage].push(project);
  }
  return grouped as Record<PipelineStage, Project[]>;
}

export async function getProjectStats(): Promise<ProjectStats> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, stage, estimated_cost, system_size_kwp, actual_close_date');
  if (error) throw error;

  const projects = (data ?? []) as Array<{
    id: string;
    stage: PipelineStage;
    estimated_cost: number | null;
    system_size_kwp: number | null;
    actual_close_date: string | null;
  }>;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const byStage = {} as Record<PipelineStage, number>;
  let totalValue = 0;
  let totalCapacity = 0;
  let wonThisMonth = 0;
  let lostThisMonth = 0;

  for (const p of projects) {
    byStage[p.stage] = (byStage[p.stage] ?? 0) + 1;
    totalValue += p.estimated_cost ?? 0;
    totalCapacity += p.system_size_kwp ?? 0;
    if (p.stage === 'won' && p.actual_close_date && p.actual_close_date >= monthStart) {
      wonThisMonth++;
    }
    if (p.stage === 'closed_lost' && p.actual_close_date && p.actual_close_date >= monthStart) {
      lostThisMonth++;
    }
  }

  return {
    total: projects.length,
    byStage,
    totalValue,
    totalCapacity,
    wonThisMonth,
    lostThisMonth,
  };
}
