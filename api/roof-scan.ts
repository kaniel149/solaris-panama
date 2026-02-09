// Vercel Serverless API Proxy for Roof Scanner
// Keeps API keys server-side, proxies requests to Google Solar API + NREL PVWatts
//
// Usage:
//   GET /api/roof-scan?action=google-solar&lat=8.98&lng=-79.52
//   GET /api/roof-scan?action=pvwatts&lat=8.98&lng=-79.52&system_capacity=100
//   POST /api/roof-scan?action=overpass  (body: Overpass QL query)
//   GET /api/roof-scan?action=satellite-image&lat=8.98&lng=-79.52&zoom=18&size=400x250
//   GET /api/roof-scan?action=places-lookup&lat=8.98&lng=-79.52&radius=50
//   GET /api/roof-scan?action=owner-research&query=BusinessName&lat=8.98&lng=-79.52

import type { VercelRequest, VercelResponse } from '@vercel/node';

// ===== CONFIG =====

const GOOGLE_SOLAR_API_KEY = process.env.GOOGLE_SOLAR_API_KEY || '';
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_SOLAR_API_KEY || '';
const NREL_API_KEY = process.env.NREL_API_KEY || '';
const SYSTEM_LOSSES = 14; // % system losses for PVWatts

// ===== HELPERS =====

function getParam(
  query: VercelRequest['query'],
  key: string
): string | undefined {
  const val = query[key];
  if (Array.isArray(val)) return val[0];
  return val;
}

function setCorsHeaders(res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function validateCoordinates(lat: string, lng: string): string | null {
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);

  if (isNaN(latNum) || isNaN(lngNum)) {
    return 'lat and lng must be valid numbers';
  }
  if (latNum < -90 || latNum > 90) {
    return 'lat must be between -90 and 90';
  }
  if (lngNum < -180 || lngNum > 180) {
    return 'lng must be between -180 and 180';
  }
  return null;
}

// ===== GOOGLE SOLAR API =====

async function handleGoogleSolar(
  lat: string,
  lng: string,
  res: VercelResponse
): Promise<void> {
  if (!GOOGLE_SOLAR_API_KEY) {
    res.status(503).json({
      error: 'Google Solar API key not configured. Set GOOGLE_SOLAR_API_KEY in environment variables.',
      code: 'NO_API_KEY',
      hint: 'Add GOOGLE_SOLAR_API_KEY to your Vercel project environment variables.',
    });
    return;
  }

  const url =
    `https://solar.googleapis.com/v1/buildingInsights:findClosest` +
    `?location.latitude=${lat}` +
    `&location.longitude=${lng}` +
    `&requiredQuality=LOW` +
    `&key=${GOOGLE_SOLAR_API_KEY}` +
    `&experimentalFeatures=EXPANDED_COVERAGE`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Goog-FieldMask': '*',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[roof-scan] Google Solar API error:', {
        status: response.status,
        error: data.error?.message,
        lat,
        lng,
      });

      res.status(response.status).json({
        error: data.error?.message || 'Google Solar API error',
        code: data.error?.status || 'API_ERROR',
      });
      return;
    }

    res.status(200).json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to reach Google Solar API';
    console.error('[roof-scan] Google Solar fetch error:', message);
    res.status(500).json({
      error: message,
      code: 'FETCH_ERROR',
    });
  }
}

// ===== NREL PVWATTS API =====

