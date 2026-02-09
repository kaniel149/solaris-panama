// Owner Research Service — Building-specific lookup using OSM ID + Nominatim
// Queries the EXACT building clicked, not just a radius search

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
  googleMapsUrl: string;
  googleSearchUrl: string;
}

export interface NearbyBusiness {
  name: string;
  type: string;
  phone?: string;
  website?: string;
  email?: string;
  distance: number;
  osmTags?: Record<string, string>;
}

export interface ResearchRequest {
  buildingName: string;
  lat: number;
  lng: number;
  osmId: number;
  area: number;
}

// ===== Validation =====

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/[^\d]/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

function isValidEmail(email: string): boolean {
  if (!email || !email.includes('@')) return false;
  const lower = email.toLowerCase();
  const blacklist = ['example.com', 'test.com', 'email.com', 'domain.com', 'sentry.io', 'noreply', 'no-reply', 'localhost'];
  return !blacklist.some(b => lower.includes(b));
}

function isValidSocialUrl(url: string, platform: 'facebook' | 'instagram' | 'linkedin'): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
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

// ===== Nominatim Reverse Geocoding =====

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
  };
  name?: string;
  extratags?: Record<string, string>;
}

async function reverseGeocodeBuilding(lat: number, lng: number): Promise<NominatimReverseResult | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=19&addressdetails=1&extratags=1`,
      { headers: { 'User-Agent': 'SolarisPanama/1.0' } }
    );
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

// ===== Overpass: Lookup specific building + its contents =====

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/**
 * Query the specific building by OSM ID + any POIs that are inside/near it.
 * This is much more accurate than a generic radius search.
 */
async function lookupBuildingAndContents(osmId: number, lat: number, lng: number): Promise<{
  buildingTags: Record<string, string> | null;
  containedPOIs: OverpassElement[];
}> {
  // Query:
  // 1. The building itself (way or relation) for its tags
  // 2. Nodes inside that building's polygon (shops, offices inside)
  // 3. Small radius (25m) for adjacent POIs
  const query = `[out:json][timeout:10];
(
  way(${osmId});
  relation(${osmId});
)->.building;
.building out tags;
(
  node(w.building)["name"];
  node(around.building:5)["name"];
  node["name"]["shop"](around:25,${lat},${lng});
  node["name"]["office"](around:25,${lat},${lng});
  node["name"]["amenity"](around:25,${lat},${lng});
  node["name"]["company"](around:25,${lat},${lng});
);
out center;`;

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!response.ok) return { buildingTags: null, containedPOIs: [] };
    const data = await response.json();
    const elements: OverpassElement[] = data.elements || [];

    // First element matching our OSM ID is the building itself
    let buildingTags: Record<string, string> | null = null;
    const pois: OverpassElement[] = [];

    for (const el of elements) {
      if ((el.type === 'way' || el.type === 'relation') && el.id === osmId) {
        buildingTags = el.tags || null;
      } else if (el.tags?.name) {
        pois.push(el);
      }
    }

    return { buildingTags, containedPOIs: pois };
  } catch {
    return { buildingTags: null, containedPOIs: [] };
  }
}

// ===== Contact Extraction from OSM Tags =====

function extractContactFromTags(tags: Record<string, string>): {
  phone?: string;
  email?: string;
  website?: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
} {
  const result: ReturnType<typeof extractContactFromTags> = {};

  const phone = tags.phone || tags['contact:phone'];
  if (phone && isValidPhone(phone)) result.phone = phone;

  const email = tags.email || tags['contact:email'];
  if (email && isValidEmail(email)) result.email = email;

  const website = tags.website || tags['contact:website'];
  if (website && website.includes('.')) result.website = website;

  const fb = tags['contact:facebook'] || tags.facebook;
  if (fb && isValidSocialUrl(fb, 'facebook')) result.facebook = fb.startsWith('http') ? fb : `https://${fb}`;

  const ig = tags['contact:instagram'] || tags.instagram;
  if (ig && isValidSocialUrl(ig, 'instagram')) result.instagram = ig.startsWith('http') ? ig : `https://${ig}`;

  const li = tags['contact:linkedin'] || tags.linkedin;
  if (li && isValidSocialUrl(li, 'linkedin')) result.linkedin = li.startsWith('http') ? li : `https://${li}`;

  return result;
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
  if (tags.office) return `office (${tags.office.replace(/_/g, ' ')})`;
  if (tags.amenity) return tags.amenity.replace(/_/g, ' ');
  if (tags.company) return 'company';
  return 'business';
}

// ===== Main Research Function =====

/**
 * Research building owner by its specific OSM ID.
 * Queries the exact building + POIs inside/adjacent to it.
 */
