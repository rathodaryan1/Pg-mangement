import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  LogOut,
  Calendar,
  DollarSign,
  FileCheck,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Plus
} from 'lucide-react';
import { operationsApi } from '../../services/operationsApi';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { toast } from '../../context/ToastContext';
import { useTranslation } from '../../i18n';

export const LifecyclePipelinePage: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'leads' | 'bookings' | 'movein' | 'active' | 'notice' | 'settled'>('bookings');

  // Modals
  const [admitModalOpen, setAdmitModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [checklistModalOpen, setChecklistModalOpen] = useState(false);
  const [selectedResident, setSelectedResident] = useState<any | null>(null);
  const [noticeModalOpen, setNoticeModalOpen] = useState(false);
  const [settlementModalOpen, setSettlementModalOpen] = useState(false);

  // Forms
  const [admitForm, setAdmitForm] = useState({
    bedId: '',
    monthlyRent: '14000',
    depositAmount: '28000',
    leaseStartDate: new Date().toISOString().split('T')[0],
    leaseEndDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
    emergencyName: 'Guardian',
    emergencyPhone: '',
    emergencyRelation: 'Parent',
  });

  const [checklistForm, setChecklistForm] = useState({
    keyHandedOver: false,
    roomInspected: false,
    bedPrepared: true,
    acRemoteGiven: false,
    rulesAccepted: false,
    notes: '',
  });

  const [noticeForm, setNoticeForm] = useState({
    noticeEndDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    reason: 'Standard 30-day move-out notice',
  });

  const [settleForm, setSettleForm] = useState({
    damageDeductions: '0',
    utilityDeductions: '0',
    otherDeductions: '0',
    inspectionStatus: 'PASSED',
    inspectionNotes: 'All room fittings and keys verified. Full refund approved.',
  });

  const fetchPipeline = async () => {
    setLoading(true);
    try {
      const res = await operationsApi.getLifecyclePipeline();
      setData(res.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load resident lifecycle pipeline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipeline();
  }, []);

  const openAdmitModal = (booking: any) => {
    setSelectedBooking(booking);
    setAdmitForm({
      bedId: booking.bedId || '',
      monthlyRent: '14000',
      depositAmount: booking.depositAmount ? booking.depositAmount.toString() : '28000',
      leaseStartDate: new Date(booking.checkInDate).toISOString().split('T')[0],
      leaseEndDate: new Date(new Date(booking.checkInDate).getTime() + 365 * 86400000).toISOString().split('T')[0],
      emergencyName: 'Guardian',
      emergencyPhone: booking.phone || '',
      emergencyRelation: 'Parent',
    });
    setAdmitModalOpen(true);
  };

  const handleConfirmAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    try {
      await operationsApi.admitBooking({
        bookingId: selectedBooking.id,
        bedId: admitForm.bedId,
        fullName: selectedBooking.name,
        email: selectedBooking.email,
        mobile: selectedBooking.phone,
        monthlyRent: parseFloat(admitForm.monthlyRent),
        depositAmount: parseFloat(admitForm.depositAmount),
        leaseStartDate: admitForm.leaseStartDate,
        leaseEndDate: admitForm.leaseEndDate,
        emergencyContactName: admitForm.emergencyName,
        emergencyContactPhone: admitForm.emergencyPhone,
        emergencyContactRelation: admitForm.emergencyRelation,
      });
      toast.success(`Resident ${selectedBooking.name} admitted successfully! Move-in checklist initialized.`);
      setAdmitModalOpen(false);
      fetchPipeline();
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete admission');
    }
  };

  const openChecklistModal = (resident: any) => {
    setSelectedResident(resident);
    const cl = resident.moveInChecklist || {};
    setChecklistForm({
      keyHandedOver: !!cl.keyHandedOver,
      roomInspected: !!cl.roomInspected,
      bedPrepared: !!cl.bedPrepared,
      acRemoteGiven: !!cl.acRemoteGiven,
      rulesAccepted: !!cl.rulesAccepted,
      notes: cl.notes || '',
    });
    setChecklistModalOpen(true);
  };

  const handleSaveChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResident) return;
    try {
      await operationsApi.updateMoveInChecklist(selectedResident.id, checklistForm);
      toast.success('Move-in checklist updated. Resident is now ACTIVE.');
      setChecklistModalOpen(false);
      fetchPipeline();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update checklist');
    }
  };

  const openNoticeModal = (resident: any) => {
    setSelectedResident(resident);
    setNoticeModalOpen(true);
  };

  const handleInitiateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResident) return;
    try {
      await operationsApi.initiateMoveOutNotice({
        residentId: selectedResident.id,
        noticeEndDate: noticeForm.noticeEndDate,
        reason: noticeForm.reason,
      });
      toast.success('Resident placed on notice period.');
      setNoticeModalOpen(false);
      fetchPipeline();
    } catch (err: any) {
      toast.error(err.message || 'Failed to initiate notice period');
    }
  };

  const openSettlementModal = (resident: any) => {
    setSelectedResident(resident);
    setSettlementModalOpen(true);
  };

  const handleFinalizeSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResident) return;
    try {
      await operationsApi.finalizeMoveOutSettlement({
        residentId: selectedResident.id,
        damageDeductions: parseFloat(settleForm.damageDeductions) || 0,
        utilityDeductions: parseFloat(settleForm.utilityDeductions) || 0,
        otherDeductions: parseFloat(settleForm.otherDeductions) || 0,
        inspectionStatus: settleForm.inspectionStatus,
        inspectionNotes: settleForm.inspectionNotes,
      });
      toast.success('Move-out settled successfully. Bed released for new bookings!');
      setSettlementModalOpen(false);
      fetchPipeline();
    } catch (err: any) {
      toast.error(err.message || 'Settlement failed');
    }
  };

  const summary = data?.summary || {};
  const pipeline = data?.pipeline || {};

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            End-to-End Operating System
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Resident Lifecycle Orchestration
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Connect enquiry, booking, admission, checklist, billing, notice, and deposit settlement in one atomic chain.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchPipeline} className="gap-1.5 self-start sm:self-auto bg-white">
          <RefreshCw className="w-3.5 h-3.5" /> {t('refresh', 'Refresh')}
        </Button>
      </div>

      {/* Stage Flow Counters */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { id: 'leads', label: '1. Enquiries', count: summary.activeLeadsCount || 0, color: 'border-blue-300 bg-blue-50/50 text-blue-900' },
          { id: 'bookings', label: '2. Bookings', count: summary.confirmedBookingsCount || 0, color: 'border-amber-300 bg-amber-50/50 text-amber-900' },
          { id: 'movein', label: '3. Move-In Check', count: summary.pendingMoveInsCount || 0, color: 'border-purple-300 bg-purple-50/50 text-purple-900' },
          { id: 'active', label: '4. Active Residents', count: summary.activeResidentsCount || 0, color: 'border-emerald-300 bg-emerald-50/50 text-emerald-900' },
          { id: 'notice', label: '5. Notice Period', count: summary.noticePeriodCount || 0, color: 'border-rose-300 bg-rose-50/50 text-rose-900' },
          { id: 'settled', label: '6. Settled Exits', count: summary.settlementsCount || 0, color: 'border-slate-300 bg-slate-50 text-slate-900' },
        ].map((stage) => (
          <button
            key={stage.id}
            onClick={() => setActiveTab(stage.id as any)}
            className={`p-3 rounded-xl border text-left transition-all ${stage.color} ${
              activeTab === stage.id ? 'ring-2 ring-emerald-600 shadow-sm' : 'opacity-80 hover:opacity-100'
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider">{stage.label}</p>
            <p className="text-xl font-extrabold mt-1">{stage.count}</p>
          </button>
        ))}
      </div>

      {/* Stage Tab Content */}
      <Card className="p-4 sm:p-6 bg-white border border-slate-200 shadow-xs">
        {/* Stage 1: Leads */}
        {activeTab === 'leads' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Prospect Enquiries & Visits</h3>
            <div className="divide-y divide-slate-100">
              {(pipeline.leads || []).map((lead: any) => (
                <div key={lead.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900">{lead.name}</p>
                    <p className="text-[11px] text-slate-500">{lead.phone} • {lead.email} • Preference: {lead.roomTypePreference || 'Standard'}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    {lead.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stage 2: Bookings Ready for Admission */}
        {activeTab === 'bookings' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Confirmed Bookings Awaiting Admission & Room Handover</h3>
            {(pipeline.bookings || []).length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No bookings waiting for admission.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(pipeline.bookings || []).map((b: any) => (
                  <div key={b.id} className="p-4 rounded-xl border border-amber-200 bg-amber-50/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{b.name}</h4>
                        <p className="text-[11px] text-slate-500">{b.phone} • Check-in: {new Date(b.checkInDate).toISOString().split('T')[0]}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                        {b.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-amber-100">
                      <p className="text-xs font-semibold text-slate-700">Deposit: ₹{b.depositAmount}</p>
                      <Button
                        size="sm"
                        onClick={() => openAdmitModal(b)}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs gap-1"
                      >
                        <FileCheck className="w-3.5 h-3.5" /> Approve & Admit Resident
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stage 3: Move-In Checklists */}
        {activeTab === 'movein' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Pending Move-In Verification Checklists</h3>
            {(pipeline.pendingMoveIns || []).length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No residents awaiting move-in checklist.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {(pipeline.pendingMoveIns || []).map((r: any) => (
                  <div key={r.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{r.fullName}</p>
                      <p className="text-[11px] text-slate-500">Room {r.bed?.room?.number || 'TBD'} • Bed {r.bed?.bedNumber || 'TBD'} • Joined: {new Date(r.joiningDate).toISOString().split('T')[0]}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openChecklistModal(r)} className="text-xs gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verify Checklist
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stage 4: Active Residents */}
        {activeTab === 'active' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Active Residents in Good Standing</h3>
            <div className="divide-y divide-slate-100">
              {(pipeline.activeResidents || []).map((r: any) => (
                <div key={r.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900">{r.fullName}</p>
                    <p className="text-[11px] text-slate-500">{r.mobile} • Room {r.bed?.room?.number || ''} Bed {r.bed?.bedNumber || ''} • Joined {new Date(r.joiningDate).toISOString().split('T')[0]}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openNoticeModal(r)} className="text-xs text-rose-700 hover:bg-rose-50 gap-1 border-rose-200">
                    <Clock className="w-3.5 h-3.5" /> Place on Notice
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stage 5: Notice Period */}
        {activeTab === 'notice' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Residents Serving Notice Period (Upcoming Vacancies)</h3>
            {(pipeline.noticePeriodResidents || []).length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No residents currently on notice period.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {(pipeline.noticePeriodResidents || []).map((r: any) => (
                  <div key={r.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{r.fullName}</p>
                      <p className="text-[11px] text-rose-700 font-semibold">Vacates on: {r.expectedMoveOutDate ? new Date(r.expectedMoveOutDate).toISOString().split('T')[0] : 'N/A'}</p>
                      <p className="text-[10px] text-slate-400">Bed: {r.bed?.room?.number} - {r.bed?.bedNumber}</p>
                    </div>
                    <Button size="sm" onClick={() => openSettlementModal(r)} className="text-xs bg-rose-700 hover:bg-rose-800 text-white gap-1">
                      <LogOut className="w-3.5 h-3.5" /> Finalize Move-Out & Release Bed
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stage 6: Settled Exits */}
        {activeTab === 'settled' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Settled Exits & Released Beds Audit History</h3>
            <div className="divide-y divide-slate-100">
              {(pipeline.settlements || []).map((s: any) => (
                <div key={s.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900">{s.resident?.fullName || 'Resident'}</p>
                    <p className="text-[11px] text-slate-500">Deposit: ₹{s.depositHeld} • Deductions: ₹{s.damageDeductions + s.utilityDeductions + s.unpaidRent} • Refund: ₹{s.netRefundAmount}</p>
                    <p className="text-[10px] text-emerald-700">Bed Released: {s.bedReleased ? 'Yes (Available for booking)' : 'Pending'}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {s.refundStatus}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Modal: Admit Resident from Booking */}
      <Modal isOpen={admitModalOpen} onClose={() => setAdmitModalOpen(false)} title="Admit Resident & Initialize Agreement">
        <form onSubmit={handleConfirmAdmission} className="space-y-4">
          <p className="text-xs text-slate-600">
            Admitting <strong>{selectedBooking?.name}</strong> will create a Resident account, assign the bed, generate an agreement, invoice the move-in rent, and dispatch the move-in checklist.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700">Monthly Rent (₹)</label>
              <input
                type="number"
                value={admitForm.monthlyRent}
                onChange={(e) => setAdmitForm({ ...admitForm, monthlyRent: e.target.value })}
                className="w-full text-xs p-2 rounded border border-slate-200 mt-1"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700">Security Deposit (₹)</label>
              <input
                type="number"
                value={admitForm.depositAmount}
                onChange={(e) => setAdmitForm({ ...admitForm, depositAmount: e.target.value })}
                className="w-full text-xs p-2 rounded border border-slate-200 mt-1"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700">Lease Start Date</label>
              <input
                type="date"
                value={admitForm.leaseStartDate}
                onChange={(e) => setAdmitForm({ ...admitForm, leaseStartDate: e.target.value })}
                className="w-full text-xs p-2 rounded border border-slate-200 mt-1"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700">Lease End Date</label>
              <input
                type="date"
                value={admitForm.leaseEndDate}
                onChange={(e) => setAdmitForm({ ...admitForm, leaseEndDate: e.target.value })}
                className="w-full text-xs p-2 rounded border border-slate-200 mt-1"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" size="sm" onClick={() => setAdmitModalOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white">Execute Admission</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Move-In Checklist */}
      <Modal isOpen={checklistModalOpen} onClose={() => setChecklistModalOpen(false)} title="Move-In Verification Checklist">
        <form onSubmit={handleSaveChecklist} className="space-y-4">
          <p className="text-xs text-slate-600">
            Verify handover items for <strong>{selectedResident?.fullName}</strong>. Checking all items will transition status to ACTIVE.
          </p>

          <div className="space-y-2.5">
            {[
              { key: 'keyHandedOver', label: 'Room & Cupboard Keys Handed Over' },
              { key: 'roomInspected', label: 'Room Cleanliness & Fixtures Inspected with Resident' },
              { key: 'bedPrepared', label: 'Mattress & Bed Frame Prepared in Good Condition' },
              { key: 'acRemoteGiven', label: 'AC Remote & Electrical Switch Handover Completed' },
              { key: 'rulesAccepted', label: 'PG House Rules & Code of Conduct Signed by Resident' },
            ].map((item) => (
              <label key={item.key} className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer p-2 rounded hover:bg-slate-50 border border-slate-100">
                <input
                  type="checkbox"
                  checked={(checklistForm as any)[item.key]}
                  onChange={(e) => setChecklistForm({ ...checklistForm, [item.key]: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="font-medium">{item.label}</span>
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" size="sm" onClick={() => setChecklistModalOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white">Confirm Handover</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Initiate Notice */}
      <Modal isOpen={noticeModalOpen} onClose={() => setNoticeModalOpen(false)} title="Initiate Move-Out Notice Period">
        <form onSubmit={handleInitiateNotice} className="space-y-4">
          <p className="text-xs text-slate-600">
            Set notice period for <strong>{selectedResident?.fullName}</strong>. This flags the room for upcoming vacancy in the visual map.
          </p>
          <div>
            <label className="text-[11px] font-bold text-slate-700">Expected Vacate Date</label>
            <input
              type="date"
              value={noticeForm.noticeEndDate}
              onChange={(e) => setNoticeForm({ ...noticeForm, noticeEndDate: e.target.value })}
              className="w-full text-xs p-2 rounded border border-slate-200 mt-1"
              required
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-700">Reason / Notes</label>
            <textarea
              value={noticeForm.reason}
              onChange={(e) => setNoticeForm({ ...noticeForm, reason: e.target.value })}
              className="w-full text-xs p-2 rounded border border-slate-200 mt-1"
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" size="sm" onClick={() => setNoticeModalOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="bg-rose-700 hover:bg-rose-800 text-white">Place on Notice</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Finalize Move-Out Settlement */}
      <Modal isOpen={settlementModalOpen} onClose={() => setSettlementModalOpen(false)} title="Finalize Move-Out Settlement & Release Bed">
        <form onSubmit={handleFinalizeSettlement} className="space-y-4">
          <p className="text-xs text-slate-600">
            Final settlement for <strong>{selectedResident?.fullName}</strong>. This deducts damages/utilities from deposit, settles account, and immediately releases the bed for new bookings.
          </p>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700">Damage Deductions (₹)</label>
              <input
                type="number"
                value={settleForm.damageDeductions}
                onChange={(e) => setSettleForm({ ...settleForm, damageDeductions: e.target.value })}
                className="w-full text-xs p-2 rounded border border-slate-200 mt-1"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700">Utility Deductions (₹)</label>
              <input
                type="number"
                value={settleForm.utilityDeductions}
                onChange={(e) => setSettleForm({ ...settleForm, utilityDeductions: e.target.value })}
                className="w-full text-xs p-2 rounded border border-slate-200 mt-1"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700">Other Deductions (₹)</label>
              <input
                type="number"
                value={settleForm.otherDeductions}
                onChange={(e) => setSettleForm({ ...settleForm, otherDeductions: e.target.value })}
                className="w-full text-xs p-2 rounded border border-slate-200 mt-1"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700">Room Inspection Status</label>
            <select
              value={settleForm.inspectionStatus}
              onChange={(e) => setSettleForm({ ...settleForm, inspectionStatus: e.target.value })}
              className="w-full text-xs p-2 rounded border border-slate-200 mt-1"
            >
              <option value="PASSED">Passed (No Damages)</option>
              <option value="MINOR_DAMAGES">Minor Damages Deducted</option>
              <option value="MAJOR_DAMAGES">Major Repairs Required</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700">Settlement Notes</label>
            <textarea
              value={settleForm.inspectionNotes}
              onChange={(e) => setSettleForm({ ...settleForm, inspectionNotes: e.target.value })}
              className="w-full text-xs p-2 rounded border border-slate-200 mt-1"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" size="sm" onClick={() => setSettlementModalOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="bg-rose-700 hover:bg-rose-800 text-white">Execute Settlement & Free Bed</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
