/**
 * Unified analytics wrapper for Solaris Panamá
 *
 * Loads PostHog (events/funnels/replays) and Microsoft Clarity (heatmaps/scroll)
 * only when env vars are set. Safe to call track() even if neither loaded —
 * it becomes a no-op.
 *
 * Required env vars (optional — each tool only loads if its key exists):
 *   VITE_POSTHOG_KEY   = phc_xxxxx
 *   VITE_POSTHOG_HOST  = https://us.i.posthog.com  (default)
 *   VITE_CLARITY_ID    = xxxxxxxxxx
 */

declare global {
  interface Window {
    posthog?: {
      init: (key: string, opts: Record<string, unknown>) => void;
      capture: (event: string, props?: Record<string, unknown>) => void;
      identify: (id: string, props?: Record<string, unknown>) => void;
      reset: () => void;
      people?: { set: (props: Record<string, unknown>) => void };
    };
    clarity?: (...args: unknown[]) => void;
  }
}

// ── PostHog snippet (inlined so we control load timing) ──
function loadPostHog(key: string, host: string) {
  if (typeof window === 'undefined' || window.posthog) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (function (t: Document, e: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let o: string[], n: number, p: HTMLScriptElement, r: any;
    if (e.__SV) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).posthog = e;
    e._i = [];
    e.init = function (i: string, s: Record<string, unknown>, a?: string) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function g(t: any, e: string) {
        const o = e.split('.');
        if (o.length === 2) {
          t = t[o[0]];
          e = o[1];
        }
        // eslint-disable-next-line prefer-rest-params
        t[e] = function () {
          t.push([e, ...Array.prototype.slice.call(arguments, 0)]);
        };
      }
      p = t.createElement('script');
      p.type = 'text/javascript';
      p.crossOrigin = 'anonymous';
      p.async = true;
      p.src = (s.api_host as string).replace('.i.posthog.com', '-assets.i.posthog.com') + '/static/array.js';
      r = t.getElementsByTagName('script')[0];
      r.parentNode.insertBefore(p, r);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let u: any = e;
      if (a !== undefined) u = e[a] = [];
      else a = 'posthog';
      u.people = u.people || [];
      u.toString = function (t?: boolean) {
        let e = 'posthog';
        if (a !== 'posthog') e += '.' + a;
        if (!t) e += ' (stub)';
        return e;
      };
      u.people.toString = function () {
        return u.toString(1) + '.people (stub)';
      };
      o = 'init capture register register_once unregister identify setPersonProperties reset get_distinct_id get_session_id startSessionRecording stopSessionRecording opt_in_capturing opt_out_capturing'.split(' ');
      for (n = 0; n < o.length; n++) g(u, o[n]);
      e._i.push([i, s, a]);
    };
    e.__SV = 1;
  })(document, window.posthog || []);

  window.posthog!.init(key, {
    api_host: host,
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    session_recording: {
      maskAllInputs: false,
      maskInputOptions: { password: true },
    },
    autocapture: {
      dom_event_allowlist: ['click', 'submit', 'change'],
      element_allowlist: ['a', 'button', 'input', 'form'],
    },
  });
}

// ── Microsoft Clarity snippet ──
function loadClarity(id: string) {
  if (typeof window === 'undefined' || window.clarity) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (function (c: any, l: Document, a: string, r: string) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
    const t = l.createElement(r) as HTMLScriptElement;
    t.async = true;
    t.src = 'https://www.clarity.ms/tag/' + id;
    const y = l.getElementsByTagName(r)[0];
    y.parentNode!.insertBefore(t, y);
  })(window, document, 'clarity', 'script');
}

let initialized = false;

export function initAnalytics() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  const phKey = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
  const phHost = (import.meta.env.VITE_POSTHOG_HOST as string) || 'https://us.i.posthog.com';
  const clarityId = import.meta.env.VITE_CLARITY_ID as string | undefined;

  if (phKey) {
    try {
      loadPostHog(phKey, phHost);
    } catch (e) {
      console.warn('PostHog init failed:', e);
    }
  }
  if (clarityId) {
    try {
      loadClarity(clarityId);
    } catch (e) {
      console.warn('Clarity init failed:', e);
    }
  }
}

/**
 * Fire an event to all installed analytics platforms.
 * Safe to call even if nothing is initialized.
 */
export function track(event: string, props?: Record<string, unknown>) {
  try {
    window.posthog?.capture(event, props);
  } catch {
    /* no-op */
  }
  try {
    // Clarity doesn't do custom events well — use setTag for segmentation
    if (window.clarity && props) {
      Object.entries(props).forEach(([k, v]) => {
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          window.clarity!('set', k, String(v));
        }
      });
    }
    window.clarity?.('event', event);
  } catch {
    /* no-op */
  }
}

/**
 * Identify a lead after form submission for better session linking.
 */
export function identify(
  distinctId: string,
  props?: Record<string, unknown>
) {
  try {
    window.posthog?.identify(distinctId, props);
  } catch {
    /* no-op */
  }
  try {
    window.clarity?.('identify', distinctId);
  } catch {
    /* no-op */
  }
}
