import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Import Omri's tagged contacts (Solaris L1-L4) directly.
 *
 * POST /api/import-tagged-contacts
 * Body:
 * {
 *   "contacts": "Carlos Mendez | 6123-4567 | L1\nMaria | 60001234 | L3\n..."
 * }
 *
 * Or as JSON array:
 * { "contacts": [{"name":"Carlos","phone":"61234567","tier":1}, ...] }
 *
 * Lines can be in any of these formats:
 *   "Name | phone | L1"
 *   "Name, phone, L2"
 *   "Name +507 6XXX-XXXX L3"
 *   "L1 Name 6XXX-XXXX"
 */

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const L_TO_STATUS: Record<number, string> = {
  1: 'cold',
  2: 'warm',
  3: 'hot',
  4: 'won',
};

interface ParsedRow {
  name: string;
  phone: string;
  tier: number;
}

function parseLine(line: string): ParsedRow | null {
  const text = line.trim();
  if (!text) return null;

  // Find tier (L1-L4)
  const tierMatch = text.match(/L\s*([1-4])/i);
  if (!tierMatch) return null;
  const tier = parseInt(tierMatch[1], 10);

  // Find phone (8+ consecutive digits, optionally with separators)
  const phoneRaw = text.match(/(\+?\d[\d\s\-().]{6,})/);
  if (!phoneRaw) return null;
  let phone = phoneRaw[1].replace(/\D/g, '');
  if (phone.startsWith('507') && phone.length >= 11) phone = phone.slice(3);
  if (phone.length !== 8) return null;
  phone = '507' + phone;

  // Extract name = whatever's left after removing tier + phone
  let name = text
    .replace(tierMatch[0], '')
    .replace(phoneRaw[1], '')
    .replace(/[|,\\/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!name) name = 'Cliente';

  return { name, phone, tier };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  try {
    const { contacts } = req.body || {};
    if (!contacts) return res.status(400).json({ error: 'contacts required' });

    let rows: ParsedRow[] = [];

    if (typeof contacts === 'string') {
      rows = contacts
        .split(/\r?\n/)
        .map(parseLine)
        .filter((r): r is ParsedRow => r !== null);
    } else if (Array.isArray(contacts)) {
      rows = contacts
        .map((c: { name?: string; phone?: string; tier?: number }) => {
          if (!c.phone || !c.tier) return null;
          let phone = String(c.phone).replace(/\D/g, '');
          if (phone.startsWith('507') && phone.length >= 11) phone = phone.slice(3);
          if (phone.length !== 8) return null;
          return {
            name: c.name?.trim() || 'Cliente',
            phone: '507' + phone,
            tier: c.tier,
          };
        })
        .filter((r): r is ParsedRow => r !== null);
    } else {
      return res.status(400).json({ error: 'contacts must be string or array' });
    }

    const results: Array<{ phone: string; name: string; tier: number; action: string }> = [];

    for (const row of rows) {
      const status = L_TO_STATUS[row.tier];
      const updates = {
        name: row.name,
        status,
        lead_score: row.tier * 25,
        notes: `Solaris L${row.tier} (imported)`,
      };

      const { data: existing } = await supabase
        .from('leads')
        .select('id')
        .eq('phone', row.phone)
        .maybeSingle();

      if (existing) {
        await supabase.from('leads').update(updates).eq('id', existing.id);
        results.push({ ...row, action: 'updated' });
      } else {
        await supabase.from('leads').insert({ phone: row.phone, source: 'whatsapp', ...updates });
        results.push({ ...row, action: 'inserted' });
      }
    }

    return res.status(200).json({
      ok: true,
      imported: results.length,
      results,
    });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
