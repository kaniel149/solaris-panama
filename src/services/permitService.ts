import { supabase } from './supabase';
import type { Permit, PermitInsert, PermitUpdate, PermitStatus } from '../types/permit';

export async function getPermits(projectId?: string): Promise<Permit[]> {
  let query = supabase
    .from('permits')
    .select('*')
    .order('created_at', { ascending: false });

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as Permit[]) ?? [];
}

export async function getPermit(id: string): Promise<Permit> {
  const { data, error } = await supabase
    .from('permits')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Permit;
}

export async function createPermit(permit: PermitInsert): Promise<Permit> {
  const { data, error } = await supabase
    .from('permits')
    .insert(permit)
    .select()
    .single();
  if (error) throw error;
  return data as Permit;
}

export async function updatePermit(id: string, updates: PermitUpdate): Promise<Permit> {
  const { data, error } = await supabase
    .from('permits')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Permit;
}

export async function updatePermitStatus(id: string, status: PermitStatus): Promise<Permit> {
  const updates: Partial<Permit> = { status };
  if (status === 'submitted') {
    updates.submitted_at = new Date().toISOString();
  }
  if (status === 'approved') {
    updates.approved_at = new Date().toISOString();
  }
  const { data, error } = await supabase
    .from('permits')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Permit;
}
