/**
 * Pure session logic for per-user activity monitoring.
 * State machine: closed → (sign-in OR new activity) → open → (30min idle) → closed.
 * Interim summary every 2h during a continuous session.
 * The idle clock of a login-opened session starts at `now`; stale (>30min old)
 * logins/activity discovered after cron gaps never open sessions or fire interim summaries.
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

const ts = (iso: string | null): number => {
  if (!iso) return 0;
  const n = Date.parse(iso);
  return Number.isFinite(n) ? n : 0;
};

const IDLE_MS = IDLE_MINUTES * 60_000;
const INTERIM_MS = INTERIM_HOURS * 3_600_000;

export function decide(state: MonitorState, input: MonitorInput): { actions: MonitorAction[]; next: MonitorState } {
  const actions: MonitorAction[] = [];
  const next: MonitorState = { ...state };
  const now = ts(input.now);

  const newLogin = !!input.lastSignInAt && ts(input.lastSignInAt) > ts(state.lastSeenSignInAt);
  const loginFresh = newLogin && now - ts(input.lastSignInAt) < IDLE_MS;
  const activityIsNewer = !!input.latestActivityAt && ts(input.latestActivityAt) > ts(state.sessionLastActivityAt);
  const activityIsFresh = !!input.latestActivityAt && now - ts(input.latestActivityAt) < IDLE_MS;

  // 1. advance the activity clock of an open session, then close it if idle
  if (next.sessionStartedAt) {
    if (activityIsNewer) next.sessionLastActivityAt = input.latestActivityAt;
    const idleMs = now - ts(next.sessionLastActivityAt ?? next.sessionStartedAt);
    if (idleMs >= IDLE_MS) {
      actions.push('send_final_summary');
      next.sessionStartedAt = null;
      next.sessionLastActivityAt = null;
      next.lastSummarySentAt = input.now;
    }
  }

  // 2. open a session on a fresh sign-in or fresh new activity
  if (loginFresh || (activityIsNewer && activityIsFresh && !next.sessionStartedAt)) {
    actions.push('send_login_alert');
    if (input.lastSignInAt) next.lastSeenSignInAt = input.lastSignInAt;
    if (!next.sessionStartedAt) {
      next.sessionStartedAt = input.now;
      next.sessionLastActivityAt = activityIsNewer && activityIsFresh ? input.latestActivityAt : input.now;
      next.lastSummarySentAt = null;
    }
  } else if (newLogin) {
    // stale sign-in discovered after a cron gap — record it silently, no alert
    next.lastSeenSignInAt = input.lastSignInAt;
  }

  // 3. interim summary for long continuous sessions
  if (
    next.sessionStartedAt &&
    !actions.length &&
    now - ts(next.sessionStartedAt) >= INTERIM_MS &&
    now - ts(next.lastSummarySentAt ?? next.sessionStartedAt) >= INTERIM_MS
  ) {
    actions.push('send_interim_summary');
    next.lastSummarySentAt = input.now;
  }

  return { actions, next };
}
