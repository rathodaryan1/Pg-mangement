import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  QrCode,
  LogIn,
  LogOut,
  UserPlus,
  Search,
  AlertOctagon,
  Clock,
  CheckCircle,
  Truck,
  RefreshCw,
  Camera,
  Scan,
  AlertCircle,
  XCircle,
  CheckCircle2,
  UserCheck,
  Key,
} from 'lucide-react';
import { saasApi } from '../../services/saasApi';
import { operationsApi } from '../../services/operationsApi';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { QrCameraScanner } from '../../components/ui/QrCameraScanner';
import { toast } from '../../context/ToastContext';

export const SecurityGuardPage: React.FC = () => {
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
        setCameraScannerOpen(false);
        setVerifyModalOpen(true);
      } else {
        toast.error('Invalid pass verification response from server');
      }
    } catch (err: any) {
      toast.error(err.message || 'Pass verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleConfirmCheckIn = async (passIdOrToken: string) => {
    setIsProcessingAction(true);
    try {
      const res = await saasApi.checkInVisitor({ token: passIdOrToken });
      toast.success(res.message || 'Visitor admitted and checked in!');
      setVerifyModalOpen(false);
      setVerifiedPass(null);
      setQrToken('');
      fetchGuardDesk();
    } catch (err: any) {
      toast.error(err.message || 'Check-in failed');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleConfirmCheckOut = async (passIdOrToken: string) => {
    setIsProcessingAction(true);
    try {
      const res = await saasApi.checkOutVisitor({ token: passIdOrToken });
      toast.success(res.message || 'Visitor checkout recorded!');
      setVerifyModalOpen(false);
      setVerifiedPass(null);
      setQrToken('');
      fetchGuardDesk();
    } catch (err: any) {
      toast.error(err.message || 'Check-out failed');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDirectCheckIn = async (vId: string) => {
    try {
      await saasApi.checkInVisitor({ visitorId: vId });
      toast.success('Visitor marked as Checked In');
      fetchGuardDesk();
    } catch (err: any) {
      toast.error(err.message || 'Check-in failed');
    }
  };

  const handleDirectCheckOut = async (vId: string) => {
    try {
      await saasApi.checkOutVisitor({ visitorId: vId });
      toast.success('Visitor marked as Checked Out');
      fetchGuardDesk();
    } catch (err: any) {
      toast.error(err.message || 'Check-out failed');
    }
  };

  const handleRegisterWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saasApi.registerDirectEntry({
        visitorName,
        visitorMobile,
        purpose: `${purpose}${residentRoom ? ` - Room ${residentRoom}` : ''}`,
      });
      toast.success('Walk-in entry logged and admitted!');
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
      toast.success(res.message || 'Parcel registered successfully');
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
    <div className="min-h-screen bg-[#F8F9FA] p-4 sm:p-6 lg:p-8 text-slate-900">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-800 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Security & Gate Desk Portal
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Main Gate Visitor Pass & Delivery Desk
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Integrated camera QR verification, resident visitor gate access, courier management, and emergency alerts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={fetchGuardDesk} className="gap-1.5 bg-white border-slate-200">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setCameraScannerOpen(true)}
            className="gap-1.5 bg-indigo-700 hover:bg-indigo-800 text-white shadow-xs"
          >
            <Camera className="w-3.5 h-3.5" /> Scan QR Camera
          </Button>
          <Button size="sm" onClick={() => setWalkInModalOpen(true)} className="gap-1.5 bg-slate-800 hover:bg-slate-900 text-white">
            <UserPlus className="w-3.5 h-3.5" /> Log Walk-in
          </Button>
          <Button size="sm" onClick={() => setParcelModalOpen(true)} className="gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white">
            <Truck className="w-3.5 h-3.5" /> Inward Parcel
          </Button>
        </div>
      </div>

      {/* Emergency SOS Banner (If Active) */}
      {stats?.activeSOS && stats.activeSOS.length > 0 && (
        <div className="max-w-7xl mx-auto mb-6 p-4 rounded-xl bg-rose-600 text-white shadow-lg animate-pulse flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertOctagon className="w-7 h-7 text-white shrink-0" />
            <div>
              <p className="font-extrabold text-base">CRITICAL EMERGENCY SOS ACTIVE</p>
              <p className="text-xs text-rose-100">
                Triggered by: {stats.activeSOS[0]?.resident?.fullName} (Room {stats.activeSOS[0]?.resident?.bed?.room?.number || 'N/A'}) - Tel: {stats.activeSOS[0]?.resident?.mobile}
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded bg-white text-rose-700 text-xs font-bold uppercase">
            Respond Immediately
          </span>
        </div>
      )}

      {/* Quick QR Scanner & Metric Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        {/* QR Pass Box */}
        <Card className="lg:col-span-2 p-5 border border-indigo-200/80 shadow-xs bg-indigo-50/40">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-sm text-indigo-950 flex items-center gap-2">
              <QrCode className="w-4 h-4 text-indigo-600" /> Gate QR Pass Verification
            </h3>
            <button
              onClick={() => setCameraScannerOpen(true)}
              className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 bg-white px-2.5 py-1 rounded-md border border-indigo-200"
            >
              <Camera className="w-3.5 h-3.5" /> Open Camera Scanner
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Scan via camera or enter visitor QR token/UUID to verify pass details:
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. 8d39c08a-493a-44c1-..."
              value={qrToken}
              onChange={(e) => setQrToken(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleVerifyPassToken(qrToken);
              }}
              className="flex-1 px-3 py-2 text-xs font-mono rounded-lg border border-indigo-300 bg-white focus:ring-2 focus:ring-indigo-500"
            />
            <Button
              size="sm"
              isLoading={isVerifying}
              onClick={() => handleVerifyPassToken(qrToken)}
              className="bg-indigo-700 hover:bg-indigo-800 text-white gap-1 text-xs"
            >
              <Scan className="w-3.5 h-3.5" /> Verify Pass
            </Button>
          </div>
        </Card>

        {/* Currently Inside */}
        <Card
          onClick={() => {
            setActiveTab('visitors');
            setVisitorFilter('CHECKED_IN');
          }}
          className={`p-5 border shadow-xs cursor-pointer transition-all ${
            visitorFilter === 'CHECKED_IN' ? 'border-indigo-500 ring-2 ring-indigo-200 bg-indigo-50/20' : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Currently Inside</p>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-3xl font-black text-indigo-700 mt-1">{stats?.currentlyInside || 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">Visitors active on premises</p>
        </Card>

        {/* Overdue Alert Card */}
        <Card
          onClick={() => {
            setActiveTab('visitors');
            setVisitorFilter('OVERDUE');
          }}
          className={`p-5 border shadow-xs cursor-pointer transition-all ${
            stats?.overdueCount > 0
              ? 'border-amber-300 bg-amber-50/40'
              : 'border-slate-200 bg-white'
          } ${visitorFilter === 'OVERDUE' ? 'ring-2 ring-amber-400' : ''}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overdue Exits</p>
            {stats?.overdueCount > 0 && <Clock className="w-3.5 h-3.5 text-amber-600" />}
          </div>
          <p className={`text-3xl font-black mt-1 ${stats?.overdueCount > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
            {stats?.overdueCount || 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Visitors beyond visit limit</p>
        </Card>
      </div>

      {/* Tab Switcher */}
      <div className="max-w-7xl mx-auto flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('visitors')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'visitors'
                ? 'bg-indigo-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Visitor Desk ({visitors.length})
          </button>
          <button
            onClick={() => setActiveTab('parcels')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'parcels'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Truck className="w-3.5 h-3.5" /> Parcel & Courier Desk ({parcels.length})
          </button>
        </div>

        {activeTab === 'visitors' && (
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setVisitorFilter('ALL')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                visitorFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All ({visitors.length})
            </button>
            <button
              onClick={() => setVisitorFilter('CHECKED_IN')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                visitorFilter === 'CHECKED_IN' ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Inside ({visitors.filter((v) => v.status === 'CHECKED_IN').length})
            </button>
            <button
              onClick={() => setVisitorFilter('APPROVED')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                visitorFilter === 'APPROVED' ? 'bg-sky-700 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Approved ({visitors.filter((v) => v.status === 'APPROVED').length})
            </button>
            <button
              onClick={() => setVisitorFilter('OVERDUE')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                visitorFilter === 'OVERDUE' ? 'bg-amber-700 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Overdue ({visitors.filter(isVisitorOverdue).length})
            </button>
          </div>
        )}
      </div>

      {/* Visitor Log Table */}
      {activeTab === 'visitors' && (
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" /> Visitor & Gate Pass Register
            </h2>

            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search visitor, phone, room, token..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <Card className="border border-slate-200 shadow-xs bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Visitor / Contact</th>
                    <th className="py-3 px-4">Resident & Room</th>
                    <th className="py-3 px-4">Purpose & Window</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Check-In / Out</th>
                    <th className="py-3 px-4 text-right">Gate Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredVisitors.length > 0 ? (
                    filteredVisitors.map((v) => {
                      const overdue = isVisitorOverdue(v);
                      return (
                        <tr key={v.id} className={`hover:bg-slate-50/60 transition-colors ${overdue ? 'bg-amber-50/30' : ''}`}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div>
                                <p className="font-bold text-slate-900">{v.visitorName}</p>
                                <p className="text-[11px] text-slate-400">{v.visitorMobile}</p>
                              </div>
                              {overdue && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wider">
                                  Overdue
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-medium text-slate-900">{v.residentName}</p>
                            <p className="text-[10px] text-slate-500">Room {v.residentRoom} ({v.residentBed})</p>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-medium text-slate-800">{v.purpose}</p>
                            <p className="text-[10px] text-slate-400">
                              {v.expectedEntryTime || 'TBD'} {v.expectedExitTime ? `– ${v.expectedExitTime}` : ''}
                            </p>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                v.status === 'CHECKED_IN'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : v.status === 'CHECKED_OUT'
                                  ? 'bg-slate-100 text-slate-600'
                                  : v.status === 'APPROVED'
                                  ? 'bg-sky-100 text-sky-800'
                                  : v.status === 'REJECTED'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {v.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[11px] text-slate-500">
                            {v.checkInTime ? (
                              <p className="text-emerald-700 font-medium">
                                In: {new Date(v.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            ) : (
                              <p className="text-slate-400">Not checked in</p>
                            )}
                            {v.checkOutTime && (
                              <p className="text-slate-400">
                                Out: {new Date(v.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {v.status === 'APPROVED' ? (
                              <Button
                                size="xs"
                                onClick={() => handleDirectCheckIn(v.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                              >
                                <LogIn className="w-3 h-3 mr-1" /> Check In
                              </Button>
                            ) : v.status === 'CHECKED_IN' ? (
                              <Button
                                size="xs"
                                onClick={() => handleDirectCheckOut(v.id)}
                                className="bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                              >
                                <LogOut className="w-3 h-3 mr-1" /> Check Out
                              </Button>
                            ) : v.status === 'PENDING' ? (
                              <span className="px-2 py-1 rounded bg-amber-50 text-amber-700 font-semibold text-[10px] border border-amber-200">
                                Awaiting Approval
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Completed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                        No visitors match your search filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Parcel Desk Table */}
      {activeTab === 'parcels' && (
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-600" /> Inward Parcels & Courier Register
            </h2>
            <Button size="sm" onClick={() => setParcelModalOpen(true)} className="bg-emerald-700 hover:bg-emerald-800 text-white gap-1">
              <Truck className="w-3.5 h-3.5" /> Log Inward Parcel
            </Button>
          </div>

          <Card className="border border-slate-200 shadow-xs bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Recipient & Room</th>
                    <th className="py-3 px-4">Courier / Tracking</th>
                    <th className="py-3 px-4">Received Time</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Pickup PIN</th>
                    <th className="py-3 px-4 text-right">Handover Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {parcels.length > 0 ? (
                    parcels.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">{p.resident?.fullName || p.recipientName}</p>
                          <p className="text-[11px] text-slate-500">
                            Room {p.resident?.bed?.room?.number || p.recipientRoom || 'N/A'}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-900">{p.courierCompany}</p>
                          <p className="text-[10px] font-mono text-slate-400">{p.trackingNumber || 'No tracking ID'}</p>
                        </td>
                        <td className="py-3 px-4 text-[11px] text-slate-500">
                          {new Date(p.receivedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              p.status === 'COLLECTED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.status === 'NOTIFIED'
                                ? 'bg-sky-100 text-sky-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-700 text-xs">
                          {p.status === 'COLLECTED' ? '••••' : p.pickupPin || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {p.status !== 'COLLECTED' ? (
                            <Button size="xs" onClick={() => openCollectModal(p)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                              Verify PIN Handover
                            </Button>
                          ) : (
                            <span className="text-[11px] text-emerald-700 font-semibold flex items-center justify-end gap-1">
                              <CheckCircle className="w-3.5 h-3.5" /> Collected
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                        No parcels currently registered.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================
          MODAL: CAMERA QR SCANNER
         ======================================================== */}
      <Modal
        isOpen={cameraScannerOpen}
        onClose={() => setCameraScannerOpen(false)}
        title="Scan Visitor Gate QR Pass"
      >
        <div className="space-y-4 text-center">
          <p className="text-xs text-slate-500">
            Hold the visitor's mobile QR gate pass steady in front of the device camera:
          </p>
          <div className="p-2 bg-slate-900 rounded-xl overflow-hidden max-w-sm mx-auto">
            <QrCameraScanner
              onScan={(token) => handleVerifyPassToken(token)}
              onClose={() => setCameraScannerOpen(false)}
              scannerId="security-gate-qr-scanner"
            />
          </div>
          <div className="pt-2 text-[11px] text-slate-400">
            Alternatively, enter the pass token or visitor mobile number manually in the lookup field.
          </div>
        </div>
      </Modal>

      {/* ========================================================
          MODAL: PASS VERIFICATION CARD & GATE ACTION
         ======================================================== */}
      <Modal
        isOpen={verifyModalOpen}
        onClose={() => {
          setVerifyModalOpen(false);
          setVerifiedPass(null);
        }}
        title="Visitor Gate Pass Verification"
      >
        {verifiedPass && verifiedPass.pass ? (
          <div className="space-y-4 text-left text-xs">
            {/* Status Header Banner */}
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between ${
                verifiedPass.pass.status === 'APPROVED'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : verifiedPass.pass.status === 'CHECKED_IN'
                  ? 'bg-sky-50 border-sky-200 text-sky-900'
                  : verifiedPass.pass.status === 'PENDING'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {verifiedPass.pass.status === 'APPROVED' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : verifiedPass.pass.status === 'CHECKED_IN' ? (
                  <UserCheck className="w-5 h-5 text-sky-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                )}
                <div>
                  <p className="font-bold text-sm">
                    {verifiedPass.pass.status === 'APPROVED'
                      ? 'Approved Visitor Pass'
                      : verifiedPass.pass.status === 'CHECKED_IN'
                      ? 'Visitor Currently Inside'
                      : `Pass Status: ${verifiedPass.pass.status}`}
                  </p>
                  <p className="text-[11px] opacity-80">{verifiedPass.message}</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded text-xs font-black uppercase tracking-wider bg-white shadow-xs">
                {verifiedPass.pass.status}
              </span>
            </div>

            {/* Visitor & Host Resident Details */}
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Visitor Name</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{verifiedPass.pass.visitorName}</p>
                <p className="text-[11px] text-slate-500">{verifiedPass.pass.visitorMobile}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Host Resident</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{verifiedPass.pass.residentName}</p>
                <p className="text-[11px] text-slate-500">
                  Room {verifiedPass.pass.residentRoom} (Bed {verifiedPass.pass.residentBed})
                </p>
              </div>
            </div>

            {/* Visit Details */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Purpose / Relation:</span>
                <span className="font-semibold text-slate-800">
                  {verifiedPass.pass.purpose} ({verifiedPass.pass.relation})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Visit Date:</span>
                <span className="font-semibold text-slate-800">
                  {new Date(verifiedPass.pass.visitDate).toLocaleDateString([], {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Expected Time Window:</span>
                <span className="font-semibold text-slate-800">
                  {verifiedPass.pass.expectedEntryTime} – {verifiedPass.pass.expectedExitTime || 'End of Day'}
                </span>
              </div>
              {verifiedPass.pass.checkInTime && (
                <div className="flex justify-between text-emerald-700">
                  <span>Gate Entry Recorded:</span>
                  <span className="font-bold">
                    {new Date(verifiedPass.pass.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>

            {/* Gate Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setVerifyModalOpen(false);
                  setVerifiedPass(null);
                }}
              >
                Close
              </Button>

              {verifiedPass.canCheckIn && (
                <Button
                  size="sm"
                  isLoading={isProcessingAction}
                  onClick={() => handleConfirmCheckIn(verifiedPass.pass.qrPassToken || verifiedPass.pass.id)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 shadow-xs"
                >
                  <LogIn className="w-3.5 h-3.5" /> Confirm Gate Check-In
                </Button>
              )}

              {verifiedPass.canCheckOut && (
                <Button
                  size="sm"
                  isLoading={isProcessingAction}
                  onClick={() => handleConfirmCheckOut(verifiedPass.pass.qrPassToken || verifiedPass.pass.id)}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1 shadow-xs"
                >
                  <LogOut className="w-3.5 h-3.5" /> Confirm Gate Check-Out
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-rose-600 space-y-2">
            <XCircle className="w-8 h-8 mx-auto" />
            <p className="font-bold text-sm">Pass Verification Failed</p>
            <p className="text-xs text-slate-500">
              The scanned token is invalid, expired, or does not exist in the property registry.
            </p>
          </div>
        )}
      </Modal>

      {/* Walk-in Modal */}
      <Modal isOpen={walkInModalOpen} onClose={() => setWalkInModalOpen(false)} title="Log Direct Gate Entry (Delivery / Walk-in)">
        <form onSubmit={handleRegisterWalkIn} className="space-y-4 text-xs text-left">
          <div>
            <label className="font-semibold block mb-1">Visitor Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Swiggy Delivery Agent"
              value={visitorName}
              onChange={(e) => setVisitorName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="font-semibold block mb-1">Visitor Contact Mobile</label>
            <input
              type="tel"
              required
              placeholder="e.g. 9876543210"
              value={visitorMobile}
              onChange={(e) => setVisitorMobile(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold block mb-1">Entry Reason</label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Delivery (Swiggy/Zomato/Amazon)">Food / E-Commerce Delivery</option>
                <option value="Maintenance / Service Tech">Maintenance / Service Tech</option>
                <option value="Guest / Casual Visit">Guest / Casual Visit</option>
                <option value="Other">Other Business</option>
              </select>
            </div>
            <div>
              <label className="font-semibold block mb-1">Visiting Room Number</label>
              <input
                type="text"
                placeholder="e.g. 101"
                value={residentRoom}
                onChange={(e) => setResidentRoom(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <Button size="sm" variant="outline" type="button" onClick={() => setWalkInModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" className="bg-slate-900 text-white">
              Log & Check In
            </Button>
          </div>
        </form>
      </Modal>

      {/* Parcel Inward Modal */}
      <Modal isOpen={parcelModalOpen} onClose={() => setParcelModalOpen(false)} title="Log Received Courier / Parcel">
        <form onSubmit={handleRegisterParcel} className="space-y-4 text-xs text-left">
          <div>
            <label className="font-semibold block mb-1">Recipient Resident Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Aakash Verma"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold block mb-1">Room Number</label>
              <input
                type="text"
                required
                placeholder="e.g. 101"
                value={recipientRoom}
                onChange={(e) => setRecipientRoom(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Courier Service</label>
              <select
                value={courierCompany}
                onChange={(e) => setCourierCompany(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Amazon">Amazon</option>
                <option value="Flipkart">Flipkart</option>
                <option value="BlueDart">BlueDart</option>
                <option value="Delhivery">Delhivery</option>
                <option value="DTDC">DTDC</option>
                <option value="SpeedPost">India Post</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="font-semibold block mb-1">Tracking Number / AWB (Optional)</label>
            <input
              type="text"
              placeholder="e.g. 12948274920"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <Button size="sm" variant="outline" type="button" onClick={() => setParcelModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" className="bg-emerald-700 text-white">
              Log Parcel & Issue PIN
            </Button>
          </div>
        </form>
      </Modal>

      {/* Collect Modal */}
      <Modal isOpen={collectModalOpen} onClose={() => setCollectModalOpen(false)} title="Verify Parcel Handover via Resident PIN">
        <form onSubmit={handleConfirmPickup} className="space-y-4 text-xs text-left">
          <p className="text-slate-500">
            Ask resident <strong>{selectedParcel?.recipientName}</strong> (Room {selectedParcel?.recipientRoom}) for their 4-digit pickup PIN:
          </p>
          <div>
            <input
              type="text"
              required
              maxLength={6}
              placeholder="Enter 4-digit PIN"
              value={pickupPinInput}
              onChange={(e) => setPickupPinInput(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 text-center font-mono text-xl tracking-widest font-bold focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <Button size="sm" variant="outline" type="button" onClick={() => setCollectModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" className="bg-emerald-700 text-white">
              Verify & Release
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
