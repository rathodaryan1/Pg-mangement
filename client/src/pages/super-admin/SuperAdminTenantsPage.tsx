import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Building2,
  Search,
  Plus,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  ExternalLink,
  Trash2,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserCheck,
  MoreVertical,
  Filter,
  Copy,
  Check,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge, Badge } from '../../components/ui/Badge';
import { Input, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { superAdminApi } from '../../services/superAdminApi';
import { useToast } from '../../context/ToastContext';
import api from '../../lib/api';
import type { Tenant } from '../../types';

export const SuperAdminTenantsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Create Tenant Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [onboardingModalOpen, setOnboardingModalOpen] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    tenantName: string;
    ownerName: string;
    ownerEmail: string;
    temporaryPassword?: string;
    loginUrl: string;
    plan: string;
    trialDays: number;
  } | null>(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: 'Ahmedabad',
    state: 'Gujarat',
    ownerName: '',
    ownerEmail: '',
    ownerMobile: '',
    password: '',
    plan: 'STARTER',
    trialDays: 14,
  });

  // Suspend Modal
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [tenantToSuspend, setTenantToSuspend] = useState<Tenant | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [isProcessingSuspend, setIsProcessingSuspend] = useState(false);

  // Reset Password Modal
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [tenantToReset, setTenantToReset] = useState<Tenant | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const fetchTenants = async () => {
    setIsLoading(true);
    try {
      const res = await superAdminApi.getTenants({
        search: searchQuery || undefined,
        status: statusFilter,
        plan: planFilter,
        city: cityFilter,
      });
      setTenants(res.tenants || []);
    } catch (err: any) {
      console.error('Failed to load tenants:', err);
      toast.error(err.message || 'Unable to load tenants list.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [statusFilter, planFilter, cityFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTenants();
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.ownerName || !form.ownerEmail || !form.password) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setIsCreating(true);
    try {
      const res = await superAdminApi.createTenant(form);
      toast.success(`PG Tenant "${form.name}" created successfully.`);
      setCreateModalOpen(false);
      setCreatedCredentials({
        tenantName: form.name,
        ownerName: form.ownerName,
        ownerEmail: form.ownerEmail,
        temporaryPassword: form.password,
        loginUrl: `${window.location.origin}/login`,
        plan: form.plan,
        trialDays: form.trialDays,
      });
      setOnboardingModalOpen(true);
      setForm({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: 'Ahmedabad',
        state: 'Gujarat',
        ownerName: '',
        ownerEmail: '',
        ownerMobile: '',
        password: '',
        plan: 'STARTER',
        trialDays: 14,
      });
      fetchTenants();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create tenant.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleImpersonate = async (tenantId: string) => {
    try {
      const currentSuperToken = api.getToken();
      if (currentSuperToken) {
        localStorage.setItem('saas_superadmin_original_token', currentSuperToken);
      }

      const res = await superAdminApi.impersonateTenant(tenantId);
      if (res && res.token) {
        api.setToken(res.token);
        localStorage.setItem('urbannest_user_session', JSON.stringify(res.user));
        toast.success(`Impersonating owner for "${res.user.tenantName || 'Tenant'}"`);
        window.location.href = '/owner/dashboard';
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to initiate impersonation session.');
    }
  };

  const handleOpenSuspend = (tenant: Tenant) => {
    setTenantToSuspend(tenant);
    setSuspendReason('');
    setSuspendModalOpen(true);
  };

  const handleConfirmSuspend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantToSuspend) return;

    setIsProcessingSuspend(true);
    try {
      await superAdminApi.suspendTenant(tenantToSuspend.id, suspendReason || 'Administrative suspension');
      toast.success(`Tenant "${tenantToSuspend.name}" has been SUSPENDED.`);
      setSuspendModalOpen(false);
      setTenantToSuspend(null);
      fetchTenants();
    } catch (err: any) {
      toast.error(err.message || 'Failed to suspend tenant.');
    } finally {
      setIsProcessingSuspend(false);
    }
  };

  const handleActivate = async (tenant: Tenant) => {
    try {
      await superAdminApi.activateTenant(tenant.id);
      toast.success(`Tenant "${tenant.name}" is now ACTIVE.`);
      fetchTenants();
    } catch (err: any) {
      toast.error(err.message || 'Failed to activate tenant.');
    }
  };

  const handleOpenReset = (tenant: Tenant) => {
    setTenantToReset(tenant);
    setNewPassword('SecurePass@' + Math.floor(1000 + Math.random() * 9000));
    setResetModalOpen(true);
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantToReset || !newPassword) return;

    setIsResetting(true);
    try {
      await superAdminApi.resetOwnerPassword(tenantToReset.id, newPassword);
      toast.success(`Password for ${tenantToReset.name} owner has been reset.`);
      setResetModalOpen(false);
      setTenantToReset(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password.');
    } finally {
      setIsResetting(false);
    }
  };

  const columns: Column<Tenant>[] = [
    {
      header: 'PG Organization',
      cell: (t) => (
        <div>
          <p className="font-bold text-[#18231F] flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#0B4036]" />
            <span>{t.name}</span>
          </p>
          <p className="text-[11px] text-[#68736D]">
            {t.city || 'Ahmedabad'} • Slug: <span className="font-mono text-[10px]">{t.slug}</span>
          </p>
        </div>
      ),
    },
    {
      header: 'Owner Contact',
      cell: (t) => {
        const owner = t.users && t.users[0];
        return (
          <div>
            <p className="font-semibold text-[#18231F]">{owner?.name || 'Owner'}</p>
            <p className="text-[11px] text-[#68736D]">{owner?.email || t.email}</p>
          </div>
        );
      },
    },
    {
      header: 'Plan & Tier',
      cell: (t) => (
        <div className="space-y-0.5">
          <span className="px-2 py-0.5 rounded-full bg-[#FAF5EB] text-[#C8A45D] border border-[#C8A45D]/40 text-[10px] font-bold">
            {t.plan}
          </span>
          <p className="text-[10px] text-[#8A928D]">
            Max: {t.maxProperties} Props / {t.maxRooms} Rms
          </p>
        </div>
      ),
    },
    {
      header: 'Branches & Users',
      cell: (t) => (
        <span className="text-xs text-[#18231F] font-semibold">
          {t._count?.properties || 0} PG Branches • {t._count?.users || 0} Accounts
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (t) => <StatusBadge status={t.status} />,
    },
    {
      header: 'Created On',
      cell: (t) => (
        <span className="text-xs text-[#68736D]">
          {new Date(t.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (t) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="secondary"
            size="xs"
            onClick={() => navigate(`/super-admin/tenants/${t.id}`)}
            leftIcon={<Eye className="w-3 h-3 text-[#0B4036]" />}
          >
            Dossier
          </Button>

          <Button
            variant="outline"
            size="xs"
            onClick={() => handleImpersonate(t.id)}
            className="text-[#0B4036] border-[#0B4036]/30 hover:bg-[#EAF2EE]"
            title="Impersonate Owner session"
            leftIcon={<ExternalLink className="w-3 h-3" />}
          >
            Impersonate
          </Button>

          <Button
            variant="ghost"
            size="xs"
            onClick={() => handleOpenReset(t)}
            title="Reset Owner Password"
            className="text-[#68736D] hover:text-[#18231F]"
          >
            <KeyRound className="w-3.5 h-3.5" />
          </Button>

          {t.status === 'SUSPENDED' ? (
            <Button
              variant="secondary"
              size="xs"
              onClick={() => handleActivate(t)}
              className="text-emerald-700 hover:bg-emerald-50"
            >
              Activate
            </Button>
          ) : (
            <Button
              variant="outline"
              size="xs"
              onClick={() => handleOpenSuspend(t)}
              className="text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              Suspend
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#18231F] flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[#0B4036]" />
            PG Organizations & Tenants
          </h1>
          <p className="text-xs text-[#68736D] mt-0.5">
            Manage independent PG businesses, subscription allocations, owner credentials, and tenant lifecycle
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={fetchTenants} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Create New PG
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 border-[#DDE2DD]">
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="relative sm:col-span-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A928D]" />
            <input
              type="text"
              placeholder="Search PG or owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#DDE2DD] bg-white text-[#18231F] focus:outline-none focus:ring-1 focus:ring-[#0B4036]"
            />
          </div>

          <Select
            label=""
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Statuses' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'TRIAL', label: 'Trial' },
              { value: 'SUSPENDED', label: 'Suspended' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
          />

          <Select
            label=""
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All SaaS Plans' },
              { value: 'STARTER', label: 'Starter Plan' },
              { value: 'PROFESSIONAL', label: 'Professional Plan' },
              { value: 'ENTERPRISE', label: 'Enterprise Plan' },
              { value: 'TRIAL', label: 'Free Trial' },
            ]}
          />

          <Select
            label=""
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Cities' },
              { value: 'Ahmedabad', label: 'Ahmedabad' },
              { value: 'Surat', label: 'Surat' },
              { value: 'Vadodara', label: 'Vadodara' },
              { value: 'Rajkot', label: 'Rajkot' },
              { value: 'Gandhinagar', label: 'Gandhinagar' },
              { value: 'Mumbai', label: 'Mumbai' },
              { value: 'Pune', label: 'Pune' },
              { value: 'Bengaluru', label: 'Bengaluru' },
            ]}
          />
        </form>
      </Card>

      {/* Tenants Table */}
      <Card className="p-0 border-[#DDE2DD] overflow-hidden">
        <Table
          columns={columns}
          data={tenants}
          keyExtractor={(t) => t.id}
          isLoading={isLoading}
          emptyMessage="No PG tenant organizations found matching filter criteria."
        />
      </Card>

      {/* CREATE NEW PG MODAL */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Provision New PG Business Tenant"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 pt-1">
          <p className="text-xs text-[#68736D]">
            Provisions an independent PG business tenant in PostgreSQL, creates the primary owner credentials, and sets up an initial branch campus with default room structure.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="PG Business Name"
              placeholder="e.g. Royal Living PG Group"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Input
              label="Official Tenant Email"
              type="email"
              placeholder="contact@royalliving.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="City"
              placeholder="Ahmedabad"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              required
            />
            <Input
              label="State"
              placeholder="Gujarat"
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
            />
            <Input
              label="Contact Phone"
              placeholder="+91 98765 00000"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <div className="p-3 bg-[#FAF5EB] rounded-xl border border-[#C8A45D]/30 space-y-3">
            <h4 className="text-xs font-bold text-[#18231F] flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-[#0B4036]" />
              Primary Owner & Admin Credentials
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Owner Full Name"
                placeholder="e.g. Rajesh Singhania"
                value={form.ownerName}
                onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                required
              />
              <Input
                label="Owner Login Email"
                type="email"
                placeholder="rajesh@royalliving.com"
                value={form.ownerEmail}
                onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Owner Mobile"
                placeholder="+91 98765 43210"
                value={form.ownerMobile}
                onChange={(e) => setForm({ ...form, ownerMobile: e.target.value })}
              />
              <Input
                label="Temporary Password"
                type="text"
                placeholder="Initial secure password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Subscription Plan"
              value={form.plan}
              onChange={(e) => setForm({ ...form, plan: e.target.value })}
              options={[
                { value: 'STARTER', label: 'Starter (1 Branch • 20 Rooms • 50 Beds)' },
                { value: 'PROFESSIONAL', label: 'Professional (5 Branches • 100 Rooms • 300 Beds)' },
                { value: 'ENTERPRISE', label: 'Enterprise (25 Branches • Unlimited Rooms)' },
                { value: 'TRIAL', label: '14-Day Free Trial' },
              ]}
            />

            <Input
              label="Trial Duration (Days)"
              type="number"
              value={String(form.trialDays)}
              onChange={(e) => setForm({ ...form, trialDays: parseInt(e.target.value, 10) || 14 })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#DDE2DD]">
            <Button variant="secondary" size="sm" type="button" onClick={() => setCreateModalOpen(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isCreating}>
              Provision PG Tenant
            </Button>
          </div>
        </form>
      </Modal>

      {/* SUSPEND TENANT MODAL */}
      <Modal
        isOpen={suspendModalOpen}
        onClose={() => setSuspendModalOpen(false)}
        title="Suspend PG Tenant"
        maxWidth="sm"
      >
        <form onSubmit={handleConfirmSuspend} className="space-y-4 pt-1">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>
              Suspension immediately blocks all owner, staff, and resident access for <strong>{tenantToSuspend?.name}</strong>.
            </span>
          </div>

          <Input
            label="Reason for Suspension"
            placeholder="e.g. Overdue SaaS payment, terms violation"
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-[#DDE2DD]">
            <Button variant="secondary" size="sm" type="button" onClick={() => setSuspendModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" type="submit" isLoading={isProcessingSuspend}>
              Confirm Suspension
            </Button>
          </div>
        </form>
      </Modal>

      {/* RESET OWNER PASSWORD MODAL */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset PG Owner Password"
        maxWidth="sm"
      >
        <form onSubmit={handleConfirmReset} className="space-y-4 pt-1">
          <p className="text-xs text-[#68736D]">
            Specify the new password for the primary administrator of <strong>{tenantToReset?.name}</strong>:
          </p>

          <Input
            label="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-[#DDE2DD]">
            <Button variant="secondary" size="sm" type="button" onClick={() => setResetModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isResetting}>
              Save New Password
            </Button>
          </div>
        </form>
      </Modal>

      {/* TENANT PROVISIONED & OWNER CREDENTIALS MODAL */}
      {createdCredentials && (
        <Modal
          isOpen={onboardingModalOpen}
          onClose={() => setOnboardingModalOpen(false)}
          title="PG Tenant Provisioned Successfully"
          maxWidth="md"
        >
          <div className="space-y-4 pt-1">
            <div className="p-3 bg-[#EAF2EE] border border-[#0B4036]/20 rounded-xl flex items-center gap-2 text-xs text-[#0B4036]">
              <CheckCircle2 className="w-4 h-4 text-[#0B4036] shrink-0" />
              <span>
                Tenant <strong>{createdCredentials.tenantName}</strong> created on PostgreSQL with an initial PG branch.
              </span>
            </div>

            <div className="p-4 bg-[#FCFBF8] border border-[#DDE2DD] rounded-xl space-y-3 text-xs">
              <div>
                <p className="text-[10px] uppercase font-bold text-[#8A928D]">Organization</p>
                <p className="font-bold text-[#18231F] text-sm">{createdCredentials.tenantName}</p>
                <p className="text-[11px] text-[#68736D]">Plan: {createdCredentials.plan} ({createdCredentials.trialDays}-Day Free Trial)</p>
              </div>

              <div className="pt-2 border-t border-[#DDE2DD] space-y-2">
                <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-[#DDE2DD]">
                  <div>
                    <span className="text-[10px] font-bold text-[#8A928D] block">Owner Email</span>
                    <span className="font-mono text-xs font-semibold text-[#18231F]">{createdCredentials.ownerEmail}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      navigator.clipboard.writeText(createdCredentials.ownerEmail);
                      toast.success('Email copied to clipboard');
                    }}
                    leftIcon={<Copy className="w-3 h-3" />}
                  >
                    Copy
                  </Button>
                </div>

                <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-[#DDE2DD]">
                  <div>
                    <span className="text-[10px] font-bold text-[#8A928D] block">Temporary Password</span>
                    <span className="font-mono text-xs font-bold text-[#0B4036]">{createdCredentials.temporaryPassword}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      if (createdCredentials.temporaryPassword) {
                        navigator.clipboard.writeText(createdCredentials.temporaryPassword);
                        toast.success('Password copied to clipboard');
                      }
                    }}
                    leftIcon={<Copy className="w-3 h-3" />}
                  >
                    Copy
                  </Button>
                </div>

                <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-[#DDE2DD]">
                  <div>
                    <span className="text-[10px] font-bold text-[#8A928D] block">Login Portal URL</span>
                    <span className="font-mono text-[11px] text-[#68736D]">{createdCredentials.loginUrl}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      navigator.clipboard.writeText(createdCredentials.loginUrl);
                      toast.success('Login URL copied to clipboard');
                    }}
                    leftIcon={<Copy className="w-3 h-3" />}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong>Security Notice:</strong> The temporary password will not be displayed again after closing this window. Please copy or share these credentials with the owner securely.
              </span>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#DDE2DD]">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setOnboardingModalOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default SuperAdminTenantsPage;
