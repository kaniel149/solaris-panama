// Owner Research Service — Multi-source waterfall enrichment pipeline
// Queries OSM, Nominatim, Google Places, ANATI Cadastre, Panama Emprende,
// OpenCorporates, and optionally Apollo.io to build a comprehensive owner profile.

import {
  ResearchSource,
  type EnrichedOwnerResult,
  type EnrichmentSourceSummary,
  type NearbyBusinessResult,
  type ProgressStatus,
  type CadastreInfo,
  type BusinessLicense,
  type CorporateInfo,
} from '@/types/enrichment';
import { lookupParcel } from '@/services/cadastreService';
import { verifyBusiness, searchCompany, enrichWithApollo } from '@/services/businessRegistryService';

// ===== Legacy types (backward compatibility) =====

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

// ===== Overpass: Lookup specific building + contents =====

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

async function lookupBuildingAndContents(osmId: number, lat: number, lng: number): Promise<{
  buildingTags: Record<string, string> | null;
  containedPOIs: OverpassElement[];
}> {
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
  const result: {
    phone?: string;
    email?: string;
    website?: string;
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  } = {};

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

// ===== Google Places Nearby (via Vercel proxy) =====

interface PlacesResult {
  name: string;
  phone: string | null;
  website: string | null;
  address: string | null;
  types: string[];
  placeId: string | null;
}

async function fetchGooglePlacesNearby(lat: number, lng: number, radius = 50): Promise<PlacesResult[]> {
  try {
    const url = `/api/roof-scan?action=places-lookup&lat=${lat}&lng=${lng}&radius=${radius}`;
    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.json();
    const results = data.results || [];
    return results.map((p: Record<string, unknown>) => ({
      name: (p.name as string) || '',
      phone: (p.formatted_phone_number as string) || null,
      website: (p.website as string) || null,
      address: (p.vicinity as string) || (p.formatted_address as string) || null,
      types: (p.types as string[]) || [],
      placeId: (p.place_id as string) || null,
    }));
  } catch {
    return [];
  }
}

// ===== Confidence Scoring =====

function calculateConfidence(result: {
  cadastre: CadastreInfo | null;
  googlePlacesMatch: boolean;
  osmContactFound: boolean;
  businessLicense: BusinessLicense | null;
  corporateInfo: CorporateInfo | null;
  hasPhone: boolean;
  hasEmail: boolean;
  hasWebsite: boolean;
}): number {
  let score = 0;
  if (result.cadastre) score += 30;
  if (result.googlePlacesMatch) score += 25;
  if (result.osmContactFound) score += 15;
  if (result.businessLicense) score += 20;
  if (result.corporateInfo) score += 10;
  if (result.hasPhone) score += 10;
  if (result.hasEmail) score += 5;
  if (result.hasWebsite) score += 5;
  return Math.min(score, 100);
}

// ===== Extract domain from a URL =====

function extractDomain(url: string): string | null {
  try {
    const full = url.startsWith('http') ? url : `https://${url}`;
    const hostname = new URL(full).hostname;
    // Skip generic domains
    if (['google.com', 'facebook.com', 'instagram.com', 'linkedin.com', 'twitter.com'].includes(hostname)) {
      return null;
    }
    return hostname;
  } catch {
    return null;
  }
}

// ===== Main Waterfall Pipeline =====

/**
 * Research building owner using a multi-source waterfall enrichment pipeline.
 *
 * **Pipeline:**
 * 1. Parallel: Nominatim + Overpass + Google Places Nearby + ANATI Cadastre
 * 2. Merge results from step 1
 * 3. If business name found: Panama Emprende + OpenCorporates (parallel)
 * 4. If website domain found: Apollo.io enrichment (optional)
 * 5. Calculate confidence score + build final result
 *
 * @param request - Building coordinates, OSM ID, and optional name
 * @returns Enriched owner result with all source data
 */
export async function researchBuildingOwner(request: {
  lat: number;
  lng: number;
  osmId: number;
  buildingName?: string;
  onProgress?: (step: string, status: ProgressStatus) => void;
}): Promise<EnrichedOwnerResult> {
  const { lat, lng, osmId, buildingName, onProgress } = request;
  const progress = onProgress || (() => {});

  // Accumulate merged fields
  let ownerName: string | null = null;
  let email: string | null = null;
  let phone: string | null = null;
  let website: string | null = null;
  let address: string | null = null;
  const socialMedia = { facebook: null as string | null, instagram: null as string | null, linkedin: null as string | null };

  let cadastre: CadastreInfo | null = null;
  let businessLicense: BusinessLicense | null = null;
  let corporateInfo: CorporateInfo | null = null;
  const nearbyBusinesses: NearbyBusinessResult[] = [];
  const enrichmentSources: EnrichmentSourceSummary[] = [];
  let osmContactFound = false;
  let googlePlacesMatch = false;

  // ===== STEP 1: Parallel initial queries =====

  progress('OpenStreetMap', 'loading');
  progress('Nominatim', 'loading');
  progress('Google Places', 'loading');
  progress('ANATI Cadastre', 'loading');

  const [nominatimResult, overpassResult, placesResults, cadastreResult] = await Promise.all([
    reverseGeocodeBuilding(lat, lng).catch(() => null),
    lookupBuildingAndContents(osmId, lat, lng).catch(() => ({ buildingTags: null, containedPOIs: [] as OverpassElement[] })),
    fetchGooglePlacesNearby(lat, lng, 50).catch(() => [] as PlacesResult[]),
    lookupParcel(lat, lng).catch(() => null),
  ]);

  // --- Process Nominatim ---
  const nominatimDataPoints: string[] = [];
  if (nominatimResult) {
    const addr = nominatimResult.address;
    const parts: string[] = [];
    if (addr.road) {
      parts.push(addr.house_number ? `${addr.road} ${addr.house_number}` : addr.road);
    }
    if (addr.neighbourhood) parts.push(addr.neighbourhood);
    if (addr.suburb) parts.push(addr.suburb);
    if (addr.city) parts.push(addr.city);

    address = parts.join(', ') || nominatimResult.display_name;
    nominatimDataPoints.push('address');

    if (nominatimResult.name && nominatimResult.name !== addr.road) {
      ownerName = nominatimResult.name;
      nominatimDataPoints.push('name');
    }

    if (nominatimResult.extratags) {
      const contact = extractContactFromTags(nominatimResult.extratags);
      if (contact.phone) { phone = contact.phone; nominatimDataPoints.push('phone'); }
      if (contact.email) { email = contact.email; nominatimDataPoints.push('email'); }
      if (contact.website) { website = contact.website; nominatimDataPoints.push('website'); }
    }
  }
  progress('Nominatim', nominatimResult ? 'done' : 'error');
  enrichmentSources.push({
    source: ResearchSource.NOMINATIM,
    found: nominatimDataPoints.length > 0,
    dataPoints: nominatimDataPoints,
    confidence: nominatimDataPoints.length > 0 ? 15 : 0,
  });

  // --- Process Overpass (OSM building tags + POIs) ---
  const osmDataPoints: string[] = [];
  if (overpassResult.buildingTags) {
    const tags = overpassResult.buildingTags;
    const bName = tags.name || tags['name:es'] || tags['name:en'];
    if (bName && !ownerName) {
      ownerName = bName;
      osmDataPoints.push('name');
    }

    const operator = tags.operator || tags['operator:name'];
    if (operator && !ownerName) {
      ownerName = operator;
      osmDataPoints.push('operator');
    }

    const contact = extractContactFromTags(tags);
    if (contact.phone && !phone) { phone = contact.phone; osmDataPoints.push('phone'); }
    if (contact.email && !email) { email = contact.email; osmDataPoints.push('email'); }
    if (contact.website && !website) { website = contact.website; osmDataPoints.push('website'); }
    if (contact.facebook) { socialMedia.facebook = contact.facebook; osmDataPoints.push('facebook'); }
    if (contact.instagram) { socialMedia.instagram = contact.instagram; osmDataPoints.push('instagram'); }
    if (contact.linkedin) { socialMedia.linkedin = contact.linkedin; osmDataPoints.push('linkedin'); }

    if (tags.description && !ownerName) {
      ownerName = tags.description;
      osmDataPoints.push('description');
    }

    osmContactFound = osmDataPoints.length > 0;
  }

  // Process contained POIs
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
      nearbyBusinesses.push({
        name,
        type: categorizePOI(tags),
        distance,
        phone: contact.phone,
        website: contact.website,
      });

      // Use as building owner if truly inside (< 10m)
      if (distance < 10) {
        if (!ownerName) ownerName = name;
        if (!phone && contact.phone) phone = contact.phone;
        if (!email && contact.email) email = contact.email;
        if (!website && contact.website) website = contact.website;
        osmDataPoints.push('nearby_poi');
      }
    }
    nearbyBusinesses.sort((a, b) => a.distance - b.distance);
  }
  progress('OpenStreetMap', overpassResult.buildingTags || overpassResult.containedPOIs.length > 0 ? 'done' : 'error');
  enrichmentSources.push({
    source: ResearchSource.OSM,
    found: osmDataPoints.length > 0,
    dataPoints: osmDataPoints,
    confidence: osmContactFound ? 15 : 0,
  });

  // --- Process Google Places ---
  const placesDataPoints: string[] = [];
  if (placesResults.length > 0) {
    const closestPlace = placesResults[0];
    googlePlacesMatch = true;
    if (closestPlace.name && !ownerName) {
      ownerName = closestPlace.name;
      placesDataPoints.push('name');
    }
    if (closestPlace.phone && !phone) {
      phone = closestPlace.phone;
      placesDataPoints.push('phone');
    }
    if (closestPlace.website && !website) {
      website = closestPlace.website;
      placesDataPoints.push('website');
    }
    if (closestPlace.address && !address) {
      address = closestPlace.address;
      placesDataPoints.push('address');
    }

    // Add all Google Places results as nearby businesses
    for (const place of placesResults) {
      if (!nearbyBusinesses.some(b => b.name.toLowerCase() === place.name.toLowerCase())) {
        nearbyBusinesses.push({
          name: place.name,
          type: place.types[0]?.replace(/_/g, ' ') || 'business',
          distance: 0, // Google Places doesn't provide distance
          phone: place.phone || undefined,
          website: place.website || undefined,
          placeId: place.placeId || undefined,
        });
      }
    }
  }
  progress('Google Places', placesResults.length > 0 ? 'done' : 'error');
  enrichmentSources.push({
    source: ResearchSource.GOOGLE_PLACES,
    found: placesDataPoints.length > 0,
    dataPoints: placesDataPoints,
    confidence: googlePlacesMatch ? 25 : 0,
  });

  // --- Process Cadastre ---
  const cadastreDataPoints: string[] = [];
  if (cadastreResult) {
    cadastre = cadastreResult;
    cadastreDataPoints.push('finca_number');
    if (cadastreResult.parcelArea) cadastreDataPoints.push('parcel_area');
    if (cadastreResult.landUse && cadastreResult.landUse !== 'unknown') cadastreDataPoints.push('land_use');
    if (cadastreResult.assessedValue) cadastreDataPoints.push('assessed_value');
    if (cadastreResult.parcelBoundary) cadastreDataPoints.push('boundary');
  }
  progress('ANATI Cadastre', cadastreResult ? 'done' : 'error');
  enrichmentSources.push({
    source: ResearchSource.ANATI_CADASTRE,
    found: cadastreDataPoints.length > 0,
    dataPoints: cadastreDataPoints,
    confidence: cadastreResult ? 30 : 0,
  });

  // ===== STEP 2: Conditional business registry queries =====
  // Only run if we found a business name from step 1

  const businessName = ownerName || buildingName;
  if (businessName && !businessName.startsWith('Building ')) {
    progress('Panama Emprende', 'loading');
    progress('OpenCorporates', 'loading');

    const [emprendeResult, corporateResult] = await Promise.all([
      verifyBusiness(businessName).catch(() => null),
      searchCompany(businessName).catch(() => null),
    ]);

    // Process Panama Emprende
    const emprendeDataPoints: string[] = [];
    if (emprendeResult) {
      businessLicense = emprendeResult;
      emprendeDataPoints.push('aviso_number');
      if (emprendeResult.legalName) emprendeDataPoints.push('legal_name');
      if (emprendeResult.status !== 'unknown') emprendeDataPoints.push('status');
      if (emprendeResult.activityDescription) emprendeDataPoints.push('activity');
      // Use legal name if we only had a commercial name
      if (emprendeResult.legalName && !ownerName) {
        ownerName = emprendeResult.legalName;
      }
    }
    progress('Panama Emprende', emprendeResult ? 'done' : 'error');
    enrichmentSources.push({
      source: ResearchSource.PANAMA_EMPRENDE,
      found: emprendeDataPoints.length > 0,
      dataPoints: emprendeDataPoints,
      confidence: emprendeResult ? 20 : 0,
    });

    // Process OpenCorporates
    const corporateDataPoints: string[] = [];
    if (corporateResult) {
      corporateInfo = corporateResult;
      corporateDataPoints.push('company_number');
      if (corporateResult.registeredAddress) corporateDataPoints.push('address');
      if (corporateResult.officers.length > 0) corporateDataPoints.push('officers');
      if (corporateResult.status) corporateDataPoints.push('status');
    }
    progress('OpenCorporates', corporateResult ? 'done' : 'error');
    enrichmentSources.push({
      source: ResearchSource.OPENCORPORATES,
      found: corporateDataPoints.length > 0,
      dataPoints: corporateDataPoints,
      confidence: corporateResult ? 10 : 0,
    });
  }

  // ===== STEP 3: Optional Apollo.io enrichment =====
  // Only if we found a website domain

  const domain = website ? extractDomain(website) : null;
  if (domain) {
    progress('Apollo.io', 'loading');
    const apolloResult = await enrichWithApollo(domain).catch(() => null);

    const apolloDataPoints: string[] = [];
    if (apolloResult) {
      if (apolloResult.phone && !phone) { phone = apolloResult.phone; apolloDataPoints.push('phone'); }
      if (apolloResult.email && !email) { email = apolloResult.email; apolloDataPoints.push('email'); }
      if (apolloResult.linkedin && !socialMedia.linkedin) { socialMedia.linkedin = apolloResult.linkedin; apolloDataPoints.push('linkedin'); }
      if (apolloResult.industry) apolloDataPoints.push('industry');
    }
    progress('Apollo.io', apolloResult ? 'done' : 'error');
    enrichmentSources.push({
      source: ResearchSource.APOLLO,
      found: apolloDataPoints.length > 0,
      dataPoints: apolloDataPoints,
      confidence: apolloDataPoints.length > 0 ? 10 : 0,
    });
  }

  // ===== STEP 4: Build final result =====

  const confidenceScore = calculateConfidence({
    cadastre,
    googlePlacesMatch,
    osmContactFound,
    businessLicense,
    corporateInfo,
    hasPhone: !!phone,
    hasEmail: !!email,
    hasWebsite: !!website,
  });

  const searchName = ownerName || buildingName || `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${searchName} Panama`)}`;
  const googleMapsUrl = `https://www.google.com/maps/@${lat},${lng},19z`;
  const registroPublicoUrl = cadastre?.registroPublicoUrl || null;
  const whatsappUrl = phone ? buildWhatsAppUrl(phone, ownerName || undefined) : null;
  const callUrl = phone ? buildCallUrl(phone) : null;

  const totalSourcesQueried = enrichmentSources.length;
  const totalSourcesWithData = enrichmentSources.filter(s => s.found).length;

  return {
    ownerName,
    email,
    phone,
    website,
    address,
    socialMedia,
    cadastre,
    businessLicense,
    corporateInfo,
    nearbyBusinesses,
    confidenceScore,
    enrichmentSources,
    googleMapsUrl,
    googleSearchUrl,
    registroPublicoUrl,
    whatsappUrl,
    callUrl,
    researchedAt: new Date().toISOString(),
    totalSourcesQueried,
    totalSourcesWithData,
  };
}

