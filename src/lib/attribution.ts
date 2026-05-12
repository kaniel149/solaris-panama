/**
 * Client-side attribution capture.
 *
 * Captures UTM params + gclid/fbclid from the URL on page load, augments with
 * a document.referrer fallback when no UTM params are present, and persists the
 * result in sessionStorage so it survives multi-step funnels (LP quiz steps,
 * SPA route changes) without requiring params to be on every URL.
 *
 * Usage:
 *   1. Call `initAttribution()` once at app entry (main.tsx or App.tsx).
 *   2. Call `getAttribution()` at form submit time to include in the API payload.
 */

const SESSION_KEY = 'solaris_attribution';

export interface AttributionData {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  gclid: string | null;
  fbclid: string | null;
  /** Normalised referrer source set when no UTM params are present */
  referrer_source: string | null;
  /** Raw document.referrer value at time of capture */
  referrer_url: string | null;
}

/** Infer a canonical referrer_source from document.referrer */
function parseReferrerSource(referrer: string): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (host.includes('google.')) return 'google_organic';
    if (host.includes('facebook.') || host.includes('fb.com')) return 'facebook';
    if (host.includes('instagram.')) return 'instagram';
    if (host.includes('bing.')) return 'bing_organic';
    if (host.includes('yahoo.')) return 'yahoo_organic';
  } catch {
    // invalid URL — ignore
  }
  return null;
}

/**
 * Capture attribution from the current URL + document.referrer.
 * Only writes to sessionStorage if attribution data is found; does NOT overwrite
 * an existing session entry (first-touch attribution model).
 */
export function initAttribution(): void {
  if (typeof window === 'undefined') return;

  // Don't overwrite an existing session (first-touch model)
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return;
  } catch {
    return;
  }

  const params = new URLSearchParams(window.location.search);

  const utm_source = params.get('utm_source');
  const utm_medium = params.get('utm_medium');
  const utm_campaign = params.get('utm_campaign');
  const utm_content = params.get('utm_content');
  const utm_term = params.get('utm_term');
  const gclid = params.get('gclid');
  const fbclid = params.get('fbclid');

  // Referrer fallback — only used when no click-id or UTM present
  const referrer_url = document.referrer || null;
  const referrer_source =
    !utm_source && !gclid && !fbclid ? parseReferrerSource(referrer_url || '') : null;

  // Only persist if there is something worth storing
  const hasData =
    utm_source || utm_medium || gclid || fbclid || referrer_source;

  if (!hasData) return;

  const data: AttributionData = {
    utm_source: utm_source || null,
    utm_medium: utm_medium || null,
    utm_campaign: utm_campaign || null,
    utm_content: utm_content || null,
    utm_term: utm_term || null,
    gclid: gclid || null,
    fbclid: fbclid || null,
    referrer_source,
    referrer_url,
  };

  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch {
    // sessionStorage blocked (private mode, full storage) — degrade gracefully
  }
}

/**
 * Return the stored attribution data for inclusion in form submission payloads.
 * Falls back to reading live URL params if sessionStorage is unavailable.
 */
export function getAttribution(): AttributionData {
  const empty: AttributionData = {
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_content: null,
    utm_term: null,
    gclid: null,
    fbclid: null,
    referrer_source: null,
    referrer_url: null,
  };

  if (typeof window === 'undefined') return empty;

  // Try sessionStorage first
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) return JSON.parse(stored) as AttributionData;
  } catch {
    // fall through to live URL read
  }

  // Fallback: read from current URL (works for single-page visits)
  const params = new URLSearchParams(window.location.search);
  const gclid = params.get('gclid');
  const fbclid = params.get('fbclid');
  const utm_source = params.get('utm_source');
  const referrer_url = document.referrer || null;

  return {
    utm_source: utm_source || null,
    utm_medium: params.get('utm_medium') || null,
    utm_campaign: params.get('utm_campaign') || null,
    utm_content: params.get('utm_content') || null,
    utm_term: params.get('utm_term') || null,
    gclid: gclid || null,
    fbclid: fbclid || null,
    referrer_source: !utm_source && !gclid && !fbclid
      ? parseReferrerSource(referrer_url || '') : null,
    referrer_url,
  };
}
