import React from 'react';
import {
  ShieldCheck,
  Calendar,
  Clock,
  UserCheck,
  Building2,
  DoorOpen,
  AlertTriangle,
  ArrowLeft,
  X,
  CheckCircle2,
  XCircle,
  Hourglass,
  Home,
  User
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { StatusBadge } from './Badge';

export interface QRPassProps {
  type?: 'RESIDENT' | 'VISITOR';
  visitor?: {
    id: string;
    visitorName: string;
    relation?: string;
    visitorMobile?: string;
    visitDate: string | Date;
    expectedEntryTime?: string;
    expectedTime?: string;
    expectedExitTime?: string | null;
    status: string;
    qrPassToken?: string;
    qrPassCode?: string;
    hostName?: string;
    roomNumber?: string;
    propertyName?: string;
  };
  residentPass?: {
    token: string;
    residentName: string;
    propertyName?: string;
    buildingName?: string;
    floorNumber?: number;
    roomNumber?: string;
    bedNumber?: string;
    status: string;
    hasActiveAllocation?: boolean;
    validUntil?: string;
    joiningDate?: string | Date;
  };
  onClose?: () => void;
  onBack?: () => void;
}

export const QRPassCard: React.FC<QRPassProps> = ({
  type = 'VISITOR',
  visitor,
  residentPass,
  onClose,
  onBack,
}) => {
  const isResident = type === 'RESIDENT' || (!!residentPass && !visitor);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://aryanpg.vercel.app';

  const handleBackOrClose = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (onClose) {
      onClose();
      return;
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    }
  };

  // -------------------------------------------------------------
  // 1. RESIDENT DIGITAL PASS RENDER
  // -------------------------------------------------------------
  if (isResident) {
    const hasAllocation = Boolean(
      residentPass &&
      residentPass.hasActiveAllocation !== false &&
      residentPass.status === 'ACTIVE' &&
      residentPass.token &&
      (residentPass.bedNumber || residentPass.roomNumber)
    );
    const pass = residentPass;
    const token = pass?.token || '';
    const qrPayload = token ? `${baseUrl}/gate/verify/${encodeURIComponent(token)}` : '';

    return (
      <div className="w-full max-w-sm mx-auto bg-slate-900 text-white rounded-2xl p-5 shadow-2xl border border-slate-800 relative">
        {/* Top Header with Back / Close */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBackOrClose}
              className="px-2.5 py-1 text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-xs"
              aria-label="Back"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
              <span>Back</span>
            </button>
            <div className="w-8 h-8 rounded-lg bg-[#0B4036] text-[#C8A45D] border border-[#C8A45D]/40 flex items-center justify-center font-bold text-xs shadow-inner">
              UN
            </div>
            <div>
              <h4 className="text-xs font-bold tracking-tight text-white">URBAN NEST</h4>
              <p className="text-[10px] text-[#C8A45D] font-semibold tracking-wider uppercase">Resident Digital Pass</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasAllocation ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> ACTIVE
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                INACTIVE
              </span>
            )}
            <button
              type="button"
              onClick={handleBackOrClose}
              className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/40 rounded-lg transition-colors"
              aria-label="Close pass"
              title="Close pass"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Allocation Check Banner */}
        {!hasAllocation || !pass ? (
          <div className="my-6 p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl text-center space-y-2">
            <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
            <h5 className="text-sm font-bold text-rose-200">No Active Residence Allocation</h5>
            <p className="text-xs text-rose-300/80 leading-relaxed">
              Your resident gate access pass is currently inactive because there is no active room or bed allocation assigned to your account.
            </p>
            <p className="text-[11px] text-slate-400 pt-1">
              Please contact PG management or your property manager to allocate your bed and activate your pass.
            </p>
          </div>
        ) : (
          <>
            {/* Scannable Resident QR Code */}
            <div className="my-4 p-4 bg-white rounded-xl flex flex-col items-center justify-center shadow-md">
              <div className="p-2 bg-white rounded-lg flex items-center justify-center">
                <QRCodeSVG
                  value={qrPayload}
                  size={168}
                  level="H"
                  includeMargin={true}
                  bgColor="#FFFFFF"
                  fgColor="#0B4036"
                />
              </div>
              <p className="mt-2 text-[11px] font-mono font-bold text-slate-900 tracking-wider">
                {token}
              </p>
              <span className="text-[10px] text-slate-500 font-medium">Security Gate & Access Turnstile Key</span>
            </div>

            {/* Resident Details */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#C8A45D]" /> Resident
                </span>
                <span className="font-semibold text-white">{pass.residentName || 'Resident'}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <DoorOpen className="w-3.5 h-3.5 text-[#C8A45D]" /> Room & Bed
                </span>
                <span className="font-bold text-emerald-400">
                  Room {pass.roomNumber || 'N/A'} • Bed {pass.bedNumber || 'N/A'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" /> Property
                </span>
                <span className="font-medium text-slate-200">{pass.propertyName || 'PG Property'}</span>
              </div>

              {pass.buildingName && (
                <div className="flex items-center justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Home className="w-3.5 h-3.5 text-slate-400" /> Wing / Floor
                  </span>
                  <span className="font-medium text-slate-200">
                    {pass.buildingName}{pass.floorNumber ? `, Floor ${pass.floorNumber}` : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Back / Close Action Button */}
            <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
              <button
                type="button"
                onClick={handleBackOrClose}
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold border border-slate-700 flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
                <span>Close QR Code / Back</span>
              </button>
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Active Resident Gate Pass • Valid Allocation</span>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. VISITOR GATE PASS RENDER
  // -------------------------------------------------------------
  if (!visitor) {
    return (
      <div className="w-full max-w-sm mx-auto bg-slate-900 text-white rounded-2xl p-5 shadow-2xl border border-slate-800 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
        <h5 className="text-sm font-bold text-white">No Visitor Pass Selected</h5>
        <p className="text-xs text-slate-400">
          No active visitor pass record was provided for display.
        </p>
        <button
          type="button"
          onClick={handleBackOrClose}
          className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700"
        >
          Close
        </button>
      </div>
    );
  }

  const vis = visitor;
  const token = vis.qrPassToken || vis.qrPassCode || vis.id;
  const entryTime = vis.expectedEntryTime || vis.expectedTime || 'As scheduled';
  const dateStr =
    typeof vis.visitDate === 'string'
      ? vis.visitDate.split('T')[0]
      : new Date(vis.visitDate).toLocaleDateString();

  const qrPayload = `${baseUrl}/gate/verify/${encodeURIComponent(token)}`;

  // Status-specific wording & theme
  const getStatusContent = (status: string) => {
    switch (status) {
      case 'PENDING':
        return {
          label: 'Awaiting Owner/Manager Approval',
          badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          icon: <Hourglass className="w-3.5 h-3.5 text-amber-400" />,
          footerText: 'Awaiting Owner/Manager Approval • Not authorized for gate entry yet',
          footerColor: 'text-amber-400',
          alertBanner: 'This pass has been submitted and is currently awaiting property manager or owner review. Gate security cannot admit this visitor until approved.',
        };
      case 'APPROVED':
        return {
          label: 'Approved for Gate Verification',
          badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
          footerText: 'Approved for Security Verification • Ready for Gate Entry',
          footerColor: 'text-emerald-400',
          alertBanner: null,
        };
      case 'CHECKED_IN':
        return {
          label: 'Visitor Currently Inside',
          badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />,
          footerText: 'Visitor Currently Inside Premises • Gate Check-In Active',
          footerColor: 'text-blue-400',
          alertBanner: null,
        };
      case 'CHECKED_OUT':
        return {
          label: 'Visit Completed',
          badgeClass: 'bg-slate-700/50 text-slate-300 border-slate-600',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />,
          footerText: 'Visit Completed • Pass Cannot Be Reused',
          footerColor: 'text-slate-400',
          alertBanner: 'Visit completed. This pass has been checked out and cannot be used again.',
        };
      case 'REJECTED':
        return {
          label: 'Entry Request Rejected',
          badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          icon: <XCircle className="w-3.5 h-3.5 text-rose-400" />,
          footerText: 'Entry Request Rejected by Management',
          footerColor: 'text-rose-400',
          alertBanner: 'This visitor request was rejected by property administration. Gate entry is not permitted.',
        };
      case 'EXPIRED':
      case 'CANCELLED':
      default:
        return {
          label: 'Pass Inactive / Expired',
          badgeClass: 'bg-slate-700/50 text-slate-400 border-slate-600',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />,
          footerText: 'Pass Is No Longer Valid',
          footerColor: 'text-slate-400',
          alertBanner: 'This pass is expired or cancelled and is no longer valid for gate access.',
        };
    }
  };

  const statusContent = getStatusContent(vis.status);

  return (
    <div className="w-full max-w-sm mx-auto bg-slate-900 text-white rounded-2xl p-5 shadow-2xl border border-slate-800 relative">
      {/* Top Header with Back / Close buttons */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleBackOrClose}
            className="px-2.5 py-1 text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-xs"
            aria-label="Back"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
            <span>Back</span>
          </button>
          <div className="w-8 h-8 rounded-lg bg-[#0B4036] text-[#C8A45D] border border-[#C8A45D]/40 flex items-center justify-center font-bold text-xs shadow-inner">
            UN
          </div>
          <div>
            <h4 className="text-xs font-bold tracking-tight text-white">URBAN NEST</h4>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Visitor Gate Pass</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={vis.status as any} />
          <button
            type="button"
            onClick={handleBackOrClose}
            className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/40 rounded-lg transition-colors"
            aria-label="Close pass"
            title="Close pass"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status Warning Banner if PENDING, REJECTED, EXPIRED */}
      {statusContent.alertBanner && (
        <div className={`mt-3 p-2.5 rounded-lg text-xs leading-relaxed border ${
          vis.status === 'PENDING'
            ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
            : vis.status === 'REJECTED'
            ? 'bg-rose-950/40 border-rose-800/60 text-rose-200'
            : 'bg-slate-800/60 border-slate-700 text-slate-300'
        }`}>
          <div className="flex items-start gap-1.5">
            {statusContent.icon}
            <p className="text-[11px] font-medium">{statusContent.alertBanner}</p>
          </div>
        </div>
      )}

      {/* Machine-Scannable QR Code */}
      <div className="my-4 p-4 bg-white rounded-xl flex flex-col items-center justify-center shadow-md">
        <div className="p-2 bg-white rounded-lg flex items-center justify-center">
          <QRCodeSVG
            value={qrPayload}
            size={168}
            level="H"
            includeMargin={true}
            bgColor="#FFFFFF"
            fgColor={vis.status === 'REJECTED' || vis.status === 'EXPIRED' ? '#68736D' : '#0B4036'}
          />
        </div>
        <p className="mt-2 text-[11px] font-mono font-bold text-slate-900 tracking-wider">
          {token}
        </p>
        <span className="text-[10px] text-slate-500 font-medium">Scan with Security Gate Camera</span>
      </div>

      {/* Details List */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between py-1 border-b border-slate-800">
          <span className="text-slate-400 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-[#C8A45D]" /> Visitor
          </span>
          <span className="font-semibold text-white">{vis.visitorName}</span>
        </div>

        {vis.relation && (
          <div className="flex items-center justify-between py-1 border-b border-slate-800">
            <span className="text-slate-400">Relation</span>
            <span className="font-medium text-slate-200">{vis.relation}</span>
          </div>
        )}

        <div className="flex items-center justify-between py-1 border-b border-slate-800">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" /> Visit Date
          </span>
          <span className="font-medium text-slate-200">{dateStr}</span>
        </div>

        <div className="flex items-center justify-between py-1 border-b border-slate-800">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" /> Expected Entry
          </span>
          <span className="font-medium text-slate-200">{entryTime}</span>
        </div>

        {vis.hostName && (
          <div className="flex items-center justify-between py-1 border-b border-slate-800">
            <span className="text-slate-400">Resident Host</span>
            <span className="font-medium text-slate-200">{vis.hostName}</span>
          </div>
        )}

        {vis.roomNumber && (
          <div className="flex items-center justify-between py-1 border-b border-slate-800">
            <span className="text-slate-400">Room Number</span>
            <span className="font-bold text-emerald-400">Room {vis.roomNumber}</span>
          </div>
        )}
      </div>

      {/* Bottom Back / Close Action Button */}
      <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
        <button
          type="button"
          onClick={handleBackOrClose}
          className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold border border-slate-700 flex items-center justify-center gap-1.5 transition-colors shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
          <span>Close QR Code / Back</span>
        </button>
        <div className={`flex items-center justify-center gap-1.5 text-[10px] font-medium ${statusContent.footerColor}`}>
          {statusContent.icon}
          <span>{statusContent.footerText}</span>
        </div>
      </div>
    </div>
  );
};
