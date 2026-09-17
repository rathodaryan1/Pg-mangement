import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  UserCheck,
  Wrench,
  CalendarDays,
  QrCode,
  Bell,
  CheckCircle2,
  AlertTriangle,
  FileText,
  DoorOpen,
  ArrowRight,
  Shield,
  RefreshCw,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { QRPassCard } from '../../components/ui/QRPassCard';
import { residentApi } from '../../services/residentApi';
import type { ResidentDashboardData } from '../../services/residentApi';

export const ResidentDashboardPage: React.FC = () => {
  const [data, setData] = useState<ResidentDashboardData | null>(null);
  const [activeVisitorPass, setActiveVisitorPass] = useState<any | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await residentApi.getDashboard();
      setData(res);
      if (res.activeVisitors && res.activeVisitors.length > 0) {
        setActiveVisitorPass(res.activeVisitors[0]);
      } else {
        setActiveVisitorPass(null);
      }
    } catch (err: any) {
      console.error('Failed to load dashboard:', err.message);
      setError(err.message || 'Unable to load dashboard data. Please check connection.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-44 rounded-3xl bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-52 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-52 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 rounded-3xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-center space-y-4 max-w-lg mx-auto mt-8">
        <AlertTriangle className="w-10 h-10 text-red-600 mx-auto" />
        <h3 className="text-base font-bold text-red-900 dark:text-red-200">Failed to Load Dashboard</h3>
        <p className="text-xs text-red-700 dark:text-red-400">{error || 'Server error occurred'}</p>
        <Button
          variant="secondary"
          size="sm"
          onClick={fetchDashboardData}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Try Again
        </Button>
      </div>
    );
  }

  const { resident, financials, openComplaints, pendingLeaveRequests, recentNotices, activeVisitors } = data;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#0B4036] text-white shadow-md relative overflow-hidden border border-[#072C25]">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/15 text-[#E8D7A8] border border-white/20">
                Welcome, {resident.name}
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> KYC {resident.kycStatus}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-3">
              Room {resident.roomNumber || '101'} • {resident.bedNumber || 'Bed A'}
            </h1>
            <p className="text-xs sm:text-sm text-[#E8D7A8] mt-1 flex items-center gap-1.5 font-medium">
              <DoorOpen className="w-4 h-4 text-[#C8A45D]" />
              {resident.buildingName || 'Block A'}, Floor {resident.floorNumber || 1} • {resident.propertyName}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {activeVisitorPass && (
              <Button
                variant="gold"
                size="sm"
                className="font-bold border-none shadow-md px-4 py-2.5"
                onClick={() => setQrModalOpen(true)}
                leftIcon={<QrCode className="w-4 h-4" />}
              >
                View Active QR Pass
              </Button>
            )}
            <Link to="/resident/emergency">
              <Button
                variant="danger"
                size="sm"
                className="px-3 py-2.5 font-semibold shadow-xs"
                leftIcon={<Shield className="w-4 h-4 text-white" />}
              >
                Emergency SOS
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          to="/resident/payments"
          className="p-4 rounded-xl bg-white border border-[#DDE2DD] shadow-xs hover:border-[#0B4036] transition-all text-center space-y-2 group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#EAF2EE] text-[#0B4036] mx-auto flex items-center justify-center group-hover:scale-105 transition-transform">
            <CreditCard className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-[#18231F]">Pay Rent</p>
          <span className="text-[10px] text-[#68736D] block">
            {financials.totalOutstanding > 0 ? `₹${financials.totalOutstanding.toLocaleString()} Due` : 'No Dues'}
          </span>
        </Link>

        <Link
          to="/resident/visitors"
          className="p-4 rounded-xl bg-white border border-[#DDE2DD] shadow-xs hover:border-[#0B4036] transition-all text-center space-y-2 group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#FAF5EB] text-[#B9954E] mx-auto flex items-center justify-center group-hover:scale-105 transition-transform">
            <UserCheck className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-[#18231F]">Request Visitor</p>
          <span className="text-[10px] text-[#68736D] block">
            {activeVisitors.length > 0 ? `${activeVisitors.length} Active Pass` : 'New Pass'}
          </span>
        </Link>

        <Link
          to="/resident/complaints"
          className="p-4 rounded-xl bg-white border border-[#DDE2DD] shadow-xs hover:border-[#0B4036] transition-all text-center space-y-2 group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#EAF2EE] text-[#0B4036] mx-auto flex items-center justify-center group-hover:scale-105 transition-transform">
            <Wrench className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-[#18231F]">Raise Issue</p>
          <span className="text-[10px] text-[#68736D] block">
            {data.openComplaintsCount > 0 ? `${data.openComplaintsCount} Open` : 'No Issues'}
          </span>
        </Link>

        <Link
          to="/resident/leave"
          className="p-4 rounded-xl bg-white border border-[#DDE2DD] shadow-xs hover:border-[#0B4036] transition-all text-center space-y-2 group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#FAF5EB] text-[#B9954E] mx-auto flex items-center justify-center group-hover:scale-105 transition-transform">
            <CalendarDays className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-[#18231F]">Apply Leave</p>
          <span className="text-[10px] text-[#68736D] block">
            {pendingLeaveRequests.length > 0 ? `${pendingLeaveRequests.length} Pending` : 'Plan Trip'}
          </span>
        </Link>
      </div>

      {/* Main Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Rent & Dues Status Card */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#DDE2DD] pb-3">
            <h3 className="text-sm font-bold text-[#18231F] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#0B4036]" />
              Rent & Dues Status
            </h3>
            <StatusBadge status={financials.totalOutstanding > 0 ? 'PENDING' : 'PAID'} />
          </div>

          <div className="p-4 rounded-xl bg-[#EAF2EE] border border-[#0B4036]/20 flex items-center justify-between">
            <div>
              <p className="text-xs text-[#0B4036] font-semibold">
                {financials.totalOutstanding > 0 ? 'Outstanding Dues Amount' : 'Current Monthly Rent'}
              </p>
              <h4 className="text-xl font-black text-[#18231F] mt-1">
                ₹{financials.totalOutstanding > 0 ? financials.totalOutstanding.toLocaleString() : financials.monthlyRent.toLocaleString()}
              </h4>
              {financials.nextDueDate && (
                <p className="text-[11px] text-[#0B4036] mt-0.5 font-medium">
                  Due on: {new Date(financials.nextDueDate).toLocaleDateString()}
                </p>
              )}
            </div>

            <Link to="/resident/payments">
              <Button
                variant="primary"
                size="sm"
                className="bg-[#0B4036] hover:bg-[#072C25] text-white shadow-xs"
              >
                {financials.totalOutstanding > 0 ? 'Pay Now' : 'View Ledger'}
              </Button>
            </Link>
          </div>

          {financials.securityDeposit && (
            <div className="text-xs text-[#68736D] flex items-center justify-between px-1">
              <span>Security Deposit: <strong className="text-[#18231F]">₹{financials.securityDeposit.amount.toLocaleString()}</strong></span>
              <StatusBadge status={financials.securityDeposit.status as any} />
            </div>
          )}
        </Card>

        {/* Complaints & Maintenance Card */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#DDE2DD] pb-3">
            <h3 className="text-sm font-bold text-[#18231F] flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[#0B4036]" />
              Active Maintenance Tickets
            </h3>
            <Link to="/resident/complaints" className="text-xs text-[#0B4036] font-semibold hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {openComplaints.length === 0 ? (
            <div className="p-6 text-center text-[#68736D] space-y-2">
              <CheckCircle2 className="w-8 h-8 text-[#0B4036] mx-auto" />
              <p className="text-xs font-semibold">No active issues or complaints reported.</p>
              <Link to="/resident/complaints">
                <Button variant="outline" size="xs" className="mt-2 border-[#DDE2DD] text-[#0B4036]">
                  Raise New Ticket
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {openComplaints.slice(0, 3).map((tkt) => (
                <Link
                  key={tkt.id}
                  to={`/resident/complaints`}
                  className="p-3 rounded-xl border border-[#DDE2DD] bg-[#FCFBF8] hover:border-[#0B4036] transition-all flex items-center justify-between gap-3 text-xs block"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-bold text-[#18231F] truncate">{tkt.title}</p>
                    <p className="text-[11px] text-[#68736D]">Ticket #{tkt.ticketNumber} • {tkt.category}</p>
                  </div>
                  <StatusBadge status={tkt.status as any} />
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Property Notices Banner */}
      {recentNotices.length > 0 && (
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-[#DDE2DD] pb-3">
            <h3 className="text-sm font-bold text-[#18231F] flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#C8A45D]" />
              Important PG Notices
            </h3>
            <Link to="/resident/notices" className="text-xs text-[#0B4036] font-semibold hover:underline">
              Notice Board
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentNotices.slice(0, 2).map((notice) => (
              <div
                key={notice.id}
                className="p-3.5 rounded-xl bg-[#FAF5EB] border border-[#C8A45D]/30 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#18231F]">{notice.title}</h4>
                  {notice.isImportant && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                      URGENT
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#68736D] line-clamp-2">
                  {notice.content}
                </p>
                <span className="text-[10px] text-[#8A928D] block">
                  {new Date(notice.publishedAt).toLocaleDateString()} • {notice.publisherName}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Active QR Gate Pass Modal */}
      {activeVisitorPass && (
        <Modal isOpen={qrModalOpen} onClose={() => setQrModalOpen(false)} maxWidth="sm">
          <QRPassCard visitor={activeVisitorPass} />
        </Modal>
      )}
    </div>
  );
};
