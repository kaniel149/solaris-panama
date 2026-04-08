declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export function trackLeadConversion() {
  // Google Ads conversion
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'conversion', {
      send_to: 'AW-18049688013/-DbRCLOi55EcEM3D4Z5D',
      value: 1.0,
      currency: 'USD',
    });
  }
  // Meta Pixel lead event
  if (typeof window.fbq === 'function') {
    window.fbq('track', 'Lead', {
      value: 1.0,
      currency: 'USD',
    });
  }
}