async function handlePVWatts(
  lat: string,
  lng: string,
  systemCapacity: string,
  res: VercelResponse
): Promise<void> {
  if (!NREL_API_KEY) {
    res.status(503).json({
      error: 'NREL API key not configured. Set NREL_API_KEY in environment variables.',
      code: 'NO_API_KEY',
      hint: 'Register at https://developer.nrel.gov/signup/ to get a free API key, then add NREL_API_KEY to your Vercel project environment variables.',
    });
    return;
  }

  const capacityNum = parseFloat(systemCapacity);
  if (isNaN(capacityNum) || capacityNum <= 0 || capacityNum > 500000) {
    res.status(400).json({
      error: 'system_capacity must be a positive number (kW)',
      code: 'INVALID_CAPACITY',
    });
    return;
  }

  const url =
    `https://developer.nrel.gov/api/pvwatts/v8.json` +
    `?api_key=${NREL_API_KEY}` +
    `&lat=${lat}` +
    `&lon=${lng}` +
    `&system_capacity=${systemCapacity}` +
    `&azimuth=180` +
    `&tilt=10` +
    `&array_type=1` +
    `&module_type=1` +
    `&losses=${SYSTEM_LOSSES}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.errors?.[0] || data.error || 'PVWatts API error';
      console.error('[roof-scan] PVWatts API error:', {
        status: response.status,
        error: errorMsg,
        lat,
        lng,
        systemCapacity,
      });

      res.status(response.status).json({
        error: errorMsg,
        code: 'PVWATTS_ERROR',
      });
      return;
    }

    res.status(200).json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to reach PVWatts API';
    console.error('[roof-scan] PVWatts fetch error:', message);
    res.status(500).json({
      error: message,
      code: 'FETCH_ERROR',
    });
  }
}

// ===== OVERPASS API (OpenStreetMap building footprints) =====

async function handleOverpass(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Overpass action requires POST method.' });
    return;
  }

  // Body can be string or parsed object with query field
  let query: string;
  if (typeof req.body === 'string') {
    query = req.body;
  } else if (req.body && typeof req.body.query === 'string') {
    query = req.body.query;
  } else if (req.body && typeof req.body === 'object') {
    // Vercel may parse text/plain body as string directly
    query = String(req.body);
  } else {
    res.status(400).json({
      error: 'Request body must contain an Overpass QL query',
      code: 'MISSING_QUERY',
    });
    return;
  }

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[roof-scan] Overpass API error:', {
        status: response.status,
        body: text.slice(0, 500),
      });
      res.status(response.status).json({
        error: `Overpass API error: ${response.status}`,
        code: 'OVERPASS_ERROR',
      });
      return;
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to reach Overpass API';
    console.error('[roof-scan] Overpass fetch error:', message);
    res.status(500).json({
      error: message,
      code: 'FETCH_ERROR',
    });
  }
}

// ===== GOOGLE MAPS SATELLITE IMAGE =====

async function handleSatelliteImage(
  lat: string,
  lng: string,
  zoom: string,
  size: string,
  res: VercelResponse
): Promise<void> {
  if (!GOOGLE_MAPS_API_KEY) {
    res.status(503).json({
      error: 'Google Maps API key not configured.',
      code: 'NO_API_KEY',
      hint: 'Add GOOGLE_MAPS_API_KEY to your Vercel project environment variables.',
    });
    return;
  }

  // Validate size format (WxH)
  if (!/^\d{1,4}x\d{1,4}$/.test(size)) {
    res.status(400).json({
      error: 'Invalid size format. Use WxH (e.g., 400x250)',
      code: 'INVALID_SIZE',
    });
    return;
  }

  const url =
    `https://maps.googleapis.com/maps/api/staticmap` +
    `?center=${lat},${lng}` +
    `&zoom=${zoom}` +
    `&size=${size}` +
    `&maptype=satellite` +
    `&key=${GOOGLE_MAPS_API_KEY}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error('[roof-scan] Google Static Maps error:', {
        status: response.status,
        lat,
        lng,
      });
      res.status(response.status).json({
        error: `Google Static Maps API error: ${response.status}`,
        code: 'MAPS_ERROR',
      });
      return;
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const buffer = Buffer.from(await response.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache 24h
    res.status(200).send(buffer);
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to reach Google Static Maps API';
    console.error('[roof-scan] Satellite image fetch error:', message);
    res.status(500).json({
      error: message,
      code: 'FETCH_ERROR',
    });
  }
}

// ===== GOOGLE PLACES LOOKUP =====

async function handlePlacesLookup(
  lat: string,
  lng: string,
  radius: string,
  res: VercelResponse
): Promise<void> {
  if (!GOOGLE_MAPS_API_KEY) {
    res.status(503).json({
      error: 'Google Maps API key not configured.',
      code: 'NO_API_KEY',
      hint: 'Add GOOGLE_MAPS_API_KEY to your Vercel project environment variables.',
    });
    return;
  }

  // Places API (New) — Nearby Search
  const url = 'https://places.googleapis.com/v1/places:searchNearby';
  const body = {
    locationRestriction: {
      circle: {
        center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
        radius: parseFloat(radius),
      },
    },
    maxResultCount: 5,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.websiteUri,places.rating,places.types,places.id',
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();

    if (!response.ok) {
      console.error('[roof-scan] Google Places API (New) error:', {
        status: response.status,
        error: data,
      });
      res.status(response.status).json({
        error: data.error?.message || 'Google Places API error',
        code: 'PLACES_ERROR',
      });
      return;
    }

    // Transform to legacy-compatible format for the frontend
    const results = (data.places || []).map((p: any) => ({
      name: p.displayName?.text || null,
      formatted_phone_number: p.internationalPhoneNumber || null,
      website: p.websiteUri || null,
      vicinity: p.formattedAddress || null,
      formatted_address: p.formattedAddress || null,
      rating: p.rating || null,
      types: p.types || [],
      place_id: p.id || null,
    }));

    res.status(200).json({ results, status: 'OK' });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to reach Google Places API';
    console.error('[roof-scan] Places lookup fetch error:', message);
    res.status(500).json({
      error: message,
      code: 'FETCH_ERROR',
    });
  }
}

// ===== OWNER RESEARCH (Panama Directories) =====

interface OwnerResearchResult {
  ownerName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  socialMedia: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  } | null;
  sources: string[];
}

// Regex patterns for Panama contact info extraction
const PHONE_REGEX = /(?:\+507[\s-]?)?\d{3,4}[\s-]?\d{4}/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const FACEBOOK_REGEX = /(?:https?:\/\/)?(?:www\.)?facebook\.com\/[a-zA-Z0-9._-]+/gi;
const INSTAGRAM_REGEX = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/[a-zA-Z0-9._-]+/gi;
const LINKEDIN_REGEX = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:company|in)\/[a-zA-Z0-9._-]+/gi;

async function fetchWithTimeout(url: string, timeoutMs = 5000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SolarisBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-PA,es;q=0.9,en;q=0.8',
      },
    });
    clearTimeout(timer);
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

function extractContactInfo(html: string): {
  phones: string[];
  emails: string[];
  facebook?: string;
  instagram?: string;
  linkedin?: string;
} {
  const phones = [...new Set((html.match(PHONE_REGEX) || []).map(p => p.trim()))];
  const emails = [...new Set((html.match(EMAIL_REGEX) || []).filter(e => !e.includes('example.')))];
  const facebookMatches = html.match(FACEBOOK_REGEX);
  const instagramMatches = html.match(INSTAGRAM_REGEX);
  const linkedinMatches = html.match(LINKEDIN_REGEX);

  return {
    phones,
    emails,
    facebook: facebookMatches?.[0],
    instagram: instagramMatches?.[0],
    linkedin: linkedinMatches?.[0],
  };
}

async function handleOwnerResearch(
  query: string,
  lat: string,
  lng: string,
  res: VercelResponse
): Promise<void> {
  const decodedQuery = decodeURIComponent(query);
  const result: OwnerResearchResult = {
    ownerName: null,
    email: null,
    phone: null,
    website: null,
    socialMedia: null,
    sources: [],
  };

  // 1. Google Places (New API) — Text Search for business name near coordinates
  if (GOOGLE_MAPS_API_KEY) {
    try {
      const textSearchUrl = 'https://places.googleapis.com/v1/places:searchText';
      const textSearchBody = {
        textQuery: decodedQuery,
        locationBias: {
          circle: {
            center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
            radius: 100.0,
          },
        },
        maxResultCount: 1,
      };

      const placesResponse = await fetch(textSearchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'places.displayName,places.internationalPhoneNumber,places.websiteUri,places.id',
        },
        body: JSON.stringify(textSearchBody),
      });
      const placesData = await placesResponse.json();
      const place = placesData.places?.[0];

      if (place) {
        result.ownerName = place.displayName?.text || null;
        result.phone = place.internationalPhoneNumber || null;
        result.website = place.websiteUri || null;
        result.sources.push('Google Places');
      }
    } catch (err) {
      console.error('[owner-research] Google Places error:', err);
    }
  }

  // 2. Paginas Amarillas Panama
  const paSearchUrl = `https://www.paginasamarillas.com.pa/buscar/${encodeURIComponent(decodedQuery)}`;
  const paHtml = await fetchWithTimeout(paSearchUrl);
  if (paHtml) {
    const paInfo = extractContactInfo(paHtml);
    if (paInfo.phones.length > 0 && !result.phone) {
      result.phone = paInfo.phones[0];
    }
    if (paInfo.emails.length > 0 && !result.email) {
      result.email = paInfo.emails[0];
    }
    if (paInfo.phones.length > 0 || paInfo.emails.length > 0) {
      result.sources.push('Paginas Amarillas');
    }
  }

  // 3. Find Us Here Panama
  const fuhSearchUrl = `https://www.find-us-here.com/panama/search?q=${encodeURIComponent(decodedQuery)}`;
  const fuhHtml = await fetchWithTimeout(fuhSearchUrl);
  if (fuhHtml) {
    const fuhInfo = extractContactInfo(fuhHtml);
    if (fuhInfo.phones.length > 0 && !result.phone) {
      result.phone = fuhInfo.phones[0];
    }
    if (fuhInfo.emails.length > 0 && !result.email) {
      result.email = fuhInfo.emails[0];
    }
    // Social media from any directory
    if (!result.socialMedia) {
      const social: Record<string, string> = {};
      if (fuhInfo.facebook) social.facebook = fuhInfo.facebook;
      if (fuhInfo.instagram) social.instagram = fuhInfo.instagram;
      if (fuhInfo.linkedin) social.linkedin = fuhInfo.linkedin;
      if (Object.keys(social).length > 0) {
        result.socialMedia = social as OwnerResearchResult['socialMedia'];
      }
    }
    if (fuhInfo.phones.length > 0 || fuhInfo.emails.length > 0) {
      result.sources.push('Find Us Here');
    }
  }

  // Merge social from PA html too
  if (paHtml && !result.socialMedia) {
    const paInfo = extractContactInfo(paHtml);
    const social: Record<string, string> = {};
    if (paInfo.facebook) social.facebook = paInfo.facebook;
    if (paInfo.instagram) social.instagram = paInfo.instagram;
    if (paInfo.linkedin) social.linkedin = paInfo.linkedin;
    if (Object.keys(social).length > 0) {
      result.socialMedia = social as OwnerResearchResult['socialMedia'];
    }
  }

  res.setHeader('Cache-Control', 'public, max-age=86400'); // 24h cache
  res.status(200).json(result);
}

