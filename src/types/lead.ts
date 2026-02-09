import type { RoofScanResult } from '@/services/roofScannerService';

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'won' | 'lost';

export interface LeadEnrichment {
  businessName: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  rating: number | null;
  types: string[];
  placeId: string | null;
  // Owner research fields
  ownerName: string | null;
  email: string | null;
  socialMedia: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  } | null;
}

export interface Lead {
  id: string;
  createdAt: string;
  updatedAt: string;
  // Building data (snapshot from scanner)
  osmId: number;
  buildingName: string;
  buildingType: string;
  center: { lat: number; lng: number };
  coordinates: Array<{ lat: number; lon: number }>;
  area: number; // m²
  suitabilityScore: number;
  suitabilityGrade: string;
  suitabilityFactors: Record<string, number>;
  solarAnalysis: RoofScanResult | null;
  // Enrichment (Google Places)
  enrichment: LeadEnrichment | null;
  // Financial estimates
  estimatedSystemKwp: number;
  estimatedInvestment: number;
  estimatedAnnualSavings: number;
  estimatedPaybackYears: number;
  estimatedAnnualKwh: number;
  estimatedCO2OffsetTons: number;
  // Pipeline
  status: LeadStatus;
  leadScore: number; // 0-100 composite
  tags: string[];
  notes: string;
  zone: string | null;
}

export interface LeadZone {
  id: string;
  name: string;
  nameEs: string;
  center: { lat: number; lng: number };
  bounds: { north: number; south: number; east: number; west: number };
  description: string;
  descriptionEs: string;
  color: string;
}

export interface LeadStats {
  total: number;
  byStatus: Record<LeadStatus, number>;
  avgScore: number;
  totalKwp: number;
  totalInvestment: number;
  totalAnnualSavings: number;
}

export const LEAD_STATUS_CONFIG: Record<LeadStatus, { label: string; labelEs: string; color: string; bgColor: string }> = {
  new: { label: 'New', labelEs: 'Nuevo', color: '#0ea5e9', bgColor: 'rgba(14,165,233,0.1)' },
  contacted: { label: 'Contacted', labelEs: 'Contactado', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.1)' },
  qualified: { label: 'Qualified', labelEs: 'Calificado', color: '#8b5cf6', bgColor: 'rgba(139,92,246,0.1)' },
  proposal_sent: { label: 'Proposal Sent', labelEs: 'Propuesta Enviada', color: '#00ffcc', bgColor: 'rgba(0,255,204,0.1)' },
  won: { label: 'Won', labelEs: 'Ganado', color: '#22c55e', bgColor: 'rgba(34,197,94,0.1)' },
  lost: { label: 'Lost', labelEs: 'Perdido', color: '#ef4444', bgColor: 'rgba(239,68,68,0.1)' },
};

export const LEAD_KANBAN_COLUMNS: LeadStatus[] = ['new', 'contacted', 'qualified', 'proposal_sent', 'won', 'lost'];
