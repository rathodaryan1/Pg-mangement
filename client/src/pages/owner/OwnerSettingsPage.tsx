import { toast, useToast } from '../../context/ToastContext';
import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Clock,
  Shield,
  FileText,
  CreditCard,
  Wifi,
  Phone,
  CheckCircle2,
  AlertCircle,
  Globe
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import ownerApi from '../../services/ownerApi';

export const OwnerSettingsPage: React.FC = () => {
  const { activeProperty } = useAuth();
  const [settings, setSettings] = useState({
    curfewTime: '10:30 PM',
    visitorPassExpiry: '24 Hours',
    noticePeriodDays: '30',
    lateFeePerDay: '100',
    wifiSsid: 'UrbanNest_HighSpeed_5G',
    emergencyContact: '+91 98765 00000',
    allowOvernightGuests: false,
    autoInvoiceGenerationDay: '1',
    rentDueDay: '5',
    upiId: 'urbannest.gurgaon@okaxis',
    bankAccount: 'HDFC0001234 - 50200098765432',
    razorpayKeyId: '',
    razorpayKeySecret: '',
    hasRazorpaySecret: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await ownerApi.getSettings(activeProperty.id);
      if (res.data) {
        setSettings((prev) => ({ ...prev, ...res.data }));
      }
    } catch (err: any) {
      console.error('Failed to load settings:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [activeProperty]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await ownerApi.updateSettings(settings);
      setToastMessage('PG operational rules and payment settings saved successfully!');
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-500 text-white flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-semibold">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-white/80 hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Operational Rules & Global Settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure curfew timings, notice periods, visitor passes, and automated rent schedules
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Section 1: Gate & Curfew Rules */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white font-bold text-sm">
            <Clock className="w-4 h-4 text-brand-forest dark:text-brand-gold" />
            <span>Gate Timings & Visitor Policies</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Curfew Closing Time"
              value={settings.curfewTime}
              onChange={(e) => setSettings({ ...settings, curfewTime: e.target.value })}
              required
            />
            <Input
              label="Visitor Pass Validity Period"
              value={settings.visitorPassExpiry}
              onChange={(e) => setSettings({ ...settings, visitorPassExpiry: e.target.value })}
              required
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="overnight"
              checked={settings.allowOvernightGuests}
              onChange={(e) => setSettings({ ...settings, allowOvernightGuests: e.target.checked })}
              className="w-4 h-4 rounded text-brand-forest border-slate-300 focus:ring-brand-forest"
            />
            <label htmlFor="overnight" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Allow overnight visitor stays with prior management clearance
            </label>
          </div>
        </Card>

        {/* Section 2: Financial & Invoicing Automation */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white font-bold text-sm">
            <CreditCard className="w-4 h-4 text-brand-forest dark:text-brand-gold" />
            <span>Rent Billing & Notice Period Configurations</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Standard Notice Period (Days)"
              type="number"
              value={settings.noticePeriodDays}
              onChange={(e) => setSettings({ ...settings, noticePeriodDays: e.target.value })}
              required
            />
            <Input
              label="Late Payment Penalty Fee per Day (₹)"
              type="number"
              value={settings.lateFeePerDay}
              onChange={(e) => setSettings({ ...settings, lateFeePerDay: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Monthly Rent Generation Day of Month"
              type="number"
              value={settings.autoInvoiceGenerationDay}
              onChange={(e) => setSettings({ ...settings, autoInvoiceGenerationDay: e.target.value })}
              required
            />
            <Input
              label="Rent Payment Due Day of Month"
              type="number"
              value={settings.rentDueDay}
              onChange={(e) => setSettings({ ...settings, rentDueDay: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Primary UPI ID for QR Invoices"
              value={settings.upiId}
              onChange={(e) => setSettings({ ...settings, upiId: e.target.value })}
              required
            />
            <Input
              label="Bank Account Details (NEFT / IMPS)"
              value={settings.bankAccount}
              onChange={(e) => setSettings({ ...settings, bankAccount: e.target.value })}
              required
            />
          </div>
        </Card>

        {/* Section 3: Online Payment Gateway (Razorpay) */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-sm">
              <Globe className="w-4 h-4 text-emerald-600" />
              <span>Online Payment Gateway (Razorpay)</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{settings.razorpayKeyId ? 'Merchant Gateway Active' : 'Ready (Default Gateway)'}</span>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Allow residents to pay rent online via UPI (Google Pay, PhonePe, Paytm), Debit/Credit Cards, and Net Banking. Funds settle directly into your merchant bank account.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Razorpay Key ID"
              placeholder="e.g. rzp_live_... or rzp_test_..."
              value={settings.razorpayKeyId || ''}
              onChange={(e) => setSettings({ ...settings, razorpayKeyId: e.target.value })}
            />
            <Input
              label="Razorpay Key Secret"
              type="password"
              placeholder={settings.hasRazorpaySecret ? '••••••••••••••••••••' : 'Enter Razorpay Key Secret'}
              value={settings.razorpayKeySecret || ''}
              onChange={(e) => setSettings({ ...settings, razorpayKeySecret: e.target.value })}
            />
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
            <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <p className="font-semibold text-slate-800 dark:text-slate-200">Webhook Integration Endpoint</p>
              <p className="font-mono text-[11px] text-slate-700 dark:text-slate-300 select-all">
                {window.location.origin.replace(':5173', ':5000')}/api/webhooks/razorpay
              </p>
              <p className="text-[11px] text-slate-500">
                Register this webhook URL in your Razorpay Dashboard with the <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">payment.captured</code> event for automatic invoice settlement.
              </p>
            </div>
          </div>
        </Card>

        {/* Section 4: Connectivity & Emergency */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white font-bold text-sm">
            <Wifi className="w-4 h-4 text-brand-forest dark:text-brand-gold" />
            <span>Facility Wi-Fi & 24x7 Emergency Contact</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Broadband SSID Display Name"
              value={settings.wifiSsid}
              onChange={(e) => setSettings({ ...settings, wifiSsid: e.target.value })}
            />
            <Input
              label="24x7 SOS Dispatch Hotline"
              value={settings.emergencyContact}
              onChange={(e) => setSettings({ ...settings, emergencyContact: e.target.value })}
              required
            />
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button
            variant="primary"
            size="lg"
            type="submit"
            disabled={isSaving}
            leftIcon={<Save className="w-4 h-4" />}
          >
            {isSaving ? 'Saving Configurations...' : 'Save All Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default OwnerSettingsPage;
