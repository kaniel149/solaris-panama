import { supabase } from './supabase';
import type { MonitoringSite, MonitoringSiteInsert, MonitoringSiteUpdate, MonitoringFilters } from '../types/monitoring';

const DEFAULT_LIMIT = 50;

export async function getSites(filters?: MonitoringFilters): Promise<{ data: MonitoringSite[]; count: number }> {
  const page = filters?.page ?? 0;
  const limit = filters?.limit ?? DEFAULT_LIMIT;
  const from = page * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('monitoring_sites')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filters?.platform) {
    query = query.eq('platform', filters.platform);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data as MonitoringSite[]) ?? [], count: count ?? 0 };
}

export async function getSite(id: string): Promise<MonitoringSite> {
  const { data, error } = await supabase
    .from('monitoring_sites')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as MonitoringSite;
}

export async function createSite(site: MonitoringSiteInsert): Promise<MonitoringSite> {
  const { data, error } = await supabase
    .from('monitoring_sites')
    .insert(site)
    .select()
    .single();
  if (error) throw error;
  return data as MonitoringSite;
}

export async function updateSite(id: string, updates: MonitoringSiteUpdate): Promise<MonitoringSite> {
  const { data, error } = await supabase
    .from('monitoring_sites')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as MonitoringSite;
}

export async function getSitesByProject(projectId: string): Promise<MonitoringSite[]> {
  const { data, error } = await supabase
    .from('monitoring_sites')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as MonitoringSite[]) ?? [];
}
