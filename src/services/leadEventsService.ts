import { supabase } from './supabase';

// ─── Types ───────────────────────────────────────────────────────

export type EventType = 'meeting' | 'follow_up' | 'other';
export type EventStatus = 'scheduled' | 'done' | 'cancelled';

export interface LeadEvent {
  id: string;
  lead_id: string | null;
  event_type: EventType;
  title: string;
  notes: string | null;
  starts_at: string;
  ends_at: string | null;
  status: EventStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateLeadEventParams {
  lead_id?: string | null;
  event_type?: EventType;
  title: string;
  notes?: string | null;
  starts_at: string;
  ends_at?: string | null;
}

// ─── CRUD ────────────────────────────────────────────────────────

/** List all events whose starts_at falls within [rangeStart, rangeEnd]. */
export async function listEvents(rangeStart: string, rangeEnd: string): Promise<LeadEvent[]> {
  const { data, error } = await supabase
    .from('lead_events')
    .select('*')
    .gte('starts_at', rangeStart)
    .lte('starts_at', rangeEnd)
    .order('starts_at', { ascending: true });
  if (error) throw error;
  return (data as LeadEvent[]) ?? [];
}

/** List all events for a specific lead, ordered by starts_at ascending. */
export async function listEventsForLead(leadId: string): Promise<LeadEvent[]> {
  const { data, error } = await supabase
    .from('lead_events')
    .select('*')
    .eq('lead_id', leadId)
    .order('starts_at', { ascending: true });
  if (error) throw error;
  return (data as LeadEvent[]) ?? [];
}

/** Create a new lead event. */
export async function createEvent(params: CreateLeadEventParams): Promise<LeadEvent> {
  const { data, error } = await supabase
    .from('lead_events')
    .insert({
      lead_id: params.lead_id ?? null,
      event_type: params.event_type ?? 'meeting',
      title: params.title,
      notes: params.notes ?? null,
      starts_at: params.starts_at,
      ends_at: params.ends_at ?? null,
      status: 'scheduled',
    })
    .select()
    .single();
  if (error) throw error;
  return data as LeadEvent;
}

/** Update the status of an event (e.g. mark done or cancelled). */
export async function updateEventStatus(id: string, status: EventStatus): Promise<LeadEvent> {
  const { data, error } = await supabase
    .from('lead_events')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as LeadEvent;
}

/** Delete an event by id. */
export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('lead_events').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Map of lead_id → earliest upcoming follow_up date (starts_at >= now, still scheduled).
 * One query for the whole list — used for the "Seguimiento" badges + virtual filter
 * on the leads page instead of loading events per row.
 */
export async function getUpcomingFollowUps(): Promise<Record<string, string>> {
  // Includes OVERDUE follow-ups on purpose: a scheduled follow-up whose date
  // passed is exactly what sales needs to chase — it only leaves the map when
  // completed/cancelled.
  const { data, error } = await supabase
    .from('lead_events')
    .select('lead_id, starts_at')
    .eq('event_type', 'follow_up')
    .eq('status', 'scheduled')
    .order('starts_at', { ascending: true });
  if (error) throw error;
  const map: Record<string, string> = {};
  for (const row of (data as { lead_id: string | null; starts_at: string }[]) ?? []) {
    // ordered ascending → first occurrence is the earliest upcoming follow-up
    if (row.lead_id && !map[row.lead_id]) map[row.lead_id] = row.starts_at;
  }
  return map;
}

/**
 * Returns follow_up events that are overdue:
 * starts_at is in the past and status is still 'scheduled'.
 */
export async function getOverdueFollowUps(): Promise<LeadEvent[]> {
  const { data, error } = await supabase
    .from('lead_events')
    .select('*')
    .eq('event_type', 'follow_up')
    .eq('status', 'scheduled')
    .lt('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true });
  if (error) throw error;
  return (data as LeadEvent[]) ?? [];
}
