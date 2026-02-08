import type { TeamMember } from './team';

export interface Client {
  id: string;
  company_name: string;
  contact_name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  sector: string | null;
  monthly_bill: number | null;
  source: string | null;
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  assigned_member?: TeamMember;
  projects_count?: number;
}

export type ClientInsert = Omit<Client, 'id' | 'created_at' | 'updated_at' | 'assigned_member' | 'projects_count'>;
export type ClientUpdate = Partial<ClientInsert>;

export interface ClientFilters {
  search?: string;
  sector?: string;
  assignedTo?: string;
  city?: string;
  page?: number;
  limit?: number;
}
