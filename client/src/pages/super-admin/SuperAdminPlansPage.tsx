import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Check,
  Building2,
  DoorClosed,
  BedDouble,
  Sparkles,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { superAdminApi } from '../../services/superAdminApi';
import { useToast } from '../../context/ToastContext';
import type { Plan } from '../../types';

export const SuperAdminPlansPage: React.FC = () => {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const data = await superAdminApi.getPlans();
      setPlans(data || []);
    } catch (err: any) {
      console.error('Failed to load plans:', err);
      toast.error('Failed to retrieve subscription plans.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#18231F] flex items-center gap-2">
            <Sliders className="w-6 h-6 text-[#0B4036]" />
            SaaS Subscription Plans & Pricing
          </h1>
          <p className="text-xs text-[#68736D] mt-0.5">
            Configure subscription tiers, property limits, room thresholds, and feature entitlements
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={fetchPlans} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
          Refresh Plans
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 bg-slate-200 rounded-3xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isPro = plan.tier === 'PROFESSIONAL';
            const features = Array.isArray(plan.features)
              ? plan.features
              : typeof plan.features === 'string'
              ? JSON.parse(plan.features || '[]')
              : [];

            return (
              <Card
                key={plan.id}
                className={`p-6 space-y-5 rounded-3xl border flex flex-col justify-between ${
                  isPro
                    ? 'border-[#0B4036] shadow-lg relative bg-white ring-2 ring-[#0B4036]/20'
                    : 'border-[#DDE2DD] bg-white'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#8A928D] uppercase tracking-wider">{plan.tier}</span>
                    {isPro && (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#0B4036] text-white text-[10px] font-bold">
                        Most Popular
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-[#18231F]">{plan.name}</h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-[#0B4036]">
                        ₹{plan.priceMonthly.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs text-[#68736D]">/ month</span>
                    </div>
                    <p className="text-[11px] text-[#8A928D]">
                      Billed annually at ₹{plan.priceYearly.toLocaleString('en-IN')}
                    </p>
                  </div>

                  {/* Resource Thresholds */}
                  <div className="p-3.5 rounded-xl bg-[#F8F7F3] border border-[#DDE2DD] space-y-1.5 text-xs text-[#18231F]">
                    <p className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-[#0B4036]" />
                      <strong>Max Properties:</strong> {plan.maxProperties === 9999 ? 'Unlimited' : plan.maxProperties}
                    </p>
                    <p className="flex items-center gap-2">
                      <DoorClosed className="w-3.5 h-3.5 text-[#0B4036]" />
                      <strong>Max Rooms:</strong> {plan.maxRooms === 9999 ? 'Unlimited' : plan.maxRooms}
                    </p>
                    <p className="flex items-center gap-2">
                      <BedDouble className="w-3.5 h-3.5 text-[#0B4036]" />
                      <strong>Max Residents:</strong> {plan.maxResidents === 9999 ? 'Unlimited' : plan.maxResidents}
                    </p>
                  </div>

                  {/* Features List */}
                  <div className="space-y-2 pt-2 border-t border-[#DDE2DD]">
                    <p className="text-xs font-bold text-[#18231F]">Features Included:</p>
                    <ul className="space-y-1.5 text-xs text-[#68736D]">
                      {features.map((feat: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-[#0B4036] shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#DDE2DD]">
                  <Button variant={isPro ? 'primary' : 'outline'} size="sm" className="w-full">
                    Configure Tier Limits
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SuperAdminPlansPage;
