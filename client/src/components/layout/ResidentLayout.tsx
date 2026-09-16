import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  BedDouble,
  CreditCard,
  UserCheck,
  Wrench,
  CalendarDays,
  FileText,
  Bell,
  Siren,
  User,
  LogOut,
  ArrowRightLeft,
  Sparkles,
  ShieldAlert,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { residentApi } from '../../services/residentApi';

interface ResidentNavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

const RESIDENT_NAV_ITEMS: ResidentNavItem[] = [
  { label: 'Home', path: '/resident/dashboard', icon: Home },
  { label: 'My Room', path: '/resident/room', icon: BedDouble },
  { label: 'Payments', path: '/resident/payments', icon: CreditCard },
  { label: 'Visitors', path: '/resident/visitors', icon: UserCheck },
  { label: 'Complaints', path: '/resident/complaints', icon: Wrench },
  { label: 'Leave', path: '/resident/leave', icon: CalendarDays },
  { label: 'Documents', path: '/resident/documents', icon: FileText },
  { label: 'Notices', path: '/resident/notices', icon: Bell },
  { label: 'Emergency SOS', path: '/resident/emergency', icon: Shield },
  { label: 'Profile', path: '/resident/profile', icon: User },
];

export const ResidentLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, switchRole, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [sosActivated, setSosActivated] = useState(false);
  const [isTriggeringSOS, setIsTriggeringSOS] = useState(false);

  const handleConfirmSOS = async () => {
    setIsTriggeringSOS(true);
    try {
      await residentApi.triggerSOS('Emergency SOS triggered from Resident Header shortcut');
      setSosActivated(true);
    } catch (err: any) {
      alert(err.message || 'Failed to trigger SOS.');
    } finally {
      setIsTriggeringSOS(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20 md:pb-8">
      {/* Resident Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-sm shadow-md">
            UN
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              Urban Nest Resident Portal
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Smart PG Management System</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Emergency SOS Button */}
          <button
            onClick={() => setSosModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm shadow-rose-500/25 transition-all animate-pulse"
          >
            <Siren className="w-4 h-4" />
            <span className="hidden sm:inline">EMERGENCY SOS</span>
          </button>

          {/* Switch Role Launcher for Demo / Dev */}
          <Button
            variant="outline"
            size="sm"
            className="hidden lg:flex text-xs text-purple-600 border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/30"
            onClick={() => {
              switchRole('OWNER');
              navigate('/owner/dashboard');
            }}
            leftIcon={<ArrowRightLeft className="w-3.5 h-3.5" />}
          >
            Switch to Owner
          </Button>

          {/* User Profile */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
              {user?.name?.charAt(0) || 'R'}
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Sub-Bar for Desktop */}
      <nav className="hidden md:flex items-center gap-1 px-8 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800 overflow-x-auto">
        {RESIDENT_NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Main Resident Body */}
      <main className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 px-2 py-2 flex items-center justify-around shadow-lg">
        {RESIDENT_NAV_ITEMS.slice(0, 5).map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-medium transition-all ${
                isActive ? 'text-purple-600 dark:text-purple-400 font-bold' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setSosModalOpen(true)}
          className="flex flex-col items-center gap-1 px-2 py-1 text-[10px] font-bold text-rose-600"
        >
          <Siren className="w-5 h-5 animate-pulse" />
          <span>SOS</span>
        </button>
      </nav>

      {/* Emergency SOS Confirmation Modal */}
      <Modal isOpen={sosModalOpen} onClose={() => { setSosModalOpen(false); setSosActivated(false); }} maxWidth="sm">
        {!sosActivated ? (
          <div className="text-center space-y-4 pt-1">
            <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center mx-auto animate-bounce">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Trigger Emergency SOS?</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                This will immediately broadcast an emergency alert to PG Warden, Security Gate Desk, and create an emergency log record.
              </p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/60 p-3 rounded-xl border border-amber-200 dark:border-amber-900 text-left text-xs text-amber-800 dark:text-amber-300">
              <strong>Emergency Contacts:</strong>
              <ul className="mt-1 space-y-1">
                <li>• PG Warden: +91 98765 43210</li>
                <li>• Police / National Emergency: 112</li>
                <li>• Ambulance: 108</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setSosModalOpen(false)} disabled={isTriggeringSOS}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmSOS}
                isLoading={isTriggeringSOS}
              >
                CONFIRM EMERGENCY ALERT
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4 py-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Sparkles className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">EMERGENCY SOS ACTIVATED</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              PG Warden and Security Gate have been notified with your resident coordinates.
            </p>
            <p className="text-[11px] text-slate-400 font-mono">Timestamp: {new Date().toLocaleTimeString()}</p>
            <Button variant="primary" size="sm" className="w-full" onClick={() => { setSosModalOpen(false); setSosActivated(false); }}>
              Close SOS Window
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};
