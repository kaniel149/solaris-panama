// Owner Research Service — Client-side approach using Nominatim + Overpass
// Accuracy-focused: only shows verified contact info, separates building occupant from nearby businesses

export interface OwnerResearchResult {
  // Building-specific info (only from POIs AT the building, <15m)
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
  // Nearby businesses (separate from building owner)
  nearbyBusinesses: NearbyBusiness[];
  // Quick research links
  googleMapsUrl: string;
  googleSearchUrl: string;
}

export interface NearbyBusiness {
  name: string;
  type: string;
  phone?: string;
  website?: string;
  email?: string;
  distance: number; // meters
  address?: string;
  osmTags?: Record<string, string>;
}

// ===== Validation Helpers =====

/** Check if a string looks like a real phone number (7-15 digits, optionally with + prefix) */
function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/[^\d]/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

/** Check if email looks real (not generic/system/spam) */
function isValidEmail(email: string): boolean {
  if (!email || !email.includes('@')) return false;
  const lower = email.toLowerCase();
  // Filter out common fake/system emails
  const blacklist = ['example.com', 'test.com', 'email.com', 'domain.com', 'sentry.io', 'noreply', 'no-reply', 'donotreply', 'localhost'];
  return !blacklist.some(b => lower.includes(b));
}

/** Validate a social media URL actually looks like a real profile */
function isValidSocialUrl(url: string, platform: 'facebook' | 'instagram' | 'linkedin'): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  // Must be an actual profile URL, not just the platform homepage
  switch (platform) {
    case 'facebook':
      return /facebook\.com\/[a-zA-Z0-9._-]{2,}/.test(lower) && !lower.endsWith('facebook.com/');
    case 'instagram':
      return /instagram\.com\/[a-zA-Z0-9._]{2,}/.test(lower) && !lower.endsWith('instagram.com/');
    case 'linkedin':
      return /linkedin\.com\/(company|in)\/[a-zA-Z0-9._-]{2,}/.test(lower);
    default:
      return false;
  }
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
  extratags?: Record<string, string>;
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

async function searchNearbyPOIs(lat: number, lng: number, radiusM = 60): Promise<OverpassPOI[]> {
  // Search for named businesses near the building
  // Smaller radius (60m) to reduce noise, focus on actual building occupants
  const query = `[out:json][timeout:10];
(
  node["name"]["shop"](around:${radiusM},${lat},${lng});
  node["name"]["office"](around:${radiusM},${lat},${lng});
  node["name"]["amenity"](around:${radiusM},${lat},${lng});
  node["name"]["company"](around:${radiusM},${lat},${lng});
  way["name"]["building"](around:${radiusM},${lat},${lng});
  way["name"]["shop"](around:${radiusM},${lat},${lng});
  way["name"]["office"](around:${radiusM},${lat},${lng});
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
  const R = 6371000;
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
  if (tags.shop) return tags.shop.replace(/_/g, ' ');
  if (tags.office) return `Office (${tags.office.replace(/_/g, ' ')})`;
  if (tags.amenity) return tags.amenity.replace(/_/g, ' ');
  if (tags.company) return 'Company';
  if (tags.building === 'commercial') return 'Commercial';
  if (tags.building === 'industrial') return 'Industrial';
  if (tags.building === 'retail') return 'Retail';
  return 'Business';
}

/** Extract validated contact info from OSM tags */
function extractContactFromTags(tags: Record<string, string>): {
  phone?: string;
  email?: string;
  website?: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
} {
  const result: ReturnType<typeof extractContactFromTags> = {};

  // Phone — check multiple tag formats
  const phone = tags.phone || tags['contact:phone'];
  if (phone && isValidPhone(phone)) {
    result.phone = phone;
  }

  // Email
  const email = tags.email || tags['contact:email'];
  if (email && isValidEmail(email)) {
    result.email = email;
  }

  // Website
  const website = tags.website || tags['contact:website'];
  if (website && website.includes('.')) {
    result.website = website;
  }

  // Social — validate each one
  const fb = tags['contact:facebook'] || tags.facebook;
  if (fb && isValidSocialUrl(fb, 'facebook')) {
    result.facebook = fb.startsWith('http') ? fb : `https://${fb}`;
  }

  const ig = tags['contact:instagram'] || tags.instagram;
  if (ig && isValidSocialUrl(ig, 'instagram')) {
    result.instagram = ig.startsWith('http') ? ig : `https://${ig}`;
  }

  const li = tags['contact:linkedin'] || tags.linkedin;
  if (li && isValidSocialUrl(li, 'linkedin')) {
    result.linkedin = li.startsWith('http') ? li : `https://${li}`;
  }

  return result;
}