// ===== Legacy wrapper (backward compatibility) =====

/**
 * Legacy research function. Wraps researchBuildingOwner() and maps
 * the enriched result to the old OwnerResearchResult format.
 */
export async function researchOwner(req: ResearchRequest): Promise<OwnerResearchResult> {
  const enriched = await researchBuildingOwner({
    lat: req.lat,
    lng: req.lng,
    osmId: req.osmId,
    buildingName: req.buildingName,
  });

  return {
    ownerName: enriched.ownerName,
    email: enriched.email,
    phone: enriched.phone,
    website: enriched.website,
    address: enriched.address,
    socialMedia: enriched.socialMedia.facebook || enriched.socialMedia.instagram || enriched.socialMedia.linkedin
      ? {
          facebook: enriched.socialMedia.facebook || undefined,
          instagram: enriched.socialMedia.instagram || undefined,
          linkedin: enriched.socialMedia.linkedin || undefined,
        }
      : null,
    sources: enriched.enrichmentSources.filter(s => s.found).map(s => s.source),
    nearbyBusinesses: enriched.nearbyBusinesses.map(b => ({
      name: b.name,
      type: b.type,
      phone: b.phone,
      website: b.website,
      distance: b.distance,
    })),
    googleMapsUrl: enriched.googleMapsUrl,
    googleSearchUrl: enriched.googleSearchUrl,
  };
}

// ===== Utility Functions =====

/** Build a WhatsApp URL with a pre-filled solar energy message in Spanish */
export function buildWhatsAppUrl(phone: string, businessName?: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  const fullNumber = digits.startsWith('507') ? digits : `507${digits}`;
  const message = businessName
    ? `Hola, me comunico con ${businessName} respecto a una oportunidad de energia solar para su edificio.`
    : 'Hola, me gustaria hablar sobre una oportunidad de energia solar para su edificio.';
  return `https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`;
}

/** Build a tel: URL for calling a Panama phone number */
export function buildCallUrl(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  const fullNumber = digits.startsWith('507') ? digits : `507${digits}`;
  return `tel:+${fullNumber}`;
}

/** Format a phone number in Panama style: +507 XXXX-XXXX */
export function formatPanamaPhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  const local = digits.startsWith('507') ? digits.slice(3) : digits;
  if (local.length === 8) return `+507 ${local.slice(0, 4)}-${local.slice(4)}`;
  if (local.length === 7) return `+507 ${local.slice(0, 3)}-${local.slice(3)}`;
  return `+507 ${local}`;
}

/** Merge new owner research into existing enrichment data */
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
