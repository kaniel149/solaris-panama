export type ProposalStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected';

export interface Proposal {
  id: string;
  project_id: string;
  version: number;
  system_size_kwp: number | null;
  panel_count: number | null;
  panel_model: string | null;
  inverter_model: string | null;
  total_cost: number | null;
  annual_savings: number | null;
  payback_years: number | null;
  irr: number | null;
  npv: number | null;
  co2_offset_tons: number | null;
  pdf_url: string | null;
  status: ProposalStatus;
  ai_generated: boolean;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ProposalInsert = Omit<Proposal, 'id' | 'created_at' | 'updated_at'>;
export type ProposalUpdate = Partial<ProposalInsert>;

export interface ProposalFilters {
  projectId?: string;
  status?: ProposalStatus;
  page?: number;
  limit?: number;
}