export async function researchOwner(req: ResearchRequest): Promise<OwnerResearchResult> {
  const { buildingName, lat, lng, osmId } = req;

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
      buildingName.startsWith('Building ') ? `${lat.toFixed(4)},${lng.toFixed(4)} Panama` : `${buildingName} Panama`
    )}`,
  };

  // Run both lookups in parallel
  const [nominatimResult, overpassResult] = await Promise.all([
    reverseGeocodeBuilding(lat, lng),
    lookupBuildingAndContents(osmId, lat, lng),
  ]);

  // 1. Nominatim — address
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
    result.sources.push('OpenStreetMap');

    // If Nominatim found a named place at exact coordinates
    if (nominatimResult.name && nominatimResult.name !== addr.road) {
      result.ownerName = nominatimResult.name;
      result.googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${nominatimResult.name} Panama`)}`;
    }

    // Extratags from the Nominatim result itself
    if (nominatimResult.extratags) {
      const contact = extractContactFromTags(nominatimResult.extratags);
      if (contact.phone) result.phone = contact.phone;
      if (contact.email) result.email = contact.email;
      if (contact.website) result.website = contact.website;
    }
  }

  // 2. Building's own OSM tags — this is the KEY improvement
  if (overpassResult.buildingTags) {
    const tags = overpassResult.buildingTags;

    // Building name
    const bName = tags.name || tags['name:es'] || tags['name:en'];
    if (bName && !result.ownerName) {
      result.ownerName = bName;
      result.googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${bName} Panama`)}`;
    }

    // Operator (often the building owner/manager)
    const operator = tags.operator || tags['operator:name'];
    if (operator && !result.ownerName) {
      result.ownerName = operator;
    }

    // Contact info directly on the building
    const contact = extractContactFromTags(tags);
    if (contact.phone && !result.phone) result.phone = contact.phone;
    if (contact.email && !result.email) result.email = contact.email;
    if (contact.website && !result.website) result.website = contact.website;

    // Social media from building tags
    const social: Record<string, string> = {};
    if (contact.facebook) social.facebook = contact.facebook;
    if (contact.instagram) social.instagram = contact.instagram;
    if (contact.linkedin) social.linkedin = contact.linkedin;
    if (Object.keys(social).length > 0 && !result.socialMedia) {
      result.socialMedia = social as OwnerResearchResult['socialMedia'];
    }

    // Description or note
    if (tags.description && !result.ownerName) {
      result.ownerName = tags.description;
    }
  }

  // 3. POIs inside/adjacent to the building
  if (overpassResult.containedPOIs.length > 0) {
    const seen = new Set<string>();

    for (const poi of overpassResult.containedPOIs) {
      const tags = poi.tags || {};
      const name = tags.name || tags['name:es'] || tags['name:en'];
      if (!name) continue;
      if (seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());

      const poiLat = poi.lat ?? poi.center?.lat ?? lat;
      const poiLon = poi.lon ?? poi.center?.lon ?? lng;
      const distance = Math.round(haversineDistance(lat, lng, poiLat, poiLon));

      const contact = extractContactFromTags(tags);

      result.nearbyBusinesses.push({
        name,
        type: categorizePOI(tags),
        distance,
        phone: contact.phone,
        website: contact.website,
        email: contact.email,
        osmTags: tags,
      });

      // Only use as building owner if truly inside (< 10m)
      if (distance < 10) {
        if (!result.ownerName) {
          result.ownerName = name;
          result.googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${name} Panama`)}`;
        }
        if (!result.phone && contact.phone) result.phone = contact.phone;
        if (!result.email && contact.email) result.email = contact.email;
        if (!result.website && contact.website) result.website = contact.website;
      }
    }

    result.nearbyBusinesses.sort((a, b) => a.distance - b.distance);
  }

  return result;
}

// ===== Utility Functions =====

export function buildWhatsAppUrl(phone: string, businessName?: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  const fullNumber = digits.startsWith('507') ? digits : `507${digits}`;
  const message = businessName
    ? `Hola, me comunico con ${businessName} respecto a una oportunidad de energía solar para su edificio.`
    : 'Hola, me gustaría hablar sobre una oportunidad de energía solar para su edificio.';
  return `https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`;
}

export function buildCallUrl(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  const fullNumber = digits.startsWith('507') ? digits : `507${digits}`;
  return `tel:+${fullNumber}`;
}

export function formatPanamaPhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  const local = digits.startsWith('507') ? digits.slice(3) : digits;
  if (local.length === 8) return `+507 ${local.slice(0, 4)}-${local.slice(4)}`;
  if (local.length === 7) return `+507 ${local.slice(0, 3)}-${local.slice(3)}`;
  return `+507 ${local}`;
}

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
