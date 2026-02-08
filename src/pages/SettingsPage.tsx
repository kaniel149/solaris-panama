import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  User,
  Users,
  Puzzle,
  Bell,
  Camera,
  Mail,
  Globe,
  Shield,
  Plus,
  Check,
  MessageSquare,
  Smartphone,
  Database,
  Sun,
  Wifi,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const cn = (...classes: (string | boolean | undefined | null)[]) =>
  classes.filter(Boolean).join(' ');

type SettingsTab = 'profile' | 'team' | 'integrations' | 'notifications';

const TABS: { key: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'team', label: 'Team', icon: Users },
  { key: 'integrations', label: 'Integrations', icon: Puzzle },
  { key: 'notifications', label: 'Notifications', icon: Bell },
];

const MOCK_TEAM = [
  { id: '1', name: 'Kaniel Tordjman', email: 'kaniel@solaris.pa', role: 'admin', active: true },
  { id: '2', name: 'Carlos Rivera', email: 'carlos@solaris.pa', role: 'sales', active: true },
  { id: '3', name: 'Ana Martinez', email: 'ana@solaris.pa', role: 'sales', active: true },
  { id: '4', name: 'Diego Flores', email: 'diego@solaris.pa', role: 'engineer', active: true },
  { id: '5', name: 'Pedro Castillo', email: 'pedro@solaris.pa', role: 'installer', active: false },
];

const INTEGRATIONS = [
  {
    id: 'supabase',
    name: 'Supabase',
    description: 'Database and authentication backend',
    icon: Database,
    color: '#3ECF8E',
    connected: true,
  },
  {
    id: 'google-solar',
    name: 'Google Solar API',
    description: 'Roof analysis and solar potential data',
    icon: Sun,
    color: '#FBBC05',
    connected: true,
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Client communication and notifications',
    icon: MessageSquare,
    color: '#25D366',
    connected: false,
  },
  {
    id: 'solaredge',
    name: 'SolarEdge',
    description: 'Inverter monitoring and performance data',
    icon: BarChart3,
    color: '#E31937',
    connected: false,
  },
  {
    id: 'huawei',
    name: 'Huawei FusionSolar',
    description: 'Solar inverter monitoring platform',
    icon: Wifi,
    color: '#CF0A2C',
    connected: false,
  },
];

