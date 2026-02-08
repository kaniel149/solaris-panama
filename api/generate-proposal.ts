// Vercel Serverless API Proxy for AI Proposal Generation
// Proxies requests to Anthropic Claude API, keeping API key server-side
//
// Usage:
//   POST /api/generate-proposal
//   Body: { systemPrompt: string, userPrompt: string, language: 'en' | 'es' }

import type { VercelRequest, VercelResponse } from '@vercel/node';

// ===== CONFIG =====

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_API_VERSION = '2023-06-01';
const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 8000;

// ===== HELPERS =====

function setCorsHeaders(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function validateRequestBody(body: unknown): { valid: true; data: { systemPrompt: string; userPrompt: string; language: string } } | { valid: false; error: string } {
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

  return {
    valid: true,
    data: {
      systemPrompt,
      userPrompt,
      language: String(language),
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
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    console.error('[generate-proposal] ANTHROPIC_API_KEY not configured');
    res.status(503).json({
      error: 'ANTHROPIC_API_KEY not configured',
      code: 'NO_API_KEY',
      hint: 'Add ANTHROPIC_API_KEY to your Vercel project environment variables.',
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

  const { systemPrompt, userPrompt } = validation.data;

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': ANTHROPIC_API_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[generate-proposal] Anthropic API error:', {
        status: response.status,
        error: errorText,
      });

      res.status(response.status).json({
        error: `Anthropic API error: ${response.status}`,
        code: 'API_ERROR',
        details: errorText,
      });
      return;
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';

    res.status(200).json({
      content,
      usage: data.usage,
      model: data.model,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to reach Anthropic API';
    console.error('[generate-proposal] Fetch error:', message);
    res.status(500).json({
      error: message,
      code: 'FETCH_ERROR',
    });
  }
}
