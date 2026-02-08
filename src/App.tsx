import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/components/ui/Toast';
import Layout from '@/components/layout/Layout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import ProjectsPage from '@/pages/ProjectsPage';
import ProjectDetailPage from '@/pages/ProjectDetailPage';
import ClientsPage from '@/pages/ClientsPage';
import ClientDetailPage from '@/pages/ClientDetailPage';
import ProposalsPage from '@/pages/ProposalsPage';
import CalendarPage from '@/pages/CalendarPage';
import MonitoringPage from '@/pages/MonitoringPage';
import SolarCalculatorPage from '@/pages/SolarCalculatorPage';
import RoofScannerPage from '@/pages/RoofScannerPage';
import ProposalGeneratorPage from '@/pages/ProposalGeneratorPage';
import SettingsPage from '@/pages/SettingsPage';
import NotFoundPage from '@/pages/NotFoundPage';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<Layout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/clients/:id" element={<ClientDetailPage />} />
              <Route path="/proposals" element={<ProposalsPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/monitoring" element={<MonitoringPage />} />
              <Route path="/tools/calculator" element={<SolarCalculatorPage />} />
              <Route path="/tools/scanner" element={<RoofScannerPage />} />
              <Route path="/tools/proposal-generator" element={<ProposalGeneratorPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
