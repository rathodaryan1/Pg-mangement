import React from 'react';
import { ShieldCheck, Calendar, Clock, UserCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { StatusBadge } from './Badge';

export interface QRPassProps {
  visitor: {
    id: string;
    visitorName: string;
    relation?: string;
    visitorMobile?: string;
    visitDate: string;
    expectedEntryTime?: string;
    expectedTime?: string;
    expectedExitTime?: string | null;
    status: string;
    qrPassToken?: string;
    qrPassCode?: string;
    hostName?: string;
    roomNumber?: string;
  };
}

export const QRPassCard: React.FC<QRPassProps> = ({ visitor }) => {
  const token = visitor.qrPassToken || visitor.qrPassCode || visitor.id || 'VPASS-ACTIVE';
  const entryTime = visitor.expectedEntryTime || visitor.expectedTime || '04:00 PM';
  const dateStr =
    typeof visitor.visitDate === 'string'
      ? visitor.visitDate.split('T')[0]
      : new Date(visitor.visitDate).toLocaleDateString();

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://aryanpg.vercel.app';
  const qrPayload = `${baseUrl}/gate/verify/${encodeURIComponent(token)}`;

  return (
    <div className="w-full max-w-sm mx-auto bg-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800 relative">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0B4036] text-[#C8A45D] border border-[#C8A45D]/30 flex items-center justify-center font-bold text-xs">
            UN
          </div>
          <div>
            <h4 className="text-xs font-bold tracking-tight text-white">URBAN NEST</h4>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Visitor Gate Pass</p>
          </div>
        </div>
        <StatusBadge status={visitor.status as any} />
      </div>

      {/* Genuine Machine-Scannable QR Code */}
      <div className="my-4 p-4 bg-white rounded-xl flex flex-col items-center justify-center">
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
        <span className="text-[10px] text-slate-500">Scan with Camera or Gate Scanner</span>
      </div>

      {/* Details List */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between py-1 border-b border-slate-800">
          <span className="text-slate-400 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-[#C8A45D]" /> Visitor
          </span>
          <span className="font-semibold text-white">{visitor.visitorName}</span>
        </div>

        {visitor.relation && (
          <div className="flex items-center justify-between py-1 border-b border-slate-800">
            <span className="text-slate-400">Relation</span>
            <span className="font-medium text-slate-200">{visitor.relation}</span>
          </div>
        )}

        <div className="flex items-center justify-between py-1 border-b border-slate-800">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date
          </span>
          <span className="font-medium text-slate-200">{dateStr}</span>
        </div>

        <div className="flex items-center justify-between py-1">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" /> Expected Entry
          </span>
          <span className="font-medium text-slate-200">{entryTime}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>Verified Gate Security Pass</span>
      </div>
    </div>
  );
};
