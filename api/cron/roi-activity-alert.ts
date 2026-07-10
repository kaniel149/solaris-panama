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
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { decide, type MonitorState } from '../lib/activity-monitor';
import { formatLoginAlert, formatSummary, sendEmail, type ActivityReport } from '../lib/email-notify';

const MONITORED_EMAIL = 'tesler.roi@gmail.com';
const MONITORED_NAME = 'רואי';

let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return null;
  _supabase = createClient(url, key);
  return _supabase;
}

async function findUser(supabase: SupabaseClient): Promise<{ id: string; lastSignInAt: string | null } | null> {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) return null;
  const u = data.users.find((x) => x.email?.toLowerCase() === MONITORED_EMAIL);
  return u ? { id: u.id, lastSignInAt: u.last_sign_in_at ?? null } : null;
}

async function fetchReport(supabase: SupabaseClient, uid: string, sinceIso: string): Promise<{ report: ActivityReport; latestActivityAt: string | null }> {
  const [leads, statuses, events, tasks] = await Promise.all([
    supabase.from('leads').select('id, name, status, updated_at')
      .eq('updated_by', uid).gte('updated_at', sinceIso).order('updated_at', { ascending: false }).limit(50),
    supabase.from('lead_status_history').select('old_status, new_status, changed_at, leads(name)')
      .eq('changed_by', uid).gte('changed_at', sinceIso).order('changed_at', { ascending: false }).limit(50),
    supabase.from('lead_events').select('title, event_type, starts_at, created_at')
      .eq('created_by', uid).gte('created_at', sinceIso).order('created_at', { ascending: false }).limit(50),
    supabase.from('tasks').select('title, status, created_at')
      .eq('created_by', uid).gte('created_at', sinceIso).order('created_at', { ascending: false }).limit(50),
  ]);

  const report: ActivityReport = {
    leadsUpdated: (leads.data ?? []).map((l) => ({ id: l.id, name: l.name ?? 'ליד ללא שם', status: l.status, at: l.updated_at })),
    statusChanges: (statuses.data ?? []).map((s: any) => ({
      leadName: s.leads?.name ?? 'ליד ללא שם', from: s.old_status, to: s.new_status, at: s.changed_at,
    })),
    events: (events.data ?? []).map((e) => ({ title: e.title, type: e.event_type, startsAt: e.starts_at })),
    tasks: (tasks.data ?? []).map((t) => ({ title: t.title, status: t.status })),
  };

  const allTimestamps = [
    ...(leads.data ?? []).map((l) => l.updated_at),
    ...(statuses.data ?? []).map((s: any) => s.changed_at),
    ...(events.data ?? []).map((e) => e.created_at),
    ...(tasks.data ?? []).map((t) => t.created_at),
  ].filter(Boolean) as string[];

  const sortedTimestamps = allTimestamps.sort();
  const latestActivityAt = sortedTimestamps.length ? sortedTimestamps[sortedTimestamps.length - 1] : null;

  return { report, latestActivityAt };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (!process.env.RESEND_API_KEY) {
    console.error('[roi-alert] RESEND_API_KEY missing');
    return res.status(500).json({ error: 'resend_env_missing' });
  }

  const supabase = getSupabase();
  if (!supabase) {
    console.error('[roi-alert] Supabase env missing');
    return res.status(500).json({ error: 'supabase_env_missing' });
  }

  const user = await findUser(supabase);
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

  const { report, latestActivityAt } = await fetchReport(supabase, user.id, sinceIso);
  const { actions, next } = decide(state, {
    lastSignInAt: user.lastSignInAt,
    latestActivityAt,
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
