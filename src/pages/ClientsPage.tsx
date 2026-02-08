import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  DollarSign,
  FolderKanban,
  ChevronRight,
  Filter,
} from 'lucide-react';
import type { Client } from '@/types';

const cn = (...classes: (string | boolean | undefined | null)[]) =>
  classes.filter(Boolean).join(' ');

const SECTORS = [
  'All Sectors',
  'Commercial',
  'Industrial',
  'Hospitality',
  'Retail',
  'Healthcare',
  'Education',
  'Government',
];

const MOCK_CLIENTS: (Client & { projects_count: number })[] = [
  {
    id: '1',
    company_name: 'Grupo Motta S.A.',
    contact_name: 'Ricardo Motta',
    email: 'rmotta@grupomotta.com',
    phone: '+507 6700-1234',
    whatsapp: '+507 6700-1234',
    address: 'Costa del Este, Panama City',
    city: 'Panama City',
    sector: 'Commercial',
    monthly_bill: 12500,
    source: 'Referral',
    assigned_to: 'team-1',
    notes: null,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-02-01T10:00:00Z',
    projects_count: 3,
    assigned_member: { id: 'team-1', email: 'carlos@solaris.pa', full_name: 'Carlos Rivera', role: 'sales', avatar_url: null, phone: null, is_active: true, created_at: '', updated_at: '' },
  },
  {
    id: '2',
    company_name: 'Hotel Riu Plaza Panama',
    contact_name: 'Maria Elena Vargas',
    email: 'mvargas@riu.com',
    phone: '+507 6800-5678',
    whatsapp: '+507 6800-5678',
    address: 'Calle 50, Bella Vista',
    city: 'Panama City',
    sector: 'Hospitality',
    monthly_bill: 28000,
    source: 'Website',
    assigned_to: 'team-2',
    notes: null,
    created_at: '2026-01-20T10:00:00Z',
    updated_at: '2026-02-03T10:00:00Z',
    projects_count: 1,
    assigned_member: { id: 'team-2', email: 'ana@solaris.pa', full_name: 'Ana Martinez', role: 'sales', avatar_url: null, phone: null, is_active: true, created_at: '', updated_at: '' },
  },
  {
    id: '3',
    company_name: 'Super 99 - Multimax',
    contact_name: 'Jose Gonzalez',
    email: 'jgonzalez@super99.com',
    phone: '+507 6900-9012',
    whatsapp: null,
    address: 'Via Espana, El Cangrejo',
    city: 'Panama City',
    sector: 'Retail',
    monthly_bill: 18500,
    source: 'Cold Call',
    assigned_to: 'team-1',
    notes: null,
    created_at: '2026-01-22T10:00:00Z',
    updated_at: '2026-02-04T10:00:00Z',
    projects_count: 2,
    assigned_member: { id: 'team-1', email: 'carlos@solaris.pa', full_name: 'Carlos Rivera', role: 'sales', avatar_url: null, phone: null, is_active: true, created_at: '', updated_at: '' },
  },
  {
    id: '4',
    company_name: 'Hospital Nacional',
    contact_name: 'Dr. Patricia Herrera',
    email: 'pherrera@hospitalnacional.pa',
    phone: '+507 6100-3456',
    whatsapp: '+507 6100-3456',
    address: 'Ave. Cuba, Calidonia',
    city: 'Panama City',
    sector: 'Healthcare',
    monthly_bill: 42000,
    source: 'Referral',
    assigned_to: 'team-2',
    notes: null,
    created_at: '2026-01-25T10:00:00Z',
    updated_at: '2026-02-05T10:00:00Z',
    projects_count: 1,
    assigned_member: { id: 'team-2', email: 'ana@solaris.pa', full_name: 'Ana Martinez', role: 'sales', avatar_url: null, phone: null, is_active: true, created_at: '', updated_at: '' },
  },
  {
    id: '5',
    company_name: 'Cerveceria Nacional S.A.',
    contact_name: 'Fernando Aleman',
    email: 'faleman@cerveznacional.com',
    phone: '+507 6200-7890',
    whatsapp: '+507 6200-7890',
    address: 'Via Tocumen, Juan Diaz',
    city: 'Panama City',
    sector: 'Industrial',
    monthly_bill: 65000,
    source: 'Trade Show',
    assigned_to: 'team-1',
    notes: null,
    created_at: '2026-01-28T10:00:00Z',
    updated_at: '2026-02-06T10:00:00Z',
    projects_count: 2,
    assigned_member: { id: 'team-1', email: 'carlos@solaris.pa', full_name: 'Carlos Rivera', role: 'sales', avatar_url: null, phone: null, is_active: true, created_at: '', updated_at: '' },
  },
  {
    id: '6',
    company_name: 'Universidad Tecnologica de Panama',
    contact_name: 'Prof. Luis Castillo',
    email: 'lcastillo@utp.ac.pa',
    phone: '+507 6300-4567',
    whatsapp: null,
    address: 'Campus Victor Levi Sasso',
    city: 'Panama City',
    sector: 'Education',
    monthly_bill: 35000,
    source: 'Website',
    assigned_to: 'team-2',
    notes: null,
    created_at: '2026-02-01T10:00:00Z',
    updated_at: '2026-02-07T10:00:00Z',
    projects_count: 0,
    assigned_member: { id: 'team-2', email: 'ana@solaris.pa', full_name: 'Ana Martinez', role: 'sales', avatar_url: null, phone: null, is_active: true, created_at: '', updated_at: '' },
  },
  {
    id: '7',
    company_name: 'Autoridad del Canal de Panama',
    contact_name: 'Ing. Roberto Diaz',
    email: 'rdiaz@pancanal.com',
    phone: '+507 6400-8901',
    whatsapp: '+507 6400-8901',
    address: 'Edificio de la Administracion, Balboa',
    city: 'Panama City',
    sector: 'Government',
    monthly_bill: 95000,
    source: 'Referral',
    assigned_to: 'team-1',
    notes: null,
    created_at: '2026-02-03T10:00:00Z',
    updated_at: '2026-02-08T10:00:00Z',
    projects_count: 1,
    assigned_member: { id: 'team-1', email: 'carlos@solaris.pa', full_name: 'Carlos Rivera', role: 'sales', avatar_url: null, phone: null, is_active: true, created_at: '', updated_at: '' },
  },
  {
    id: '8',
    company_name: 'Pricesmart Panama',
    contact_name: 'Daniela Rios',
    email: 'drios@pricesmart.com',
    phone: '+507 6500-2345',
    whatsapp: '+507 6500-2345',
    address: 'Condado del Rey',
    city: 'Panama City',
    sector: 'Retail',
    monthly_bill: 22000,
    source: 'Website',
    assigned_to: 'team-2',
    notes: null,
    created_at: '2026-02-05T10:00:00Z',
    updated_at: '2026-02-08T10:00:00Z',
    projects_count: 1,
    assigned_member: { id: 'team-2', email: 'ana@solaris.pa', full_name: 'Ana Martinez', role: 'sales', avatar_url: null, phone: null, is_active: true, created_at: '', updated_at: '' },
  },
];

