import { useState, useCallback, useMemo, useEffect } from 'react';
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
import type { DiscoveredBuilding } from '@/hooks/useRoofScanner';

// ===== Hook =====

export function useLeadManager() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState<{ completed: number; total: number }>({ completed: 0, total: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'score' | 'date' | 'area' | 'name'>('score');

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
      return lead;
    },
    []
  );

  const saveAllAsLeads = useCallback(
    (buildings: DiscoveredBuilding[], zone?: string): Lead[] => {
      const existingOsmIds = new Set(leads.map((l) => l.osmId));
      const newBuildings = buildings.filter((b) => !existingOsmIds.has(b.osmId));
      const newLeads = newBuildings.map((b) => buildingToLead(b, null, zone || null));

      if (newLeads.length > 0) {
        setLeads((prev) => [...prev, ...newLeads]);
      }

      return newLeads;
    },
    [leads]
  );

  const enrichLead = useCallback(
    async (id: string): Promise<void> => {
      setIsEnriching(true);
      try {
        const lead = leads.find((l) => l.id === id);
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
      } finally {
        setIsEnriching(false);
      }
    },
    [leads]
  );

  const enrichAllLeads = useCallback(async (): Promise<void> => {
    const unenrichedLeads = leads.filter((l) => !l.enrichment);
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
    } finally {
      setIsEnriching(false);
      setEnrichProgress({ completed: 0, total: 0 });
    }
  }, [leads]);

  const updateLeadStatus = useCallback((id: string, status: LeadStatus): void => {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, status, updatedAt: new Date().toISOString() } : l
      )
    );
    updateLead(id, { status });
  }, []);

  const updateLeadNotes = useCallback((id: string, notes: string): void => {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, notes, updatedAt: new Date().toISOString() } : l
      )
    );
    updateLead(id, { notes });
  }, []);

  const addLeadTag = useCallback((id: string, tag: string): void => {
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id !== id || l.tags.includes(tag)) return l;
        return { ...l, tags: [...l.tags, tag], updatedAt: new Date().toISOString() };
      })
    );
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
    updateLeadStatus,
    updateLeadNotes,
    addLeadTag,
    removeLeadTag,
    deleteLead,
  };
}
