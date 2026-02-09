// Enrichment types for multi-source owner research pipeline

/** Sources used in the waterfall enrichment pipeline */
export enum ResearchSource {
  OSM = 'osm',
  NOMINATIM = 'nominatim',
  ANATI_CADASTRE = 'anati_cadastre',
  GOOGLE_PLACES = 'google_places',
  PANAMA_EMPRENDE = 'panama_emprende',
  OPENCORPORATES = 'opencorporates',
  APOLLO = 'apollo',
}

/** Result from a single enrichment source */
export interface SourceResult {
  source: ResearchSource;
  confidence: number; // 0-100
  data: Record<string, unknown>;
  timestamp: string;
}

/** Panama ANATI cadastre parcel information */
export interface CadastreInfo {
  fincaNumber: string;
  parcelArea: number; // m²
  landUse: string;
  assessedValue?: number;
  parcelBoundary?: Array<{ lat: number; lng: number }>;
  registroPublicoUrl: string;
}

/** Panama Emprende business license (Aviso de Operacion) */
export interface BusinessLicense {
  avisoNumber: string;
  legalName: string;
  commercialName: string;
  status: 'active' | 'inactive' | 'suspended' | 'unknown';
  entryDate: string;
  activityDescription: string;
}

/** OpenCorporates company information */
export interface CorporateInfo {
  companyNumber: string;
  companyName: string;
  status: string;
  incorporationDate: string;
  registeredAddress: string;
  officers: Array<{
    name: string;
    role: string;
    startDate?: string;
  }>;
}

/** Progress callback step status */
export type ProgressStatus = 'pending' | 'loading' | 'done' | 'error';

/** Nearby business from Google Places or OSM */
export interface NearbyBusinessResult {
  name: string;
  type: string;
  distance: number;
  phone?: string;
  website?: string;
  placeId?: string;
}

/** Source enrichment summary for the UI */
export interface EnrichmentSourceSummary {
  source: ResearchSource;
  found: boolean;
  dataPoints: string[];
  confidence: number;
}

/** Full enriched owner result from the waterfall pipeline */
export interface EnrichedOwnerResult {
  // Basic contact (merged from all sources)
  ownerName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  socialMedia: {
    facebook: string | null;
    instagram: string | null;
    linkedin: string | null;
  };

  // New enrichment data
  cadastre: CadastreInfo | null;
  businessLicense: BusinessLicense | null;
  corporateInfo: CorporateInfo | null;

  // Nearby businesses
  nearbyBusinesses: NearbyBusinessResult[];

  // Meta
  confidenceScore: number; // 0-100
  enrichmentSources: EnrichmentSourceSummary[];

  // Quick links
  googleMapsUrl: string;
  googleSearchUrl: string;
  registroPublicoUrl: string | null;
  whatsappUrl: string | null;
  callUrl: string | null;

  // Research status
  researchedAt: string;
  totalSourcesQueried: number;
  totalSourcesWithData: number;
}
