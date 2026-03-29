declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackLeadConversion() {
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'conversion', {
      send_to: 'AW-18049688013/-DbRCLOi55EcEM3D4Z5D',
      value: 1.0,
      currency: 'USD',
    });
  }
}
