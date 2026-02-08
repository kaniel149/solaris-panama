import {
  LayoutDashboard,
  FolderKanban,
  Users,
  FileText,
  Calendar,
  Activity,
  Settings,
  Calculator,
  ScanLine,
  Sparkles,
  Target,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  key: string;
  labelKey: string;
  icon: LucideIcon;
  path: string;
  badge?: number;
}

export const mainNavItems: NavItem[] = [
  { key: 'dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, path: '/' },
  { key: 'projects', labelKey: 'nav.projects', icon: FolderKanban, path: '/projects' },
  { key: 'clients', labelKey: 'nav.clients', icon: Users, path: '/clients' },
  { key: 'proposals', labelKey: 'nav.proposals', icon: FileText, path: '/proposals' },
  { key: 'calendar', labelKey: 'nav.calendar', icon: Calendar, path: '/calendar' },
  { key: 'monitoring', labelKey: 'nav.monitoring', icon: Activity, path: '/monitoring' },
  { key: 'leads', labelKey: 'nav.leads', icon: Target, path: '/leads' },
];

export const toolsNavItems: NavItem[] = [
  { key: 'calculator', labelKey: 'nav.calculator', icon: Calculator, path: '/tools/calculator' },
  { key: 'scanner', labelKey: 'nav.scanner', icon: ScanLine, path: '/tools/scanner' },
  { key: 'proposal-generator', labelKey: 'nav.proposalGenerator', icon: Sparkles, path: '/tools/proposal-generator' },
];

export const bottomNavItems: NavItem[] = [
  { key: 'settings', labelKey: 'nav.settings', icon: Settings, path: '/settings' },
];
