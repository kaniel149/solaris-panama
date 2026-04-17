/**
 * Meta Conversions API (CAPI) — server-side event reporting.
 *
 * Why this exists: client-side `fbq('track','Lead')` loses ~30% of events on iOS
 * (ITP, ad-blockers, network errors). CAPI sends the event server-side with
 * hashed user data so Meta can match it back to the click.
 *
 * Events we send:
 *   - Lead          — when a form submission lands in our DB
 *   - Purchase      — when CRM marks a lead status='won' (with deal_value)
 *
 * Dedup with browser pixel: pass the SAME event_id to both fbq() and CAPI.
 * Meta dedups on (event_name, event_id) within a 7-day window.
 *
 * Required env vars:
 *   - META_PIXEL_ID         (Pixel ID from Events Manager)
 *   - META_CAPI_TOKEN       (System User token w/ ads_management permission)
 *   - META_CAPI_TEST_CODE   (optional — TEST123... from Events Manager Test Events)
 */

import * as crypto from 'crypto';

const PIXEL_ID = process.env.META_PIXEL_ID || '';
const CAPI_TOKEN = process.env.META_CAPI_TOKEN || '';
const TEST_CODE = process.env.META_CAPI_TEST_CODE; // only set during testing
const GRAPH_VERSION = 'v21.0';

export type MetaEventName = 'Lead' | 'CompleteRegistration' | 'Purchase' | 'Contact' | 'Schedule';

export interface CapiEventParams {
  eventName: MetaEventName;
  eventId: string;          // UUID — must match browser fbq event_id
  eventTime?: number;       // unix seconds (default: now)
  email?: string | null;
  phone?: string | null;    // any format — we normalize to E.164 digits
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  country?: string;         // 2-letter ISO, default 'pa'
  externalId?: string;      // your internal user_id / lead_id
  fbc?: string | null;      // _fbc cookie (fb.1.<ts>.<fbclid>)
  fbp?: string | null;      // _fbp cookie (fb.1.<ts>.<random>)
  clientIp?: string | null;
  clientUserAgent?: string | null;
  sourceUrl?: string;
  value?: number;           // for Purchase events
  currency?: string;        // 'USD' | 'PAB' (Balboa = 1:1 USD)
  contentName?: string;
  customData?: Record<string, unknown>;
}

const sha256 = (s: string): string =>
  crypto.createHash('sha256').update(s.trim().toLowerCase()).digest('hex');

const normalizePhone = (p: string): string => p.replace(/\D/g, '');

export interface CapiResult {
  ok: boolean;
  status: number;
  body: any;
  durationMs: number;
}

export async function sendMetaCapiEvent(params: CapiEventParams): Promise<CapiResult> {
  const start = Date.now();

  if (!PIXEL_ID || !CAPI_TOKEN) {
    return {
      ok: false,
      status: 0,
      body: { error: 'META_PIXEL_ID or META_CAPI_TOKEN not set' },
      durationMs: 0,
    };
  }

  const userData: Record<string, unknown> = {};
  if (params.email) userData.em = [sha256(params.email)];
  if (params.phone) userData.ph = [sha256(normalizePhone(params.phone))];
  if (params.firstName) userData.fn = [sha256(params.firstName)];
  if (params.lastName) userData.ln = [sha256(params.lastName)];
  if (params.city) userData.ct = [sha256(params.city)];
  userData.country = [sha256(params.country || 'pa')];
  if (params.externalId) userData.external_id = [sha256(params.externalId)];
  if (params.fbc) userData.fbc = params.fbc;
  if (params.fbp) userData.fbp = params.fbp;
  if (params.clientIp) userData.client_ip_address = params.clientIp;
  if (params.clientUserAgent) userData.client_user_agent = params.clientUserAgent;

  const customData: Record<string, unknown> = { ...(params.customData || {}) };
  if (params.value !== undefined) customData.value = params.value;
  if (params.currency) customData.currency = params.currency;
  if (params.contentName) customData.content_name = params.contentName;

  const event: Record<string, unknown> = {
    event_name: params.eventName,
    event_time: params.eventTime || Math.floor(Date.now() / 1000),
    event_id: params.eventId,
    action_source: 'website',
    user_data: userData,
  };
  if (params.sourceUrl) event.event_source_url = params.sourceUrl;
  if (Object.keys(customData).length > 0) event.custom_data = customData;

  const payload: Record<string, unknown> = { data: [event] };
  if (TEST_CODE) payload.test_event_code = TEST_CODE;

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${PIXEL_ID}/events?access_token=${CAPI_TOKEN}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    return {
      ok: res.ok,
      status: res.status,
      body,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      body: { error: String(err) },
      durationMs: Date.now() - start,
    };
  }
}

/**
 * Fire-and-forget wrapper that also logs to Supabase webhook_logs table.
 * Non-blocking — never throws.
 */
export async function sendMetaCapiEventLogged(
  supabase: any,
  params: CapiEventParams
): Promise<void> {
  const result = await sendMetaCapiEvent(params);
  try {
    await supabase.from('webhook_logs').insert({
      source: 'capi',
      direction: 'out',
      status_code: result.status,
      payload: { event_name: params.eventName, event_id: params.eventId, value: params.value },
      response: result.body,
      error: result.ok ? null : (result.body?.error?.message || 'capi_failed'),
      duration_ms: result.durationMs,
    });
  } catch {
    /* swallow — logging failure shouldn't break flow */
  }
}
