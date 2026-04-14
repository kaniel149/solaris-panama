import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Cron: pulls the last 10 leads from each Meta lead form on the page
 * and ingests any that aren't yet in our CRM.
 *
 * Backup mechanism in case the webhook doesn't fire (LAM lag, Meta outage, etc.)
 *
 * Schedule: every 5 minutes via vercel.json crons.
 *
 * Required env:
 *   - META_PAGE_ACCESS_TOKEN
 *   - META_PAGE_ID  (1090136187506938)
 *   - SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *   - CRON_SECRET (header-based auth: Authorization: Bearer <secret>)
 */

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const META_GRAPH_VERSION = 'v21.0';
const PAGE_ID = process.env.META_PAGE_ID || '1090136187506938';

interface MetaLead {
  id: string;
  created_time: string;
  ad_id?: string;
  adset_id?: string;
  form_id?: string;
  campaign_id?: string;
  field_data: Array<{ name: string; values: string[] }>;
}

function fieldValue(
  fields: MetaLead['field_data'],
  names: string[]
): string | null {
  for (const name of names) {
    const f = fields.find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (f && f.values?.length) return f.values[0];
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel cron sends Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.authorization;
  const expected = `Bearer ${process.env.CRON_SECRET || 'dev'}`;
  if (process.env.CRON_SECRET && auth !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'META_PAGE_ACCESS_TOKEN not set' });
  }

  try {
    // 1. List forms on the page
    const formsRes = await fetch(
      `https://graph.facebook.com/${META_GRAPH_VERSION}/${PAGE_ID}/leadgen_forms?access_token=${token}&fields=id,name`
    );
    if (!formsRes.ok) {
      const text = await formsRes.text();
      throw new Error(`Forms fetch ${formsRes.status}: ${text}`);
    }
    const formsJson = await formsRes.json();
    const forms: Array<{ id: string; name: string }> = formsJson.data || [];

    let totalNew = 0;
    let totalChecked = 0;
    const summary: Array<{ form_id: string; checked: number; inserted: number }> =
      [];

    for (const form of forms) {
      // 2. Get last 10 leads from this form
      const leadsRes = await fetch(
        `https://graph.facebook.com/${META_GRAPH_VERSION}/${form.id}/leads?access_token=${token}&limit=10&fields=id,created_time,ad_id,adset_id,form_id,campaign_id,field_data`
      );
      if (!leadsRes.ok) continue;
      const leadsJson = await leadsRes.json();
      const leads: MetaLead[] = leadsJson.data || [];
      let inserted = 0;

      for (const lead of leads) {
        totalChecked++;

        // Skip if already in CRM
        const { data: existing } = await supabase
          .from('leads')
          .select('id')
          .eq('platform_lead_id', lead.id)
          .maybeSingle();
        if (existing?.id) continue;

        const name =
          fieldValue(lead.field_data, ['full_name', 'nombre', 'name']) ||
          [
            fieldValue(lead.field_data, ['first_name', 'nombre']),
            fieldValue(lead.field_data, ['last_name', 'apellido']),
          ]
            .filter(Boolean)
            .join(' ')
            .trim() ||
          'Lead sin nombre';

        const phone =
          fieldValue(lead.field_data, [
            'phone_number',
            'phone',
            'telefono',
            'teléfono',
          ]) || '';

        const email = fieldValue(lead.field_data, ['email', 'correo']) || null;

        const monthlyBillRaw = fieldValue(lead.field_data, [
          'monthly_bill',
          'factura_mensual',
          'cuanto_pagas_de_luz',
          'consumo_mensual',
        ]);
        let monthlyBill: number | null = null;
        if (monthlyBillRaw) {
          const cleaned = monthlyBillRaw.replace(/[^0-9.]/g, '');
          const parsed = parseFloat(cleaned);
          if (Number.isFinite(parsed)) monthlyBill = parsed;
        }

        const location =
          fieldValue(lead.field_data, ['city', 'ciudad', 'provincia', 'location']) ||
          null;

        const cleanPhone = phone.replace(/[\s\-()]/g, '');

        const { error } = await supabase.from('leads').insert({
          name: name.trim(),
          phone: cleanPhone,
          email: email?.trim() || null,
          monthly_bill: monthlyBill,
          location,
          source: 'meta_ads',
          platform_lead_id: lead.id,
          ad_id: lead.ad_id || null,
          ad_set_id: lead.adset_id || null,
          form_id: lead.form_id || form.id,
          campaign: lead.campaign_id || null,
          page_id: PAGE_ID,
          status: 'new',
          raw_data: { lead, source: 'cron_poll' },
        });

        if (!error) {
          inserted++;
          totalNew++;
        }
      }

      summary.push({ form_id: form.id, checked: leads.length, inserted });
    }

    return res.status(200).json({
      ok: true,
      forms: forms.length,
      totalChecked,
      totalNew,
      summary,
    });
  } catch (err) {
    console.error('[cron poll-meta-leads] Error:', err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
