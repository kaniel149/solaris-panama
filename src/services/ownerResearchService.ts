// Owner Research Service — Client-side approach using Nominatim + Overpass + optional API
// Works fully without API keys by using free OpenStreetMap services

export interface OwnerResearchResult {
  ownerName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  socialMedia: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  } | null;
  sources: string[];
  nearbyBusinesses: NearbyBusiness[];
}

export interface NearbyBusiness {
  name: string;
  type: string;
  phone?: string;
  website?: string;
  email?: string;
  distance: number; // meters
  address?: string;
}

// ===== Nominatim Reverse Geocoding (free, CORS-friendly) =====

interface NominatimReverseResult {
  display_name: string;
  address: {
    road?: string;
    house_number?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
    building?: string;
    office?: string;
    shop?: string;
    amenity?: string;
  };
  name?: string;
  type?: string;
}

async function reverseGeocodeBuilding(lat: number, lng: number): Promise<NominatimReverseResult | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1&extratags=1&namedetails=1`,
      { headers: { 'User-Agent': 'SolarisPanama/1.0' } }
    );
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

// ===== Overpass Nearby POI Search (free, CORS-friendly) =====

interface OverpassPOI {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

async function searchNearbyPOIs(lat: number, lng: number, radiusM = 80): Promise<OverpassPOI[]> {
  // Search for named businesses/shops/offices/amenities near the building
  const query = `[out:json][timeout:10];