const roleColors: Record<string, string> = {
  admin: 'bg-[#00ffcc]/20 text-[#00ffcc] border-[#00ffcc]/30',
  sales: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  engineer: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  installer: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [language, setLanguage] = useState('en');
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    whatsappAlerts: false,
    pushNotifications: true,
    proposalViewed: true,
    newLead: true,
    siteOffline: true,
    dailyReport: false,
  });

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center">
          <Settings className="w-5 h-5 text-white/60" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{t('settings.title', 'Settings')}</h1>
          <p className="text-sm text-white/40">{t('settings.subtitle', 'Manage your account and preferences')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] w-fit">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === tab.key
                  ? 'bg-[#00ffcc]/20 text-[#00ffcc]'
                  : 'text-white/40 hover:text-white/60'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="max-w-2xl space-y-6">
              {/* Avatar */}
              <div className="bg-[#12121a]/80 backdrop-blur-sm border border-white/[0.06] rounded-xl p-6">
                <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">
                  {t('settings.profile', 'Profile')}
                </h3>
                <div className="flex items-center gap-6">
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00ffcc]/20 to-[#8b5cf6]/20 border-2 border-white/[0.1] flex items-center justify-center text-2xl font-bold text-[#00ffcc]">
                      {user?.user_metadata?.full_name?.charAt(0) || 'K'}
                    </div>
                    <button className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-5 h-5 text-white" />
                    </button>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-white">
                      {user?.user_metadata?.full_name || 'Kaniel Tordjman'}
                    </p>
                    <p className="text-sm text-white/40">{user?.email || 'kaniel@solaris.pa'}</p>
                    <span className={cn('inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-md text-xs font-medium border', roleColors['admin'])}>
                      <Shield className="w-3 h-3" />
                      Admin
                    </span>
                  </div>
                </div>
              </div>

              {/* Personal info */}
              <div className="bg-[#12121a]/80 backdrop-blur-sm border border-white/[0.06] rounded-xl p-6 space-y-4">
                <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
                  {t('settings.personalInfo', 'Personal Information')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-white/30 mb-1.5">Full Name</label>
                    <input
                      type="text"
                      defaultValue="Kaniel Tordjman"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-[#00ffcc]/40 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/30 mb-1.5">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                      <input
                        type="email"
                        defaultValue="kaniel@solaris.pa"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-[#00ffcc]/40 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Language */}
              <div className="bg-[#12121a]/80 backdrop-blur-sm border border-white/[0.06] rounded-xl p-6">
                <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">
                  {t('settings.language', 'Language')}
                </h3>
                <div className="flex gap-3">
                  {[
                    { code: 'en', label: 'English', flag: 'EN' },
                    { code: 'es', label: 'Espanol', flag: 'ES' },
                  ].map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all',
                        language === lang.code
                          ? 'bg-[#00ffcc]/10 border-[#00ffcc]/30 text-[#00ffcc]'
                          : 'bg-white/[0.02] border-white/[0.06] text-white/50 hover:border-white/[0.1]'
                      )}
                    >
                      <Globe className="w-4 h-4" />
                      <span className="text-sm font-medium">{lang.label}</span>
                      {language === lang.code && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="px-6 py-2.5 rounded-xl bg-[#00ffcc] text-[#0a0a0f] font-semibold text-sm hover:shadow-lg hover:shadow-[#00ffcc]/20 transition-shadow"
              >
                {t('settings.saveChanges', 'Save Changes')}
              </motion.button>
            </div>
          )}

          {/* Team Tab */}
          {activeTab === 'team' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/40">{MOCK_TEAM.length} team members</p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00ffcc] text-[#0a0a0f] font-semibold text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Invite Member
                </motion.button>
              </div>
              <div className="bg-[#12121a]/80 backdrop-blur-sm border border-white/[0.06] rounded-xl overflow-hidden">
                {MOCK_TEAM.map((member, i) => (
                  <div
                    key={member.id}
                    className={cn(
                      'flex items-center justify-between px-5 py-4',
                      i < MOCK_TEAM.length - 1 && 'border-b border-white/[0.04]'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00ffcc]/20 to-[#8b5cf6]/20 flex items-center justify-center text-sm font-bold text-[#00ffcc]">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white/80">{member.name}</p>
                        <p className="text-xs text-white/30">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-md text-xs font-medium border capitalize',
                          roleColors[member.role] || 'bg-white/10 text-white/50'
                        )}
                      >
                        {member.role}
                      </span>
                      {!member.active && (
                        <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Integrations Tab */}
          {activeTab === 'integrations' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {INTEGRATIONS.map((integration) => {
                const Icon = integration.icon;
                return (
                  <div
                    key={integration.id}
                    className="bg-[#12121a]/80 backdrop-blur-sm border border-white/[0.06] rounded-xl p-5 flex items-start justify-between"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${integration.color}20` }}
                      >
                        <Icon className="w-5 h-5" style={{ color: integration.color }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white/80">{integration.name}</p>
                        <p className="text-xs text-white/30 mt-0.5">{integration.description}</p>
                      </div>
                    </div>
                    <button
                      className={cn(
                        'shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                        integration.connected
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30'
                          : 'bg-white/[0.04] text-white/50 border-white/[0.08] hover:text-white hover:border-white/[0.15]'
                      )}
                    >
                      {integration.connected ? 'Connected' : 'Connect'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="max-w-2xl space-y-6">
              {/* Channels */}
              <div className="bg-[#12121a]/80 backdrop-blur-sm border border-white/[0.06] rounded-xl p-6 space-y-4">
                <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
                  Notification Channels
                </h3>
                {[
                  { key: 'emailAlerts' as const, label: 'Email Notifications', desc: 'Receive alerts via email', icon: Mail },
                  { key: 'whatsappAlerts' as const, label: 'WhatsApp Notifications', desc: 'Get instant WhatsApp messages', icon: MessageSquare },
                  { key: 'pushNotifications' as const, label: 'Push Notifications', desc: 'Browser push notifications', icon: Smartphone },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <item.icon className="w-4 h-4 text-white/30" />
                      <div>
                        <p className="text-sm text-white/70">{item.label}</p>
                        <p className="text-xs text-white/30">{item.desc}</p>
                      </div>
                    </div>
                    <ToggleSwitch
                      checked={notifications[item.key]}
                      onChange={() => toggleNotification(item.key)}
                    />
                  </div>
                ))}
              </div>

              {/* Alert types */}
              <div className="bg-[#12121a]/80 backdrop-blur-sm border border-white/[0.06] rounded-xl p-6 space-y-4">
                <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
                  Alert Types
                </h3>
                {[
                  { key: 'proposalViewed' as const, label: 'Proposal Viewed', desc: 'When a client views a proposal' },
                  { key: 'newLead' as const, label: 'New Lead', desc: 'When a new lead is captured' },
                  { key: 'siteOffline' as const, label: 'Site Offline', desc: 'When a monitored site goes offline' },
                  { key: 'dailyReport' as const, label: 'Daily Report', desc: 'Daily summary at 8:00 AM' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm text-white/70">{item.label}</p>
                      <p className="text-xs text-white/30">{item.desc}</p>
                    </div>
                    <ToggleSwitch
                      checked={notifications[item.key]}
                      onChange={() => toggleNotification(item.key)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const ToggleSwitch: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
  <button
    onClick={onChange}
    className={cn(
      'relative w-11 h-6 rounded-full transition-colors',
      checked ? 'bg-[#00ffcc]/30' : 'bg-white/[0.08]'
    )}
  >
    <motion.div
      animate={{ x: checked ? 20 : 2 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={cn(
        'absolute top-1 w-4 h-4 rounded-full transition-colors',
        checked ? 'bg-[#00ffcc]' : 'bg-white/40'
      )}
    />
  </button>
);

export default SettingsPage;