// ===== Main Research Function =====

/** Max distance to consider a POI as "at this building" (meters) */
const BUILDING_PROXIMITY_M = 15;

/**
 * Research building owner — uses free services (Nominatim + Overpass).
 * Accuracy-focused: separates "at building" from "nearby" info.
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
    googleMapsUrl: `https://www.google.com/maps/@${lat},${lng},19z`,
    googleSearchUrl: `https://www.google.com/search?q=${encodeURIComponent(
      buildingName !== `Building ${buildingName.split(' ').pop()}`
        ? `${buildingName} Panama`
        : `building ${lat.toFixed(4)} ${lng.toFixed(4)} Panama`
    )}`,
  };

  // Run lookups in parallel
  const [nominatimResult, overpassPOIs] = await Promise.all([
    reverseGeocodeBuilding(lat, lng),
    searchNearbyPOIs(lat, lng, 60),
  ]);

  // 1. Nominatim reverse geocoding — gives us address + sometimes the building name
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

    // If Nominatim identified a named place at these coordinates
    if (nominatimResult.name && nominatimResult.name !== addr.road) {
      result.ownerName = nominatimResult.name;

      // Update Google Search URL with the actual name
      result.googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(
        `${nominatimResult.name} Panama`
      )}`;
    }

    // Check extratags for contact info on the building itself
    if (nominatimResult.extratags) {
      const contact = extractContactFromTags(nominatimResult.extratags);
      if (contact.phone) result.phone = contact.phone;
      if (contact.email) result.email = contact.email;
      if (contact.website) result.website = contact.website;

      const social: Record<string, string> = {};
      if (contact.facebook) social.facebook = contact.facebook;
      if (contact.instagram) social.instagram = contact.instagram;
      if (contact.linkedin) social.linkedin = contact.linkedin;
      if (Object.keys(social).length > 0) {
        result.socialMedia = social as OwnerResearchResult['socialMedia'];
      }
    }

    result.sources.push('OpenStreetMap');
  }

  // 2. Overpass — nearby POIs categorized by distance
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

      const contact = extractContactFromTags(tags);

      const business: NearbyBusiness = {
        name,
        type: categorizePOI(tags),
        distance,
        phone: contact.phone,
        website: contact.website,
        email: contact.email,
        address: tags['addr:street']
          ? `${tags['addr:street']}${tags['addr:housenumber'] ? ' ' + tags['addr:housenumber'] : ''}`
          : undefined,
        osmTags: tags,
      };

      result.nearbyBusinesses.push(business);

      // ONLY assign to main result if the POI is directly AT the building
      if (distance <= BUILDING_PROXIMITY_M) {
        if (!result.ownerName) {
          result.ownerName = name;
          result.googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${name} Panama`)}`;
        }
        if (!result.phone && contact.phone) result.phone = contact.phone;
        if (!result.email && contact.email) result.email = contact.email;
        if (!result.website && contact.website) result.website = contact.website;

        // Social media — only from the building's own POI
        if (!result.socialMedia) {
          const social: Record<string, string> = {};
          if (contact.facebook) social.facebook = contact.facebook;
          if (contact.instagram) social.instagram = contact.instagram;
          if (contact.linkedin) social.linkedin = contact.linkedin;
          if (Object.keys(social).length > 0) {
            result.socialMedia = social as OwnerResearchResult['socialMedia'];
          }
        }
      }
    }

    // Sort by distance
    result.nearbyBusinesses.sort((a, b) => a.distance - b.distance);
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
