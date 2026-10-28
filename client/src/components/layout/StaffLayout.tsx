import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Shield, Utensils, Sparkles, User, Building2, Wrench } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UrbanNestLogo } from '../ui/UrbanNestLogo';
import { Button } from '../ui/Button';

export const StaffLayout: React.FC<{
  children: React.ReactNode;
  portalTitle?: string;
  badgeText?: string;
}> = ({ children, portalTitle = 'Staff Portal', badgeText }) => {
  const { user, logout, activeProperty } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getRoleBadge = () => {
    switch (user?.role) {
      case 'COOK':
        return { label: 'Head Chef / Cook', icon: Utensils, color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'SECURITY_GUARD':
        return { label: 'Security & Gate Guard', icon: Shield, color: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'HOUSEKEEPING':
        return { label: 'Housekeeping Specialist', icon: Sparkles, color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'MAINTENANCE':
        return { label: 'Maintenance Specialist', icon: Wrench, color: 'bg-orange-100 text-orange-800 border-orange-200' };
      default:
        return { label: badgeText || 'Property Staff', icon: User, color: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  const badge = getRoleBadge();
  const IconComponent = badge.icon;

  return (
    <div className="min-h-screen bg-[#FCFBF8] text-[#18231F] flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#DDE2DD] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Portal Identity */}
          <div className="flex items-center gap-4">
            <UrbanNestLogo variant="full" size="md" />
            <div className="hidden sm:block h-5 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#0B4036] tracking-tight">{portalTitle}</span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.color}`}>
                <IconComponent className="w-3 h-3" />
                {badge.label}
              </span>
            </div>
          </div>

          {/* Right Property & User Controls */}
          <div className="flex items-center gap-3">
            {activeProperty && (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#F8F7F3] border border-[#DDE2DD] text-xs font-medium text-slate-700">
                <Building2 className="w-3.5 h-3.5 text-[#0B4036]" />
                <span className="truncate max-w-[180px]">{activeProperty.name}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-[#0B4036] text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                {user?.name?.[0] || 'S'}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-bold text-slate-800 leading-tight">{user?.name}</p>
                <p className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]">{user?.email}</p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-slate-500 hover:text-red-600 hover:bg-red-50 p-2 ml-1"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#DDE2DD] py-4 text-center text-xs text-slate-400">
        Urban Nest PG SaaS Platform • Enterprise Staff Operations Console
      </footer>
    </div>
  );
};
