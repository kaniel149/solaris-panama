// Cadastre Service — ANATI (Autoridad Nacional de Tierras) parcel lookup
// Uses ArcGIS REST API via the Vercel proxy to find land parcels by coordinates

import type { CadastreInfo } from '@/types/enrichment';

const REGISTRO_PUBLICO_BASE = 'https://www.registro-publico.gob.pa/consultas/finca';

/**
 * Look up a cadastre parcel by coordinates via the ANATI ArcGIS service.
 * Routes through /api/roof-scan?action=cadastre-lookup to keep API details server-side.
 */
export async function lookupParcel(lat: number, lng: number): Promise<CadastreInfo | null> {
  try {
    const url = `/api/roof-scan?action=cadastre-lookup&lat=${lat}&lng=${lng}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    // The /api/roof-scan cadastre-lookup endpoint returns a FLAT object
    // ({ finca, owners, ownerIds, province, ... }), not a raw ArcGIS feature.
    const data = await response.json();
    if (!data || data.error) return null;

    const fincaNumber = data.finca || '';
    const hasOwners = Array.isArray(data.owners) && data.owners.length > 0;
    // Nothing useful at this location.
    if (!fincaNumber && !hasOwners) return null;

    // Parse boundary from geometry rings if available (rings are [lng, lat]).
    let parcelBoundary: Array<{ lat: number; lng: number }> | undefined;
    if (data.geometry?.rings?.[0]) {
      parcelBoundary = data.geometry.rings[0].map((coord: number[]) => ({
        lat: coord[1],
        lng: coord[0],
      }));
    }

    return {
      fincaNumber: String(fincaNumber || ''),
      parcelArea: data.parcelArea || 0,
      landUse: data.landUse || 'unknown',
      assessedValue: data.assessedValue || undefined,
      parcelBoundary,
      registroPublicoUrl: getRegistroPublicoUrl(String(fincaNumber || '')),
      owners: hasOwners ? data.owners : undefined,
      ownerIds: Array.isArray(data.ownerIds) ? data.ownerIds : undefined,
      ownerCount: typeof data.ownerCount === 'number' ? data.ownerCount : undefined,
      province: data.province || undefined,
      district: data.district || undefined,
      corregimiento: data.corregimiento || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Build a URL to look up a finca number in Panama's Registro Publico.
 */
export function getRegistroPublicoUrl(fincaNumber: string): string {
  return `${REGISTRO_PUBLICO_BASE}/${encodeURIComponent(fincaNumber)}`;
}
