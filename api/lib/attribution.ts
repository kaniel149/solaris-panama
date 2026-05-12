/**
 * Server-side attribution inference.
 *
 * When a lead arrives with a gclid or fbclid but no utm_source (which happens
 * because Google Ads auto-tagging appends gclid without adding UTM params, and
 * Meta similarly appends fbclid), we infer the missing fields so every lead has
 * a usable attribution chain for reporting and CAPI.
 *
 * Rules (in priority order):
 *   1. utm_source already set → leave everything as-is
 *   2. gclid present → utm_source='google', utm_medium='cpc', utm_campaign='gclid_inferred'
 *   3. fbclid present → utm_source='facebook', utm_medium='paid_social', utm_campaign='fbclid_inferred'
 *   4. referrer_source provided (from client sessionStorage) → use referrer fallback
 */

export interface RawAttribution {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
  /** Referrer-inferred source passed from the client ('google_organic' | 'facebook' | 'instagram') */
  referrer_source?: string | null;
  /** Raw document.referrer captured on the client */
  referrer_url?: string | null;
}

export interface ResolvedAttribution {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  gclid: string | null;
  fbclid: string | null;
  /** Debug payload written to leads.attribution_debug and webhook_logs */
  attribution_debug: {
    raw_utm_source: string | null;
    raw_utm_medium: string | null;
    raw_utm_campaign: string | null;
    gclid_present: boolean;
    fbclid_present: boolean;
    referrer_source: string | null;
    referrer_url: string | null;
    inferred: boolean;
    infer_reason: string | null;
    resolved_utm_source: string | null;
  };
}

const REFERRER_SOURCE_MAP: Record<string, { utm_source: string; utm_medium: string }> = {
  google_organic: { utm_source: 'google', utm_medium: 'organic' },
  google: { utm_source: 'google', utm_medium: 'organic' },
  facebook: { utm_source: 'facebook', utm_medium: 'social' },
  instagram: { utm_source: 'instagram', utm_medium: 'social' },
};

export function inferAttribution(raw: RawAttribution): ResolvedAttribution {
  const debug = {
    raw_utm_source: raw.utm_source || null,
    raw_utm_medium: raw.utm_medium || null,
    raw_utm_campaign: raw.utm_campaign || null,
    gclid_present: !!raw.gclid,
    fbclid_present: !!raw.fbclid,
    referrer_source: raw.referrer_source || null,
    referrer_url: raw.referrer_url || null,
    inferred: false,
    infer_reason: null as string | null,
    resolved_utm_source: raw.utm_source || null,
  };

  // Rule 1: utm_source already set — trust it
  if (raw.utm_source) {
    return {
      utm_source: raw.utm_source,
      utm_medium: raw.utm_medium || null,
      utm_campaign: raw.utm_campaign || null,
      utm_content: raw.utm_content || null,
      utm_term: raw.utm_term || null,
      gclid: raw.gclid || null,
      fbclid: raw.fbclid || null,
      attribution_debug: debug,
    };
  }

  let utm_source: string | null = null;
  let utm_medium: string | null = null;
  let utm_campaign: string | null = null;

  // Rule 2: gclid present → Google Ads paid click
  if (raw.gclid) {
    utm_source = 'google';
    utm_medium = 'cpc';
    utm_campaign = raw.utm_campaign || 'gclid_inferred';
    debug.inferred = true;
    debug.infer_reason = 'gclid_present';
  }
  // Rule 3: fbclid present → Meta paid click
  else if (raw.fbclid) {
    utm_source = 'facebook';
    utm_medium = 'paid_social';
    utm_campaign = raw.utm_campaign || 'fbclid_inferred';
    debug.inferred = true;
    debug.infer_reason = 'fbclid_present';
  }
  // Rule 4: referrer_source from client sessionStorage
  else if (raw.referrer_source && REFERRER_SOURCE_MAP[raw.referrer_source]) {
    const mapped = REFERRER_SOURCE_MAP[raw.referrer_source];
    utm_source = mapped.utm_source;
    utm_medium = mapped.utm_medium;
    utm_campaign = raw.utm_campaign || 'referrer_inferred';
    debug.inferred = true;
    debug.infer_reason = `referrer:${raw.referrer_source}`;
  }

  debug.resolved_utm_source = utm_source;

  return {
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content: raw.utm_content || null,
    utm_term: raw.utm_term || null,
    gclid: raw.gclid || null,
    fbclid: raw.fbclid || null,
    attribution_debug: debug,
  };
}
