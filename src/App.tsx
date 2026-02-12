import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/components/ui/Toast';
import Layout from '@/components/layout/Layout';

// Eagerly loaded (critical pages)
import LoginPage from '@/pages/LoginPage';
import PublicSolarMapPage from '@/pages/PublicSolarMapPage';
import DashboardPage from '@/pages/DashboardPage';

// Lazy loaded (secondary pages)
const ProjectsPage = lazy(() => import('@/pages/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('@/pages/ProjectDetailPage'));
const ClientsPage = lazy(() => import('@/pages/ClientsPage'));
const ClientDetailPage = lazy(() => import('@/pages/ClientDetailPage'));
const ProposalsPage = lazy(() => import('@/pages/ProposalsPage'));
const CalendarPage = lazy(() => import('@/pages/CalendarPage'));
const MonitoringPage = lazy(() => import('@/pages/MonitoringPage'));
const SolarCalculatorPage = lazy(() => import('@/pages/SolarCalculatorPage'));
const RoofScannerPage = lazy(() => import('@/pages/RoofScannerPage'));
const ProposalGeneratorPage = lazy(() => import('@/pages/ProposalGeneratorPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const LeadsPage = lazy(() => import('@/pages/LeadsPage'));
const LeadDetailPage = lazy(() => import('@/pages/LeadDetailPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

// Loading fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a0a0f]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#00ffcc]/20 border-t-[#00ffcc] rounded-full animate-spin" />
        <p className="text-xs text-[#555570]">Cargando...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/mapa-solar" element={<PublicSolarMapPage />} />
            <Route path="/solar-map" element={<Navigate to="/mapa-solar" replace />} />
            <Route element={<Layout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route
                path="/projects"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <ProjectsPage />
                  </Suspense>
                }
              />
              <Route
                path="/projects/:id"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <ProjectDetailPage />
                  </Suspense>
                }
              />
              <Route
                path="/clients"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <ClientsPage />
                  </Suspense>
                }
              />
              <Route
                path="/clients/:id"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <ClientDetailPage />
                  </Suspense>
                }
              />
              <Route
                path="/proposals"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <ProposalsPage />
                  </Suspense>
                }
              />
              <Route
                path="/calendar"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <CalendarPage />
                  </Suspense>
                }
              />
              <Route
                path="/monitoring"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <MonitoringPage />
                  </Suspense>
                }
              />
              <Route
                path="/tools/calculator"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <SolarCalculatorPage />
                  </Suspense>
                }
              />
              <Route
                path="/tools/scanner"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <RoofScannerPage />
                  </Suspense>
                }
              />
              <Route
                path="/tools/proposal-generator"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <ProposalGeneratorPage />
                  </Suspense>
                }
              />
              <Route
                path="/leads"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <LeadsPage />
                  </Suspense>
                }
              />
              <Route
                path="/leads/:id"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <LeadDetailPage />
                  </Suspense>
                }
              />
              <Route
                path="/settings"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <SettingsPage />
                  </Suspense>
                }
              />
              <Route
                path="*"
                element={
                  <Suspense fallback={<PageLoader />}>
                    <NotFoundPage />
                  </Suspense>
                }
              />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
