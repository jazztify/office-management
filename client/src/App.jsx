import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Sidebar from './components/layout/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EmployeesPage from './pages/EmployeesPage';
import LeavesPage from './pages/LeavesPage';
import RolesPage from './pages/RolesPage';
import PayslipPage from './pages/PayslipPage';
import HolidaysPage from './pages/HolidaysPage';
import AttendancePage from './pages/AttendancePage';
import OvertimePage from './pages/OvertimePage';
import InventoryPage from './pages/InventoryPage';
import POSPage from './pages/POSPage';
import LedgerPage from './pages/LedgerPage';
import SettingsPage from './pages/SettingsPage';
import ShiftsPage from './pages/ShiftsPage';
import SuperAdminPage from './pages/SuperAdminPage';
import SystemSettingsPage from './pages/SystemSettingsPage';
import MembershipsPage from './pages/MembershipsPage';
import ResourcesPage from './pages/ResourcesPage';
import BookingsPage from './pages/BookingsPage';
import AccessLogsPage from './pages/AccessLogsPage';

function ProtectedLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loader">
          <span className="logo-diamond large">◆</span>
          <p>Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <TenantProvider>
      <NotificationProvider>
        <div className="app-layout">
          <Sidebar />
          <main className="app-main">
            <Outlet />
          </main>
        </div>
      </NotificationProvider>
    </TenantProvider>
  );
}

function PublicRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}

import ModulePlaceholder from './components/shared/ModulePlaceholder';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          {/* Protected routes */}
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/leaves" element={<LeavesPage />} />
            <Route path="/roles" element={<RolesPage />} />
            <Route path="/payslips" element={<PayslipPage />} />
            <Route path="/holidays" element={<HolidaysPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/overtime" element={<OvertimePage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/pos" element={<POSPage />} />
            <Route path="/ledger" element={<LedgerPage />} />
            <Route path="/shifts" element={<ShiftsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/system-admin" element={<SuperAdminPage />} />
            <Route path="/system-settings" element={<SystemSettingsPage />} />
            <Route path="/memberships" element={<MembershipsPage />} />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/bookings" element={<BookingsPage />} />
            <Route path="/access-logs" element={<AccessLogsPage />} />

            {/* Placeholder Demo Modules */}
            <Route path="/wallet" element={
              <ModulePlaceholder 
                title="Digital Wallet" 
                icon="💳"
                headline="Cashless Ecosystem. Total Financial Control."
                features={['Member Top-ups & Balances', 'Transaction Ledger', 'Zero-Credit Prevention']}
              />
            } />
            <Route path="/returns" element={
              <ModulePlaceholder 
                title="Returns & RMA" 
                icon="🔄"
                headline="Fix Financial Friction. Master Returns."
                features={['Store Credit Issuance', 'RMA Tracking', 'Automatic Ledger Reversal']}
              />
            } />
            <Route path="/crm" element={
              <ModulePlaceholder 
                title="CRM & Marketing" 
                icon="📧"
                headline="Your Silent Salesperson. Automated Growth."
                features={['SMS/Email Expiry Alerts', 'Customer Segmentation', 'Automated Re-engagement']}
              />
            } />
            <Route path="/loyalty" element={
              <ModulePlaceholder 
                title="Loyalty & Rewards" 
                icon="🎁"
                headline="Gamify Customer Retention. Build Your Hook."
                features={['Points-per-Spend Tracking', 'Lifetime Value Metrics', 'Automated Discount Codes']}
              />
            } />
            <Route path="/portal-settings" element={
              <ModulePlaceholder 
                title="End-User Portal" 
                icon="📱"
                headline="Empower Your Members. 24/7 Access."
                features={['Mobile balance check', 'Self-Service Bookings', 'Digital Membership Card']}
              />
            } />
            <Route path="/social-marketing" element={
              <ModulePlaceholder 
                title="Multi-Social Marketing" 
                icon="🚀"
                headline="1 Post. 1 Click. Every Social Platform."
                features={[
                  'TikTok & Reels Distribution',
                  'Facebook & Instagram Sync',
                  'YouTube Shorts Integration',
                  'Scheduled Cross-Platform Podcasting'
                ]}
              />
            } />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
