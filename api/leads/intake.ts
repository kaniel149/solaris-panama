import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

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
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'name and phone are required' });
    }

    // Clean phone number
    const cleanPhone = phone.replace(/[\s\-()]/g, '');

    // Check for duplicate (same phone in last 24h from same source)
    const { data: existing } = await supabase
      .from('leads')
      .select('id')
      .eq('phone', cleanPhone)
      .eq('source', source)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(1);

    if (existing && existing.length > 0) {
      return res.status(200).json({ ok: true, duplicate: true, id: existing[0].id });
    }

    const { data, error } = await supabase
      .from('leads')
      .insert({
        name: name.trim(),
        phone: cleanPhone,
        email: email?.trim() || null,
        monthly_bill: monthly_bill ? parseFloat(monthly_bill) : null,
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
        status: 'new',
        raw_data: req.body,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Lead insert error:', error);
      return res.status(500).json({ error: 'Failed to save lead' });
    }

    // 🔔 Alert Kaniel about new website/LP lead
    try {
      const preview = message?.trim() || `${source || 'web'} · ${location || '?'}`;
      await supabase.from('whatsapp_outbound_queue').insert({
        phone: '972502213948',
        message: [
          '🔔 *NUEVO LEAD — Solaris Panama*',
          '',
          `📥 Fuente:  ${source === 'lp_azuero' ? 'Landing Azuero (Google Ads)' : 'Website'}`,
          `👤 Nombre:  ${name.trim()}`,
          `📱 Teléfono: +${cleanPhone}`,
          '',
          `💬 Info:`,
          `"${preview.substring(0, 250)}"`,
          '',
          `${gclid ? '🎯 GCLID: ' + gclid.substring(0, 40) + '...\n' : ''}🌐 CRM: https://solaris-panama.com/crm-leads`,
        ].join('\n'),
        automation_type: 'manual',
        scheduled_for: new Date(Date.now() + 5 * 1000).toISOString(),
        idempotency_key: `new_lead_alert:intake:${data.id}`,
      });
    } catch (alertErr) {
      console.warn('[intake] alert enqueue failed:', alertErr);
    }

    return res.status(201).json({ ok: true, id: data.id });
  } catch (err) {
    console.error('Lead intake error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
