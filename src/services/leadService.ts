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
  google_conversion_uploaded_at?: string | null;
  meta_capi_lead_sent_at?: string | null;
  meta_capi_purchase_sent_at?: string | null;
  event_id?: string | null;
  fbc?: string | null;
  fbp?: string | null;
  client_user_agent?: string | null;
  client_ip?: string | null;
  auto_wa_sent_at?: string | null;
  auto_wa_type?: string | null;
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

export async function markLeadWon(id: string, dealValue: number, currency = 'USD'): Promise<CrmLead> {
  const { data, error } = await supabase.rpc('mark_lead_won', {
    p_lead_id: id,
    p_deal_value: dealValue,
    p_deal_currency: currency,
  });

  if (!error && data) return data as CrmLead;

  // Older databases may not have the helper yet. Keep the CRM usable.
  return updateLead(id, {
    status: 'won',
    deal_value: dealValue,
    deal_currency: currency,
    won_at: new Date().toISOString(),
  });
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
  proposal_sent: number;
  won: number;
  lost: number;
  stale: number;
  totalWonValue: number;
  bySource: Record<string, number>;
}> {
  const { data, error } = await supabase.from('leads').select('status, source, created_at, updated_at, deal_value');
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
    proposal_sent: leads.filter((l) => l.status === 'proposal_sent').length,
    won: leads.filter((l) => l.status === 'won').length,
    lost: leads.filter((l) => l.status === 'lost').length,
    stale: leads.filter((l) => isStaleLead(l as Pick<CrmLead, 'status' | 'created_at' | 'updated_at'>)).length,
    totalWonValue: leads
      .filter((l) => l.status === 'won')
      .reduce((sum, l) => sum + (Number(l.deal_value) || 0), 0),
    bySource,
  };
}

export function isStaleLead(lead: Pick<CrmLead, 'status' | 'created_at' | 'updated_at'>): boolean {
  const now = Date.now();
  const ageHours = (now - new Date(lead.created_at).getTime()) / 36e5;
  const idleDays = (now - new Date(lead.updated_at).getTime()) / 864e5;

  if (lead.status === 'new') return ageHours > 48;
  if (lead.status === 'contacted') return idleDays > 5;
  if (lead.status === 'qualified') return idleDays > 7;
  if (lead.status === 'proposal_sent') return idleDays > 10;
  return false;
}

export async function enqueueWhatsAppMessage(params: {
  leadId?: string;
  phone: string;
  message: string;
  automationType?: 'meta_ack' | 'wa_discovery' | 'followup' | 'manual';
  delaySeconds?: number;
}): Promise<{ ok: boolean; id?: string; deduped?: boolean }> {
  const res = await fetch('/api/automations/enqueue-whatsapp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lead_id: params.leadId,
      phone: params.phone,
      message: params.message,
      automation_type: params.automationType || 'manual',
      delay_seconds: params.delaySeconds ?? 0,
      idempotency_key: params.leadId ? `manual:${params.leadId}:${Date.now()}` : undefined,
    }),
  });
  if (!res.ok) throw new Error('WhatsApp enqueue failed');
  return res.json();
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
