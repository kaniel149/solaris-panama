import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  MessageCircle,
  Phone,
  RefreshCw,
  Plus,
  Search,
  Globe,
  Instagram,
  Facebook,
  X,
  Send,
} from 'lucide-react';
import {
  getLeads,
  updateLead,
  createLead,
  addLeadNote,
  getLeadNotes,
  getLeadStats,
  type CrmLead,
  type LeadNote,
} from '@/services/leadService';

const cn = (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' ');

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: 'Nuevo', color: '#00ffcc', bg: 'rgba(0,255,204,0.1)' },
  contacted: { label: 'Contactado', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  qualified: { label: 'Calificado', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  proposal_sent: { label: 'Propuesta', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  won: { label: 'Ganado', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  lost: { label: 'Perdido', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  // Non-customer statuses (hidden by default)
  vendor: { label: 'Proveedor', color: '#a855f7', bg: 'rgba(168,85,247,0.1)' },
  partner: { label: 'Socio', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  not_a_lead: { label: 'No es Lead', color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
};

// Statuses excluded from default pipeline view (vendors, partners, junk)
const NON_CUSTOMER_STATUSES = ['vendor', 'partner', 'not_a_lead'];

const SOURCE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  google_ads: { label: 'Google Ads', icon: <Globe className="w-3 h-3" />, color: '#4285f4' },
  meta_ads: { label: 'Meta Ads', icon: <Facebook className="w-3 h-3" />, color: '#1877f2' },
  facebook: { label: 'Facebook', icon: <Facebook className="w-3 h-3" />, color: '#1877f2' },
  instagram: { label: 'Instagram', icon: <Instagram className="w-3 h-3" />, color: '#e4405f' },
  whatsapp: { label: 'WhatsApp', icon: <MessageCircle className="w-3 h-3" />, color: '#25d366' },
  website: { label: 'Website', icon: <Globe className="w-3 h-3" />, color: '#D4A843' },
  manual: { label: 'Manual', icon: <Plus className="w-3 h-3" />, color: '#8888a0' },
};

const STATUSES = ['new', 'contacted', 'qualified', 'proposal_sent', 'won', 'lost', 'vendor', 'partner', 'not_a_lead'];

export default function CrmLeadsPage() {
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [showNonCustomers, setShowNonCustomers] = useState(false); // hide vendors/partners/not_a_lead by default
  const [stats, setStats] = useState({ total: 0, new: 0, contacted: 0, qualified: 0, won: 0, bySource: {} as Record<string, number> });

  // Detail panel
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [addingLead, setAddingLead] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({ name: '', phone: '', source: 'manual' });

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const [res, s] = await Promise.all([
        getLeads({ search: search || undefined, status: statusFilter || undefined, source: sourceFilter || undefined }),
        getLeadStats(),
      ]);
      // Default: hide vendors / partners / not_a_lead from main pipeline view
      // (still searchable via the status dropdown explicitly)
      const filtered = (showNonCustomers || statusFilter)
        ? res.data
        : res.data.filter((l) => !NON_CUSTOMER_STATUSES.includes(l.status || ''));
      setLeads(filtered);
      setStats(s);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    }
    setLoading(false);
  }, [search, statusFilter, sourceFilter, showNonCustomers]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleStatusChange = async (lead: CrmLead, newStatus: string) => {
    await updateLead(lead.id, { status: newStatus } as Partial<CrmLead>);
    fetchLeads();
    if (selectedLead?.id === lead.id) setSelectedLead({ ...selectedLead, status: newStatus });
  };

  const handleSelectLead = async (lead: CrmLead) => {
    setSelectedLead(lead);
    try {
      const n = await getLeadNotes(lead.id);
      setNotes(n);
    } catch { setNotes([]); }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !selectedLead) return;
    await addLeadNote(selectedLead.id, newNote.trim(), 'Admin');
    setNewNote('');
    const n = await getLeadNotes(selectedLead.id);
    setNotes(n);
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, color: '#D4A843' },
          { label: 'Nuevos', value: stats.new, color: '#00ffcc' },
          { label: 'Contactados', value: stats.contacted, color: '#8b5cf6' },
          { label: 'Calificados', value: stats.qualified, color: '#f59e0b' },
          { label: 'Ganados', value: stats.won, color: '#22c55e' },
        ].map((s) => (
          <div key={s.label} className="px-4 py-3 rounded-xl bg-[#12121a] border border-white/[0.06]">
            <div className="text-xs text-[#555570] mb-1">{s.label}</div>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

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
          {showNonCustomers ? '👥 Mostrando todos' : '🙈 Ocultar proveedores'}
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
                        <div className="text-sm font-medium text-white">{lead.name}</div>
                        {lead.monthly_bill && (
                          <div className="text-[11px] text-[#555570]">${lead.monthly_bill}/mes</div>
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
                </div>

                {/* Attribution badges — gclid / fbclid / utm / ad_id */}
                {(selectedLead.gclid || selectedLead.fbclid || selectedLead.ad_id || selectedLead.utm_source || selectedLead.utm_medium) && (
                  <div>
                    <div className="text-[10px] text-[#555570] uppercase tracking-wider mb-2">Atribución</div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedLead.gclid && (
                        <span
                          title={selectedLead.gclid}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-[#4285f4]/10 text-[#4285f4] border border-[#4285f4]/20"
                        >
                          🎯 Google · gclid
                        </span>
                      )}
                      {selectedLead.fbclid && (
                        <span
                          title={selectedLead.fbclid}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-[#1877f2]/10 text-[#1877f2] border border-[#1877f2]/20"
                        >
                          📘 Meta · fbclid
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
                          await updateLead(selectedLead.id, {
                            deal_value: val,
                            deal_currency: 'USD',
                            won_at: selectedLead.won_at || new Date().toISOString(),
                          } as Partial<CrmLead>);
                          setSelectedLead({
                            ...selectedLead,
                            deal_value: val,
                            won_at: selectedLead.won_at || new Date().toISOString(),
                          } as CrmLead);
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
                </div>

                {/* Message */}
                {selectedLead.message && (
                  <div>
                    <div className="text-[10px] text-[#555570] uppercase tracking-wider mb-1">Mensaje</div>
                    <p className="text-sm text-[#c0c0d0] bg-white/[0.02] rounded-lg p-3">{selectedLead.message}</p>
                  </div>
                )}

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
                  <div className="flex gap-2">
                    <input
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                      placeholder="Agregar nota..."
                      className="flex-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white text-sm placeholder:text-[#555570] outline-none focus:border-[#D4A843]/30"
                    />
                    <button
                      onClick={handleAddNote}
                      disabled={!newNote.trim()}
                      className="p-2 rounded-lg bg-[#D4A843]/10 text-[#D4A843] hover:bg-[#D4A843]/20 disabled:opacity-30 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
