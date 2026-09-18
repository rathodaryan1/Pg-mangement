import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  CreditCard,
  Building2,
  Calendar,
  Download,
  DollarSign,
  RefreshCw,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { superAdminApi } from '../../services/superAdminApi';
import { useToast } from '../../context/ToastContext';

export const SuperAdminRevenuePage: React.FC = () => {
  const { toast } = useToast();
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRevenue = async () => {
    setIsLoading(true);
    try {
      const res = await superAdminApi.getDashboard();
      setData(res);
    } catch (err: any) {
      toast.error('Failed to load revenue analytics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenue();
  }, []);

  const totalRevenue = data?.overview?.monthlySaaSRevenue || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#18231F] flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-[#0B4036]" />
            SaaS Revenue & Billing Analytics
          </h1>
          <p className="text-xs text-[#68736D] mt-0.5">
            Real-time breakdown of recurring SaaS subscription cashflow and tenant billing distribution
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={fetchRevenue} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
          Refresh Analytics
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border-[#DDE2DD] bg-[#FAF5EB]">
          <span className="text-xs font-semibold text-[#8A928D]">Monthly Recurring Revenue (MRR)</span>
          <p className="text-2xl font-extrabold text-[#0B4036] mt-1">
            ₹{totalRevenue.toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-[#C8A45D] font-bold">Live database calculated</span>
        </Card>

        <Card className="p-5 border-[#DDE2DD] bg-[#EAF2EE]">
          <span className="text-xs font-semibold text-[#8A928D]">Annualized Run Rate (ARR)</span>
          <p className="text-2xl font-extrabold text-[#0B4036] mt-1">
            ₹{(totalRevenue * 12).toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-[#0B4036] font-bold">100% active paid retention</span>
        </Card>

        <Card className="p-5 border-[#DDE2DD] bg-white">
          <span className="text-xs font-semibold text-[#8A928D]">Active Paying Tenants</span>
          <p className="text-2xl font-extrabold text-[#18231F] mt-1">
            {data?.overview?.activeTenants || 0}
          </p>
          <span className="text-[11px] text-[#68736D]">Across all tiers</span>
        </Card>
      </div>

      {/* Revenue Breakdown by Plan */}
      <Card className="p-6 border-[#DDE2DD] space-y-4">
        <h3 className="text-sm font-bold text-[#18231F]">Subscription Plan Revenue Breakdown</h3>

        <div className="space-y-3">
          {data?.tenantsByPlan?.map((item: any, idx: number) => {
            const pricing: Record<string, number> = {
              TRIAL: 0,
              STARTER: 2999,
              PROFESSIONAL: 7999,
              ENTERPRISE: 19999,
            };
            const planRevenue = (pricing[item.plan] || 0) * item._count.id;
            const pct = totalRevenue > 0 ? Math.round((planRevenue / totalRevenue) * 100) : 0;

            return (
              <div key={idx} className="p-4 rounded-xl bg-[#F8F7F3] border border-[#DDE2DD] space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#18231F]">
                  <span>{item.plan} Tier ({item._count.id} Subscriptions)</span>
                  <span className="text-[#0B4036]">₹{planRevenue.toLocaleString('en-IN')} / mo ({pct}%)</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-[#0B4036] h-full rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default SuperAdminRevenuePage;
