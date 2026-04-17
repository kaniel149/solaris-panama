import { supabase } from './supabase';

// ─── Types ───────────────────────────────────────────────────────

export interface CrmLead {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  phone: string | null;
  email: string | null;
  monthly_bill: number | null;
  message: string | null;
  location: string | null;
  source: string;
  campaign: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
  ad_id?: string | null;
  ad_set_id?: string | null;
  form_id?: string | null;
  platform_lead_id?: string | null;
  // Migration 008
  deal_value?: number | null;
  deal_currency?: string | null;
  won_at?: string | null;
  status: string;
  assigned_to: string | null;
  lead_score: number;
  notes: string | null;
  whatsapp_chat_id: string | null;
}

export interface LeadNote {
  id: string;
  lead_id: string;
  author_name: string | null;
  content: string;
  created_at: string;
}

export interface LeadFilters {
  search?: string;
  status?: string;
  source?: string;
  assigned_to?: string;
  page?: number;
  limit?: number;
}

// ─── CRUD ────────────────────────────────────────────────────────

export async function getLeads(filters?: LeadFilters): Promise<{ data: CrmLead[]; count: number }> {
  const page = filters?.page ?? 0;
  const limit = filters?.limit ?? 50;
  const from = page * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
    );
  }
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.source) query = query.eq('source', filters.source);
  if (filters?.assigned_to) query = query.eq('assigned_to', filters.assigned_to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data as CrmLead[]) ?? [], count: count ?? 0 };
}

export async function getLead(id: string): Promise<CrmLead> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as CrmLead;
}

export async function updateLead(id: string, updates: Partial<CrmLead>): Promise<CrmLead> {
  const { data, error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as CrmLead;
}

export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabase.from('leads').delete().eq('id', id);
  if (error) throw error;
}

export async function createLead(lead: Partial<CrmLead>): Promise<CrmLead> {
  const { data, error } = await supabase
    .from('leads')
    .insert(lead)
    .select()
    .single();
  if (error) throw error;
  return data as CrmLead;
}

// ─── Notes ───────────────────────────────────────────────────────

export async function getLeadNotes(leadId: string): Promise<LeadNote[]> {
  const { data, error } = await supabase
    .from('lead_notes')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as LeadNote[]) ?? [];
}

export async function addLeadNote(leadId: string, content: string, authorName: string): Promise<LeadNote> {
  const { data, error } = await supabase
    .from('lead_notes')
    .insert({ lead_id: leadId, content, author_name: authorName })
    .select()
    .single();
  if (error) throw error;
  return data as LeadNote;
}

// ─── Stats ───────────────────────────────────────────────────────

export async function getLeadStats(): Promise<{
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  won: number;
  bySource: Record<string, number>;
}> {
  const { data, error } = await supabase.from('leads').select('status, source');
  if (error) throw error;

  const leads = data || [];
  const bySource: Record<string, number> = {};

  for (const l of leads) {
    bySource[l.source] = (bySource[l.source] || 0) + 1;
  }

  return {
    total: leads.length,
    new: leads.filter((l) => l.status === 'new').length,
    contacted: leads.filter((l) => l.status === 'contacted').length,
    qualified: leads.filter((l) => l.status === 'qualified').length,
    won: leads.filter((l) => l.status === 'won').length,
    bySource,
  };
}

// ─── WhatsApp Sync (calls API endpoint) ──────────────────────────

export async function syncWhatsAppLeads(
  conversations: Array<{ phone: string; name: string; lastMessage: string; timestamp: string; chatId: string }>
): Promise<{ created: number; skipped: number }> {
  const res = await fetch('/api/leads/whatsapp-sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversations }),
  });
  if (!res.ok) throw new Error('WhatsApp sync failed');
  return res.json();
}
