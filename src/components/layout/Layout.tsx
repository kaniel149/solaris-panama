import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import MobileDrawer from './MobileDrawer';
import LoginPage from '../../pages/LoginPage';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

/** Routes where the sidebar + navbar hide to give full-screen space */
const IMMERSIVE_ROUTES = ['/tools/scanner'];

const Layout: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarHover, setSidebarHover] = useState(false);
  const sidebarTimer = useRef<ReturnType<typeof setTimeout>>();

  const openSidebar = useCallback(() => {
    clearTimeout(sidebarTimer.current);
    setSidebarHover(true);
  }, []);
  const closeSidebar = useCallback(() => {
    sidebarTimer.current = setTimeout(() => setSidebarHover(false), 400);
  }, []);

  const isImmersive = IMMERSIVE_ROUTES.some((r) => location.pathname.startsWith(r));

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Reset hover state when navigating away
  useEffect(() => {
    setSidebarHover(false);
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 rounded-full border-2 border-[#D4A843]/20 border-t-[#D4A843]"
          />
          <span className="text-white/40 text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // ===== IMMERSIVE MODE (Scanner etc.) — full-screen, sidebar as overlay =====
  if (isImmersive) {
    return (
      <div className="h-screen w-screen bg-[#0a0a0f] overflow-hidden relative">
        {/* Page content — full screen, no padding */}
        <main className="w-full h-full">
          <Outlet />
        </main>

        {/* Desktop: sidebar — hover-activated overlay (pointer-events only on content, not full strip) */}
        {!isMobile && (
          <div className="absolute left-0 top-0 bottom-0 z-50 pointer-events-none">
            <motion.div
              initial={false}
              animate={{ x: sidebarHover ? 0 : -248 }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="h-full relative pointer-events-auto"
              onMouseEnter={openSidebar}
              onMouseLeave={closeSidebar}
            >
              <Sidebar />

              {/* Collapsed tab — small pill on edge (visible when sidebar is hidden) */}
              <div
                className={`absolute top-3 right-0 translate-x-full flex flex-col items-center gap-1.5 py-2.5 px-1.5 rounded-r-xl bg-[#12121a]/90 backdrop-blur-xl border border-l-0 border-white/[0.06] cursor-pointer transition-opacity duration-200 ${sidebarHover ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#D4A843] to-[#0B3D2E] flex items-center justify-center">
                  <img src="/solaris-icon.png" alt="Solaris" className="w-5 h-5" />
                </div>
                <ChevronRight className="w-3 h-3 text-[#555566]" />
              </div>
            </motion.div>
          </div>
        )}

        {/* Mobile drawer */}
        <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

        {/*
         * PERSISTENT NAVIGATION FAB — always visible in immersive mode.
         *
         * Problem: on mobile the sidebar is hover-only overlay (no hover on touch),
         * so users get "stuck" in the scanner with no obvious way out.
         *
         * Solution: a fixed, always-visible FAB button in the top-left corner
         * (below the sidebar pull-tab area on desktop, primary nav on mobile).
         * Tapping it opens the mobile drawer (mobile) or navigates to Dashboard (desktop).
         * The button is ≥44px for easy thumb tap.
         */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.2 }}
          onClick={() => {
            if (isMobile) {
              setDrawerOpen(true);
            } else {
              // On desktop the hover sidebar is there; FAB opens it programmatically
              // by navigating — but we trigger the drawer as a universal fallback too
              setDrawerOpen(true);
            }
          }}
          className="fixed top-4 left-4 z-[60] flex items-center gap-2 pl-2 pr-3 h-11 rounded-xl bg-[#12121a]/90 backdrop-blur-xl border border-white/[0.1] shadow-lg shadow-black/40 text-white/70 hover:text-white hover:border-[#D4A843]/40 hover:bg-[#1a1a24]/90 transition-all duration-150 group"
          aria-label="Menú de navegación"
          // Hide on desktop when sidebar is visible/hovering — avoids redundancy
          style={{ display: isMobile || !sidebarHover ? undefined : 'none' }}
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#D4A843] to-[#0B3D2E] flex items-center justify-center shrink-0">
            <img src="/solaris-icon.png" alt="Solaris" className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold tracking-wide">Menú</span>
        </motion.button>

        {/* Quick back-to-dashboard button — top-right, always visible */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.2 }}
          onClick={() => navigate('/dashboard')}
          className="fixed top-4 right-4 z-[60] flex items-center gap-2 px-3 h-11 rounded-xl bg-[#12121a]/90 backdrop-blur-xl border border-white/[0.08] shadow-lg shadow-black/40 text-white/50 hover:text-white hover:border-[#D4A843]/30 hover:bg-[#1a1a24]/90 transition-all duration-150"
          aria-label="Ir al panel"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-xs font-medium">Panel</span>
        </motion.button>
      </div>
    );
  }

  // ===== NORMAL MODE — standard sidebar + navbar layout =====
  return (
    <div className="h-screen w-screen bg-[#0a0a0f] flex overflow-hidden">
      {/* Desktop sidebar */}
      {!isMobile && <Sidebar />}

      {/* Mobile drawer */}
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onMenuClick={() => setDrawerOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location?.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="p-4 md:p-6"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default Layout;
