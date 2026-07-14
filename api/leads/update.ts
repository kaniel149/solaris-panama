import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function getSupabaseServerClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey);
}

// Only these status values may be set via this endpoint (mirrors LeadStatus in src/types/lead.ts).
const ALLOWED_STATUSES = new Set([
  'new',
  'contacted',
  'visit_scheduled',
  'proposal_sent',
  'signed',
  'paid',
  'lost',
]);

/**
 * Minimal lead-update endpoint (service-role) used by the scanner to link a
 * generated proposal back to its lead. Accepts { id, status, proposal_ref }.
 * Guards: requires id; only updates whitelisted fields (status + raw_data.proposal_url).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    console.error('[leads/update] missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const { id, status, proposal_ref } = req.body ?? {};

    if (!id) {
      return res.status(400).json({ error: 'id is required' });
    }

    // Build a guarded update — only allowed fields are ever touched.
    const update: Record<string, unknown> = {};

    if (status != null) {
      if (!ALLOWED_STATUSES.has(String(status))) {
        return res.status(400).json({ error: 'invalid status' });
      }
      update.status = String(status);
    }

    if (proposal_ref != null && String(proposal_ref).trim()) {
      // Merge into existing raw_data so prior fields are preserved.
      const { data: existing } = await supabase
        .from('leads')
        .select('raw_data')
        .eq('id', id)
        .single();
      const rawData = (existing?.raw_data && typeof existing.raw_data === 'object')
        ? (existing.raw_data as Record<string, unknown>)
        : {};
      update.raw_data = {
        ...rawData,
        proposal_ref: String(proposal_ref),
        proposal_url: String(proposal_ref),
      };
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'nothing to update' });
    }

    const { data, error } = await supabase
      .from('leads')
      .update(update)
      .eq('id', id)
      .select('id')
      .single();

    if (error) {
      console.error('[leads/update] update error:', error);
      return res.status(500).json({ error: 'Failed to update lead' });
    }

    return res.status(200).json({ ok: true, id: data.id });
  } catch (err) {
    console.error('[leads/update] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
