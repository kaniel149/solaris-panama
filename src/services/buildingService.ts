import { supabase } from './supabase';
import type { Building, BuildingInsert, BuildingUpdate } from '../types/building';

export async function getBuildings(clientId?: string): Promise<Building[]> {
  let query = supabase
    .from('buildings')
    .select('*')
    .order('created_at', { ascending: false });

  if (clientId) {
    query = query.eq('client_id', clientId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as Building[]) ?? [];
}

export async function getBuilding(id: string): Promise<Building> {
  const { data, error } = await supabase
    .from('buildings')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Building;
}

export async function createBuilding(building: BuildingInsert): Promise<Building> {
  const { data, error } = await supabase
    .from('buildings')
    .insert(building)
    .select()
    .single();
  if (error) throw error;
  return data as Building;
}

export async function updateBuilding(id: string, updates: BuildingUpdate): Promise<Building> {
  const { data, error } = await supabase
    .from('buildings')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Building;
}

export async function deleteBuilding(id: string): Promise<void> {
  const { error } = await supabase.from('buildings').delete().eq('id', id);
  if (error) throw error;
}
