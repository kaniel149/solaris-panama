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

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: ALERT_TO, subject: msg.subject, text: msg.text }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, error: `resend_${res.status}${body ? `: ${body.slice(0, 200)}` : ''}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `network_error: ${String(err).slice(0, 200)}` };
  }
}
