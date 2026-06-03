// Vercel Serverless API Proxy for AI Proposal Generation
// Proxies requests to Groq API (OpenAI-compatible), keeping API key server-side
//
// Usage:
//   POST /api/generate-proposal
//   Body: { systemPrompt: string, userPrompt: string, language: 'en' | 'es' }

import type { VercelRequest, VercelResponse } from '@vercel/node';

// ===== CONFIG =====

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';
const MAX_TOKENS = 8000;
const TEMPERATURE = 0.7;

// ===== 3-OPTION COMPARISON (optional) =====

// Mirrors `ProposalOption` from src/services/proposalOptions.ts. Kept local so this
// serverless function has no cross-module import (Vercel api/* bundles independently).
interface ProposalOption {
  id: 'epc' | 'ppa' | 'epc_battery';
  label_es: string;
  upfront_usd: number;
  annual_savings_usd: number;
  payback_years: number;
  savings_25yr_usd: number;
  co2_tons_25yr: number;
}

function isProposalOption(o: unknown): o is ProposalOption {
  if (!o || typeof o !== 'object') return false;
  const r = o as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.label_es === 'string' &&
    typeof r.upfront_usd === 'number' &&
    typeof r.annual_savings_usd === 'number'
  );
}

const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

/**
 * Render a Spanish 3-column comparison table (one column per option) as Markdown.
 * Rows: Inversión inicial, Ahorro anual, Recuperación, Ahorro 25 años, CO₂ (25 años).
 * Returned text is injected into the proposal prompt so the LLM includes it verbatim.
 */
function buildComparisonTable(options: ProposalOption[]): string {
  const header = `| Concepto | ${options.map((o) => o.label_es).join(' | ')} |`;
  const divider = `|----------|${options.map(() => '------').join('|')}|`;
  const row = (label: string, cell: (o: ProposalOption) => string) =>
    `| ${label} | ${options.map(cell).join(' | ')} |`;

  return [
    '### Comparación de Opciones',
    '',
    header,
    divider,
    row('Inversión inicial', (o) => (o.upfront_usd > 0 ? usd(o.upfront_usd) : 'Sin inversión inicial')),
    row('Ahorro anual', (o) => usd(o.annual_savings_usd)),
    row('Recuperación', (o) => (o.payback_years > 0 ? `${o.payback_years} años` : 'N/A (PPA)')),
    row('Ahorro 25 años', (o) => usd(o.savings_25yr_usd)),
    row('CO₂ evitado (25 años)', (o) => `${o.co2_tons_25yr} t`),
  ].join('\n');
}

// ===== HELPERS =====

function setCorsHeaders(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function validateRequestBody(body: unknown): { valid: true; data: { systemPrompt: string; userPrompt: string; language: string; options?: ProposalOption[] } } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const { systemPrompt, userPrompt } = body as Record<string, unknown>;

  if (!systemPrompt || typeof systemPrompt !== 'string') {
    return { valid: false, error: 'Missing or invalid "systemPrompt" field' };
  }

  if (!userPrompt || typeof userPrompt !== 'string') {
    return { valid: false, error: 'Missing or invalid "userPrompt" field' };
  }

  const language = (body as Record<string, unknown>).language || 'en';

  // Optional 3-option comparison. When present and valid, the proposal renders a
  // Spanish comparison table. Invalid/absent → existing single-option path is unaffected.
  const rawOptions = (body as Record<string, unknown>).options;
  let options: ProposalOption[] | undefined;
  if (Array.isArray(rawOptions) && rawOptions.length > 0 && rawOptions.every(isProposalOption)) {
    options = rawOptions as ProposalOption[];
  }

  return {
    valid: true,
    data: {
      systemPrompt,
      userPrompt,
      language: String(language),
      options,
    },
  };
}

// ===== MAIN HANDLER =====

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS headers
  setCorsHeaders(res);

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only POST allowed
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  // Validate API key
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    console.error('[generate-proposal] GROQ_API_KEY not configured');
    res.status(503).json({
      error: 'GROQ_API_KEY not configured',
      code: 'NO_API_KEY',
      hint: 'Add GROQ_API_KEY to your Vercel project environment variables.',
    });
    return;
  }

  // Validate request body
  const validation = validateRequestBody(req.body);
  if (!validation.valid) {
    res.status(400).json({
      error: validation.error,
      code: 'INVALID_REQUEST',
    });
    return;
  }

  const { systemPrompt, options } = validation.data;
  let { userPrompt } = validation.data;

  // When a 3-option set is provided, append the Spanish comparison table to the user
  // prompt and instruct the model to embed it (rendered verbatim from real numbers).
  if (options && options.length > 0) {
    const table = buildComparisonTable(options);
    userPrompt += `\n\nINCLUYE LA SIGUIENTE TABLA DE COMPARACIÓN DE OPCIONES (en español, USD) tal cual en la sección de análisis financiero, sin alterar los números:\n\n${table}\n\nPresenta las tres opciones (Compra/EPC, PPA, EPC + Batería) y recomienda la más adecuada para el cliente.`;
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[generate-proposal] Groq API error:', {
        status: response.status,
        error: errorText,
      });

      res.status(response.status).json({
        error: `Groq API error: ${response.status}`,
        code: 'API_ERROR',
        details: errorText,
      });
      return;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    res.status(200).json({
      content,
      usage: data.usage,
      model: data.model,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to reach Groq API';
    console.error('[generate-proposal] Fetch error:', message);
    res.status(500).json({
      error: message,
      code: 'FETCH_ERROR',
    });
  }
}
