export type ActivityType =
  | 'call'
  | 'email'
  | 'meeting'
  | 'note'
  | 'stage_change'
  | 'proposal_sent'
  | 'proposal_accepted'
  | 'proposal_rejected'
  | 'permit_submitted'
  | 'permit_approved'
  | 'installation_started'
  | 'installation_completed'
  | 'document_uploaded'
  | 'site_visit'
  | 'payment_received';

export interface ActivityMetadata {
  from_stage?: string;
  to_stage?: string;
  proposal_id?: string;
  permit_id?: string;
  document_id?: string;
  amount?: number;
  duration_minutes?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface Activity {
  id: string;
  project_id: string | null;
  client_id: string | null;
  user_id: string;
  type: ActivityType;
  title: string;
  description: string | null;
  metadata: ActivityMetadata | null;
  created_at: string;
  // Joined
  user?: { full_name: string; avatar_url: string | null };
}

export type ActivityInsert = Omit<Activity, 'id' | 'created_at' | 'user'>;
