# Roi Sales Access + Activity Email Alerts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create sales user tesler.roi@gmail.com in Solaris Panama CRM and email k@kanielt.com a login alert + session activity summary whenever Roi is active.

**Architecture:** A Vercel cron (`*/10 min`) reads Roi's `last_sign_in_at` (Supabase admin API) and his attributed activity (new `created_by`/`changed_by`/`updated_by` columns stamped by `auth.uid()` — zero frontend changes). Pure session logic lives in `api/lib/activity-monitor.ts`; Hebrew email formatting + Resend sending in `api/lib/email-notify.ts`; state persists in `activity_monitor_state`.

**Tech Stack:** Vercel serverless (TypeScript, `@vercel/node`), Supabase (Postgres + Auth admin API, service role), Resend, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-10-roi-sales-access-activity-alerts-design.md`

**Repo:** `~/Desktop/projects/solar/panama/solaris-panama-repo` · Supabase project `ubuazgwxourbzruanxvs` · Vercel project `landing`

---

## Key discovery (deviation from spec)

`lead_events`, `tasks`, `lead_status_history`, `leads` have **no user-attribution columns**. Migration 062 adds them:
- `lead_events.created_by`, `tasks.created_by` — `uuid DEFAULT auth.uid()` (stamped automatically on authenticated PostgREST inserts)
- `lead_status_history.changed_by` — stamped inside the existing `record_lead_status_change()` trigger via `auth.uid()` (works in SECURITY DEFINER — it reads `request.jwt.claims`)
- `leads.updated_by` — new BEFORE UPDATE trigger stamping `auth.uid()`

Service-role writes (crons, webhooks) have `auth.uid() = NULL` → correctly excluded from Roi's activity.

---

### Task 1: Migration 062 — attribution columns + monitor state

**Files:**
- Create: `supabase/migrations/062_activity_attribution.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 062: user attribution on activity tables + activity monitor state
-- Enables per-user activity tracking (Roi alerts) with zero frontend changes.

-- ── attribution columns ──
ALTER TABLE lead_events ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();
ALTER TABLE tasks       ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();
ALTER TABLE lead_status_history ADD COLUMN IF NOT EXISTS changed_by uuid;
ALTER TABLE leads       ADD COLUMN IF NOT EXISTS updated_by uuid;

CREATE INDEX IF NOT EXISTS idx_lead_events_created_by ON lead_events(created_by, created_at DESC) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by, created_at DESC) WHERE created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lead_status_history_changed_by ON lead_status_history(changed_by, changed_at DESC) WHERE changed_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_updated_by ON leads(updated_by, updated_at DESC) WHERE updated_by IS NOT NULL;

-- ── stamp changed_by in the existing status-history trigger ──
CREATE OR REPLACE FUNCTION record_lead_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO lead_status_history(lead_id, old_status, new_status, changed_at, changed_by)
    VALUES (NEW.id, NULL, NEW.status, now(), auth.uid());
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO lead_status_history(lead_id, old_status, new_status, changed_at, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, now(), auth.uid());
  END IF;
  RETURN NULL;
END;
$$;

-- ── stamp updated_by on leads updates (keeps previous value for service-role writes) ──
CREATE OR REPLACE FUNCTION stamp_leads_updated_by()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_by = COALESCE(auth.uid(), NEW.updated_by);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_updated_by ON leads;
CREATE TRIGGER trg_leads_updated_by
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION stamp_leads_updated_by();

