// Vercel Serverless API Proxy for Roof Scanner
// Keeps API keys server-side, proxies requests to Google Solar API + NREL PVWatts
//
// Usage:
//   GET /api/roof-scan?action=google-solar&lat=8.98&lng=-79.52
//   GET /api/roof-scan?action=pvwatts&lat=8.98&lng=-79.52&system_capacity=100
//   POST /api/roof-scan?action=overpass  (body: Overpass QL query)
//   GET /api/roof-scan?action=satellite-image&lat=8.98&lng=-79.52&zoom=18&size=400x250
//   GET /api/roof-scan?action=places-lookup&lat=8.98&lng=-79.52&radius=50
//   GET /api/roof-scan?action=places-detail&placeId=ChIJ...
//   GET /api/roof-scan?action=owner-research&query=BusinessName&lat=8.98&lng=-79.52
//   GET /api/roof-scan?action=cadastre-lookup&lat=8.98&lng=-79.52
//   GET /api/roof-scan?action=panama-emprende&businessName=SolarTech
//   GET /api/roof-scan?action=opencorporates&companyName=SolarTech

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

  const baseParams =
    `?location.latitude=${lat}` +
    `&location.longitude=${lng}` +
    `&key=${GOOGLE_SOLAR_API_KEY}` +
    `&experimentalFeatures=EXPANDED_COVERAGE`;

  const baseEndpoint = 'https://solar.googleapis.com/v1/buildingInsights:findClosest';
  const headers = { 'X-Goog-FieldMask': '*' };

  try {
    // First try with LOW quality (higher coverage)
    const urlLow = `${baseEndpoint}${baseParams}&requiredQuality=LOW`;
    const response = await fetch(urlLow, { method: 'GET', headers });
    const data = await response.json();

    if (response.ok) {
      res.status(200).json(data);
      return;
    }

    // Fallback: retry with BASE quality if LOW failed
    console.warn('[roof-scan] Google Solar LOW quality failed, trying BASE fallback:', {
      status: response.status,
      lat,
      lng,
    });

    const urlBase = `${baseEndpoint}${baseParams}&requiredQuality=BASE`;
    const fallbackResponse = await fetch(urlBase, { method: 'GET', headers });
    const fallbackData = await fallbackResponse.json();

    if (fallbackResponse.ok) {
      res.status(200).json(fallbackData);
      return;
    }

    // Both attempts failed
    console.error('[roof-scan] Google Solar API error (both qualities):', {
      status: fallbackResponse.status,
      error: fallbackData.error?.message,
      lat,
      lng,
    });

    res.status(fallbackResponse.status).json({
      error: fallbackData.error?.message || 'Google Solar API error',
      code: fallbackData.error?.status || 'API_ERROR',
    });
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

// ===== CADASTRE LOOKUP (ANATI Geoportal — ArcGIS REST) =====

interface CadastreResult {
  finca: string | null;
  parcelArea: number | null;
  landUse: string | null;
  province: string | null;
  district: string | null;
  corregimiento: string | null;
  geometry: {
    rings: number[][][];
  } | null;
  rawAttributes: Record<string, unknown>;
}

async function handleCadastreLookup(
  lat: string,
  lng: string,
  res: VercelResponse
): Promise<void> {
  // ANATI Geoportal ArcGIS REST endpoint for cadastral parcels
  const baseUrl =
    'https://services.arcgis.com/LBbVDC0hKPAnLRpO5se6HQ/arcgis/rest/services';
  const servicePaths = [
    'Catastro_Nacional/FeatureServer/0',
    'CATASTRO/FeatureServer/0',
    'Parcelas_Catastro/FeatureServer/0',
  ];

  const queryParams = new URLSearchParams({
    geometry: `${lng},${lat}`,
    geometryType: 'esriGeometryPoint',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: '*',
    returnGeometry: 'true',
    f: 'json',
    inSR: '4326',
    outSR: '4326',
  });

  let data: any = null;

  // Try multiple possible service paths (ArcGIS service names can vary)
  for (const servicePath of servicePaths) {
    const url = `${baseUrl}/${servicePath}/query?${queryParams.toString()}`;
    try {
      const response = await fetch(url);
      if (response.ok) {
        const parsed = await response.json();
        if (parsed.features && parsed.features.length > 0) {
          data = parsed;
          break;
        }
        // If response was OK but no features, try next service path
        if (!data) data = parsed;
      }
    } catch {
      // Try next service path
    }
  }

  if (!data) {
    res.status(502).json({
      error: 'Failed to connect to ANATI Geoportal',
      code: 'CADASTRE_UNAVAILABLE',
      hint: 'The ANATI ArcGIS service may be temporarily unavailable.',
    });
    return;
  }

  if (!data.features || data.features.length === 0) {
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1h for empty results
    res.status(200).json({
      finca: null,
      parcelArea: null,
      landUse: null,
      province: null,
      district: null,
      corregimiento: null,
      geometry: null,
      rawAttributes: {},
      message: 'No cadastral parcel found at this location',
    });
    return;
  }

  const feature = data.features[0];
  const attrs = feature.attributes || {};

  const result: CadastreResult = {
    finca: attrs.FINCA || attrs.Finca || attrs.finca || attrs.NUM_FINCA || null,
    parcelArea:
      attrs.AREA || attrs.Area || attrs.area || attrs.SHAPE_Area || null,
    landUse:
      attrs.USO_SUELO || attrs.Uso_Suelo || attrs.uso_suelo || attrs.LAND_USE || null,
    province:
      attrs.PROVINCIA || attrs.Provincia || attrs.provincia || null,
    district:
      attrs.DISTRITO || attrs.Distrito || attrs.distrito || null,
    corregimiento:
      attrs.CORREGIMIENTO || attrs.Corregimiento || attrs.corregimiento || null,
    geometry: feature.geometry || null,
    rawAttributes: attrs,
  };

  res.setHeader('Cache-Control', 'public, max-age=86400'); // 24h cache
  res.status(200).json(result);
}

// ===== PANAMA EMPRENDE (Business Registry) =====

interface PanamaEmprendeResult {
  legalName: string | null;
  avisoDeOperacion: string | null;
  status: string | null;
  activityDescription: string | null;
  registrationDate: string | null;
  address: string | null;
  sources: string[];
}

async function handlePanamaEmprende(
  businessName: string,
  res: VercelResponse
): Promise<void> {
  const decodedName = decodeURIComponent(businessName);
  const result: PanamaEmprendeResult = {
    legalName: null,
    avisoDeOperacion: null,
    status: null,
    activityDescription: null,
    registrationDate: null,
    address: null,
    sources: [],
  };

  // Panama Emprende public consultation endpoint
  const searchUrl = `https://www.panamaemprende.gob.pa/consultas`;

  try {
    // Try the public consultation search page
    const searchPageHtml = await fetchWithTimeout(
      `${searchUrl}?nombre=${encodeURIComponent(decodedName)}`,
      8000
    );

    if (searchPageHtml) {
      // Extract business info from the consultation results page
      // Look for common patterns in the HTML response
      const avisoMatch = searchPageHtml.match(
        /aviso\s*(?:de\s*)?operaci[oó]n[^:]*:\s*([A-Z0-9-]+)/i
      );
      const statusMatch = searchPageHtml.match(
        /estado[^:]*:\s*(vigente|activo|inactivo|suspendido|cancelado)/i
      );
      const activityMatch = searchPageHtml.match(
        /actividad[^:]*:\s*([^<\n]{3,100})/i
      );
      const nameMatch = searchPageHtml.match(
        /raz[oó]n\s*social[^:]*:\s*([^<\n]{3,200})/i
      );
      const addressMatch = searchPageHtml.match(
        /direcci[oó]n[^:]*:\s*([^<\n]{3,200})/i
      );

      if (avisoMatch) result.avisoDeOperacion = avisoMatch[1].trim();
      if (statusMatch) result.status = statusMatch[1].trim();
      if (activityMatch) result.activityDescription = activityMatch[1].trim();
      if (nameMatch) result.legalName = nameMatch[1].trim();
      if (addressMatch) result.address = addressMatch[1].trim();

      if (result.avisoDeOperacion || result.legalName) {
        result.sources.push('Panama Emprende');
      }
    }
  } catch (err) {
    console.error('[panama-emprende] Search error:', err);
  }

  // Fallback: try Registro Publico Panama search
  if (!result.legalName) {
    try {
      const rpSearchUrl = `https://www.registro-publico.gob.pa/scripts/nwwisapi.dll/conweb/MESAMENU?TODO=CONSULTAR&ESSION=&NAME=${encodeURIComponent(decodedName)}`;
      const rpHtml = await fetchWithTimeout(rpSearchUrl, 5000);

      if (rpHtml) {
        const rpNameMatch = rpHtml.match(
          /nombre[^:]*:\s*([^<\n]{3,200})/i
        );
        const rpStatusMatch = rpHtml.match(
          /estado[^:]*:\s*(vigente|activo|inscrita)/i
        );

        if (rpNameMatch) {
          result.legalName = rpNameMatch[1].trim();
          result.sources.push('Registro Publico');
        }
        if (rpStatusMatch && !result.status) {
          result.status = rpStatusMatch[1].trim();
        }
      }
    } catch {
      // Fallback source not available
    }
  }

  // If still no name, set to search term
  if (!result.legalName && (result.avisoDeOperacion || result.status)) {
    result.legalName = decodedName;
  }

  res.setHeader('Cache-Control', 'public, max-age=3600'); // 1h cache
  res.status(200).json(result);
}

// ===== OPENCORPORATES (Panama Company Search) =====

interface OpenCorporatesCompany {
  companyNumber: string;
  name: string;
  status: string | null;
  incorporationDate: string | null;
  companyType: string | null;
  registeredAddress: string | null;
  officers: Array<{
    name: string;
    position: string;
    startDate: string | null;
  }>;
  opencorporatesUrl: string;
}

interface OpenCorporatesResult {
  companies: OpenCorporatesCompany[];
  totalResults: number;
}

async function handleOpenCorporates(
  companyName: string,
  res: VercelResponse
): Promise<void> {
  const decodedName = decodeURIComponent(companyName);

  const url =
    `https://api.opencorporates.com/v0.4/companies/search` +
    `?q=${encodeURIComponent(decodedName)}` +
    `&jurisdiction_code=pa` +
    `&per_page=5`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SolarisBot/1.0 (solar-crm)',
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        res.status(429).json({
          error: 'OpenCorporates rate limit exceeded. Try again in a few minutes.',
          code: 'RATE_LIMITED',
        });
        return;
      }
      console.error('[opencorporates] API error:', {
        status: response.status,
      });
      res.status(response.status).json({
        error: `OpenCorporates API error: ${response.status}`,
        code: 'OPENCORPORATES_ERROR',
      });
      return;
    }

    const data = await response.json();
    const apiResults = data.results?.companies || [];
    const totalCount = data.results?.total_count || 0;

    const companies: OpenCorporatesCompany[] = apiResults.map(
      (item: any) => {
        const company = item.company;
        return {
          companyNumber: company.company_number || '',
          name: company.name || '',
          status: company.current_status || null,
          incorporationDate: company.incorporation_date || null,
          companyType: company.company_type || null,
          registeredAddress:
            company.registered_address_in_full ||
            company.registered_address?.street_address ||
            null,
          officers: (company.officers || []).map((o: any) => ({
            name: o.officer?.name || '',
            position: o.officer?.position || '',
            startDate: o.officer?.start_date || null,
          })),
          opencorporatesUrl: company.opencorporates_url || '',
        };
      }
    );

    const result: OpenCorporatesResult = {
      companies,
      totalResults: totalCount,
    };

    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1h cache
    res.status(200).json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to reach OpenCorporates API';
    console.error('[opencorporates] fetch error:', message);
    res.status(500).json({
      error: message,
      code: 'FETCH_ERROR',
    });
  }
}

