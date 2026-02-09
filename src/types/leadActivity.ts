// Lead Activity Types — tracks all actions performed on a lead

export type LeadActivityType =
  | 'created'
  | 'enriched'
  | 'owner_researched'
  | 'status_changed'
  | 'note_added'
  | 'tag_added'
  | 'tag_removed'
  | 'call_made'
  | 'whatsapp_sent'
  | 'exported'
  | 'proposal_generated'
  | 'proposal_sent';

export interface LeadActivity {
  id: string;
  leadId: string;
  type: LeadActivityType;
  description: string;
  metadata?: Record<string, string>;
  timestamp: string;
}

export const ACTIVITY_ICON_MAP: Record<LeadActivityType, string> = {
  created: 'Plus',
  enriched: 'Sparkles',
  owner_researched: 'Search',
  status_changed: 'ArrowRight',
  note_added: 'FileText',
  tag_added: 'Tag',
  tag_removed: 'X',
  call_made: 'Phone',
  whatsapp_sent: 'MessageCircle',
  exported: 'Download',
  proposal_generated: 'FileText',
  proposal_sent: 'Send',
};

export const ACTIVITY_COLOR_MAP: Record<LeadActivityType, string> = {
  created: '#0ea5e9',
  enriched: '#8b5cf6',
  owner_researched: '#00ffcc',
  status_changed: '#f59e0b',
  note_added: '#8888a0',
  tag_added: '#22c55e',
  tag_removed: '#ef4444',
  call_made: '#22c55e',
  whatsapp_sent: '#25d366',
  exported: '#8888a0',
  proposal_generated: '#8b5cf6',
  proposal_sent: '#00ffcc',
};
