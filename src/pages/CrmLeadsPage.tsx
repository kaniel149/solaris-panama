import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  MessageCircle,
  Phone,
  RefreshCw,
  Plus,
  Search,
  Clock,
  Globe,
  Instagram,
  Facebook,
  X,
  Send,
  CalendarDays,
  Bell,
  CheckCircle2,
  XCircle,
  TrendingUp,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { useTeam } from '@/hooks/useTeam';
import { LEAD_STATUS_CONFIG } from '@/types/lead';
import {
  getLeads,
  updateLead,
  createLead,
  addLeadNote,
  getLeadNotes,
  getLeadStats,
  getDistinctZones,
  isInAzueroRegion,
  isStaleLead,
  markLeadWon,
  enqueueWhatsAppMessage,
  type CrmLead,
  type LeadNote,
} from '@/services/leadService';
import {
  listEventsForLead,
  createEvent,
  updateEventStatus,
  deleteEvent,
  getUpcomingFollowUps,
  type LeadEvent,
  type EventType,
} from '@/services/leadEventsService';
import {
  getStatusHistory,
  getStatusHistoryBulk,
  buildJourney,
  buildTimeline,
  computeFunnel,
  JOURNEY_STAGES,
  type StatusHistoryRow,
  type TimelineItem,
  type FunnelStageStats,
} from '@/services/journeyService';

const cn = (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' ');

// Two-letter initials from a full name (falls back to an email local-part).
const initialsOf = (label: string) =>
  (label || '?')
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || '?';

// Sentinel used by the "Asignado" dropdown to filter for leads with no owner.
const UNASSIGNED = '__unassigned__';

