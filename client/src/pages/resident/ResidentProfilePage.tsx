import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Building,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Save,
  RefreshCw,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge, Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { residentApi } from '../../services/residentApi';
import { toast, useToast } from '../../context/ToastContext';

export const ResidentProfilePage: React.FC = () => {
  const { toast } = useToast();
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form states
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactRelation, setEmergencyContactRelation] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [alternateMobile, setAlternateMobile] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');
  const [workCompany, setWorkCompany] = useState('');

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data: any = await residentApi.getProfile();
      setProfile(data);
      setEmergencyContactName(data.emergencyContactName || '');
      setEmergencyContactRelation(data.emergencyContactRelation || '');
      setEmergencyContactPhone(data.emergencyContactPhone || '');
      setAlternateMobile(data.alternateMobile || '');
      setPermanentAddress(data.permanentAddress || '');
      setWorkCompany(data.workCompany || '');
    } catch (err: any) {
      console.error('Failed to load profile:', err.message);
      setError(err.message || 'Failed to load profile details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const updated: any = await residentApi.updateProfile({
        emergencyContactName,
        emergencyContactRelation,
        emergencyContactPhone,
        alternateMobile,
        permanentAddress,
        workCompany,
      });

      setProfile({ ...(profile || {}), ...updated });
      setSaveSuccess(true);
      toast.success('Emergency contact details updated successfully.');
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setIsSaving(true);
    try {
      await residentApi.updateProfile({
        currentPassword,
        newPassword,
      });

      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3500);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password. Verify current password.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-60 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Resident Account & Profile
          </h1>
          <p className="text-xs text-slate-500">
            View personal allocation details, update emergency contacts, and manage password
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={fetchProfile} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card & Editable Info */}
        <Card className="p-6 md:col-span-2 space-y-6">
          {/* Identity Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-brand-forest text-brand-gold font-black text-xl flex items-center justify-center shadow-md border border-brand-gold/30">
                {profile?.fullName?.charAt(0) || 'R'}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{profile?.fullName}</h3>
                <p className="text-xs text-slate-500">{profile?.email}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <StatusBadge status={profile?.status || 'ACTIVE'} />
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    KYC {profile?.kycStatus}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-500 space-y-1">
              <p><strong>PG Branch:</strong> {profile?.property?.name}</p>
              <p><strong>Room / Bed:</strong> Room {profile?.bed?.room?.number || '101'} ({profile?.bed?.bedNumber || 'Bed A'})</p>
              <p><strong>Joined On:</strong> {new Date(profile?.joiningDate).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Edit Profile Form */}
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Emergency & Personal Contacts
            </h4>

            {saveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Emergency contact details updated successfully!
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Primary Mobile (Registered)"
                value={profile?.mobile || ''}
                disabled
              />
              <Input
                label="Alternate Mobile"
                placeholder="Optional secondary mobile"
                value={alternateMobile}
                onChange={(e) => setAlternateMobile(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Emergency Contact Name"
                placeholder="e.g. Suresh Verma"
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
                required
              />
              <Input
                label="Relation"
                placeholder="e.g. Father, Mother, Spouse"
                value={emergencyContactRelation}
                onChange={(e) => setEmergencyContactRelation(e.target.value)}
                required
              />
              <Input
                label="Emergency Phone"
                placeholder="10-digit mobile"
                value={emergencyContactPhone}
                onChange={(e) => setEmergencyContactPhone(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Company / College Name"
                placeholder="e.g. Google Signature Towers"
                value={workCompany}
                onChange={(e) => setWorkCompany(e.target.value)}
              />
              <Input
                label="Permanent Home Address"
                placeholder="City, State, Pincode"
                value={permanentAddress}
                onChange={(e) => setPermanentAddress(e.target.value)}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={isSaving}
                leftIcon={<Save className="w-3.5 h-3.5" />}
              >
                Save Contact Changes
              </Button>
            </div>
          </form>
        </Card>

        {/* Security & Password Settings */}
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-brand-forest dark:text-brand-gold" />
              Change Password
            </h3>

            {passwordSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Password updated!
              </div>
            )}

            {passwordError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 text-xs text-red-700 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-600" /> {passwordError}
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-3">
              <Input
                label="Current Password"
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
              <Input
                label="New Password"
                type="password"
                placeholder="Min 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <Input
                label="Confirm New Password"
                type="password"
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              <Button
                variant="secondary"
                size="sm"
                type="submit"
                className="w-full"
                isLoading={isSaving}
              >
                Update Password
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};
