import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

/**
 * Meta Lead Ads Webhook
 *
 * Flow:
 *   Meta ad form submit → Meta sends leadgen_id → we fetch full lead via Graph API → insert to CRM
 *
 * Setup (Meta for Developers → Webhooks → Page):
 *   - Callback URL:  https://solaris-panama.com/api/webhooks/meta-leads
 *   - Verify Token:  process.env.META_WEBHOOK_VERIFY_TOKEN
 *   - Subscribed fields: leadgen
 *
 * Required env vars:
 *   - META_WEBHOOK_VERIFY_TOKEN    (any random string you set)
 *   - META_APP_SECRET              (from App Dashboard → Settings → Basic)
 *   - META_PAGE_ACCESS_TOKEN       (long-lived Page token with leads_retrieval + pages_show_list)
 *   - SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const META_GRAPH_VERSION = 'v21.0';

interface MetaLeadField {
  name: string;
  values: string[];
}

interface MetaLeadData {
  id: string;
  created_time: string;
  ad_id?: string;
  adset_id?: string;
  form_id?: string;
  campaign_id?: string;
  field_data: MetaLeadField[];
}

function verifySignature(rawBody: string, signature: string | undefined): boolean {
  if (!signature || !process.env.META_APP_SECRET) return false;
  const expected =
    'sha256=' +
    crypto
      .createHmac('sha256', process.env.META_APP_SECRET)
      .update(rawBody)
      .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

function fieldValue(fields: MetaLeadField[], names: string[]): string | null {
  for (const name of names) {
    const f = fields.find(
      (x) => x.name.toLowerCase() === name.toLowerCase()
    );
    if (f && f.values?.length) return f.values[0];
  }
  return null;
}

async function fetchLeadFromGraph(leadgenId: string): Promise<MetaLeadData> {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) throw new Error('META_PAGE_ACCESS_TOKEN not set');

  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${leadgenId}?access_token=${token}&fields=id,created_time,ad_id,adset_id,form_id,campaign_id,field_data`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph API ${res.status}: ${text}`);
  }
  return res.json();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ---------- GET: webhook verification (Meta handshake) ----------
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (
      mode === 'subscribe' &&
      token === process.env.META_WEBHOOK_VERIFY_TOKEN
    ) {
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: 'Verification failed' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ---------- POST: lead notification ----------
  try {
    // Verify signature (Meta signs request with APP_SECRET)
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    if (process.env.META_APP_SECRET && !verifySignature(rawBody, signature)) {
      console.warn('[meta-leads] Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const body = req.body;
    if (body?.object !== 'page' || !Array.isArray(body.entry)) {
      return res.status(200).json({ ok: true, ignored: 'not a page event' });
    }

    const results: Array<{ leadgen_id: string; status: string; id?: string }> =
      [];

    for (const entry of body.entry) {
      const pageId = entry.id;
      const changes = entry.changes || [];

      for (const change of changes) {
        if (change.field !== 'leadgen') continue;
        const v = change.value || {};
        const leadgenId: string | undefined = v.leadgen_id;
        if (!leadgenId) continue;

        try {
          // Fetch full lead data from Graph API
          const lead = await fetchLeadFromGraph(leadgenId);

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

          const email =
            fieldValue(lead.field_data, ['email', 'correo']) || null;

          const monthlyBillRaw = fieldValue(lead.field_data, [
            'monthly_bill',
            'factura_mensual',
            'cuanto_pagas_de_luz',
            'consumo_mensual',
          ]);
          const monthlyBill = monthlyBillRaw
            ? parseFloat(monthlyBillRaw.replace(/[^0-9.]/g, ''))
            : null;

          const location =
            fieldValue(lead.field_data, [
              'city',
              'ciudad',
              'provincia',
              'location',
            ]) || null;

          const cleanPhone = phone.replace(/[\s\-()]/g, '');

          // Upsert — platform_lead_id is unique for meta_ads
          const { data, error } = await supabase
            .from('leads')
            .upsert(
              {
                name: name.trim(),
                phone: cleanPhone,
                email: email?.trim() || null,
                monthly_bill: monthlyBill,
                location,
                source: 'meta_ads',
                platform_lead_id: lead.id,
                ad_id: lead.ad_id || v.ad_id || null,
                ad_set_id: lead.adset_id || v.adgroup_id || null,
                form_id: lead.form_id || v.form_id || null,
                campaign: lead.campaign_id || null,
                page_id: pageId,
                status: 'new',
                raw_data: { change: v, lead },
              },
              {
                onConflict: 'platform_lead_id',
                ignoreDuplicates: false,
              }
            )
            .select('id')
            .single();

          if (error) {
            console.error('[meta-leads] Supabase error:', error);
            results.push({ leadgen_id: leadgenId, status: 'db_error' });
          } else {
            results.push({
              leadgen_id: leadgenId,
              status: 'ok',
              id: data?.id,
            });
          }
        } catch (err) {
          console.error('[meta-leads] Fetch/insert error:', err);
          results.push({ leadgen_id: leadgenId, status: 'fetch_error' });
        }
      }
    }

    // Always 200 to Meta (prevents retry storm); log errors internally
    return res.status(200).json({ ok: true, results });
  } catch (err) {
    console.error('[meta-leads] Handler error:', err);
    // Still 200 — we already logged; Meta will retry on 5xx
    return res.status(200).json({ ok: false, error: String(err) });
  }
}