// Labels + colors for the shared pipeline statuses derive from LEAD_STATUS_CONFIG
// (src/types/lead.ts) — the single source of truth — mapped into the CRM's
// { label, color, bg } shape using the Spanish (labelEs) labels. CRM-only statuses
// that are not part of the shared LeadStatus type are appended afterwards.
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ...Object.fromEntries(
    Object.entries(LEAD_STATUS_CONFIG).map(([k, v]) => [
      k,
      { label: v.labelEs, color: v.color, bg: v.bgColor },
    ])
  ),
  // CRM-only statuses (temperature buckets + junk) — not sales-pipeline stages.
  cold: { label: 'Frío', color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  warm: { label: 'Tibio', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  hot: { label: 'Caliente', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  not_a_lead: { label: 'No es Lead', color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
};

// Statuses excluded from default pipeline view (vendors, partners, junk)
const NON_CUSTOMER_STATUSES = ['vendor', 'partner', 'not_a_lead'];
const SYSTEM_TEST_SOURCES = ['debug_test', 'capi_verify'];

const SOURCE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  google_ads: { label: 'Google Lead Form', icon: <Globe className="w-3 h-3" />, color: '#4285f4' },
  lp_azuero: { label: 'Google Ads LP', icon: <Globe className="w-3 h-3" />, color: '#D4A843' },
  meta_ads: { label: 'Meta Lead Ads', icon: <Facebook className="w-3 h-3" />, color: '#1877f2' },
  facebook: { label: 'Facebook', icon: <Facebook className="w-3 h-3" />, color: '#1877f2' },
  instagram: { label: 'Instagram', icon: <Instagram className="w-3 h-3" />, color: '#e4405f' },
  whatsapp: { label: 'WhatsApp', icon: <MessageCircle className="w-3 h-3" />, color: '#25d366' },
  website: { label: 'Website', icon: <Globe className="w-3 h-3" />, color: '#D4A843' },
  manual: { label: 'Manual', icon: <Plus className="w-3 h-3" />, color: '#8888a0' },
  referral: { label: 'Referral', icon: <Users className="w-3 h-3" />, color: '#22c55e' },
  cold_call: { label: 'Cold call', icon: <Phone className="w-3 h-3" />, color: '#0ea5e9' },
  event: { label: 'Event', icon: <Users className="w-3 h-3" />, color: '#f59e0b' },
  debug_test: { label: 'Debug Test', icon: <Globe className="w-3 h-3" />, color: '#64748b' },
  capi_verify: { label: 'CAPI Verify', icon: <Facebook className="w-3 h-3" />, color: '#64748b' },
};

// Selectable statuses — legacy cold/warm/hot were unified into the canonical
// funnel (migration 061); they stay in STATUS_CONFIG only for history rendering.
const STATUSES = ['new', 'contacted', 'qualified', 'proposal_sent', 'won', 'lost', 'vendor', 'partner', 'not_a_lead'];

// Virtual filters — computed client-side, not real DB statuses. They must never
// appear in the row/detail status pickers (those change the real lead.status).
const VIRTUAL_STATUSES = [
  { value: 'vencidos', label: 'Vencidos' },
  { value: 'seguimiento', label: 'En seguimiento' },
];
const VIRTUAL_STATUS_VALUES = VIRTUAL_STATUSES.map((v) => v.value);

const PANAMA_PROVINCES = [
  'Panamá', 'Panamá Oeste', 'Colón', 'Coclé', 'Chiriquí',
  'Herrera', 'Los Santos', 'Veraguas', 'Bocas del Toro', 'Darién',
];

// Regional / district zone labels layered on top of the provinces so sales can
// filter by how they actually talk about the territory (Azuero peninsula, etc).
const EXTRA_ZONES = ['Azuero', 'Las Tablas', 'Chitré', 'Pedasí'];

export default function CrmLeadsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { members } = useTeam();
  const [searchParams] = useSearchParams();
  const myEmail = user?.email ?? '';
  // Note author = the signed-in user (falls back to email, then a generic label).
  const authorName =
    (user?.user_metadata?.full_name as string | undefined) || user?.email || 'Admin';
  const memberByEmail = useMemo(() => {
    const map: Record<string, (typeof members)[number]> = {};
    for (const m of members) map[m.email] = m;
    return map;
  }, [members]);

  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(''); // used in fetch deps; input stays instant
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState(''); // '' = Todos · UNASSIGNED · member email
  const [myLeadsOnly, setMyLeadsOnly] = useState(false);
  const [showNonCustomers, setShowNonCustomers] = useState(false); // hide vendors/partners/not_a_lead by default
  const [dbZones, setDbZones] = useState<string[]>([]); // distinct zones from the whole table
  const [followUpMap, setFollowUpMap] = useState<Record<string, string>>({}); // lead_id → next follow-up date

  // Latest-request-wins guard: only the newest fetchLeads() may commit results.
  const fetchIdRef = useRef(0);

  // Initialise the status filter from ?status=… (e.g. drilled in from the dashboard).
  useEffect(() => {
    const qsStatus = searchParams.get('status');
    if (qsStatus) setStatusFilter(qsStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce the search box so we refetch ~300ms after typing stops.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  // Distinct zones from the full table (not just the loaded page).
  useEffect(() => {
    getDistinctZones().then(setDbZones).catch(() => {});
  }, []);
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    contacted: 0,
    qualified: 0,
    proposal_sent: 0,
    won: 0,
    lost: 0,
    stale: 0,
    bySource: {} as Record<string, number>,
  });

  // Detail panel
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [addingLead, setAddingLead] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({ name: '', phone: '', source: 'manual' });

  // Lead events
  const [leadEvents, setLeadEvents] = useState<LeadEvent[]>([]);
  const [showEventModal, setShowEventModal] = useState<EventType | null>(null);
  const [eventForm, setEventForm] = useState({ title: '', startsAt: '', notes: '' });

  // Customer journey
  const [statusHistory, setStatusHistory] = useState<StatusHistoryRow[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [funnelStats, setFunnelStats] = useState<FunnelStageStats[]>([]);

  const fetchLeads = useCallback(async () => {
    const reqId = ++fetchIdRef.current;
    setLoading(true);
    // Virtual statuses (vencidos / seguimiento) are computed client-side — never
    // sent as a real status constraint to the query.
    const isVirtual = VIRTUAL_STATUS_VALUES.includes(statusFilter);
    const queryStatus = isVirtual ? undefined : statusFilter || undefined;
    try {
      const [res, s, upcoming] = await Promise.all([
        // limit 500: the CRM has no pagination UI, so load enough to make the
        // client-side zone / vencidos / seguimiento filters meaningful.
        getLeads({ search: debouncedSearch || undefined, status: queryStatus, source: sourceFilter || undefined, limit: 500 }),
        getLeadStats(),
        getUpcomingFollowUps(),
      ]);
      // Default: hide vendors / partners / not_a_lead from main pipeline view
      // (still searchable via the status dropdown explicitly)
      let filtered = res.data.filter((l) => {
        if (!sourceFilter && SYSTEM_TEST_SOURCES.includes(l.source || '')) return false;
        if (!showNonCustomers && !statusFilter && NON_CUSTOMER_STATUSES.includes(l.status || '')) return false;
        return true;
      });
      // Virtual status filters
      if (statusFilter === 'vencidos') {
        filtered = filtered.filter((l) => isStaleLead(l));
      } else if (statusFilter === 'seguimiento') {
        filtered = filtered.filter((l) => !!upcoming[l.id]);
      }
      // Zone filter: "Azuero" expands to the whole peninsula (Herrera + Los Santos
      // provinces and their districts); everything else is an exact zone / location match.
      if (zoneFilter === 'Azuero') {
        filtered = filtered.filter((l) => isInAzueroRegion(l.zone, l.location));
      } else if (zoneFilter) {
        filtered = filtered.filter((l) =>
          l.zone === zoneFilter ||
          l.location?.toLowerCase().includes(zoneFilter.toLowerCase())
        );
      }
      // Assignment filter: "Mis Leads" wins over the dropdown when active.
      if (myLeadsOnly) {
        filtered = filtered.filter((l) => l.assigned_to === myEmail);
      } else if (assignedFilter === UNASSIGNED) {
        filtered = filtered.filter((l) => !l.assigned_to);
      } else if (assignedFilter) {
        filtered = filtered.filter((l) => l.assigned_to === assignedFilter);
      }

      // Drop results from a superseded request so a slow stale response can't
      // overwrite a fresher one.
      if (fetchIdRef.current !== reqId) return;
      setLeads(filtered);
      setStats(s);
      setFollowUpMap(upcoming);

      // Compute funnel (lazy — only fetch histories for funnel stage leads, client-side)
      const funnelLeads = res.data.filter((l) => JOURNEY_STAGES.includes(l.status as typeof JOURNEY_STAGES[number]));
      if (funnelLeads.length > 0) {
        try {
          const histories = await getStatusHistoryBulk(funnelLeads.map((l) => l.id));
          if (fetchIdRef.current !== reqId) return;
          setFunnelStats(computeFunnel(funnelLeads as CrmLead[], histories));
        } catch {
          // funnel is best-effort
        }
      }
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      // Only the newest request may clear the spinner.
      if (fetchIdRef.current === reqId) setLoading(false);
    }
  }, [debouncedSearch, statusFilter, sourceFilter, zoneFilter, assignedFilter, myLeadsOnly, myEmail, showNonCustomers]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleStatusChange = async (lead: CrmLead, newStatus: string) => {
    const updates: Partial<CrmLead> = { status: newStatus };
    if (newStatus === 'won' && !lead.won_at) {
      updates.won_at = new Date().toISOString();
      updates.deal_currency = lead.deal_currency || 'USD';
    }
    await updateLead(lead.id, updates);
    fetchLeads();
    if (selectedLead?.id === lead.id) setSelectedLead({ ...selectedLead, ...updates });
  };

  const handleAssignChange = async (lead: CrmLead, email: string) => {
    const value = email || null;
    // Optimistic — update the row + open panel without refetching.
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, assigned_to: value } : l)));
    if (selectedLead?.id === lead.id) setSelectedLead({ ...selectedLead, assigned_to: value });
    try {
      await updateLead(lead.id, { assigned_to: value });
    } catch (err) {
      console.error('Failed to assign lead:', err);
      fetchLeads(); // revert to server truth on failure
    }
  };

  const handleSelectLead = async (lead: CrmLead) => {
    setSelectedLead(lead);
    setLeadEvents([]);
    setStatusHistory([]);
    setTimeline([]);
    setConfirmDiscard(false);
    setNoteError(null);
    try {
      const [n, ev, hist] = await Promise.all([
        getLeadNotes(lead.id),
        listEventsForLead(lead.id),
        getStatusHistory(lead.id),
      ]);
      setNotes(n);
      setLeadEvents(ev);
      setStatusHistory(hist);
      setTimeline(buildTimeline(lead, hist, ev));
    } catch {
      setNotes([]);
      setLeadEvents([]);
      setStatusHistory([]);
      setTimeline([]);
    }
  };

  const handleCreateEvent = async () => {
    if (!selectedLead || !eventForm.startsAt || !showEventModal) return;
    const lead = selectedLead;
    const eventType = showEventModal;
    const defaultTitle = eventType === 'meeting'
      ? `Cita — ${lead.name}`
      : `Seguimiento — ${lead.name}`;
    try {
      await createEvent({
        lead_id: lead.id,
        event_type: eventType,
        title: eventForm.title.trim() || defaultTitle,
        notes: eventForm.notes.trim() || null,
        starts_at: new Date(eventForm.startsAt).toISOString(),
      });
    } catch (err) {
      console.error('Failed to create event:', err);
      toast({ type: 'error', title: 'No se pudo crear el evento', description: 'Inténtalo de nuevo.' });
      return;
    }
    setShowEventModal(null);
    setEventForm({ title: '', startsAt: '', notes: '' });
    const ev = await listEventsForLead(lead.id);
    setLeadEvents(ev);
    // Scheduling a follow-up on a brand-new lead moves it into the pipeline
    // (new → contacted) so it stops showing up as "Nuevo".
    if (eventType === 'follow_up' && lead.status === 'new') {
      await handleStatusChange(lead, 'contacted');
    } else {
      fetchLeads(); // refresh the Seguimiento badges/filter map
    }
  };

  const handleEventStatusChange = async (eventId: string, status: 'done' | 'cancelled') => {
    await updateEventStatus(eventId, status);
    if (selectedLead) {
      const ev = await listEventsForLead(selectedLead.id);
      setLeadEvents(ev);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    await deleteEvent(eventId);
    if (selectedLead) {
      const ev = await listEventsForLead(selectedLead.id);
      setLeadEvents(ev);
    }
  };

  // Zone filter options: provinces ∪ distinct zones from the DB ∪ loaded-lead
  // zones ∪ regional/district labels (Azuero peninsula, etc.), deduped + sorted.
  const zoneOptions = useMemo(() => Array.from(new Set([
    ...PANAMA_PROVINCES,
    ...dbZones,
    ...leads.map((l) => l.zone).filter((z): z is string => !!z),
    ...EXTRA_ZONES,
  ])).sort(), [dbZones, leads]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedLead) return;
    const content = newNote.trim();
    try {
      await addLeadNote(selectedLead.id, content, authorName);
      setNewNote('');
      setNoteError(null);
      if (noteRef.current) noteRef.current.style.height = 'auto';
      const n = await getLeadNotes(selectedLead.id);
      setNotes(n);
    } catch (err) {
      console.error('Failed to add note:', err);
      setNoteError('No se pudo guardar la nota. Revisa tu conexión o permisos.');
      toast({ type: 'error', title: 'Error al guardar la nota', description: 'Inténtalo de nuevo.' });
    }
  };

  const handleDiscardLead = async () => {
    if (!selectedLead) return;
    const lead = selectedLead;
    // 1) Status change is authoritative — do it first.
    try {
      await handleStatusChange(lead, 'not_a_lead');
    } catch (err) {
      console.error('Failed to discard lead:', err);
      toast({ type: 'error', title: 'No se pudo actualizar el estado', description: 'Inténtalo de nuevo.' });
      setConfirmDiscard(false);
      return;
    }
    // 2) Polite WhatsApp is best-effort — a failure must not undo the status change.
    if (lead.phone) {
      const firstName = (lead.name || '').normalize('NFC').split(' ')[0] || 'amigo';
      try {
        await enqueueWhatsAppMessage({
          leadId: lead.id,
          phone: lead.phone,
          message: `Hola ${firstName}, gracias por tu interés en Solaris Panamá. Según los datos de tu consulta, por el momento tu consumo no justifica una instalación solar rentable. ¡Con gusto te atenderemos si tu situación cambia!`,
          automationType: 'manual',
        });
        toast({ type: 'success', title: 'Lead descartado', description: 'Mensaje de cortesía enviado por WhatsApp.' });
      } catch (err) {
        console.error('WhatsApp enqueue failed:', err);
        toast({ type: 'warning', title: 'Lead descartado', description: 'El estado se actualizó, pero no se pudo encolar el WhatsApp.' });
      }
    } else {
      toast({ type: 'success', title: 'Lead descartado' });
    }
    setConfirmDiscard(false);
  };

  const handleCreateLead = async () => {
    if (!newLeadForm.name || !newLeadForm.phone) return;
    await createLead({
      name: newLeadForm.name,
      phone: newLeadForm.phone.replace(/[\s\-]/g, ''),
      source: newLeadForm.source,
      status: 'new',
    } as Partial<CrmLead>);
    setAddingLead(false);
    setNewLeadForm({ name: '', phone: '', source: 'manual' });
    fetchLeads();
  };

  const openWhatsApp = (phone: string, name: string) => {
    // First-name only, normalize to NFC so accents (á, ñ, é) survive encoding
    const firstName = (name || '').normalize('NFC').split(' ')[0] || 'amigo';
    const msg = encodeURIComponent(
      `Hola ${firstName}, te escribo de Solaris Panamá sobre tu consulta de paneles solares.`
    );
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${msg}`, '_blank');
  };

  return (
    <div className="min-h-screen p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D4A843]/10 flex items-center justify-center border border-[#D4A843]/20">
            <Users className="w-5 h-5 text-[#D4A843]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#f0f0f5]">Leads</h1>
            <p className="text-xs text-[#555570]">{stats.total} leads · {stats.new} nuevos</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchLeads()}
            className="p-2 rounded-lg bg-[#12121a] border border-white/[0.06] text-[#8888a0] hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setAddingLead(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#D4A843] text-[#0a0a0f] text-sm font-semibold hover:bg-[#c49835] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Agregar
          </button>
        </div>
      </div>

      {/* Stats — each card is a shortcut that applies the matching status filter. */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, color: '#D4A843', filter: '' },
          { label: 'Nuevos', value: stats.new, color: '#00ffcc', filter: 'new' },
          { label: 'Contactados', value: stats.contacted, color: '#8b5cf6', filter: 'contacted' },
          { label: 'Calificados', value: stats.qualified, color: '#f59e0b', filter: 'qualified' },
          { label: 'Ganados', value: stats.won, color: '#22c55e', filter: 'won' },
          { label: 'Vencidos', value: stats.stale, color: '#ef4444', filter: 'vencidos' },
        ].map((s) => {
          const active = statusFilter === s.filter;
          return (
            <button
              key={s.label}
              onClick={() => setStatusFilter(s.filter)}
              title={s.filter ? `Filtrar: ${s.label}` : 'Ver todos'}
              className="text-left px-4 py-3 rounded-xl bg-[#12121a] border border-white/[0.06] cursor-pointer transition-colors hover:bg-white/[0.03] focus:outline-none"
              style={active ? { boxShadow: `inset 0 0 0 1.5px ${s.color}` } : undefined}
            >
              <div className="text-xs text-[#555570] mb-1">{s.label}</div>
              <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Google Ads LP', value: stats.bySource.lp_azuero || 0, detail: 'landing con gclid', color: '#D4A843' },
          { label: 'Google Lead Form', value: stats.bySource.google_ads || 0, detail: 'webhook directo', color: '#4285f4' },
          { label: 'Meta Lead Ads', value: stats.bySource.meta_ads || 0, detail: 'leadgen form', color: '#1877f2' },
          { label: 'WhatsApp', value: stats.bySource.whatsapp || 0, detail: 'bridge import/sync', color: '#25d366' },
        ].map((s) => (
          <div key={s.label} className="px-4 py-3 rounded-xl bg-[#12121a]/70 border border-white/[0.06]">
            <div className="flex items-baseline justify-between gap-3">
              <div className="text-xs font-medium text-[#c0c0d0]">{s.label}</div>
              <div className="text-lg font-bold tabular-nums" style={{ color: s.color }}>{s.value}</div>
            </div>
            <div className="text-[10px] text-[#555570] mt-0.5">{s.detail}</div>
          </div>
        ))}
      </div>

      {/* Funnel card */}
      {funnelStats.length > 0 && (
        <div className="flex items-center gap-1 mb-4 px-4 py-3 rounded-xl bg-[#12121a]/70 border border-white/[0.06] overflow-x-auto">
          <TrendingUp className="w-4 h-4 text-[#D4A843] shrink-0 mr-1" />
          <span className="text-xs font-medium text-[#8888a0] mr-3 shrink-0">{t('journey.funnel')}</span>
          {funnelStats.map((s, i) => (
            <div key={s.stage} className="flex items-center gap-1 shrink-0">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-[#333344]" />}
              <div className="flex flex-col items-center px-2">
                <span className="text-xs font-bold text-[#f0f0f5]">{s.count}</span>
                <span className="text-[10px] text-[#555570]">
                  {STATUS_CONFIG[s.stage]?.label ?? s.stage}
                </span>
                {s.avgDays !== null && (
                  <span className="text-[9px] text-[#333355]">
                    ~{s.avgDays}d
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555570]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, teléfono..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#12121a] border border-white/[0.06] text-white text-sm placeholder:text-[#555570] focus:outline-none focus:border-[#D4A843]/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-[#12121a] border border-white/[0.06] text-[#8888a0] text-sm outline-none"
        >
          <option value="">Todos los estados</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
          <option disabled>──────────</option>
          {VIRTUAL_STATUSES.map((v) => (
            <option key={v.value} value={v.value}>{v.label}</option>
          ))}
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-[#12121a] border border-white/[0.06] text-[#8888a0] text-sm outline-none"
        >
          <option value="">Todas las fuentes</option>
          {Object.entries(SOURCE_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select
          value={zoneFilter}
          onChange={(e) => setZoneFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-[#12121a] border border-white/[0.06] text-[#8888a0] text-sm outline-none"
        >
          <option value="">{t('crm.allZones')}</option>
          {zoneOptions.map((z) => (
            <option key={z} value={z}>{z}</option>
          ))}
        </select>
        <select
          value={assignedFilter}
          onChange={(e) => setAssignedFilter(e.target.value)}
          disabled={myLeadsOnly}
          title="Filtrar por asignación"
          className="px-3 py-2 rounded-xl bg-[#12121a] border border-white/[0.06] text-[#8888a0] text-sm outline-none disabled:opacity-40"
        >
          <option value="">Todos (asignación)</option>
          <option value={UNASSIGNED}>Sin asignar</option>
          {members.map((m) => (
            <option key={m.id} value={m.email}>{m.full_name}</option>
          ))}
        </select>
        <button
          onClick={() => setMyLeadsOnly((v) => !v)}
          disabled={!myEmail}
          title="Mostrar solo los leads asignados a mí"
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm whitespace-nowrap transition-colors disabled:opacity-40',
            myLeadsOnly
              ? 'bg-[#D4A843]/10 border-[#D4A843]/40 text-[#D4A843]'
              : 'bg-[#12121a] border-white/[0.06] text-[#8888a0] hover:text-white'
          )}
        >
          <UserCheck className="w-3.5 h-3.5" />
          Mis Leads
        </button>
        <button
          onClick={() => setShowNonCustomers((v) => !v)}
          title="Mostrar/ocultar proveedores, socios y no-leads"
          className={cn(
            'px-3 py-2 rounded-xl border text-sm whitespace-nowrap transition-colors',
            showNonCustomers
              ? 'bg-[#a855f7]/10 border-[#a855f7]/40 text-[#a855f7]'
              : 'bg-[#12121a] border-white/[0.06] text-[#8888a0] hover:text-white'
          )}
        >
          {showNonCustomers ? 'Mostrando todos' : 'Ocultar proveedores'}
        </button>
      </div>

      {/* Main content */}
      <div className="flex gap-4">
        {/* Leads table */}
        <div className={cn('flex-1 rounded-xl bg-[#12121a]/80 border border-white/[0.06] overflow-hidden', selectedLead && 'hidden md:block')}>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-[#D4A843]/20 border-t-[#D4A843] rounded-full animate-spin" />
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-20">
              <Users className="w-12 h-12 text-[#555570] mx-auto mb-3" />
              <p className="text-sm text-[#555570]">No hay leads</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Nombre', 'Teléfono', 'Fuente', 'Estado', 'Fecha'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-[#555570] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const src = SOURCE_CONFIG[lead.source] || SOURCE_CONFIG.manual;
                  const st = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
                  const stale = isStaleLead(lead);
                  const assigneeLabel = lead.assigned_to
                    ? (memberByEmail[lead.assigned_to]?.full_name ?? lead.assigned_to)
                    : null;
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => handleSelectLead(lead)}
                      className={cn(
                        'border-b border-white/[0.03] cursor-pointer hover:bg-white/[0.02] transition-colors',
                        selectedLead?.id === lead.id && 'bg-white/[0.03]'
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium text-white">{lead.name}</div>
                          {assigneeLabel && (
                            <span
                              title={`Asignado a ${assigneeLabel}`}
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#D4A843]/15 text-[#D4A843] text-[9px] font-bold shrink-0"
                            >
                              {initialsOf(assigneeLabel)}
                            </span>
                          )}
                        </div>
                        {lead.monthly_bill && (
                          <div className="text-[11px] text-[#555570]">${lead.monthly_bill}/mes</div>
                        )}
                        {stale && (
                          <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-[#ef4444]">
                            <Clock className="w-3 h-3" />
                            Requiere seguimiento
                          </div>
                        )}
                        {followUpMap[lead.id] && (
                          <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-[#3b82f6]">
                            <CalendarDays className="w-3 h-3" />
                            Seguimiento {new Date(followUpMap[lead.id]).toLocaleDateString('es-PA', { day: 'numeric', month: 'short' })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[#c0c0d0]">{lead.phone || '-'}</span>
                          {lead.phone && (
                            <button
                              onClick={(e) => { e.stopPropagation(); openWhatsApp(lead.phone!, lead.name); }}
                              className="p-1 rounded-md hover:bg-[#25d366]/10 text-[#25d366] transition-colors"
                              title="WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{ backgroundColor: `${src.color}15`, color: src.color }}
                        >
                          {src.icon}
                          {src.label}
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {lead.gclid && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#4285f4]/10 text-[#4285f4]">
                              gclid
                            </span>
                          )}
                          {lead.platform_lead_id && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#1877f2]/10 text-[#1877f2]">
                              platform id
                            </span>
                          )}
                          {lead.fbclid && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#1877f2]/10 text-[#1877f2]">
                              fbclid
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={lead.status}
                          onChange={(e) => { e.stopPropagation(); handleStatusChange(lead, e.target.value); }}
                          onClick={(e) => e.stopPropagation()}
                          className="px-2 py-1 rounded-lg text-[11px] font-semibold border-0 outline-none cursor-pointer"
                          style={{ backgroundColor: st.bg, color: st.color }}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s} style={{ backgroundColor: '#12121a', color: '#f0f0f5' }}>
                              {STATUS_CONFIG[s].label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#555570]">
                        {new Date(lead.created_at).toLocaleDateString('es-PA')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selectedLead && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-full md:w-[380px] shrink-0 rounded-xl bg-[#12121a] border border-white/[0.06] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <h3 className="text-base font-semibold text-white">{selectedLead.name}</h3>
                <button onClick={() => setSelectedLead(null)} className="p-1 rounded-lg hover:bg-white/[0.06] text-[#555570]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto">
                {/* Contact */}
                <div className="space-y-2">
                  {selectedLead.phone && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#8888a0]">{selectedLead.phone}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openWhatsApp(selectedLead.phone!, selectedLead.name)}
                          className="p-1.5 rounded-lg bg-[#25d366]/10 text-[#25d366] hover:bg-[#25d366]/20 transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <a
                          href={`tel:${selectedLead.phone}`}
                          className="p-1.5 rounded-lg bg-[#3b82f6]/10 text-[#3b82f6] hover:bg-[#3b82f6]/20 transition-colors"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  )}
                  {selectedLead.email && (
                    <div className="text-sm text-[#8888a0]">{selectedLead.email}</div>
                  )}
                  {selectedLead.monthly_bill && (
                    <div className="text-sm text-[#D4A843]">Factura: ${selectedLead.monthly_bill}/mes</div>
                  )}
                </div>

                {/* Source & Status */}
                <div className="flex items-center gap-2 flex-wrap">
                  {(() => {
                    const src = SOURCE_CONFIG[selectedLead.source] || SOURCE_CONFIG.manual;
                    return (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium" style={{ backgroundColor: `${src.color}15`, color: src.color }}>
                        {src.icon} {src.label}
                      </span>
                    );
                  })()}
                  {selectedLead.campaign && (
                    <span className="text-xs text-[#555570]">· {selectedLead.campaign}</span>
                  )}
                  {(() => {
                    const hasRealOverdue = leadEvents.some(
                      (ev) => ev.event_type === 'follow_up' && ev.status === 'scheduled' && new Date(ev.starts_at) < new Date()
                    );
                    const showStaleBadge = !hasRealOverdue && isStaleLead(selectedLead);
                    return (hasRealOverdue || showStaleBadge) ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-[#ef4444]/10 text-[#ef4444]">
                        <Clock className="w-3 h-3" />
                        {t('crm.overdueFollowUp')}
                      </span>
                    ) : null;
                  })()}
                </div>

                {(selectedLead.auto_wa_sent_at || selectedLead.meta_capi_lead_sent_at || selectedLead.google_conversion_uploaded_at) && (
                  <div>
                    <div className="text-[10px] text-[#555570] uppercase tracking-wider mb-2">Automatización</div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedLead.auto_wa_sent_at && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-[#25d366]/10 text-[#25d366] border border-[#25d366]/20">
                          WA auto: {new Date(selectedLead.auto_wa_sent_at).toLocaleDateString('es-PA')}
                        </span>
                      )}
                      {selectedLead.meta_capi_lead_sent_at && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-[#1877f2]/10 text-[#1877f2] border border-[#1877f2]/20">
                          Meta CAPI enviado
                        </span>
                      )}
                      {selectedLead.google_conversion_uploaded_at && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-[#4285f4]/10 text-[#4285f4] border border-[#4285f4]/20">
                          Google offline enviado
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Attribution badges — gclid / fbclid / platform lead / utm / ad_id */}
                {(selectedLead.gclid || selectedLead.fbclid || selectedLead.platform_lead_id || selectedLead.ad_id || selectedLead.form_id || selectedLead.utm_source || selectedLead.utm_medium) && (
                  <div>
                    <div className="text-[10px] text-[#555570] uppercase tracking-wider mb-2">Atribución</div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedLead.gclid && (
                        <span
                          title={selectedLead.gclid}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-[#4285f4]/10 text-[#4285f4] border border-[#4285f4]/20"
                        >
                          Google · gclid
                        </span>
                      )}
                      {selectedLead.fbclid && (
                        <span
                          title={selectedLead.fbclid}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-[#1877f2]/10 text-[#1877f2] border border-[#1877f2]/20"
                        >
                          Meta · fbclid
                        </span>
                      )}
                      {selectedLead.platform_lead_id && (
                        <span
                          title={`Platform lead ID: ${selectedLead.platform_lead_id}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-[#1877f2]/10 text-[#1877f2] border border-[#1877f2]/20"
                        >
                          platform: {String(selectedLead.platform_lead_id).slice(0, 12)}
                        </span>
                      )}
                      {selectedLead.ad_id && (
                        <span
                          title={`Ad ID: ${selectedLead.ad_id}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-[#1877f2]/10 text-[#1877f2] border border-[#1877f2]/20"
                        >
                          ad: {String(selectedLead.ad_id).slice(0, 12)}
                        </span>
                      )}
                      {selectedLead.form_id && (
                        <span
                          title={`Form ID: ${selectedLead.form_id}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-[#1877f2]/10 text-[#1877f2] border border-[#1877f2]/20"
                        >
                          form: {String(selectedLead.form_id).slice(0, 12)}
                        </span>
                      )}
                      {selectedLead.utm_source && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.04] text-[#8888a0] border border-white/[0.06]">
                          {selectedLead.utm_source}
                          {selectedLead.utm_medium ? ` / ${selectedLead.utm_medium}` : ''}
                        </span>
                      )}
                      {selectedLead.utm_campaign && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.04] text-[#8888a0] border border-white/[0.06]">
                          {selectedLead.utm_campaign}
                        </span>
                      )}
                      {selectedLead.utm_content && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.04] text-[#555570] border border-white/[0.06]">
                          content: {selectedLead.utm_content}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Deal value (won leads) */}
                {selectedLead.status === 'won' && (
                  <div>
                    <div className="text-[10px] text-[#555570] uppercase tracking-wider mb-1.5">Valor de la venta</div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#555570]">$</span>
                      <input
                        type="number"
                        defaultValue={selectedLead.deal_value || ''}
                        placeholder="0"
                        onBlur={async (e) => {
                          const val = parseFloat(e.target.value);
                          if (!Number.isFinite(val)) return;
                          const updated = await markLeadWon(selectedLead.id, val, 'USD');
                          setSelectedLead(updated);
                          fetchLeads();
                        }}
                        className="w-32 px-2 py-1 rounded-md bg-white/[0.04] border border-[#22c55e]/30 text-[#22c55e] text-sm font-semibold outline-none focus:border-[#22c55e]/60"
                      />
                      <span className="text-[10px] text-[#555570]">USD</span>
                      {selectedLead.gclid && (
                        <span className="text-[10px] text-[#4285f4]" title="Will upload to Google Ads as offline conversion">
                          → Google
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Status pipeline */}
                <div>
                  <div className="text-[10px] text-[#555570] uppercase tracking-wider mb-2">Estado</div>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUSES.map((s) => {
                      const config = STATUS_CONFIG[s];
                      const active = selectedLead.status === s;
                      return (
                        <button
                          key={s}
                          onClick={() => handleStatusChange(selectedLead, s)}
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                            active ? 'ring-1' : 'opacity-50 hover:opacity-80'
                          )}
                          style={{
                            backgroundColor: config.bg,
                            color: config.color,
                            ...(active ? { ringColor: config.color } : {}),
                          }}
                        >
                          {config.label}
                        </button>
                      );
                    })}
                  </div>
                  {/* Descartar — quick "not qualified" action + polite WhatsApp */}
                  {selectedLead.status !== 'not_a_lead' && (
                    <div className="mt-3">
                      {!confirmDiscard ? (
                        <button
                          onClick={() => setConfirmDiscard(true)}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#ef4444]/5 border border-[#ef4444]/20 text-[#ef4444] text-xs font-medium hover:bg-[#ef4444]/10 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Descartar (no calificado)
                        </button>
                      ) : (
                        <div className="rounded-lg bg-[#ef4444]/5 border border-[#ef4444]/20 p-3">
                          <p className="text-xs text-[#c0c0d0] mb-2.5">
                            ¿Descartar este lead? Se marcará como <b className="text-[#ef4444]">No es Lead</b>
                            {selectedLead.phone ? ' y se enviará un mensaje de cortesía por WhatsApp.' : '.'}
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setConfirmDiscard(false)}
                              className="flex-1 py-1.5 rounded-md border border-white/[0.06] text-[#8888a0] text-xs hover:bg-white/[0.04] transition-colors"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={handleDiscardLead}
                              className="flex-1 py-1.5 rounded-md bg-[#ef4444] text-white text-xs font-semibold hover:bg-[#dc2626] transition-colors"
                            >
                              Confirmar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Assignment */}
                <div>
                  <div className="text-[10px] text-[#555570] uppercase tracking-wider mb-2">Asignado a</div>
                  <div className="flex items-center gap-2">
                    {selectedLead.assigned_to && (
                      <span
                        title={memberByEmail[selectedLead.assigned_to]?.full_name ?? selectedLead.assigned_to}
                        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#D4A843]/15 text-[#D4A843] text-[10px] font-bold shrink-0"
                      >
                        {initialsOf(memberByEmail[selectedLead.assigned_to]?.full_name ?? selectedLead.assigned_to)}
                      </span>
                    )}
                    <select
                      value={selectedLead.assigned_to ?? ''}
                      onChange={(e) => handleAssignChange(selectedLead, e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white text-sm outline-none focus:border-[#D4A843]/30"
                    >
                      <option value="">Sin asignar</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.email}>{m.full_name}</option>
                      ))}
                      {/* Preserve an assignee that is no longer an active team member */}
                      {selectedLead.assigned_to && !memberByEmail[selectedLead.assigned_to] && (
                        <option value={selectedLead.assigned_to}>{selectedLead.assigned_to}</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* Journey stepper */}
                {(() => {
                  const journey = buildJourney(selectedLead, statusHistory);
                  const activeIdx = JOURNEY_STAGES.indexOf(selectedLead.status as typeof JOURNEY_STAGES[number]);
                  return (
                    <div>
                      <div className="text-[10px] text-[#555570] uppercase tracking-wider mb-2">{t('journey.title')}</div>
                      <div className="flex items-center gap-0.5 overflow-x-auto pb-1">
                        {journey.map((s, i) => {
                          const reached = s.reachedAt !== null;
                          const isCurrent = selectedLead.status === s.stage;
                          const color = reached
                            ? isCurrent ? '#D4A843' : '#22c55e'
                            : '#333344';
                          return (
                            <div key={s.stage} className="flex items-center gap-0.5 shrink-0">
                              {i > 0 && (
                                <div
                                  className="w-4 h-px shrink-0"
                                  style={{ backgroundColor: reached ? '#22c55e' : '#333344' }}
                                />
                              )}
                              <div className="flex flex-col items-center gap-0.5">
                                <div
                                  className={cn(
                                    'w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border-2',
                                    isCurrent ? 'border-[#D4A843] text-[#D4A843] bg-[#D4A843]/10' :
                                    reached ? 'border-[#22c55e] text-[#22c55e] bg-[#22c55e]/10' :
                                    'border-[#333344] text-[#333344]'
                                  )}
                                >
                                  {reached ? (isCurrent ? '●' : '✓') : i + 1}
                                </div>
                                <span className="text-[8px] text-center leading-tight max-w-[40px]" style={{ color }}>
                                  {STATUS_CONFIG[s.stage]?.label ?? s.stage}
                                </span>
                                {s.daysInStage !== null && (
                                  <span className="text-[8px] text-[#555570]">{s.daysInStage}d</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {/* Won / Lost terminal */}
                        {(selectedLead.status === 'won' || selectedLead.status === 'lost') && (
                          <>
                            <div className="w-4 h-px shrink-0 bg-[#22c55e]" />
                            <div className="flex flex-col items-center gap-0.5 shrink-0">
                              <div className={cn(
                                'w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border-2',
                                selectedLead.status === 'won'
                                  ? 'border-[#22c55e] text-[#22c55e] bg-[#22c55e]/10'
                                  : 'border-[#ef4444] text-[#ef4444] bg-[#ef4444]/10'
                              )}>
                                {selectedLead.status === 'won' ? '★' : '✗'}
                              </div>
                              <span className={cn('text-[8px]', selectedLead.status === 'won' ? 'text-[#22c55e]' : 'text-[#ef4444]')}>
                                {STATUS_CONFIG[selectedLead.status]?.label}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                      {activeIdx >= 0 && (
                        <p className="text-[10px] text-[#555570] mt-1">
                          {t('journey.currentStage')}: {STATUS_CONFIG[selectedLead.status]?.label ?? selectedLead.status}
                          {journey[activeIdx]?.daysInStage !== null && ` · ${journey[activeIdx]!.daysInStage} ${t('journey.daysInStage', { days: '' }).replace(' ', '').trim()}`}
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Message */}
                {selectedLead.message && (
                  <div>
                    <div className="text-[10px] text-[#555570] uppercase tracking-wider mb-1">Mensaje</div>
                    <p className="text-sm text-[#c0c0d0] bg-white/[0.02] rounded-lg p-3">{selectedLead.message}</p>
                  </div>
                )}

                {/* Events — schedule buttons */}
                <div>
                  <div className="text-[10px] text-[#555570] uppercase tracking-wider mb-2">Agenda</div>
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => {
                        setShowEventModal('meeting');
                        setEventForm({ title: '', startsAt: '', notes: '' });
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3b82f6]/10 text-[#3b82f6] text-xs font-medium hover:bg-[#3b82f6]/20 transition-colors border border-[#3b82f6]/20"
                    >
                      <CalendarDays className="w-3.5 h-3.5" />
                      {t('crm.scheduleAppointment')}
                    </button>
                    <button
                      onClick={() => {
                        setShowEventModal('follow_up');
                        setEventForm({ title: '', startsAt: '', notes: '' });
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f59e0b]/10 text-[#f59e0b] text-xs font-medium hover:bg-[#f59e0b]/20 transition-colors border border-[#f59e0b]/20"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      {t('crm.scheduleFollowUp')}
                    </button>
                  </div>

                  {/* Upcoming events list */}
                  {leadEvents.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {leadEvents
                        .filter((ev) => ev.status === 'scheduled')
                        .map((ev) => {
                          const isOverdue = ev.event_type === 'follow_up' && new Date(ev.starts_at) < new Date();
                          return (
                            <div key={ev.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span
                                      className={cn(
                                        'text-[10px] font-semibold px-1.5 py-0.5 rounded',
                                        ev.event_type === 'meeting'
                                          ? 'bg-[#3b82f6]/10 text-[#3b82f6]'
                                          : 'bg-[#f59e0b]/10 text-[#f59e0b]'
                                      )}
                                    >
                                      {ev.event_type === 'meeting' ? t('calendar.eventTypeMeeting') : t('calendar.eventTypeFollowUp')}
                                    </span>
                                    {isOverdue && (
                                      <span className="inline-flex items-center gap-1 text-[10px] text-[#ef4444] font-medium">
                                        <Clock className="w-3 h-3" />
                                        {t('crm.overdueFollowUp')}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-[#c0c0d0] mt-1 font-medium truncate">{ev.title}</p>
                                  <p className="text-[10px] text-[#555570] mt-0.5">
                                    {new Date(ev.starts_at).toLocaleString('es-PA', { dateStyle: 'short', timeStyle: 'short' })}
                                  </p>
                                  {ev.notes && <p className="text-[10px] text-[#8888a0] mt-0.5 italic">{ev.notes}</p>}
                                </div>
                                <div className="flex gap-1 shrink-0">
                                  <button
                                    onClick={() => handleEventStatusChange(ev.id, 'done')}
                                    title={t('calendar.markDone')}
                                    className="p-1 rounded text-[#22c55e] hover:bg-[#22c55e]/10 transition-colors"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleEventStatusChange(ev.id, 'cancelled')}
                                    title={t('calendar.cancelEvent')}
                                    className="p-1 rounded text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteEvent(ev.id)}
                                    title={t('calendar.deleteEvent')}
                                    className="p-1 rounded text-[#555570] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                  {leadEvents.filter((ev) => ev.status === 'scheduled').length === 0 && (
                    <p className="text-xs text-[#555570] mb-3">{t('crm.noEvents')}</p>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <div className="text-[10px] text-[#555570] uppercase tracking-wider mb-2">Notas</div>
                  <div className="space-y-2 mb-3">
                    {notes.map((n) => (
                      <div key={n.id} className="bg-white/[0.02] rounded-lg p-3">
                        <p className="text-sm text-[#c0c0d0]">{n.content}</p>
                        <div className="text-[10px] text-[#555570] mt-1">
                          {n.author_name} · {new Date(n.created_at).toLocaleDateString('es-PA')}
                        </div>
                      </div>
                    ))}
                    {notes.length === 0 && (
                      <p className="text-xs text-[#555570]">Sin notas</p>
                    )}
                  </div>
                  <div className="flex gap-2 items-end">
                    <textarea
                      ref={noteRef}
                      value={newNote}
                      onChange={(e) => {
                        setNewNote(e.target.value);
                        if (noteError) setNoteError(null);
                        // auto-grow up to ~5 rows
                        e.target.style.height = 'auto';
                        e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                      }}
                      onKeyDown={(e) => {
                        // Cmd/Ctrl+Enter submits; plain Enter inserts a newline.
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          handleAddNote();
                        }
                      }}
                      rows={2}
                      placeholder="Agregar nota... (⌘/Ctrl+Enter para enviar)"
                      className="flex-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white text-sm placeholder:text-[#555570] outline-none focus:border-[#D4A843]/30 resize-none leading-snug"
                    />
                    <button
                      onClick={handleAddNote}
                      disabled={!newNote.trim()}
                      className="p-2 rounded-lg bg-[#D4A843]/10 text-[#D4A843] hover:bg-[#D4A843]/20 disabled:opacity-30 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                  {noteError && (
                    <p className="text-[11px] text-[#ef4444] mt-1.5">{noteError}</p>
                  )}
                </div>

                {/* Unified timeline */}
                {timeline.length > 0 && (
                  <div>
                    <div className="text-[10px] text-[#555570] uppercase tracking-wider mb-2">{t('journey.timeline')}</div>
                    <div className="relative pl-4 space-y-3">
                      <div className="absolute left-1.5 top-0 bottom-0 w-px bg-white/[0.06]" />
                      {timeline.map((item) => (
                        <div key={item.id} className="relative">
                          <div className={cn(
                            'absolute -left-[11px] w-2 h-2 rounded-full border mt-0.5',
                            item.kind === 'created' ? 'bg-[#00ffcc] border-[#00ffcc]' :
                            item.kind === 'status_change' ? 'bg-[#8b5cf6] border-[#8b5cf6]' :
                            'bg-[#3b82f6] border-[#3b82f6]'
                          )} />
                          <p className="text-xs text-[#c0c0d0] leading-tight">{item.label}</p>
                          {item.meta && <p className="text-[10px] text-[#555570] mt-0.5 italic">{item.meta}</p>}
                          <p className="text-[10px] text-[#333355] mt-0.5">
                            {new Date(item.timestamp).toLocaleString('es-PA', { dateStyle: 'short', timeStyle: 'short' })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create Event Modal */}
      <AnimatePresence>
        {showEventModal && selectedLead && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowEventModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md mx-4 rounded-2xl bg-[#12121a] border border-white/[0.08] p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-1">
                {showEventModal === 'meeting' ? t('crm.scheduleAppointment') : t('crm.scheduleFollowUp')}
              </h3>
              <p className="text-xs text-[#8888a0] mb-4">{selectedLead.name}</p>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-[#555570] uppercase tracking-wider block mb-1">{t('common.name')}</label>
                  <input
                    value={eventForm.title}
                    onChange={(e) => setEventForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder={
                      showEventModal === 'meeting'
                        ? `Cita — ${selectedLead.name}`
                        : `Seguimiento — ${selectedLead.name}`
                    }
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-sm placeholder:text-[#555570] outline-none focus:border-[#D4A843]/30"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#555570] uppercase tracking-wider block mb-1">{t('calendar.dateTime')}</label>
                  <input
                    type="datetime-local"
                    value={eventForm.startsAt}
                    onChange={(e) => setEventForm((p) => ({ ...p, startsAt: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-sm outline-none focus:border-[#D4A843]/30"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#555570] uppercase tracking-wider block mb-1">{t('calendar.optionalNotes')}</label>
                  <textarea
                    value={eventForm.notes}
                    onChange={(e) => setEventForm((p) => ({ ...p, notes: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-sm placeholder:text-[#555570] outline-none focus:border-[#D4A843]/30 resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => setShowEventModal(null)}
                  className="flex-1 py-3 rounded-xl border border-white/[0.06] text-[#8888a0] text-sm hover:bg-white/[0.04] transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleCreateEvent}
                  disabled={!eventForm.startsAt}
                  className="flex-1 py-3 rounded-xl bg-[#D4A843] text-[#0a0a0f] text-sm font-semibold hover:bg-[#c49835] disabled:opacity-30 transition-colors"
                >
                  {t('common.save')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Lead Modal */}
      <AnimatePresence>
        {addingLead && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setAddingLead(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md mx-4 rounded-2xl bg-[#12121a] border border-white/[0.08] p-6"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Agregar Lead</h3>
              <div className="space-y-3">
                <input
                  value={newLeadForm.name}
                  onChange={(e) => setNewLeadForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Nombre"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-sm placeholder:text-[#555570] outline-none focus:border-[#D4A843]/30"
                />
                <input
                  value={newLeadForm.phone}
                  onChange={(e) => setNewLeadForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="Teléfono (ej: 50765831822)"
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-sm placeholder:text-[#555570] outline-none focus:border-[#D4A843]/30"
                />
                <select
                  value={newLeadForm.source}
                  onChange={(e) => setNewLeadForm((p) => ({ ...p, source: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-sm outline-none"
                >
                  {Object.entries(SOURCE_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => setAddingLead(false)}
                  className="flex-1 py-3 rounded-xl border border-white/[0.06] text-[#8888a0] text-sm hover:bg-white/[0.04] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateLead}
                  disabled={!newLeadForm.name || !newLeadForm.phone}
                  className="flex-1 py-3 rounded-xl bg-[#D4A843] text-[#0a0a0f] text-sm font-semibold hover:bg-[#c49835] disabled:opacity-30 transition-colors"
                >
                  Guardar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
