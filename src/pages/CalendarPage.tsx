import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  Wrench,
  Plus,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { InstallationStatus } from '@/types/installation';

const cn = (...classes: (string | boolean | undefined | null)[]) => classes.filter(Boolean).join(' ');

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  status: InstallationStatus;
  location: string;
  crewLead: string;
  systemSize: string;
}

const statusColors: Record<InstallationStatus, { bg: string; text: string; badge: 'info' | 'purple' | 'success' | 'error' }> = {
  planned: { bg: 'bg-[#0ea5e9]/10', text: 'text-[#0ea5e9]', badge: 'info' },
  in_progress: { bg: 'bg-[#8b5cf6]/10', text: 'text-[#8b5cf6]', badge: 'purple' },
  completed: { bg: 'bg-[#22c55e]/10', text: 'text-[#22c55e]', badge: 'success' },
  delayed: { bg: 'bg-[#ef4444]/10', text: 'text-[#ef4444]', badge: 'error' },
};

const statusLabels: Record<InstallationStatus, string> = {
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
  delayed: 'Delayed',
};

// Mock events
const mockEvents: CalendarEvent[] = [
  {
    id: 'e1', title: 'Supermarket El Rey #4', date: '2026-02-10', endDate: '2026-02-14',
    status: 'in_progress', location: 'David, Chiriqui', crewLead: 'Miguel Santos', systemSize: '120 kWp',
  },
  {
    id: 'e2', title: 'Office Tower PH', date: '2026-02-17', endDate: '2026-02-21',
    status: 'planned', location: 'Punta Pacifica, PTY', crewLead: 'Carlos Reyes', systemSize: '100 kWp',
  },
  {
    id: 'e3', title: 'Factory Colon FZ', date: '2026-02-24', endDate: '2026-03-07',
    status: 'planned', location: 'Colon Free Zone', crewLead: 'Miguel Santos', systemSize: '250 kWp',
  },
  {
    id: 'e4', title: 'Warehouse PTY-12', date: '2026-03-03', endDate: '2026-03-14',
    status: 'planned', location: 'Tocumen, PTY', crewLead: 'Carlos Reyes', systemSize: '350 kWp',
  },
  {
    id: 'e5', title: 'Clinic San Fernando', date: '2026-01-20', endDate: '2026-01-28',
    status: 'completed', location: 'El Cangrejo, PTY', crewLead: 'Miguel Santos', systemSize: '75 kWp',
  },
  {
    id: 'e6', title: 'Hotel Marriott', date: '2026-02-12', endDate: '2026-02-13',
    status: 'delayed', location: 'Costa del Este, PTY', crewLead: 'TBD', systemSize: '150 kWp',
  },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarPage() {
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 1)); // Feb 2026

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [firstDayOfWeek, daysInMonth]);

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return mockEvents.filter((ev) => {
      const start = ev.date;
      const end = ev.endDate || ev.date;
      return dateStr >= start && dateStr <= end;
    });
  };

  const isToday = (day: number) => {
    const now = new Date();
    return day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const upcomingEvents = mockEvents
    .filter((ev) => ev.status !== 'completed')
    .sort((a, b) => a.date.localeCompare(b.date));

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
            <Button variant="primary" icon={<Plus className="w-4 h-4" />}>
              {t('calendar.newEvent')}
            </Button>
          }
        />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Grid - 3 columns */}
        <motion.div variants={fadeUp} className="lg:col-span-3">
          <GlassCard padding="none">
            {/* Month Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-[#f0f0f5]">{monthName}</h2>
                <button
                  onClick={goToday}
                  className="text-xs text-[#00ffcc] hover:text-[#00ffcc]/80 transition-colors px-2 py-0.5 rounded border border-[#00ffcc]/20"
                >
                  {t('calendar.today')}
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={prevMonth} className="p-1.5 rounded-lg text-[#555566] hover:text-[#f0f0f5] hover:bg-white/[0.04] transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={nextMonth} className="p-1.5 rounded-lg text-[#555566] hover:text-[#f0f0f5] hover:bg-white/[0.04] transition-colors">
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
            <div className="grid grid-cols-7">
              {calendarDays.map((day, i) => {
                const events = day ? getEventsForDay(day) : [];
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
                          {events.slice(0, 2).map((ev) => (
                            <div
                              key={ev.id}
                              className={cn(
                                'text-[10px] font-medium px-1.5 py-0.5 rounded truncate',
                                statusColors[ev.status].bg,
                                statusColors[ev.status].text
                              )}
                              title={ev.title}
                            >
                              {ev.title}
                            </div>
                          ))}
                          {events.length > 2 && (
                            <div className="text-[10px] text-[#555566] px-1.5">+{events.length - 2} more</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 px-5 py-3 border-t border-white/[0.06]">
              {(Object.keys(statusColors) as InstallationStatus[]).map((status) => (
                <div key={status} className="flex items-center gap-1.5">
                  <span className={cn('w-2 h-2 rounded-full', statusColors[status].bg.replace('/10', ''))} style={{ backgroundColor: statusColors[status].text.replace('text-[', '').replace(']', '') }} />
                  <span className="text-xs text-[#555566]">{statusLabels[status]}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Side Panel - 1 column */}
        <motion.div variants={fadeUp} className="flex flex-col gap-4">
          <GlassCard
            header={
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-[#00ffcc]" />
                <h3 className="text-sm font-semibold text-[#f0f0f5]">Upcoming Installations</h3>
              </div>
            }
          >
            <div className="flex flex-col gap-3">
              {upcomingEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-[#00ffcc]/10 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[#f0f0f5]">{ev.title}</span>
                    <Badge variant={statusColors[ev.status].badge} size="sm">
                      {statusLabels[ev.status]}
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-[#8888a0]">
                      <Wrench className="w-3 h-3 text-[#555566]" />
                      {ev.systemSize}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[#8888a0]">
                      <MapPin className="w-3 h-3 text-[#555566]" />
                      {ev.location}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[#8888a0]">
                      <Clock className="w-3 h-3 text-[#555566]" />
                      {new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {ev.endDate && ` - ${new Date(ev.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </motion.div>
  );
}