// ===== MAIN HANDLER =====

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // CORS headers
  setCorsHeaders(res);

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only GET and POST allowed
  if (!['GET', 'POST'].includes(req.method || '')) {
    res.status(405).json({ error: 'Method not allowed. Use GET or POST.' });
    return;
  }

  // Parse params
  const action = getParam(req.query, 'action');
  const lat = getParam(req.query, 'lat');
  const lng = getParam(req.query, 'lng');

  // Validate action
  if (!action) {
    res.status(400).json({
      error: 'Missing required query parameter: action',
      usage: {
        'google-solar': 'GET /api/roof-scan?action=google-solar&lat=8.98&lng=-79.52',
        pvwatts: 'GET /api/roof-scan?action=pvwatts&lat=8.98&lng=-79.52&system_capacity=100',
        overpass: 'POST /api/roof-scan?action=overpass (body: Overpass QL query)',
        'satellite-image': 'GET /api/roof-scan?action=satellite-image&lat=8.98&lng=-79.52&zoom=18&size=400x250',
        'places-lookup': 'GET /api/roof-scan?action=places-lookup&lat=8.98&lng=-79.52&radius=50',
        'owner-research': 'GET /api/roof-scan?action=owner-research&query=BusinessName&lat=8.98&lng=-79.52',
      },
    });
    return;
  }

  // Overpass action uses POST body, no coordinates needed
  if (action === 'overpass') {
    await handleOverpass(req, res);
    return;
  }

  // All other actions require coordinates
  if (!lat || !lng) {
    res.status(400).json({
      error: 'Missing required query parameters: lat, lng',
      code: 'MISSING_COORDINATES',
    });
    return;
  }

  const coordError = validateCoordinates(lat, lng);
  if (coordError) {
    res.status(400).json({
      error: coordError,
      code: 'INVALID_COORDINATES',
    });
    return;
  }

  // Route to handler
  switch (action) {
    case 'google-solar': {
      await handleGoogleSolar(lat, lng, res);
      return;
    }

    case 'pvwatts': {
      const systemCapacity = getParam(req.query, 'system_capacity') || '100';
      await handlePVWatts(lat, lng, systemCapacity, res);
      return;
    }

    case 'satellite-image': {
      const zoom = getParam(req.query, 'zoom') || '18';
      const size = getParam(req.query, 'size') || '400x250';
      await handleSatelliteImage(lat, lng, zoom, size, res);
      return;
    }

    case 'places-lookup': {
      const radius = getParam(req.query, 'radius') || '50';
      await handlePlacesLookup(lat, lng, radius, res);
      return;
    }

    case 'owner-research': {
      const query = getParam(req.query, 'query') || '';
      if (!query) {
        res.status(400).json({
          error: 'Missing required query parameter: query',
          code: 'MISSING_QUERY',
        });
        return;
      }
      await handleOwnerResearch(query, lat, lng, res);
      return;
    }

    default: {
      res.status(400).json({
        error: `Invalid action: "${action}". Valid actions: google-solar, pvwatts, overpass, satellite-image, places-lookup, owner-research`,
        code: 'INVALID_ACTION',
      });
      return;
    }
  }
}
