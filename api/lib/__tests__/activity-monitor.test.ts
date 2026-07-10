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
    expect(next.sessionStartedAt).toBe(T0);
    expect(next.sessionLastActivityAt).toBe(min(1)); // idle timer starts at login
  });

  it('activity without new sign-in (persistent session) → login alert + session opens', () => {
    const state = { ...empty, lastSeenSignInAt: T0 };
    const { actions, next } = decide(state, { lastSignInAt: T0, latestActivityAt: min(5), now: min(6) });
    expect(actions).toEqual(['send_login_alert']);
    expect(next.sessionStartedAt).toBe(min(5));
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
    expect(next.sessionStartedAt).toBe(min(60));
  });

  it('cron gap: stale activity + long-dead session → final summary only, no reopen, no interim', () => {
    const state: MonitorState = { lastSeenSignInAt: T0, sessionStartedAt: T0, sessionLastActivityAt: T0, lastSummarySentAt: null };
    const { actions, next } = decide(state, { lastSignInAt: T0, latestActivityAt: min(15), now: min(180) });
    expect(actions).toEqual(['send_final_summary']);
    expect(next.sessionStartedAt).toBeNull();
  });

  it('login-reopened session does not immediately re-close (idle clock seeded at now)', () => {
    const state: MonitorState = { lastSeenSignInAt: T0, sessionStartedAt: T0, sessionLastActivityAt: min(10), lastSummarySentAt: null };
    const r1 = decide(state, { lastSignInAt: min(60), latestActivityAt: min(10), now: min(61) });
    expect(r1.actions).toEqual(['send_final_summary', 'send_login_alert']);
    expect(r1.next.sessionLastActivityAt).toBe(min(61));
    const r2 = decide(r1.next, { lastSignInAt: min(60), latestActivityAt: min(10), now: min(71) });
    expect(r2.actions).toEqual([]);
  });

  it('stale sign-in after cron gap → recorded silently, no alert, no session', () => {
    const { actions, next } = decide(empty, { lastSignInAt: T0, latestActivityAt: null, now: min(180) });
    expect(actions).toEqual([]);
    expect(next.lastSeenSignInAt).toBe(T0);
    expect(next.sessionStartedAt).toBeNull();
  });

  it('session start stamped at trigger time so summaries cover pre-open activity', () => {
    // login at T0+2min, cron only notices at T0+9min — session must start at the login time
    const { next } = decide(empty, { lastSignInAt: min(2), latestActivityAt: min(5), now: min(9) });
    expect(next.sessionStartedAt).toBe(min(2)); // earliest trigger (login before activity)
  });
});
