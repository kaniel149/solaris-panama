// Roof Suitability Classifier
// Scores OSM buildings for solar panel suitability based on area, type, and metadata

// ===== TYPES =====

export interface SuitabilityResult {
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  factors: Record<string, number>;
  recommendation: string;
}

// ===== CONSTANTS =====

// Building types that are ideal for commercial solar
const COMMERCIAL_TYPES = new Set([
  'commercial',
  'retail',
  'industrial',
  'warehouse',
  'supermarket',
]);

const INSTITUTIONAL_TYPES = new Set([
  'office',
  'hotel',
  'hospital',
  'school',
  'university',
  'public',
  'civic',
  'government',
]);

// ===== SCORING =====

/**
 * Score building area for solar suitability (0-50 points).
 * Sweet spot: 500-10,000 m² (medium to large commercial rooftops).
 */
function scoreArea(areaM2: number): number {
  if (areaM2 < 50) return 0; // Too small for any meaningful installation
  if (areaM2 < 200) return 15; // Residential scale
  if (areaM2 < 500) return 30; // Small commercial
  if (areaM2 < 2000) return 45; // Medium commercial
  if (areaM2 <= 10000) return 50; // Large commercial - ideal
  return 45; // Very large - diminishing returns, complex logistics
}

/**
 * Score building type (0-30 points).
 * Commercial and industrial buildings are best for solar.
 */
function scoreType(tags: Record<string, string>): number {
  const buildingType = (tags['building'] || '').toLowerCase();

  if (COMMERCIAL_TYPES.has(buildingType)) return 30;
  if (INSTITUTIONAL_TYPES.has(buildingType)) return 25;
  if (buildingType === 'residential' || buildingType === 'apartments')
    return 15;
  if (buildingType === 'yes') return 10; // Untagged building
  return 10;
}

/**
 * Score building metadata - named/addressed buildings are more likely
 * to be real businesses worth targeting (0-20 points).
 */
function scoreName(tags: Record<string, string>): number {
  let score = 0;
  if (tags['name']) score += 15;
  if (tags['addr:street']) score += 5;
  return Math.min(score, 20);
}

/**
 * Generate a human-readable recommendation based on score.
 */
function getRecommendation(score: number, area: number, tags: Record<string, string>): string {
  const buildingType = tags['building'] || 'unknown';
  const name = tags['name'];

  if (score >= 75) {
    return `Excellent candidate${name ? ` (${name})` : ''}. ${area.toLocaleString()} m² ${buildingType} roof with high solar potential. Priority target for outreach.`;
  }
  if (score >= 55) {
    return `Good candidate. ${area.toLocaleString()} m² ${buildingType} building suitable for commercial solar installation.`;
  }
  if (score >= 35) {
    return `Fair candidate. ${area.toLocaleString()} m² roof may support a smaller installation. Worth evaluating on-site.`;
  }
  return `Low suitability. ${area < 50 ? 'Roof area too small' : 'Building type not ideal'} for commercial solar.`;
}

// ===== PUBLIC API =====

/**
 * Classify a building's suitability for solar panel installation.
 * Returns a score (0-100), letter grade, per-factor breakdown, and recommendation.
 */
export function classifyBuilding(building: {
  area: number;
  tags: Record<string, string>;
}): SuitabilityResult {
  const areaScore = scoreArea(building.area);
  const typeScore = scoreType(building.tags);
  const nameScore = scoreName(building.tags);
  const score = areaScore + typeScore + nameScore;

  let grade: SuitabilityResult['grade'];
  if (score >= 75) grade = 'A';
  else if (score >= 55) grade = 'B';
  else if (score >= 35) grade = 'C';
  else if (score >= 20) grade = 'D';
  else grade = 'F';

  return {
    score,
    grade,
    factors: {
      area: areaScore,
      type: typeScore,
      name: nameScore,
    },
    recommendation: getRecommendation(score, building.area, building.tags),
  };
}

/**
 * Get a color for a suitability score (for UI rendering).
 */
export function getScoreColor(score: number): string {
  if (score >= 70) return '#22c55e'; // Green
  if (score >= 40) return '#f59e0b'; // Yellow/amber
  return '#ef4444'; // Red
}
