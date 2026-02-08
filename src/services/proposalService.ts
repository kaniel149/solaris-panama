import { supabase } from './supabase';
import type { Proposal, ProposalInsert, ProposalUpdate, ProposalStatus, ProposalFilters } from '../types/proposal';

const DEFAULT_LIMIT = 50;

export async function getProposals(filters?: ProposalFilters): Promise<{ data: Proposal[]; count: number }> {
  const page = filters?.page ?? 0;
  const limit = filters?.limit ?? DEFAULT_LIMIT;
  const from = page * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('proposals')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filters?.projectId) {
    query = query.eq('project_id', filters.projectId);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data as Proposal[]) ?? [], count: count ?? 0 };
}

export async function getProposal(id: string): Promise<Proposal> {
  const { data, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Proposal;
}

export async function createProposal(proposal: ProposalInsert): Promise<Proposal> {
  const { data, error } = await supabase
    .from('proposals')
    .insert(proposal)
    .select()
    .single();
  if (error) throw error;
  return data as Proposal;
}

export async function updateProposal(id: string, updates: ProposalUpdate): Promise<Proposal> {
  const { data, error } = await supabase
    .from('proposals')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Proposal;
}

export async function getProposalsByProject(projectId: string): Promise<Proposal[]> {
  const { data, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('project_id', projectId)
    .order('version', { ascending: false });
  if (error) throw error;
  return (data as Proposal[]) ?? [];
}

export async function updateProposalStatus(id: string, status: ProposalStatus): Promise<Proposal> {
  const updates: Partial<Proposal> = { status };
  if (status === 'sent') {
    updates.sent_at = new Date().toISOString();
  }
  const { data, error } = await supabase
    .from('proposals')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Proposal;
}
