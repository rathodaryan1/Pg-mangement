import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { StatusBadge, Badge } from '../../components/ui/Badge';
import { superAdminApi } from '../../services/superAdminApi';
import { useToast } from '../../context/ToastContext';
import type { Tenant } from '../../types';

export const SuperAdminSubscriptionsPage: React.FC = () => {
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubscriptions = async () => {
    setIsLoading(true);
    try {
      const res = await superAdminApi.getTenants({ limit: 100 });
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
  }, []);

  const columns: Column<Tenant>[] = [
    {
      header: 'Tenant PG',
      cell: (t) => (
        <div>
          <p className="font-bold text-[#18231F]">{t.name}</p>
          <p className="text-[11px] text-[#68736D]">{t.email}</p>
        </div>
      ),
    },
    {
      header: 'Subscribed Plan',
      cell: (t) => (
        <span className="px-2 py-0.5 rounded-full bg-[#FAF5EB] text-[#C8A45D] border border-[#C8A45D]/40 text-xs font-bold">
          {t.plan}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (t) => <StatusBadge status={t.status} />,
    },
    {
      header: 'Trial End Date',
      cell: (t) => (
        <span className="text-xs text-[#68736D]">
          {t.trialEndsAt ? new Date(t.trialEndsAt).toLocaleDateString() : 'N/A'}
        </span>
      ),
    },
    {
      header: 'Subscription Start',
      cell: (t) => (
        <span className="text-xs text-[#68736D]">
          {t.subscriptionStartedAt ? new Date(t.subscriptionStartedAt).toLocaleDateString() : new Date(t.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Allowed Capacity',
      cell: (t) => (
        <span className="text-xs text-[#18231F] font-semibold">
          {t.maxProperties} Branches • {t.maxRooms} Rooms
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#18231F] flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-[#0B4036]" />
            Tenant Subscriptions & Billing
          </h1>
          <p className="text-xs text-[#68736D] mt-0.5">
            Monitor active SaaS recurring tiers, trial durations, and subscription lifecycles
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={fetchSubscriptions} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
          Refresh Subscriptions
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

      <Card className="p-0 border-[#DDE2DD] overflow-hidden">
        <Table
          columns={columns}
          data={tenants}
          keyExtractor={(t) => t.id}
          isLoading={isLoading}
          emptyMessage="No subscription records found."
        />
      </Card>
    </div>
  );
};

export default SuperAdminSubscriptionsPage;
