import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layouts
import { PublicLayout } from './components/layout/PublicLayout';
import { OwnerLayout } from './components/layout/OwnerLayout';
import { ResidentLayout } from './components/layout/ResidentLayout';
import { SuperAdminLayout } from './components/layout/SuperAdminLayout';
import { StaffLayout } from './components/layout/StaffLayout';

// Critical Auth & Landing Pages (Eagerly loaded for instant boot)
import { LoginPage } from './pages/auth/LoginPage';
import { LandingPage } from './pages/public/LandingPage';

// Lazy-Loaded Public Marketing Pages & Public Booking
const SolutionsPage = React.lazy(() => import('./pages/public/SolutionsPage').then(m => ({ default: m.SolutionsPage })));
const PricingPage = React.lazy(() => import('./pages/public/PricingPage').then(m => ({ default: m.PricingPage })));
const AboutPage = React.lazy(() => import('./pages/public/AboutPage').then(m => ({ default: m.AboutPage })));
const ContactPage = React.lazy(() => import('./pages/public/ContactPage').then(m => ({ default: m.ContactPage })));
const GateVerifyPage = React.lazy(() => import('./pages/public/GateVerifyPage').then(m => ({ default: m.GateVerifyPage })));
const PublicPropertyBookingPage = React.lazy(() => import('./pages/public/PublicPropertyBookingPage').then(m => ({ default: m.PublicPropertyBookingPage })));

// Lazy-Loaded Staff & SaaS Feature Pages
const CookDashboardPage = React.lazy(() => import('./pages/staff/CookDashboardPage').then(m => ({ default: m.CookDashboardPage })));
const SecurityGuardPage = React.lazy(() => import('./pages/staff/SecurityGuardPage').then(m => ({ default: m.SecurityGuardPage })));
const HousekeepingPage = React.lazy(() => import('./pages/staff/HousekeepingPage').then(m => ({ default: m.HousekeepingPage })));
const ResidentMealsPage = React.lazy(() => import('./pages/resident/ResidentMealsPage').then(m => ({ default: m.ResidentMealsPage })));
const LeadsPage = React.lazy(() => import('./pages/owner/LeadsPage').then(m => ({ default: m.LeadsPage })));
const UtilitiesPage = React.lazy(() => import('./pages/owner/UtilitiesPage').then(m => ({ default: m.UtilitiesPage })));

// Lazy-Loaded Super Admin SaaS Platform Pages
const SuperAdminDashboardPage = React.lazy(() => import('./pages/super-admin/SuperAdminDashboardPage').then(m => ({ default: m.SuperAdminDashboardPage })));
const SuperAdminTenantsPage = React.lazy(() => import('./pages/super-admin/SuperAdminTenantsPage').then(m => ({ default: m.SuperAdminTenantsPage })));
const SuperAdminTenantDetailPage = React.lazy(() => import('./pages/super-admin/SuperAdminTenantDetailPage').then(m => ({ default: m.SuperAdminTenantDetailPage })));
const SuperAdminOwnersPage = React.lazy(() => import('./pages/super-admin/SuperAdminOwnersPage').then(m => ({ default: m.SuperAdminOwnersPage })));
const SuperAdminUsersPage = React.lazy(() => import('./pages/super-admin/SuperAdminUsersPage').then(m => ({ default: m.SuperAdminUsersPage })));
const SuperAdminSubscriptionsPage = React.lazy(() => import('./pages/super-admin/SuperAdminSubscriptionsPage').then(m => ({ default: m.SuperAdminSubscriptionsPage })));
const SuperAdminPlansPage = React.lazy(() => import('./pages/super-admin/SuperAdminPlansPage').then(m => ({ default: m.SuperAdminPlansPage })));
const SuperAdminRevenuePage = React.lazy(() => import('./pages/super-admin/SuperAdminRevenuePage').then(m => ({ default: m.SuperAdminRevenuePage })));
const SuperAdminUsagePage = React.lazy(() => import('./pages/super-admin/SuperAdminUsagePage').then(m => ({ default: m.SuperAdminUsagePage })));
const SuperAdminSupportPage = React.lazy(() => import('./pages/super-admin/SuperAdminSupportPage').then(m => ({ default: m.SuperAdminSupportPage })));
const SuperAdminAuditLogsPage = React.lazy(() => import('./pages/super-admin/SuperAdminAuditLogsPage').then(m => ({ default: m.SuperAdminAuditLogsPage })));
const SuperAdminSystemHealthPage = React.lazy(() => import('./pages/super-admin/SuperAdminSystemHealthPage').then(m => ({ default: m.SuperAdminSystemHealthPage })));
const SuperAdminSettingsPage = React.lazy(() => import('./pages/super-admin/SuperAdminSettingsPage').then(m => ({ default: m.SuperAdminSettingsPage })));

