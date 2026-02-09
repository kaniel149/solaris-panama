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

    const data = await response.json();
    if (!data || data.error) return null;

    // Parse ArcGIS feature response
    const feature = data.features?.[0];
    if (!feature) return null;

    const attrs = feature.attributes || {};
    const fincaNumber = attrs.FINCA || attrs.finca || attrs.numero_finca || '';
    if (!fincaNumber) return null;

    // Parse boundary from geometry rings if available
    let parcelBoundary: Array<{ lat: number; lng: number }> | undefined;
    if (feature.geometry?.rings?.[0]) {
      parcelBoundary = feature.geometry.rings[0].map((coord: number[]) => ({
        lat: coord[1],
        lng: coord[0],
      }));
    }

    return {
      fincaNumber: String(fincaNumber),
      parcelArea: attrs.AREA || attrs.area || attrs.superficie || 0,
      landUse: attrs.USO_SUELO || attrs.uso_suelo || attrs.land_use || 'unknown',
      assessedValue: attrs.VALOR_CATASTRAL || attrs.valor_catastral || undefined,
      parcelBoundary,
      registroPublicoUrl: getRegistroPublicoUrl(String(fincaNumber)),
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
