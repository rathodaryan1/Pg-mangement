import React, { useState, useEffect } from 'react';
import {
  Settings,
  ShieldCheck,
  CreditCard,
  Bell,
  Save,
  Loader2,
  Globe,
  Lock,
  Mail,
  Phone,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export const SuperAdminSettingsPage: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    platformName: 'Urban Nest SaaS',
    supportEmail: 'support@urbannest.com',
    supportPhone: '+91 98765 43210',
    defaultTrialDays: '14',
    gracePeriodDays: '7',
    maintenanceMode: 'false',
    allowSelfRegistration: 'true',
    platformCurrency: 'INR (₹)',
    enforceMfa: 'false',
    sessionTimeoutHours: '24',
    emailNotifications: 'true',
    whatsappNotifications: 'true',
  });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get<Record<string, string>>('/super-admin/settings');
      if (res.success && res.data) {
        setSettings((prev) => ({ ...prev, ...(res.data as Record<string, string>) }));
      }
    } catch (err: any) {
      toast.error('Failed to load platform settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.post('/super-admin/settings', settings);
      if (res.success) {
        toast.success('Platform global settings saved to PostgreSQL');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-[#68736D] flex items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#0B4036]" />
        Loading platform settings from PostgreSQL...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#18231F] flex items-center gap-2">
          <Settings className="w-6 h-6 text-[#0B4036]" />
          Platform Global Settings
        </h1>
        <p className="text-xs text-[#68736D] mt-0.5">
          Configure multi-tenant SaaS governance policies, default trial quotas, and system configuration
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Platform Identity */}
        <Card className="p-6 border-[#DDE2DD] space-y-4">
          <h3 className="text-sm font-bold text-[#18231F] border-b border-[#DDE2DD] pb-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#0B4036]" />
            Platform Identity & Support
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Platform Brand Name"
              value={settings.platformName}
              onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
              required
            />
            <Input
              label="Support Email Address"
              type="email"
              value={settings.supportEmail}
              onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
              required
            />
            <Input
              label="Support Phone Number"
              value={settings.supportPhone}
              onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
            />
            <Input
              label="Platform Base Currency"
              value={settings.platformCurrency}
              disabled
            />
          </div>
        </Card>

        {/* Tenant Onboarding & Trial Policies */}
        <Card className="p-6 border-[#DDE2DD] space-y-4">
          <h3 className="text-sm font-bold text-[#18231F] border-b border-[#DDE2DD] pb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0B4036]" />
            Tenant Onboarding & Trial Policies
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Default Trial Period (Days)"
              type="number"
              value={settings.defaultTrialDays}
              onChange={(e) => setSettings({ ...settings, defaultTrialDays: e.target.value })}
              required
            />
            <Input
              label="Grace Period for Expired Subscriptions (Days)"
              type="number"
              value={settings.gracePeriodDays}
              onChange={(e) => setSettings({ ...settings, gracePeriodDays: e.target.value })}
              required
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="allowSelfReg"
              checked={settings.allowSelfRegistration === 'true'}
              onChange={(e) => setSettings({ ...settings, allowSelfRegistration: e.target.checked ? 'true' : 'false' })}
              className="rounded text-[#0B4036] focus:ring-[#0B4036]"
            />
            <label htmlFor="allowSelfReg" className="text-xs font-medium text-[#18231F]">
              Allow public PG owners to initiate online trial registration
            </label>
          </div>
        </Card>

        {/* Security & System Controls */}
        <Card className="p-6 border-[#DDE2DD] space-y-4">
          <h3 className="text-sm font-bold text-[#18231F] border-b border-[#DDE2DD] pb-3 flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#0B4036]" />
            Platform Security & Maintenance Controls
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Session JWT Timeout (Hours)"
              type="number"
              value={settings.sessionTimeoutHours}
              onChange={(e) => setSettings({ ...settings, sessionTimeoutHours: e.target.value })}
            />
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Maintenance Mode:</strong> When active, non-super-admin access is paused.
              </span>
            </div>
            <select
              value={settings.maintenanceMode}
              onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.value })}
              className="text-xs border border-amber-300 rounded px-2 py-1 bg-white text-amber-900 font-semibold"
            >
              <option value="false">DISABLED (Live)</option>
              <option value="true">ENABLED (Maintenance)</option>
            </select>
          </div>
        </Card>

        {/* Notification Settings */}
        <Card className="p-6 border-[#DDE2DD] space-y-4">
          <h3 className="text-sm font-bold text-[#18231F] border-b border-[#DDE2DD] pb-3 flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#0B4036]" />
            Global Notification Dispatch
          </h3>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-[#18231F]">
              <input
                type="checkbox"
                checked={settings.emailNotifications === 'true'}
                onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked ? 'true' : 'false' })}
                className="rounded text-[#0B4036] focus:ring-[#0B4036]"
              />
              Enable platform email alerts for subscription renewals and tenant onboarding
            </label>
            <label className="flex items-center gap-2 text-xs text-[#18231F]">
              <input
                type="checkbox"
                checked={settings.whatsappNotifications === 'true'}
                onChange={(e) => setSettings({ ...settings, whatsappNotifications: e.target.checked ? 'true' : 'false' })}
                className="rounded text-[#0B4036] focus:ring-[#0B4036]"
              />
              Enable WhatsApp message dispatch for emergency SOS triggers
            </label>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button
            variant="primary"
            size="sm"
            type="submit"
            disabled={saving}
            leftIcon={<Save className="w-3.5 h-3.5" />}
          >
            {saving ? 'Saving...' : 'Save Global Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SuperAdminSettingsPage;
