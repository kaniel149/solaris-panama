export const PIPELINE_STAGES = [
  { key: 'lead', color: '#8888a0', icon: 'UserPlus' },
  { key: 'qualified', color: '#0ea5e9', icon: 'CheckCircle' },
  { key: 'site_survey', color: '#8b5cf6', icon: 'MapPin' },
  { key: 'proposal', color: '#f59e0b', icon: 'FileText' },
  { key: 'negotiation', color: '#f97316', icon: 'MessageSquare' },
  { key: 'won', color: '#22c55e', icon: 'Trophy' },
  { key: 'permitting', color: '#06b6d4', icon: 'Shield' },
  { key: 'procurement', color: '#3b82f6', icon: 'Package' },
  { key: 'installation', color: '#8b5cf6', icon: 'Wrench' },
  { key: 'commissioning', color: '#00ffcc', icon: 'Zap' },
  { key: 'monitoring', color: '#22c55e', icon: 'Activity' },
  { key: 'closed_lost', color: '#ef4444', icon: 'XCircle' },
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number]['key'];

export const ROLES = ['admin', 'sales', 'engineer', 'installer'] as const;
export type Role = (typeof ROLES)[number];

export const SECTORS = [
  'commercial',
  'industrial',
  'hospitality',
  'retail',
  'healthcare',
  'education',
  'government',
  'residential_complex',
  'warehouse',
  'other',
] as const;

export const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

export const LEAD_SOURCES = [
  'referral',
  'website',
  'cold_call',
  'whatsapp',
  'event',
  'social_media',
  'partner',
] as const;

export const PERMIT_TYPES = [
  'asep_interconnection',
  'municipal',
  'environmental',
  'electrical',
] as const;

export const MONITORING_PLATFORMS = [
  'solaredge',
  'huawei',
  'sungrow',
  'enphase',
] as const;