-- ── cron state (service-role access only — RLS on, no policies) ──
CREATE TABLE IF NOT EXISTS activity_monitor_state (
  user_id uuid PRIMARY KEY,
  last_seen_sign_in_at timestamptz,
  session_started_at timestamptz,
  session_last_activity_at timestamptz,
  last_summary_sent_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE activity_monitor_state ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/062_activity_attribution.sql
git commit -m "feat(db): migration 062 — activity attribution columns + monitor state table"
```

> Migration is APPLIED to prod in Task 6 (deployment), not here.

---

### Task 2: Pure session logic — `activity-monitor.ts` (TDD)

**Files:**
- Create: `api/lib/activity-monitor.ts`
- Create: `api/lib/__tests__/activity-monitor.test.ts`
- Modify: `vitest.config.ts` (include `api/**`)

- [ ] **Step 1: Extend vitest include**

In `vitest.config.ts` replace the `test` line with:

```ts
  test: { environment: 'node', include: ['src/**/*.test.ts', 'api/**/*.test.ts'] },
```

- [ ] **Step 2: Write the failing tests**

`api/lib/__tests__/activity-monitor.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { decide, IDLE_MINUTES, type MonitorState } from '../activity-monitor';

const T0 = '2026-07-10T08:00:00.000Z';
const min = (n: number) => new Date(Date.parse(T0) + n * 60_000).toISOString();

const empty: MonitorState = {
  lastSeenSignInAt: null,
  sessionStartedAt: null,
  sessionLastActivityAt: null,
  lastSummarySentAt: null,
};

describe('decide', () => {
  it('fresh sign-in → login alert + session opens', () => {
    const { actions, next } = decide(empty, { lastSignInAt: T0, latestActivityAt: null, now: min(1) });
    expect(actions).toEqual(['send_login_alert']);
    expect(next.lastSeenSignInAt).toBe(T0);
    expect(next.sessionStartedAt).toBe(min(1));
    expect(next.sessionLastActivityAt).toBe(min(1)); // idle timer starts at login
  });

  it('activity without new sign-in (persistent session) → login alert + session opens', () => {
    const state = { ...empty, lastSeenSignInAt: T0 };
    const { actions, next } = decide(state, { lastSignInAt: T0, latestActivityAt: min(5), now: min(6) });
    expect(actions).toEqual(['send_login_alert']);
    expect(next.sessionStartedAt).toBe(min(6));
    expect(next.sessionLastActivityAt).toBe(min(5));
  });

  it('no sign-in, no activity → nothing', () => {
    const { actions, next } = decide(empty, { lastSignInAt: null, latestActivityAt: null, now: T0 });
    expect(actions).toEqual([]);
    expect(next).toEqual(empty);
  });

  it('session open, activity continues → no action, activity timestamp advances', () => {
    const state: MonitorState = { lastSeenSignInAt: T0, sessionStartedAt: T0, sessionLastActivityAt: min(5), lastSummarySentAt: null };
    const { actions, next } = decide(state, { lastSignInAt: T0, latestActivityAt: min(12), now: min(15) });
    expect(actions).toEqual([]);
    expect(next.sessionLastActivityAt).toBe(min(12));
  });

  it(`idle ${IDLE_MINUTES}min → final summary + session closes`, () => {
    const state: MonitorState = { lastSeenSignInAt: T0, sessionStartedAt: T0, sessionLastActivityAt: min(10), lastSummarySentAt: null };
    const { actions, next } = decide(state, { lastSignInAt: T0, latestActivityAt: min(10), now: min(10 + IDLE_MINUTES) });
    expect(actions).toEqual(['send_final_summary']);
    expect(next.sessionStartedAt).toBeNull();
    expect(next.sessionLastActivityAt).toBeNull();
    expect(next.lastSummarySentAt).toBe(min(10 + IDLE_MINUTES));
  });

  it('continuous session ≥2h → interim summary, once per 2h', () => {
    const state: MonitorState = { lastSeenSignInAt: T0, sessionStartedAt: T0, sessionLastActivityAt: min(115), lastSummarySentAt: null };
    const r1 = decide(state, { lastSignInAt: T0, latestActivityAt: min(120), now: min(121) });
    expect(r1.actions).toEqual(['send_interim_summary']);
    expect(r1.next.lastSummarySentAt).toBe(min(121));
    // 10 minutes later — no second interim
    const r2 = decide(r1.next, { lastSignInAt: T0, latestActivityAt: min(130), now: min(131) });
    expect(r2.actions).toEqual([]);
  });

  it('new sign-in while previous session idle → closes old (summary) + opens new (login alert)', () => {
    const state: MonitorState = { lastSeenSignInAt: T0, sessionStartedAt: T0, sessionLastActivityAt: min(10), lastSummarySentAt: null };
    const { actions, next } = decide(state, { lastSignInAt: min(60), latestActivityAt: min(10), now: min(61) });
    expect(actions).toEqual(['send_final_summary', 'send_login_alert']);
    expect(next.sessionStartedAt).toBe(min(61));
  });
});
```

- [ ] **Step 3: Run tests — verify they fail**

Run: `npx vitest run api/lib/__tests__/activity-monitor.test.ts`
Expected: FAIL — cannot resolve `../activity-monitor`

- [ ] **Step 4: Implement `api/lib/activity-monitor.ts`**

```ts
/**
 * Pure session logic for per-user activity monitoring.
 * State machine: closed → (sign-in OR new activity) → open → (30min idle) → closed.
 * Interim summary every 2h during a continuous session.
 */

export const IDLE_MINUTES = 30;
export const INTERIM_HOURS = 2;

export interface MonitorState {
  lastSeenSignInAt: string | null;
  sessionStartedAt: string | null;
  sessionLastActivityAt: string | null;
  lastSummarySentAt: string | null;
}

export interface MonitorInput {
  lastSignInAt: string | null;    // auth.users.last_sign_in_at
  latestActivityAt: string | null; // max attributed activity timestamp
  now: string;                     // ISO
}

export type MonitorAction = 'send_login_alert' | 'send_final_summary' | 'send_interim_summary';

const ts = (iso: string | null): number => (iso ? Date.parse(iso) : 0);

export function decide(state: MonitorState, input: MonitorInput): { actions: MonitorAction[]; next: MonitorState } {
  const actions: MonitorAction[] = [];
  const next: MonitorState = { ...state };
  const now = ts(input.now);

  const newLogin = !!input.lastSignInAt && ts(input.lastSignInAt) > ts(state.lastSeenSignInAt);
  const newActivity = !!input.latestActivityAt && ts(input.latestActivityAt) > ts(state.sessionLastActivityAt);

  // 1. close an idle session first (also when a new login supersedes it)
  if (next.sessionStartedAt && !newActivity) {
    const idleMs = now - ts(next.sessionLastActivityAt ?? next.sessionStartedAt);
    if (idleMs >= IDLE_MINUTES * 60_000) {
      actions.push('send_final_summary');
      next.sessionStartedAt = null;
      next.sessionLastActivityAt = null;
      next.lastSummarySentAt = input.now;
    }
  }

  // 2. open a session on new sign-in or new activity
  if (newLogin || (newActivity && !next.sessionStartedAt)) {
    actions.push('send_login_alert');
    if (input.lastSignInAt) next.lastSeenSignInAt = input.lastSignInAt;
    if (!next.sessionStartedAt) {
      next.sessionStartedAt = input.now;
      next.sessionLastActivityAt = input.latestActivityAt ?? input.now;
      next.lastSummarySentAt = null;
    }
  }

  // 3. advance activity clock
  if (newActivity && next.sessionStartedAt) {
    next.sessionLastActivityAt = input.latestActivityAt;
  }

  // 4. interim summary for long continuous sessions
  if (
    next.sessionStartedAt &&
    !actions.length &&
    now - ts(next.sessionStartedAt) >= INTERIM_HOURS * 3_600_000 &&
    now - ts(next.lastSummarySentAt ?? next.sessionStartedAt) >= INTERIM_HOURS * 3_600_000
  ) {
    actions.push('send_interim_summary');
    next.lastSummarySentAt = input.now;
  }

  return { actions, next };
}
```

- [ ] **Step 5: Run tests — verify they pass**

Run: `npx vitest run api/lib/__tests__/activity-monitor.test.ts`
Expected: 7 passed

- [ ] **Step 6: Commit**

```bash
git add api/lib/activity-monitor.ts api/lib/__tests__/activity-monitor.test.ts vitest.config.ts
git commit -m "feat: pure session-detection logic for activity monitor (TDD)"
```

---

### Task 3: Hebrew emails + Resend sender — `email-notify.ts` (TDD on formatting)

**Files:**
- Create: `api/lib/email-notify.ts`
- Create: `api/lib/__tests__/email-notify.test.ts`

- [ ] **Step 1: Write the failing tests**

`api/lib/__tests__/email-notify.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatLoginAlert, formatSummary, type ActivityReport } from '../email-notify';

