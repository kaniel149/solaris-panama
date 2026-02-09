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

// Calculate composite lead score:
// 40% suitability + 20% enrichment quality + 20% research confidence + 20% financial attractiveness
export function calculateLeadScore(
  suitabilityScore: number,
  enrichment: LeadEnrichment | null,
  financials?: { paybackYears: number; systemKwp: number }
): number {
  // 1. Suitability: 40%
  const suitabilityPart = suitabilityScore * 0.4;

  // 2. Enrichment quality: 20%
  let enrichmentScore = 0;
  if (enrichment) {
    if (enrichment.businessName) enrichmentScore += 30;
    if (enrichment.phone) enrichmentScore += 25;
    if (enrichment.website) enrichmentScore += 20;
    if (enrichment.rating && enrichment.rating >= 4) enrichmentScore += 15;
    if (enrichment.address) enrichmentScore += 10;
    enrichmentScore = Math.min(enrichmentScore, 100);
  }
  const enrichmentPart = enrichmentScore * 0.2;

  // 3. Research confidence: 20%
  const researchConfidence = enrichment?.confidenceScore ?? 0;
  const researchPart = researchConfidence * 0.2;

  // 4. Financial attractiveness: 20%
  let financialScore = 50; // default when no financials
  if (financials && financials.paybackYears > 0) {
    const pb = financials.paybackYears;
    if (pb < 3) financialScore = 100;
    else if (pb < 5) financialScore = 80;
    else if (pb < 7) financialScore = 60;
    else if (pb < 10) financialScore = 40;
    else financialScore = 20;

    // System size bonus
    if (financials.systemKwp > 500) financialScore = Math.min(financialScore + 30, 100);
    else if (financials.systemKwp > 100) financialScore = Math.min(financialScore + 20, 100);
  }
  const financialPart = financialScore * 0.2;

  return Math.round(suitabilityPart + enrichmentPart + researchPart + financialPart);
}
