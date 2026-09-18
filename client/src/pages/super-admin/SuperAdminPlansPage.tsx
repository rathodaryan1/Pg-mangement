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
  Plus,
  Edit2,
  Trash2,
  Save,
  Loader2,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import type { Plan } from '../../types';

export const SuperAdminPlansPage: React.FC = () => {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit / Create Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);

  const [formState, setFormState] = useState({
    name: '',
    tier: 'STARTER',
    priceMonthly: 2999,
    priceYearly: 29990,
    maxProperties: 1,
    maxRooms: 20,
    maxResidents: 50,
    featuresText: '',
  });

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<Plan[]>('/super-admin/plans');
      if (res.success && res.data) {
        setPlans(res.data || []);
      }
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

  const openCreateModal = () => {
    setEditingPlan(null);
    setFormState({
      name: '',
      tier: 'STARTER',
      priceMonthly: 2999,
      priceYearly: 29990,
      maxProperties: 1,
      maxRooms: 20,
      maxResidents: 50,
      featuresText: 'QR Gate Pass System\nOnline Rent Invoicing\nKYC Document Vault',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (plan: Plan) => {
    setEditingPlan(plan);
    const featuresList = Array.isArray(plan.features)
      ? plan.features
      : typeof plan.features === 'string'
      ? JSON.parse(plan.features || '[]')
      : [];

    setFormState({
      name: plan.name,
      tier: plan.tier,
      priceMonthly: plan.priceMonthly,
      priceYearly: plan.priceYearly,
      maxProperties: plan.maxProperties,
      maxRooms: plan.maxRooms,
      maxResidents: plan.maxResidents,
      featuresText: Array.isArray(featuresList) ? featuresList.join('\n') : '',
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const featuresArray = formState.featuresText
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);

      if (editingPlan) {
        // Update existing plan
        const res = await api.patch(`/super-admin/plans/${editingPlan.id}`, {
          name: formState.name,
          priceMonthly: formState.priceMonthly,
          priceYearly: formState.priceYearly,
          maxProperties: formState.maxProperties,
          maxRooms: formState.maxRooms,
          maxResidents: formState.maxResidents,
          features: JSON.stringify(featuresArray),
        });

        if (res.success) {
          toast.success(`Plan "${formState.name}" updated successfully.`);
          setIsModalOpen(false);
          fetchPlans();
        }
      } else {
        // Create new plan
        const res = await api.post('/super-admin/plans', {
          name: formState.name,
          tier: formState.tier,
          priceMonthly: formState.priceMonthly,
          priceYearly: formState.priceYearly,
          maxProperties: formState.maxProperties,
          maxRooms: formState.maxRooms,
          maxResidents: formState.maxResidents,
          features: JSON.stringify(featuresArray),
        });

        if (res.success) {
          toast.success(`Plan "${formState.name}" created successfully.`);
          setIsModalOpen(false);
          fetchPlans();
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save plan.');
    } finally {
      setSaving(false);
    }
  };

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

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={fetchPlans} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={openCreateModal} leftIcon={<Plus className="w-3.5 h-3.5" />}>
            Create Plan Tier
          </Button>
        </div>
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
                      <strong>Max Properties:</strong> {plan.maxProperties >= 999 ? 'Unlimited' : plan.maxProperties}
                    </p>
                    <p className="flex items-center gap-2">
                      <DoorClosed className="w-3.5 h-3.5 text-[#0B4036]" />
                      <strong>Max Rooms:</strong> {plan.maxRooms >= 999 ? 'Unlimited' : plan.maxRooms}
                    </p>
                    <p className="flex items-center gap-2">
                      <BedDouble className="w-3.5 h-3.5 text-[#0B4036]" />
                      <strong>Max Residents:</strong> {plan.maxResidents >= 999 ? 'Unlimited' : plan.maxResidents}
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
                  <Button
                    variant={isPro ? 'primary' : 'outline'}
                    size="sm"
                    className="w-full"
                    onClick={() => openEditModal(plan)}
                    leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                  >
                    Configure Tier Limits
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Plan Edit / Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlan ? `Configure Plan: ${editingPlan.name}` : 'Create New Subscription Plan'}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <Input
            label="Plan Display Name"
            placeholder="e.g. Professional Tier"
            value={formState.name}
            onChange={(e) => setFormState({ ...formState, name: e.target.value })}
            required
          />

          {!editingPlan && (
            <div>
              <label className="block text-xs font-semibold text-[#18231F] mb-1">Tier Enum Key</label>
              <select
                value={formState.tier}
                onChange={(e) => setFormState({ ...formState, tier: e.target.value })}
                className="w-full p-2 text-xs border border-[#DDE2DD] rounded-md bg-white focus:outline-none focus:border-[#0B4036]"
              >
                <option value="STARTER">STARTER</option>
                <option value="PROFESSIONAL">PROFESSIONAL</option>
                <option value="ENTERPRISE">ENTERPRISE</option>
                <option value="TRIAL">TRIAL</option>
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Monthly Price (₹)"
              type="number"
              value={String(formState.priceMonthly)}
              onChange={(e) => setFormState({ ...formState, priceMonthly: parseFloat(e.target.value) || 0 })}
              required
            />
            <Input
              label="Yearly Price (₹)"
              type="number"
              value={String(formState.priceYearly)}
              onChange={(e) => setFormState({ ...formState, priceYearly: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Max Properties"
              type="number"
              value={String(formState.maxProperties)}
              onChange={(e) => setFormState({ ...formState, maxProperties: parseInt(e.target.value, 10) || 1 })}
              required
            />
            <Input
              label="Max Rooms"
              type="number"
              value={String(formState.maxRooms)}
              onChange={(e) => setFormState({ ...formState, maxRooms: parseInt(e.target.value, 10) || 1 })}
              required
            />
            <Input
              label="Max Residents"
              type="number"
              value={String(formState.maxResidents)}
              onChange={(e) => setFormState({ ...formState, maxResidents: parseInt(e.target.value, 10) || 1 })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#18231F] mb-1">Features (One per line)</label>
            <textarea
              rows={4}
              value={formState.featuresText}
              onChange={(e) => setFormState({ ...formState, featuresText: e.target.value })}
              placeholder="QR Gate Pass System&#10;Online Rent Collection&#10;KYC Document Vault"
              className="w-full p-2 text-xs border border-[#DDE2DD] rounded-md focus:outline-none focus:border-[#0B4036]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Tier Settings'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SuperAdminPlansPage;
