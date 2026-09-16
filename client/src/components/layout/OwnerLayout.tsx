import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  BedDouble,
  Users,
  UserCheck,
  CreditCard,
  Receipt,
  Wallet,
  ShieldCheck,
  Wrench,
  CheckSquare,
  Sparkles,
  ClipboardList,
  Box,
  Truck,
  FileText,
  Bell,
  Calendar,
  BarChart3,
  History,
  HardDriveDownload,
  Settings,
  Menu,
  X,
  Search,
  ChevronDown,
  UserCircle,
  LogOut,
  AlertTriangle,
  ArrowRightLeft
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { MOCK_PROPERTIES } from '../../data/mockData';
import { Button } from '../ui/Button';

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
      { label: 'Properties', path: '/owner/properties', icon: Building2 },
      { label: 'Rooms & Beds', path: '/owner/rooms', icon: BedDouble }
    ]
  },
  {
    groupName: 'PEOPLE',
    items: [
      { label: 'Residents', path: '/owner/residents', icon: Users },
      { label: 'Resident Lifecycle', path: '/owner/residents/lifecycle', icon: UserCheck },
      { label: 'Staff Management', path: '/owner/staff', icon: ShieldCheck }
    ]
  },
  {
    groupName: 'FINANCE',
    items: [
      { label: 'Finance Overview', path: '/owner/finance', icon: CreditCard },
      { label: 'Rent Payments', path: '/owner/payments', icon: Receipt, badge: '1 Overdue' },
      { label: 'Security Deposits', path: '/owner/deposits', icon: Wallet },
      { label: 'Expenses', path: '/owner/expenses', icon: BarChart3 }
    ]
  },
  {
    groupName: 'OPERATIONS',
    items: [
      { label: 'Visitor Desk', path: '/owner/visitors', icon: UserCircle, badge: '1 Pending' },
      { label: 'Maintenance', path: '/owner/maintenance', icon: Wrench, badge: '2 Open' },
      { label: 'Internal Tasks', path: '/owner/tasks', icon: CheckSquare },
      { label: 'Housekeeping', path: '/owner/housekeeping', icon: Sparkles }
    ]
  },
  {
    groupName: 'ASSETS',
    items: [
      { label: 'Inventory & Assets', path: '/owner/inventory', icon: Box },
      { label: 'Vendors', path: '/owner/vendors', icon: Truck }
    ]
  },
  {
    groupName: 'COMMUNICATION',
    items: [
      { label: 'Document Vault', path: '/owner/documents', icon: FileText },
      { label: 'Notice Board', path: '/owner/notices', icon: Bell }
    ]
  },
  {
    groupName: 'INSIGHTS & SYSTEM',
    items: [
      { label: 'Audit Logs', path: '/owner/audit-logs', icon: History },
      { label: 'Settings', path: '/owner/settings', icon: Settings }
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 h-screen z-30 shrink-0">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-900 text-white flex items-center justify-center font-black text-base shadow-sm">
              UN
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">URBAN NEST</h1>
              <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold tracking-wide uppercase">Smart PG Operations</p>
            </div>
          </div>
        </div>

        {/* Grouped Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {OWNER_NAV_GROUPS.map((group) => (
            <div key={group.groupName} className="space-y-1">
              <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {group.groupName}
              </h3>
              {group.items.map((item) => {
                const isActive = location.pathname === item.path || (item.path !== '/owner/dashboard' && location.pathname.startsWith(item.path));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Switch Role Footer Demo Launcher */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs justify-start text-purple-700 border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/50"
            onClick={() => {
              switchRole('RESIDENT');
              navigate('/resident/dashboard');
            }}
            leftIcon={<ArrowRightLeft className="w-3.5 h-3.5" />}
          >
            Switch to Resident Portal
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Property Switcher */}
            <div className="relative">
              <button
                onClick={() => setPropertyDropdownOpen(!propertyDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors"
              >
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span className="max-w-[140px] sm:max-w-[200px] truncate">{activeProperty.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {propertyDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 z-50">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Select Active Property
                  </div>
                  {MOCK_PROPERTIES.map((prop) => (
                    <button
                      key={prop.id}
                      onClick={() => {
                        setActiveProperty(prop);
                        setPropertyDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 ${
                        activeProperty.id === prop.id ? 'font-bold text-blue-600 bg-blue-50/50 dark:bg-blue-950/40' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="truncate">{prop.name}</span>
                      {activeProperty.id === prop.id && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            {/* Action Alert Badge */}
            <Link
              to="/owner/dashboard"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40 text-xs font-medium hover:bg-amber-100 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>4 Actions Pending</span>
            </Link>

            {/* Profile Menu */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <img
                src={user?.avatarUrl}
                alt={user?.name}
                className="w-8 h-8 rounded-full border border-slate-200 object-cover"
              />
              <div className="hidden md:block text-left text-xs">
                <p className="font-bold text-slate-900 dark:text-white">{user?.name}</p>
                <p className="text-[10px] text-slate-400">Owner & Admin</p>
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-72 bg-white dark:bg-slate-900 h-full flex flex-col z-10 shadow-2xl overflow-y-auto">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold text-sm">
                  UN
                </div>
                <span className="font-bold text-sm">URBAN NEST</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-6">
              {OWNER_NAV_GROUPS.map((group) => (
                <div key={group.groupName} className="space-y-1">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                    {group.groupName}
                  </h4>
                  {group.items.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                    >
                      <item.icon className="w-4 h-4 text-blue-600" />
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
