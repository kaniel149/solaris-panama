export type InstallationStatus = 'planned' | 'in_progress' | 'completed' | 'delayed';

export interface InstallationPhoto {
  url: string;
  caption: string | null;
  taken_at: string;
}

export interface Installation {
  id: string;
  project_id: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  status: InstallationStatus;
  crew_lead: string | null;
  notes: string | null;
  photos: InstallationPhoto[] | null;
  created_at: string;
  updated_at: string;
}

export type InstallationInsert = Omit<Installation, 'id' | 'created_at' | 'updated_at'>;
export type InstallationUpdate = Partial<InstallationInsert>;

export interface InstallationFilters {
  status?: InstallationStatus;
  crewLead?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}
