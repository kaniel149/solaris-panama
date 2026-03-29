import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
);

interface WhatsAppMessage {
  id: string;
  chatId: string;
  from: string;
  body: string;
  timestamp: number;
  fromMe: boolean;
  contactName?: string;
  phone?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Expect array of WhatsApp conversations from frontend (via MCP)
    const { conversations } = req.body as {
      conversations: Array<{
        phone: string;
        name: string;
        lastMessage: string;
        timestamp: string;
        chatId: string;
      }>;
    };

    if (!conversations || !Array.isArray(conversations)) {
      return res.status(400).json({ error: 'conversations array required' });
    }

    let created = 0;
    let skipped = 0;

    for (const conv of conversations) {
      if (!conv.phone) {
        skipped++;
        continue;
      }

      // Clean phone
      const cleanPhone = conv.phone.replace(/[\s\-()@c.us]/g, '');

      // Check if lead already exists with this phone
      const { data: existing } = await supabase
        .from('leads')
        .select('id')
        .eq('phone', cleanPhone)
        .limit(1);

      if (existing && existing.length > 0) {
        skipped++;
        continue;
      }

      // Create new lead
      const { error } = await supabase.from('leads').insert({
        name: conv.name || cleanPhone,
        phone: cleanPhone,
        source: 'whatsapp',
        message: conv.lastMessage || null,
        status: 'new',
        whatsapp_chat_id: conv.chatId || null,
        raw_data: conv,
      });

      if (!error) created++;
      else skipped++;
    }

    return res.status(200).json({ ok: true, created, skipped });
  } catch (err) {
    console.error('WhatsApp sync error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