// Lazy-Loaded Owner / Admin Pages
const OwnerDashboardPage = React.lazy(() => import('./pages/owner/OwnerDashboardPage').then(m => ({ default: m.OwnerDashboardPage })));
const PropertiesPage = React.lazy(() => import('./pages/owner/PropertiesPage').then(m => ({ default: m.PropertiesPage })));
const RoomsPage = React.lazy(() => import('./pages/owner/RoomsPage').then(m => ({ default: m.RoomsPage })));
const ResidentsPage = React.lazy(() => import('./pages/owner/ResidentsPage').then(m => ({ default: m.ResidentsPage })));
const ResidentLifecyclePage = React.lazy(() => import('./pages/owner/ResidentLifecyclePage').then(m => ({ default: m.ResidentLifecyclePage })));
const PaymentsPage = React.lazy(() => import('./pages/owner/PaymentsPage').then(m => ({ default: m.PaymentsPage })));
const VisitorsPage = React.lazy(() => import('./pages/owner/VisitorsPage').then(m => ({ default: m.VisitorsPage })));
const MaintenancePage = React.lazy(() => import('./pages/owner/MaintenancePage').then(m => ({ default: m.MaintenancePage })));
const StaffPage = React.lazy(() => import('./pages/owner/StaffPage').then(m => ({ default: m.StaffPage })));
const InventoryPage = React.lazy(() => import('./pages/owner/InventoryPage').then(m => ({ default: m.InventoryPage })));
const OwnerLeavePage = React.lazy(() => import('./pages/owner/OwnerLeavePage').then(m => ({ default: m.OwnerLeavePage })));
const OwnerEmergencyPage = React.lazy(() => import('./pages/owner/OwnerEmergencyPage').then(m => ({ default: m.OwnerEmergencyPage })));
const ReportsPage = React.lazy(() => import('./pages/owner/ReportsPage').then(m => ({ default: m.ReportsPage })));
const OwnerSettingsPage = React.lazy(() => import('./pages/owner/OwnerSettingsPage').then(m => ({ default: m.OwnerSettingsPage })));
const AuditLogsPage = React.lazy(() => import('./pages/owner/AuditLogsPage').then(m => ({ default: m.AuditLogsPage })));
const OwnerNoticesPage = React.lazy(() => import('./pages/owner/OwnerNoticesPage').then(m => ({ default: m.OwnerNoticesPage })));
const OwnerDocumentsPage = React.lazy(() => import('./pages/owner/OwnerDocumentsPage').then(m => ({ default: m.OwnerDocumentsPage })));
const LifecyclePipelinePage = React.lazy(() => import('./pages/owner/LifecyclePipelinePage').then(m => ({ default: m.LifecyclePipelinePage })));
const VisualOccupancyPage = React.lazy(() => import('./pages/owner/VisualOccupancyPage').then(m => ({ default: m.VisualOccupancyPage })));
const UnifiedTasksPage = React.lazy(() => import('./pages/owner/UnifiedTasksPage').then(m => ({ default: m.UnifiedTasksPage })));
const ReconciliationPage = React.lazy(() => import('./pages/owner/ReconciliationPage').then(m => ({ default: m.ReconciliationPage })));
const AssetsVendorsPage = React.lazy(() => import('./pages/owner/AssetsVendorsPage').then(m => ({ default: m.AssetsVendorsPage })));
const CommandCenterPage = React.lazy(() => import('./pages/owner/CommandCenterPage').then(m => ({ default: m.CommandCenterPage })));

