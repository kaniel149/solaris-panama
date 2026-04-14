import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Google Ads Lead Form Webhook
 *
 * Flow:
 *   User fills Google Ad Lead Form → Google POSTs JSON to this endpoint → insert to CRM
 *
 * Setup (Google Ads → Campaign → Ad assets → Lead form → Delivery options):
 *   - Webhook URL:  https://solaris-panama.com/api/webhooks/google-leads
 *   - Key:          process.env.GOOGLE_LEADS_WEBHOOK_KEY (any random string)
 *
 * Google sends a flat JSON payload like:
 * {
 *   "google_key": "<your key>",
 *   "lead_id": "abc123",
 *   "api_version": "1.0",
 *   "form_id": 123456789,
 *   "campaign_id": 111111,
 *   "gcl_id": "...",
 *   "adgroup_id": 222222,
 *   "creative_id": 333333,
 *   "user_column_data": [
 *     { "column_name": "Full Name",  "string_value": "Juan Perez",  "column_id": "FULL_NAME" },
 *     { "column_name": "Email",      "string_value": "a@b.com",     "column_id": "EMAIL" },
 *     { "column_name": "Phone",      "string_value": "+507 6...",    "column_id": "PHONE_NUMBER" }
 *   ]
 * }
 */

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface GoogleColumn {
  column_name?: string;
  column_id?: string;
  string_value?: string;
}

function col(
  data: GoogleColumn[] | undefined,
  ids: string[]
): string | null {
  if (!data) return null;
  for (const id of ids) {
    const match = data.find(
      (c) =>
        c.column_id?.toUpperCase() === id.toUpperCase() ||
        c.column_name?.toLowerCase() === id.toLowerCase()
    );
    if (match?.string_value) return match.string_value;
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};

    // Validate shared secret
    const providedKey = body.google_key || req.headers['x-google-key'];
    const expectedKey = process.env.GOOGLE_LEADS_WEBHOOK_KEY;
    if (!expectedKey || providedKey !== expectedKey) {
      console.warn('[google-leads] Invalid key');
      return res.status(401).json({ error: 'Invalid key' });
    }

    const cols: GoogleColumn[] = body.user_column_data || [];

    const name =
      col(cols, ['FULL_NAME', 'full_name', 'Nombre completo']) ||
      [
        col(cols, ['FIRST_NAME', 'first_name', 'Nombre']),
        col(cols, ['LAST_NAME', 'last_name', 'Apellido']),
      ]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      'Lead sin nombre';

    const phone =
      col(cols, ['PHONE_NUMBER', 'phone_number', 'Teléfono', 'Telefono']) ||
      '';

    const email = col(cols, ['EMAIL', 'email', 'Correo']) || null;

    const monthlyBillRaw = col(cols, [
      'MONTHLY_BILL',
      'monthly_bill',
      'Factura mensual',
      'Cuánto pagas de luz',
    ]);
    let monthlyBill: number | null = null;
    if (monthlyBillRaw) {
      const cleaned = monthlyBillRaw.replace(/[^0-9.]/g, '');
      const parsed = parseFloat(cleaned);
      if (Number.isFinite(parsed)) monthlyBill = parsed;
    }

    const location =
      col(cols, ['CITY', 'city', 'Ciudad', 'Provincia']) || null;

    const cleanPhone = phone.replace(/[\s\-()]/g, '');
    const leadId = body.lead_id ? String(body.lead_id) : null;

    const payload = {
      name: name.trim(),
      phone: cleanPhone,
      email: email?.trim() || null,
      monthly_bill: monthlyBill,
      location,
      source: 'google_ads',
      platform_lead_id: leadId,
      ad_id: body.creative_id ? String(body.creative_id) : null,
      ad_set_id: body.adgroup_id ? String(body.adgroup_id) : null,
      form_id: body.form_id ? String(body.form_id) : null,
      campaign: body.campaign_id ? String(body.campaign_id) : null,
      gclid: body.gcl_id || null,
      status: 'new',
      raw_data: body,
    };

    // Manual dedup
    let data: { id: string } | null = null;
    let error: unknown = null;
    if (leadId) {
      const { data: existing } = await supabase
        .from('leads')
        .select('id')
        .eq('platform_lead_id', leadId)
        .maybeSingle();
      if (existing?.id) {
        const upd = await supabase
          .from('leads')
          .update(payload)
          .eq('id', existing.id)
          .select('id')
          .single();
        data = upd.data;
        error = upd.error;
      } else {
        const ins = await supabase
          .from('leads')
          .insert(payload)
          .select('id')
          .single();
        data = ins.data;
        error = ins.error;
      }
    } else {
      const ins = await supabase
        .from('leads')
        .insert(payload)
        .select('id')
        .single();
      data = ins.data;
      error = ins.error;
    }

    if (error) {
      console.error('[google-leads] Supabase error:', error);
      return res.status(500).json({ error: 'Failed to save lead' });
    }

    return res.status(200).json({ ok: true, id: data?.id });
  } catch (err) {
    console.error('[google-leads] Handler error:', err);
    return res.status(500).json({ error: String(err) });
  }
}
