import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { Lead, LeadStatus, LeadStats } from '@/types/lead';
import {
  getLeads,
  saveLeads,
  updateLead,
  deleteLead as deleteLeadFromStorage,
  buildingToLead,
} from '@/services/leadStorageService';
import {
  enrichBuilding,
  batchEnrich,
  calculateLeadScore,
} from '@/services/leadEnrichmentService';
import { addActivity, getActivities } from '@/services/leadActivityService';
import { researchOwner, mergeOwnerResearch } from '@/services/ownerResearchService';
import type { LeadActivity } from '@/types/leadActivity';
import type { DiscoveredBuilding } from '@/hooks/useRoofScanner';

// ===== Hook =====

export function useLeadManager() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState<{ completed: number; total: number }>({ completed: 0, total: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'score' | 'date' | 'area' | 'name'>('score');

  // Ref to access current leads in stable callbacks without adding `leads` as dependency
  const leadsRef = useRef(leads);
  useEffect(() => { leadsRef.current = leads; }, [leads]);

  // Load leads from localStorage on mount
  useEffect(() => {
    setLeads(getLeads());
  }, []);

  // Sync leads to localStorage on every change
  useEffect(() => {
    if (leads.length > 0) {
      saveLeads(leads);
    }
  }, [leads]);

  // ===== Actions =====

  const createLeadFromBuilding = useCallback(
    (building: DiscoveredBuilding, zone?: string): Lead => {
      const lead = buildingToLead(building, null, zone || null);
      setLeads((prev) => {
        // Deduplicate by osmId
        if (prev.some((l) => l.osmId === building.osmId)) return prev;
        return [...prev, lead];
      });
      addActivity(lead.id, 'created', `Lead created from ${building.buildingType} building`);
      return lead;
    },
    []
  );

  const saveAllAsLeads = useCallback(
    (buildings: DiscoveredBuilding[], zone?: string): Lead[] => {
      let newLeads: Lead[] = [];
      setLeads((prev) => {
        const existingOsmIds = new Set(prev.map((l) => l.osmId));
        const newBuildings = buildings.filter((b) => !existingOsmIds.has(b.osmId));
        newLeads = newBuildings.map((b) => buildingToLead(b, null, zone || null));
        return newLeads.length > 0 ? [...prev, ...newLeads] : prev;
      });
      for (const lead of newLeads) {
        addActivity(lead.id, 'created', 'Lead created from batch scan');
      }
      return newLeads;
    },
    []
  );

  const enrichLead = useCallback(
    async (id: string): Promise<void> => {
      setIsEnriching(true);
      try {
        const lead = leadsRef.current.find((l) => l.id === id);
        if (!lead) return;

        const enrichment = await enrichBuilding(lead.center);
        const updatedScore = calculateLeadScore(lead.suitabilityScore, enrichment);

        setLeads((prev) =>
          prev.map((l) =>
            l.id === id
              ? { ...l, enrichment, leadScore: updatedScore, updatedAt: new Date().toISOString() }
              : l
          )
        );

        addActivity(id, 'enriched', enrichment?.businessName
          ? `Enriched with Google Places: ${enrichment.businessName}`
          : 'Enrichment attempted (no results)');
      } finally {
        setIsEnriching(false);
      }
    },
    []
  );

  const enrichAllLeads = useCallback(async (): Promise<void> => {
    const unenrichedLeads = leadsRef.current.filter((l) => !l.enrichment);
    if (unenrichedLeads.length === 0) return;

    setIsEnriching(true);
    setEnrichProgress({ completed: 0, total: unenrichedLeads.length });

    try {
      const buildingsToEnrich = unenrichedLeads.map((l) => ({
        id: l.id,
        center: l.center,
      }));

      const results = await batchEnrich(
        buildingsToEnrich,
        3,
        (completed, total) => setEnrichProgress({ completed, total })
      );

      setLeads((prev) =>
        prev.map((lead) => {
          if (!results.has(lead.id)) return lead;
          const enrichment = results.get(lead.id) || null;
          const updatedScore = calculateLeadScore(lead.suitabilityScore, enrichment);
          return {
            ...lead,
            enrichment,
            leadScore: updatedScore,
            updatedAt: new Date().toISOString(),
          };
        })
      );

      // Log activities for each enriched lead
      for (const [id, enrichment] of results) {
        addActivity(id, 'enriched', enrichment?.businessName
          ? `Batch enriched: ${enrichment.businessName}`
          : 'Batch enrichment (no results)');
      }
    } finally {
      setIsEnriching(false);
      setEnrichProgress({ completed: 0, total: 0 });
    }
  }, []);

  const researchLeadOwner = useCallback(async (id: string): Promise<void> => {
    setIsResearching(true);
    try {
      const lead = leadsRef.current.find((l) => l.id === id);
      if (!lead) return;

      const queryName = lead.enrichment?.businessName || lead.buildingName;
      const result = await researchOwner({
        buildingName: queryName,
        lat: lead.center.lat,
        lng: lead.center.lng,
        osmId: lead.osmId || 0,
        area: lead.area || 0,
      });

      if (result) {
        const merged = mergeOwnerResearch(
          lead.enrichment ? {
            ownerName: lead.enrichment.ownerName,
            email: lead.enrichment.email,
            phone: lead.enrichment.phone,
            socialMedia: lead.enrichment.socialMedia,
          } : null,
          result
        );

        setLeads((prev) =>
          prev.map((l) => {
            if (l.id !== id) return l;
            const updatedEnrichment = {
              ...(l.enrichment || {
                businessName: null,
                phone: null,
                website: null,
                address: null,
                rating: null,
                types: [],
                placeId: null,
                ownerName: null,
                email: null,
                socialMedia: null,
              }),
              ownerName: merged.ownerName,
              email: merged.email,
              phone: merged.phone || l.enrichment?.phone || null,
              website: result.website || l.enrichment?.website || null,
              socialMedia: merged.socialMedia,
            };
            const updatedScore = calculateLeadScore(l.suitabilityScore, updatedEnrichment);
            return {
              ...l,
              enrichment: updatedEnrichment,
              leadScore: updatedScore,
              updatedAt: new Date().toISOString(),
            };
          })
        );

        const sources = result.sources.join(', ') || 'no sources';
        addActivity(id, 'owner_researched',
          result.ownerName
            ? `Owner found: ${result.ownerName} (${sources})`
            : `Owner research completed (${sources})`
        );
      } else {
        addActivity(id, 'owner_researched', 'Owner research: no results found');
      }
    } finally {
      setIsResearching(false);
    }
  }, []);

  const updateLeadStatus = useCallback((id: string, status: LeadStatus): void => {
    const lead = leadsRef.current.find((l) => l.id === id);
    const oldStatus = lead?.status || 'unknown';

    setLeads((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, status, updatedAt: new Date().toISOString() } : l
      )
    );
    updateLead(id, { status });

    addActivity(id, 'status_changed', `Status: ${oldStatus} \u2192 ${status}`);
  }, []);

  const updateLeadNotes = useCallback((id: string, notes: string): void => {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, notes, updatedAt: new Date().toISOString() } : l
      )
    );
    updateLead(id, { notes });

    addActivity(id, 'note_added', 'Notes updated');
  }, []);

  const addLeadTag = useCallback((id: string, tag: string): void => {
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id !== id || l.tags.includes(tag)) return l;
        return { ...l, tags: [...l.tags, tag], updatedAt: new Date().toISOString() };
      })
    );

    addActivity(id, 'tag_added', `Tag added: ${tag}`);
  }, []);

  const removeLeadTag = useCallback((id: string, tag: string): void => {
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        return {
          ...l,
          tags: l.tags.filter((t) => t !== tag),
          updatedAt: new Date().toISOString(),
        };
      })
    );

    addActivity(id, 'tag_removed', `Tag removed: ${tag}`);
  }, []);

  const logCallMade = useCallback((id: string, phone: string): void => {
    addActivity(id, 'call_made', `Called ${phone}`);
  }, []);

  const logWhatsAppSent = useCallback((id: string, phone: string): void => {
    addActivity(id, 'whatsapp_sent', `WhatsApp message to ${phone}`);
  }, []);

  const logExported = useCallback((id: string): void => {
    addActivity(id, 'exported', 'Lead data exported');
  }, []);

  const getLeadActivities = useCallback((leadId: string): LeadActivity[] => {
    return getActivities(leadId);
  }, []);

  const deleteLead = useCallback((id: string): void => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    deleteLeadFromStorage(id);
    setSelectedLeadId((prev) => (prev === id ? null : prev));
  }, []);

  // ===== Computed =====

  const selectedLead = useMemo(
    () => leads.find((l) => l.id === selectedLeadId) ?? null,
    [leads, selectedLeadId]
  );

  const filteredLeads = useMemo(() => {
    let result = leads;

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter((l) => l.status === statusFilter);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.buildingName.toLowerCase().includes(q) ||
          l.buildingType.toLowerCase().includes(q) ||
          l.enrichment?.businessName?.toLowerCase().includes(q) ||
          l.enrichment?.address?.toLowerCase().includes(q) ||
          l.enrichment?.ownerName?.toLowerCase().includes(q) ||
          l.zone?.toLowerCase().includes(q) ||
          l.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Sort
    switch (sortBy) {
      case 'score':
        result = [...result].sort((a, b) => b.leadScore - a.leadScore);
        break;
      case 'date':
        result = [...result].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case 'area':
        result = [...result].sort((a, b) => b.area - a.area);
        break;
      case 'name':
        result = [...result].sort((a, b) =>
          a.buildingName.localeCompare(b.buildingName)
        );
        break;
    }

    return result;
  }, [leads, statusFilter, searchQuery, sortBy]);

  const stats = useMemo((): LeadStats => {
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
  }, [leads]);

  return {
    // State
    leads: filteredLeads,
    allLeads: leads,
    selectedLead,
    selectedLeadId,
    isEnriching,
    isResearching,
    enrichProgress,
    searchQuery,
    statusFilter,
    sortBy,
    stats,

    // Setters
    setSelectedLeadId,
    setSearchQuery,
    setStatusFilter,
    setSortBy,

    // Actions
    createLeadFromBuilding,
    saveAllAsLeads,
    enrichLead,
    enrichAllLeads,
    researchLeadOwner,
    updateLeadStatus,
    updateLeadNotes,
    addLeadTag,
    removeLeadTag,
    logCallMade,
    logWhatsAppSent,
    logExported,
    getLeadActivities,
    deleteLead,
  };
}
