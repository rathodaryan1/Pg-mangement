import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layout
import { Layout } from './components/Layout';

// Unauthenticated Pages
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { OtpVerifyPage } from './pages/OtpVerifyPage';
import { WelcomePage } from './pages/WelcomePage';

// Authenticated Pages
import { DashboardPage } from './pages/DashboardPage';
import { MembersPage } from './pages/MembersPage';
import { RoomsPage } from './pages/RoomsPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { BookingsPage } from './pages/BookingsPage';
import { MaintenancePage } from './pages/MaintenancePage';
import { NoticeBoardPage } from './pages/NoticeBoardPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { VisitorsPage } from './pages/VisitorsPage';
import { InventoryPage } from './pages/InventoryPage';
import { StaffPage } from './pages/StaffPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

// Route Guard Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f4f9] dark:bg-[#080913]">
        <div className="w-8 h-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* ==========================================
          UNAUTHENTICATED ROUTES (No Sidebar/Layout)
         ========================================== */}
      <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/dashboard" />} />
      <Route path="/signup" element={!user ? <SignupPage /> : <Navigate to="/dashboard" />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/otp-verify" element={<OtpVerifyPage />} />
      <Route path="/welcome" element={<WelcomePage />} />

      {/* ==========================================
          AUTHENTICATED ROUTES (With Sidebar/Layout)
         ========================================== */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="members" element={<MembersPage />} />
                <Route path="rooms" element={<RoomsPage />} />
                <Route path="payments" element={<PaymentsPage />} />
                <Route path="bookings" element={<BookingsPage />} />
                <Route path="maintenance" element={<MaintenancePage />} />
                <Route path="notices" element={<NoticeBoardPage />} />
                <Route path="expenses" element={<ExpensesPage />} />
                <Route path="visitors" element={<VisitorsPage />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="staff" element={<StaffPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                
                {/* Fallback redirect */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default App;
