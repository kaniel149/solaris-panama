import type { VercelRequest, VercelResponse } from '@vercel/node'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_SOLAR_API_KEY || ''

const PROMPT = `Eres un analista de techos solares. Analiza esta imagen satelital de un techo en Panamá.
Devuelve SOLO JSON válido con estas claves:
{"total_roof_area_m2": number, "usable_area_pct": number (0.65-0.85),
 "orientation": "south"|"east"|"west"|"east-west"|"mixed"|"unknown",
 "roof_type": "concrete"|"tile"|"metal"|"mixed", "shading": "none"|"partial"|"heavy",
 "tilt_estimate_deg": number, "existing_solar": boolean, "confidence": number (0-1)}
Suma el área de TODOS los edificios visibles, no solo el mayor.`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!GEMINI_API_KEY) return res.status(503).json({ error: 'GEMINI_API_KEY not configured', code: 'NO_API_KEY' })

  const lat = parseFloat(String(req.query.lat)); const lng = parseFloat(String(req.query.lng))
  const zoom = parseInt(String(req.query.zoom || '20'), 10)
  if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ error: 'lat/lng required' })

  try {
    // 1. Fetch satellite tile as base64
    const tileUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=640x640&maptype=satellite&key=${GOOGLE_MAPS_API_KEY}`
    const img = await fetch(tileUrl)
    if (!img.ok) {
      // Surface Google's own error so misconfig (API disabled / billing / key
      // restriction) is diagnosable. Never includes the key itself.
      const detail = await img.text().catch(() => '')
      return res.status(502).json({
        error: 'satellite tile fetch failed',
        status: img.status,
        keyConfigured: Boolean(GOOGLE_MAPS_API_KEY),
        detail: detail.slice(0, 300),
      })
    }
    const b64 = Buffer.from(await img.arrayBuffer()).toString('base64')

    // 2. Gemini vision, JSON mode
    const gem = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: PROMPT }, { inlineData: { mimeType: 'image/png', data: b64 } }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
        }) }
    )
    if (!gem.ok) return res.status(502).json({ error: 'gemini error', detail: await gem.text() })
    const gj = await gem.json()
    const text = gj?.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    return res.status(200).json({ ...JSON.parse(text), lat, lng, zoom })
  } catch (err) {
    return res.status(500).json({ error: 'vision failed', detail: String(err) })
  }
}
