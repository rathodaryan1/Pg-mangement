import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  DoorClosed,
  BedDouble,
  CreditCard,
  KeyRound,
  ShieldAlert,
  ArrowLeft,
  ExternalLink,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  Sliders,
  LifeBuoy,
  History,
  Lock,
  PauseCircle,
  PlayCircle,
  Archive,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge, Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { superAdminApi } from '../../services/superAdminApi';
import type { SupportTicketItem } from '../../services/superAdminApi';
import { useToast } from '../../context/ToastContext';
import api from '../../lib/api';

type TabKey = 'overview' | 'properties' | 'users' | 'subscription' | 'support' | 'activity';

export const SuperAdminTenantDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tenant, setTenant] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscriptions & Tickets
  const [tickets, setTickets] = useState<SupportTicketItem[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // Modals
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const [subModalOpen, setSubModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('STARTER');
  const [subStatus, setSubStatus] = useState('ACTIVE');
  const [trialDaysToAdd, setTrialDaysToAdd] = useState(0);
  const [overrideProperties, setOverrideProperties] = useState(1);
  const [overrideRooms, setOverrideRooms] = useState(20);
  const [overrideResidents, setOverrideResidents] = useState(50);
  const [isUpdatingSub, setIsUpdatingSub] = useState(false);

  const fetchTenant = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await superAdminApi.getTenantById(id);
      setTenant(data);
      if (data) {
        setSelectedPlan(data.plan || 'STARTER');
        setSubStatus(data.subscriptionStatus || 'ACTIVE');
        setOverrideProperties(data.maxProperties || 1);
        setOverrideRooms(data.maxRooms || 20);
        setOverrideResidents(data.maxResidents || 50);
      }
    } catch (err: any) {
      console.error('Failed to load tenant details:', err);
      setError(err.message || 'Tenant organization not found.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTenantTickets = async () => {
    if (!id) return;
    setLoadingTickets(true);
    try {
      const res = await superAdminApi.getSupportTickets({ tenantId: id });
      setTickets(res.tickets || []);
    } catch (err) {
      console.error('Failed to load tenant tickets:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    fetchTenant();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'support') {
      fetchTenantTickets();
    }
  }, [activeTab, id]);

  const handleImpersonate = async () => {
    if (!id) return;
    try {
      const currentSuperToken = api.getToken();
      if (currentSuperToken) {
        localStorage.setItem('saas_superadmin_original_token', currentSuperToken);
      }

      const res = await superAdminApi.impersonateTenant(id);
      if (res && res.token) {
        api.setToken(res.token);
        localStorage.setItem('urbannest_user_session', JSON.stringify(res.user));
        toast.success(`Impersonating owner for "${tenant?.name || 'Tenant'}"`);
        window.location.href = '/owner/dashboard';
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to initiate impersonation.');
    }
  };

  const handleOpenResetPassword = () => {
    setNewPassword('SecurePass@' + Math.floor(1000 + Math.random() * 9000));
    setResetModalOpen(true);
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newPassword) return;
    setIsResetting(true);
    try {
      await superAdminApi.resetOwnerPassword(id, newPassword);
      toast.success(`Owner temporary password reset successfully.`);
      setResetModalOpen(false);
      fetchTenant();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleToggleSuspend = async () => {
    if (!id || !tenant) return;
    try {
      if (tenant.status === 'SUSPENDED') {
        await superAdminApi.activateTenant(id);
        toast.success(`Tenant "${tenant.name}" reactivated.`);
      } else {
        await superAdminApi.suspendTenant(id, 'Suspended by Super Admin');
        toast.success(`Tenant "${tenant.name}" suspended.`);
      }
      fetchTenant();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update tenant status.');
    }
  };

  const handleArchive = async () => {
    if (!id || !tenant) return;
    if (!window.confirm(`Are you sure you want to archive "${tenant.name}"? Active logins will be disabled.`)) {
      return;
    }
    try {
      await superAdminApi.archiveTenant(id);
      toast.success(`Tenant "${tenant.name}" archived.`);
      fetchTenant();
    } catch (err: any) {
      toast.error(err.message || 'Failed to archive tenant.');
    }
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsUpdatingSub(true);
    try {
      await superAdminApi.updateTenantSubscription(id, {
        plan: selectedPlan,
        subscriptionStatus: subStatus,
        trialDaysExtension: trialDaysToAdd > 0 ? trialDaysToAdd : undefined,
        maxProperties: overrideProperties,
        maxRooms: overrideRooms,
        maxResidents: overrideResidents,
      });
      toast.success('Subscription limits and tier updated.');
      setSubModalOpen(false);
      setTrialDaysToAdd(0);
      fetchTenant();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update subscription.');
    } finally {
      setIsUpdatingSub(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-slate-200 rounded-lg" />
        <div className="h-96 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-[#DDE2DD] space-y-4 max-w-md mx-auto mt-10">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-[#18231F]">Tenant Not Found</h3>
        <p className="text-xs text-[#68736D]">{error || 'Unable to retrieve organization profile.'}</p>
        <Button variant="secondary" size="sm" onClick={() => navigate('/super-admin/tenants')} leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
          Back to Tenants Directory
        </Button>
      </div>
    );
  }

  const owner = tenant.users?.find((u: any) => u.role === 'OWNER') || tenant.users?.[0];
  const properties = tenant.properties || [];
  const totalRooms = properties.reduce((acc: number, p: any) => acc + (p._count?.rooms || 0), 0);
  const totalResidents = properties.reduce((acc: number, p: any) => acc + (p._count?.residents || 0), 0);

  const tabs: { key: TabKey; label: string; icon: React.FC<{ className?: string }> }[] = [
    { key: 'overview', label: 'Overview & Dossier', icon: Building2 },
    { key: 'properties', label: `PG Branches (${properties.length})`, icon: DoorClosed },
    { key: 'users', label: `Users & Staff (${tenant.users?.length || 0})`, icon: Users },
    { key: 'subscription', label: 'Subscription & Limits', icon: Sliders },
    { key: 'support', label: 'Support Tickets', icon: LifeBuoy },
    { key: 'activity', label: 'Audit Trail', icon: History },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => navigate('/super-admin/tenants')} leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
            Tenants
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-[#18231F] flex items-center gap-2">
                <Building2 className="w-6 h-6 text-[#0B4036]" />
                {tenant.name}
              </h1>
              <StatusBadge status={tenant.status} />
              <Badge variant="gold">{tenant.plan} PLAN</Badge>
            </div>
            <p className="text-xs text-[#68736D] mt-0.5">
              Slug: <span className="font-mono text-[#0B4036]">{tenant.slug}</span> • ID: <span className="font-mono text-xs">{tenant.id}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleImpersonate}
            className="text-[#0B4036] border-[#0B4036]/30 hover:bg-[#EAF2EE]"
            leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
          >
            Impersonate Owner
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleOpenResetPassword}
            leftIcon={<KeyRound className="w-3.5 h-3.5 text-[#0B4036]" />}
          >
            Reset Password
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleToggleSuspend}
            className={tenant.status === 'SUSPENDED' ? 'text-emerald-700' : 'text-amber-700'}
            leftIcon={tenant.status === 'SUSPENDED' ? <PlayCircle className="w-3.5 h-3.5" /> : <PauseCircle className="w-3.5 h-3.5" />}
          >
            {tenant.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
          </Button>

          <Button variant="ghost" size="sm" onClick={fetchTenant} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[#DDE2DD] overflow-x-auto pb-px">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
                isActive
                  ? 'border-[#0B4036] text-[#0B4036] bg-[#EAF2EE]/50 font-bold'
                  : 'border-transparent text-[#68736D] hover:text-[#18231F] hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="p-4 border-[#DDE2DD] bg-[#FAF5EB]">
                <p className="text-[10px] uppercase font-bold text-[#8A928D]">PG Branches</p>
                <p className="text-xl font-bold text-[#18231F] mt-1">
                  {properties.length} <span className="text-xs font-normal text-[#68736D]">/ {tenant.maxProperties}</span>
                </p>
              </Card>

              <Card className="p-4 border-[#DDE2DD] bg-[#EAF2EE]">
                <p className="text-[10px] uppercase font-bold text-[#8A928D]">Total Rooms</p>
                <p className="text-xl font-bold text-[#18231F] mt-1">
                  {totalRooms} <span className="text-xs font-normal text-[#68736D]">/ {tenant.maxRooms}</span>
                </p>
              </Card>

              <Card className="p-4 border-[#DDE2DD] bg-blue-50">
                <p className="text-[10px] uppercase font-bold text-[#8A928D]">Active Residents</p>
                <p className="text-xl font-bold text-[#18231F] mt-1">
                  {totalResidents} <span className="text-xs font-normal text-[#68736D]">/ {tenant.maxResidents}</span>
                </p>
              </Card>

              <Card className="p-4 border-[#DDE2DD] bg-purple-50">
                <p className="text-[10px] uppercase font-bold text-[#8A928D]">Staff & Admins</p>
                <p className="text-xl font-bold text-[#18231F] mt-1">
                  {tenant.users?.length || 0}
                </p>
              </Card>
            </div>

            {/* Main Info */}
            <Card className="p-6 border-[#DDE2DD] space-y-4">
              <div className="flex items-start justify-between border-b border-[#DDE2DD] pb-4">
                <div>
                  <h3 className="text-base font-bold text-[#18231F]">Business Dossier</h3>
                  <p className="text-xs text-[#68736D]">{tenant.address || 'Address not configured'}, {tenant.city}, {tenant.state}, {tenant.country}</p>
                </div>
                <Button variant="secondary" size="xs" onClick={() => setSubModalOpen(true)} leftIcon={<Edit2 className="w-3 h-3" />}>
                  Adjust Quotas
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-[#F8F7F3] rounded-xl border border-[#DDE2DD] space-y-1">
                  <span className="text-[10px] text-[#8A928D] uppercase font-bold">Contact Email</span>
                  <p className="font-mono font-semibold text-[#0B4036] flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#8A928D]" />
                    {tenant.email}
                  </p>
                </div>

                <div className="p-3 bg-[#F8F7F3] rounded-xl border border-[#DDE2DD] space-y-1">
                  <span className="text-[10px] text-[#8A928D] uppercase font-bold">Contact Phone</span>
                  <p className="font-mono font-semibold text-[#18231F] flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#8A928D]" />
                    {tenant.phone || 'N/A'}
                  </p>
                </div>

                <div className="p-3 bg-[#F8F7F3] rounded-xl border border-[#DDE2DD] space-y-1">
                  <span className="text-[10px] text-[#8A928D] uppercase font-bold">Registration Date</span>
                  <p className="font-semibold text-[#18231F]">
                    {new Date(tenant.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="p-3 bg-[#F8F7F3] rounded-xl border border-[#DDE2DD] space-y-1">
                  <span className="text-[10px] text-[#8A928D] uppercase font-bold">Trial Expiration</span>
                  <p className="font-semibold text-[#18231F]">
                    {tenant.trialEndsAt ? new Date(tenant.trialEndsAt).toLocaleDateString() : 'Continuous Subscription'}
                  </p>
                </div>
              </div>

              {/* Owner Account Card */}
              <div className="p-4 bg-[#FAF5EB] rounded-xl border border-[#C8A45D]/30 space-y-2">
                <h4 className="text-xs font-bold text-[#18231F] flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#0B4036]" />
                  Primary Business Owner Account
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-[#8A928D]">Name:</span>
                    <p className="font-bold text-[#18231F]">{owner?.name || 'Owner'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8A928D]">Login Email:</span>
                    <p className="font-mono text-[#0B4036]">{owner?.email || tenant.email}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8A928D]">Mobile:</span>
                    <p className="text-[#18231F]">{owner?.mobile || tenant.phone || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Col: Plan & Actions */}
          <div className="space-y-6">
            <Card className="p-5 border-[#DDE2DD] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#18231F] flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-[#C8A45D]" />
                  SaaS Subscription
                </h3>
                <Button variant="ghost" size="xs" onClick={() => setSubModalOpen(true)}>
                  Edit
                </Button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-[#DDE2DD]">
                  <span className="text-[#68736D]">Plan Tier:</span>
                  <span className="font-bold text-[#0B4036]">{tenant.plan}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#DDE2DD]">
                  <span className="text-[#68736D]">Status:</span>
                  <span className="font-semibold text-[#18231F]">{tenant.subscriptionStatus || 'ACTIVE'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#DDE2DD]">
                  <span className="text-[#68736D]">Trial End Date:</span>
                  <span className="text-[#18231F]">
                    {tenant.trialEndsAt ? new Date(tenant.trialEndsAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#DDE2DD]">
                  <span className="text-[#68736D]">Created At:</span>
                  <span className="text-[#18231F]">{new Date(tenant.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </Card>

            <Card className="p-5 border-rose-200 bg-rose-50/50 space-y-3">
              <h4 className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                Administrative Controls
              </h4>
              <p className="text-[11px] text-rose-700">
                Super Admin operations for emergency tenant isolation and archiving.
              </p>
              <div className="flex flex-col gap-2 pt-1">
                <Button variant="secondary" size="xs" onClick={handleToggleSuspend} className="w-full justify-start text-xs">
                  {tenant.status === 'SUSPENDED' ? 'Reactivate Tenant Access' : 'Suspend Tenant Organization'}
                </Button>
                <Button variant="outline" size="xs" onClick={handleArchive} className="w-full justify-start text-xs text-rose-700 border-rose-300 hover:bg-rose-100">
                  Archive Tenant Permanently
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: PROPERTIES */}
      {activeTab === 'properties' && (
        <Card className="p-6 border-[#DDE2DD] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#18231F]">
              Managed PG Branches ({properties.length} of {tenant.maxProperties} allowed)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {properties.length === 0 ? (
              <p className="text-xs text-[#68736D] col-span-2 text-center py-6">No PG branches registered under this tenant.</p>
            ) : (
              properties.map((prop: any) => (
                <div key={prop.id} className="p-4 rounded-xl bg-[#F8F7F3] border border-[#DDE2DD] space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-[#18231F]">{prop.name}</h4>
                      <p className="text-xs text-[#68736D] flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-[#8A928D]" /> {prop.address}, {prop.city}
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[#DDE2DD] grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 bg-white rounded-lg border border-[#DDE2DD]">
                      <span className="text-[10px] text-[#8A928D]">Buildings</span>
                      <p className="font-bold text-[#18231F]">{prop._count?.buildings || 0}</p>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-[#DDE2DD]">
                      <span className="text-[10px] text-[#8A928D]">Rooms</span>
                      <p className="font-bold text-[#0B4036]">{prop._count?.rooms || 0}</p>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-[#DDE2DD]">
                      <span className="text-[10px] text-[#8A928D]">Residents</span>
                      <p className="font-bold text-[#C8A45D]">{prop._count?.residents || 0}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* TAB 3: USERS & STAFF */}
      {activeTab === 'users' && (
        <Card className="p-6 border-[#DDE2DD] space-y-4">
          <h3 className="text-sm font-bold text-[#18231F]">
            Users Scoped to {tenant.name} ({tenant.users?.length || 0})
          </h3>

          <div className="space-y-2">
            {tenant.users?.map((u: any) => (
              <div key={u.id} className="p-3 rounded-xl bg-[#F8F7F3] border border-[#DDE2DD] flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <p className="font-bold text-[#18231F]">{u.name}</p>
                  <p className="text-[#68736D]">{u.email} • {u.mobile || 'No Mobile'}</p>
                </div>
                <div className="text-right space-y-0.5">
                  <span className="px-2 py-0.5 rounded-full bg-white border border-[#DDE2DD] text-[10px] font-bold text-[#0B4036]">
                    {u.role}
                  </span>
                  <p className="text-[10px] text-[#8A928D]">Joined {new Date(u.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* TAB 4: SUBSCRIPTION & LIMITS */}
      {activeTab === 'subscription' && (
        <Card className="p-6 border-[#DDE2DD] space-y-6">
          <div className="flex items-center justify-between border-b border-[#DDE2DD] pb-4">
            <div>
              <h3 className="text-base font-bold text-[#18231F]">Subscription Tier & Resource Quotas</h3>
              <p className="text-xs text-[#68736D]">Adjust allowed PG branches, room capacities, and trial durations</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setSubModalOpen(true)} leftIcon={<Sliders className="w-3.5 h-3.5" />}>
              Configure Quotas
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-[#F8F7F3] rounded-xl border border-[#DDE2DD]">
              <span className="text-xs text-[#8A928D] uppercase font-bold">Max PG Properties</span>
              <p className="text-2xl font-bold text-[#18231F] mt-1">{tenant.maxProperties}</p>
              <p className="text-[11px] text-[#68736D] mt-0.5">Current Usage: {properties.length} Properties</p>
            </div>

            <div className="p-4 bg-[#F8F7F3] rounded-xl border border-[#DDE2DD]">
              <span className="text-xs text-[#8A928D] uppercase font-bold">Max Rooms Limit</span>
              <p className="text-2xl font-bold text-[#0B4036] mt-1">{tenant.maxRooms}</p>
              <p className="text-[11px] text-[#68736D] mt-0.5">Current Usage: {totalRooms} Rooms</p>
            </div>

            <div className="p-4 bg-[#F8F7F3] rounded-xl border border-[#DDE2DD]">
              <span className="text-xs text-[#8A928D] uppercase font-bold">Max Residents Limit</span>
              <p className="text-2xl font-bold text-[#C8A45D] mt-1">{tenant.maxResidents}</p>
              <p className="text-[11px] text-[#68736D] mt-0.5">Current Usage: {totalResidents} Residents</p>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 5: SUPPORT TICKETS */}
      {activeTab === 'support' && (
        <Card className="p-6 border-[#DDE2DD] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#18231F]">
              Support Tickets for {tenant.name} ({tickets.length})
            </h3>
            <Button variant="secondary" size="xs" onClick={fetchTenantTickets} leftIcon={<RefreshCw className="w-3 h-3" />}>
              Refresh
            </Button>
          </div>

          {loadingTickets ? (
            <p className="text-xs text-[#68736D] text-center py-6">Loading tickets...</p>
          ) : tickets.length === 0 ? (
            <p className="text-xs text-[#68736D] text-center py-6">No support tickets on file for this tenant.</p>
          ) : (
            <div className="space-y-2">
              {tickets.map((t) => (
                <div key={t.id} className="p-3 rounded-xl bg-[#F8F7F3] border border-[#DDE2DD] flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <p className="font-bold text-[#18231F]">{t.subject}</p>
                    <p className="text-[#68736D]">{t.description}</p>
                  </div>
                  <div className="text-right space-y-0.5">
                    <StatusBadge status={t.status} />
                    <p className="text-[10px] text-[#8A928D]">{new Date(t.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* TAB 6: ACTIVITY & AUDIT TRAIL */}
      {activeTab === 'activity' && (
        <Card className="p-6 border-[#DDE2DD] space-y-4">
          <h3 className="text-sm font-bold text-[#18231F]">
            Audit History ({tenant.auditLogs?.length || 0} recent entries)
          </h3>

          <div className="space-y-2">
            {tenant.auditLogs?.length === 0 ? (
              <p className="text-xs text-[#68736D] text-center py-6">No audit history found.</p>
            ) : (
              tenant.auditLogs?.map((log: any) => (
                <div key={log.id} className="p-3 rounded-xl bg-[#F8F7F3] border border-[#DDE2DD] text-xs flex items-start justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#18231F]">{log.action}</span>
                      <span className="text-[10px] text-[#8A928D]">• {log.actorRole}</span>
                    </div>
                    <p className="text-[#68736D]">{log.details}</p>
                  </div>
                  <span className="text-[10px] text-[#8A928D] whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Reset Password Modal */}
      <Modal isOpen={resetModalOpen} onClose={() => setResetModalOpen(false)} title="Reset Owner Temporary Password" maxWidth="sm">
        <form onSubmit={handleConfirmResetPassword} className="space-y-4 pt-1">
          <p className="text-xs text-[#68736D]">
            Set new password for primary owner <strong>{owner?.email || tenant.email}</strong>:
          </p>
          <Input label="New Temporary Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          <div className="flex justify-end gap-2 pt-2 border-t border-[#DDE2DD]">
            <Button variant="secondary" size="sm" type="button" onClick={() => setResetModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isResetting}>
              Set Password
            </Button>
          </div>
        </form>
      </Modal>

      {/* Manage Subscription & Quotas Modal */}
      <Modal isOpen={subModalOpen} onClose={() => setSubModalOpen(false)} title="Configure Subscription & Quotas" maxWidth="md">
        <form onSubmit={handleSaveSubscription} className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#18231F] mb-1">Plan Tier</label>
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="w-full text-xs rounded-xl border border-[#DDE2DD] p-2 bg-white text-[#18231F]"
              >
                <option value="TRIAL">TRIAL</option>
                <option value="STARTER">STARTER</option>
                <option value="PROFESSIONAL">PROFESSIONAL</option>
                <option value="ENTERPRISE">ENTERPRISE</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#18231F] mb-1">Subscription Status</label>
              <select
                value={subStatus}
                onChange={(e) => setSubStatus(e.target.value)}
                className="w-full text-xs rounded-xl border border-[#DDE2DD] p-2 bg-white text-[#18231F]"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="TRIALING">TRIALING</option>
                <option value="PAST_DUE">PAST_DUE</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="EXPIRED">EXPIRED</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#18231F] mb-1">Extend Trial Days (+Days)</label>
            <input
              type="number"
              min="0"
              value={trialDaysToAdd}
              onChange={(e) => setTrialDaysToAdd(parseInt(e.target.value, 10) || 0)}
              className="w-full text-xs rounded-xl border border-[#DDE2DD] p-2 bg-white text-[#18231F]"
              placeholder="e.g. 14"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#18231F] mb-1">Max Properties</label>
              <input
                type="number"
                min="1"
                value={overrideProperties}
                onChange={(e) => setOverrideProperties(parseInt(e.target.value, 10) || 1)}
                className="w-full text-xs rounded-xl border border-[#DDE2DD] p-2 bg-white text-[#18231F]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#18231F] mb-1">Max Rooms</label>
              <input
                type="number"
                min="1"
                value={overrideRooms}
                onChange={(e) => setOverrideRooms(parseInt(e.target.value, 10) || 1)}
                className="w-full text-xs rounded-xl border border-[#DDE2DD] p-2 bg-white text-[#18231F]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#18231F] mb-1">Max Residents</label>
              <input
                type="number"
                min="1"
                value={overrideResidents}
                onChange={(e) => setOverrideResidents(parseInt(e.target.value, 10) || 1)}
                className="w-full text-xs rounded-xl border border-[#DDE2DD] p-2 bg-white text-[#18231F]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#DDE2DD]">
            <Button variant="secondary" size="sm" type="button" onClick={() => setSubModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isUpdatingSub}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SuperAdminTenantDetailPage;
