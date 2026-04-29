/**
 * RouteTracker — fires GA4 page_view + Meta Pixel PageView on every SPA route change.
 *
 * Must be mounted inside <BrowserRouter> (uses useLocation).
 * PostHog handles its own pageview tracking via capture_pageview: true in analytics.ts —
 * do NOT duplicate it here.
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function RouteTracker() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname + location.search;

    // GA4 page_view
    const ga4Id = import.meta.env.VITE_GA4_MEASUREMENT_ID as string | undefined;
    if (ga4Id && typeof window.gtag === 'function') {
      try {
        window.gtag('event', 'page_view', {
          page_path: path,
          page_location: window.location.href,
        });
      } catch (e) {
        console.warn('[gtag] page_view failed:', e);
      }
    }

    // Meta Pixel PageView
    try {
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'PageView');
      }
    } catch (e) {
      console.warn('[fbq] PageView failed:', e);
    }
  }, [location]);

  return null;
}
