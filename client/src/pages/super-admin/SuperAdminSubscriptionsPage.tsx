import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Building2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Search,
  ArrowUpRight,
  Sliders,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { StatusBadge, Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { superAdminApi } from '../../services/superAdminApi';
import { useToast } from '../../context/ToastContext';
import type { Tenant } from '../../types';

export const SuperAdminSubscriptionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Edit Modal State
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [planTier, setPlanTier] = useState('STARTER');
  const [subStatus, setSubStatus] = useState('ACTIVE');
  const [trialDaysToAdd, setTrialDaysToAdd] = useState(0);
  const [overrideProperties, setOverrideProperties] = useState(1);
  const [overrideRooms, setOverrideRooms] = useState(20);
  const [overrideResidents, setOverrideResidents] = useState(50);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchSubscriptions = async () => {
    setIsLoading(true);
    try {
      const res = await superAdminApi.getTenants({
        search: searchQuery || undefined,
        plan: planFilter,
        status: statusFilter,
        limit: 100,
      });
      setTenants(res.tenants || []);
    } catch (err: any) {
      console.error('Failed to load subscriptions:', err);
      toast.error('Failed to load subscription records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [planFilter, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSubscriptions();
  };

  const openManageModal = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setPlanTier(tenant.plan || 'STARTER');
    setSubStatus(tenant.subscriptionStatus || 'ACTIVE');
    setTrialDaysToAdd(0);
    setOverrideProperties(tenant.maxProperties || 1);
    setOverrideRooms(tenant.maxRooms || 20);
    setOverrideResidents(tenant.maxResidents || 50);
    setIsModalOpen(true);
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    setIsUpdating(true);
    try {
      await superAdminApi.updateTenantSubscription(selectedTenant.id, {
        plan: planTier,
        subscriptionStatus: subStatus,
        trialDaysExtension: trialDaysToAdd > 0 ? trialDaysToAdd : undefined,
        maxProperties: overrideProperties,
        maxRooms: overrideRooms,
        maxResidents: overrideResidents,
      });
      toast.success(`Subscription updated for "${selectedTenant.name}".`);
      setIsModalOpen(false);
      fetchSubscriptions();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update subscription.');
    } finally {
      setIsUpdating(false);
    }
  };

  const columns: Column<Tenant>[] = [
    {
      header: 'Tenant PG Organization',
      cell: (t) => (
        <div>
          <button
            onClick={() => navigate(`/super-admin/tenants/${t.id}`)}
            className="font-bold text-[#18231F] hover:text-[#0B4036] text-left block"
          >
            {t.name}
          </button>
          <p className="text-[11px] text-[#68736D]">{t.email} • {t.city || 'Bengaluru'}</p>
        </div>
      ),
    },
    {
      header: 'Subscribed Tier',
      cell: (t) => (
        <span className="px-2.5 py-1 rounded-full bg-[#FAF5EB] text-[#C8A45D] border border-[#C8A45D]/40 text-xs font-bold">
          {t.plan}
        </span>
      ),
    },
    {
      header: 'Account Status',
      cell: (t) => <StatusBadge status={t.status} />,
    },
    {
      header: 'Trial Expiration',
      cell: (t) => (
        <span className="text-xs text-[#68736D]">
          {t.trialEndsAt ? new Date(t.trialEndsAt).toLocaleDateString() : 'N/A'}
        </span>
      ),
    },
    {
      header: 'Resource Quotas',
      cell: (t) => (
        <span className="text-xs text-[#18231F] font-semibold">
          {t.maxProperties} Props • {t.maxRooms} Rooms • {t.maxResidents} Res
        </span>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (t) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            size="xs"
            onClick={() => openManageModal(t)}
            leftIcon={<Sliders className="w-3 h-3 text-[#0B4036]" />}
          >
            Manage Tier
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => navigate(`/super-admin/tenants/${t.id}`)}
            leftIcon={<ExternalLink className="w-3 h-3" />}
          >
            Dossier
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#18231F] flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-[#0B4036]" />
            Tenant Subscriptions & SaaS Billing
          </h1>
          <p className="text-xs text-[#68736D] mt-0.5">
            Manage subscription tiers, trial durations, quota overrides, and recurring billing cycles
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={fetchSubscriptions} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
          Refresh
        </Button>
      </div>

      {/* Tier Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-[#DDE2DD] bg-[#F8F7F3]">
          <p className="text-xs font-semibold text-[#8A928D]">Trial Organizations</p>
          <p className="text-xl font-bold text-[#18231F] mt-1">
            {tenants.filter((t) => t.plan === 'TRIAL' || t.status === 'TRIAL').length}
          </p>
          <span className="text-[10px] text-[#68736D]">14-Day Free Evaluation</span>
        </Card>

        <Card className="p-4 border-[#DDE2DD] bg-[#FAF5EB]">
          <p className="text-xs font-semibold text-[#8A928D]">Starter Subscriptions</p>
          <p className="text-xl font-bold text-[#18231F] mt-1">
            {tenants.filter((t) => t.plan === 'STARTER').length}
          </p>
          <span className="text-[10px] text-[#C8A45D] font-bold">₹2,999 / mo per tenant</span>
        </Card>

        <Card className="p-4 border-[#DDE2DD] bg-[#EAF2EE]">
          <p className="text-xs font-semibold text-[#8A928D]">Professional Subscriptions</p>
          <p className="text-xl font-bold text-[#18231F] mt-1">
            {tenants.filter((t) => t.plan === 'PROFESSIONAL').length}
          </p>
          <span className="text-[10px] text-[#0B4036] font-bold">₹7,999 / mo per tenant</span>
        </Card>

        <Card className="p-4 border-[#DDE2DD] bg-purple-50">
          <p className="text-xs font-semibold text-[#8A928D]">Enterprise Subscriptions</p>
          <p className="text-xl font-bold text-[#18231F] mt-1">
            {tenants.filter((t) => t.plan === 'ENTERPRISE').length}
          </p>
          <span className="text-[10px] text-purple-700 font-bold">₹19,999 / mo per tenant</span>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 border-[#DDE2DD]">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md w-full">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A928D]" />
              <input
                type="text"
                placeholder="Search tenant name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#DDE2DD] bg-white text-[#18231F] focus:outline-none focus:ring-1 focus:ring-[#0B4036]"
              />
            </div>
            <Button variant="primary" size="sm" type="submit">
              Search
            </Button>
          </form>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="text-xs rounded-xl border border-[#DDE2DD] p-2 bg-white text-[#18231F]"
            >
              <option value="ALL">All Plans</option>
              <option value="TRIAL">TRIAL</option>
              <option value="STARTER">STARTER</option>
              <option value="PROFESSIONAL">PROFESSIONAL</option>
              <option value="ENTERPRISE">ENTERPRISE</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs rounded-xl border border-[#DDE2DD] p-2 bg-white text-[#18231F]"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="TRIAL">TRIAL</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Subscriptions Table */}
      <Card className="p-0 border-[#DDE2DD] overflow-hidden">
        <Table
          columns={columns}
          data={tenants}
          keyExtractor={(t) => t.id}
          isLoading={isLoading}
          emptyMessage="No subscription records found matching criteria."
        />
      </Card>

      {/* Manage Subscription Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Manage Subscription: ${selectedTenant?.name || 'Tenant'}`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveSubscription} className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#18231F] mb-1">Subscription Plan</label>
              <select
                value={planTier}
                onChange={(e) => setPlanTier(e.target.value)}
                className="w-full text-xs rounded-xl border border-[#DDE2DD] p-2 bg-white text-[#18231F]"
              >
                <option value="TRIAL">TRIAL</option>
                <option value="STARTER">STARTER (₹2,999/mo)</option>
                <option value="PROFESSIONAL">PROFESSIONAL (₹7,999/mo)</option>
                <option value="ENTERPRISE">ENTERPRISE (₹19,999/mo)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#18231F] mb-1">Status</label>
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
            <label className="block text-xs font-semibold text-[#18231F] mb-1">Extend Trial (+Days)</label>
            <input
              type="number"
              min="0"
              value={trialDaysToAdd}
              onChange={(e) => setTrialDaysToAdd(parseInt(e.target.value, 10) || 0)}
              className="w-full text-xs rounded-xl border border-[#DDE2DD] p-2 bg-white text-[#18231F]"
              placeholder="e.g. 7 or 14 days"
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
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isUpdating}>
              Save Subscription
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SuperAdminSubscriptionsPage;
