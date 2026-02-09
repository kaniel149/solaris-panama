// Hook for managing proposals linked to a specific lead

import { useState, useCallback, useEffect } from 'react';
import type { Lead } from '@/types/lead';
import type { ProposalInput } from '@/services/proposalGeneratorService';
import { generateProposal as generateAIProposal } from '@/services/proposalGeneratorService';
import {
  saveProposal,
  getProposalsForLead,
  updateProposalStatus,
  deleteProposal as deleteProposalFromStorage,
  type StoredProposal,
} from '@/services/leadProposalService';
import { addActivity } from '@/services/leadActivityService';
import { PANAMA_DEFAULTS } from '@/services/solarCalculator';

// ===== Helpers =====

function buildClientName(lead: Lead): string {
  return (
    lead.enrichment?.businessName ||
    lead.enrichment?.ownerName ||
    lead.buildingName ||
    'Unknown Client'
  );
}

function mapBuildingTypeToSector(buildingType: string): string {
  const map: Record<string, string> = {
    commercial: 'Office',
    retail: 'Supermarket',
    industrial: 'Factory',
    warehouse: 'Warehouse',
    hotel: 'Hotel',
    hospital: 'Hospital',
    restaurant: 'Restaurant',
    office: 'Office',
    residential: 'Other',
    school: 'Other',
    university: 'Other',
  };
  return map[buildingType.toLowerCase()] || 'Other';
}

function calculateFinancialMetrics(lead: Lead) {
  const investment = lead.estimatedInvestment;
  const annualSavings = lead.estimatedAnnualSavings;
  const annualKwh = lead.estimatedAnnualKwh;
  const escalation = PANAMA_DEFAULTS.rateEscalation;
  const discount = PANAMA_DEFAULTS.discountRate;
  const lifetime = PANAMA_DEFAULTS.systemLifetime;

  // IRR approximation — find rate where NPV=0 using bisection
  let irrLow = 0;
  let irrHigh = 1;
  for (let iter = 0; iter < 50; iter++) {
    const mid = (irrLow + irrHigh) / 2;
    let npvTest = -investment;
    for (let y = 1; y <= lifetime; y++) {
      const cashflow = annualSavings * Math.pow(1 + escalation, y - 1);
      npvTest += cashflow / Math.pow(1 + mid, y);
    }
    if (npvTest > 0) irrLow = mid;
    else irrHigh = mid;
  }
  const irr = (irrLow + irrHigh) / 2;

  // NPV
  let npv = -investment;
  let lifetimeSavings = 0;
  let totalProductionKwh = 0;
  for (let y = 1; y <= lifetime; y++) {
    const yearSavings = annualSavings * Math.pow(1 + escalation, y - 1);
    npv += yearSavings / Math.pow(1 + discount, y);
    lifetimeSavings += yearSavings;
    totalProductionKwh += annualKwh * Math.pow(1 - PANAMA_DEFAULTS.degradationRate, y - 1);
  }

  // LCOE
  const lcoe = totalProductionKwh > 0 ? investment / totalProductionKwh : 0;

  // ROI
  const roi25Year = investment > 0 ? ((lifetimeSavings - investment) / investment) * 100 : 0;

  return { irr, npv, lcoe, roi25Year, lifetimeSavings, totalProductionKwh };
}

function leadToProposalInput(lead: Lead, language: 'en' | 'es'): ProposalInput {
  const metrics = calculateFinancialMetrics(lead);
  const selfConsumedPct = Math.round(PANAMA_DEFAULTS.selfConsumptionRatio * 100);
  const exportedPct = 100 - selfConsumedPct;
  const annualCO2 = lead.estimatedCO2OffsetTons;
  const monthlySavings = lead.estimatedAnnualSavings / 12;
  const usableArea = Math.round(lead.area * 0.6);
  const panelCount = Math.floor(usableArea / PANAMA_DEFAULTS.panelAreaM2);

  return {
    clientName: buildClientName(lead),
    contactName: lead.enrichment?.ownerName || '',
    clientEmail: lead.enrichment?.email || undefined,
    clientPhone: lead.enrichment?.phone || undefined,
    sector: mapBuildingTypeToSector(lead.buildingType),
    buildingName: lead.buildingName,
    buildingAddress: lead.enrichment?.address || `${lead.center.lat.toFixed(5)}, ${lead.center.lng.toFixed(5)}`,
    roofAreaM2: Math.round(lead.area),
    usableAreaM2: usableArea,
    roofType: 'Flat concrete',
    systemSizeKwp: lead.estimatedSystemKwp,
    panelCount,
    panelModel: 'LONGi Hi-MO 7 580W',
    inverterModel: 'Huawei SUN2000',
    totalInvestment: lead.estimatedInvestment,
    annualSavings: lead.estimatedAnnualSavings,
    monthlySavings: Math.round(monthlySavings),
    paybackYears: lead.estimatedPaybackYears,
    irr: metrics.irr,
    npv: metrics.npv,
    roi25Year: metrics.roi25Year,
    lcoe: metrics.lcoe,
    year1ProductionKwh: lead.estimatedAnnualKwh,
    lifetimeSavings: metrics.lifetimeSavings,
    annualCO2OffsetTons: annualCO2,
    lifetimeCO2OffsetTons: annualCO2 * PANAMA_DEFAULTS.systemLifetime * 0.9,
    equivalentTrees: Math.round(annualCO2 * PANAMA_DEFAULTS.treesPerTonCO2),
    selfConsumedPct,
    exportedPct,
    language,
    roofScanSource: lead.solarAnalysis ? 'google_solar' : undefined,
  };
}

