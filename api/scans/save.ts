import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import * as crypto from 'crypto'

function client() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return url && key ? createClient(url, key) : null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const supabase = client()
  if (!supabase) return res.status(500).json({ error: 'Server configuration error' })

  const b = req.body || {}
  if (!b.latitude || !b.longitude) return res.status(400).json({ error: 'latitude/longitude required' })
  const token = crypto.randomUUID()
  const { data, error } = await supabase.from('roof_scans').insert({
    address: b.address || '', latitude: b.latitude, longitude: b.longitude,
    source: b.source || 'local_panama', quality: b.quality || 'ESTIMATED',
    total_roof_m2: b.totalRoofAreaM2 ?? null, usable_roof_m2: b.usableRoofAreaM2 ?? null,
    roof_segments: b.roofSegments ?? [], panel_count: b.maxPanelCount ?? null,
    system_kwp: b.maxSystemSizeKwp ?? null, yearly_kwh: b.yearlyEnergyKwh ?? null,
    finca_number: b.fincaNumber ?? null, owner_json: b.owner ?? null,
    financials_json: b.financials ?? null, session_id: b.sessionId ?? null,
    public_share_token: token, raw_api_response: b.raw ?? null,
  }).select('id, public_share_token').single()
  if (error) return res.status(500).json({ error: 'save failed', detail: error.message })
  return res.status(201).json({ ok: true, id: data.id, share_token: data.public_share_token })
}
