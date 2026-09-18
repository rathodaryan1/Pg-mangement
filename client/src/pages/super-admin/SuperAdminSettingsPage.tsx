import React from 'react';
import {
  Settings,
  ShieldCheck,
  CreditCard,
  Bell,
  Save,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../context/ToastContext';

export const SuperAdminSettingsPage: React.FC = () => {
  const { toast } = useToast();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Platform settings saved successfully.');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#18231F] flex items-center gap-2">
          <Settings className="w-6 h-6 text-[#0B4036]" />
          Platform Global Settings
        </h1>
        <p className="text-xs text-[#68736D] mt-0.5">
          Configure platform branding, default trial periods, and external integration webhooks
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="p-6 border-[#DDE2DD] space-y-4">
          <h3 className="text-sm font-bold text-[#18231F] border-b border-[#DDE2DD] pb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0B4036]" />
            Tenant Onboarding Policies
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Default Trial Period (Days)"
              type="number"
              defaultValue="14"
            />
            <Input
              label="Platform Support Contact Email"
              type="email"
              defaultValue="support@urbannest.com"
            />
          </div>
        </Card>

        <Card className="p-6 border-[#DDE2DD] space-y-4">
          <h3 className="text-sm font-bold text-[#18231F] border-b border-[#DDE2DD] pb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#0B4036]" />
            SaaS Billing & Gateway Defaults
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Platform Currency"
              defaultValue="INR (₹)"
              disabled
            />
            <Input
              label="Grace Period for Overdue Subscriptions (Days)"
              type="number"
              defaultValue="7"
            />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button variant="primary" size="sm" type="submit" leftIcon={<Save className="w-3.5 h-3.5" />}>
            Save Platform Settings
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SuperAdminSettingsPage;
