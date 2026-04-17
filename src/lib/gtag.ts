/**
 * Conversion tracking — Google Ads + Meta Pixel.
 *
 * KEY UPGRADE 2026-04-17:
 *   - Google Enhanced Conversions (hashed email/phone via gtag('set','user_data',...))
 *   - transaction_id (eventId) for both platforms = dedup with server-side CAPI
 *   - Returns the eventId so callers can pass it to /api/leads/intake (event_id field)
 *   - Reads _fbc / _fbp cookies and returns them too — they go to intake → CAPI
 *
 * Browser SHA-256 (SubtleCrypto). Falls back to plain text for very old browsers.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

const GOOGLE_AW_ID = 'AW-18049688013';
const GOOGLE_LEAD_LABEL = '-DbRCLOi55EcEM3D4Z5D';

export interface LeadConversionParams {
  email?: string | null;
  phone?: string | null;       // any format — normalized to digits
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  value?: number;              // default 1.0
  currency?: string;           // default 'USD'
}

export interface LeadConversionResult {
  eventId: string;
  fbc: string | null;
  fbp: string | null;
}

function uuid(): string {
  // RFC4122 v4
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

async function sha256(text: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return text; // fallback
  const buf = new TextEncoder().encode(text.trim().toLowerCase());
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function normalizePhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  // Panama default — assume +507 if 8 digits
  if (digits.length === 8) return `+507${digits}`;
  if (digits.startsWith('507') && digits.length === 11) return `+${digits}`;
  return digits.startsWith('+') ? digits : `+${digits}`;
}

/**
 * Read _fbc / _fbp cookies — needed by Meta CAPI for click attribution.
 * If _fbc isn't set but URL has fbclid, build it on-the-fly.
 */
export function getMetaClickIds(): { fbc: string | null; fbp: string | null } {
  let fbc = getCookie('_fbc');
  const fbp = getCookie('_fbp');
  if (!fbc && typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    const fbclid = url.searchParams.get('fbclid');
    if (fbclid) fbc = `fb.1.${Date.now()}.${fbclid}`;
  }
  return { fbc, fbp };
}

/**
 * Track a lead conversion with Enhanced Conversions for Google + dedup-ready Pixel for Meta.
 * Returns eventId + fbc/fbp so the caller can pass them to the server intake.
 *
 * Wrap in try/catch — adblockers will throw and we don't want to break the form submit.
 */
export async function trackLeadConversion(
  params: LeadConversionParams = {}
): Promise<LeadConversionResult> {
  const eventId = uuid();
  const { fbc, fbp } = getMetaClickIds();
  const value = params.value ?? 1.0;
  const currency = params.currency ?? 'USD';

  // Build hashed user_data for Google Enhanced Conversions
  let userData: Record<string, unknown> | null = null;
  if (params.email || params.phone) {
    userData = {};
    if (params.email) {
      try {
        userData.sha256_email_address = await sha256(params.email);
      } catch {/* ignore */}
    }
    if (params.phone) {
      try {
        userData.sha256_phone_number = await sha256(normalizePhoneE164(params.phone));
      } catch {/* ignore */}
    }
    if (params.firstName) {
      try { userData.sha256_first_name = await sha256(params.firstName); } catch {}
    }
    if (params.lastName) {
      try { userData.sha256_last_name = await sha256(params.lastName); } catch {}
    }
    if (params.city) {
      try { userData.address = { sha256_city: await sha256(params.city) }; } catch {}
    }
  }

  // 🔵 Google Ads — Enhanced Conversion
  try {
    if (typeof window.gtag === 'function') {
      if (userData) {
        window.gtag('set', 'user_data', userData);
      }
      window.gtag('event', 'conversion', {
        send_to: `${GOOGLE_AW_ID}/${GOOGLE_LEAD_LABEL}`,
        value,
        currency,
        transaction_id: eventId, // dedup
      });
    }
  } catch (e) {
    console.warn('[gtag] Google conversion failed (adblocker?):', e);
  }

  // 🔷 Meta Pixel — eventID matches CAPI for server/browser dedup
  try {
    if (typeof window.fbq === 'function') {
      window.fbq(
        'track',
        'Lead',
        { value, currency },
        { eventID: eventId }
      );
    }
  } catch (e) {
    console.warn('[fbq] Meta lead failed (adblocker?):', e);
  }

  return { eventId, fbc, fbp };
}

/**
 * Fire-and-forget legacy API for code paths that don't want async/await.
 * Returns the eventId synchronously; user_data is set without hashing.
 * Prefer the async `trackLeadConversion` for Enhanced Conversions.
 */
export function trackLeadConversionSync(): string {
  const eventId = uuid();
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'conversion', {
        send_to: `${GOOGLE_AW_ID}/${GOOGLE_LEAD_LABEL}`,
        value: 1.0,
        currency: 'USD',
        transaction_id: eventId,
      });
    }
  } catch {/* swallow */}
  try {
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'Lead', { value: 1.0, currency: 'USD' }, { eventID: eventId });
    }
  } catch {/* swallow */}
  return eventId;
}
