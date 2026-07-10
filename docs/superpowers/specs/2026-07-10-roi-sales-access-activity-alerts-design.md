# Roi Sales Access + Activity Email Alerts — Design

**Date:** 2026-07-10
**Project:** Solaris Panama CRM (`solaris-panama-repo`, Vercel project `landing`, Supabase `ubuazgwxourbzruanxvs`)

## Goal

Give sales rep Roi Tesler (`tesler.roi@gmail.com`) access to the CRM, and email Kaniel (`k@kanielt.com`) whenever Roi is active: a login alert plus a session activity summary.

## 1. User creation

- Create Supabase Auth user `tesler.roi@gmail.com` with a random 6-digit numeric password (per Kaniel's explicit request; recommend password change on first login — not enforced).
- Insert row into `team_members`: full_name "Roi Tesler", role `sales`, is_active true.
- Access level: standard sales — sees and updates ALL leads (same as Omri). No admin settings.

## 2. Activity monitoring — Vercel cron `api/cron/roi-activity-alert.ts`

Runs every 10 minutes. Uses service-role Supabase client (server-side only).

### Login detection
- Read `auth.users.last_sign_in_at` for Roi via admin API.
- Compare against `activity_monitor_state.last_seen_sign_in_at`.
- If newer → send "🟢 רואי נכנס למערכת" email immediately, update state, mark session open.

### Session summary
- A session is considered ended after **30 minutes with no new activity** (no lead updates, status changes, or events attributed to Roi's user id).
- On session end → send summary email listing:
  - Leads updated (`leads.updated_at` window + `assigned_to`/updater where trackable)
  - Status changes from `lead_status_history` (by `changed_by` = Roi)
  - Tasks/appointments from `lead_events` (created_by = Roi)
- If a session runs continuously > 2 hours → send an interim summary every 2 hours, then continue the session.
- Emails are in Hebrew, compact, mobile-friendly.

### State table — migration 062
```sql
CREATE TABLE activity_monitor_state (
  user_id UUID PRIMARY KEY,
  last_seen_sign_in_at TIMESTAMPTZ,
  session_started_at TIMESTAMPTZ,
  session_last_activity_at TIMESTAMPTZ,
  last_summary_sent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
RLS enabled, no public policies (service-role access only).

## 3. Email delivery

- Provider: **Resend** → `k@kanielt.com`.
- Requires `RESEND_API_KEY` env var in Vercel project `landing`. Verify existence before deploy; if missing, stop and ask Kaniel.
- Small helper `api/lib/email-notify.ts` (mirrors `team-notify.ts` pattern) so future alerts can reuse it.

## 4. Cron registration

- Add entry to `vercel.json` crons: `*/10 * * * *` → `/api/cron/roi-activity-alert`.
- Protect endpoint with existing `CRON_SECRET` pattern used by other crons in this repo.

## Error handling

- Missing RESEND_API_KEY → log + return 500 with clear message (no silent failure).
- Resend API failure → log; state NOT advanced for summary emails so next run retries. Login-alert state IS advanced only after successful send.
- No activity found for a session → summary email still sent noting "נכנס אך לא בוצעו עדכונים".

## Testing

- Unit-test session boundary logic (login detection, 30-min timeout, 2-hour interim) with mocked Supabase/Resend.
- Manual E2E: sign in as Roi → verify login email; make a lead update → wait for summary window → verify summary email.

## Out of scope (YAGNI)

- Page-view / frontend tracking.
- Per-lead RLS restriction (Roi sees all leads).
- Generalized monitoring for other team members (design allows it via `user_id` key, but only Roi is wired now).
- Enforced password rotation.
