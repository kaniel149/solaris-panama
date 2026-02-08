import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, Menu, LogOut, User, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { mainNavItems } from '../../config/navigation';

const cn = (...classes: (string | boolean | undefined | null)[]) =>
  classes.filter(Boolean).join(' ');

interface NavbarProps {
  onMenuClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();

  const currentNav = mainNavItems.find((item) =>
    item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
  );
  const pageTitle = currentNav ? t(currentNav.labelKey) : '';

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggleLanguage = () => {
    const next = i18n.language === 'en' ? 'es' : 'en';
    i18n.changeLanguage(next);
  };

  const userInitial = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <header className="h-16 shrink-0 flex items-center justify-between px-4 md:px-6 bg-[#12121a]/60 backdrop-blur-xl border-b border-white/[0.06]">
      {/* Left: mobile menu + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-white/90">{pageTitle}</h1>
      </div>

      {/* Center: search trigger */}
      <button className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/30 hover:text-white/50 hover:border-white/[0.12] transition-all w-64">
        <Search className="w-4 h-4" />
        <span className="text-sm">Search...</span>
        <kbd className="ml-auto text-[10px] bg-white/[0.06] border border-white/[0.1] rounded px-1.5 py-0.5">
          {'\u2318'}K
        </kbd>
      </button>

      {/* Right: lang, notifications, user */}
      <div className="flex items-center gap-2">
        {/* Language toggle */}
        <button
          onClick={toggleLanguage}
          className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white/50 hover:text-white hover:bg-white/[0.06] border border-white/[0.08] transition-colors uppercase"
        >
          {i18n.language === 'en' ? 'ES' : 'EN'}
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#00ffcc]" />
        </button>

        {/* User avatar + dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00ffcc]/20 to-[#8b5cf6]/20 border border-white/[0.1] flex items-center justify-center text-sm font-semibold text-[#00ffcc] hover:border-[#00ffcc]/30 transition-colors"
          >
            {userInitial}
          </button>

          <AnimatePresence>
            {userMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-[#1a1a2e] border border-white/[0.08] shadow-2xl overflow-hidden z-50"
              >
                {/* User info */}
                <div className="px-4 py-3 border-b border-white/[0.06]">
                  <p className="text-sm font-medium text-white/90 truncate">
                    {user?.user_metadata?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-white/40 truncate">{user?.email || ''}</p>
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <DropdownItem icon={User} label={t('nav.profile', 'Profile')} onClick={() => setUserMenuOpen(false)} />
                  <DropdownItem icon={Settings} label={t('nav.settings', 'Settings')} onClick={() => setUserMenuOpen(false)} />
                </div>

                <div className="py-1 border-t border-white/[0.06]">
                  <DropdownItem
                    icon={LogOut}
                    label={t('auth.signOut', 'Sign Out')}
                    onClick={() => {
                      setUserMenuOpen(false);
                      signOut();
                    }}
                    danger
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

interface DropdownItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  danger?: boolean;
}

const DropdownItem: React.FC<DropdownItemProps> = ({ icon: Icon, label, onClick, danger }) => (
  <button
    onClick={onClick}
    className={cn(
      'w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors',
      danger
        ? 'text-red-400 hover:bg-red-500/10'
        : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
    )}
  >
    <Icon className="w-4 h-4" />
    <span>{label}</span>
  </button>
);

export default Navbar;
