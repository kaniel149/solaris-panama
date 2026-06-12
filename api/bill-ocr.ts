// ==========================================
// Bill OCR API — Vercel Serverless Function (Solaris Panama)
// Accepts a Panama electricity bill image (base64 JSON body or multipart)
// → Calls Gemini Vision → Returns structured billing data
//
// POST /api/bill-ocr
//   Content-Type: application/json
//   Body: { image: "<base64>", mimeType?: "image/jpeg"|"image/png"|"image/webp" }
//
// Response: BillOcrResult JSON
// ==========================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

// ===== CONFIG =====

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB base64 decoded limit

// ===== TYPES =====

export interface BillOcrResult {
  utility: 'naturgy' | 'edemet' | 'ensa' | 'edechi' | 'unknown';
  monthly_kwh: number | null;
  kwh_history: Array<{ month: string; kwh: number }>;
  total_usd: number | null;
  tariff_code: string | null;
  client_name: string | null;
  service_address: string | null;
  meter_or_nis: string | null;
  confidence: number; // 0–1
}

// ===== HELPERS =====

function setCorsHeaders(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function errorEs(res: VercelResponse, status: number, message: string): VercelResponse {
  return res.status(status).json({ error: message });
}

// ===== GEMINI PROMPT =====
// Targets Spanish-language bills from Panama distributors:
//   • Naturgy Panama (previously ENSA — covers most of the country)
//   • EDEMET (western Panama City metro)
//   • EDECHI (Chiriquí, Bocas del Toro)
// Bills include: NIS / medidor number, tariff category (BT-1, MT-1…),
// monthly kWh consumption, arrear/current charge breakdown, and a 12-month history table.

const GEMINI_PROMPT = `Eres un experto en lectura de facturas eléctricas de Panamá.
Analiza la imagen de esta factura y extrae los datos en JSON EXACTO sin texto adicional.

Distribuidoras conocidas de Panamá:
- Naturgy Panama (antes ENSA) — cubre la mayor parte del país
- EDEMET — zona oeste de Ciudad de Panamá y Panamá Oeste
- EDECHI — Chiriquí, Bocas del Toro

Devuelve SOLO este JSON válido:
{
  "utility": "naturgy" | "edemet" | "ensa" | "edechi" | "unknown",
  "monthly_kwh": number | null,
  "kwh_history": [{"month": "MMM YYYY", "kwh": number}],
  "total_usd": number | null,
  "tariff_code": string | null,
  "client_name": string | null,
  "service_address": string | null,
  "meter_or_nis": string | null,
  "confidence": number
}

Reglas de extracción:
- utility: usa "ensa" si ves "ENSA" en el logo/texto (facturas antiguas), "naturgy" si ves "Naturgy"
- monthly_kwh: consumo del mes actual en kWh (busca "Consumo", "KWH", "kWh Consumidos")
- kwh_history: hasta 12 meses del historial de consumo. Si no hay historial, devuelve []
- total_usd: monto total a pagar en USD/Balboas (busca "Total a Pagar", "Monto Total", "B/.")
- tariff_code: categoría tarifaria (ej: "BT-1", "MT-1", "BTS", "AT")
- client_name: nombre del titular de la cuenta
- service_address: dirección del servicio eléctrico
- meter_or_nis: número de medidor o NIS (busca "NIS", "No. Medidor", "Cuenta")
- confidence: 0.0–1.0 (qué tan legible y completa es la factura)
  0.9+ = todos los campos principales presentes y claros
  0.7–0.9 = mayoría de campos presentes, algunos ilegibles
  0.5–0.7 = factura parcialmente visible o de baja resolución
  <0.5 = imagen muy oscura, borrosa o no es una factura eléctrica`;

// ===== IN-MEMORY RATE LIMITER =====
// Simple per-IP counter (resets on cold start — adequate for a serverless function).
// Prevents abuse without requiring Redis.

const ipCounts = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT = 20; // requests per window
const RATE_WINDOW_MS = 60_000; // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipCounts.get(ip);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    ipCounts.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

// ===== HANDLER =====

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return errorEs(res, 405, 'Método no permitido. Use POST.');
  }

  // Guard: API key present
  if (!GEMINI_API_KEY) {
    return res.status(503).json({
      error: 'Servicio no configurado. Contacte al administrador.',
      code: 'NO_API_KEY',
    });
  }

  // Rate limit (by IP)
  const clientIp =
    (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';
  if (isRateLimited(clientIp)) {
    return errorEs(
      res,
      429,
      'Demasiadas solicitudes. Espere un momento e intente de nuevo.'
    );
  }

  // Parse body
  const body = req.body as Record<string, unknown> | null | undefined;
  if (!body || typeof body !== 'object') {
    return errorEs(res, 400, 'Cuerpo de solicitud inválido. Se requiere JSON con campo "image".');
  }

  const imageField = body['image'];
  if (typeof imageField !== 'string' || imageField.length === 0) {
    return errorEs(res, 400, 'Campo "image" requerido (string base64).');
  }

  // Strip optional data-URL prefix ("data:image/jpeg;base64,")
  const base64Data = imageField.replace(/^data:[^;]+;base64,/, '');

  // File size guard: base64 → actual bytes ≈ base64.length * 3/4
  const approxBytes = Math.ceil((base64Data.length * 3) / 4);
  if (approxBytes > MAX_IMAGE_BYTES) {
    return errorEs(
      res,
      400,
      `La imagen es demasiado grande (máx. ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB). Reduzca la calidad o use un recorte de la factura.`
    );
  }

  // Detect MIME type
  const rawMime = typeof body['mimeType'] === 'string' ? body['mimeType'] : '';
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const mimeType: string = allowedMimes.includes(rawMime) ? rawMime : 'image/jpeg';

  // Call Gemini Vision
  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: GEMINI_PROMPT },
                { inlineData: { mimeType, data: base64Data } },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const detail = await geminiRes.text().catch(() => '');
      console.error('[bill-ocr] Gemini error', geminiRes.status, detail.slice(0, 300));
      return res.status(502).json({
        error: 'Error al procesar la imagen. Intente de nuevo en unos segundos.',
        code: 'GEMINI_ERROR',
      });
    }

    const geminiJson = await geminiRes.json();
    const rawText: string =
      geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    let parsed: Partial<BillOcrResult>;
    try {
      parsed = JSON.parse(rawText) as Partial<BillOcrResult>;
    } catch {
      console.error('[bill-ocr] JSON parse failed:', rawText.slice(0, 200));
      return res.status(502).json({
        error: 'No se pudo interpretar la respuesta del servicio de OCR.',
        code: 'PARSE_ERROR',
      });
    }

    // Normalize and sanitize the result
    const result: BillOcrResult = {
      utility: normalizeUtility(parsed.utility),
      monthly_kwh: parseNumberOrNull(parsed.monthly_kwh),
      kwh_history: Array.isArray(parsed.kwh_history)
        ? parsed.kwh_history
            .filter(
              (h) =>
                h &&
                typeof h === 'object' &&
                typeof h.month === 'string' &&
                typeof h.kwh === 'number'
            )
            .slice(0, 24)
        : [],
      total_usd: parseNumberOrNull(parsed.total_usd),
      tariff_code:
        typeof parsed.tariff_code === 'string' ? parsed.tariff_code.slice(0, 30) : null,
      client_name:
        typeof parsed.client_name === 'string' ? parsed.client_name.slice(0, 120) : null,
      service_address:
        typeof parsed.service_address === 'string'
          ? parsed.service_address.slice(0, 200)
          : null,
      meter_or_nis:
        typeof parsed.meter_or_nis === 'string' ? parsed.meter_or_nis.slice(0, 50) : null,
      confidence:
        typeof parsed.confidence === 'number'
          ? Math.max(0, Math.min(1, parsed.confidence))
          : 0.5,
    };

    return res.status(200).json(result);
  } catch (err) {
    console.error('[bill-ocr] unexpected error:', err);
    return res.status(500).json({
      error: 'Error interno del servidor. Intente de nuevo.',
      code: 'INTERNAL_ERROR',
    });
  }
}

// ===== UTILS =====

function normalizeUtility(
  raw: unknown
): BillOcrResult['utility'] {
  if (typeof raw !== 'string') return 'unknown';
  const v = raw.toLowerCase().trim();
  if (v === 'naturgy' || v === 'ensa') return v;
  if (v === 'edemet') return 'edemet';
  if (v === 'edechi') return 'edechi';
  return 'unknown';
}

function parseNumberOrNull(raw: unknown): number | null {
  if (typeof raw === 'number' && isFinite(raw) && raw >= 0) return raw;
  if (typeof raw === 'string') {
    const n = parseFloat(raw.replace(/[^\d.]/g, ''));
    if (isFinite(n) && n >= 0) return n;
  }
  return null;
}