(
  node["name"](around:${radiusM},${lat},${lng});
  way["name"]["building"](around:${radiusM},${lat},${lng});
  node["shop"](around:${radiusM},${lat},${lng});
  node["office"](around:${radiusM},${lat},${lng});
  node["amenity"](around:${radiusM},${lat},${lng});
  node["company"](around:${radiusM},${lat},${lng});
);
out center;`;

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.elements || [];
  } catch {
    return [];
  }
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function categorizePOI(tags: Record<string, string>): string {
  if (tags.shop) return `Shop (${tags.shop})`;
  if (tags.office) return `Office (${tags.office})`;
  if (tags.amenity) return `Amenity (${tags.amenity})`;
  if (tags.company) return 'Company';
  if (tags.building === 'commercial') return 'Commercial';
  if (tags.building === 'industrial') return 'Industrial';
  if (tags.building === 'retail') return 'Retail';
  return tags.building || 'Business';
}

// ===== Server-side API attempt =====

async function tryServerResearch(
  query: string,
  lat: number,
  lng: number
): Promise<Partial<OwnerResearchResult> | null> {
  try {
    const params = new URLSearchParams({
      action: 'owner-research',
      query: encodeURIComponent(query),
      lat: lat.toString(),
      lng: lng.toString(),
    });

    const response = await fetch(`/api/roof-scan?${params}`);
    if (!response.ok) return null;

    const data = await response.json();
    // Only return if we got meaningful data
    if (data.ownerName || data.phone || data.email || data.website) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

// ===== Main Research Function =====

/**
 * Research building owner — uses free services (Nominatim + Overpass) + optional server API.
 * Always returns a result with at least an address.
 */
export async function researchOwner(
  buildingName: string,
  lat: number,
  lng: number
): Promise<OwnerResearchResult> {
  const result: OwnerResearchResult = {
    ownerName: null,
    email: null,
    phone: null,
    website: null,
    address: null,
    socialMedia: null,
    sources: [],
    nearbyBusinesses: [],
  };

  // Run all lookups in parallel
  const [nominatimResult, overpassPOIs, serverResult] = await Promise.all([
    reverseGeocodeBuilding(lat, lng),
    searchNearbyPOIs(lat, lng, 80),
    tryServerResearch(buildingName, lat, lng),
  ]);

  // 1. Nominatim reverse geocoding — always gives us an address
  if (nominatimResult) {
    const addr = nominatimResult.address;
    const parts: string[] = [];
    if (addr.road) {
      parts.push(addr.house_number ? `${addr.road} ${addr.house_number}` : addr.road);
    }
    if (addr.neighbourhood) parts.push(addr.neighbourhood);
    if (addr.suburb) parts.push(addr.suburb);
    if (addr.city) parts.push(addr.city);

    result.address = parts.join(', ') || nominatimResult.display_name;

    // If Nominatim found a named entity at this location
    if (nominatimResult.name && nominatimResult.name !== addr.road) {
      result.ownerName = nominatimResult.name;
    }

    result.sources.push('OpenStreetMap');
  }

  // 2. Overpass — nearby businesses with contact info
  if (overpassPOIs.length > 0) {
    const seen = new Set<string>();

    for (const poi of overpassPOIs) {
      const tags = poi.tags || {};
      const name = tags.name || tags['name:es'] || tags['name:en'];
      if (!name) continue;
      if (seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());

      const poiLat = poi.lat ?? poi.center?.lat ?? lat;
      const poiLon = poi.lon ?? poi.center?.lon ?? lng;
      const distance = Math.round(haversineDistance(lat, lng, poiLat, poiLon));

      const business: NearbyBusiness = {
        name,
        type: categorizePOI(tags),
        distance,
        phone: tags.phone || tags['contact:phone'] || undefined,
        website: tags.website || tags['contact:website'] || undefined,
        email: tags.email || tags['contact:email'] || undefined,
        address: tags['addr:street']
          ? `${tags['addr:street']}${tags['addr:housenumber'] ? ' ' + tags['addr:housenumber'] : ''}`
          : undefined,
      };

      result.nearbyBusinesses.push(business);

      // Use the closest/first business as primary owner if we don't have one
      if (!result.ownerName && distance < 30) {
        result.ownerName = name;
      }
      if (!result.phone && business.phone) {
        result.phone = business.phone;
      }
      if (!result.email && business.email) {
        result.email = business.email;
      }
      if (!result.website && business.website) {
        result.website = business.website;
      }
    }

    // Sort by distance
    result.nearbyBusinesses.sort((a, b) => a.distance - b.distance);

    if (result.nearbyBusinesses.length > 0 && !result.sources.includes('OpenStreetMap')) {
      result.sources.push('OpenStreetMap');
    }
  }

  // 3. Server API — enriches with Google Places + directory scraping
  if (serverResult) {
    if (serverResult.ownerName && !result.ownerName) {
      result.ownerName = serverResult.ownerName;
    }
    if (serverResult.phone && !result.phone) {
      result.phone = serverResult.phone;
    }
    if (serverResult.email && !result.email) {
      result.email = serverResult.email;
    }
    if (serverResult.website && !result.website) {
      result.website = serverResult.website;
    }
    if (serverResult.socialMedia) {
      result.socialMedia = {
        ...(result.socialMedia || {}),
        ...serverResult.socialMedia,
      };
    }
    if (serverResult.sources) {
      for (const src of serverResult.sources) {
        if (!result.sources.includes(src)) {
          result.sources.push(src);
        }
      }
    }
  }

  return result;
}

// ===== Utility Functions =====

/**
 * Build WhatsApp URL for Panama phone number
 */
export function buildWhatsAppUrl(
  phone: string,
  businessName?: string
): string {
  const digits = phone.replace(/[^\d]/g, '');
  const fullNumber = digits.startsWith('507') ? digits : `507${digits}`;

  const message = businessName
    ? `Hola, me comunico con ${businessName} respecto a una oportunidad de energía solar para su edificio.`
    : 'Hola, me gustaría hablar sobre una oportunidad de energía solar para su edificio.';

  return `https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`;
}

/**
 * Build phone call URL
 */
export function buildCallUrl(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  const fullNumber = digits.startsWith('507') ? digits : `507${digits}`;
  return `tel:+${fullNumber}`;
}

/**
 * Format phone number for display
 */
export function formatPanamaPhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  const local = digits.startsWith('507') ? digits.slice(3) : digits;

  if (local.length === 8) {
    return `+507 ${local.slice(0, 4)}-${local.slice(4)}`;
  }
  if (local.length === 7) {
    return `+507 ${local.slice(0, 3)}-${local.slice(3)}`;
  }
  return `+507 ${local}`;
}

/**
 * Merge enrichment data with owner research results
 */
export function mergeOwnerResearch(
  existing: {
    ownerName: string | null;
    email: string | null;
    phone: string | null;
    socialMedia: { facebook?: string; instagram?: string; linkedin?: string } | null;
  } | null,
  research: OwnerResearchResult
): {
  ownerName: string | null;
  email: string | null;
  phone: string | null;
  socialMedia: { facebook?: string; instagram?: string; linkedin?: string } | null;
} {
  return {
    ownerName: research.ownerName || existing?.ownerName || null,
    email: research.email || existing?.email || null,
    phone: research.phone || existing?.phone || null,
    socialMedia: {
      ...(existing?.socialMedia || {}),
      ...(research.socialMedia || {}),
    },
  };
}