const sectorColors: Record<string, string> = {
  Commercial: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Industrial: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  Hospitality: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  Retail: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  Healthcare: 'bg-red-500/20 text-red-400 border-red-500/30',
  Education: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  Government: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

const listStagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemFadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const ClientsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('All Sectors');

  const filtered = useMemo(() => {
    return MOCK_CLIENTS.filter((c) => {
      const matchesSearch =
        !search ||
        c.company_name.toLowerCase().includes(search.toLowerCase()) ||
        c.contact_name.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase());
      const matchesSector = sectorFilter === 'All Sectors' || c.sector === sectorFilter;
      return matchesSearch && matchesSector;
    });
  }, [search, sectorFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8b5cf6]/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-[#8b5cf6]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{t('clients.title', 'Clients')}</h1>
              <p className="text-sm text-white/40">{t('clients.subtitle', 'Manage your client relationships')}</p>
            </div>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00ffcc] text-[#0a0a0f] font-semibold text-sm hover:shadow-lg hover:shadow-[#00ffcc]/20 transition-shadow"
        >
          <Plus className="w-4 h-4" />
          {t('clients.newClient', 'New Client')}
        </motion.button>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('clients.searchPlaceholder', 'Search clients...')}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20 focus:outline-none focus:border-[#00ffcc]/40 transition-colors text-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="appearance-none pl-10 pr-8 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/70 focus:outline-none focus:border-[#00ffcc]/40 transition-colors text-sm cursor-pointer"
          >
            {SECTORS.map((s) => (
              <option key={s} value={s} className="bg-[#12121a] text-white">
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Client cards grid */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-white/20" />
          </div>
          <h3 className="text-lg font-semibold text-white/60">{t('clients.noClients', 'No clients found')}</h3>
          <p className="text-sm text-white/30 mt-1 max-w-sm">
            {t('clients.noClientsDescription', 'Try adjusting your search or filter to find what you are looking for.')}
          </p>
        </motion.div>
      ) : (
        <motion.div
          variants={listStagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          {filtered.map((client) => (
            <motion.div
              key={client.id}
              variants={itemFadeUp}
              onClick={() => navigate(`/clients/${client.id}`)}
              className="group bg-[#12121a]/80 backdrop-blur-sm border border-white/[0.06] rounded-xl p-5 cursor-pointer hover:border-[#00ffcc]/20 hover:bg-[#12121a] transition-all duration-200"
            >
              {/* Company + Sector */}
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-white truncate group-hover:text-[#00ffcc] transition-colors">
                    {client.company_name}
                  </h3>
                  <p className="text-sm text-white/40 truncate">{client.contact_name}</p>
                </div>
                {client.sector && (
                  <span
                    className={cn(
                      'shrink-0 ml-2 px-2 py-0.5 rounded-md text-xs font-medium border',
                      sectorColors[client.sector] || 'bg-white/10 text-white/50 border-white/10'
                    )}
                  >
                    {client.sector}
                  </span>
                )}
              </div>

              {/* Info rows */}
              <div className="space-y-2 mb-4">
                {client.email && (
                  <div className="flex items-center gap-2 text-sm text-white/40">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2 text-sm text-white/40">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>{client.phone}</span>
                  </div>
                )}
              </div>

              {/* Stats row */}
              <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-sm">
                    <DollarSign className="w-3.5 h-3.5 text-[#00ffcc]/60" />
                    <span className="text-white/60">
                      ${(client.monthly_bill ?? 0).toLocaleString()}
                      <span className="text-white/30">/mo</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <FolderKanban className="w-3.5 h-3.5 text-[#8b5cf6]/60" />
                    <span className="text-white/60">{client.projects_count}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-[#00ffcc]/60 transition-colors" />
              </div>

              {/* Assigned */}
              {client.assigned_member && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#8b5cf6]/20 flex items-center justify-center text-[10px] font-bold text-[#8b5cf6]">
                    {client.assigned_member.full_name.charAt(0)}
                  </div>
                  <span className="text-xs text-white/30">{client.assigned_member.full_name}</span>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default ClientsPage;
