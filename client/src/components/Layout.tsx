import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  LayoutDashboard, 
  Users, 
  Home, 
  CreditCard, 
  CalendarDays, 
  Wrench, 
  Bell, 
  Receipt, 
  FileSpreadsheet, 
  UserCheck, 
  PackageSearch, 
  UserCog, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Sun, 
  Moon, 
  Building2,
  ChevronDown
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, properties, activeProperty, switchProperty, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Helper for mock property mapping
  const getMockPropertyId = (obj: any) => {
    if (obj.propertyId) return obj.propertyId;
    const memberName = obj.member?.fullName || obj.hostMember || '';
    if (memberName.includes('Sneha') || memberName.includes('Riya') || memberName.includes('Noida') || (obj.desc && obj.desc.includes('Noida'))) {
      return '71c32f62-6821-4613-976e-d6d020d2cbcd'; // Noida ID
    }
    return 'c9284cdd-f556-4d74-af01-611da1397c0d'; // Gurgaon ID
  };

  // Helper to format relative time
  const formatRelativeTime = (dateInput: any) => {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const loadAlerts = async () => {
    const token = localStorage.getItem('token');
    const propId = activeProperty?.id;
    let rawAlerts: any[] = [];

    try {
      const url = propId 
        ? `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/alerts?propertyId=${propId}` 
        : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/alerts`;
      
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        rawAlerts = await res.json();
      } else {
        throw new Error('API failed');
      }
    } catch (err) {
      console.warn('Backend alerts API failed. Assembling local storage alerts.');
      const savedPay = localStorage.getItem('mock_payments');
      const savedIssues = localStorage.getItem('mock_issues');
      const savedVisitors = localStorage.getItem('mock_visitors');

      const payments = savedPay ? JSON.parse(savedPay) : [];
      const issues = savedIssues ? JSON.parse(savedIssues) : [];
      const visitors = savedVisitors ? JSON.parse(savedVisitors) : [];

      const mockAlerts: any[] = [];

      payments.forEach((p: any) => {
        let title = '';
        let desc = '';
        let timeVal = p.createdAt;
        if (p.status === 'PAID') {
          title = 'Rent Collected';
          desc = `Rent of ₹${p.amount.toLocaleString()} collected from ${p.member?.fullName || 'Resident'} (${p.period}).`;
          timeVal = p.paidDate || p.createdAt;
        } else if (p.status === 'APPROVAL_PENDING') {
          title = 'Verification Required';
          desc = `${p.member?.fullName || 'Resident'} submitted ₹${p.amount.toLocaleString()} online payment reference.`;
        } else {
          title = 'Rent Due Pending';
          desc = `Rent of ₹${p.amount.toLocaleString()} is pending for ${p.member?.fullName || 'Resident'} (${p.period}).`;
        }
        mockAlerts.push({
          id: `pay-${p.id}`,
          type: 'payment',
          title,
          desc,
          time: timeVal,
          createdAt: timeVal,
          propertyId: getMockPropertyId(p)
        });
      });

      issues.forEach((i: any) => {
        if (i.status === 'OPEN' || i.status === 'IN_PROGRESS') {
          mockAlerts.push({
            id: `issue-${i.id}`,
            type: 'issue',
            title: `Complaint: ${i.title}`,
            desc: `Maintenance issue reported by ${i.member?.fullName || 'Resident'}: "${i.description.substring(0, 50)}..."`,
            time: i.createdAt,
            createdAt: i.createdAt,
            propertyId: getMockPropertyId(i)
          });
        }
      });

      visitors.forEach((v: any) => {
        if (!v.checkOutTime) {
          mockAlerts.push({
            id: `visitor-${v.id}`,
            type: 'visitor',
            title: 'Active Visitor Checked-In',
            desc: `${v.fullName} is visiting ${v.hostMember || 'resident'} (Purpose: ${v.purpose}).`,
            time: v.checkInTime,
            createdAt: v.checkInTime,
            propertyId: getMockPropertyId(v)
          });
        }
      });

      rawAlerts = propId 
        ? mockAlerts.filter(a => a.propertyId === propId)
        : mockAlerts;
    }

    // Sort chronologically
    rawAlerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const savedReadIds = localStorage.getItem('read_alerts') 
      ? JSON.parse(localStorage.getItem('read_alerts')!) 
      : [];

    const processed = rawAlerts.map(alert => ({
      ...alert,
      read: savedReadIds.includes(alert.id),
      timeAgo: formatRelativeTime(alert.time)
    }));

    setNotifications(processed);
    setUnreadCount(processed.filter(a => !a.read).length);
  };

  useEffect(() => {
    if (user) {
      loadAlerts();
      const interval = setInterval(loadAlerts, 10000); // refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [activeProperty, user]);

  const handleMarkAllRead = () => {
    const savedReadIds = localStorage.getItem('read_alerts') 
      ? JSON.parse(localStorage.getItem('read_alerts')!) 
      : [];
    const newReadIds = Array.from(new Set([...savedReadIds, ...notifications.map(n => n.id)]));
    localStorage.setItem('read_alerts', JSON.stringify(newReadIds));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  if (!user) return <>{children}</>;

  // Scoped navigation depending on User Role
  const allNavItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER', 'RECEPTIONIST', 'ACCOUNTANT', 'MAINTENANCE'] },
    { name: 'Members', path: '/members', icon: Users, roles: ['OWNER', 'MANAGER', 'RECEPTIONIST'] },
    { name: 'Rooms', path: '/rooms', icon: Home, roles: ['OWNER', 'MANAGER', 'RECEPTIONIST', 'MAINTENANCE'] },
    { name: 'Payments', path: '/payments', icon: CreditCard, roles: ['OWNER', 'MANAGER', 'ACCOUNTANT'] },
    { name: 'Bookings', path: '/bookings', icon: CalendarDays, roles: ['OWNER', 'MANAGER', 'RECEPTIONIST'] },
    { name: 'Maintenance', path: '/maintenance', icon: Wrench, roles: ['OWNER', 'MANAGER', 'MAINTENANCE', 'RECEPTIONIST'] },
    { name: 'Notice Board', path: '/notices', icon: Bell, roles: ['OWNER', 'MANAGER', 'RECEPTIONIST'] },
    { name: 'Expenses', path: '/expenses', icon: Receipt, roles: ['OWNER', 'MANAGER', 'ACCOUNTANT'] },
    { name: 'Visitors', path: '/visitors', icon: UserCheck, roles: ['OWNER', 'MANAGER', 'RECEPTIONIST'] },
    { name: 'Inventory', path: '/inventory', icon: PackageSearch, roles: ['OWNER', 'MANAGER', 'MAINTENANCE'] },
    { name: 'Staff Management', path: '/staff', icon: UserCog, roles: ['OWNER', 'SUPER_ADMIN'] },
    { name: 'Reports', path: '/reports', icon: FileSpreadsheet, roles: ['OWNER', 'MANAGER', 'ACCOUNTANT'] },
    { name: 'Settings', path: '/settings', icon: Settings, roles: ['OWNER'] },
  ];

  const filteredNavItems = allNavItems.filter(item => item.roles.includes(user.role));

  const handleNavClick = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f3f4f9] dark:bg-[#080913] text-[#222530] dark:text-[#f3f4f9] transition-colors duration-300">
      
      {/* 1. SIDEBAR (DESKTOP) */}
      <aside className={`hidden md:flex flex-col glass-panel border-r border-[#e0e3eb]/50 dark:border-white/5 transition-all duration-300 shrink-0 ${
        isSidebarCollapsed ? 'w-20' : 'w-64'
      }`}>
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#e0e3eb]/50 dark:border-white/5">
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-2">
              <a
                href="https://urbann-nest.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent font-sans hover:opacity-80 transition-all"
              >
                Urban Nest
              </a>
              <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px] uppercase font-bold">
                SaaS
              </span>
            </div>
          )}
          {isSidebarCollapsed && (
            <a
              href="https://urbann-nest.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xl font-black mx-auto bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent font-sans hover:opacity-80 transition-all"
            >
              UN
            </a>
          )}
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-500/10 transition-colors"
          >
            <Menu size={18} />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                onClick={() => handleNavClick(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all relative group ${
                  isActive 
                    ? 'bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-blue-500/10 text-purple-600 dark:text-purple-400 shadow-sm border border-purple-500/20' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-500/5 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-purple-500' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-300'} />
                {!isSidebarCollapsed && <span>{item.name}</span>}
                {isActive && (
                  <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-gradient-to-b from-pink-500 to-purple-500 rounded-r-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* User profile footer */}
        <div className="p-3 border-t border-[#e0e3eb]/50 dark:border-white/5">
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-500/5 border border-slate-500/5">
            {!isSidebarCollapsed && (
              <div className="truncate">
                <p className="text-xs font-bold truncate">{user.name}</p>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">{user.role}</p>
              </div>
            )}
            <button 
              onClick={logout}
              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-4 md:px-6 glass-card border-b border-[#e0e3eb]/40 dark:border-white/5 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile Sidebar toggle button */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white"
            >
              <Menu size={20} />
            </button>

            {/* Branch Switcher (only for Owner/Super Admin or managers with multiple branch context) */}
            {user.role === 'OWNER' || user.role === 'SUPER_ADMIN' ? (
              <div className="relative">
                <button
                  onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/70 dark:bg-black/20 border border-[#e0e3eb] dark:border-white/5 text-xs font-medium hover:border-purple-500/30 transition-all shadow-sm"
                >
                  <Building2 size={14} className="text-purple-500" />
                  <span className="max-w-[150px] truncate">{activeProperty ? activeProperty.name : 'Select PG Branch'}</span>
                  <ChevronDown size={12} className="text-slate-400" />
                </button>
                {isBranchDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-64 rounded-2xl glass-card border border-[#e0e3eb]/60 dark:border-white/5 shadow-lg overflow-hidden py-1.5 animate-slide-up z-50">
                    <p className="text-[10px] font-bold text-slate-400 uppercase px-3 py-1 border-b border-[#e0e3eb]/40 dark:border-white/5 mb-1">Switch PG Branch</p>
                    {properties.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          switchProperty(p.id);
                          setIsBranchDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-300 transition-colors flex items-center justify-between ${
                          activeProperty?.id === p.id ? 'text-purple-600 dark:text-purple-400 bg-purple-500/5' : ''
                        }`}
                      >
                        <span className="truncate">{p.name}</span>
                        {activeProperty?.id === p.id && <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />}
                      </button>
                    ))}
                    {user.role === 'OWNER' && (
                      <button 
                        onClick={() => {
                          setIsBranchDropdownOpen(false);
                          navigate('/settings');
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-purple-500 hover:bg-slate-500/10 border-t border-[#e0e3eb]/40 dark:border-white/5 mt-1"
                      >
                        + Configure PG Branches
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                <Building2 size={13} />
                <span>{activeProperty?.name || 'Urban Nest'}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle (Light/Dark) */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-white/70 dark:bg-black/20 border border-[#e0e3eb] dark:border-white/5 hover:border-purple-500/20 text-slate-500 dark:text-slate-400 transition-all shadow-sm"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Notification Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="p-2 rounded-xl bg-white/70 dark:bg-black/20 border border-[#e0e3eb] dark:border-white/5 hover:border-purple-500/20 text-slate-500 dark:text-slate-400 transition-all shadow-sm relative"
                title="Notifications"
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-pink-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
                )}
              </button>

              {isNotificationOpen && (
                <div className="absolute right-0 mt-3 w-80 rounded-[24px] glass-panel border border-[#e0e3eb]/60 dark:border-white/5 shadow-2xl overflow-hidden py-1.5 animate-slide-up z-50 text-xs font-semibold">
                  
                  {/* Header */}
                  <div className="flex justify-between items-center px-4 py-2 border-b border-[#e0e3eb]/40 dark:border-white/5 bg-slate-500/5">
                    <span className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-[10px]">Announcements & Alerts</span>
                    {unreadCount > 0 && (
                      <button 
                        onClick={handleMarkAllRead}
                        className="text-[9px] font-bold text-purple-500 hover:text-purple-600 transition-colors uppercase"
                      >
                        Clear Badge
                      </button>
                    )}
                  </div>

                  {/* Notification List */}
                  <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-500/5">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        No active alerts
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div 
                          key={n.id} 
                          className={`p-3 hover:bg-slate-500/5 transition-all text-left space-y-1 relative ${
                            !n.read ? 'bg-purple-500/[0.02]' : ''
                          }`}
                        >
                          {!n.read && (
                            <div className="absolute top-3.5 right-3 w-1.5 h-1.5 rounded-full bg-pink-500" />
                          )}
                          <div className="flex justify-between pr-4">
                            <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-[11px]">{n.title}</h4>
                            <span className="text-[9px] text-slate-400 font-mono">{n.timeAgo || n.time}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-semibold leading-relaxed pr-2">{n.desc}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer link to notices page */}
                  <button 
                    onClick={() => {
                      setIsNotificationOpen(false);
                      navigate('/notices');
                    }}
                    className="w-full text-center py-2 text-[10px] font-black text-purple-500 hover:text-purple-600 border-t border-[#e0e3eb]/40 dark:border-white/5 mt-1 bg-slate-500/5 uppercase tracking-wide"
                  >
                    View Notice Board
                  </button>

                </div>
              )}
            </div>

            {/* User Name Badge */}
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-500/10">
              <div className="text-right">
                <p className="text-xs font-bold">{user.name.split(' ')[0]}</p>
                <p className="text-[9px] text-purple-500 uppercase font-black">{user.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area Scrollable */}
        <main className="flex-grow p-4 md:p-6 overflow-y-auto pb-24 md:pb-6">
          {children}
        </main>
      </div>

      {/* 3. MOBILE MENU SIDEBAR (OVERLAY Drawer) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden flex justify-end">
          <div className="w-64 glass-panel h-full flex flex-col border-l border-white/10 p-4 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <span className="text-lg font-black bg-gradient-to-r from-pink-500 to-blue-500 bg-clip-text text-transparent">Menu</span>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-lg text-slate-400"
              >
                <X size={18} />
              </button>
            </div>
            
            <nav className="flex-1 space-y-1.5 overflow-y-auto">
              {filteredNavItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    onClick={() => handleNavClick(item.path)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-xs transition-all ${
                      isActive 
                        ? 'bg-purple-500/10 text-purple-500 shadow-sm border border-purple-500/20' 
                        : 'text-slate-400 hover:bg-slate-500/5'
                    }`}
                  >
                    <Icon size={16} />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </nav>

            <button 
              onClick={logout}
              className="mt-auto w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors text-xs font-bold"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. MOBILE BOTTOM TAB NAVIGATION BAR (PWA Native feel) */}
      <div className="fixed bottom-0 left-0 right-0 h-16 md:hidden glass-card border-t border-[#e0e3eb]/50 dark:border-white/5 flex justify-around items-center px-2 py-1 z-40 shadow-xl">
        <button 
          onClick={() => navigate('/dashboard')}
          className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all ${
            location.pathname === '/dashboard' ? 'text-purple-500 bg-purple-500/5' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard size={18} />
          <span className="text-[9px] mt-0.5 font-medium">Home</span>
        </button>
        
        {user.role !== 'ACCOUNTANT' && user.role !== 'MAINTENANCE' && (
          <button 
            onClick={() => navigate('/members')}
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all ${
              location.pathname === '/members' ? 'text-purple-500 bg-purple-500/5' : 'text-slate-400'
            }`}
          >
            <Users size={18} />
            <span className="text-[9px] mt-0.5 font-medium">Residents</span>
          </button>
        )}

        {user.role !== 'ACCOUNTANT' && (
          <button 
            onClick={() => navigate('/rooms')}
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all ${
              location.pathname === '/rooms' ? 'text-purple-500 bg-purple-500/5' : 'text-slate-400'
            }`}
          >
            <Home size={18} />
            <span className="text-[9px] mt-0.5 font-medium">Rooms</span>
          </button>
        )}

        {user.role !== 'RECEPTIONIST' && user.role !== 'MAINTENANCE' && (
          <button 
            onClick={() => navigate('/payments')}
            className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all ${
              location.pathname === '/payments' ? 'text-purple-500 bg-purple-500/5' : 'text-slate-400'
            }`}
          >
            <CreditCard size={18} />
            <span className="text-[9px] mt-0.5 font-medium">Rent</span>
          </button>
        )}

        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center w-12 h-12 rounded-xl text-slate-400"
        >
          <Menu size={18} />
          <span className="text-[9px] mt-0.5 font-medium">More</span>
        </button>
      </div>

    </div>
  );
};
