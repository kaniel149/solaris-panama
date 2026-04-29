import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import { sendMetaCapiEventLogged } from '../lib/meta-capi.js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

// Panama mobile prefixes: 6 (mobile), 5/3/2 (some VoIP/landline). Allow 8 digits after country code.
const PA_PHONE_RE = /^507[2-8]\d{7}$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const {
      name,
      phone,
      email,
      monthly_bill,
      monthly_bill_estimate_usd,  // 💰 numeric estimate when monthly_bill is a range string
      lead_value,                 // 💰 LTV estimate for Google Ads / Meta conversion value
      installation_type,
      timeframe,
      message,
      location,
      source = 'website',
      campaign,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      gclid,
      fbclid,
      fbc,            // _fbc cookie value (fb.1.<ts>.<fbclid>)
      fbp,            // _fbp cookie value
      event_id,       // browser-generated UUID for CAPI/pixel dedup
      website,        // QW9: honeypot — bots fill this, humans don't
    } = req.body;

    // Convert monthly_bill to numeric — accepts range strings ("$50-$150"), numbers, nulls
    const parseMonthlyBill = (v: unknown): number | null => {
      if (v == null || v === '') return null;
      if (typeof v === 'number' && !isNaN(v)) return v;
      const s = String(v);
      // Extract first number from range like "$50-$150" → 50
      const match = s.match(/\d+(?:\.\d+)?/);
      return match ? parseFloat(match[0]) : null;
    };
    const monthlyBillNum = parseMonthlyBill(monthly_bill);

    // QW9: honeypot — silently 200 to fool bots
    if (website && website.trim()) {
      return res.status(200).json({ ok: true, id: 'honeypot' });
    }

    if (!name || !phone) {
      return res.status(400).json({ error: 'name and phone are required' });
    }

    // Clean phone number
    const cleanPhone = String(phone).replace(/\D/g, '');

    // Phone validation: must be Panama mobile (otherwise spam/typo)
    if (!PA_PHONE_RE.test(cleanPhone)) {
      // Don't 400 — accept but flag for manual review
      console.warn('[intake] non-PA phone format:', cleanPhone);
    }

    // QW13: dedup window 1h (was 24h — too aggressive for retries)
    const { data: existing } = await supabase
      .from('leads')
      .select('id')
      .eq('phone', cleanPhone)
      .eq('source', source)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .limit(1);

    if (existing && existing.length > 0) {
      return res.status(200).json({ ok: true, duplicate: true, id: existing[0].id });
    }

    const eventId = event_id || crypto.randomUUID();
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      null;
    const clientUserAgent = (req.headers['user-agent'] as string) || null;

    // Build base payload — `raw_data` preserves everything (including new fields
    // like lead_value, monthly_bill range text, installation_type, timeframe)
    // even if the leads table doesn't yet have dedicated columns for them.
    const { data, error } = await supabase
      .from('leads')
      .insert({
        name: String(name).trim(),
        phone: cleanPhone,
        email: email?.trim() || null,
        monthly_bill: monthlyBillNum,
        message: message?.trim() || null,
        location: location?.trim() || null,
        source,
        campaign: campaign || null,
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
        utm_content: utm_content || null,
        utm_term: utm_term || null,
        gclid: gclid || null,
        fbclid: fbclid || null,
        fbc: fbc || null,
        fbp: fbp || null,
        event_id: eventId,
        client_ip: clientIp,
        client_user_agent: clientUserAgent,
        lead_score: 0,
        status: 'new',
        raw_data: {
          ...req.body,
          // Explicit duplication so queries can JSONB-index these fields
          monthly_bill_range: typeof monthly_bill === 'string' ? monthly_bill : null,
          monthly_bill_estimate_usd: monthly_bill_estimate_usd ?? null,
          lead_value: lead_value ?? null,
          installation_type: installation_type ?? null,
          timeframe: timeframe ?? null,
        },
      })
      .select('id')
      .single();

    if (error) {
      console.error('Lead insert error:', error);
      await supabase.from('webhook_logs').insert({
        source: 'intake', status_code: 500, error: String(error.message || error), payload: req.body,
      }).then(() => {}).catch(() => {});
      return res.status(500).json({ error: 'Failed to save lead' });
    }

    // 📡 Fire CAPI Lead event (server-side dedup w/ browser pixel via event_id)
    sendMetaCapiEventLogged(supabase, {
      eventName: 'Lead',
      eventId,
      email: email?.trim() || null,
      phone: cleanPhone,
      firstName: String(name).trim().split(' ')[0],
      lastName: String(name).trim().split(' ').slice(1).join(' ') || null,
      city: location || null,
      externalId: data.id,
      fbc: fbc || null,
      fbp: fbp || null,
      clientIp,
      clientUserAgent,
      sourceUrl: `https://solaris-panama.com/${source === 'lp_azuero' ? 'lp/azuero' : ''}`,
      currency: 'USD',
      contentName: source,
    }).then(async () => {
      await supabase.from('leads')
        .update({ meta_capi_lead_sent_at: new Date().toISOString() })
        .eq('id', data.id);
    }).catch(() => {});

    // 🔔 Alert Kaniel about new website/LP lead
    try {
      const preview = message?.trim() || `${source || 'web'} · ${location || '?'}`;
      await supabase.from('whatsapp_outbound_queue').insert({
        phone: '972502213948',
        message: [
          '🔔 *NUEVO LEAD — Solaris Panama*',
          '',
          `📥 Fuente:  ${source === 'lp_azuero' ? 'Landing Azuero (Google Ads)' : 'Website'}`,
          `👤 Nombre:  ${String(name).trim()}`,
          `📱 Teléfono: +${cleanPhone}`,
          '',
          `💬 Info:`,
          `"${preview.substring(0, 250)}"`,
          '',
          `${gclid ? '🎯 GCLID: ' + String(gclid).substring(0, 40) + '...\n' : ''}🌐 CRM: https://solaris-panama.com/crm-leads`,
        ].join('\n'),
        automation_type: 'manual',
        scheduled_for: new Date(Date.now() + 5 * 1000).toISOString(),
        idempotency_key: `new_lead_alert:intake:${data.id}`,
      });
    } catch (alertErr) {
      console.warn('[intake] alert enqueue failed:', alertErr);
    }

    return res.status(201).json({ ok: true, id: data.id, event_id: eventId });
  } catch (err) {
    console.error('Lead intake error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
