import { supabase } from './supabase';
import type { Client, ClientInsert, ClientUpdate, ClientFilters } from '../types/client';

const DEFAULT_LIMIT = 50;

export async function getClients(filters?: ClientFilters): Promise<{ data: Client[]; count: number }> {
  const page = filters?.page ?? 0;
  const limit = filters?.limit ?? DEFAULT_LIMIT;
  const from = page * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('clients')
    .select('*, assigned_member:team_members!assigned_to(*)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filters?.search) {
    query = query.or(
      `company_name.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
    );
  }
  if (filters?.sector) {
    query = query.eq('sector', filters.sector);
  }
  if (filters?.assignedTo) {
    query = query.eq('assigned_to', filters.assignedTo);
  }
  if (filters?.city) {
    query = query.eq('city', filters.city);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data as Client[]) ?? [], count: count ?? 0 };
}

export async function getClient(id: string): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .select('*, assigned_member:team_members!assigned_to(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Client;
}

export async function createClient(client: ClientInsert): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .insert(client)
    .select()
    .single();
  if (error) throw error;
  return data as Client;
}

export async function updateClient(id: string, updates: ClientUpdate): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Client;
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw error;
}

export async function getClientsByAssignee(userId: string): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*, assigned_member:team_members!assigned_to(*)')
    .eq('assigned_to', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as Client[]) ?? [];
}

export async function searchClients(query: string): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('id, company_name, contact_name, email, city, sector')
    .or(
      `company_name.ilike.%${query}%,contact_name.ilike.%${query}%,email.ilike.%${query}%`
    )
    .limit(20);
  if (error) throw error;
  return (data as Client[]) ?? [];
}
