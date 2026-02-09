import type { LeadEnrichment } from '@/types/lead';

// Enrich a single building by fetching Google Places data near its coordinates
export async function enrichBuilding(
  center: { lat: number; lng: number },
  radius = 50
): Promise<LeadEnrichment | null> {
  try {
    const url = `/api/roof-scan?action=places-lookup&lat=${center.lat}&lng=${center.lng}&radius=${radius}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();

    const results = data.results || [];
    if (results.length === 0) return null;

    // Use the first (closest) result
    const place = results[0];
    return {
      businessName: place.name || null,
      phone: place.formatted_phone_number || null,
      website: place.website || null,
      address: place.vicinity || place.formatted_address || null,
      rating: place.rating || null,
      types: place.types || [],
      placeId: place.place_id || null,
      ownerName: null,
      email: null,
      socialMedia: null,
    };
  } catch (err) {
    console.error('Enrichment failed:', err);
    return null;
  }
}

// Batch enrich multiple buildings with concurrency limit
export async function batchEnrich(
  buildings: Array<{ id: string; center: { lat: number; lng: number } }>,
  concurrency = 3,
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, LeadEnrichment | null>> {
  const results = new Map<string, LeadEnrichment | null>();
  let completed = 0;

  for (let i = 0; i < buildings.length; i += concurrency) {
    const batch = buildings.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (b) => {
        const enrichment = await enrichBuilding(b.center);
        return { id: b.id, enrichment };
      })
    );

    for (const { id, enrichment } of batchResults) {
      results.set(id, enrichment);
      completed++;
    }

    onProgress?.(completed, buildings.length);

    // Throttle: wait 500ms between batches to avoid rate limiting
    if (i + concurrency < buildings.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}

// Calculate composite lead score: 70% suitability + 30% enrichment quality
export function calculateLeadScore(
  suitabilityScore: number,
  enrichment: LeadEnrichment | null
): number {
  const suitabilityPart = suitabilityScore * 0.7;

  let enrichmentScore = 0;
  if (enrichment) {
    if (enrichment.businessName) enrichmentScore += 30;
    if (enrichment.phone) enrichmentScore += 25;
    if (enrichment.website) enrichmentScore += 20;
    if (enrichment.rating && enrichment.rating >= 4) enrichmentScore += 15;
    if (enrichment.address) enrichmentScore += 10;
    enrichmentScore = Math.min(enrichmentScore, 100);
  }

  const enrichmentPart = enrichmentScore * 0.3;
  return Math.round(suitabilityPart + enrichmentPart);
}