const emptyReport: ActivityReport = { leadsUpdated: [], statusChanges: [], events: [], tasks: [] };

describe('formatLoginAlert', () => {
  it('has Hebrew subject with name', () => {
    const { subject, text } = formatLoginAlert('רואי', '2026-07-10T08:00:00.000Z');
    expect(subject).toContain('רואי');
    expect(subject).toContain('נכנס');
    expect(text).toContain('נכנס למערכת');
  });
});

describe('formatSummary', () => {
  it('empty session → explicit "no updates" line', () => {
    const { text } = formatSummary('רואי', emptyReport, { interim: false, sessionStart: '2026-07-10T08:00:00.000Z' });
    expect(text).toContain('לא בוצעו עדכונים');
  });

  it('lists activity counts and items', () => {
    const report: ActivityReport = {
      leadsUpdated: [{ id: '1', name: 'Juan Perez', status: 'warm', at: '2026-07-10T08:05:00.000Z' }],
      statusChanges: [{ leadName: 'Juan Perez', from: 'cold', to: 'warm', at: '2026-07-10T08:06:00.000Z' }],
      events: [{ title: 'Visita técnica', type: 'meeting', startsAt: '2026-07-11T14:00:00.000Z' }],
      tasks: [{ title: 'Enviar propuesta', status: 'todo' }],
    };
    const { subject, text } = formatSummary('רואי', report, { interim: true, sessionStart: '2026-07-10T08:00:00.000Z' });
    expect(subject).toContain('ביניים');
    expect(text).toContain('Juan Perez');
    expect(text).toContain('cold → warm');
    expect(text).toContain('Visita técnica');
    expect(text).toContain('Enviar propuesta');
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `npx vitest run api/lib/__tests__/email-notify.test.ts`
Expected: FAIL — cannot resolve `../email-notify`

- [ ] **Step 3: Implement `api/lib/email-notify.ts`**

```ts
/**
 * Hebrew activity emails via Resend → k@kanielt.com.
 * Formatting is pure (unit-tested); sendEmail is a thin Resend wrapper
 * following the pattern in api/cron/bridge-watchdog.ts.
 */

export const ALERT_TO = 'k@kanielt.com';
const FROM = 'Solaris CRM <alerts@solaris-panama.com>';
const TZ = 'America/Panama';

export interface ActivityReport {
  leadsUpdated: { id: string; name: string; status: string | null; at: string }[];
  statusChanges: { leadName: string; from: string | null; to: string; at: string }[];
  events: { title: string; type: string; startsAt: string }[];
  tasks: { title: string; status: string }[];
}

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString('he-IL', { timeZone: TZ, hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

export function formatLoginAlert(name: string, atIso: string): { subject: string; text: string } {
  return {
    subject: `🟢 ${name} נכנס למערכת — Solaris Panama`,
    text: `${name} נכנס למערכת ה-CRM.\nזמן (פנמה): ${fmtTime(atIso)}\n\nסיכום פעילות יישלח בסיום הסשן.`,
  };
}

export function formatSummary(
  name: string,
  r: ActivityReport,
  opts: { interim: boolean; sessionStart: string }
): { subject: string; text: string } {
  const total = r.leadsUpdated.length + r.statusChanges.length + r.events.length + r.tasks.length;
  const kind = opts.interim ? 'סיכום ביניים' : 'סיכום סשן';
  const lines: string[] = [`${kind} — ${name} (מתחילת הסשן ${fmtTime(opts.sessionStart)}):`, ''];

  if (total === 0) {
    lines.push('נכנס אך לא בוצעו עדכונים.');
  } else {
    if (r.statusChanges.length) {
      lines.push(`🔄 שינויי סטטוס (${r.statusChanges.length}):`);
      for (const s of r.statusChanges) lines.push(`  • ${s.leadName}: ${s.from ?? '—'} → ${s.to} (${fmtTime(s.at)})`);
      lines.push('');
    }
    if (r.leadsUpdated.length) {
      lines.push(`📝 לידים שעודכנו (${r.leadsUpdated.length}):`);
      for (const l of r.leadsUpdated) lines.push(`  • ${l.name}${l.status ? ` [${l.status}]` : ''} (${fmtTime(l.at)})`);
      lines.push('');
    }
    if (r.events.length) {
      lines.push(`📅 פגישות/מעקבים שנקבעו (${r.events.length}):`);
      for (const e of r.events) lines.push(`  • ${e.title} — ${fmtTime(e.startsAt)}`);
      lines.push('');
    }
    if (r.tasks.length) {
      lines.push(`✅ משימות חדשות (${r.tasks.length}):`);
      for (const t of r.tasks) lines.push(`  • ${t.title} [${t.status}]`);
    }
  }

  return { subject: `📊 ${kind}: ${name} — ${total} פעולות · Solaris Panama`, text: lines.join('\n') };
}

export async function sendEmail(msg: { subject: string; text: string }): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: 'resend_env_missing' };

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: ALERT_TO, subject: msg.subject, text: msg.text }),
  });
  if (!res.ok) return { ok: false, error: `resend_${res.status}` };
  return { ok: true };
}
```

- [ ] **Step 4: Run tests — verify they pass**

Run: `npx vitest run api/lib/__tests__/email-notify.test.ts`
Expected: 3 passed

- [ ] **Step 5: Commit**

```bash
git add api/lib/email-notify.ts api/lib/__tests__/email-notify.test.ts
git commit -m "feat: Hebrew activity emails (login alert + session summary) via Resend"
```

---

### Task 4: Cron endpoint + schedule

**Files:**
- Create: `api/cron/roi-activity-alert.ts`
- Modify: `vercel.json` (crons array)

- [ ] **Step 1: Implement `api/cron/roi-activity-alert.ts`**

```ts
/**
 * Roi Activity Alert — runs every 10 min via Vercel Cron.
 *
 * 1. Reads Roi's last_sign_in_at (Supabase admin API) + his attributed
 *    activity (updated_by / changed_by / created_by = Roi, migration 062).
 * 2. decide() (pure, api/lib/activity-monitor.ts) picks actions:
 *    login alert / final session summary (30min idle) / interim summary (2h).
 * 3. Emails k@kanielt.com in Hebrew via Resend; persists state in
 *    activity_monitor_state ONLY after all sends succeed (failed run retries).
 *
 * Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, CRON_SECRET.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { decide, type MonitorState } from '../lib/activity-monitor';
import { formatLoginAlert, formatSummary, sendEmail, type ActivityReport } from '../lib/email-notify';

const MONITORED_EMAIL = 'tesler.roi@gmail.com';
const MONITORED_NAME = 'רואי';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function findUser(): Promise<{ id: string; lastSignInAt: string | null } | null> {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) return null;
  const u = data.users.find((x) => x.email?.toLowerCase() === MONITORED_EMAIL);
  return u ? { id: u.id, lastSignInAt: u.last_sign_in_at ?? null } : null;
}

async function fetchReport(uid: string, sinceIso: string): Promise<ActivityReport> {
  const [leads, statuses, events, tasks] = await Promise.all([
    supabase.from('leads').select('id, full_name, status, updated_at')
      .eq('updated_by', uid).gte('updated_at', sinceIso).order('updated_at', { ascending: false }).limit(50),
    supabase.from('lead_status_history').select('old_status, new_status, changed_at, leads(full_name)')
      .eq('changed_by', uid).gte('changed_at', sinceIso).order('changed_at', { ascending: false }).limit(50),
    supabase.from('lead_events').select('title, event_type, starts_at, created_at')
      .eq('created_by', uid).gte('created_at', sinceIso).order('created_at', { ascending: false }).limit(50),
    supabase.from('tasks').select('title, status, created_at')
      .eq('created_by', uid).gte('created_at', sinceIso).order('created_at', { ascending: false }).limit(50),
  ]);

  return {
    leadsUpdated: (leads.data ?? []).map((l) => ({ id: l.id, name: l.full_name ?? 'ליד ללא שם', status: l.status, at: l.updated_at })),
    statusChanges: (statuses.data ?? []).map((s: any) => ({
      leadName: s.leads?.full_name ?? 'ליד ללא שם', from: s.old_status, to: s.new_status, at: s.changed_at,
    })),
    events: (events.data ?? []).map((e) => ({ title: e.title, type: e.event_type, startsAt: e.starts_at })),
    tasks: (tasks.data ?? []).map((t) => ({ title: t.title, status: t.status })),
  };
}

function latestTimestamp(r: ActivityReport): string | null {
  const all = [
    ...r.leadsUpdated.map((x) => x.at),
    ...r.statusChanges.map((x) => x.at),
  ].filter(Boolean);
  if (!all.length) return null;
  return all.sort().at(-1) ?? null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (!process.env.RESEND_API_KEY) {
    console.error('[roi-alert] RESEND_API_KEY missing');
    return res.status(500).json({ error: 'resend_env_missing' });
  }

  const user = await findUser();
  if (!user) return res.status(500).json({ error: 'monitored_user_not_found' });

  const nowIso = new Date().toISOString();

  // load state
  const { data: row } = await supabase.from('activity_monitor_state').select('*').eq('user_id', user.id).maybeSingle();
  const state: MonitorState = {
    lastSeenSignInAt: row?.last_seen_sign_in_at ?? null,
    sessionStartedAt: row?.session_started_at ?? null,
    sessionLastActivityAt: row?.session_last_activity_at ?? null,
    lastSummarySentAt: row?.last_summary_sent_at ?? null,
  };

  // detection window: open session start, else last activity/summary, else 24h back
  const sinceIso =
    state.sessionStartedAt ??
    state.sessionLastActivityAt ??
    state.lastSummarySentAt ??
    new Date(Date.now() - 24 * 3_600_000).toISOString();

  const report = await fetchReport(user.id, sinceIso);
  const { actions, next } = decide(state, {
    lastSignInAt: user.lastSignInAt,
    latestActivityAt: latestTimestamp(report),
    now: nowIso,
  });

  // send emails; abort (no state persist) on failure so next run retries
  for (const action of actions) {
    const msg =
      action === 'send_login_alert'
        ? formatLoginAlert(MONITORED_NAME, nowIso)
        : formatSummary(MONITORED_NAME, report, {
            interim: action === 'send_interim_summary',
            sessionStart: state.sessionStartedAt ?? sinceIso,
          });
    const sent = await sendEmail(msg);
    if (!sent.ok) {
      console.error('[roi-alert] send failed', action, sent.error);
      return res.status(500).json({ error: sent.error, action });
    }
  }

  // persist state
  const { error: upsertErr } = await supabase.from('activity_monitor_state').upsert({
    user_id: user.id,
    last_seen_sign_in_at: next.lastSeenSignInAt,
    session_started_at: next.sessionStartedAt,
    session_last_activity_at: next.sessionLastActivityAt,
    last_summary_sent_at: next.lastSummarySentAt,
    updated_at: nowIso,
  });
  if (upsertErr) {
    console.error('[roi-alert] state upsert failed', upsertErr.message);
    return res.status(500).json({ error: 'state_upsert_failed' });
  }

  return res.status(200).json({ ok: true, actions, sessionOpen: !!next.sessionStartedAt });
}
```

- [ ] **Step 2: Add cron to `vercel.json`**

In the `"crons"` array, add:

```json
    {
      "path": "/api/cron/roi-activity-alert",
      "schedule": "*/10 * * * *"
    }
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep roi-activity` (repo has pre-existing TS errors in meta-leads.ts — only verify no NEW errors from this file)
Expected: no output

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`
Expected: all pass (including pre-existing src tests)

- [ ] **Step 5: Commit**

```bash
git add api/cron/roi-activity-alert.ts vercel.json
git commit -m "feat: roi-activity-alert cron — login + session summary emails every 10min"
```

---

### Task 5: User-creation script

**Files:**
- Create: `scripts/create-monitored-sales-user.mjs`

- [ ] **Step 1: Write the script**

```js
/**
 * Creates the Roi sales user + team_members row + monitor-state seed.
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/create-monitored-sales-user.mjs
 * Prints the generated 6-digit password ONCE — deliver it to the user, do not store it.
 */
import { createClient } from '@supabase/supabase-js';
import { randomInt } from 'node:crypto';

const EMAIL = 'tesler.roi@gmail.com';
const FULL_NAME = 'Roi Tesler';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const supabase = createClient(url, key);

const password = String(randomInt(100000, 1000000)); // 6 digits, crypto-random

const { data: created, error: authErr } = await supabase.auth.admin.createUser({
  email: EMAIL,
  password,
  email_confirm: true,
});
if (authErr) {
  console.error('Auth user creation failed:', authErr.message);
  process.exit(1);
}

const { error: tmErr } = await supabase
  .from('team_members')
  .upsert({ email: EMAIL, full_name: FULL_NAME, role: 'sales', is_active: true }, { onConflict: 'email' });
if (tmErr) {
  console.error('team_members upsert failed:', tmErr.message);
  process.exit(1);
}

const { error: stateErr } = await supabase
  .from('activity_monitor_state')
  .upsert({ user_id: created.user.id });
if (stateErr) {
  console.error('monitor state seed failed:', stateErr.message);
  process.exit(1);
}

console.log('✅ User created');
console.log('   user_id :', created.user.id);
console.log('   email   :', EMAIL);
console.log('   password:', password, ' ← deliver to Roi, recommend changing on first login');
```

- [ ] **Step 2: Commit (script only — RUN it in Task 6)**

```bash
git add scripts/create-monitored-sales-user.mjs
git commit -m "feat: script to create monitored sales user (Roi)"
```

---

### Task 6: Deploy + E2E verification (requires prod access)

**Files:** none (operational)

- [ ] **Step 1: Verify RESEND_API_KEY exists in Vercel project `landing`**

Run: `cd ~/Desktop/projects/solar/panama/solaris-panama-repo && npx vercel env ls 2>/dev/null | grep -i resend`
Expected: a `RESEND_API_KEY` row. **If missing → STOP and ask Kaniel for the key** (spec requirement).
Also confirm `CRON_SECRET` appears in the same listing.

- [ ] **Step 2: Apply migration 062 to prod** (Supabase project `ubuazgwxourbzruanxvs`)

Use Supabase MCP `apply_migration` with the contents of `supabase/migrations/062_activity_attribution.sql`, then verify:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name IN ('lead_events','tasks','lead_status_history','leads')
  AND column_name IN ('created_by','changed_by','updated_by');
-- expect 4 rows
SELECT count(*) FROM activity_monitor_state; -- expect 0
```

- [ ] **Step 3: Run user-creation script against prod**

```bash
SUPABASE_URL=https://ubuazgwxourbzruanxvs.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=$PANAMA_SERVICE_ROLE_KEY \
node scripts/create-monitored-sales-user.mjs
```

Expected: `✅ User created` + password printed. **Deliver password to Kaniel (WhatsApp), recommend Roi changes it on first login.**

- [ ] **Step 4: Deploy to production**

```bash
git push && npx vercel --prod
```

Expected: deploy succeeds; Vercel dashboard shows new cron `/api/cron/roi-activity-alert` every 10 min.

- [ ] **Step 5: Smoke-test the endpoint**

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" https://solaris-panama.com/api/cron/roi-activity-alert
```

Expected: `{"ok":true,"actions":[],"sessionOpen":false}` (Roi hasn't signed in yet).

- [ ] **Step 6: E2E — login alert**

Sign in at https://solaris-panama.com/login as `tesler.roi@gmail.com` (new password), then re-run the curl from Step 5.
Expected: `actions:["send_login_alert"]` + email "🟢 רואי נכנס למערכת" arrives at k@kanielt.com.

- [ ] **Step 7: E2E — session summary**

While signed in as Roi, update one lead's status in the CRM. Verify attribution:

```sql
SELECT changed_by FROM lead_status_history ORDER BY changed_at DESC LIMIT 1; -- = Roi's user_id
```

Wait 30+ min without activity (or temporarily set `session_last_activity_at` back 31 min in `activity_monitor_state`), re-run curl.
Expected: `actions:["send_final_summary"]` + Hebrew summary email listing the status change.

- [ ] **Step 8: Final commit + update CLAUDE.md project status**

```bash
git add -A && git commit -m "chore: roi activity monitoring live" --allow-empty
```

---

## Self-Review Notes

- **Spec coverage:** user creation (T5/T6), sales role via team_members (T5), login alert (T2/T4), 30-min session summary (T2), 2h interim (T2), Hebrew emails to k@kanielt.com via Resend (T3), state table + migration (T1), cron registration + CRON_SECRET (T4), missing-key stop rule (T6 Step 1), retry-on-send-failure (T4 handler), "no updates" email (T3). ✓
- **Deviation from spec (documented):** attribution columns did not exist — added in migration 062 with `auth.uid()` stamping; spec's `lead_events.created_by`/`changed_by` assumptions now hold. Session detection also opens on activity-without-sign-in (persistent Supabase sessions never refresh `last_sign_in_at`).
- **Known limitation:** `leads.updated_by` only tracks the LAST updater; concurrent edits by two users within one window may attribute a lead to the most recent editor only. Acceptable for a 2-person team.
