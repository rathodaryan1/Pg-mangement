import React from 'react';
import { ShieldCheck, Calendar, Clock, UserCheck, CheckCircle } from 'lucide-react';
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
  const token = visitor.qrPassToken || visitor.qrPassCode || 'VPASS-ACTIVE';
  const entryTime = visitor.expectedEntryTime || visitor.expectedTime || '04:00 PM';
  const dateStr = typeof visitor.visitDate === 'string'
    ? visitor.visitDate.split('T')[0]
    : new Date(visitor.visitDate).toLocaleDateString();

  return (
    <div className="w-full max-w-sm mx-auto bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 shadow-2xl border border-slate-800 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-600/20 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-purple-600/20 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center font-black text-sm">
            UN
          </div>
          <div>
            <h4 className="text-sm font-bold tracking-tight">URBAN NEST</h4>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">Digital Visitor Gate Pass</p>
          </div>
        </div>
        <StatusBadge status={visitor.status as any} />
      </div>

      {/* QR Code Container */}
      <div className="my-6 p-4 bg-white rounded-2xl flex flex-col items-center justify-center shadow-inner">
        <div className="w-44 h-44 bg-slate-950 p-3 rounded-xl flex items-center justify-center">
          <div className="grid grid-cols-7 gap-1.5 w-full h-full p-1 bg-white rounded-lg">
            {/* Position markers & simulated grid */}
            <div className="col-span-2 row-span-2 bg-slate-950 rounded" />
            <div className="col-span-3 bg-slate-950 rounded" />
            <div className="col-span-2 row-span-2 bg-slate-950 rounded" />
            <div className="col-span-1 bg-slate-950 rounded" />
            <div className="col-span-2 bg-slate-950 rounded" />
            <div className="col-span-1 bg-slate-950 rounded" />
            <div className="col-span-3 bg-slate-950 rounded" />
            <div className="col-span-2 row-span-2 bg-slate-950 rounded" />
            <div className="col-span-3 bg-slate-950 rounded" />
            <div className="col-span-2 row-span-2 bg-slate-950 rounded" />
          </div>
        </div>
        <p className="mt-3 text-[11px] font-mono font-bold text-slate-800 tracking-wider">
          {token}
        </p>
        <span className="text-[10px] text-slate-500 mt-0.5">Scan at PG Main Gate for Entry</span>
      </div>

      {/* Details */}
      <div className="space-y-3 text-xs">
        <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
          <span className="text-slate-400 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-blue-400" /> Visitor Name
          </span>
          <span className="font-bold text-white">{visitor.visitorName}</span>
        </div>

        {visitor.relation && (
          <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
            <span className="text-slate-400">Relation</span>
            <span className="font-semibold text-slate-200">{visitor.relation}</span>
          </div>
        )}

        <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-purple-400" /> Valid Date
          </span>
          <span className="font-semibold text-slate-200">{dateStr}</span>
        </div>

        <div className="flex items-center justify-between py-1.5">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-400" /> Expected Entry
          </span>
          <span className="font-semibold text-slate-200">{entryTime}</span>
        </div>
      </div>

      {/* Security Disclaimer */}
      <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 text-center">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>Cryptographically Verified Pass • Valid for Single Entry</span>
      </div>
    </div>
  );
};
