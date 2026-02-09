import type { Lead, LeadStats, LeadStatus, LeadEnrichment } from '@/types/lead';
import type { DiscoveredBuilding } from '@/hooks/useRoofScanner';
import type { EnrichedOwnerResult } from '@/types/enrichment';
import { PANAMA_DEFAULTS } from '@/services/solarCalculator';
import { calculateLeadScore } from '@/services/leadEnrichmentService';

const STORAGE_KEY = 'solaris-leads';

// ===== CRUD =====

export function getLeads(): Lead[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getLead(id: string): Lead | null {
  const leads = getLeads();
  return leads.find(l => l.id === id) || null;
}

export function saveLead(lead: Lead): void {
  const leads = getLeads();
  const idx = leads.findIndex(l => l.id === lead.id);
  if (idx >= 0) {
    leads[idx] = lead;
  } else {
    leads.push(lead);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
}

export function saveLeads(leads: Lead[]): void {
  const existing = getLeads();
  const existingMap = new Map(existing.map(l => [l.id, l]));
  for (const lead of leads) {
    existingMap.set(lead.id, lead);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(existingMap.values())));
}

export function updateLead(id: string, updates: Partial<Lead>): Lead | null {
  const leads = getLeads();
  const idx = leads.findIndex(l => l.id === id);
  if (idx < 0) return null;
  leads[idx] = { ...leads[idx], ...updates, updatedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  return leads[idx];
}

export function deleteLead(id: string): void {
  const leads = getLeads().filter(l => l.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
}

// ===== Stats =====

export function getLeadStats(): LeadStats {
  const leads = getLeads();
  const byStatus: Record<LeadStatus, number> = {
    new: 0, contacted: 0, qualified: 0, proposal_sent: 0, won: 0, lost: 0,
  };
  let totalScore = 0;
  let totalKwp = 0;
  let totalInvestment = 0;
  let totalAnnualSavings = 0;

  for (const lead of leads) {
    byStatus[lead.status]++;
    totalScore += lead.leadScore;
    totalKwp += lead.estimatedSystemKwp;
    totalInvestment += lead.estimatedInvestment;
    totalAnnualSavings += lead.estimatedAnnualSavings;
  }

  return {
    total: leads.length,
    byStatus,
    avgScore: leads.length > 0 ? Math.round(totalScore / leads.length) : 0,
    totalKwp: Math.round(totalKwp * 10) / 10,
    totalInvestment: Math.round(totalInvestment),
    totalAnnualSavings: Math.round(totalAnnualSavings),
  };
}

// ===== Convert building to lead =====

const USABLE_ROOF_RATIO = 0.6;

export function buildingToLead(
  building: DiscoveredBuilding,
  enrichment: LeadEnrichment | null,
  zone: string | null,
  enrichedData?: EnrichedOwnerResult
): Lead {
  const usableArea = building.area * USABLE_ROOF_RATIO;
  const panelCount = Math.floor(usableArea / PANAMA_DEFAULTS.panelAreaM2);
  const systemKwp = (panelCount * PANAMA_DEFAULTS.panelWattage) / 1000;
  const annualKwh = systemKwp * PANAMA_DEFAULTS.peakSunHours * 365 * PANAMA_DEFAULTS.performanceRatio;
  const investment = systemKwp * PANAMA_DEFAULTS.costPerWp * 1000;
  const annualSavings = annualKwh * PANAMA_DEFAULTS.electricityRate * PANAMA_DEFAULTS.selfConsumptionRatio;
  const paybackYears = investment > 0 && annualSavings > 0 ? investment / annualSavings : 0;
  const co2Tons = (annualKwh / 1000) * PANAMA_DEFAULTS.gridEmissionFactor;

  const now = new Date().toISOString();

  // If enrichedData provided, merge into enrichment with all deep research fields
  let finalEnrichment: LeadEnrichment | null = enrichment;
  if (enrichedData) {
    finalEnrichment = {
      businessName: enrichedData.ownerName || enrichment?.businessName || null,
      phone: enrichedData.phone || enrichment?.phone || null,
      website: enrichedData.website || enrichment?.website || null,
      address: enrichedData.address || enrichment?.address || null,
      rating: enrichment?.rating ?? null,
      types: enrichment?.types ?? [],
      placeId: enrichment?.placeId ?? null,
      ownerName: enrichedData.ownerName || enrichment?.ownerName || null,
      email: enrichedData.email || enrichment?.email || null,
      socialMedia: enrichedData.socialMedia.facebook || enrichedData.socialMedia.instagram || enrichedData.socialMedia.linkedin
        ? {
            facebook: enrichedData.socialMedia.facebook || undefined,
            instagram: enrichedData.socialMedia.instagram || undefined,
            linkedin: enrichedData.socialMedia.linkedin || undefined,
          }
        : enrichment?.socialMedia ?? null,
      cadastre: enrichedData.cadastre ?? enrichment?.cadastre,
      businessLicense: enrichedData.businessLicense ?? enrichment?.businessLicense,
      corporateInfo: enrichedData.corporateInfo ?? enrichment?.corporateInfo,
      confidenceScore: enrichedData.confidenceScore ?? enrichment?.confidenceScore,
      enrichmentSources: enrichedData.enrichmentSources ?? enrichment?.enrichmentSources,
      registroPublicoUrl: enrichedData.registroPublicoUrl ?? enrichment?.registroPublicoUrl,
    };
  }

  const roundedSystemKwp = Math.round(systemKwp * 10) / 10;
  const roundedPayback = Math.round(paybackYears * 10) / 10;
  const financials = { paybackYears: roundedPayback, systemKwp: roundedSystemKwp };

  return {
    id: `lead-${building.osmId}-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
    osmId: building.osmId,
    buildingName: building.name || finalEnrichment?.businessName || 'Unknown Building',
    buildingType: building.buildingType,
    center: building.center,
    coordinates: building.coordinates,
    area: building.area,
    suitabilityScore: building.suitability.score,
    suitabilityGrade: building.suitability.grade,
    suitabilityFactors: building.suitability.factors,
    solarAnalysis: building.solarAnalysis || null,
    enrichment: finalEnrichment,
    estimatedSystemKwp: roundedSystemKwp,
    estimatedInvestment: Math.round(investment),
    estimatedAnnualSavings: Math.round(annualSavings),
    estimatedPaybackYears: roundedPayback,
    estimatedAnnualKwh: Math.round(annualKwh),
    estimatedCO2OffsetTons: Math.round(co2Tons * 10) / 10,
    status: 'new',
    leadScore: calculateLeadScore(building.suitability.score, finalEnrichment, financials),
    tags: [],
    notes: '',
    zone,
    lastResearchedAt: enrichedData?.researchedAt,
    researchConfidence: enrichedData?.confidenceScore,
  };
}

// ===== CSV Export =====

export function exportLeadsCSV(leads: Lead[]): string {
  const headers = [
    'Name', 'Type', 'Zone', 'Area (m2)', 'Lead Score', 'Grade',
    'System (kWp)', 'Investment ($)', 'Annual Savings ($)', 'Payback (yrs)',
    'Annual kWh', 'CO2 Offset (tons)', 'Status',
    'Owner Name', 'Business Name', 'Phone', 'Email', 'Website', 'Address',
    'Finca Number', 'Land Use', 'Business License', 'License Status',
    'Corporate Name', 'Officers', 'Confidence Score', 'Research Date',
    'Latitude', 'Longitude', 'Created Date',
  ];

  const escapeCSV = (val: string | number | null | undefined): string => {
    if (val == null) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = leads.map(lead => {
    const e = lead.enrichment;
    const officers = e?.corporateInfo?.officers?.map(o => `${o.name} (${o.role})`).join('; ');
    return [
      escapeCSV(lead.buildingName),
      escapeCSV(lead.buildingType),
      escapeCSV(lead.zone),
      escapeCSV(Math.round(lead.area)),
      escapeCSV(lead.leadScore),
      escapeCSV(lead.suitabilityGrade),
      escapeCSV(lead.estimatedSystemKwp),
      escapeCSV(lead.estimatedInvestment),
      escapeCSV(lead.estimatedAnnualSavings),
      escapeCSV(lead.estimatedPaybackYears),
      escapeCSV(lead.estimatedAnnualKwh),
      escapeCSV(lead.estimatedCO2OffsetTons),
      escapeCSV(lead.status),
      escapeCSV(e?.ownerName),
      escapeCSV(e?.businessName),
      escapeCSV(e?.phone),
      escapeCSV(e?.email),
      escapeCSV(e?.website),
      escapeCSV(e?.address),
      escapeCSV(e?.cadastre?.fincaNumber),
      escapeCSV(e?.cadastre?.landUse),
      escapeCSV(e?.businessLicense?.commercialName),
      escapeCSV(e?.businessLicense?.status),
      escapeCSV(e?.corporateInfo?.companyName),
      escapeCSV(officers),
      escapeCSV(lead.researchConfidence),
      escapeCSV(lead.lastResearchedAt?.split('T')[0]),
      escapeCSV(lead.center.lat),
      escapeCSV(lead.center.lng),
      escapeCSV(lead.createdAt.split('T')[0]),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
