import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Enqueue an outbound WhatsApp message.
 * The local bridge polls `whatsapp_outbound_queue` and actually sends.
 *
 * POST /api/automations/enqueue-whatsapp
 * Body: {
 *   lead_id?: string,
 *   phone: string,
 *   message: string,
 *   automation_type: 'meta_ack' | 'wa_discovery' | 'followup' | 'manual',
 *   delay_seconds?: number,  // default 60
 *   idempotency_key?: string
 * }
 */

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      lead_id,
      phone,
      message,
      automation_type = 'manual',
      delay_seconds = 60,
      idempotency_key,
    } = req.body || {};

    if (!phone || !message) {
      return res.status(400).json({ error: 'phone and message required' });
    }

    const scheduled_for = new Date(Date.now() + delay_seconds * 1000).toISOString();
    const key = idempotency_key || `${lead_id || phone}:${automation_type}`;

    // Check if already queued with same key
    const { data: existing } = await supabase
      .from('whatsapp_outbound_queue')
      .select('id, status')
      .eq('idempotency_key', key)
      .maybeSingle();

    if (existing) {
      return res.status(200).json({ ok: true, id: existing.id, deduped: true });
    }

    const { data, error } = await supabase
      .from('whatsapp_outbound_queue')
      .insert({
        lead_id: lead_id || null,
        phone: phone.replace(/\D/g, ''),
        message,
        automation_type,
        scheduled_for,
        idempotency_key: key,
      })
      .select('id, scheduled_for')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ ok: true, id: data.id, scheduled_for: data.scheduled_for });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
