import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Sliders,
  TrendingUp,
  BarChart3,
  HelpCircle,
  ShieldAlert,
  Activity,
  Settings,
  LogOut,
  Search,
  Bell,
  Sparkles,
  ChevronDown,
  ExternalLink,
  ShieldCheck,
  Menu,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';

export const SuperAdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, isImpersonated, impersonatedBy, exitImpersonation } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const navSections = [
    {
      title: 'PLATFORM OVERVIEW',
      items: [
        { name: 'Dashboard', path: '/super-admin/dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'TENANT MANAGEMENT',
      items: [
        { name: 'PG Tenants', path: '/super-admin/tenants', icon: Building2 },
        { name: 'PG Owners', path: '/super-admin/owners', icon: Users },
      ],
    },
    {
      title: 'MONETIZATION & SAAS',
      items: [
        { name: 'Subscriptions', path: '/super-admin/subscriptions', icon: CreditCard },
        { name: 'SaaS Plans', path: '/super-admin/plans', icon: Sliders },
        { name: 'Revenue Analytics', path: '/super-admin/revenue', icon: TrendingUp },
        { name: 'Resource Usage', path: '/super-admin/usage', icon: BarChart3 },
      ],
    },
    {
      title: 'GOVERNANCE & OPS',
      items: [
        { name: 'Support Inquiries', path: '/super-admin/support', icon: HelpCircle },
        { name: 'Platform Audit Logs', path: '/super-admin/audit-logs', icon: ShieldAlert },
        { name: 'System Health', path: '/super-admin/system-health', icon: Activity },
        { name: 'Platform Settings', path: '/super-admin/settings', icon: Settings },
      ],
    },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/super-admin/tenants?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#FCFBF8] text-[#18231F] flex flex-col font-sans">
      {/* Impersonation Warning Banner */}
      {isImpersonated && (
        <div className="bg-amber-600 text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-md z-50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-200" />
            <span>
              Impersonation Active: Viewing tenant as <strong>{user?.name}</strong> ({user?.email}). Authorized by {impersonatedBy || 'Super Admin'}.
            </span>
          </div>
          <button
            onClick={exitImpersonation}
            className="px-3 py-1 bg-white text-amber-900 rounded-lg font-bold text-xs hover:bg-amber-100 transition-colors"
          >
            Exit Impersonation
          </button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col w-64 bg-[#0B4036] text-white border-r border-[#0B4036]/40 shrink-0">
          {/* Brand Logo & SaaS Badge */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#C8A45D] text-[#0B4036] flex items-center justify-center font-bold text-base shadow-sm">
                UN
              </div>
              <div>
                <span className="font-extrabold text-sm tracking-wider uppercase text-white">Urban Nest</span>
                <span className="block text-[10px] text-[#C8A45D] font-mono uppercase tracking-widest font-semibold">
                  SaaS Super Admin
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
            {navSections.map((section, sIdx) => (
              <div key={sIdx} className="space-y-1">
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-white/40">
                  {section.title}
                </p>
                {section.items.map((item, iIdx) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path || (item.path !== '/super-admin/dashboard' && location.pathname.startsWith(item.path));
                  return (
                    <NavLink
                      key={iIdx}
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-[#C8A45D] text-[#0B4036] shadow-sm font-bold'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#0B4036]' : 'text-white/70'}`} />
                      <span>{item.name}</span>
                    </NavLink>
                  );
                })}
              </div>
            ))}
          </div>

          {/* User Profile & Logout Footer */}
          <div className="p-4 border-t border-white/10 bg-black/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#C8A45D]/20 text-[#C8A45D] border border-[#C8A45D]/40 flex items-center justify-center font-bold text-xs shrink-0">
                SA
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{user?.name || 'Super Admin'}</p>
                <p className="text-[10px] text-white/50 truncate">Platform Operator</p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="p-1.5 text-white/60 hover:text-rose-400 hover:bg-white/5 rounded-lg transition-colors"
              title="Sign Out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)} />
            <div className="relative w-64 max-w-[80%] bg-[#0B4036] text-white flex flex-col z-10 shadow-2xl">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <span className="font-bold text-sm tracking-wider uppercase">Urban Nest Super Admin</span>
                <button onClick={() => setMobileMenuOpen(false)} className="text-white/70 hover:text-white" aria-label="Close menu">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
                {navSections.map((section, sIdx) => (
                  <div key={sIdx} className="space-y-1">
                    <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-white/40">{section.title}</p>
                    {section.items.map((item, iIdx) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      return (
                        <NavLink
                          key={iIdx}
                          to={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold ${
                            isActive ? 'bg-[#C8A45D] text-[#0B4036] font-bold' : 'text-white/80 hover:bg-white/10'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.name}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Top Bar Header */}
          <header className="sticky top-0 z-30 bg-[#FCFBF8]/90 backdrop-blur-md border-b border-[#DDE2DD] px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 lg:hidden rounded-lg hover:bg-slate-100 text-[#18231F]"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <form onSubmit={handleSearchSubmit} className="relative hidden sm:block w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A928D]" />
                <input
                  type="text"
                  placeholder="Search PG tenants, owners, cities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#DDE2DD] bg-white text-[#18231F] focus:outline-none focus:ring-1 focus:ring-[#0B4036]"
                />
              </form>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EAF2EE] border border-[#0B4036]/20 text-[11px] font-bold text-[#0B4036]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0B4036]" />
                <span>Super Admin Verified</span>
              </div>

              <button
                onClick={() => navigate('/super-admin/system-health')}
                className="p-2 text-[#68736D] hover:text-[#0B4036] hover:bg-[#EAF2EE] rounded-lg transition-colors"
                title="System Health"
                aria-label="System Health"
              >
                <Activity className="w-4 h-4" />
              </button>

              <button
                onClick={() => logout()}
                className="px-3 py-1.5 rounded-lg border border-[#DDE2DD] bg-white text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
