export type NotificationType =
  | 'new_lead'
  | 'stage_change'
  | 'proposal_viewed'
  | 'proposal_accepted'
  | 'proposal_rejected'
  | 'permit_approved'
  | 'permit_rejected'
  | 'installation_scheduled'
  | 'installation_completed'
  | 'site_offline'
  | 'payment_received'
  | 'task_assigned'
  | 'mention';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export type NotificationInsert = Omit<Notification, 'id' | 'created_at'>;
