import { toast, useToast } from '../../context/ToastContext';
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
  ShieldAlert,
  Shield,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { UrbanNestLogo } from '../ui/UrbanNestLogo';
import { residentApi } from '../../services/residentApi';

interface ResidentNavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

const RESIDENT_NAV_ITEMS: ResidentNavItem[] = [
  { label: 'Dashboard', path: '/resident/dashboard', icon: Home },
  { label: 'My Room', path: '/resident/room', icon: BedDouble },
  { label: 'Payments', path: '/resident/payments', icon: CreditCard },
  { label: 'Visitors', path: '/resident/visitors', icon: UserCheck },
  { label: 'Complaints', path: '/resident/complaints', icon: Wrench },
  { label: 'Leave', path: '/resident/leave', icon: CalendarDays },
  { label: 'Documents', path: '/resident/documents', icon: FileText },
  { label: 'Notices', path: '/resident/notices', icon: Bell },
  { label: 'Emergency', path: '/resident/emergency', icon: Shield },
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
      toast.error(err.message || 'Failed to trigger SOS.');
    } finally {
      setIsTriggeringSOS(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F7F3] dark:bg-slate-950 text-[#18231F] dark:text-slate-100 pb-20 md:pb-8 flex flex-col">
      {/* Resident Header */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-[#DDE2DD] dark:border-slate-800 px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/resident/dashboard">
            <UrbanNestLogo variant="horizontal" size="sm" />
          </Link>
          <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-[#FAF5EB] text-[#B9954E] border border-[#C8A45D]/30 uppercase tracking-wider">
            Resident Portal
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Emergency SOS Button */}
          <button
            onClick={() => setSosModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors"
            aria-label="Trigger SOS emergency"
          >
            <Siren className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">EMERGENCY SOS</span>
          </button>

          {/* Switch Role Launcher */}
          <Button
            variant="outline"
            size="xs"
            className="hidden lg:flex text-xs text-[#0B4036] font-semibold border-[#DDE2DD] hover:bg-[#EAF2EE]"
            onClick={() => {
              switchRole('OWNER');
              navigate('/owner/dashboard');
            }}
            leftIcon={<ArrowRightLeft className="w-3 h-3 text-[#C8A45D]" />}
          >
            Switch to Owner
          </Button>

          {/* User Profile */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#DDE2DD] dark:border-slate-800">
            <div className="w-7 h-7 rounded-full bg-[#0B4036] text-white font-bold flex items-center justify-center text-xs">
              {user?.name ? user.name.charAt(0) : 'R'}
            </div>
            <div className="hidden sm:block text-left text-xs">
              <p className="font-bold text-[#18231F] dark:text-white leading-tight truncate max-w-[120px]">{user?.name || 'Resident'}</p>
              <p className="text-[10px] text-[#8A928D] leading-none">Verified Resident</p>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              title="Logout"
              className="p-1.5 text-[#8A928D] hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Sub-Bar for Desktop */}
      <nav className="hidden md:flex items-center gap-1 px-6 py-2 bg-white dark:bg-slate-900 border-b border-[#DDE2DD] dark:border-slate-800 overflow-x-auto">
        {RESIDENT_NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                isActive
                  ? 'bg-[#EAF2EE] text-[#0B4036] font-bold dark:bg-slate-800 dark:text-white'
                  : 'text-[#68736D] dark:text-slate-400 hover:bg-[#F8F7F3] hover:text-[#18231F]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#0B4036]' : 'text-[#8A928D]'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Main Resident Body */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-[#DDE2DD] dark:border-slate-800 px-2 py-1.5 flex items-center justify-around shadow-lg">
        {RESIDENT_NAV_ITEMS.slice(0, 5).map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                isActive ? 'text-[#0B4036] dark:text-emerald-400 font-bold' : 'text-[#8A928D]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setSosModalOpen(true)}
          className="flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-bold text-rose-600"
        >
          <Siren className="w-4 h-4" />
          <span>SOS</span>
        </button>
      </nav>

      {/* Emergency SOS Confirmation Modal */}
      <Modal isOpen={sosModalOpen} onClose={() => { setSosModalOpen(false); setSosActivated(false); }} maxWidth="sm">
        {!sosActivated ? (
          <div className="text-center space-y-3.5 pt-1">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#18231F] dark:text-white">Trigger Emergency SOS?</h3>
              <p className="mt-1 text-xs text-[#68736D] dark:text-slate-400">
                This will broadcast an instant alert to the PG Warden and Security Gate Desk with your room coordinates.
              </p>
            </div>

            <div className="bg-[#FAF5EB] p-3 rounded-lg border border-[#C8A45D]/30 text-left text-xs text-[#18231F]">
              <strong className="text-[#0B4036]">Direct Emergency Helplines:</strong>
              <ul className="mt-1 space-y-0.5 text-[#68736D]">
                <li>• PG Warden: +91 98765 43210</li>
                <li>• National Emergency: 112</li>
                <li>• Medical Ambulance: 108</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#DDE2DD]">
              <Button variant="outline" size="sm" onClick={() => setSosModalOpen(false)} disabled={isTriggeringSOS}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmSOS}
                isLoading={isTriggeringSOS}
              >
                Confirm SOS Alert
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-3.5 py-2">
            <div className="w-12 h-12 rounded-xl bg-[#EAF2EE] text-[#0B4036] flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#18231F] dark:text-white">Emergency Broadcast Active</h3>
            <p className="text-xs text-[#68736D] dark:text-slate-300">
              PG Warden and Gate Security have received your SOS notice with room coordinates.
            </p>
            <p className="text-[11px] text-[#8A928D] font-mono">Timestamp: {new Date().toLocaleTimeString()}</p>
            <Button variant="primary" size="sm" className="w-full" onClick={() => { setSosModalOpen(false); setSosActivated(false); }}>
              Dismiss
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};
