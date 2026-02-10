export const PUBLIC_CONFIG = {
  whatsappPhone: import.meta.env.VITE_PUBLIC_WHATSAPP_PHONE || '50700000000',
  companyName: 'Solaris Panama',
  defaultCenter: [-79.52, 9.0] as [number, number],
  defaultZoom: 14,
  minBuildingArea: 200,
  minSuitabilityScore: 30,
};