// Lazy-Loaded Resident Pages
const ResidentDashboardPage = React.lazy(() => import('./pages/resident/ResidentDashboardPage').then(m => ({ default: m.ResidentDashboardPage })));
const ResidentRoomPage = React.lazy(() => import('./pages/resident/ResidentRoomPage').then(m => ({ default: m.ResidentRoomPage })));
const ResidentPaymentsPage = React.lazy(() => import('./pages/resident/ResidentPaymentsPage').then(m => ({ default: m.ResidentPaymentsPage })));
const ResidentVisitorsPage = React.lazy(() => import('./pages/resident/ResidentVisitorsPage').then(m => ({ default: m.ResidentVisitorsPage })));
const ResidentComplaintsPage = React.lazy(() => import('./pages/resident/ResidentComplaintsPage').then(m => ({ default: m.ResidentComplaintsPage })));
const ResidentLeavePage = React.lazy(() => import('./pages/resident/ResidentLeavePage').then(m => ({ default: m.ResidentLeavePage })));
const ResidentDocumentsPage = React.lazy(() => import('./pages/resident/ResidentDocumentsPage').then(m => ({ default: m.ResidentDocumentsPage })));
const ResidentNoticesPage = React.lazy(() => import('./pages/resident/ResidentNoticesPage').then(m => ({ default: m.ResidentNoticesPage })));
const ResidentProfilePage = React.lazy(() => import('./pages/resident/ResidentProfilePage').then(m => ({ default: m.ResidentProfilePage })));
const ResidentEmergencyPage = React.lazy(() => import('./pages/resident/ResidentEmergencyPage').then(m => ({ default: m.ResidentEmergencyPage })));

// Fallback skeleton loader during chunk lazy-fetching
const PageLoadingFallback: React.FC<{ message?: string }> = ({ message = 'Loading module...' }) => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
    <div className="w-8 h-8 border-4 border-emerald-600/20 border-t-emerald-600 rounded-full animate-spin" />
    <p className="text-xs text-slate-500 mt-3 font-medium">{message}</p>
  </div>
);

// Route Guards
const ProtectedSuperAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FCFBF8] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-forest/20 border-t-brand-forest rounded-full animate-spin" />
        <p className="text-xs text-slate-500 mt-2">Loading SaaS Administration...</p>
      </div>
    );
  }
  if (!user || user.role !== 'SUPER_ADMIN') {
    return <Navigate to="/login" replace />;
  }
  return <SuperAdminLayout>{children}</SuperAdminLayout>;
};

const ProtectedOwnerRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FCFBF8] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-forest/20 border-t-brand-forest rounded-full animate-spin" />
        <p className="text-xs text-slate-500 mt-2">Loading Urban Nest...</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'SUPER_ADMIN') return <Navigate to="/super-admin/dashboard" replace />;
  if (user.role === 'RESIDENT') return <Navigate to="/resident/dashboard" replace />;
  if (user.role === 'COOK') return <Navigate to="/staff/kitchen" replace />;
  if (user.role === 'SECURITY_GUARD') return <Navigate to="/staff/security" replace />;
  if (user.role === 'HOUSEKEEPING') return <Navigate to="/staff/housekeeping" replace />;
  if (user.role === 'MAINTENANCE') return <Navigate to="/staff/maintenance" replace />;
  return <OwnerLayout>{children}</OwnerLayout>;
};

const ProtectedResidentRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FCFBF8] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-forest/20 border-t-brand-forest rounded-full animate-spin" />
        <p className="text-xs text-slate-500 mt-2">Loading Resident Portal...</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'SUPER_ADMIN') return <Navigate to="/super-admin/dashboard" replace />;
  if (user.role !== 'RESIDENT') return <Navigate to="/owner/dashboard" replace />;
  return <ResidentLayout>{children}</ResidentLayout>;
};

