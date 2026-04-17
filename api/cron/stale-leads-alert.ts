/**
 * Stale Leads Alert — runs daily 09:00 Panama (14:00 UTC).
 *
 * Sends Henry/Kaniel a WhatsApp digest of leads that need attention:
 *   - status='new' AND created_at < NOW() - 48h            → "olvidados"
 *   - status='contacted' AND updated_at < NOW() - 5d       → "sin respuesta"
 *   - status='qualified' AND updated_at < NOW() - 7d       → "propuesta pendiente"
 *   - status='proposal_sent' AND updated_at < NOW() - 10d  → "propuesta sin cierre"
 *
 * Skip vendor/partner/not_a_lead. Cap at 10 per bucket.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const ALERT_PHONE = '972502213948';

interface LeadRow {
  id: string;
  name: string | null;
  phone: string;
  status: string | null;
  source: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
}

function fmtName(l: LeadRow): string {
  return (l.name || `+${l.phone}`).slice(0, 30);
}

function fmtAge(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (days < 1) {
    const hours = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60));
    return `${hours}h`;
  }
  return `${days}d`;
}

function fmtBucket(emoji: string, title: string, leads: LeadRow[], dateField: 'created_at' | 'updated_at'): string {
  if (leads.length === 0) return '';
  const lines = [`${emoji} *${title}* (${leads.length})`];
  for (const l of leads.slice(0, 10)) {
    lines.push(`  • ${fmtName(l)} · ${fmtAge(l[dateField])} · ${l.location || l.source || '?'}`);
  }
  if (leads.length > 10) lines.push(`  …+${leads.length - 10} más`);
  return lines.join('\n');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const now = Date.now();
    const days = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000).toISOString();
    const hours = (n: number) => new Date(now - n * 60 * 60 * 1000).toISOString();

    const select = 'id, name, phone, status, source, location, created_at, updated_at';

    const [news, contacted, qualified, proposals] = await Promise.all([
      supabase.from('leads').select(select).eq('status', 'new').lt('created_at', hours(48))
        .not('source', 'in', '(vendor,partner)').limit(20),
      supabase.from('leads').select(select).eq('status', 'contacted').lt('updated_at', days(5)).limit(20),
      supabase.from('leads').select(select).eq('status', 'qualified').lt('updated_at', days(7)).limit(20),
      supabase.from('leads').select(select).eq('status', 'proposal_sent').lt('updated_at', days(10)).limit(20),
    ]);

    const buckets = [
      { emoji: '🆕', title: 'Nuevos sin contactar (>48h)', leads: news.data || [], field: 'created_at' as const },
      { emoji: '💬', title: 'Contactados sin respuesta (>5d)', leads: contacted.data || [], field: 'updated_at' as const },
      { emoji: '📋', title: 'Calificados sin propuesta (>7d)', leads: qualified.data || [], field: 'updated_at' as const },
      { emoji: '📤', title: 'Propuesta sin cierre (>10d)', leads: proposals.data || [], field: 'updated_at' as const },
    ];

    const totalStale = buckets.reduce((sum, b) => sum + b.leads.length, 0);

    if (totalStale === 0) {
      // Don't spam — only send when there's actually something to act on
      return res.status(200).json({ status: 'all_fresh', total: 0 });
    }

    const sections = buckets.map((b) => fmtBucket(b.emoji, b.title, b.leads as LeadRow[], b.field)).filter(Boolean);

    const message = [
      '🌅 *Solaris Panamá — Leads que necesitan atención*',
      '',
      `📊 Total: ${totalStale} leads`,
      '',
      ...sections,
      '',
      '🌐 https://solaris-panama.com/crm-leads',
    ].join('\n\n').replace(/\n{3,}/g, '\n\n');

    await supabase.from('whatsapp_outbound_queue').insert({
      phone: ALERT_PHONE,
      message,
      automation_type: 'manual',
      scheduled_for: new Date().toISOString(),
      idempotency_key: `stale_alert:${new Date().toISOString().slice(0, 10)}`,
    });

    return res.status(200).json({
      status: 'queued',
      total: totalStale,
      breakdown: {
        new: news.data?.length || 0,
        contacted: contacted.data?.length || 0,
        qualified: qualified.data?.length || 0,
        proposal_sent: proposals.data?.length || 0,
      },
    });
  } catch (err) {
    console.error('[stale-alert] error:', err);
    return res.status(500).json({ error: String(err) });
  }
}
