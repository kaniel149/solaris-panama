import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Clock,
  ChevronRight,
  ChevronLeft,
  Trash2,
  X,
  AlertTriangle,
  User,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  isOverdueTask,
  type Task,
  type TaskStatus,
  type TaskPriority,
} from '@/services/taskService';
import { getOverdueFollowUps, type LeadEvent } from '@/services/leadEventsService';
import { getLeads, type CrmLead } from '@/services/leadService';

const cn = (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' ');

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

const COLUMNS: { status: TaskStatus; color: string }[] = [
  { status: 'todo', color: '#8888a0' },
  { status: 'in_progress', color: '#f59e0b' },
  { status: 'done', color: '#22c55e' },
];

const PRIORITY_COLORS: Record<TaskPriority, { text: string; bg: string }> = {
  low: { text: 'text-[#8888a0]', bg: 'bg-[#8888a0]/10' },
  medium: { text: 'text-[#f59e0b]', bg: 'bg-[#f59e0b]/10' },
  high: { text: 'text-[#ef4444]', bg: 'bg-[#ef4444]/10' },
};

function fmtDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'short' });
}

export default function TaskBoardPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const locale = i18n.language?.startsWith('es') ? 'es-PA' : 'en-US';

  const [tasks, setTasks] = useState<Task[]>([]);
  const [overdueEvents, setOverdueEvents] = useState<LeadEvent[]>([]);
  const [leadNames, setLeadNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | ''>('');
  const [dueDateOnly, setDueDateOnly] = useState(false);

  // Create modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    due_date: '',
    lead_id: '',
    leadSearch: '',
  });
  const [allLeads, setAllLeads] = useState<CrmLead[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [taskList, overdue, leadsRes] = await Promise.all([
        getTasks(),
        getOverdueFollowUps(),
        getLeads({ limit: 200 }),
      ]);
      setTasks(taskList);
      setOverdueEvents(overdue);

      const nameMap: Record<string, string> = {};
      for (const l of leadsRes.data) nameMap[l.id] = l.name;
      setLeadNames(nameMap);
      setAllLeads(leadsRes.data);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredTasks = useMemo(() => {
    let list = tasks;
    if (priorityFilter) list = list.filter((t) => t.priority === priorityFilter);
    if (dueDateOnly) list = list.filter((t) => !!t.due_date);
    return list;
  }, [tasks, priorityFilter, dueDateOnly]);

  const columns = useMemo(
    () =>
      COLUMNS.map((col) => ({
        ...col,
        tasks: filteredTasks.filter((t) => t.status === col.status),
      })),
    [filteredTasks]
  );

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    await createTask({
      title: form.title.trim(),
      description: form.description.trim() || null,
      priority: form.priority,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      lead_id: form.lead_id || null,
    });
    setShowModal(false);
    setForm({ title: '', description: '', priority: 'medium', due_date: '', lead_id: '', leadSearch: '' });
    loadData();
  };

  const handleMoveStatus = async (task: Task, direction: 'forward' | 'back') => {
    const idx = COLUMNS.findIndex((c) => c.status === task.status);
    const next = direction === 'forward' ? COLUMNS[idx + 1] : COLUMNS[idx - 1];
    if (!next) return;
    await updateTask(task.id, { status: next.status });
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: next.status } : t));
  };

  const handleDelete = async (id: string) => {
    await deleteTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const filteredLeads = useMemo(() => {
    if (!form.leadSearch.trim()) return allLeads.slice(0, 15);
    const q = form.leadSearch.toLowerCase();
    return allLeads.filter((l) => l.name.toLowerCase().includes(q) || l.phone?.includes(q)).slice(0, 15);
  }, [allLeads, form.leadSearch]);

  return (
    <motion.div
      className="p-6 lg:p-8 max-w-[1400px] mx-auto"
      initial="initial"
      animate="animate"
      variants={{ animate: { transition: { staggerChildren: 0.05 } } }}
    >
      <motion.div variants={fadeUp}>
        <PageHeader
          title={t('tasks.title')}
          description={t('tasks.subtitle')}
          gradient
          actions={
            <Button
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setShowModal(true);
                setForm({ title: '', description: '', priority: 'medium', due_date: '', lead_id: '', leadSearch: '' });
              }}
            >
              {t('tasks.newTask')}
            </Button>
          }
        />
      </motion.div>

      {/* Overdue follow-ups banner */}
      {overdueEvents.length > 0 && (
        <motion.div variants={fadeUp}>
          <GlassCard
            header={
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#ef4444]" />
                <h3 className="text-sm font-semibold text-[#ef4444]">
                  {t('tasks.overdueFollowUps')} ({overdueEvents.length})
                </h3>
              </div>
            }
          >
            <div className="flex flex-wrap gap-2">
              {overdueEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#ef4444]/5 border border-[#ef4444]/20 text-sm"
                >
                  <Clock className="w-3.5 h-3.5 text-[#ef4444] shrink-0" />
                  <span className="text-[#f0f0f5] font-medium">{ev.title}</span>
                  {ev.lead_id && leadNames[ev.lead_id] && (
                    <>
                      <span className="text-[#555570]">·</span>
                      <button
                        onClick={() => navigate('/crm-leads')}
                        className="text-[#D4A843] hover:underline text-xs"
                      >
                        {leadNames[ev.lead_id]}
                      </button>
                    </>
                  )}
                  <span className="text-[10px] text-[#ef4444] ml-1">
                    {fmtDate(ev.starts_at, locale)}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Filters */}
      <motion.div variants={fadeUp} className="flex flex-wrap gap-3 mb-6">
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | '')}
          className="px-3 py-2 rounded-xl bg-[#12121a] border border-white/[0.06] text-[#8888a0] text-sm outline-none"
        >
          <option value="">{t('tasks.allPriorities')}</option>
          {(['high', 'medium', 'low'] as TaskPriority[]).map((p) => (
            <option key={p} value={p}>{t(`tasks.${p}`)}</option>
          ))}
        </select>
        <button
          onClick={() => setDueDateOnly((v) => !v)}
          className={cn(
            'px-3 py-2 rounded-xl border text-sm transition-colors',
            dueDateOnly
              ? 'bg-[#D4A843]/10 border-[#D4A843]/30 text-[#D4A843]'
              : 'bg-[#12121a] border-white/[0.06] text-[#8888a0] hover:text-white'
          )}
        >
          {t('tasks.withDueDate')}
        </button>
      </motion.div>

      {/* Kanban board */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-[#D4A843]/20 border-t-[#D4A843] rounded-full animate-spin" />
        </div>
      ) : (
        <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {columns.map((col, colIdx) => (
            <div key={col.status} className="flex flex-col gap-3">
              {/* Column header */}
              <div className="flex items-center gap-2 px-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                <span className="text-sm font-semibold text-[#f0f0f5]">{t(`tasks.${col.status}`)}</span>
                <span className="text-xs text-[#555570] ml-auto">{col.tasks.length}</span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2.5 min-h-[120px]">
                <AnimatePresence>
                  {col.tasks.map((task) => {
                    const overdue = isOverdueTask(task);
                    const pColors = PRIORITY_COLORS[task.priority];
                    return (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="p-3.5 rounded-xl bg-[#12121a] border border-white/[0.06] hover:border-white/[0.10] transition-all"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm font-medium text-[#f0f0f5] leading-tight">{task.title}</p>
                          <button
                            onClick={() => handleDelete(task.id)}
                            className="p-1 text-[#555570] hover:text-[#ef4444] transition-colors shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {task.description && (
                          <p className="text-xs text-[#8888a0] mb-2 line-clamp-2">{task.description}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', pColors.bg, pColors.text)}>
                            {t(`tasks.${task.priority}`)}
                          </span>

                          {task.due_date && (
                            <span className={cn(
                              'flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded',
                              overdue
                                ? 'bg-[#ef4444]/10 text-[#ef4444]'
                                : 'bg-white/[0.04] text-[#8888a0]'
                            )}>
                              <Clock className="w-3 h-3" />
                              {fmtDate(task.due_date, locale)}
                              {overdue && ` · ${t('tasks.overdue')}`}
                            </span>
                          )}

                          {task.lead_id && leadNames[task.lead_id] && (
                            <button
                              onClick={() => navigate('/crm-leads')}
                              className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[#D4A843]/10 text-[#D4A843] hover:bg-[#D4A843]/20 transition-colors"
                            >
                              <User className="w-3 h-3" />
                              {leadNames[task.lead_id]}
                            </button>
                          )}
                        </div>

                        {/* Move buttons */}
                        <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-white/[0.04]">
                          {colIdx > 0 && (
                            <button
                              onClick={() => handleMoveStatus(task, 'back')}
                              className="flex items-center gap-1 text-[10px] text-[#555570] hover:text-[#f0f0f5] transition-colors px-1.5 py-0.5 rounded hover:bg-white/[0.04]"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                              {t(`tasks.${COLUMNS[colIdx - 1].status}`)}
                            </button>
                          )}
                          <div className="flex-1" />
                          {colIdx < COLUMNS.length - 1 && (
                            <button
                              onClick={() => handleMoveStatus(task, 'forward')}
                              className="flex items-center gap-1 text-[10px] text-[#555570] hover:text-[#f0f0f5] transition-colors px-1.5 py-0.5 rounded hover:bg-white/[0.04]"
                            >
                              {t(`tasks.${COLUMNS[colIdx + 1].status}`)}
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {col.tasks.length === 0 && (
                  <div className="rounded-xl border border-dashed border-white/[0.06] p-6 text-center">
                    <span className="text-xs text-[#555570]">{t('tasks.noTasks')}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Create Task Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md mx-4 rounded-2xl bg-[#12121a] border border-white/[0.08] p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">{t('tasks.newTask')}</h3>
                <button onClick={() => setShowModal(false)} className="p-1 text-[#555570] hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder={t('common.name')}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-sm placeholder:text-[#555570] outline-none focus:border-[#D4A843]/30"
                />

                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder={t('tasks.optionalDescription')}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-sm placeholder:text-[#555570] outline-none focus:border-[#D4A843]/30 resize-none"
                />

                <div className="flex gap-2">
                  {(['high', 'medium', 'low'] as TaskPriority[]).map((p) => {
                    const colors = PRIORITY_COLORS[p];
                    return (
                      <button
                        key={p}
                        onClick={() => setForm((prev) => ({ ...prev, priority: p }))}
                        className={cn(
                          'flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors',
                          form.priority === p ? `${colors.bg} ${colors.text} border-current/30` : 'bg-white/[0.04] text-[#8888a0] border-white/[0.06]'
                        )}
                      >
                        {t(`tasks.${p}`)}
                      </button>
                    );
                  })}
                </div>

                <div>
                  <label className="text-[10px] text-[#555570] uppercase tracking-wider block mb-1">{t('tasks.dueDate')}</label>
                  <input
                    type="datetime-local"
                    value={form.due_date}
                    onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-sm outline-none focus:border-[#D4A843]/30"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#555570] uppercase tracking-wider block mb-1">{t('tasks.linkedLead')}</label>
                  <input
                    value={form.leadSearch}
                    onChange={(e) => setForm((p) => ({ ...p, leadSearch: e.target.value }))}
                    placeholder={t('calendar.selectLead')}
                    className="w-full px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white text-sm placeholder:text-[#555570] outline-none focus:border-[#D4A843]/30 mb-1"
                  />
                  {form.leadSearch.trim() && (
                    <div className="max-h-28 overflow-y-auto rounded-xl bg-[#0d0d14] border border-white/[0.06]">
                      <button
                        onClick={() => setForm((p) => ({ ...p, lead_id: '', leadSearch: '' }))}
                        className="w-full px-4 py-2 text-left text-xs text-[#555570] hover:bg-white/[0.04] transition-colors"
                      >
                        {t('calendar.noLead')}
                      </button>
                      {filteredLeads.map((l) => (
                        <button
                          key={l.id}
                          onClick={() => setForm((p) => ({ ...p, lead_id: l.id, leadSearch: l.name }))}
                          className={cn(
                            'w-full px-4 py-2 text-left text-sm text-[#c0c0d0] hover:bg-white/[0.04] transition-colors',
                            form.lead_id === l.id && 'text-[#D4A843]'
                          )}
                        >
                          {l.name}
                          {l.phone && <span className="text-xs text-[#555570] ml-2">{l.phone}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl border border-white/[0.06] text-[#8888a0] text-sm hover:bg-white/[0.04] transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!form.title.trim()}
                  className="flex-1 py-3 rounded-xl bg-[#D4A843] text-[#0a0a0f] text-sm font-semibold hover:bg-[#c49835] disabled:opacity-30 transition-colors"
                >
                  {t('common.save')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
