import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserCheck,
  Building2,
  Calendar,
  Clock,
  LogIn,
  LogOut,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import api from '../../lib/api';

export const GateVerifyPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const verifyPass = async () => {
    if (!token) {
      setError('No QR pass token provided in verification URL.');
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<any>(`/gate/verify/${encodeURIComponent(token)}`);
      setResult(res.data || res);
    } catch (err: any) {
      setError(err.message || 'Pass verification service encountered an error.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    verifyPass();
  }, [token]);

  const handleCheckIn = async (passId: string) => {
    setActionLoading(true);
    try {
      await api.post(`/owner/visitors/${passId}/check-in`);
      setActionSuccess('Visitor successfully checked in at gate.');
      await verifyPass();
    } catch (err: any) {
      alert(err.message || 'Unable to check in visitor.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async (passId: string) => {
    setActionLoading(true);
    try {
      await api.post(`/owner/visitors/${passId}/check-out`);
      setActionSuccess('Visitor marked as checked out.');
      await verifyPass();
    } catch (err: any) {
      alert(err.message || 'Unable to check out visitor.');
    } finally {
      setActionLoading(false);
    }
  };

  const visitor = result?.visitor;
  const resident = result?.resident;
  const room = result?.room;
  const isValid = result?.valid;

  return (
    <div className="min-h-screen bg-[#FCFBF8] text-[#18231F] py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-md space-y-4">
        {/* Brand Banner */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#0B4036] text-[#C8A45D] font-bold text-base shadow-sm border border-[#C8A45D]/30 mb-2">
            UN
          </div>
          <h1 className="text-xl font-bold text-[#0B4036]">Urban Nest Gate Security</h1>
          <p className="text-xs text-[#526058]">Real-time Digital Visitor QR Verification</p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <Card className="p-8 text-center bg-white border-[#DDE2DD] shadow-sm">
            <div className="w-8 h-8 border-3 border-[#0B4036]/20 border-t-[#0B4036] rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-[#526058]">Verifying cryptographic gate pass token...</p>
          </Card>
        )}

        {/* Error / Invalid Pass State */}
        {!isLoading && (!isValid || error) && (
          <Card className="p-6 bg-white border-rose-200 shadow-sm space-y-4">
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900">
              <XCircle className="w-6 h-6 text-rose-600 shrink-0" />
              <div>
                <h3 className="text-sm font-bold">INVALID OR EXPIRED PASS</h3>
                <p className="text-xs text-rose-700 mt-0.5">
                  {result?.message || error || 'This QR pass is not authorized for entry.'}
                </p>
              </div>
            </div>

            {result?.reason && (
              <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1 border border-slate-200">
                <p className="text-slate-500 font-medium">Rejection Reason Code:</p>
                <p className="font-mono font-bold text-slate-800">{result.reason}</p>
              </div>
            )}

            <div className="pt-2 flex justify-center">
              <Button variant="outline" size="sm" onClick={verifyPass} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
                Re-scan / Retry
              </Button>
            </div>
          </Card>
        )}

        {/* Valid Verified Pass State */}
        {!isLoading && isValid && visitor && (
          <Card className="p-6 bg-white border-emerald-200 shadow-sm space-y-4">
            {/* Status Banner */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold">VALID PASS VERIFIED</h3>
                  <p className="text-[11px] text-emerald-700">Gate security clearance confirmed</p>
                </div>
              </div>
              <StatusBadge status={visitor.status as any} />
            </div>

            {actionSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-100/60 text-emerald-800 text-xs font-medium text-center">
                {actionSuccess}
              </div>
            )}

            {/* Visitor Details */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-[#DDE2DD]">
                <span className="text-[#526058] flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-[#0B4036]" /> Visitor Name
                </span>
                <span className="font-bold text-[#18231F]">{visitor.visitorName}</span>
              </div>

              {visitor.visitorMobile && (
                <div className="flex items-center justify-between py-1.5 border-b border-[#DDE2DD]">
                  <span className="text-[#526058]">Mobile Number</span>
                  <span className="font-mono font-medium text-[#18231F]">{visitor.visitorMobile}</span>
                </div>
              )}

              {visitor.relation && (
                <div className="flex items-center justify-between py-1.5 border-b border-[#DDE2DD]">
                  <span className="text-[#526058]">Relation</span>
                  <span className="font-medium text-[#18231F]">{visitor.relation}</span>
                </div>
              )}

              {resident && (
                <div className="flex items-center justify-between py-1.5 border-b border-[#DDE2DD]">
                  <span className="text-[#526058] flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#0B4036]" /> Host Resident
                  </span>
                  <div className="text-right">
                    <p className="font-bold text-[#0B4036]">{resident.fullName}</p>
                    {room?.roomNumber && (
                      <p className="text-[11px] text-[#526058]">Room {room.roomNumber} ({room.buildingName || 'Main Block'})</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between py-1.5 border-b border-[#DDE2DD]">
                <span className="text-[#526058] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#526058]" /> Visit Date
                </span>
                <span className="font-medium text-[#18231F]">
                  {typeof visitor.visitDate === 'string' ? visitor.visitDate.split('T')[0] : new Date(visitor.visitDate).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-[#DDE2DD]">
                <span className="text-[#526058] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#526058]" /> Entry Window
                </span>
                <span className="font-medium text-[#18231F]">
                  {visitor.expectedEntryTime || visitor.expectedTime || '04:00 PM'}
                  {visitor.expectedExitTime ? ` – ${visitor.expectedExitTime}` : ''}
                </span>
              </div>

              {visitor.purpose && (
                <div className="py-1.5">
                  <span className="text-[#526058] block mb-0.5">Purpose of Visit:</span>
                  <p className="text-[#18231F] bg-[#FCFBF8] p-2 rounded border border-[#DDE2DD] font-medium">
                    {visitor.purpose}
                  </p>
                </div>
              )}
            </div>

            {/* Gate Actions */}
            <div className="pt-2 border-t border-[#DDE2DD] space-y-2">
              {visitor.status === 'APPROVED' && (
                <Button
                  variant="primary"
                  size="md"
                  className="w-full bg-[#0B4036] hover:bg-[#083129] text-white"
                  isLoading={actionLoading}
                  onClick={() => handleCheckIn(visitor.id)}
                  leftIcon={<LogIn className="w-4 h-4" />}
                >
                  Confirm Gate Entry (Check-In)
                </Button>
              )}

              {visitor.status === 'CHECKED_IN' && (
                <Button
                  variant="secondary"
                  size="md"
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white"
                  isLoading={actionLoading}
                  onClick={() => handleCheckOut(visitor.id)}
                  leftIcon={<LogOut className="w-4 h-4" />}
                >
                  Mark Visitor Departure (Check-Out)
                </Button>
              )}

              {visitor.status === 'CHECKED_OUT' && (
                <div className="p-2.5 rounded-lg bg-slate-100 text-slate-700 text-xs text-center font-medium">
                  Visit completed & recorded. Pass expired.
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Back Link */}
        <div className="text-center pt-2">
          <Link
            to="/owner/visitors"
            className="text-xs text-[#0B4036] hover:underline inline-flex items-center gap-1 font-medium"
          >
            <ArrowLeft className="w-3 h-3" /> Go to Owner Visitor Desk
          </Link>
        </div>
      </div>
    </div>
  );
};

export default GateVerifyPage;
