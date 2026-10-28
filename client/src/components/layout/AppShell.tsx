import React, { useState, useEffect, useRef } from 'react';
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
  LifeBuoy,
  FileSpreadsheet,
  Bell,
  FileText,
  Sparkles,
  UtensilsCrossed,
  Zap,
  Layers,
  CheckSquare,
  Scale,
  Home,
  CreditCard,
  CalendarDays,
  Shield,
  Utensils,
  Truck,
  AlertOctagon,
  Clock,
  PackageCheck,
  Siren,
  ChevronRight,
  Activity,
  DollarSign,
  User,
  ArrowRightLeft
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ownerApi } from '../../services/ownerApi';
import { UrbanNestLogo } from '../ui/UrbanNestLogo';
import { Button } from '../ui/Button';
import { NotificationCenter } from '../ui/NotificationCenter';
import { Modal } from '../ui/Modal';
import { toast } from '../../context/ToastContext';
import { residentApi } from '../../services/residentApi';

export interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  badge?: string | number;
}

export interface NavGroup {
  groupName: string;
  items: NavItem[];
}

export interface AppShellProps {
  children: React.ReactNode;
  portalTitle?: string;
  badgeText?: string;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  portalTitle,
  badgeText,
}) => {
  const { user, activeProperty, setActiveProperty, logout, isImpersonated, exitImpersonation } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Navigation State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [propertyDropdownOpen, setPropertyDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [propertiesList, setPropertiesList] = useState<any[]>([]);

  // Emergency SOS Modal State
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [isTriggeringSOS, setIsTriggeringSOS] = useState(false);

  const propDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Close menus on path change
  useEffect(() => {
    setMobileMenuOpen(false);
    setPropertyDropdownOpen(false);
    setUserDropdownOpen(false);
  }, [location.pathname]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (propDropdownRef.current && !propDropdownRef.current.contains(e.target as Node)) {
        setPropertyDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Fetch properties for Owner/Manager property switcher
  useEffect(() => {
    if (['OWNER', 'MANAGER', 'SUPER_ADMIN'].includes(user?.role || '')) {
      ownerApi
        .getProperties()
        .then((res) => {
          if (res.data && Array.isArray(res.data)) {
            setPropertiesList(res.data);
          }
        })
        .catch(() => {});
    }
  }, [user?.role]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleConfirmSOS = async () => {
    setIsTriggeringSOS(true);
    try {
      if (user?.role === 'RESIDENT') {
        await residentApi.triggerSOS('Emergency SOS triggered from Resident Header shortcut');
      }
      toast.success('EMERGENCY SOS ALERT BROADCAST TO MANAGEMENT & SECURITY DESK');
      setSosModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to trigger SOS');
    } finally {
      setIsTriggeringSOS(false);
    }
  };

  // -------------------------------------------------------------
  // Role-Scoped Navigation Hierarchy
  // -------------------------------------------------------------
  const getRoleNavGroups = (): NavGroup[] => {
    const role = user?.role;

    if (role === 'SUPER_ADMIN') {
      return [
        {
          groupName: 'PLATFORM SAAS',
          items: [
            { label: 'SaaS Overview', path: '/super-admin/dashboard', icon: LayoutDashboard },
            { label: 'Tenants & PGs', path: '/super-admin/tenants', icon: Building2 },
            { label: 'Subscriptions', path: '/super-admin/subscriptions', icon: CreditCard },
            { label: 'Pricing Plans', path: '/super-admin/plans', icon: Layers },
            { label: 'Revenue Analytics', path: '/super-admin/revenue', icon: DollarSign },
          ],
        },
        {
          groupName: 'OPERATIONS & HEALTH',
          items: [
            { label: 'Platform Health', path: '/super-admin/system-health', icon: Activity },
            { label: 'Audit Trail', path: '/super-admin/audit-logs', icon: History },
            { label: 'Global Settings', path: '/super-admin/settings', icon: Settings },
          ],
        },
      ];
    }

    if (role === 'OWNER' || role === 'MANAGER') {
      return [
        {
          groupName: 'OVERVIEW',
          items: [
            { label: 'Command Center', path: '/owner/command-center', icon: Sparkles },
            { label: 'Dashboard', path: '/owner/dashboard', icon: LayoutDashboard },
            { label: 'Noticeboard', path: '/owner/notices', icon: Bell },
          ],
        },
        {
          groupName: 'PROPERTY',
          items: [
            { label: 'Visual Floor Plan', path: '/owner/visual-occupancy', icon: Layers },
            { label: 'Properties & Floors', path: '/owner/properties', icon: Building2 },
            { label: 'Rooms & Beds', path: '/owner/rooms', icon: BedDouble },
          ],
        },
        {
          groupName: 'PEOPLE & ADMISSIONS',
          items: [
            { label: 'Lifecycle Pipeline', path: '/owner/lifecycle', icon: UserCheck },
            { label: 'Enquiries & Leads', path: '/owner/leads', icon: Users },
            { label: 'Residents', path: '/owner/residents', icon: Users },
            { label: 'KYC Documents', path: '/owner/documents', icon: FileText },
            { label: 'Staff Management', path: '/owner/staff', icon: ShieldCheck },
            { label: 'Leave Approvals', path: '/owner/leave', icon: Calendar },
          ],
        },
        {
          groupName: 'FINANCE',
          items: [
            { label: 'Rent Payments', path: '/owner/payments', icon: Receipt },
            { label: 'Reconciliation & Split', path: '/owner/reconciliation', icon: Scale },
            { label: 'Operating Expenses', path: '/owner/expenses', icon: BarChart3 },
          ],
        },
        {
          groupName: 'OPERATIONS',
          items: [
            { label: 'Unified Staff Tasks', path: '/owner/tasks', icon: CheckSquare },
            { label: 'Assets & Vendors', path: '/owner/assets', icon: Box },
            { label: 'Kitchen & Mess', path: '/owner/kitchen', icon: UtensilsCrossed },
            { label: 'Visitor Desk', path: '/owner/visitors', icon: UserCircle },
            { label: 'Maintenance & Tickets', path: '/owner/maintenance', icon: Wrench },
            { label: 'Utility Sub-Meters', path: '/owner/utilities', icon: Zap },
            { label: 'Emergency & SOS', path: '/owner/emergency', icon: LifeBuoy },
          ],
        },
        {
          groupName: 'INTELLIGENCE',
          items: [
            { label: 'Reports & Analytics', path: '/owner/reports', icon: FileSpreadsheet },
            { label: 'Audit Logs', path: '/owner/audit-logs', icon: History },
            { label: 'PG Settings', path: '/owner/settings', icon: Settings },
          ],
        },
      ];
    }

    if (role === 'RESIDENT') {
      return [
        {
          groupName: 'MY RESIDENCE',
          items: [
            { label: 'My Dashboard', path: '/resident/dashboard', icon: Home },
            { label: 'Room & Bed', path: '/resident/room', icon: BedDouble },
            { label: 'Meals & RSVP', path: '/resident/meals', icon: Utensils },
            { label: 'Rent & Payments', path: '/resident/payments', icon: CreditCard },
            { label: 'Visitor Passes', path: '/resident/visitors', icon: UserCheck },
            { label: 'Complaints', path: '/resident/complaints', icon: Wrench },
            { label: 'Leave Requests', path: '/resident/leave', icon: CalendarDays },
            { label: 'KYC Documents', path: '/resident/documents', icon: FileText },
            { label: 'Digital Notices', path: '/resident/notices', icon: Bell },
            { label: 'Emergency SOS', path: '/resident/emergency', icon: Shield },
            { label: 'My Profile', path: '/resident/profile', icon: User },
          ],
        },
      ];
    }

    if (role === 'COOK') {
      return [
        {
          groupName: 'KITCHEN & MESS DESK',
          items: [
            { label: 'Meal Planning & Ops', path: '/staff/kitchen', icon: UtensilsCrossed },
            { label: 'Inventory & Supplies', path: '/staff/kitchen#stock', icon: PackageCheck },
          ],
        },
      ];
    }

    if (role === 'SECURITY_GUARD') {
      return [
        {
          groupName: 'SECURITY GATE DESK',
          items: [
            { label: 'Gate Desk & Passes', path: '/staff/security', icon: ShieldCheck },
            { label: 'Visitor Register', path: '/staff/security#visitors', icon: UserCheck },
            { label: 'Inward Courier Desk', path: '/staff/security#parcels', icon: Truck },
          ],
        },
      ];
    }

    if (role === 'HOUSEKEEPING') {
      return [
        {
          groupName: 'HOUSEKEEPING DESK',
          items: [
            { label: 'Cleaning Tasks', path: '/staff/housekeeping', icon: Sparkles },
            { label: 'Room Readiness', path: '/staff/housekeeping#turnover', icon: BedDouble },
          ],
        },
      ];
    }

    if (role === 'MAINTENANCE') {
      return [
        {
          groupName: 'MAINTENANCE DESK',
          items: [
            { label: 'Work Orders & Repairs', path: '/staff/maintenance', icon: Wrench },
          ],
        },
      ];
    }

    if (role === 'RECEPTIONIST') {
      return [
        {
          groupName: 'FRONT DESK',
          items: [
            { label: 'Front Desk Dashboard', path: '/owner/dashboard', icon: LayoutDashboard },
            { label: 'Visitor Desk', path: '/owner/visitors', icon: UserCircle },
            { label: 'Resident Admissions', path: '/owner/leads', icon: Users },
            { label: 'Staff Attendance', path: '/owner/staff', icon: Clock },
          ],
        },
      ];
    }

    if (role === 'ACCOUNTANT') {
      return [
        {
          groupName: 'FINANCE & ACCOUNTS',
          items: [
            { label: 'Finance Dashboard', path: '/owner/dashboard', icon: LayoutDashboard },
            { label: 'Rent Payments', path: '/owner/payments', icon: Receipt },
            { label: 'Reconciliation', path: '/owner/reconciliation', icon: Scale },
            { label: 'Staff Payroll', path: '/owner/staff', icon: DollarSign },
            { label: 'Operating Expenses', path: '/owner/expenses', icon: BarChart3 },
          ],
        },
      ];
    }

    return [];
  };

  const navGroups = getRoleNavGroups();

  const getRoleBadge = () => {
    switch (user?.role) {
      case 'SUPER_ADMIN':
        return { label: 'Platform Super Admin', color: 'bg-purple-100 text-purple-900 border-purple-200' };
      case 'OWNER':
        return { label: 'Property Owner', color: 'bg-[#FAF5EB] text-[#B9954E] border-[#C8A45D]/40' };
      case 'MANAGER':
        return { label: 'PG Manager', color: 'bg-[#FAF5EB] text-[#B9954E] border-[#C8A45D]/40' };
      case 'RESIDENT':
        return { label: 'Verified Resident', color: 'bg-[#EAF2EE] text-[#0B4036] border-[#0B4036]/20' };
      case 'COOK':
        return { label: 'Head Chef / Cook', color: 'bg-amber-100 text-amber-900 border-amber-200' };
      case 'SECURITY_GUARD':
        return { label: 'Security Officer', color: 'bg-blue-100 text-blue-900 border-blue-200' };
      case 'HOUSEKEEPING':
        return { label: 'Housekeeping Specialist', color: 'bg-emerald-100 text-emerald-900 border-emerald-200' };
      case 'MAINTENANCE':
        return { label: 'Maintenance Specialist', color: 'bg-orange-100 text-orange-900 border-orange-200' };
      case 'RECEPTIONIST':
        return { label: 'Receptionist / Front Desk', color: 'bg-teal-100 text-teal-900 border-teal-200' };
      case 'ACCOUNTANT':
        return { label: 'Property Accountant', color: 'bg-emerald-100 text-emerald-900 border-emerald-200' };
      default:
        return { label: badgeText || 'Property Staff', color: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  const roleBadge = getRoleBadge();

  // Root dashboard path for logo click
  const getRootDashboard = () => {
    switch (user?.role) {
      case 'SUPER_ADMIN':
        return '/super-admin/dashboard';
      case 'RESIDENT':
        return '/resident/dashboard';
      case 'COOK':
        return '/staff/kitchen';
      case 'SECURITY_GUARD':
        return '/staff/security';
      case 'HOUSEKEEPING':
        return '/staff/housekeeping';
      case 'MAINTENANCE':
        return '/staff/maintenance';
      default:
        return '/owner/dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-[#FCFBF8] text-[#18231F] flex flex-col font-sans selection:bg-[#0B4036] selection:text-white">
      {/* Impersonation Banner (if active) */}
      {isImpersonated && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 text-xs font-bold flex items-center justify-between sticky top-0 z-50 shadow-xs">
          <span>Viewing as impersonated tenant: {user?.name} ({user?.email})</span>
          <button
            onClick={exitImpersonation}
            className="px-2.5 py-0.5 bg-amber-950 text-white rounded text-[11px] hover:bg-black transition-colors"
          >
            Exit Impersonation
          </button>
        </div>
      )}

      {/* ========================================================
          SHARED HEADER
         ======================================================== */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#DDE2DD] shadow-2xs h-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-3">
          {/* Left: Mobile Menu + Logo + Context */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-[#68736D] hover:text-[#0B4036] hover:bg-[#EAF2EE] transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link to={getRootDashboard()} className="flex items-center shrink-0">
              <UrbanNestLogo variant="full" size="sm" />
            </Link>

            <div className="hidden sm:block h-5 w-px bg-[#DDE2DD]" />

            <div className="hidden sm:flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border tracking-tight ${roleBadge.color}`}>
                {roleBadge.label}
              </span>
            </div>
          </div>

          {/* Center / Right: Property Switcher + Emergency SOS + Notifications + User Menu */}
          <div className="flex items-center gap-2.5">
            {/* Property Switcher (Owner/Manager/Staff) */}
            {activeProperty && (
              <div className="relative" ref={propDropdownRef}>
                {['OWNER', 'MANAGER', 'SUPER_ADMIN'].includes(user?.role || '') && propertiesList.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setPropertyDropdownOpen(!propertyDropdownOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F8F7F3] border border-[#DDE2DD] hover:border-[#0B4036]/40 text-xs font-semibold text-[#18231F] transition-all shadow-2xs"
                  >
                    <Building2 className="w-3.5 h-3.5 text-[#0B4036]" />
                    <span className="truncate max-w-[130px] sm:max-w-[180px]">{activeProperty.name}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-[#8A928D]" />
                  </button>
                ) : (
                  <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F8F7F3] border border-[#DDE2DD] text-xs font-semibold text-[#18231F]">
                    <Building2 className="w-3.5 h-3.5 text-[#0B4036]" />
                    <span className="truncate max-w-[180px]">{activeProperty.name}</span>
                  </div>
                )}

                {propertyDropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-64 bg-white border border-[#DDE2DD] rounded-xl shadow-lg z-50 py-1.5 overflow-hidden animate-slide-up">
                    <p className="px-3 py-1.5 text-[10px] font-bold text-[#8A928D] uppercase tracking-wider">
                      Select Property Enclave
                    </p>
                    {propertiesList.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setActiveProperty(p);
                          setPropertyDropdownOpen(false);
                          toast.success(`Switched active property to ${p.name}`);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#F8F7F3] transition-colors ${
                          activeProperty.id === p.id ? 'font-bold text-[#0B4036] bg-[#EAF2EE]/50' : 'text-[#68736D]'
                        }`}
                      >
                        <span className="truncate">{p.name}</span>
                        {activeProperty.id === p.id && <span className="w-1.5 h-1.5 rounded-full bg-[#0B4036]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Emergency SOS Quick Trigger Button (Resident, Security, Owner) */}
            {['RESIDENT', 'SECURITY_GUARD', 'OWNER', 'MANAGER'].includes(user?.role || '') && (
              <button
                type="button"
                onClick={() => setSosModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold shadow-xs transition-colors shrink-0"
                title="Trigger Emergency SOS"
              >
                <Siren className="w-3.5 h-3.5 animate-pulse" />
                <span className="hidden sm:inline">SOS</span>
              </button>
            )}

            {/* In-App Notifications Center */}
            <NotificationCenter />

            {/* User Profile Menu */}
            <div className="relative pl-1 border-l border-[#DDE2DD]" ref={userDropdownRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-[#F8F7F3] transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#0B4036] text-white flex items-center justify-center font-bold text-xs uppercase shadow-2xs">
                  {user?.name?.[0] || 'U'}
                </div>
                <div className="hidden lg:block text-left text-xs">
                  <p className="font-bold text-[#18231F] leading-tight truncate max-w-[120px]">{user?.name}</p>
                  <p className="text-[10px] text-[#8A928D] font-mono truncate max-w-[120px]">{user?.role}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#8A928D] hidden lg:block" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-56 bg-white border border-[#DDE2DD] rounded-xl shadow-lg z-50 py-1.5 overflow-hidden animate-slide-up divide-y divide-slate-100">
                  <div className="px-3.5 py-2.5">
                    <p className="text-xs font-bold text-[#18231F] truncate">{user?.name}</p>
                    <p className="text-[11px] text-[#8A928D] truncate">{user?.email}</p>
                    <span className="mt-1.5 inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-[#FAF5EB] text-[#B9954E] border border-[#C8A45D]/30">
                      {roleBadge.label}
                    </span>
                  </div>

                  <div className="py-1">
                    {user?.role === 'RESIDENT' && (
                      <Link
                        to="/resident/profile"
                        className="w-full text-left px-3.5 py-2 text-xs text-[#68736D] hover:text-[#0B4036] hover:bg-[#F8F7F3] flex items-center gap-2"
                      >
                        <User className="w-3.5 h-3.5" /> My Profile & KYC
                      </Link>
                    )}
                    {['OWNER', 'MANAGER'].includes(user?.role || '') && (
                      <Link
                        to="/owner/settings"
                        className="w-full text-left px-3.5 py-2 text-xs text-[#68736D] hover:text-[#0B4036] hover:bg-[#F8F7F3] flex items-center gap-2"
                      >
                        <Settings className="w-3.5 h-3.5" /> PG Settings
                      </Link>
                    )}
                    {user?.role === 'SUPER_ADMIN' && (
                      <Link
                        to="/super-admin/settings"
                        className="w-full text-left px-3.5 py-2 text-xs text-[#68736D] hover:text-[#0B4036] hover:bg-[#F8F7F3] flex items-center gap-2"
                      >
                        <Settings className="w-3.5 h-3.5" /> Platform Settings
                      </Link>
                    )}
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================
          BODY: SIDEBAR + MAIN CONTENT AREA
         ======================================================== */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop Sidebar Navigation */}
        {navGroups.length > 0 && (
          <aside className="hidden lg:block w-64 shrink-0 border-r border-[#DDE2DD] bg-white py-6 px-3.5">
            <div className="space-y-6 sticky top-24">
              {navGroups.map((group, gIdx) => (
                <div key={gIdx} className="space-y-1">
                  <h3 className="px-3 text-[10px] font-bold text-[#8A928D] uppercase tracking-wider">
                    {group.groupName}
                  </h3>
                  <nav className="space-y-0.5 pt-1">
                    {group.items.map((item, iIdx) => {
                      const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                      const Icon = item.icon;
                      return (
                        <Link
                          key={iIdx}
                          to={item.path}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                            isActive
                              ? 'bg-[#0B4036] text-white shadow-xs'
                              : 'text-[#68736D] hover:bg-[#EAF2EE] hover:text-[#0B4036]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#C8A45D]' : 'text-[#8A928D]'}`} />
                            <span className="truncate">{item.label}</span>
                          </div>
                          {item.badge && (
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              ))}
            </div>
          </aside>
        )}

        {/* Main Content Viewport */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* ========================================================
          MOBILE NAVIGATION DRAWER
         ======================================================== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="fixed inset-y-0 left-0 w-72 bg-white border-r border-[#DDE2DD] shadow-xl p-4 flex flex-col justify-between overflow-y-auto animate-slide-up">
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#DDE2DD]">
                <UrbanNestLogo variant="full" size="sm" />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-md text-[#8A928D] hover:text-[#18231F]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User snippet */}
              <div className="p-3 rounded-xl bg-[#F8F7F3] border border-[#DDE2DD]">
                <p className="text-xs font-bold text-[#18231F] truncate">{user?.name}</p>
                <p className="text-[11px] text-[#8A928D] truncate">{user?.email}</p>
                <span className={`mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${roleBadge.color}`}>
                  {roleBadge.label}
                </span>
              </div>

              {/* Mobile Role Navigation */}
              <div className="space-y-5">
                {navGroups.map((group, gIdx) => (
                  <div key={gIdx} className="space-y-1">
                    <h3 className="px-2 text-[10px] font-bold text-[#8A928D] uppercase tracking-wider">
                      {group.groupName}
                    </h3>
                    <div className="space-y-1 pt-1">
                      {group.items.map((item, iIdx) => {
                        const isActive = location.pathname === item.path;
                        const Icon = item.icon;
                        return (
                          <Link
                            key={iIdx}
                            to={item.path}
                            onClick={() => setMobileMenuOpen(false)}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold ${
                              isActive
                                ? 'bg-[#0B4036] text-white'
                                : 'text-[#68736D] hover:bg-[#EAF2EE] hover:text-[#0B4036]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <Icon className="w-4 h-4 shrink-0" />
                              <span>{item.label}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-[#DDE2DD]">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-rose-50 text-rose-600 text-xs font-bold hover:bg-rose-100 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          EMERGENCY SOS CONFIRMATION MODAL
         ======================================================== */}
      <Modal
        isOpen={sosModalOpen}
        onClose={() => setSosModalOpen(false)}
        title="Trigger Emergency SOS Alarm"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
            <Siren className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider">High-Priority Alert</h4>
              <p className="mt-1 text-xs text-rose-700 leading-relaxed">
                Triggering SOS broadcasts an instantaneous emergency dispatch alarm to Property Managers, Wardens, and the Main Gate Security Guard desk with your location and identity.
              </p>
            </div>
          </div>

          <p className="text-xs text-[#68736D]">
            Are you sure you want to broadcast this emergency alert? For immediate medical or fire emergencies, please also dial emergency services (112).
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#DDE2DD]">
            <Button variant="outline" size="sm" onClick={() => setSosModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmSOS}
              isLoading={isTriggeringSOS}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              Confirm & Broadcast SOS
            </Button>
          </div>
        </div>
      </Modal>

      {/* Footer */}
      <footer className="bg-white border-t border-[#DDE2DD] py-3 text-center text-xs text-[#8A928D]">
        Urban Nest PG Management Platform • Unified Enterprise Operations
      </footer>
    </div>
  );
};
