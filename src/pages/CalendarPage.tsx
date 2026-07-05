import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Plus,
  X,
  CheckCircle2,
  XCircle,
  User,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import {
  listEvents,
  createEvent,
  updateEventStatus,
  deleteEvent,
  type LeadEvent,
  type EventType,
} from '@/services/leadEventsService';
import { getLeads, type CrmLead } from '@/services/leadService';

const cn = (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' ');

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// Color mapping per event_type
const EVENT_COLORS = {
  meeting: { bg: 'bg-[#3b82f6]/10', text: 'text-[#3b82f6]', dot: '#3b82f6' },
  follow_up: { bg: 'bg-[#f59e0b]/10', text: 'text-[#f59e0b]', dot: '#f59e0b' },
  other: { bg: 'bg-[#8b5cf6]/10', text: 'text-[#8b5cf6]', dot: '#8b5cf6' },
};

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function CalendarPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Events state
  const [events, setEvents] = useState<LeadEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Lead name cache for display (id → name)
  const [leadNames, setLeadNames] = useState<Record<string, string>>({});

  // Selected event (side panel)
  const [selectedEvent, setSelectedEvent] = useState<LeadEvent | null>(null);

  // Create event modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    event_type: 'meeting' as EventType,
    title: '',
    startsAt: '',
    notes: '',
    lead_id: '',
  });

  // Leads for selector
  const [allLeads, setAllLeads] = useState<CrmLead[]>([]);
  const [leadSearch, setLeadSearch] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const monthName = currentDate.toLocaleDateString('es-PA', { month: 'long', year: 'numeric' });

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [firstDayOfWeek, daysInMonth]);

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const rangeStart = new Date(year, month, 1).toISOString();
      const rangeEnd = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
      const data = await listEvents(rangeStart, rangeEnd);
      setEvents(data);

      // Build lead name cache for any lead_ids in fetched events
      const unknownIds = [...new Set(
        data.map((e) => e.lead_id).filter((id): id is string => !!id && !leadNames[id])
      )];
      if (unknownIds.length > 0) {
        const { data: leads } = await getLeads({ limit: 200 });
        const nameMap: Record<string, string> = {};
        for (const l of leads) nameMap[l.id] = l.name;
        setLeadNames((prev) => ({ ...prev, ...nameMap }));
      }
    } catch (err) {
      console.error('Failed to load calendar events:', err);
    }
    setLoadingEvents(false);
  }, [year, month]); // leadNames intentionally excluded to avoid loop

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // Load leads for selector (once)
  useEffect(() => {
    getLeads({ limit: 200 })
      .then(({ data }) => setAllLeads(data))
      .catch(() => {});
  }, []);

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter((ev) => ev.starts_at.startsWith(dateStr));
  };

  const isToday = (day: number) => {
    const now = new Date();
    return day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const upcomingEvents = useMemo(
    () =>
      events
        .filter((ev) => ev.status === 'scheduled')
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
        .slice(0, 8),
    [events]
  );

  const handleCreateEvent = async () => {
    if (!createForm.startsAt) return;
    await createEvent({
      event_type: createForm.event_type,
      title: createForm.title.trim() || `${t(`calendar.eventType${createForm.event_type === 'meeting' ? 'Meeting' : createForm.event_type === 'follow_up' ? 'FollowUp' : 'Other'}`)}`,
      notes: createForm.notes.trim() || null,
      starts_at: new Date(createForm.startsAt).toISOString(),
      lead_id: createForm.lead_id || null,
    });
    setShowCreateModal(false);
    setCreateForm({ event_type: 'meeting', title: '', startsAt: '', notes: '', lead_id: '' });
    setLeadSearch('');
    loadEvents();
  };

  const handleEventStatusChange = async (ev: LeadEvent, status: 'done' | 'cancelled') => {
    await updateEventStatus(ev.id, status);
    setSelectedEvent(null);
    loadEvents();
  };

  const handleDeleteEvent = async (ev: LeadEvent) => {
    await deleteEvent(ev.id);
    setSelectedEvent(null);
    loadEvents();
  };

  const filteredLeads = useMemo(() => {
    if (!leadSearch.trim()) return allLeads.slice(0, 20);
    const q = leadSearch.toLowerCase();
    return allLeads.filter((l) => l.name.toLowerCase().includes(q) || l.phone?.includes(q)).slice(0, 20);
  }, [allLeads, leadSearch]);

  return (
    <motion.div
      className="p-6 lg:p-8 max-w-[1400px] mx-auto"
      initial="initial"
      animate="animate"
      variants={{ animate: { transition: { staggerChildren: 0.06 } } }}
    >
      <motion.div variants={fadeUp}>
        <PageHeader
          title={t('calendar.title')}
          description={t('calendar.subtitle')}
          gradient
          actions={
            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setShowCreateModal(true);
                setCreateForm({ event_type: 'meeting', title: '', startsAt: '', notes: '', lead_id: '' });
                setLeadSearch('');
              }}
            >
              {t('calendar.newEvent')}
            </Button>
          }
        />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Grid — 3 columns */}
        <motion.div variants={fadeUp} className="lg:col-span-3">
          <GlassCard padding="none">
            {/* Month Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-[#f0f0f5] capitalize">{monthName}</h2>
                <button
                  onClick={goToday}
                  className="text-xs text-[#00ffcc] hover:text-[#00ffcc]/80 transition-colors px-2 py-0.5 rounded border border-[#00ffcc]/20"
                >
                  {t('calendar.today')}
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={prevMonth}
                  className="p-1.5 rounded-lg text-[#555566] hover:text-[#f0f0f5] hover:bg-white/[0.04] transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextMonth}
                  className="p-1.5 rounded-lg text-[#555566] hover:text-[#f0f0f5] hover:bg-white/[0.04] transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b border-white/[0.06]">
              {DAYS.map((day) => (
                <div key={day} className="px-2 py-2 text-center text-xs font-medium text-[#555566] uppercase">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            {loadingEvents ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-[#00ffcc]/20 border-t-[#00ffcc] rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-7">
                {calendarDays.map((day, i) => {
                  const dayEvents = day ? getEventsForDay(day) : [];
                  const today = day ? isToday(day) : false;
                  return (
                    <div
                      key={i}
                      className={cn(
                        'min-h-[100px] border-b border-r border-white/[0.03] p-1.5',
                        !day && 'bg-white/[0.01]',
                        today && 'bg-[#00ffcc]/[0.03]'
                      )}
                    >
                      {day && (
                        <>
                          <div
                            className={cn(
                              'text-xs mb-1 w-6 h-6 flex items-center justify-center rounded-full',
                              today ? 'bg-[#00ffcc] text-[#0a0a0f] font-bold' : 'text-[#8888a0]'
                            )}
                          >
                            {day}
                          </div>
                          <div className="flex flex-col gap-0.5">
                            {dayEvents.slice(0, 3).map((ev) => {
                              const colors = EVENT_COLORS[ev.event_type] || EVENT_COLORS.other;
                              const isOverdue = ev.status === 'scheduled' && new Date(ev.starts_at) < new Date();
                              return (
                                <button
                                  key={ev.id}
                                  onClick={() => setSelectedEvent(ev)}
                                  className={cn(
                                    'text-[10px] font-medium px-1.5 py-0.5 rounded truncate text-left w-full',
                                    isOverdue ? 'bg-[#ef4444]/10 text-[#ef4444]' : `${colors.bg} ${colors.text}`,
                                    ev.status === 'done' && 'opacity-40 line-through'
                                  )}
                                  title={ev.title}
                                >
                                  {ev.title}
                                </button>
                              );
                            })}
                            {dayEvents.length > 3 && (
                              <div className="text-[10px] text-[#555566] px-1.5">+{dayEvents.length - 3}</div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-5 px-5 py-3 border-t border-white/[0.06] flex-wrap">
              {(Object.entries(EVENT_COLORS) as [EventType, typeof EVENT_COLORS.meeting][]).map(([type, colors]) => (
                <div key={type} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.dot }} />
                  <span className="text-xs text-[#555566]">
                    {type === 'meeting' ? t('calendar.eventTypeMeeting') : type === 'follow_up' ? t('calendar.eventTypeFollowUp') : t('calendar.eventTypeOther')}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Side Panel — 1 column */}
        <motion.div variants={fadeUp} className="flex flex-col gap-4">
          <GlassCard
            header={
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-[#00ffcc]" />
                <h3 className="text-sm font-semibold text-[#f0f0f5]">{t('calendar.upcomingEvents')}</h3>
              </div>
            }
          >
            <div className="flex flex-col gap-3">
              {upcomingEvents.length === 0 && (
                <p className="text-xs text-[#555570]">{t('calendar.noUpcomingEvents')}</p>
              )}
              {upcomingEvents.map((ev) => {
                const colors = EVENT_COLORS[ev.event_type] || EVENT_COLORS.other;
                const leadName = ev.lead_id ? leadNames[ev.lead_id] : null;
                const isOverdue = new Date(ev.starts_at) < new Date();
                return (
                  <button
                    key={ev.id}
                    onClick={() => setSelectedEvent(ev)}
                    className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-[#00ffcc]/10 transition-all text-left w-full"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={cn(
                          'text-[10px] font-semibold px-1.5 py-0.5 rounded',
                          isOverdue ? 'bg-[#ef4444]/10 text-[#ef4444]' : `${colors.bg} ${colors.text}`
                        )}
                      >
                        {ev.event_type === 'meeting' ? t('calendar.eventTypeMeeting') : ev.event_type === 'follow_up' ? t('calendar.eventTypeFollowUp') : t('calendar.eventTypeOther')}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-[#f0f0f5] truncate">{ev.title}</p>
                    {leadName && (
                      <div className="flex items-center gap-1 text-xs text-[#8888a0] mt-0.5">
                        <User className="w-3 h-3" />
                        {leadName}
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-xs text-[#555570] mt-0.5">
                      <Clock className="w-3 h-3" />
                      {new Date(ev.starts_at).toLocaleString('es-PA', { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  </button>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Event detail sheet */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md mx-4 rounded-2xl bg-[#12121a] border border-white/[0.08] p-6 mb-4 sm:mb-0"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={cn(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded',
                      `${(EVENT_COLORS[selectedEvent.event_type] || EVENT_COLORS.other).bg} ${(EVENT_COLORS[selectedEvent.event_type] || EVENT_COLORS.other).text}`
                    )}
                  >
                    {selectedEvent.event_type === 'meeting' ? t('calendar.eventTypeMeeting') : selectedEvent.event_type === 'follow_up' ? t('calendar.eventTypeFollowUp') : t('calendar.eventTypeOther')}
                  </span>
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded',
                    selectedEvent.status === 'done' ? 'bg-[#22c55e]/10 text-[#22c55e]' :
                    selectedEvent.status === 'cancelled' ? 'bg-[#ef4444]/10 text-[#ef4444]' :
                    'bg-white/[0.04] text-[#8888a0]'
                  )}>
                    {selectedEvent.status === 'done' ? t('calendar.statusDone') : selectedEvent.status === 'cancelled' ? t('calendar.statusCancelled') : t('calendar.statusScheduled')}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-white">{selectedEvent.title}</h3>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="p-1 text-[#555570] hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-[#8888a0]">
                <Clock className="w-4 h-4 shrink-0" />
                {new Date(selectedEvent.starts_at).toLocaleString('es-PA', { dateStyle: 'medium', timeStyle: 'short' })}
              </div>
              {selectedEvent.lead_id && leadNames[selectedEvent.lead_id] && (
                <div className="flex items-center gap-2 text-sm text-[#8888a0]">
                  <User className="w-4 h-4 shrink-0" />
                  <button
                    className="text-[#D4A843] hover:underline"
                    onClick={() => {
                      setSelectedEvent(null);
                      navigate('/crm-leads');
                    }}
                  >
                    {leadNames[selectedEvent.lead_id!]}
                  </button>
                </div>
              )}
              {selectedEvent.notes && (
                <p className="text-sm text-[#c0c0d0] bg-white/[0.02] rounded-lg p-3">{selectedEvent.notes}</p>
              )}
            </div>

            {selectedEvent.status === 'scheduled' && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleEventStatusChange(selectedEvent, 'done')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#22c55e]/10 text-[#22c55e] text-sm font-medium hover:bg-[#22c55e]/20 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {t('calendar.markDone')}
                </button>
                <button
                  onClick={() => handleEventStatusChange(selectedEvent, 'cancelled')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#ef4444]/10 text-[#ef4444] text-sm font-medium hover:bg-[#ef4444]/20 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  {t('calendar.cancelEvent')}
                </button>
              </div>
            )}
            <button
              onClick={() => handleDeleteEvent(selectedEvent)}
              className="w-full mt-2 py-2 text-xs text-[#555570] hover:text-[#ef4444] transition-colors"
            >
              {t('calendar.deleteEvent')}
            </button>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md mx-4 rounded-2xl bg-[#12121a] border border-white/[0.08] p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4">{t('calendar.newEvent')}</h3>
            <div className="space-y-3">
              {/* Event type */}
              <div className="flex gap-2">
                {(['meeting', 'follow_up', 'other'] as EventType[]).map((type) => {
                  const colors = EVENT_COLORS[type];
                  const label = type === 'meeting' ? t('calendar.eventTypeMeeting') : type === 'follow_up' ? t('calendar.eventTypeFollowUp') : t('calendar.eventTypeOther');
                  return (
                    <button
                      key={type}
                      onClick={() => setCreateForm((p) => ({ ...p, event_type: type }))}
                      className={cn(
                        'flex-1 py-2 rounded-lg text-xs font-semibold transition-colors border',
                        createForm.event_type === type
                          ? `${colors.bg} ${colors.text} border-current/30`
                          : 'bg-white/[0.04] text-[#8888a0] border-white/[0.06]'
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Title */}
              <input
                value={createForm.title}
                onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
                placeholder={t('common.name')}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-sm placeholder:text-[#555570] outline-none focus:border-[#D4A843]/30"
              />

              {/* Date & time */}
              <div>
                <label className="text-[10px] text-[#555570] uppercase tracking-wider block mb-1">{t('calendar.dateTime')}</label>
                <input
                  type="datetime-local"
                  value={createForm.startsAt}
                  onChange={(e) => setCreateForm((p) => ({ ...p, startsAt: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-sm outline-none focus:border-[#D4A843]/30"
                />
              </div>

              {/* Lead selector */}
              <div>
                <label className="text-[10px] text-[#555570] uppercase tracking-wider block mb-1">{t('calendar.leadSelector')}</label>
                <input
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  placeholder={t('calendar.selectLead')}
                  className="w-full px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-sm placeholder:text-[#555570] outline-none focus:border-[#D4A843]/30 mb-1"
                />
                {leadSearch.trim() && (
                  <div className="max-h-32 overflow-y-auto rounded-xl bg-[#0d0d14] border border-white/[0.06]">
                    <button
                      onClick={() => { setCreateForm((p) => ({ ...p, lead_id: '' })); setLeadSearch(''); }}
                      className="w-full px-4 py-2 text-left text-xs text-[#555570] hover:bg-white/[0.04] transition-colors"
                    >
                      {t('calendar.noLead')}
                    </button>
                    {filteredLeads.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => { setCreateForm((p) => ({ ...p, lead_id: l.id })); setLeadSearch(l.name); }}
                        className={cn(
                          'w-full px-4 py-2 text-left text-sm text-[#c0c0d0] hover:bg-white/[0.04] transition-colors',
                          createForm.lead_id === l.id && 'text-[#D4A843]'
                        )}
                      >
                        {l.name} {l.phone && <span className="text-[#555570] text-xs ml-1">{l.phone}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="text-[10px] text-[#555570] uppercase tracking-wider block mb-1">{t('calendar.optionalNotes')}</label>
                <textarea
                  value={createForm.notes}
                  onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-sm placeholder:text-[#555570] outline-none focus:border-[#D4A843]/30 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-3 rounded-xl border border-white/[0.06] text-[#8888a0] text-sm hover:bg-white/[0.04] transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCreateEvent}
                disabled={!createForm.startsAt}
                className="flex-1 py-3 rounded-xl bg-[#D4A843] text-[#0a0a0f] text-sm font-semibold hover:bg-[#c49835] disabled:opacity-30 transition-colors"
              >
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
