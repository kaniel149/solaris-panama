import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Sun } from 'lucide-react';
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
            className="w-10 h-10 rounded-full border-2 border-[#00ffcc]/20 border-t-[#00ffcc]"
          />
          <span className="text-white/40 text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // ===== IMMERSIVE MODE (Scanner etc.) — full-screen, sidebar + navbar as overlays =====
  if (isImmersive) {
    return (
      <div className="h-screen w-screen bg-[#0a0a0f] overflow-hidden relative">
        {/* Page content — full screen, no padding */}
        <main className="w-full h-full">
          <Outlet />
        </main>

        {/* Sidebar — hover-activated overlay (pointer-events only on content, not full strip) */}
        {!isMobile && (
          <div
            className="absolute left-0 top-0 bottom-0 z-50 pointer-events-none"
          >
            <motion.div
              initial={false}
              animate={{ x: sidebarHover ? 0 : -248 }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="h-full relative pointer-events-auto"
              onMouseEnter={openSidebar}
              onMouseLeave={closeSidebar}
            >
              <Sidebar />

              {/* Collapsed tab — small pill on edge */}
              <div
                className={`absolute top-3 right-0 translate-x-full flex flex-col items-center gap-1.5 py-2.5 px-1.5 rounded-r-xl bg-[#12121a]/90 backdrop-blur-xl border border-l-0 border-white/[0.06] cursor-pointer transition-opacity duration-200 ${sidebarHover ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00ffcc] to-[#8b5cf6] flex items-center justify-center">
                  <Sun className="w-4 h-4 text-[#0a0a0f]" />
                </div>
                <ChevronRight className="w-3 h-3 text-[#555566]" />
              </div>
            </motion.div>
          </div>
        )}

        {/* Mobile drawer */}
        <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
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
