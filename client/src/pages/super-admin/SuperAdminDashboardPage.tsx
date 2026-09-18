import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  CreditCard,
  BedDouble,
  DoorClosed,
  TrendingUp,
  ShieldCheck,
  Activity,
  Plus,
  ArrowUpRight,
  RefreshCw,
  AlertTriangle,
  Clock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { superAdminApi } from '../../services/superAdminApi';
import type { SuperAdminDashboardData } from '../../services/superAdminApi';
import { useToast } from '../../context/ToastContext';

export const SuperAdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState<SuperAdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await superAdminApi.getDashboard();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load super admin stats:', err);
      setError(err.message || 'Unable to connect to server. Please verify database connection.');
      toast.error('Failed to fetch platform metrics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-slate-200 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-[#DDE2DD] space-y-4 max-w-lg mx-auto mt-10">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-[#18231F]">Platform Metrics Unavailable</h3>
        <p className="text-xs text-[#68736D]">{error || 'Service temporarily unavailable. Please try again.'}</p>
        <Button variant="primary" size="sm" onClick={fetchStats} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
          Retry Connection
        </Button>
      </div>
    );
  }

  const { overview, tenantsByPlan, recentActivity, systemHealth } = data;

  const kpiCards = [
    {
      title: 'Total PG Tenants',
      value: overview.totalTenants,
      subtext: `${overview.activeTenants} Active • ${overview.trialTenants} Trial • ${overview.suspendedTenants} Suspended`,
      icon: Building2,
      color: 'text-[#0B4036] bg-[#EAF2EE]',
      link: '/super-admin/tenants',
    },
    {
      title: 'Monthly SaaS Revenue',
      value: `₹${(overview.monthlySaaSRevenue || 0).toLocaleString('en-IN')}`,
      subtext: 'Calculated from active plan subscriptions',
      icon: TrendingUp,
      color: 'text-[#C8A45D] bg-[#FAF5EB]',
      link: '/super-admin/revenue',
    },
    {
      title: 'Total PG Branches',
      value: overview.totalProperties,
      subtext: `${overview.totalRooms} Rooms • ${overview.totalBeds} Beds`,
      icon: DoorClosed,
      color: 'text-blue-700 bg-blue-50',
      link: '/super-admin/tenants',
    },
    {
      title: 'Platform Occupancy',
      value: `${overview.occupancyRate}%`,
      subtext: `${overview.occupiedBeds} of ${overview.totalBeds} Beds Filled`,
      icon: BedDouble,
      color: 'text-emerald-700 bg-emerald-50',
      link: '/super-admin/usage',
    },
    {
      title: 'Registered PG Owners',
      value: overview.totalOwners,
      subtext: 'Primary business administrators',
      icon: Users,
      color: 'text-purple-700 bg-purple-50',
      link: '/super-admin/owners',
    },
    {
      title: 'Active Residents',
      value: overview.totalResidents,
      subtext: 'Managed across all PG branches',
      icon: Users,
      color: 'text-teal-700 bg-teal-50',
      link: '/super-admin/usage',
    },
    {
      title: 'Operational Staff',
      value: overview.totalStaff,
      subtext: 'Wardens, security, maintenance techs',
      icon: ShieldCheck,
      color: 'text-amber-700 bg-amber-50',
      link: '/super-admin/tenants',
    },
    {
      title: 'System Health Status',
      value: systemHealth.database === 'HEALTHY' ? 'Operational' : 'Degraded',
      subtext: `DB: ${systemHealth.database} • Storage: ${systemHealth.storage}`,
      icon: Activity,
      color: systemHealth.database === 'HEALTHY' ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50',
      link: '/super-admin/system-health',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#18231F] flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#C8A45D]" />
            SaaS Multi-Tenant Control Center
          </h1>
          <p className="text-xs text-[#68736D] mt-0.5">
            Platform governance, subscription monitoring, and real-time operational metrics across all PG organizations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={fetchStats} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/super-admin/tenants')}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Create New PG
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={idx}
              className="p-5 border-[#DDE2DD] hover:shadow-md transition-all cursor-pointer group"
              onClick={() => navigate(kpi.link)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-[#68736D]">{kpi.title}</p>
                  <p className="text-xl font-bold text-[#18231F] tracking-tight">{kpi.value}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${kpi.color} shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-[#DDE2DD] flex items-center justify-between text-[11px] text-[#68736D]">
                <span>{kpi.subtext}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#8A928D] group-hover:text-[#0B4036] transition-colors" />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Subscriptions & Recent Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan Distribution */}
        <Card className="p-5 border-[#DDE2DD] space-y-4">
          <h3 className="text-sm font-bold text-[#18231F] flex items-center justify-between">
            <span>Tenants by SaaS Plan</span>
            <Button variant="ghost" size="xs" onClick={() => navigate('/super-admin/plans')}>
              Manage Plans
            </Button>
          </h3>

          <div className="space-y-3">
            {tenantsByPlan.length === 0 ? (
              <p className="text-xs text-[#68736D] text-center py-4">No tenant subscription data</p>
            ) : (
              tenantsByPlan.map((tp, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-[#F8F7F3] border border-[#DDE2DD] text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0B4036]" />
                    <span className="font-bold text-[#18231F]">{tp.plan}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#0B4036]">{tp._count.id} PG Tenants</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 rounded-xl bg-[#EAF2EE] border border-[#0B4036]/20 text-xs text-[#0B4036] space-y-1">
            <p className="font-bold">Subscription Automation</p>
            <p className="text-[11px] text-[#0B4036]/80">
              Tenants on Trial are automatically notified 3 days prior to expiration.
            </p>
          </div>
        </Card>

        {/* Recent Platform Activity */}
        <Card className="p-5 border-[#DDE2DD] lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#18231F] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#0B4036]" />
              Recent Platform Audit Trail
            </h3>
            <Button variant="ghost" size="xs" onClick={() => navigate('/super-admin/audit-logs')}>
              View All Logs
            </Button>
          </div>

          <div className="space-y-2.5">
            {recentActivity.length === 0 ? (
              <p className="text-xs text-[#68736D] text-center py-6">No recent platform activity logged</p>
            ) : (
              recentActivity.map((log: any) => (
                <div key={log.id} className="p-3 rounded-xl bg-[#F8F7F3] border border-[#DDE2DD] text-xs flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#18231F]">{log.action}</span>
                      {log.tenant && (
                        <span className="px-2 py-0.5 rounded-full bg-white border border-[#DDE2DD] text-[10px] text-[#0B4036] font-semibold">
                          {log.tenant.name}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#68736D]">{log.details}</p>
                    <p className="text-[10px] text-[#8A928D]">
                      Actor: {log.actorName} ({log.actorRole})
                    </p>
                  </div>
                  <span className="text-[10px] text-[#8A928D] whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SuperAdminDashboardPage;