// ===== Hook =====

export function useLeadProposal(leadId: string, lead: Lead | null) {
  const [proposals, setProposals] = useState<StoredProposal[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load proposals for this lead
  useEffect(() => {
    if (leadId) {
      setProposals(getProposalsForLead(leadId));
    }
  }, [leadId]);

  const latestProposal = proposals.length > 0 ? proposals[0] : null;

  const generateProposal = useCallback(
    async (language: 'en' | 'es'): Promise<StoredProposal | null> => {
      if (!lead) return null;
      setIsGenerating(true);
      setError(null);

      try {
        const input = leadToProposalInput(lead, language);
        const generated = await generateAIProposal(input);

        const currentVersion = proposals.length > 0 ? Math.max(...proposals.map((p) => p.version)) : 0;
        const usableArea = Math.round(lead.area * 0.6);
        const panelCount = Math.floor(usableArea / PANAMA_DEFAULTS.panelAreaM2);

        const stored: StoredProposal = {
          id: generated.id,
          leadId,
          version: currentVersion + 1,
          status: 'draft',
          generatedAt: generated.generatedAt,
          language: generated.language,
          coverTitle: generated.coverTitle,
          coverSubtitle: generated.coverSubtitle,
          sections: generated.sections,
          clientName: generated.clientName,
          systemKwp: generated.systemSizeKwp,
          totalInvestment: generated.totalInvestment,
          annualSavings: generated.annualSavings,
          paybackYears: generated.paybackYears,
          annualCO2Tons: lead.estimatedCO2OffsetTons,
          panelCount,
        };

        saveProposal(stored);
        setProposals(getProposalsForLead(leadId));

        addActivity(leadId, 'proposal_generated', `Proposal v${stored.version} generated (${language.toUpperCase()})`);

        return stored;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to generate proposal';
        setError(msg);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [lead, leadId, proposals]
  );

  const regenerateProposal = useCallback(
    async (): Promise<StoredProposal | null> => {
      const lang = latestProposal?.language || 'en';
      return generateProposal(lang);
    },
    [generateProposal, latestProposal]
  );

  const buildWhatsAppMessage = useCallback(
    (proposalId: string): string => {
      const proposal = proposals.find((p) => p.id === proposalId);
      if (!proposal) return '';

      const co2 = lead ? lead.estimatedCO2OffsetTons : 0;
      const metrics = lead ? calculateFinancialMetrics(lead) : null;
      const panelCount = lead ? Math.floor(Math.round(lead.area * 0.6) / PANAMA_DEFAULTS.panelAreaM2) : 0;

      const lines = [
        `Propuesta Solar - ${proposal.clientName}`,
        '',
        `Sistema: ${proposal.systemKwp} kWp (${panelCount} paneles)`,
        `Inversion: $${proposal.totalInvestment.toLocaleString('en-US')}`,
        `Ahorro anual: $${proposal.annualSavings.toLocaleString('en-US')}`,
        `Recuperacion: ${proposal.paybackYears.toFixed(1)} anos`,
        `CO2: ${co2.toFixed(1)} tons/ano reduccion`,
        '',
        ...(metrics ? [`ROI 25 anos: ${metrics.roi25Year.toFixed(0)}%`, `IRR: ${(metrics.irr * 100).toFixed(1)}%`] : []),
        '',
        'Generado por Solaris Panama',
      ];

      return lines.join('\n');
    },
    [proposals, lead]
  );

  const updateStatus = useCallback(
    (proposalId: string, status: StoredProposal['status']): void => {
      const sentAt = status === 'sent' ? new Date().toISOString() : undefined;
      updateProposalStatus(proposalId, status, sentAt);
      setProposals(getProposalsForLead(leadId));

      if (status === 'sent') {
        addActivity(leadId, 'proposal_sent', `Proposal sent to client`);
      }
    },
    [leadId]
  );

  const removeProposal = useCallback(
    (proposalId: string): void => {
      deleteProposalFromStorage(proposalId);
      setProposals(getProposalsForLead(leadId));
    },
    [leadId]
  );

  return {
    proposals,
    latestProposal,
    isGenerating,
    error,
    generateProposal,
    regenerateProposal,
    buildWhatsAppMessage,
    updateStatus,
    deleteProposal: removeProposal,
  };
}
