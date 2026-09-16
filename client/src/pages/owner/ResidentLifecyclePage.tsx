import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  FileCheck,
  ShieldCheck,
  Wallet,
  BedDouble,
  CheckCircle2,
  ArrowRight,
  LogOut,
  Sparkles,
  AlertTriangle,
  Clock,
  UserPlus
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { Input, Select } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { ownerApi } from '../../services/ownerApi';
import type { Room, Resident } from '../../types';

export const ResidentLifecyclePage: React.FC = () => {
  const { activeProperty } = useAuth();
  const [activePipeline, setActivePipeline] = useState<'movein' | 'moveout' | 'notice'>('movein');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Move-In Form
  const [moveInForm, setMoveInForm] = useState({
    bedId: '',
    fullName: '',
    email: '',
    mobile: '',
    monthlyRent: '14000',
    depositAmount: '28000',
    leaseStartDate: '2026-10-01',
    leaseEndDate: '2027-09-30'
  });

  // Notice Period Form
  const [noticeForm, setNoticeForm] = useState({
    residentId: '',
    noticeEndDate: '2026-10-31'
  });

  // Move-Out Settlement Form
  const [moveOutForm, setMoveOutForm] = useState({
    residentId: '',
    deductions: '0',
    refundAmount: '0',
    remarks: 'Room inspected, no damages found. Full refund approved.'
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [roomsRes, residentsRes] = await Promise.all([
        ownerApi.getRooms(activeProperty.id),
        ownerApi.getResidents(activeProperty.id)
      ]);
      setRooms(roomsRes.data || []);
      setResidents(residentsRes.data || []);
    } catch (err: any) {
      console.error('Failed to load lifecycle data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeProperty]);

  // Extract available beds
  const availableBeds: { label: string; value: string; rent: number }[] = [];
  rooms.forEach((r) => {
    (r.beds || []).forEach((b) => {
      if (b.status === 'AVAILABLE') {
        availableBeds.push({
          label: `Room ${r.number} - Bed ${b.bedNumber} (₹${b.monthlyRent || r.baseRent}/mo)`,
          value: b.id,
          rent: b.monthlyRent || r.baseRent || 14000
        });
      }
    });
  });

  // Active / Notice period residents for move out
  const activeResidents = residents.filter((r) => r.status === 'ACTIVE' || r.status === 'NOTICE_PERIOD');

  const handleMoveIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!moveInForm.bedId || !moveInForm.fullName || !moveInForm.email || !moveInForm.mobile) {
        alert('Please select a bed and fill all resident details');
        return;
      }

      await ownerApi.moveInResident({
        propertyId: activeProperty.id,
        bedId: moveInForm.bedId,
        fullName: moveInForm.fullName,
        email: moveInForm.email,
        mobile: moveInForm.mobile,
        monthlyRent: parseFloat(moveInForm.monthlyRent),
        depositAmount: parseFloat(moveInForm.depositAmount),
        leaseStartDate: moveInForm.leaseStartDate,
        leaseEndDate: moveInForm.leaseEndDate
      });

      setToastMessage(`Resident ${moveInForm.fullName} successfully moved in! Bed occupied & agreement created.`);
      setMoveInForm({
        bedId: '',
        fullName: '',
        email: '',
        mobile: '',
        monthlyRent: '14000',
        depositAmount: '28000',
        leaseStartDate: '2026-10-01',
        leaseEndDate: '2027-09-30'
      });
      setTimeout(() => setToastMessage(null), 5000);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to move in resident');
    }
  };

  const handlePlaceOnNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!noticeForm.residentId || !noticeForm.noticeEndDate) {
        alert('Please select a resident and notice end date');
        return;
      }

      await ownerApi.placeOnNoticePeriod(noticeForm.residentId, {
        noticeEndDate: noticeForm.noticeEndDate
      });

      setToastMessage('Resident placed on notice period successfully!');
      setTimeout(() => setToastMessage(null), 4000);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update notice period');
    }
  };

  const handleMoveOutSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!moveOutForm.residentId) {
        alert('Please select a resident for move-out');
        return;
      }

      const selectedRes = residents.find((r) => r.id === moveOutForm.residentId);
      const deposit = selectedRes?.securityDeposit || 28000;
      const deductions = parseFloat(moveOutForm.deductions) || 0;
      const refund = Math.max(0, deposit - deductions);

      await ownerApi.moveOutResident(moveOutForm.residentId, {
        deductions,
        refundAmount: refund,
        remarks: moveOutForm.remarks
      });

      setToastMessage(`Move-out settlement completed for ${selectedRes?.fullName}! Bed released to AVAILABLE.`);
      setMoveOutForm({
        residentId: '',
        deductions: '0',
        refundAmount: '0',
        remarks: 'Room inspected, no damages found. Full refund approved.'
      });
      setTimeout(() => setToastMessage(null), 5000);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to settle move-out');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
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

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Resident Lifecycle Visual Pipeline
        </h1>
        <p className="text-xs text-slate-500">
          Execute atomic Move-In onboarding, Notice Period tracking, and Move-Out exit & deposit settlement transactions
        </p>
      </div>

      {/* Pipeline Selector */}
      <Tabs
        tabs={[
          { id: 'movein', label: 'Move-In Onboarding Pipeline', icon: <UserPlus className="w-4 h-4 text-emerald-600" /> },
          { id: 'notice', label: 'Notice Period Pipeline', icon: <Clock className="w-4 h-4 text-amber-600" /> },
          { id: 'moveout', label: 'Move-Out & Settlement Pipeline', icon: <LogOut className="w-4 h-4 text-rose-600" /> }
        ]}
        activeTab={activePipeline}
        onChange={(tab) => setActivePipeline(tab as any)}
      />

      {/* Pipeline 1: Move-In Onboarding Form */}
      {activePipeline === 'movein' && (
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                New Tenant Onboarding & Atomic Bed Allocation
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Creates resident profile, locks selected bed, generates agreement & records initial deposit in one atomic transaction.
              </p>
            </div>
            <Badge variant="success">{availableBeds.length} Vacant Beds Ready</Badge>
          </div>

          <form onSubmit={handleMoveIn} className="space-y-4">
            <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 space-y-3">
              <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200">1. Select Target Bed</h4>
              <Select
                label="Available Bed"
                options={
                  availableBeds.length > 0
                    ? [{ label: '-- Select a Vacant Bed --', value: '' }, ...availableBeds]
                    : [{ label: 'No vacant beds available', value: '' }]
                }
                value={moveInForm.bedId}
                onChange={(e) => {
                  const bId = e.target.value;
                  const selected = availableBeds.find((b) => b.value === bId);
                  setMoveInForm({
                    ...moveInForm,
                    bedId: bId,
                    monthlyRent: selected ? selected.rent.toString() : moveInForm.monthlyRent,
                    depositAmount: selected ? (selected.rent * 2).toString() : moveInForm.depositAmount
                  });
                }}
                required
              />
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">2. Resident Profile Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="Full Name"
                  placeholder="e.g. Rahul Sharma"
                  value={moveInForm.fullName}
                  onChange={(e) => setMoveInForm({ ...moveInForm, fullName: e.target.value })}
                  required
                />
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="rahul@example.com"
                  value={moveInForm.email}
                  onChange={(e) => setMoveInForm({ ...moveInForm, email: e.target.value })}
                  required
                />
                <Input
                  label="Mobile Number"
                  placeholder="+91 98765 43210"
                  value={moveInForm.mobile}
                  onChange={(e) => setMoveInForm({ ...moveInForm, mobile: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">3. Commercial Terms & Lease Period</h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <Input
                  label="Monthly Rent (₹)"
                  type="number"
                  value={moveInForm.monthlyRent}
                  onChange={(e) => setMoveInForm({ ...moveInForm, monthlyRent: e.target.value })}
                  required
                />
                <Input
                  label="Security Deposit (₹)"
                  type="number"
                  value={moveInForm.depositAmount}
                  onChange={(e) => setMoveInForm({ ...moveInForm, depositAmount: e.target.value })}
                  required
                />
                <Input
                  label="Lease Start Date"
                  type="date"
                  value={moveInForm.leaseStartDate}
                  onChange={(e) => setMoveInForm({ ...moveInForm, leaseStartDate: e.target.value })}
                  required
                />
                <Input
                  label="Lease End Date"
                  type="date"
                  value={moveInForm.leaseEndDate}
                  onChange={(e) => setMoveInForm({ ...moveInForm, leaseEndDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="primary" size="md" type="submit" leftIcon={<CheckCircle2 className="w-4 h-4" />}>
                Execute Move-In Transaction
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Pipeline 2: Notice Period */}
      {activePipeline === 'notice' && (
        <Card className="p-6 space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600" />
              Place Resident on 30-Day Notice Period
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Updates resident status to NOTICE_PERIOD and schedules final settlement before move-out.
            </p>
          </div>

          <form onSubmit={handlePlaceOnNotice} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Target Resident"
                options={[
                  { label: '-- Select Active Resident --', value: '' },
                  ...residents
                    .filter((r) => r.status === 'ACTIVE')
                    .map((r) => ({
                      label: `${r.fullName} (Room ${r.roomNumber || 'N/A'} Bed ${r.bedNumber || 'N/A'})`,
                      value: r.id
                    }))
                ]}
                value={noticeForm.residentId}
                onChange={(e) => setNoticeForm({ ...noticeForm, residentId: e.target.value })}
                required
              />
              <Input
                label="Notice Period End Date (Move-out date)"
                type="date"
                value={noticeForm.noticeEndDate}
                onChange={(e) => setNoticeForm({ ...noticeForm, noticeEndDate: e.target.value })}
                required
              />
            </div>

            <div className="flex justify-end pt-3 border-t">
              <Button variant="primary" size="md" type="submit">
                Confirm Notice Period
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Pipeline 3: Move-Out & Settlement */}
      {activePipeline === 'moveout' && (
        <Card className="p-6 space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <LogOut className="w-5 h-5 text-rose-600" />
              Move-Out Exit & Security Deposit Settlement
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Calculates deposit deductions, updates security deposit status, frees bed back to AVAILABLE, and terminates agreement.
            </p>
          </div>

          <form onSubmit={handleMoveOutSettlement} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Select Resident for Move-Out"
                options={[
                  { label: '-- Select Resident --', value: '' },
                  ...activeResidents.map((r) => ({
                    label: `${r.fullName} (Room ${r.roomNumber || 'N/A'} Bed ${r.bedNumber || 'N/A'}) - [${r.status}]`,
                    value: r.id
                  }))
                ]}
                value={moveOutForm.residentId}
                onChange={(e) => {
                  const rId = e.target.value;
                  const res = residents.find((r) => r.id === rId);
                  const dep = res?.securityDeposit || 28000;
                  setMoveOutForm({
                    ...moveOutForm,
                    residentId: rId,
                    refundAmount: dep.toString()
                  });
                }}
                required
              />

              <Input
                label="Deductions for Damage / Unpaid Dues (₹)"
                type="number"
                value={moveOutForm.deductions}
                onChange={(e) => {
                  const ded = parseFloat(e.target.value) || 0;
                  const res = residents.find((r) => r.id === moveOutForm.residentId);
                  const dep = res?.securityDeposit || 28000;
                  setMoveOutForm({
                    ...moveOutForm,
                    deductions: e.target.value,
                    refundAmount: Math.max(0, dep - ded).toString()
                  });
                }}
                required
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400">Final Security Deposit Refund:</span>
                <p className="text-lg font-extrabold text-emerald-600">₹{parseFloat(moveOutForm.refundAmount || '0').toLocaleString('en-IN')}</p>
              </div>
              <Badge variant="purple">BED WILL BE VACATED</Badge>
            </div>

            <Input
              label="Settlement Remarks & Damage Report"
              value={moveOutForm.remarks}
              onChange={(e) => setMoveOutForm({ ...moveOutForm, remarks: e.target.value })}
              required
            />

            <div className="flex justify-end pt-3 border-t">
              <Button variant="danger" size="md" type="submit" leftIcon={<LogOut className="w-4 h-4" />}>
                Complete Move-Out & Release Bed
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
};
