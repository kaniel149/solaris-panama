// Lead Activity Service — localStorage CRUD for activity log (capped at 100/lead)

import type { LeadActivity, LeadActivityType } from '@/types/leadActivity';

const STORAGE_KEY = 'solaris-lead-activities';
const MAX_PER_LEAD = 100;

function generateId(): string {
  return `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ===== CRUD =====

export function getActivities(leadId: string): LeadActivity[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const all: LeadActivity[] = JSON.parse(raw);
    return all
      .filter((a) => a.leadId === leadId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch {
    return [];
  }
}

export function getAllActivities(): LeadActivity[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addActivity(
  leadId: string,
  type: LeadActivityType,
  description: string,
  metadata?: Record<string, string>
): LeadActivity {
  const activity: LeadActivity = {
    id: generateId(),
    leadId,
    type,
    description,
    metadata,
    timestamp: new Date().toISOString(),
  };

  const all = getAllActivities();
  all.push(activity);

  // Cap per lead: keep only last MAX_PER_LEAD activities per lead
  const byLead = new Map<string, LeadActivity[]>();
  for (const a of all) {
    if (!byLead.has(a.leadId)) byLead.set(a.leadId, []);
    byLead.get(a.leadId)!.push(a);
  }

  const capped: LeadActivity[] = [];
  for (const [, activities] of byLead) {
    const sorted = activities.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    capped.push(...sorted.slice(0, MAX_PER_LEAD));
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(capped));
  return activity;
}

export function clearActivities(leadId: string): void {
  const all = getAllActivities().filter((a) => a.leadId !== leadId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}
