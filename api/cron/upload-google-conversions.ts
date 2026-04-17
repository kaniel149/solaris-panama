/**
 * Upload Offline Conversions to Google Ads — runs every 6h.
 *
 * Picks all leads where:
 *   - status = 'won'
 *   - gclid IS NOT NULL
 *   - google_conversion_uploaded_at IS NULL
 *   - won_at IS NOT NULL
 *
 * For each lead, uploads a click-conversion via Google Ads API v18.
 * Records `google_conversion_uploaded_at` so we never double-upload.
 *
 * Required env vars:
 *   - GOOGLE_ADS_DEVELOPER_TOKEN
 *   - GOOGLE_ADS_CLIENT_ID
 *   - GOOGLE_ADS_CLIENT_SECRET
 *   - GOOGLE_ADS_REFRESH_TOKEN
 *   - GOOGLE_ADS_CUSTOMER_ID            (Solaris Panama: 2386814319)
 *   - GOOGLE_ADS_LOGIN_CUSTOMER_ID      (MCC: 3253159193)
 *   - GOOGLE_ADS_CONVERSION_ACTION_ID   (numeric ID of the "Lead Won (Offline)" action you create in Google Ads UI)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const API_VERSION = 'v18';

interface AccessTokenCache {
  token: string;
  expiresAt: number;
}
let tokenCache: AccessTokenCache | null = null;

async function getAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.token;

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID || '',
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET || '',
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN || '',
    grant_type: 'refresh_token',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`oauth_refresh_failed_${res.status}: ${text}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return json.access_token;
}

interface UploadResult {
  leadId: string;
  ok: boolean;
  error?: string;
}

async function uploadConversion(lead: {
  id: string;
  gclid: string;
  won_at: string;
  deal_value: number | null;
  deal_currency: string | null;
}): Promise<UploadResult> {
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID || '';
  const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '';
  const conversionActionId = process.env.GOOGLE_ADS_CONVERSION_ACTION_ID || '';
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '';

  if (!customerId || !conversionActionId || !developerToken) {
    return { leadId: lead.id, ok: false, error: 'env_missing' };
  }

  const accessToken = await getAccessToken();

  // Format won_at: 'YYYY-MM-DD HH:MM:SS+00:00' (Google requires offset)
  const wonDate = new Date(lead.won_at);
  const yyyy = wonDate.getUTCFullYear();
  const mm = String(wonDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(wonDate.getUTCDate()).padStart(2, '0');
  const hh = String(wonDate.getUTCHours()).padStart(2, '0');
  const mi = String(wonDate.getUTCMinutes()).padStart(2, '0');
  const ss = String(wonDate.getUTCSeconds()).padStart(2, '0');
  const conversionDateTime = `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}+00:00`;

  const body = {
    conversions: [
      {
        gclid: lead.gclid,
        conversionAction: `customers/${customerId}/conversionActions/${conversionActionId}`,
        conversionDateTime,
        conversionValue: lead.deal_value || 1.0,
        currencyCode: lead.deal_currency || 'USD',
      },
    ],
    partialFailure: true,
  };

  const url = `https://googleads.googleapis.com/${API_VERSION}/customers/${customerId}:uploadClickConversions`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': developerToken,
      'login-customer-id': loginCustomerId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    return { leadId: lead.id, ok: false, error: `api_${res.status}: ${JSON.stringify(json).slice(0, 300)}` };
  }

  // Check for partialFailureError (some leads can fail even if HTTP 200)
  if (json.partialFailureError) {
    return { leadId: lead.id, ok: false, error: `partial_fail: ${json.partialFailureError.message}` };
  }

  return { leadId: lead.id, ok: true };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const { data: leads, error } = await supabase
      .from('leads')
      .select('id, gclid, won_at, deal_value, deal_currency')
      .eq('status', 'won')
      .not('gclid', 'is', null)
      .not('won_at', 'is', null)
      .is('google_conversion_uploaded_at', null)
      .limit(50);

    if (error) {
      console.error('[google-conv] fetch error:', error);
      return res.status(500).json({ error: 'fetch_failed' });
    }

    if (!leads || leads.length === 0) {
      return res.status(200).json({ status: 'no_pending', count: 0 });
    }

    const results: UploadResult[] = [];
    for (const lead of leads) {
      try {
        const r = await uploadConversion(lead as any);
        results.push(r);
        if (r.ok) {
          await supabase
            .from('leads')
            .update({ google_conversion_uploaded_at: new Date().toISOString() })
            .eq('id', lead.id);
        }
        // Log each upload to webhook_logs
        await supabase.from('webhook_logs').insert({
          source: 'enhanced_conv',
          direction: 'out',
          status_code: r.ok ? 200 : 500,
          payload: { lead_id: lead.id, gclid: lead.gclid?.slice(0, 30), value: lead.deal_value },
          error: r.error || null,
        }).then(() => {}).catch(() => {});
      } catch (err) {
        results.push({ leadId: lead.id, ok: false, error: String(err) });
      }
    }

    const success = results.filter((r) => r.ok).length;
    return res.status(200).json({
      status: 'done',
      total: leads.length,
      success,
      failed: leads.length - success,
      results,
    });
  } catch (err) {
    console.error('[google-conv] handler error:', err);
    return res.status(500).json({ error: String(err) });
  }
}
