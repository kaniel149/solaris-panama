import { supabase } from './supabase';
import type { Installation, InstallationInsert, InstallationUpdate, InstallationFilters } from '../types/installation';

const DEFAULT_LIMIT = 50;

export async function getInstallations(filters?: InstallationFilters): Promise<{ data: Installation[]; count: number }> {
  const page = filters?.page ?? 0;
  const limit = filters?.limit ?? DEFAULT_LIMIT;
  const from = page * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('installations')
    .select('*', { count: 'exact' })
    .order('scheduled_start', { ascending: true })
    .range(from, to);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.crewLead) {
    query = query.eq('crew_lead', filters.crewLead);
  }
  if (filters?.fromDate) {
    query = query.gte('scheduled_start', filters.fromDate);
  }
  if (filters?.toDate) {
    query = query.lte('scheduled_start', filters.toDate);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data as Installation[]) ?? [], count: count ?? 0 };
}

export async function getInstallation(id: string): Promise<Installation> {
  const { data, error } = await supabase
    .from('installations')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Installation;
}

export async function createInstallation(installation: InstallationInsert): Promise<Installation> {
  const { data, error } = await supabase
    .from('installations')
    .insert(installation)
    .select()
    .single();
  if (error) throw error;
  return data as Installation;
}

export async function updateInstallation(id: string, updates: InstallationUpdate): Promise<Installation> {
  const { data, error } = await supabase
    .from('installations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Installation;
}

export async function getUpcomingInstallations(days: number = 14): Promise<Installation[]> {
  const now = new Date().toISOString().split('T')[0];
  const future = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('installations')
    .select('*')
    .gte('scheduled_start', now)
    .lte('scheduled_start', future)
    .in('status', ['planned', 'in_progress'])
    .order('scheduled_start', { ascending: true });
  if (error) throw error;
  return (data as Installation[]) ?? [];
}