const ProtectedStaffRoute: React.FC<{
  allowedRoles: string[];
  portalTitle: string;
  children: React.ReactNode;
}> = ({ allowedRoles, portalTitle, children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FCFBF8] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#0B4036]/20 border-t-[#0B4036] rounded-full animate-spin" />
        <p className="text-xs text-slate-500 mt-2">Loading Operations Portal...</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  const canAccess = allowedRoles.includes(user.role) || ['OWNER', 'MANAGER', 'SUPER_ADMIN'].includes(user.role);
  if (!canAccess) {
    if (user.role === 'RESIDENT') return <Navigate to="/resident/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }
  return <StaffLayout portalTitle={portalTitle}>{children}</StaffLayout>;
};

const AppRoutes: React.FC = () => {
  return (
    <React.Suspense fallback={<PageLoadingFallback />}>
      <Routes>
        {/* ========================================================
            PUBLIC WEBSITE ROUTES
            /
            ├── /solutions
            ├── /pricing
            ├── /about
            ├── /contact
            └── /login
           ======================================================== */}
        <Route path="/" element={<PublicLayout><LandingPage /></PublicLayout>} />
        <Route path="/solutions" element={<PublicLayout><SolutionsPage /></PublicLayout>} />
        <Route path="/features" element={<PublicLayout><SolutionsPage /></PublicLayout>} />
        <Route path="/pricing" element={<PublicLayout><PricingPage /></PublicLayout>} />
        <Route path="/about" element={<PublicLayout><AboutPage /></PublicLayout>} />
        <Route path="/contact" element={<PublicLayout><ContactPage /></PublicLayout>} />
        
        {/* Public Gate QR Verification & Public Property Booking */}
        <Route path="/gate/verify/:token" element={<GateVerifyPage />} />
        <Route path="/gate/verify" element={<GateVerifyPage />} />
        <Route path="/p/:slug" element={<PublicPropertyBookingPage />} />
        <Route path="/book/:slug" element={<PublicPropertyBookingPage />} />

        {/* Authentication */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/super-admin/login" element={<LoginPage />} />

        {/* ========================================================
            SAAS PLATFORM: SUPER ADMIN PORTAL (/super-admin/*)
           ======================================================== */}
        <Route path="/super-admin" element={<Navigate to="/super-admin/dashboard" replace />} />
        <Route path="/super-admin/dashboard" element={<ProtectedSuperAdminRoute><SuperAdminDashboardPage /></ProtectedSuperAdminRoute>} />
        <Route path="/super-admin/tenants" element={<ProtectedSuperAdminRoute><SuperAdminTenantsPage /></ProtectedSuperAdminRoute>} />
        <Route path="/super-admin/tenants/new" element={<ProtectedSuperAdminRoute><SuperAdminTenantsPage /></ProtectedSuperAdminRoute>} />
        <Route path="/super-admin/properties" element={<ProtectedSuperAdminRoute><SuperAdminTenantsPage /></ProtectedSuperAdminRoute>} />
        <Route path="/super-admin/tenants/:id" element={<ProtectedSuperAdminRoute><SuperAdminTenantDetailPage /></ProtectedSuperAdminRoute>} />
        <Route path="/super-admin/owners" element={<ProtectedSuperAdminRoute><SuperAdminOwnersPage /></ProtectedSuperAdminRoute>} />
        <Route path="/super-admin/users" element={<ProtectedSuperAdminRoute><SuperAdminUsersPage /></ProtectedSuperAdminRoute>} />
        <Route path="/super-admin/subscriptions" element={<ProtectedSuperAdminRoute><SuperAdminSubscriptionsPage /></ProtectedSuperAdminRoute>} />
        <Route path="/super-admin/billing" element={<ProtectedSuperAdminRoute><SuperAdminSubscriptionsPage /></ProtectedSuperAdminRoute>} />
        <Route path="/super-admin/plans" element={<ProtectedSuperAdminRoute><SuperAdminPlansPage /></ProtectedSuperAdminRoute>} />
        <Route path="/super-admin/analytics" element={<ProtectedSuperAdminRoute><SuperAdminRevenuePage /></ProtectedSuperAdminRoute>} />
        <Route path="/super-admin/revenue" element={<ProtectedSuperAdminRoute><SuperAdminRevenuePage /></ProtectedSuperAdminRoute>} />
        <Route path="/super-admin/usage" element={<ProtectedSuperAdminRoute><SuperAdminUsagePage /></ProtectedSuperAdminRoute>} />
        <Route path="/super-admin/support" element={<ProtectedSuperAdminRoute><SuperAdminSupportPage /></ProtectedSuperAdminRoute>} />
        <Route path="/super-admin/audit-logs" element={<ProtectedSuperAdminRoute><SuperAdminAuditLogsPage /></ProtectedSuperAdminRoute>} />
        <Route path="/super-admin/system-health" element={<ProtectedSuperAdminRoute><SuperAdminSystemHealthPage /></ProtectedSuperAdminRoute>} />
        <Route path="/super-admin/health" element={<ProtectedSuperAdminRoute><SuperAdminSystemHealthPage /></ProtectedSuperAdminRoute>} />
        <Route path="/super-admin/settings" element={<ProtectedSuperAdminRoute><SuperAdminSettingsPage /></ProtectedSuperAdminRoute>} />

        {/* ========================================================
            APPLICATION: OWNER PORTAL (/owner/*)
           ======================================================== */}
        <Route path="/owner/dashboard" element={<ProtectedOwnerRoute><OwnerDashboardPage /></ProtectedOwnerRoute>} />
        <Route path="/owner/properties" element={<ProtectedOwnerRoute><PropertiesPage /></ProtectedOwnerRoute>} />
        <Route path="/owner/buildings" element={<ProtectedOwnerRoute><PropertiesPage /></ProtectedOwnerRoute>} />
        <Route path="/owner/floors" element={<ProtectedOwnerRoute><PropertiesPage /></ProtectedOwnerRoute>} />
        <Route path="/owner/rooms" element={<ProtectedOwnerRoute><RoomsPage /></ProtectedOwnerRoute>} />
        <Route path="/owner/beds" element={<ProtectedOwnerRoute><RoomsPage /></ProtectedOwnerRoute>} />
        <Route path="/owner/allocations" element={<ProtectedOwnerRoute><RoomsPage /></ProtectedOwnerRoute>} />
        <Route path="/owner/residents" element={<ProtectedOwnerRoute><ResidentsPage /></ProtectedOwnerRoute>} />
        <Route path="/owner/residents/lifecycle" element={<ProtectedOwnerRoute><ResidentLifecyclePage /></ProtectedOwnerRoute>} />
        <Route path="/owner/staff" element={<ProtectedOwnerRoute><StaffPage /></ProtectedOwnerRoute>} />
        <Route path="/owner/leave" element={<ProtectedOwnerRoute><OwnerLeavePage /></ProtectedOwnerRoute>} />
        
        {/* Admissions & Leads */}
        <Route path="/owner/leads" element={<ProtectedOwnerRoute><LeadsPage /></ProtectedOwnerRoute>} />
        <Route path="/owner/admissions" element={<ProtectedOwnerRoute><LeadsPage /></ProtectedOwnerRoute>} />
        <Route path="/owner/bookings" element={<ProtectedOwnerRoute><LeadsPage /></ProtectedOwnerRoute>} />
        
        {/* Finance & Utilities */}
        <Route path="/owner/finance" element={<ProtectedOwnerRoute><PaymentsPage /></ProtectedOwnerRoute>} />
        <Route path="/owner/payments" element={<ProtectedOwnerRoute><PaymentsPage /></ProtectedOwnerRoute>} />
        <Route path="/owner/reconciliation" element={<ProtectedOwnerRoute><ReconciliationPage /></ProtectedOwnerRoute>} />
        <Route path="/owner/deposits" element={<ProtectedOwnerRoute><PaymentsPage /></ProtectedOwnerRoute>} />
        <Route path="/owner/expenses" element={<ProtectedOwnerRoute><PaymentsPage /></ProtectedOwnerRoute>} />
        <Route path="/owner/utilities" element={<ProtectedOwnerRoute><UtilitiesPage /></ProtectedOwnerRoute>} />
        <Route path="/owner/energy" element={<ProtectedOwnerRoute><UtilitiesPage /></ProtectedOwnerRoute>} />
        
        {/* Next-Stage All-in-One Operations & Command Center */}
        <Route path="/owner/command-center" element={<ProtectedOwnerRoute><CommandCenterPage /></ProtectedOwnerRoute>} />
        <Route path="/owner/lifecycle" element={<ProtectedOwnerRoute><LifecyclePipelinePage /></ProtectedOwnerRoute>} />
        <Route path="/owner/visual-occupancy" element={<ProtectedOwnerRoute><VisualOccupancyPage /></ProtectedOwnerRoute>} />
        <Route path="/owner/floor-plan" element={<ProtectedOwnerRoute><VisualOccupancyPage /></ProtectedOwnerRoute>} />
        <Route path="/owner/tasks" element={<ProtectedOwnerRoute><UnifiedTasksPage /></ProtectedOwnerRoute>} />
        <Route path="/owner/unified-tasks" element={<ProtectedOwnerRoute><UnifiedTasksPage /></ProtectedOwnerRoute>} />
        <Route path="/owner/assets" element={<ProtectedOwnerRoute><AssetsVendorsPage /></ProtectedOwnerRoute>} />
        <Route path="/owner/vendors" element={<ProtectedOwnerRoute><AssetsVendorsPage /></ProtectedOwnerRoute>} />
        <Route path="/owner/inventory" element={<ProtectedOwnerRoute><InventoryPage /></ProtectedOwnerRoute>} />
        <Route path="/owner/visitors" element={<ProtectedOwnerRoute><VisitorsPage /></ProtectedOwnerRoute>} />
        <Route path="/owner/maintenance" element={<ProtectedOwnerRoute><MaintenancePage /></ProtectedOwnerRoute>} />
        <Route path="/owner/kitchen" element={<ProtectedOwnerRoute><CookDashboardPage /></ProtectedOwnerRoute>} />
        <Route path="/owner/menu" element={<ProtectedOwnerRoute><CookDashboardPage /></ProtectedOwnerRoute>} />
        <Route path="/owner/security" element={<ProtectedOwnerRoute><SecurityGuardPage /></ProtectedOwnerRoute>} />
        <Route path="/owner/housekeeping" element={<ProtectedOwnerRoute><HousekeepingPage /></ProtectedOwnerRoute>} />
        <Route path="/owner/documents" element={<ProtectedOwnerRoute><OwnerDocumentsPage /></ProtectedOwnerRoute>} />
        <Route path="/owner/notices" element={<ProtectedOwnerRoute><OwnerNoticesPage /></ProtectedOwnerRoute>} />
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
        <Route path="/resident/meals" element={<ProtectedResidentRoute><ResidentMealsPage /></ProtectedResidentRoute>} />
        <Route path="/resident/payments" element={<ProtectedResidentRoute><ResidentPaymentsPage /></ProtectedResidentRoute>} />
        <Route path="/resident/visitors" element={<ProtectedResidentRoute><ResidentVisitorsPage /></ProtectedResidentRoute>} />
        <Route path="/resident/complaints" element={<ProtectedResidentRoute><ResidentComplaintsPage /></ProtectedResidentRoute>} />
        <Route path="/resident/leave" element={<ProtectedResidentRoute><ResidentLeavePage /></ProtectedResidentRoute>} />
        <Route path="/resident/documents" element={<ProtectedResidentRoute><ResidentDocumentsPage /></ProtectedResidentRoute>} />
        <Route path="/resident/notices" element={<ProtectedResidentRoute><ResidentNoticesPage /></ProtectedResidentRoute>} />
        <Route path="/resident/profile" element={<ProtectedResidentRoute><ResidentProfilePage /></ProtectedResidentRoute>} />
        <Route path="/resident/emergency" element={<ProtectedResidentRoute><ResidentEmergencyPage /></ProtectedResidentRoute>} />

        {/* ========================================================
            STAFF OPERATIONS PORTALS (/staff/*)
           ======================================================== */}
        <Route
          path="/staff/kitchen"
          element={
            <ProtectedStaffRoute allowedRoles={['COOK']} portalTitle="Kitchen & Mess Operations">
              <CookDashboardPage />
            </ProtectedStaffRoute>
          }
        />
        <Route path="/cook/dashboard" element={<Navigate to="/staff/kitchen" replace />} />

        <Route
          path="/staff/security"
          element={
            <ProtectedStaffRoute allowedRoles={['SECURITY_GUARD']} portalTitle="Gate & Visitor Security Desk">
              <SecurityGuardPage />
            </ProtectedStaffRoute>
          }
        />
        <Route path="/security/dashboard" element={<Navigate to="/staff/security" replace />} />

        <Route
          path="/staff/housekeeping"
          element={
            <ProtectedStaffRoute allowedRoles={['HOUSEKEEPING']} portalTitle="Housekeeping & Facility Care">
              <HousekeepingPage />
            </ProtectedStaffRoute>
          }
        />
        <Route path="/housekeeping/dashboard" element={<Navigate to="/staff/housekeeping" replace />} />

        <Route
          path="/staff/maintenance"
          element={
            <ProtectedStaffRoute allowedRoles={['MAINTENANCE']} portalTitle="Maintenance & Facilities Desk">
              <MaintenancePage />
            </ProtectedStaffRoute>
          }
        />
        <Route path="/maintenance/dashboard" element={<Navigate to="/staff/maintenance" replace />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </React.Suspense>
  );
};

const App: React.FC = () => {
  return <AppRoutes />;
};

export default App;
