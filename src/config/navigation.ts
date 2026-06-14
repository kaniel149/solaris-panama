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
  MessageCircle,
  Map,
  MapPin,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  key: string;
  labelKey: string;
  icon: LucideIcon;
  path: string;
  badge?: number;
}

export interface NavGroup {
  key: string;
  labelKey: string;
  items: NavItem[];
}

// ── CRM group ──────────────────────────────────────────────────────────────
export const crmNavItems: NavItem[] = [
  { key: 'dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { key: 'crm-leads', labelKey: 'nav.crmLeads', icon: MessageCircle, path: '/crm-leads' },
  { key: 'clients', labelKey: 'nav.clients', icon: Users, path: '/clients' },
  { key: 'proposals', labelKey: 'nav.proposals', icon: FileText, path: '/proposals' },
  { key: 'projects', labelKey: 'nav.projects', icon: FolderKanban, path: '/projects' },
  { key: 'calendar', labelKey: 'nav.calendar', icon: Calendar, path: '/calendar' },
  { key: 'monitoring', labelKey: 'nav.monitoring', icon: Activity, path: '/monitoring' },
  // Lead Pipeline (scanner-based, kanban view) — distinct from CRM Leads above
  { key: 'leads', labelKey: 'nav.leads', icon: Target, path: '/leads' },
];

// ── Maps & Tools group ─────────────────────────────────────────────────────
export const toolsNavItems: NavItem[] = [
  { key: 'scanner', labelKey: 'nav.scanner', icon: ScanLine, path: '/tools/scanner' },
  { key: 'mapa-comercial', labelKey: 'nav.mapaComercial', icon: MapPin, path: '/mapa-comercial' },
  { key: 'mapa-solar', labelKey: 'nav.mapaSolar', icon: Map, path: '/mapa-solar' },
  { key: 'calculator', labelKey: 'nav.calculator', icon: Calculator, path: '/tools/calculator' },
  { key: 'proposal-generator', labelKey: 'nav.proposalGenerator', icon: Sparkles, path: '/tools/proposal-generator' },
];

// ── Bottom items (always visible) ──────────────────────────────────────────
export const bottomNavItems: NavItem[] = [
  { key: 'settings', labelKey: 'nav.settings', icon: Settings, path: '/settings' },
];

// ── Grouped structure for sidebar rendering ────────────────────────────────
export const navGroups: NavGroup[] = [
  { key: 'crm', labelKey: 'nav.groupCrm', items: crmNavItems },
  { key: 'maps-tools', labelKey: 'nav.groupMapsTools', items: toolsNavItems },
];

// Legacy alias — kept for any remaining imports in MobileDrawer/tests
export const mainNavItems = crmNavItems;
