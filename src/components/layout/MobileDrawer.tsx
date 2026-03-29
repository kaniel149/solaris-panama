import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { mainNavItems, bottomNavItems } from '../../config/navigation';
import { useAuth } from '../../contexts/AuthContext';

const cn = (...classes: (string | boolean | undefined | null)[]) =>
  classes.filter(Boolean).join(' ');

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

const MobileDrawer: React.FC<MobileDrawerProps> = ({ open, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleNav = (path: string) => {
    navigate(path);
    onClose();
  };

  const allItems = [...mainNavItems, ...bottomNavItems];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 left-0 w-72 bg-[#12121a]/95 backdrop-blur-2xl border-r border-white/[0.06] z-50 flex flex-col"
          >
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#D4A843] to-[#0B3D2E] flex items-center justify-center">
                  <img src="/solaris-icon.png" alt="Solaris" className="w-6 h-6" />
                </div>
                <span className="text-lg font-bold bg-gradient-to-r from-[#D4A843] to-[#f5d080] bg-clip-text text-transparent">
                  SOLARIS
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav items */}
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
              {allItems.map((item) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => handleNav(item.path)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-150 relative',
                      active
                        ? 'bg-[#D4A843]/10 text-[#D4A843]'
                        : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
                    )}
                  >
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-[#D4A843]" />
                    )}
                    <Icon
                      className={cn(
                        'w-5 h-5 shrink-0',
                        active && 'drop-shadow-[0_0_8px_rgba(212,168,67,0.5)]'
                      )}
                    />
                    <span className="text-sm font-medium">{t(item.labelKey)}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="ml-auto text-xs bg-[#0B3D2E] text-white rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* User info at bottom */}
            <div className="px-4 py-4 border-t border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#D4A843]/20 to-[#0B3D2E]/20 border border-white/[0.1] flex items-center justify-center text-sm font-semibold text-[#D4A843]">
                  {user?.user_metadata?.full_name?.charAt(0).toUpperCase() ||
                    user?.email?.charAt(0).toUpperCase() ||
                    'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white/80 truncate">
                    {user?.user_metadata?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-white/30 truncate">{user?.email || ''}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileDrawer;
