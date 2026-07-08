/**
 * Team new-lead WhatsApp fan-out.
 *
 * New-lead alerts used to be hardcoded to a single number (Kaniel). This helper
 * fans the same Spanish alert out to every active sales rep: it reads
 * `team_members` (is_active=true, phone not null) and enqueues one row per member
 * into `whatsapp_outbound_queue` for the local WhatsApp bridge to send.
 *
 * The idempotency_key embeds the member's phone (`new_lead_alert:<tag>:<lead>:<phone>`)
 * so the queue's UNIQUE(idempotency_key) constraint dedupes per-member on webhook
 * retries without one member's key colliding with another's. The insert uses
 * ignoreDuplicates so a retry that re-enqueues already-present keys is a no-op
 * instead of an error.
 *
 * Never throws — a notification failure must not break lead ingestion.
 */

import * as crypto from 'crypto';

const CRM_URL = 'https://solaris-panama.com/crm-leads';

export interface NotifyTeamNewLeadOptions {
  /** Lead UUID — namespaces the idempotency_key so retries dedupe. Falls back to a random id if absent. */
  leadId?: string | null;
  /** Human-readable label for the "📥 Fuente:" line, e.g. "Website", "Meta Ads". */
  source: string;
  /** Lead full name. */
  name: string;
  /** Lead phone in any format — rendered as "+<digits>". */
  phone: string;
  /** Free text for the "💬 Info:" block (already-composed summary). */
  preview: string;
  extra?: {
    /** idempotency_key namespace — defaults to a slug of `source`. Keep stable per source. */
    sourceTag?: string;
    /** Optional — renders the "🎯 GCLID:" line when present. */
    gclid?: string | null;
  };
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'lead';
}

function buildTeamAlertMessage(o: NotifyTeamNewLeadOptions): string {
  const leadPhone = String(o.phone || '').replace(/\D/g, '');
  const gclidLine = o.extra?.gclid
    ? `🎯 GCLID: ${String(o.extra.gclid).substring(0, 40)}...\n`
    : '';
  return [
    '🔔 *NUEVO LEAD — Solaris Panama*',
    '',
    `📥 Fuente:  ${o.source}`,
    `👤 Nombre:  ${String(o.name || '').trim()}`,
    `📱 Teléfono: +${leadPhone}`,
    '',
    '💬 Info:',
    `"${String(o.preview || '').substring(0, 250)}"`,
    '',
    `${gclidLine}🌐 CRM: ${CRM_URL}`,
  ].join('\n');
}

/**
 * Enqueue a new-lead WhatsApp alert for every active team member.
 * Resolves to void; failures are logged (console.warn) and swallowed.
 */
export async function notifyTeamNewLead(
  supabase: any,
  opts: NotifyTeamNewLeadOptions
): Promise<void> {
  try {
    const { data: members, error } = await supabase
      .from('team_members')
      .select('phone')
      .eq('is_active', true)
      .not('phone', 'is', null);

    if (error) {
      console.warn('[notifyTeamNewLead] team_members fetch failed:', error.message || error);
      return;
    }
    if (!members || members.length === 0) {
      console.warn('[notifyTeamNewLead] no active team members with a phone — no alert sent');
      return;
    }

    const sourceTag = opts.extra?.sourceTag || slug(opts.source);
    const leadKey = opts.leadId || crypto.randomUUID();
    const message = buildTeamAlertMessage(opts);
    const scheduledFor = new Date(Date.now() + 5 * 1000).toISOString();

    const seen = new Set<string>();
    const rows: Array<{
      phone: string;
      message: string;
      automation_type: string;
      scheduled_for: string;
      idempotency_key: string;
    }> = [];

    for (const m of members) {
      const memberPhone = String(m?.phone || '').replace(/\D/g, '');
      if (!memberPhone || seen.has(memberPhone)) continue; // digits only, no '+'; de-dupe shared numbers
      seen.add(memberPhone);
      rows.push({
        phone: memberPhone,
        message,
        automation_type: 'manual',
        scheduled_for: scheduledFor,
        idempotency_key: `new_lead_alert:${sourceTag}:${leadKey}:${memberPhone}`,
      });
    }

    if (rows.length === 0) return;

    // ignoreDuplicates → ON CONFLICT DO NOTHING: webhook retries re-enqueue the
    // same keys harmlessly, and one pre-existing key never blocks the others.
    const { error: insErr } = await supabase
      .from('whatsapp_outbound_queue')
      .upsert(rows, { onConflict: 'idempotency_key', ignoreDuplicates: true });

    if (insErr) {
      console.warn('[notifyTeamNewLead] queue insert failed:', insErr.message || insErr);
    }
  } catch (err) {
    console.warn('[notifyTeamNewLead] unexpected failure:', err);
  }
}
