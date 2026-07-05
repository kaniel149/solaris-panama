import { supabase } from './supabase';
import type { CrmLead } from './leadService';
import type { LeadEvent } from './leadEventsService';

// ─── Types ───────────────────────────────────────────────────────

export interface StatusHistoryRow {
  id: string;
  lead_id: string;
  old_status: string | null;
  new_status: string;
  changed_at: string;
}

export type TimelineItemKind = 'status_change' | 'event' | 'created';

export interface TimelineItem {
  id: string;
  kind: TimelineItemKind;
  timestamp: string;
  label: string;
  meta?: string | null;
}

// Journey stages in display order
export const JOURNEY_STAGES = ['new', 'contacted', 'qualified', 'proposal_sent', 'won'] as const;
export type JourneyStage = (typeof JOURNEY_STAGES)[number];

export interface StageInfo {
  stage: JourneyStage;
  reachedAt: string | null;
  daysInStage: number | null;
}

// ─── Queries ─────────────────────────────────────────────────────

export async function getStatusHistory(leadId: string): Promise<StatusHistoryRow[]> {
  const { data, error } = await supabase
    .from('lead_status_history')
    .select('*')
    .eq('lead_id', leadId)
    .order('changed_at', { ascending: true });
  if (error) throw error;
  return (data as StatusHistoryRow[]) ?? [];
}

/**
 * Build a journey for a lead. For leads created before the trigger existed
 * (history table is empty or missing the initial row), synthesise a baseline
 * entry from lead.created_at + lead.status so the stepper always has data.
 */
export function buildJourney(lead: CrmLead, history: StatusHistoryRow[]): StageInfo[] {
  // Ensure we have at least one entry
  const rows = history.length > 0
    ? history
    : [{ id: 'synthetic', lead_id: lead.id, old_status: null, new_status: lead.status, changed_at: lead.created_at }];

  const now = new Date();

  return JOURNEY_STAGES.map((stage) => {
    // Find the first time this stage was entered
    const entry = rows.find((r) => r.new_status === stage);
    if (!entry) return { stage, reachedAt: null, daysInStage: null };

    const reachedAt = entry.changed_at;

    // Find the next transition out of this stage
    const entryIdx = rows.indexOf(entry);
    const exit = rows.slice(entryIdx + 1).find((r) => r.old_status === stage);

    const endTime = exit ? new Date(exit.changed_at) : now;
    const daysInStage = Math.max(0, Math.round((endTime.getTime() - new Date(reachedAt).getTime()) / 864e5));

    return { stage, reachedAt, daysInStage };
  });
}

/**
 * Merge status history rows + lead events into a single timeline sorted descending.
 */
export function buildTimeline(
  lead: CrmLead,
  history: StatusHistoryRow[],
  events: LeadEvent[]
): TimelineItem[] {
  const items: TimelineItem[] = [];

  // Created event
  items.push({
    id: `created-${lead.id}`,
    kind: 'created',
    timestamp: lead.created_at,
    label: `Lead creado · ${lead.source}`,
    meta: [lead.utm_source, lead.campaign].filter(Boolean).join(' / ') || null,
  });

  // Status transitions
  for (const row of history) {
    if (!row.old_status) continue; // skip the synthetic insert row (same as created)
    items.push({
      id: row.id,
      kind: 'status_change',
      timestamp: row.changed_at,
      label: `${statusLabel(row.old_status)} → ${statusLabel(row.new_status)}`,
    });
  }

  // Lead events
  for (const ev of events) {
    const typeLabel = ev.event_type === 'meeting' ? 'Cita' : ev.event_type === 'follow_up' ? 'Seguimiento' : 'Evento';
    const statusSuffix = ev.status === 'done' ? ' ✓' : ev.status === 'cancelled' ? ' ✗' : '';
    items.push({
      id: `event-${ev.id}`,
      kind: 'event',
      timestamp: ev.starts_at,
      label: `${typeLabel}: ${ev.title}${statusSuffix}`,
      meta: ev.notes ?? null,
    });
  }

  return items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

// ─── Funnel stats ──────────────────────────────────────────────────────────

export interface FunnelStageStats {
  stage: JourneyStage;
  count: number;
  avgDays: number | null;
}

/**
 * Compute funnel counts + avg days-in-stage from a list of leads and their histories.
 * Designed to run client-side so no extra RPC is needed.
 */
export function computeFunnel(
  leads: CrmLead[],
  histories: Record<string, StatusHistoryRow[]>
): FunnelStageStats[] {
  return JOURNEY_STAGES.map((stage) => {
    const inStage = leads.filter((l) => l.status === stage);
    const daysList = inStage
      .map((l) => {
        const hist = histories[l.id] ?? [];
        const journey = buildJourney(l, hist);
        return journey.find((s) => s.stage === stage)?.daysInStage ?? null;
      })
      .filter((d): d is number => d !== null);

    return {
      stage,
      count: inStage.length,
      avgDays: daysList.length > 0 ? Math.round(daysList.reduce((a, b) => a + b, 0) / daysList.length) : null,
    };
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    new: 'Nuevo', contacted: 'Contactado', qualified: 'Calificado',
    proposal_sent: 'Propuesta', won: 'Ganado', lost: 'Perdido',
    cold: 'Frío', warm: 'Tibio', hot: 'Caliente',
    vendor: 'Proveedor', partner: 'Socio', not_a_lead: 'No es Lead',
  };
  return map[status] ?? status;
}
