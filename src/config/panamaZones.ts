import type { LeadZone } from '@/types/lead';

export const PANAMA_ZONES: LeadZone[] = [
  // === Panama City Commercial Districts ===
  {
    id: 'costa-del-este',
    name: 'Costa del Este',
    nameEs: 'Costa del Este',
    center: { lat: 9.012, lng: -79.465 },
    bounds: { north: 9.022, south: 9.002, east: -79.455, west: -79.475 },
    description: 'Premium business district with large commercial buildings',
    descriptionEs: 'Distrito empresarial premium con grandes edificios comerciales',
    color: '#00ffcc',
  },
  {
    id: 'obarrio',
    name: 'Obarrio',
    nameEs: 'Obarrio',
    center: { lat: 9.000, lng: -79.520 },
    bounds: { north: 9.008, south: 8.992, east: -79.512, west: -79.528 },
    description: 'Major commercial area with offices and retail',
    descriptionEs: 'Zona comercial principal con oficinas y comercio',
    color: '#8b5cf6',
  },
  {
    id: 'punta-pacifica',
    name: 'Punta Pacifica',
    nameEs: 'Punta Pacifica',
    center: { lat: 9.004, lng: -79.504 },
    bounds: { north: 9.012, south: 8.996, east: -79.496, west: -79.512 },
    description: 'High-rise hotels and commercial towers',
    descriptionEs: 'Torres de hoteles y edificios comerciales',
    color: '#0ea5e9',
  },
  {
    id: 'area-bancaria',
    name: 'Area Bancaria',
    nameEs: 'Area Bancaria',
    center: { lat: 8.995, lng: -79.530 },
    bounds: { north: 9.003, south: 8.987, east: -79.522, west: -79.538 },
    description: 'Banking district with major financial institutions',
    descriptionEs: 'Distrito bancario con instituciones financieras principales',
    color: '#f59e0b',
  },
  {
    id: 'marbella',
    name: 'Marbella',
    nameEs: 'Marbella',
    center: { lat: 8.988, lng: -79.520 },
    bounds: { north: 8.996, south: 8.980, east: -79.512, west: -79.528 },
    description: 'Mixed commercial and hospitality zone',
    descriptionEs: 'Zona mixta comercial y hotelera',
    color: '#22c55e',
  },
  {
    id: 'san-francisco',
    name: 'San Francisco',
    nameEs: 'San Francisco',
    center: { lat: 8.998, lng: -79.505 },
    bounds: { north: 9.006, south: 8.990, east: -79.497, west: -79.513 },
    description: 'Commercial and residential mixed zone',
    descriptionEs: 'Zona mixta comercial y residencial',
    color: '#ec4899',
  },
  {
    id: 'parque-lefevre',
    name: 'Parque Lefevre',
    nameEs: 'Parque Lefevre',
    center: { lat: 9.018, lng: -79.485 },
    bounds: { north: 9.026, south: 9.010, east: -79.477, west: -79.493 },
    description: 'Industrial and warehouse district',
    descriptionEs: 'Distrito industrial y de almacenes',
    color: '#f97316',
  },
  {
    id: 'via-espana',
    name: 'Via Espana',
    nameEs: 'Via Espana',
    center: { lat: 8.998, lng: -79.525 },
    bounds: { north: 9.004, south: 8.992, east: -79.515, west: -79.535 },
    description: 'Main commercial corridor with retail and offices',
    descriptionEs: 'Corredor comercial principal con comercio y oficinas',
    color: '#6366f1',
  },

  // === Beach & Tourism Zones ===
  {
    id: 'playa-venao',
    name: 'Playa Venao',
    nameEs: 'Playa Venao',
    center: { lat: 7.430, lng: -80.161 },
    bounds: { north: 7.445, south: 7.415, east: -80.145, west: -80.177 },
    description: 'Surf and beach tourism area with hotels and hostels',
    descriptionEs: 'Zona turistica de surf y playa con hoteles y hostales',
    color: '#06b6d4',
  },
  {
    id: 'pedasi',
    name: 'Pedasi',
    nameEs: 'Pedasi',
    center: { lat: 7.527, lng: -80.027 },
    bounds: { north: 7.540, south: 7.514, east: -80.014, west: -80.040 },
    description: 'Small coastal town with growing tourism infrastructure',
    descriptionEs: 'Pueblo costero con infraestructura turistica en crecimiento',
    color: '#14b8a6',
  },
  {
    id: 'las-canas',
    name: 'Las Canas',
    nameEs: 'Las Canas',
    center: { lat: 7.45, lng: -80.10 },
    bounds: { north: 7.465, south: 7.435, east: -80.085, west: -80.115 },
    description: 'Rural area near beaches with farm and tourism buildings',
    descriptionEs: 'Area rural cerca de playas con fincas y edificios turisticos',
    color: '#84cc16',
  },
  {
    id: 'coronado',
    name: 'Coronado',
    nameEs: 'Coronado',
    center: { lat: 8.548, lng: -79.945 },
    bounds: { north: 8.560, south: 8.536, east: -79.930, west: -79.960 },
    description: 'Popular beach resort area with large commercial complexes',
    descriptionEs: 'Zona de resort de playa popular con grandes complejos comerciales',
    color: '#eab308',
  },
];

export function getZoneById(id: string): LeadZone | undefined {
  return PANAMA_ZONES.find(z => z.id === id);
}

export function getZoneForCoordinates(lat: number, lng: number): LeadZone | null {
  for (const zone of PANAMA_ZONES) {
    if (
      lat >= zone.bounds.south && lat <= zone.bounds.north &&
      lng >= zone.bounds.west && lng <= zone.bounds.east
    ) {
      return zone;
    }
  }
  return null;
}
