import { toast, useToast } from '../../context/ToastContext';
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
  AlertTriangle,
  Clock,
  UserPlus
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
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
    remarks: 'Room inspected, no damages found. Full deposit refund approved.'
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

  const activeResidents = residents.filter((r) => r.status === 'ACTIVE' || r.status === 'NOTICE_PERIOD');

  const handleMoveIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!moveInForm.bedId || !moveInForm.fullName || !moveInForm.email || !moveInForm.mobile) {
        toast.error('Please select a bed and fill all resident details');
        return;
      }

      await ownerApi.moveInResident({
        propertyId: activeProperty.id,
        bedId: moveInForm.bedId,
        fullName: moveInForm.fullName,
        email: moveInForm.email,
        mobile: moveInForm.mobile,
        monthlyRent: parseFloat(moveInForm.monthlyRent) || 14000,
        depositAmount: parseFloat(moveInForm.depositAmount) || 28000,
        leaseStartDate: moveInForm.leaseStartDate,
        leaseEndDate: moveInForm.leaseEndDate
      });

      setToastMessage(`Resident ${moveInForm.fullName} successfully onboarded!`);
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
      setTimeout(() => setToastMessage(null), 4000);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to onboard resident');
    }
  };

  const handlePlaceOnNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!noticeForm.residentId) {
        toast.error('Please select a resident');
        return;
      }

      await ownerApi.placeOnNoticePeriod(noticeForm.residentId, {
        noticeEndDate: noticeForm.noticeEndDate
      });

      setToastMessage('Resident placed on notice period.');
      setNoticeForm({ residentId: '', noticeEndDate: '2026-10-31' });
      setTimeout(() => setToastMessage(null), 4000);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update notice period');
    }
  };

  const handleMoveOut = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!moveOutForm.residentId) {
        toast.error('Please select a resident');
        return;
      }

      await ownerApi.moveOutResident(moveOutForm.residentId, {
        deductions: parseFloat(moveOutForm.deductions) || 0,
        refundAmount: parseFloat(moveOutForm.refundAmount) || 0,
        remarks: moveOutForm.remarks
      });

      setToastMessage('Resident moved out and deposit settled.');
      setMoveOutForm({
        residentId: '',
        deductions: '0',
        refundAmount: '0',
        remarks: 'Room inspected, no damages found. Full refund approved.'
      });
      setTimeout(() => setToastMessage(null), 4000);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete move-out');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 rounded-lg bg-[#EAF2EE] text-[#0B4036] border border-[#0B4036]/20 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-[#0B4036]" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-xs text-[#0B4036]/70">
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#DDE2DD] pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#18231F]">
            Resident Lifecycle Workflows
          </h1>
          <p className="text-xs text-[#68736D] mt-0.5">
            Step-by-step digital move-in onboarding, notice period tracking, and move-out deposit settlements.
          </p>
        </div>
      </div>

      {/* Pipeline Selector Toolbar */}
      <div className="p-3.5 bg-white border border-[#DDE2DD] rounded-xl shadow-xs">
        <div className="flex items-center gap-1.5 p-1 bg-[#F8F7F3] rounded-lg w-full sm:w-auto border border-[#DDE2DD]">
          <button
            onClick={() => setActivePipeline('movein')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activePipeline === 'movein'
                ? 'bg-white text-[#0B4036] shadow-xs'
                : 'text-[#68736D] hover:text-[#18231F]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>1. Move-In Onboarding</span>
          </button>
          <button
            onClick={() => setActivePipeline('notice')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activePipeline === 'notice'
                ? 'bg-white text-[#0B4036] shadow-xs'
                : 'text-[#68736D] hover:text-[#18231F]'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-[#B9954E]" />
            <span>2. Notice Period</span>
          </button>
          <button
            onClick={() => setActivePipeline('moveout')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activePipeline === 'moveout'
                ? 'bg-white text-[#0B4036] shadow-xs'
                : 'text-[#68736D] hover:text-[#18231F]'
            }`}
          >
            <LogOut className="w-3.5 h-3.5 text-rose-600" />
            <span>3. Move-Out & Settlement</span>
          </button>
        </div>
      </div>

      {/* PIPELINE 1: MOVE-IN FORM */}
      {activePipeline === 'movein' && (
        <Card className="p-6 max-w-3xl space-y-6">
          <div className="space-y-1 pb-3 border-b border-[#DDE2DD]">
            <h2 className="text-base font-bold text-[#18231F]">Step 1: Move-In Resident Onboarding</h2>
            <p className="text-xs text-[#68736D]">
              Allocate an available bed, capture resident details, and establish lease start parameters.
            </p>
          </div>

          <form onSubmit={handleMoveIn} className="space-y-4">
            <Select
              label="Select Available Bed"
              options={[
                { label: availableBeds.length > 0 ? '-- Select Bed Allocation --' : 'No Vacant Beds Available', value: '' },
                ...availableBeds
              ]}
              value={moveInForm.bedId}
              onChange={(e) => {
                const bedId = e.target.value;
                const found = availableBeds.find((b) => b.value === bedId);
                setMoveInForm({
                  ...moveInForm,
                  bedId,
                  monthlyRent: found ? found.rent.toString() : moveInForm.monthlyRent
                });
              }}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Resident Full Name"
                placeholder="e.g. Ramesh Patel"
                value={moveInForm.fullName}
                onChange={(e) => setMoveInForm({ ...moveInForm, fullName: e.target.value })}
                required
              />
              <Input
                label="Phone Number"
                placeholder="9876543210"
                value={moveInForm.mobile}
                onChange={(e) => setMoveInForm({ ...moveInForm, mobile: e.target.value })}
                required
              />
            </div>

            <Input
              label="Email Address"
              type="email"
              placeholder="ramesh@gmail.com"
              value={moveInForm.email}
              onChange={(e) => setMoveInForm({ ...moveInForm, email: e.target.value })}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Agreed Monthly Rent (₹)"
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div className="pt-3 border-t border-[#DDE2DD] flex justify-end">
              <Button type="submit" variant="primary" size="md" className="font-bold">
                Complete Move-In Onboarding
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* PIPELINE 2: NOTICE PERIOD FORM */}
      {activePipeline === 'notice' && (
        <Card className="p-6 max-w-3xl space-y-6">
          <div className="space-y-1 pb-3 border-b border-[#DDE2DD]">
            <h2 className="text-base font-bold text-[#18231F]">Step 2: Place Resident on Notice Period</h2>
            <p className="text-xs text-[#68736D]">
              Record 30-day move-out notice period to schedule room inspection and bed re-listing.
            </p>
          </div>

          <form onSubmit={handlePlaceOnNotice} className="space-y-4">
            <Select
              label="Select Resident"
              options={[
                { label: '-- Select Resident on Notice --', value: '' },
                ...activeResidents.map((r) => ({
                  label: `${r.fullName} (Room ${r.roomNumber || 'N/A'}) - Status: ${r.status}`,
                  value: r.id
                }))
              ]}
              value={noticeForm.residentId}
              onChange={(e) => setNoticeForm({ ...noticeForm, residentId: e.target.value })}
              required
            />

            <Input
              label="Expected Move-Out Date"
              type="date"
              value={noticeForm.noticeEndDate}
              onChange={(e) => setNoticeForm({ ...noticeForm, noticeEndDate: e.target.value })}
              required
            />

            <div className="pt-3 border-t border-[#DDE2DD] flex justify-end">
              <Button type="submit" variant="primary" size="md" className="font-bold">
                Confirm Notice Period
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* PIPELINE 3: MOVE-OUT & SETTLEMENT */}
      {activePipeline === 'moveout' && (
        <Card className="p-6 max-w-3xl space-y-6">
          <div className="space-y-1 pb-3 border-b border-[#DDE2DD]">
            <h2 className="text-base font-bold text-[#18231F]">Step 3: Move-Out & Deposit Settlement</h2>
            <p className="text-xs text-[#68736D]">
              Process room inspection, calculate deposit deductions, and release bed back to vacant inventory.
            </p>
          </div>

          <form onSubmit={handleMoveOut} className="space-y-4">
            <Select
              label="Select Resident Moving Out"
              options={[
                { label: '-- Select Resident --', value: '' },
                ...activeResidents.map((r) => ({
                  label: `${r.fullName} (Room ${r.roomNumber || 'N/A'}) · Held Deposit: ₹${(r.securityDeposit || 28000).toLocaleString('en-IN')}`,
                  value: r.id
                }))
              ]}
              value={moveOutForm.residentId}
              onChange={(e) => {
                const resId = e.target.value;
                const found = activeResidents.find((r) => r.id === resId);
                const dep = found ? found.securityDeposit || 28000 : 28000;
                setMoveOutForm({
                  ...moveOutForm,
                  residentId: resId,
                  deductions: '0',
                  refundAmount: dep.toString()
                });
              }}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Deductions for Damages / Pending Rent (₹)"
                type="number"
                value={moveOutForm.deductions}
                onChange={(e) => {
                  const ded = parseFloat(e.target.value) || 0;
                  const found = activeResidents.find((r) => r.id === moveOutForm.residentId);
                  const dep = found ? found.securityDeposit || 28000 : 28000;
                  setMoveOutForm({
                    ...moveOutForm,
                    deductions: e.target.value,
                    refundAmount: Math.max(0, dep - ded).toString()
                  });
                }}
              />
              <Input
                label="Net Refund Amount (₹)"
                type="number"
                value={moveOutForm.refundAmount}
                onChange={(e) => setMoveOutForm({ ...moveOutForm, refundAmount: e.target.value })}
                required
              />
            </div>

            <Input
              label="Settlement Remarks & Inspection Notes"
              value={moveOutForm.remarks}
              onChange={(e) => setMoveOutForm({ ...moveOutForm, remarks: e.target.value })}
            />

            <div className="pt-3 border-t border-[#DDE2DD] flex justify-end">
              <Button type="submit" variant="primary" size="md" className="font-bold">
                Finalize Move-Out & Settle Deposit
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
};
