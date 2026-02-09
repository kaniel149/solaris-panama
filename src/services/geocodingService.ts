// Geocoding service using Nominatim (free, no API key needed)

export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
  type: string;
}

/**
 * Geocode an address to coordinates using Nominatim.
 * Biased toward Panama for better results.
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult> {
  const query = address.toLowerCase().includes('panama')
    ? address
    : `${address}, Panama`;
  const encoded = encodeURIComponent(query);
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=pa`,
    { headers: { 'User-Agent': 'SolarisPanama/1.0' } }
  );
  if (!response.ok) {
    throw new Error(`Geocoding failed: ${response.status}`);
  }
  const data = await response.json();
  if (!data.length) {
    throw new Error('Address not found. Try a more specific address in Panama.');
  }
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    displayName: data[0].display_name,
    type: data[0].type || 'unknown',
  };
}

/**
 * Search places with multiple results for autocomplete.
 * Returns up to 5 matches biased toward Panama.
 */
export async function searchPlaces(query: string): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 2) return [];
  const searchQuery = query.toLowerCase().includes('panama')
    ? query
    : `${query}, Panama`;
  const encoded = encodeURIComponent(searchQuery);
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=5&countrycodes=pa&addressdetails=1`,
    { headers: { 'User-Agent': 'SolarisPanama/1.0' } }
  );
  if (!response.ok) return [];
  const data = await response.json();
  return data.map((item: Record<string, unknown>) => ({
    lat: parseFloat(item.lat as string),
    lng: parseFloat(item.lon as string),
    displayName: item.display_name as string,
    type: (item.type as string) || 'unknown',
  }));
}

/**
 * Reverse geocode coordinates to an address string.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18`,
    { headers: { 'User-Agent': 'SolarisPanama/1.0' } }
  );
  if (!response.ok) {
    throw new Error(`Reverse geocoding failed: ${response.status}`);
  }
  const data = await response.json();
  return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}
