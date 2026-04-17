/**
 * Bridge Watchdog — runs every 5 min via Vercel Cron.
 *
 * Reads `bridge_heartbeat.last_ping`. If older than 5 min:
 *   1. Logs a row in `bridge_outage_log`
 *   2. Sends a WhatsApp alert to 972502213948 via Twilio fallback
 *      (we can't queue a WA alert because the queue depends on the dead bridge)
 *
 * Twilio fallback uses TWILIO_* env vars. If those aren't set, we fall back
 * to a simple WhatsApp Cloud API call (META_WA_TOKEN + META_WA_PHONE_ID).
 *
 * Required env vars (any one channel works):
 *   - TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_WA_FROM
 *   OR
 *   - META_WA_TOKEN + META_WA_PHONE_ID  (WhatsApp Cloud API)
 *   OR (last resort)
 *   - RESEND_API_KEY  → email k@kanielt.com instead
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const ALERT_PHONE = '972502213948';
const STALE_THRESHOLD_MIN = 5;
const REALERT_AFTER_MIN = 30; // don't spam — re-alert every 30 min if still down

async function sendViaTwilio(message: string): Promise<{ ok: boolean; error?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const tok = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WA_FROM; // 'whatsapp:+1234567890'
  if (!sid || !tok || !from) return { ok: false, error: 'twilio_env_missing' };

  const auth = Buffer.from(`${sid}:${tok}`).toString('base64');
  const body = new URLSearchParams({
    From: from,
    To: `whatsapp:+${ALERT_PHONE}`,
    Body: message,
  });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) return { ok: false, error: `twilio_${res.status}` };
  return { ok: true };
}

async function sendViaMetaWA(message: string): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.META_WA_TOKEN;
  const phoneId = process.env.META_WA_PHONE_ID;
  if (!token || !phoneId) return { ok: false, error: 'meta_wa_env_missing' };

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: ALERT_PHONE,
      type: 'text',
      text: { body: message },
    }),
  });
  if (!res.ok) return { ok: false, error: `meta_wa_${res.status}` };
  return { ok: true };
}

async function sendViaResend(message: string): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: 'resend_env_missing' };

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Solaris Watchdog <alerts@solaris-panama.com>',
      to: 'k@kanielt.com',
      subject: '🚨 WhatsApp Bridge DOWN — Solaris Panama',
      text: message,
    }),
  });
  if (!res.ok) return { ok: false, error: `resend_${res.status}` };
  return { ok: true };
}

async function alertChannels(message: string): Promise<{ channel: string; ok: boolean; error?: string }> {
  // Try in order — first success wins
  for (const [name, fn] of [
    ['twilio', sendViaTwilio],
    ['meta_wa', sendViaMetaWA],
    ['resend', sendViaResend],
  ] as const) {
    const r = await fn(message);
    if (r.ok) return { channel: name, ok: true };
    console.warn(`[watchdog] ${name} failed:`, r.error);
  }
  return { channel: 'none', ok: false, error: 'all_channels_failed' };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const { data: hb, error } = await supabase
      .from('bridge_heartbeat')
      .select('last_ping, hostname, queue_size')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      console.error('[watchdog] heartbeat read error:', error);
      return res.status(500).json({ error: 'heartbeat_read_failed' });
    }

    if (!hb) {
      // No heartbeat row — alert once
      await alertChannels('🚨 Solaris Bridge: No heartbeat row exists. Run migration 008.');
      return res.status(200).json({ status: 'no_heartbeat_row' });
    }

    const lastPing = new Date(hb.last_ping);
    const minutesSince = (Date.now() - lastPing.getTime()) / 1000 / 60;

    if (minutesSince < STALE_THRESHOLD_MIN) {
      return res.status(200).json({
        status: 'healthy',
        minutesSinceLastPing: Math.round(minutesSince * 10) / 10,
        queue: hb.queue_size,
      });
    }

    // Bridge is stale. Check if we already alerted in the last REALERT_AFTER_MIN.
    const cutoff = new Date(Date.now() - REALERT_AFTER_MIN * 60 * 1000).toISOString();
    const { data: recentAlert } = await supabase
      .from('bridge_outage_log')
      .select('id')
      .eq('alerted', true)
      .gte('detected_at', cutoff)
      .limit(1)
      .maybeSingle();

    if (recentAlert) {
      return res.status(200).json({
        status: 'stale_already_alerted',
        minutesDown: Math.round(minutesSince),
      });
    }

    // Send alert
    const message = [
      '🚨 *SOLARIS BRIDGE DOWN*',
      '',
      `⏰ Last heartbeat: ${Math.round(minutesSince)} min ago`,
      `🖥 Host: ${hb.hostname || 'unknown'}`,
      `📥 Queue size: ${hb.queue_size}`,
      '',
      'WhatsApp messages are NOT being sent right now.',
      'Restart the bridge:',
      '  cd ~/Desktop/projects/solar/panama/solaris-panama/whatsapp-bridge',
      '  npm start',
    ].join('\n');

    const alert = await alertChannels(message);

    await supabase.from('bridge_outage_log').insert({
      detected_at: new Date().toISOString(),
      last_ping_before: hb.last_ping,
      minutes_down: Math.round(minutesSince),
      alerted: alert.ok,
    });

    return res.status(200).json({
      status: 'alerted',
      channel: alert.channel,
      minutesDown: Math.round(minutesSince),
    });
  } catch (err) {
    console.error('[watchdog] error:', err);
    return res.status(500).json({ error: String(err) });
  }
}
