import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  BedDouble,
  Users,
  UserCheck,
  Receipt,
  Wallet,
  ShieldCheck,
  Wrench,
  Box,
  Calendar,
  BarChart3,
  History,
  Settings,
  Menu,
  X,
  ChevronDown,
  UserCircle,
  LogOut,
  ArrowRightLeft,
  LifeBuoy,
  FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { MOCK_PROPERTIES } from '../../data/mockData';
import { Button } from '../ui/Button';
import { UrbanNestLogo, UrbanNestMark } from '../ui/UrbanNestLogo';

interface NavGroup {
  groupName: string;
  items: {
    label: string;
    path: string;
    icon: React.ElementType;
    badge?: string | number;
  }[];
}

const OWNER_NAV_GROUPS: NavGroup[] = [
  {
    groupName: 'OVERVIEW',
    items: [
      { label: 'Dashboard', path: '/owner/dashboard', icon: LayoutDashboard }
    ]
  },
  {
    groupName: 'PROPERTY',
    items: [
      { label: 'Properties & Floors', path: '/owner/properties', icon: Building2 },
      { label: 'Rooms & Beds', path: '/owner/rooms', icon: BedDouble }
    ]
  },
  {
    groupName: 'PEOPLE',
    items: [
      { label: 'Residents', path: '/owner/residents', icon: Users },
      { label: 'Resident Lifecycle', path: '/owner/residents/lifecycle', icon: UserCheck },
      { label: 'Staff Management', path: '/owner/staff', icon: ShieldCheck },
      { label: 'Leave Approvals', path: '/owner/leave', icon: Calendar }
    ]
  },
  {
    groupName: 'FINANCE',
    items: [
      { label: 'Rent Payments', path: '/owner/payments', icon: Receipt },
      { label: 'Security Deposits', path: '/owner/deposits', icon: Wallet },
      { label: 'Operating Expenses', path: '/owner/expenses', icon: BarChart3 }
    ]
  },
  {
    groupName: 'OPERATIONS',
    items: [
      { label: 'Visitor Desk', path: '/owner/visitors', icon: UserCircle },
      { label: 'Maintenance & Tickets', path: '/owner/maintenance', icon: Wrench },
      { label: 'Inventory & Assets', path: '/owner/inventory', icon: Box },
      { label: 'Emergency & SOS', path: '/owner/emergency', icon: LifeBuoy }
    ]
  },
  {
    groupName: 'INTELLIGENCE',
    items: [
      { label: 'Reports & Analytics', path: '/owner/reports', icon: FileSpreadsheet },
      { label: 'Audit Logs', path: '/owner/audit-logs', icon: History },
      { label: 'PG Settings', path: '/owner/settings', icon: Settings }
    ]
  }
];