// ===== GOOGLE PLACES DETAIL (Enhanced) =====

interface PlacesDetailResult {
  displayName: string | null;
  formattedAddress: string | null;
  nationalPhoneNumber: string | null;
  internationalPhoneNumber: string | null;
  websiteUri: string | null;
  googleMapsUri: string | null;
  regularOpeningHours: {
    openNow: boolean;
    weekdayDescriptions: string[];
  } | null;
  rating: number | null;
  userRatingCount: number | null;
  businessStatus: string | null;
  types: string[];
  editorialSummary: string | null;
}

async function handlePlacesDetail(
  placeId: string,
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

  if (!placeId || placeId.length < 10) {
    res.status(400).json({
      error: 'Invalid placeId. Must be a valid Google Places ID.',
      code: 'INVALID_PLACE_ID',
    });
    return;
  }

  const fieldMask = [
    'displayName',
    'formattedAddress',
    'nationalPhoneNumber',
    'internationalPhoneNumber',
    'websiteUri',
    'googleMapsUri',
    'regularOpeningHours',
    'rating',
    'userRatingCount',
    'businessStatus',
    'types',
    'editorialSummary',
  ].join(',');

  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;

  try {
    const response = await fetch(url, {
      headers: {
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': fieldMask,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[places-detail] Google Places API error:', {
        status: response.status,
        error: data.error?.message,
        placeId,
      });
      res.status(response.status).json({
        error: data.error?.message || 'Google Places API error',
        code: 'PLACES_DETAIL_ERROR',
      });
      return;
    }

    const result: PlacesDetailResult = {
      displayName: data.displayName?.text || null,
      formattedAddress: data.formattedAddress || null,
      nationalPhoneNumber: data.nationalPhoneNumber || null,
      internationalPhoneNumber: data.internationalPhoneNumber || null,
      websiteUri: data.websiteUri || null,
      googleMapsUri: data.googleMapsUri || null,
      regularOpeningHours: data.regularOpeningHours
        ? {
            openNow: data.regularOpeningHours.openNow ?? false,
            weekdayDescriptions:
              data.regularOpeningHours.weekdayDescriptions || [],
          }
        : null,
      rating: data.rating || null,
      userRatingCount: data.userRatingCount || null,
      businessStatus: data.businessStatus || null,
      types: data.types || [],
      editorialSummary: data.editorialSummary?.text || null,
    };

    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1h cache
    res.status(200).json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to reach Google Places API';
    console.error('[places-detail] fetch error:', message);
    res.status(500).json({
      error: message,
      code: 'FETCH_ERROR',
    });
  }
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
        'places-detail': 'GET /api/roof-scan?action=places-detail&placeId=ChIJ...',
        'owner-research': 'GET /api/roof-scan?action=owner-research&query=BusinessName&lat=8.98&lng=-79.52',
        'cadastre-lookup': 'GET /api/roof-scan?action=cadastre-lookup&lat=8.98&lng=-79.52',
        'panama-emprende': 'GET /api/roof-scan?action=panama-emprende&businessName=SolarTech',
        'opencorporates': 'GET /api/roof-scan?action=opencorporates&companyName=SolarTech',
      },
    });
    return;
  }

  // Actions that don't require coordinates
  if (action === 'overpass') {
    await handleOverpass(req, res);
    return;
  }

  if (action === 'panama-emprende') {
    const businessName = getParam(req.query, 'businessName') || '';
    if (!businessName) {
      res.status(400).json({
        error: 'Missing required query parameter: businessName',
        code: 'MISSING_BUSINESS_NAME',
      });
      return;
    }
    await handlePanamaEmprende(businessName, res);
    return;
  }

  if (action === 'opencorporates') {
    const companyName = getParam(req.query, 'companyName') || '';
    if (!companyName) {
      res.status(400).json({
        error: 'Missing required query parameter: companyName',
        code: 'MISSING_COMPANY_NAME',
      });
      return;
    }
    await handleOpenCorporates(companyName, res);
    return;
  }

  if (action === 'places-detail') {
    const placeId = getParam(req.query, 'placeId') || '';
    if (!placeId) {
      res.status(400).json({
        error: 'Missing required query parameter: placeId',
        code: 'MISSING_PLACE_ID',
      });
      return;
    }
    await handlePlacesDetail(placeId, res);
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

    case 'cadastre-lookup': {
      await handleCadastreLookup(lat, lng, res);
      return;
    }

    default: {
      res.status(400).json({
        error: `Invalid action: "${action}". Valid actions: google-solar, pvwatts, overpass, satellite-image, places-lookup, places-detail, owner-research, cadastre-lookup, panama-emprende, opencorporates`,
        code: 'INVALID_ACTION',
      });
      return;
    }
  }
}
