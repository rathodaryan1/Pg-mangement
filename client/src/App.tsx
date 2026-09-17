import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layouts
import { PublicLayout } from './components/layout/PublicLayout';
import { OwnerLayout } from './components/layout/OwnerLayout';
import { ResidentLayout } from './components/layout/ResidentLayout';

// Public Marketing Pages
import { LandingPage } from './pages/public/LandingPage';
import { FeaturesPage } from './pages/public/FeaturesPage';
import { PricingPage } from './pages/public/PricingPage';
import { AboutPage } from './pages/public/AboutPage';
import { ContactPage } from './pages/public/ContactPage';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';

// Owner / Admin Pages
import { OwnerDashboardPage } from './pages/owner/OwnerDashboardPage';
import { PropertiesPage } from './pages/owner/PropertiesPage';
import { RoomsPage } from './pages/owner/RoomsPage';
import { ResidentsPage } from './pages/owner/ResidentsPage';
import { ResidentLifecyclePage } from './pages/owner/ResidentLifecyclePage';
import { PaymentsPage } from './pages/owner/PaymentsPage';
import { VisitorsPage } from './pages/owner/VisitorsPage';
import { MaintenancePage } from './pages/owner/MaintenancePage';
import { StaffPage } from './pages/owner/StaffPage';
import { InventoryPage } from './pages/owner/InventoryPage';
import { OwnerLeavePage } from './pages/owner/OwnerLeavePage';
import { OwnerEmergencyPage } from './pages/owner/OwnerEmergencyPage';
import { ReportsPage } from './pages/owner/ReportsPage';
import { OwnerSettingsPage } from './pages/owner/OwnerSettingsPage';
import { AuditLogsPage } from './pages/owner/AuditLogsPage';

// Resident Pages
import { ResidentDashboardPage } from './pages/resident/ResidentDashboardPage';
import { ResidentRoomPage } from './pages/resident/ResidentRoomPage';
import { ResidentPaymentsPage } from './pages/resident/ResidentPaymentsPage';
import { ResidentVisitorsPage } from './pages/resident/ResidentVisitorsPage';
import { ResidentComplaintsPage } from './pages/resident/ResidentComplaintsPage';
import { ResidentLeavePage } from './pages/resident/ResidentLeavePage';
import { ResidentDocumentsPage } from './pages/resident/ResidentDocumentsPage';
import { ResidentNoticesPage } from './pages/resident/ResidentNoticesPage';
import { ResidentProfilePage } from './pages/resident/ResidentProfilePage';
import { ResidentEmergencyPage } from './pages/resident/ResidentEmergencyPage';

// Route Guards
const ProtectedOwnerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-canvas dark:bg-[#0F1B18] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-forest/20 border-t-brand-forest rounded-full animate-spin" />
        <p className="text-xs text-slate-500 mt-2">Loading Urban Nest...</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <OwnerLayout>{children}</OwnerLayout>;
};

const ProtectedResidentRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-canvas dark:bg-[#0F1B18] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-gold/20 border-t-brand-gold rounded-full animate-spin" />
        <p className="text-xs text-slate-500 mt-2">Loading Resident Portal...</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <ResidentLayout>{children}</ResidentLayout>;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* ========================================================
          PUBLIC WEBSITE ROUTES
          /
          ├── /features
          ├── /pricing
          ├── /about
          ├── /contact
          └── /login
         ======================================================== */}
      <Route path="/" element={<PublicLayout><LandingPage /></PublicLayout>} />
      <Route path="/features" element={<PublicLayout><FeaturesPage /></PublicLayout>} />
      <Route path="/pricing" element={<PublicLayout><PricingPage /></PublicLayout>} />
      <Route path="/about" element={<PublicLayout><AboutPage /></PublicLayout>} />
      <Route path="/contact" element={<PublicLayout><ContactPage /></PublicLayout>} />
      
      {/* Authentication */}
      <Route path="/login" element={<LoginPage />} />

      {/* ========================================================
          APPLICATION: OWNER PORTAL (/owner/*)
         ======================================================== */}
      <Route path="/owner/dashboard" element={<ProtectedOwnerRoute><OwnerDashboardPage /></ProtectedOwnerRoute>} />
      <Route path="/owner/properties" element={<ProtectedOwnerRoute><PropertiesPage /></ProtectedOwnerRoute>} />
      <Route path="/owner/rooms" element={<ProtectedOwnerRoute><RoomsPage /></ProtectedOwnerRoute>} />
      <Route path="/owner/residents" element={<ProtectedOwnerRoute><ResidentsPage /></ProtectedOwnerRoute>} />
      <Route path="/owner/residents/lifecycle" element={<ProtectedOwnerRoute><ResidentLifecyclePage /></ProtectedOwnerRoute>} />
      <Route path="/owner/staff" element={<ProtectedOwnerRoute><StaffPage /></ProtectedOwnerRoute>} />
      <Route path="/owner/leave" element={<ProtectedOwnerRoute><OwnerLeavePage /></ProtectedOwnerRoute>} />
      
      {/* Finance */}
      <Route path="/owner/finance" element={<ProtectedOwnerRoute><PaymentsPage /></ProtectedOwnerRoute>} />
      <Route path="/owner/payments" element={<ProtectedOwnerRoute><PaymentsPage /></ProtectedOwnerRoute>} />
      <Route path="/owner/deposits" element={<ProtectedOwnerRoute><PaymentsPage /></ProtectedOwnerRoute>} />
      <Route path="/owner/expenses" element={<ProtectedOwnerRoute><PaymentsPage /></ProtectedOwnerRoute>} />
      
      {/* Operations & Assets */}
      <Route path="/owner/visitors" element={<ProtectedOwnerRoute><VisitorsPage /></ProtectedOwnerRoute>} />
      <Route path="/owner/maintenance" element={<ProtectedOwnerRoute><MaintenancePage /></ProtectedOwnerRoute>} />
      <Route path="/owner/tasks" element={<ProtectedOwnerRoute><MaintenancePage /></ProtectedOwnerRoute>} />
      <Route path="/owner/inventory" element={<ProtectedOwnerRoute><InventoryPage /></ProtectedOwnerRoute>} />
      <Route path="/owner/vendors" element={<ProtectedOwnerRoute><InventoryPage /></ProtectedOwnerRoute>} />
      <Route path="/owner/documents" element={<ProtectedOwnerRoute><ResidentsPage /></ProtectedOwnerRoute>} />
      <Route path="/owner/notices" element={<ProtectedOwnerRoute><OwnerDashboardPage /></ProtectedOwnerRoute>} />
      <Route path="/owner/emergency" element={<ProtectedOwnerRoute><OwnerEmergencyPage /></ProtectedOwnerRoute>} />
      <Route path="/owner/sos" element={<ProtectedOwnerRoute><OwnerEmergencyPage /></ProtectedOwnerRoute>} />
      
      {/* Insights & Settings */}
      <Route path="/owner/reports" element={<ProtectedOwnerRoute><ReportsPage /></ProtectedOwnerRoute>} />
      <Route path="/owner/audit-logs" element={<ProtectedOwnerRoute><AuditLogsPage /></ProtectedOwnerRoute>} />
      <Route path="/owner/settings" element={<ProtectedOwnerRoute><OwnerSettingsPage /></ProtectedOwnerRoute>} />

      {/* ========================================================
          APPLICATION: RESIDENT PORTAL (/resident/*)
         ======================================================== */}
      <Route path="/resident/dashboard" element={<ProtectedResidentRoute><ResidentDashboardPage /></ProtectedResidentRoute>} />
      <Route path="/resident/room" element={<ProtectedResidentRoute><ResidentRoomPage /></ProtectedResidentRoute>} />
      <Route path="/resident/payments" element={<ProtectedResidentRoute><ResidentPaymentsPage /></ProtectedResidentRoute>} />
      <Route path="/resident/visitors" element={<ProtectedResidentRoute><ResidentVisitorsPage /></ProtectedResidentRoute>} />
      <Route path="/resident/complaints" element={<ProtectedResidentRoute><ResidentComplaintsPage /></ProtectedResidentRoute>} />
      <Route path="/resident/leave" element={<ProtectedResidentRoute><ResidentLeavePage /></ProtectedResidentRoute>} />
      <Route path="/resident/documents" element={<ProtectedResidentRoute><ResidentDocumentsPage /></ProtectedResidentRoute>} />
      <Route path="/resident/notices" element={<ProtectedResidentRoute><ResidentNoticesPage /></ProtectedResidentRoute>} />
      <Route path="/resident/profile" element={<ProtectedResidentRoute><ResidentProfilePage /></ProtectedResidentRoute>} />
      <Route path="/resident/emergency" element={<ProtectedResidentRoute><ResidentEmergencyPage /></ProtectedResidentRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
};

export default App;