export const OwnerLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, activeProperty, setActiveProperty, switchRole, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [propertyDropdownOpen, setPropertyDropdownOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8F7F3] dark:bg-slate-950 text-[#18231F] dark:text-slate-100 flex">
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex flex-col w-60 border-r border-[#DDE2DD] dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 h-screen z-30 shrink-0">
        {/* Brand Header with Exact Logo */}
        <div className="h-16 px-4 border-b border-[#DDE2DD] dark:border-slate-800 flex items-center justify-between">
          <Link to="/owner/dashboard" className="flex items-center">
            <UrbanNestLogo variant="horizontal" size="sm" />
          </Link>
        </div>

        {/* Grouped Navigation Links */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
          {OWNER_NAV_GROUPS.map((group) => (
            <div key={group.groupName} className="space-y-0.5">
              <h3 className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8A928D] dark:text-slate-500">
                {group.groupName}
              </h3>
              {group.items.map((item) => {
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== '/owner/dashboard' && location.pathname.startsWith(item.path));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-[#EAF2EE] text-[#0B4036] font-bold border-l-2 border-[#0B4036] dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'text-[#68736D] dark:text-slate-400 hover:bg-[#F8F7F3] dark:hover:bg-slate-800/60 hover:text-[#18231F] dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#0B4036] dark:text-emerald-400' : 'text-[#8A928D]'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FAF5EB] text-[#B9954E] border border-[#C8A45D]/30">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Switch Role Footer Launcher */}
        <div className="p-2.5 border-t border-[#DDE2DD] dark:border-slate-800 bg-[#FCFBF8] dark:bg-slate-900/50">
          <Button
            variant="outline"
            size="xs"
            className="w-full text-xs justify-center text-[#0B4036] font-semibold border-[#DDE2DD] hover:bg-[#EAF2EE]"
            onClick={() => {
              switchRole('RESIDENT');
              navigate('/resident/dashboard');
            }}
            leftIcon={<ArrowRightLeft className="w-3.5 h-3.5 text-[#C8A45D]" />}
          >
            Switch to Resident Portal
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-20 h-14 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-[#DDE2DD] dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1.5 rounded-lg text-[#18231F] dark:text-slate-400 hover:bg-[#EAF2EE]"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Property Switcher */}
            <div className="relative">
              <button
                onClick={() => setPropertyDropdownOpen(!propertyDropdownOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[#DDE2DD] dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-[#F8F7F3] text-xs font-semibold text-[#18231F] dark:text-slate-200 shadow-xs transition-colors"
              >
                <Building2 className="w-3.5 h-3.5 text-[#0B4036] shrink-0" />
                <span className="max-w-[140px] sm:max-w-[200px] truncate">{activeProperty?.name || 'Urban Nest Prime'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#8A928D] shrink-0" />
              </button>

              {propertyDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-slate-900 border border-[#DDE2DD] dark:border-slate-800 rounded-xl shadow-lg py-1.5 z-50">
                  <div className="px-3 py-1 text-[10px] font-bold text-[#8A928D] uppercase tracking-wider">
                    Select Active Property
                  </div>
                  {MOCK_PROPERTIES.map((prop) => (
                    <button
                      key={prop.id}
                      onClick={() => {
                        setActiveProperty(prop);
                        setPropertyDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-[#F8F7F3] dark:hover:bg-slate-800 ${
                        activeProperty?.id === prop.id
                          ? 'font-bold text-[#0B4036] bg-[#EAF2EE]'
                          : 'text-[#18231F] dark:text-slate-300'
                      }`}
                    >
                      <span className="truncate">{prop.name}</span>
                      {activeProperty?.id === prop.id && <span className="w-1.5 h-1.5 rounded-full bg-[#0B4036]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            {/* User Profile & Logout */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-[#DDE2DD] dark:border-slate-800">
              <div className="w-7 h-7 rounded-full bg-[#0B4036] text-white font-bold flex items-center justify-center text-xs">
                {user?.name ? user.name.charAt(0) : 'O'}
              </div>
              <div className="hidden sm:block text-left text-xs">
                <p className="font-bold text-[#18231F] dark:text-white leading-tight truncate max-w-[120px]">{user?.name || 'PG Owner'}</p>
                <p className="text-[10px] text-[#8A928D] leading-none">Property Owner</p>
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="p-1.5 text-[#8A928D] hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-64 bg-white dark:bg-slate-900 h-full flex flex-col z-10 shadow-xl overflow-y-auto border-r border-[#DDE2DD] dark:border-slate-800">
            <div className="h-16 px-4 border-b border-[#DDE2DD] dark:border-slate-800 flex items-center justify-between">
              <UrbanNestLogo variant="horizontal" size="sm" />
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-lg text-[#8A928D] hover:bg-[#F8F7F3]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 space-y-4">
              {OWNER_NAV_GROUPS.map((group) => (
                <div key={group.groupName} className="space-y-0.5">
                  <h4 className="text-[10px] font-bold text-[#8A928D] uppercase tracking-wider px-2 py-1">
                    {group.groupName}
                  </h4>
                  {group.items.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium text-[#18231F] dark:text-slate-300 hover:bg-[#EAF2EE] rounded-lg"
                    >
                      <item.icon className="w-4 h-4 text-[#0B4036]" />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerLayout;
