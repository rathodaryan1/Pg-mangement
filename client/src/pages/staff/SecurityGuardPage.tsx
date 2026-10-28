import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  QrCode,
  LogIn,
  LogOut,
  UserPlus,
  AlertOctagon,
  Clock,
  Truck,
  RefreshCw,
  Camera,
  AlertCircle,
  XCircle,
  CheckCircle2,
  UserCheck,
  Key,
  Building2,
  Calendar,
  CheckCircle
} from 'lucide-react';
import { saasApi } from '../../services/saasApi';
import { operationsApi } from '../../services/operationsApi';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Button, PrimaryButton, SecondaryButton } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { QrCameraScanner } from '../../components/ui/QrCameraScanner';
import { PageHeader } from '../../components/ui/PageHeader';
import { FilterBar } from '../../components/ui/FilterBar';
import { FormField } from '../../components/ui/FormField';
import { toast } from '../../context/ToastContext';

export const SecurityGuardPage: React.FC = () => {
  const { activeProperty } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'visitors' | 'parcels'>('visitors');
  const [visitors, setVisitors] = useState<any[]>([]);
  const [parcels, setParcels] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [qrToken, setQrToken] = useState('');
  const [search, setSearch] = useState('');
  const [visitorFilter, setVisitorFilter] = useState<'ALL' | 'CHECKED_IN' | 'APPROVED' | 'OVERDUE'>('ALL');

  // Scanner & Verification Modals
  const [cameraScannerOpen, setCameraScannerOpen] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifiedPass, setVerifiedPass] = useState<any | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Walk-in form state
  const [walkInModalOpen, setWalkInModalOpen] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [visitorMobile, setVisitorMobile] = useState('');
  const [purpose, setPurpose] = useState('Delivery (Swiggy/Zomato/Amazon)');
  const [residentRoom, setResidentRoom] = useState('');

  // Parcel form state
  const [parcelModalOpen, setParcelModalOpen] = useState(false);
  const [collectModalOpen, setCollectModalOpen] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState<any | null>(null);
  const [recipientName, setRecipientName] = useState('');
  const [recipientRoom, setRecipientRoom] = useState('');
  const [courierCompany, setCourierCompany] = useState('Amazon');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [pickupPinInput, setPickupPinInput] = useState('');

  const fetchGuardDesk = async () => {
    setLoading(true);
    try {
      const [vRes, sRes, pRes] = await Promise.all([
        saasApi.getVisitorLog(),
        saasApi.getGuardDashboard(),
        operationsApi.getParcels(),
      ]);
      setVisitors(vRes.data || []);
      setStats(sRes.data || {});
      setParcels((pRes.data as any[]) || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load security desk');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuardDesk();
  }, []);

  // -------------------------------------------------------------
  // QR Verification Workflow (Camera or Manual Token)
  // -------------------------------------------------------------
  const handleVerifyPassToken = async (tokenString: string) => {
    const cleanToken = tokenString.trim();
    if (!cleanToken) {
      toast.error('Please scan or enter a visitor pass token');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await saasApi.verifyPass({ token: cleanToken });
      if (res.data) {
        setVerifiedPass(res.data);
        setVerifyModalOpen(true);
        if (cameraScannerOpen) setCameraScannerOpen(false);
      } else {
        toast.error('Pass verification returned no record');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to verify visitor QR pass');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleConfirmCheckIn = async (passIdOrToken: string) => {
    setIsProcessingAction(true);
    try {
      await saasApi.checkInVisitor({ token: passIdOrToken, visitorId: passIdOrToken });
      toast.success('Visitor gate check-in confirmed successfully');
      setVerifyModalOpen(false);
      setVerifiedPass(null);
      setQrToken('');
      fetchGuardDesk();
    } catch (err: any) {
      toast.error(err.message || 'Failed to check in visitor');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleConfirmCheckOut = async (visitorId: string) => {
    setIsProcessingAction(true);
    try {
      await saasApi.checkOutVisitor({ visitorId });
      toast.success('Visitor departure logged — Gate pass completed');
      setVerifyModalOpen(false);
      setVerifiedPass(null);
      setQrToken('');
      fetchGuardDesk();
    } catch (err: any) {
      toast.error(err.message || 'Failed to check out visitor');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDirectWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await saasApi.registerDirectEntry({
        visitorName,
        visitorMobile,
        purpose,
        propertyId: activeProperty?.id,
      });
      toast.success('Walk-in visitor entry recorded');
      setWalkInModalOpen(false);
      setVisitorName('');
      setVisitorMobile('');
      setResidentRoom('');
      fetchGuardDesk();
    } catch (err: any) {
      toast.error(err.message || 'Failed to log entry');
    }
  };

  const handleRegisterParcel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await operationsApi.registerParcel({
        recipientName,
        recipientRoom,
        courierCompany,
        trackingNumber,
      });
      toast.success(res.message || 'Inward parcel registered successfully');
      setParcelModalOpen(false);
      setRecipientName('');
      setRecipientRoom('');
      setTrackingNumber('');
      fetchGuardDesk();
    } catch (err: any) {
      toast.error(err.message || 'Failed to register parcel');
    }
  };

  const openCollectModal = (parcel: any) => {
    setSelectedParcel(parcel);
    setPickupPinInput('');
    setCollectModalOpen(true);
  };

  const handleConfirmPickup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParcel) return;
    try {
      await operationsApi.collectParcel(selectedParcel.id, {
        pickupPin: pickupPinInput.trim(),
      });
      toast.success('Parcel handover verified and completed');
      setCollectModalOpen(false);
      fetchGuardDesk();
    } catch (err: any) {
      toast.error(err.message || 'Handover verification failed');
    }
  };

  // Helper: check if a visitor is overdue (> 8h checked in or past expected exit)
  const isVisitorOverdue = (v: any): boolean => {
    if (v.status !== 'CHECKED_IN') return false;
    if (v.checkInTime) {
      const checkInMs = new Date(v.checkInTime).getTime();
      const elapsedHours = (Date.now() - checkInMs) / (1000 * 60 * 60);
      if (elapsedHours > 8) return true;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    const visitDateStr = typeof v.visitDate === 'string' ? v.visitDate.split('T')[0] : '';
    if (visitDateStr && visitDateStr < todayStr) return true;
    return false;
  };

  // Filtering visitors
  const filteredVisitors = visitors.filter((v) => {
    const matchesSearch =
      v.visitorName?.toLowerCase().includes(search.toLowerCase()) ||
      v.visitorMobile?.includes(search) ||
      v.residentName?.toLowerCase().includes(search.toLowerCase()) ||
      v.residentRoom?.toLowerCase().includes(search.toLowerCase()) ||
      v.qrPassToken?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (visitorFilter === 'CHECKED_IN') return v.status === 'CHECKED_IN';
    if (visitorFilter === 'APPROVED') return v.status === 'APPROVED';
    if (visitorFilter === 'OVERDUE') return isVisitorOverdue(v);

    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ========================================================
          1. PAGE HEADER
         ======================================================== */}
      <PageHeader
        title="Security & Gate Desk"
        description="Real-time camera QR scanning, visitor gate passes, courier parcel management, and emergency response."
        breadcrumbs={[
          { label: 'Operations', href: '/staff/security' },
          { label: 'Security & Gate Desk' },
        ]}
        badge={
          activeProperty && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF5EB] text-[#B9954E] border border-[#C8A45D]/40 text-xs font-bold">
              <Building2 className="w-3.5 h-3.5 text-[#0B4036]" />
              {activeProperty.name}
            </span>
          )
        }
      >
        <SecondaryButton size="sm" onClick={fetchGuardDesk} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
          Refresh Desk
        </SecondaryButton>
        <PrimaryButton
          size="sm"
          onClick={() => setCameraScannerOpen(true)}
          leftIcon={<Camera className="w-3.5 h-3.5 text-[#C8A45D]" />}
          className="bg-[#0B4036] hover:bg-[#123F36] text-white shadow-xs"
        >
          Scan QR Camera
        </PrimaryButton>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setWalkInModalOpen(true)}
          leftIcon={<UserPlus className="w-3.5 h-3.5" />}
        >
          Log Walk-In
        </Button>
        <Button
          size="sm"
          variant="gold"
          onClick={() => setParcelModalOpen(true)}
          leftIcon={<Truck className="w-3.5 h-3.5" />}
        >
          Inward Parcel
        </Button>
      </PageHeader>

      {/* ========================================================
          2. CRITICAL EMERGENCY SOS BANNER (Only when active)
         ======================================================== */}
      {stats?.activeSOS && stats.activeSOS.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-600 text-white shadow-md flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <AlertOctagon className="w-8 h-8 text-white shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-white text-rose-700">
                  CRITICAL EMERGENCY ALARM
                </span>
                <span className="text-xs font-mono opacity-90">
                  {stats.activeSOS.length} ACTIVE INCIDENT(S)
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold text-rose-100">
                {stats.activeSOS[0].location || 'Resident Wing'} • {stats.activeSOS[0].message || 'Resident triggered SOS'}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={fetchGuardDesk}
            className="bg-white text-rose-700 hover:bg-rose-50 font-bold border border-rose-200"
          >
            Acknowledge & Dispatch
          </Button>
        </div>
      )}

      {/* ========================================================
          3. SUMMARY METRIC CARDS
         ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Visitors Inside Now"
          value={stats?.insideCount || 0}
          subtitle="Currently inside property"
          icon={UserCheck}
          color="forest"
          onClick={() => {
            setActiveTab('visitors');
            setVisitorFilter('CHECKED_IN');
          }}
        />
        <StatCard
          title="Approved & Expected"
          value={stats?.expectedCount || 0}
          subtitle="Valid passes awaiting arrival"
          icon={Clock}
          color="gold"
          onClick={() => {
            setActiveTab('visitors');
            setVisitorFilter('APPROVED');
          }}
        />
        <StatCard
          title="Overdue Exits"
          value={stats?.overdueCount || 0}
          subtitle="Exceeded 8h or visit date"
          icon={AlertCircle}
          color="rose"
          onClick={() => {
            setActiveTab('visitors');
            setVisitorFilter('OVERDUE');
          }}
        />
        <StatCard
          title="Pending Parcels"
          value={parcels.filter((p) => p.status === 'RECEIVED').length}
          subtitle="Awaiting resident pickup"
          icon={Truck}
          color="slate"
          onClick={() => setActiveTab('parcels')}
        />
      </div>

      {/* ========================================================
          4. QR VERIFICATION & PASS LOOKUP PANEL
         ======================================================== */}
      <Card className="p-5 border border-[#DDE2DD] bg-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#18231F] flex items-center gap-2">
              <QrCode className="w-4 h-4 text-[#0B4036]" /> Quick Pass Verification & Gate Scanner
            </h3>
            <p className="text-xs text-[#68736D]">
              Scan visitor QR code via camera or enter alphanumeric pass token (e.g. VPASS-XXXXXXXX).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCameraScannerOpen(true)}
              leftIcon={<Camera className="w-3.5 h-3.5 text-[#0B4036]" />}
              className="w-full sm:w-auto border-[#0B4036]/30 text-[#0B4036] bg-[#EAF2EE]/50 hover:bg-[#EAF2EE]"
            >
              Open Camera Scanner
            </Button>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerifyPassToken(qrToken);
              }}
              className="flex items-center gap-1.5 w-full sm:w-auto"
            >
              <input
                type="text"
                placeholder="Enter pass token..."
                value={qrToken}
                onChange={(e) => setQrToken(e.target.value.toUpperCase())}
                className="w-full sm:w-52 px-3 py-1.5 text-xs bg-[#F8F7F3] border border-[#DDE2DD] rounded-lg text-[#18231F] font-mono uppercase focus:ring-2 focus:ring-[#0B4036]/20 focus:border-[#0B4036]"
              />
              <PrimaryButton
                type="submit"
                size="sm"
                isLoading={isVerifying}
                className="shrink-0"
              >
                Verify
              </PrimaryButton>
            </form>
          </div>
        </div>
      </Card>

      {/* ========================================================
          5. OPERATIONAL TABS
         ======================================================== */}
      <div className="flex items-center gap-2 border-b border-[#DDE2DD] pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('visitors')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'visitors'
              ? 'bg-[#0B4036] text-white shadow-xs'
              : 'text-[#68736D] hover:bg-[#EAF2EE] hover:text-[#0B4036]'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Visitor & Gate Pass Register
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'visitors' ? 'bg-white/20' : 'bg-[#DDE2DD]'}`}>
            {visitors.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('parcels')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'parcels'
              ? 'bg-[#0B4036] text-white shadow-xs'
              : 'text-[#68736D] hover:bg-[#EAF2EE] hover:text-[#0B4036]'
          }`}
        >
          <Truck className="w-4 h-4" />
          Courier & Parcel Desk
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'parcels' ? 'bg-white/20' : 'bg-[#DDE2DD]'}`}>
            {parcels.length}
          </span>
        </button>
      </div>

      {/* ========================================================
          6. TAB CONTENT: VISITOR REGISTER
         ======================================================== */}
      {activeTab === 'visitors' && (
        <div className="space-y-4">
          <FilterBar
            search={{
              value: search,
              onChange: setSearch,
              placeholder: 'Search visitor, mobile, room, token...',
            }}
            filterPills={{
              active: visitorFilter,
              onChange: (v: any) => setVisitorFilter(v),
              options: [
                { label: 'All Passes', value: 'ALL', count: visitors.length },
                { label: 'Inside Now', value: 'CHECKED_IN', count: visitors.filter((v) => v.status === 'CHECKED_IN').length },
                { label: 'Approved', value: 'APPROVED', count: visitors.filter((v) => v.status === 'APPROVED').length },
                { label: 'Overdue', value: 'OVERDUE', count: visitors.filter(isVisitorOverdue).length },
              ],
            }}
          />

          <div className="w-full overflow-x-auto rounded-xl border border-[#DDE2DD] bg-white shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F8F7F3] border-b border-[#DDE2DD]">
                <tr>
                  <th className="px-4 py-3 font-semibold text-[#68736D] uppercase tracking-wider text-[11px]">Visitor Name</th>
                  <th className="px-4 py-3 font-semibold text-[#68736D] uppercase tracking-wider text-[11px]">Resident & Room</th>
                  <th className="px-4 py-3 font-semibold text-[#68736D] uppercase tracking-wider text-[11px]">Purpose / Relation</th>
                  <th className="px-4 py-3 font-semibold text-[#68736D] uppercase tracking-wider text-[11px]">Visit Window</th>
                  <th className="px-4 py-3 font-semibold text-[#68736D] uppercase tracking-wider text-[11px]">Check-In / Out</th>
                  <th className="px-4 py-3 font-semibold text-[#68736D] uppercase tracking-wider text-[11px]">Status</th>
                  <th className="px-4 py-3 font-semibold text-[#68736D] uppercase tracking-wider text-[11px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVisitors.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-[#8A928D]">
                      No visitor records matching current filter.
                    </td>
                  </tr>
                ) : (
                  filteredVisitors.map((v) => {
                    const overdue = isVisitorOverdue(v);
                    return (
                      <tr key={v.id} className={`hover:bg-[#F8F7F3]/80 transition-colors ${overdue ? 'bg-rose-50/40' : ''}`}>
                        <td className="px-4 py-3 font-bold text-[#18231F]">
                          <div className="flex items-center gap-2">
                            <span>{v.visitorName}</span>
                            {overdue && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-200">
                                Overdue
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-[#8A928D] block">{v.visitorMobile}</span>
                        </td>

                        <td className="px-4 py-3">
                          <span className="font-semibold text-[#18231F] block">{v.residentName || 'Resident Host'}</span>
                          <span className="text-[11px] text-[#0B4036] font-bold">Room {v.residentRoom || 'N/A'}</span>
                        </td>

                        <td className="px-4 py-3 text-[#68736D]">
                          <span className="block font-medium">{v.purpose || 'Visit'}</span>
                          <span className="text-[11px] text-[#8A928D]">{v.relation || 'Guest'}</span>
                        </td>

                        <td className="px-4 py-3 text-[#68736D] whitespace-nowrap">
                          <span className="font-medium block">
                            {typeof v.visitDate === 'string' ? v.visitDate.split('T')[0] : 'Today'}
                          </span>
                          <span className="text-[11px] text-[#8A928D]">
                            {v.expectedEntryTime || '10:00 AM'} - {v.expectedExitTime || '08:00 PM'}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-[#68736D] whitespace-nowrap">
                          {v.checkInTime ? (
                            <span className="text-[11px] text-[#0B4036] font-semibold block">
                              In: {new Date(v.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#8A928D] block">In: —</span>
                          )}
                          {v.checkOutTime ? (
                            <span className="text-[11px] text-slate-500 font-semibold block">
                              Out: {new Date(v.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          ) : null}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={v.status} />
                        </td>

                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {v.status === 'APPROVED' && (
                            <PrimaryButton
                              size="xs"
                              onClick={() => handleConfirmCheckIn(v.qrPassToken || v.id)}
                              leftIcon={<LogIn className="w-3 h-3" />}
                            >
                              Check In
                            </PrimaryButton>
                          )}
                          {v.status === 'CHECKED_IN' && (
                            <Button
                              size="xs"
                              variant="secondary"
                              onClick={() => handleConfirmCheckOut(v.id)}
                              leftIcon={<LogOut className="w-3 h-3 text-[#C8A45D]" />}
                            >
                              Check Out
                            </Button>
                          )}
                          {v.status === 'PENDING' && (
                            <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Awaiting Approval
                            </span>
                          )}
                          {v.status === 'CHECKED_OUT' && (
                            <span className="text-[11px] font-medium text-[#8A928D]">
                              Completed
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          7. TAB CONTENT: PARCELS & COURIER DESK
         ======================================================== */}
      {activeTab === 'parcels' && (
        <div className="space-y-4">
          <FilterBar
            search={{
              value: search,
              onChange: setSearch,
              placeholder: 'Search parcel by recipient or tracking...',
            }}
          >
            <Button
              size="sm"
              variant="primary"
              onClick={() => setParcelModalOpen(true)}
              leftIcon={<Truck className="w-3.5 h-3.5 text-[#C8A45D]" />}
            >
              Inward New Parcel
            </Button>
          </FilterBar>

          <div className="w-full overflow-x-auto rounded-xl border border-[#DDE2DD] bg-white shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F8F7F3] border-b border-[#DDE2DD]">
                <tr>
                  <th className="px-4 py-3 font-semibold text-[#68736D] uppercase tracking-wider text-[11px]">Courier / Partner</th>
                  <th className="px-4 py-3 font-semibold text-[#68736D] uppercase tracking-wider text-[11px]">Recipient & Room</th>
                  <th className="px-4 py-3 font-semibold text-[#68736D] uppercase tracking-wider text-[11px]">Tracking #</th>
                  <th className="px-4 py-3 font-semibold text-[#68736D] uppercase tracking-wider text-[11px]">Received At</th>
                  <th className="px-4 py-3 font-semibold text-[#68736D] uppercase tracking-wider text-[11px]">Status</th>
                  <th className="px-4 py-3 font-semibold text-[#68736D] uppercase tracking-wider text-[11px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parcels.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-[#8A928D]">
                      No inward parcels logged yet.
                    </td>
                  </tr>
                ) : (
                  parcels.map((p) => (
                    <tr key={p.id} className="hover:bg-[#F8F7F3]/80 transition-colors">
                      <td className="px-4 py-3 font-bold text-[#18231F] flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-[#EAF2EE] text-[#0B4036] flex items-center justify-center font-bold text-[10px]">
                          {p.courierCompany?.[0] || 'C'}
                        </div>
                        {p.courierCompany || 'Courier'}
                      </td>

                      <td className="px-4 py-3">
                        <span className="font-semibold text-[#18231F] block">{p.recipientName}</span>
                        <span className="text-[11px] text-[#0B4036] font-bold">Room {p.recipientRoom || 'N/A'}</span>
                      </td>

                      <td className="px-4 py-3 font-mono text-[11px] text-[#68736D]">
                        {p.trackingNumber || 'N/A'}
                      </td>

                      <td className="px-4 py-3 text-[#68736D] whitespace-nowrap">
                        {new Date(p.createdAt || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={p.status} />
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {p.status === 'RECEIVED' ? (
                          <PrimaryButton
                            size="xs"
                            onClick={() => openCollectModal(p)}
                            leftIcon={<Key className="w-3 h-3 text-[#C8A45D]" />}
                          >
                            Verify Handover
                          </PrimaryButton>
                        ) : (
                          <span className="text-[11px] text-emerald-700 font-semibold flex items-center justify-end gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Collected
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CAMERA QR SCANNER
         ======================================================== */}
      {cameraScannerOpen && (
        <Modal
          isOpen={cameraScannerOpen}
          onClose={() => setCameraScannerOpen(false)}
          title="Scan Visitor Gate Pass QR"
          maxWidth="md"
        >
          <div className="space-y-4">
            <p className="text-xs text-[#68736D]">
              Position the resident's dynamic visitor QR pass in front of your camera to auto-scan.
            </p>
            <QrCameraScanner
              onScan={(detectedToken) => {
                handleVerifyPassToken(detectedToken);
              }}
              onClose={() => setCameraScannerOpen(false)}
            />
          </div>
        </Modal>
      )}

      {/* ========================================================
          MODAL: PASS VERIFICATION PREVIEW MODAL
         ======================================================== */}
      {verifyModalOpen && verifiedPass && (
        <Modal
          isOpen={verifyModalOpen}
          onClose={() => {
            setVerifyModalOpen(false);
            setVerifiedPass(null);
          }}
          title="Verified Gate Pass Preview"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border flex items-start justify-between ${
              verifiedPass.isValid ? 'bg-[#EAF2EE]/60 border-[#0B4036]/20' : 'bg-rose-50 border-rose-200'
            }`}>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[#0B4036] bg-white px-2 py-0.5 rounded border border-[#DDE2DD]">
                    {verifiedPass.qrPassToken || verifiedPass.id}
                  </span>
                  <StatusBadge status={verifiedPass.status} />
                </div>
                <h3 className="mt-2 text-base font-extrabold text-[#18231F]">{verifiedPass.visitorName}</h3>
                <p className="text-xs text-[#68736D] font-mono">{verifiedPass.visitorMobile}</p>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-semibold text-[#8A928D] block">Host Resident</span>
                <span className="text-xs font-bold text-[#18231F] block">{verifiedPass.residentName}</span>
                <span className="text-xs font-black text-[#0B4036]">Room {verifiedPass.residentRoom || 'N/A'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#F8F7F3] rounded-lg border border-[#DDE2DD]">
                <span className="text-[10px] font-bold text-[#8A928D] uppercase block">Relation / Purpose</span>
                <span className="font-semibold text-[#18231F] mt-0.5 block">
                  {verifiedPass.relation || 'Guest'} • {verifiedPass.purpose || 'Visit'}
                </span>
              </div>
              <div className="p-3 bg-[#F8F7F3] rounded-lg border border-[#DDE2DD]">
                <span className="text-[10px] font-bold text-[#8A928D] uppercase block">Visit Window</span>
                <span className="font-semibold text-[#18231F] mt-0.5 block">
                  {verifiedPass.expectedEntryTime || '10:00 AM'} - {verifiedPass.expectedExitTime || '08:00 PM'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#DDE2DD]">
              <SecondaryButton
                size="sm"
                onClick={() => {
                  setVerifyModalOpen(false);
                  setVerifiedPass(null);
                }}
              >
                Close
              </SecondaryButton>

              {verifiedPass.canCheckIn && (
                <PrimaryButton
                  size="sm"
                  onClick={() => handleConfirmCheckIn(verifiedPass.qrPassToken || verifiedPass.id)}
                  isLoading={isProcessingAction}
                  leftIcon={<LogIn className="w-3.5 h-3.5" />}
                >
                  Confirm Gate Check-In
                </PrimaryButton>
              )}

              {verifiedPass.canCheckOut && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleConfirmCheckOut(verifiedPass.id)}
                  isLoading={isProcessingAction}
                  leftIcon={<LogOut className="w-3.5 h-3.5 text-[#C8A45D]" />}
                >
                  Confirm Gate Check-Out
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================
          MODAL: LOG DIRECT WALK-IN VISITOR
         ======================================================== */}
      {walkInModalOpen && (
        <Modal
          isOpen={walkInModalOpen}
          onClose={() => setWalkInModalOpen(false)}
          title="Log Direct Walk-in Entry"
          maxWidth="md"
        >
          <form onSubmit={handleDirectWalkIn} className="space-y-4">
            <FormField label="Visitor Full Name" required>
              <input
                type="text"
                required
                placeholder="e.g. Rahul Sharma"
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F8F7F3] border border-[#DDE2DD] rounded-lg"
              />
            </FormField>

            <FormField label="Visitor Mobile Number" required>
              <input
                type="tel"
                required
                placeholder="10-digit mobile"
                value={visitorMobile}
                onChange={(e) => setVisitorMobile(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F8F7F3] border border-[#DDE2DD] rounded-lg font-mono"
              />
            </FormField>

            <FormField label="Host Resident Room Number" required>
              <input
                type="text"
                required
                placeholder="e.g. 101 or Common Area"
                value={residentRoom}
                onChange={(e) => setResidentRoom(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F8F7F3] border border-[#DDE2DD] rounded-lg"
              />
            </FormField>

            <FormField label="Purpose of Entry" required>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F8F7F3] border border-[#DDE2DD] rounded-lg"
              >
                <option value="Delivery (Swiggy/Zomato/Amazon)">Delivery (Swiggy/Zomato/Amazon)</option>
                <option value="Personal Guest / Friend">Personal Guest / Friend</option>
                <option value="Parent / Family Member">Parent / Family Member</option>
                <option value="Maintenance / Service Tech">Maintenance / Service Tech</option>
                <option value="Other Official Visit">Other Official Visit</option>
              </select>
            </FormField>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#DDE2DD]">
              <SecondaryButton size="sm" type="button" onClick={() => setWalkInModalOpen(false)}>
                Cancel
              </SecondaryButton>
              <PrimaryButton size="sm" type="submit">
                Log Gate Entry
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================
          MODAL: INWARD PARCEL REGISTRATION
         ======================================================== */}
      {parcelModalOpen && (
        <Modal
          isOpen={parcelModalOpen}
          onClose={() => setParcelModalOpen(false)}
          title="Inward New Courier Parcel"
          maxWidth="md"
        >
          <form onSubmit={handleRegisterParcel} className="space-y-4">
            <FormField label="Recipient Resident Full Name" required>
              <input
                type="text"
                required
                placeholder="e.g. Aakash Verma"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F8F7F3] border border-[#DDE2DD] rounded-lg"
              />
            </FormField>

            <FormField label="Recipient Room Number" required>
              <input
                type="text"
                required
                placeholder="e.g. 101"
                value={recipientRoom}
                onChange={(e) => setRecipientRoom(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F8F7F3] border border-[#DDE2DD] rounded-lg"
              />
            </FormField>

            <FormField label="Courier Company / Delivery Partner" required>
              <select
                value={courierCompany}
                onChange={(e) => setCourierCompany(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F8F7F3] border border-[#DDE2DD] rounded-lg"
              >
                <option value="Amazon">Amazon</option>
                <option value="Flipkart">Flipkart</option>
                <option value="BlueDart">BlueDart</option>
                <option value="Delhivery">Delhivery</option>
                <option value="DTDC">DTDC</option>
                <option value="Speed Post">India Post (Speed Post)</option>
                <option value="Other Courier">Other Courier</option>
              </select>
            </FormField>

            <FormField label="Tracking / Waybill Number (Optional)">
              <input
                type="text"
                placeholder="Waybill / AWB code"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F8F7F3] border border-[#DDE2DD] rounded-lg font-mono"
              />
            </FormField>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#DDE2DD]">
              <SecondaryButton size="sm" type="button" onClick={() => setParcelModalOpen(false)}>
                Cancel
              </SecondaryButton>
              <PrimaryButton size="sm" type="submit">
                Register Inward Parcel
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================
          MODAL: PARCEL HANDOVER VERIFICATION WITH PIN
         ======================================================== */}
      {collectModalOpen && selectedParcel && (
        <Modal
          isOpen={collectModalOpen}
          onClose={() => setCollectModalOpen(false)}
          title="Verify Resident Parcel Handover"
          maxWidth="sm"
        >
          <form onSubmit={handleConfirmPickup} className="space-y-4">
            <div className="p-3 bg-[#F8F7F3] rounded-lg border border-[#DDE2DD]">
              <span className="text-[10px] font-bold text-[#8A928D] uppercase block">Parcel For</span>
              <p className="text-xs font-bold text-[#18231F] mt-0.5">
                {selectedParcel.recipientName} • Room {selectedParcel.recipientRoom}
              </p>
              <p className="text-[11px] text-[#68736D] mt-0.5">
                {selectedParcel.courierCompany} ({selectedParcel.trackingNumber || 'No AWB'})
              </p>
            </div>

            <FormField label="Resident Collection PIN" required helperText="Ask the resident for the 4-digit PIN sent to their app">
              <input
                type="text"
                required
                maxLength={6}
                placeholder="Enter PIN..."
                value={pickupPinInput}
                onChange={(e) => setPickupPinInput(e.target.value)}
                className="w-full px-3 py-2 text-center text-lg font-mono tracking-widest bg-[#F8F7F3] border border-[#DDE2DD] rounded-lg text-[#0B4036] font-bold"
              />
            </FormField>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#DDE2DD]">
              <SecondaryButton size="sm" type="button" onClick={() => setCollectModalOpen(false)}>
                Cancel
              </SecondaryButton>
              <PrimaryButton size="sm" type="submit">
                Confirm Handover
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
