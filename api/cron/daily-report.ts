/**
 * Daily WhatsApp Report — runs 18:00 Panama (23:00 UTC) every day.
 *
 * Sends Kaniel a summary of the day's activity:
 *   - New leads count by source (Meta / Google / LP / WA / Web)
 *   - Active conversations (any inbound or outbound msg today)
 *   - Hot leads (status=hot OR score >70)
 *   - Won today + total $ value
 *   - Bridge health (heartbeat + outage events)
 *   - CAPI/Enhanced Conversions success rate (last 24h)
 *
 * Idempotent — safe to re-run (idempotency_key uses date).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const ALERT_PHONE = '972502213948';

// Panama is UTC-5 — convert "today" boundary to UTC
function panamaTodayBounds() {
  const now = new Date();
  const utcMidnightPA = new Date(now);
  utcMidnightPA.setUTCHours(5, 0, 0, 0); // 00:00 PA = 05:00 UTC
  if (utcMidnightPA > now) utcMidnightPA.setUTCDate(utcMidnightPA.getUTCDate() - 1);
  const start = utcMidnightPA;
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

function dateLabel(d: Date): string {
  return d.toLocaleDateString('es-PA', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const { start, end } = panamaTodayBounds();
    const startISO = start.toISOString();
    const endISO = end.toISOString();

    // 1. New leads today (by source)
    const { data: newLeads } = await supabase
      .from('leads')
      .select('id, source, status, name, location, deal_value')
      .gte('created_at', startISO)
      .lt('created_at', endISO);

    const bySource: Record<string, number> = {};
    for (const l of newLeads || []) {
      const s = l.source || 'unknown';
      bySource[s] = (bySource[s] || 0) + 1;
    }

    // 2. Won today
    const { data: wonToday } = await supabase
      .from('leads')
      .select('id, name, deal_value, deal_currency')
      .eq('status', 'won')
      .gte('won_at', startISO)
      .lt('won_at', endISO);
    const wonValue = (wonToday || []).reduce((s, l) => s + (Number(l.deal_value) || 0), 0);

    // 3. Hot leads (status=hot)
    const { data: hotLeads } = await supabase
      .from('leads')
      .select('id, name, location, source')
      .eq('status', 'hot')
      .limit(5);

    // 4. Active WA conversations today (any inbound message today)
    const { data: activeChats } = await supabase
      .from('whatsapp_messages')
      .select('phone', { count: 'exact', head: true })
      .gte('timestamp', startISO)
      .eq('direction', 'inbound');

    // 5. Bridge health
    const { data: hb } = await supabase
      .from('bridge_heartbeat')
      .select('last_ping, queue_size, hostname')
      .eq('id', 1)
      .maybeSingle();
    const minutesSinceHb = hb ? Math.round((Date.now() - new Date(hb.last_ping).getTime()) / 60000) : null;
    const bridgeStatus = !hb ? '❓ no data' :
      minutesSinceHb! < 5 ? '✅ live' :
      minutesSinceHb! < 30 ? `⚠️ ${minutesSinceHb}m ago` :
      `🔴 DOWN ${minutesSinceHb}m`;

    // 6. CAPI / Enhanced conversions success
    const { data: capiLogs } = await supabase
      .from('webhook_logs')
      .select('source, status_code, error')
      .in('source', ['capi', 'enhanced_conv'])
      .gte('created_at', startISO);
    const capiTotal = capiLogs?.length || 0;
    const capiOk = (capiLogs || []).filter((l) => l.status_code === 200).length;

    // 7. Stale (new >48h)
    const { count: staleCount } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new')
      .lt('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());

    // ── Build message ──────────────────────────────────────────────
    const sourceEmoji: Record<string, string> = {
      meta_ads: '📘', google_ads: '🔵', lp_azuero: '🟡',
      whatsapp: '💬', website: '🌐', instagram: '📸', facebook: '📘', manual: '✍️',
    };

    const sourceLines = Object.entries(bySource)
      .sort((a, b) => b[1] - a[1])
      .map(([s, n]) => `  ${sourceEmoji[s] || '•'} ${s}: ${n}`);

    const lines = [
      `🌞 *Solaris Panamá — ${dateLabel(start)}*`,
      '',
      `📥 *${newLeads?.length || 0} leads nuevos*`,
      ...(sourceLines.length ? sourceLines : ['  (ninguno hoy)']),
      '',
      `💬 ${activeChats || 0} conversaciones activas hoy`,
      '',
    ];

    if ((wonToday?.length || 0) > 0) {
      lines.push(`🎉 *${wonToday!.length} ventas cerradas* — $${wonValue.toLocaleString('en-US')}`);
      for (const w of wonToday!.slice(0, 3)) {
        lines.push(`  ✅ ${w.name} · $${Number(w.deal_value || 0).toLocaleString('en-US')}`);
      }
      lines.push('');
    }

    if ((hotLeads?.length || 0) > 0) {
      lines.push(`🔥 *Hot leads activos:*`);
      for (const h of hotLeads!) {
        lines.push(`  • ${h.name || '?'} · ${h.location || h.source}`);
      }
      lines.push('');
    }

    if ((staleCount || 0) > 0) {
      lines.push(`⏰ ${staleCount} leads sin contactar >48h`);
      lines.push('');
    }

    lines.push('─────────────');
    lines.push(`🌉 Bridge: ${bridgeStatus}${hb?.queue_size ? ` · queue ${hb.queue_size}` : ''}`);
    if (capiTotal > 0) {
      const pct = Math.round((capiOk / capiTotal) * 100);
      lines.push(`📡 Attribution: ${capiOk}/${capiTotal} (${pct}%)`);
    }
    lines.push('🌐 https://solaris-panama.com/crm-leads');

    const message = lines.join('\n');

    await supabase.from('whatsapp_outbound_queue').insert({
      phone: ALERT_PHONE,
      message,
      automation_type: 'manual',
      scheduled_for: new Date().toISOString(),
      idempotency_key: `daily_report:${start.toISOString().slice(0, 10)}`,
    });

    return res.status(200).json({
      status: 'queued',
      newLeads: newLeads?.length || 0,
      bySource,
      wonValue,
      hotCount: hotLeads?.length || 0,
      stale: staleCount || 0,
      bridge: bridgeStatus,
    });
  } catch (err) {
    console.error('[daily-report] error:', err);
    return res.status(500).json({ error: String(err) });
  }
}
