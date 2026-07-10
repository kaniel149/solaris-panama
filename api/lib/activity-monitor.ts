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
