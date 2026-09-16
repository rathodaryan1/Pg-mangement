import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BedDouble,
  Building2,
  Users,
  CreditCard,
  Wrench,
  UserCheck,
  TrendingUp,
  AlertTriangle,
  Plus,
  ArrowRight,
  ShieldCheck,
  FileCheck,
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Wallet,
  Bell
} from 'lucide-react';
import { KPICard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { ownerApi } from '../../services/ownerApi';
import type { DashboardKPIs, MaintenanceTicket, VisitorRequest, PaymentRecord } from '../../types';

export const OwnerDashboardPage: React.FC = () => {
  const { activeProperty } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Quick Action Modal states
  const [createChargeModal, setCreateChargeModal] = useState(false);
  const [createNoticeModal, setCreateNoticeModal] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Form states
  const [chargeForm, setChargeForm] = useState({
    residentId: '',
    category: 'RENT',
    amount: '',
    period: 'October 2026',
    dueDate: '2026-10-05',
    description: ''
  });

  const [noticeForm, setNoticeForm] = useState({
    title: '',
    content: '',
    category: 'GENERAL',
    priority: 'NORMAL'
  });

  const fetchDashboard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await ownerApi.getDashboard(activeProperty?.id);
      setDashboardData(res.data);
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
      setError(err.message || 'Failed to load dashboard analytics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [activeProperty]);

  const handleCreateCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!chargeForm.residentId || !chargeForm.amount) {
        alert('Please fill all required fields');
        return;
      }
      await ownerApi.createInvoice({
        residentId: chargeForm.residentId,
        category: chargeForm.category,
        amount: parseFloat(chargeForm.amount),
        period: chargeForm.period,
        dueDate: chargeForm.dueDate,
        description: chargeForm.description
      });
      setCreateChargeModal(false);
      setActionSuccess('Charge invoice generated successfully!');
      setTimeout(() => setActionSuccess(null), 4000);
      fetchDashboard();
    } catch (err: any) {
      alert(err.message || 'Failed to create charge');
    }
  };

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!noticeForm.title || !noticeForm.content) {
        alert('Please fill title and content');
        return;
      }
      await ownerApi.createNotice({
        propertyId: activeProperty.id,
        title: noticeForm.title,
        content: noticeForm.content,
        category: noticeForm.category,
        priority: noticeForm.priority
      });
      setCreateNoticeModal(false);
      setActionSuccess('Notice published to resident board!');
      setTimeout(() => setActionSuccess(null), 4000);
      fetchDashboard();
    } catch (err: any) {
      alert(err.message || 'Failed to publish notice');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20">
        <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
        <p className="mt-3 text-xs font-medium text-slate-500">Loading live property metrics...</p>
      </div>
    );
  }

  const kpis = dashboardData?.kpis || {
    totalProperties: 1,
    totalRooms: 0,
    totalBeds: 0,
    occupiedBeds: 0,
    availableBeds: 0,
    totalOccupancyPercentage: 0,
    activeResidents: 0,
    monthlyRevenue: 0,
    outstandingRent: 0,
    totalDeposits: 0,
    openComplaints: 0,
    pendingVisitors: 0,
    staffCount: 0,
    lowInventoryAlerts: 0
  };

  const recentTickets = dashboardData?.recentComplaints || [];
  const recentVisitors = dashboardData?.recentVisitors || [];
  const overduePayments = dashboardData?.recentPayments?.filter((p: any) => p.status === 'OVERDUE') || [];
  const recentNotices = dashboardData?.recentNotices || [];
  const residentOptions = (dashboardData?.allResidents || []).map((r: any) => ({
    label: `${r.fullName} (Rm ${r.roomNumber || 'N/A'})`,
    value: r.id
  }));

  const totalActionItems =
    (dashboardData?.actionRequired?.overdueRentsCount || overduePayments.length) +
    (dashboardData?.actionRequired?.pendingVisitorsCount || recentVisitors.filter((v: any) => v.status === 'PENDING').length) +
    (dashboardData?.actionRequired?.openMaintenanceCount || kpis.openComplaints) +
    (dashboardData?.actionRequired?.lowStockCount || kpis.lowInventoryAlerts || 0);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Toast Notification */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500 text-white flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-semibold">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-white/80 hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Dashboard Title & Quick Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Operations Overview
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time management metrics for <span className="font-semibold text-blue-600 dark:text-blue-400">{activeProperty.name}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/owner/residents/lifecycle')}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Resident
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateChargeModal(true)}
            leftIcon={<CreditCard className="w-3.5 h-3.5 text-blue-600" />}
          >
            Create Charge
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateNoticeModal(true)}
            leftIcon={<Sparkles className="w-3.5 h-3.5 text-purple-600" />}
          >
            Create Notice
          </Button>
        </div>
      </div>

      {/* Action Required Banner */}
      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/80 text-amber-700 dark:text-amber-300 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
              Action Required Today ({totalActionItems} Items)
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-amber-800 dark:text-amber-300">
              <span>• <strong>{overduePayments.length}</strong> overdue rent payments</span>
              <span>• <strong>{recentVisitors.filter((v: any) => v.status === 'PENDING').length}</strong> visitor requests pending</span>
              <span>• <strong>{kpis.openComplaints}</strong> open maintenance complaints</span>
              <span>• <strong>{kpis.lowInventoryAlerts || 0}</strong> low stock asset alerts</span>
            </div>
          </div>
        </div>

        <Link to="/owner/payments">
          <Button variant="outline" size="sm" className="border-amber-300 text-amber-900 dark:text-amber-200 bg-white dark:bg-slate-900">
            Resolve Issues
          </Button>
        </Link>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KPICard
          title="Occupancy Rate"
          value={`${kpis.totalOccupancyPercentage}%`}
          subtitle={`${kpis.occupiedBeds} of ${kpis.totalBeds} beds occupied (${kpis.availableBeds} vacant)`}
          icon={BedDouble}
          color="blue"
        />
        <KPICard
          title="Monthly Revenue"
          value={`₹${(kpis.monthlyRevenue || 0).toLocaleString('en-IN')}`}
          subtitle={`Collected from ${kpis.activeResidents} active residents`}
          icon={TrendingUp}
          color="emerald"
        />
        <KPICard
          title="Outstanding Rent"
          value={`₹${(kpis.outstandingRent || 0).toLocaleString('en-IN')}`}
          subtitle={`${overduePayments.length} overdue payments`}
          icon={CreditCard}
          color="amber"
        />
        <KPICard
          title="Open Maintenance"
          value={kpis.openComplaints}
          subtitle={`${kpis.staffCount || 0} staff members active`}
          icon={Wrench}
          color="purple"
        />
      </div>

      {/* Main Grid: Financial & Occupancy Trend Graphs / Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Financial & Occupancy Trend Graphs / Summary */}
        <div className="lg:col-span-2 space-y-6">
          {/* Revenue & Occupancy Trend Card */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Occupancy & Revenue Trend</h3>
                <p className="text-xs text-slate-500">Monthly billing and bed occupancy performance</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                FY 2026-27
              </span>
            </div>

            {/* Visual SaaS Bar Chart */}
            <div className="h-48 pt-6 flex items-end justify-between gap-3 px-2 border-b border-slate-100 dark:border-slate-800">
              {[
                { month: 'May', rev: 510, occ: 82 },
                { month: 'Jun', rev: 520, occ: 83 },
                { month: 'Jul', rev: 540, occ: 85 },
                { month: 'Aug', rev: 550, occ: 86 },
                { month: 'Sep', rev: 558, occ: 88 },
                { month: 'Oct', rev: 570, occ: 90 }
              ].map((bar) => (
                <div key={bar.month} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full flex items-end justify-center gap-1.5 h-36">
                    {/* Revenue Bar */}
                    <div
                      className="w-1/2 bg-blue-600 rounded-t-lg transition-all group-hover:bg-blue-700"
                      style={{ height: `${(bar.rev / 600) * 100}%` }}
                      title={`Revenue: ₹${bar.rev}k`}
                    />
                    {/* Occupancy Bar */}
                    <div
                      className="w-1/2 bg-purple-500/80 rounded-t-lg transition-all group-hover:bg-purple-600"
                      style={{ height: `${bar.occ}%` }}
                      title={`Occupancy: ${bar.occ}%`}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-500">{bar.month}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-6 pt-2 text-xs font-medium text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-blue-600 inline-block" />
                <span>Monthly Collection (in ₹)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-purple-500 inline-block" />
                <span>Occupancy (%)</span>
              </div>
            </div>
          </div>

          {/* Overdue Payment Alert Table */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-500" />
                Overdue Rent Reminders
              </h3>
              <Link to="/owner/payments" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
                View All Ledger <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {overduePayments.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No overdue payments at this time. All accounts current!</p>
            ) : (
              <div className="space-y-3">
                {overduePayments.map((pay: any) => (
                  <div
                    key={pay.id}
                    className="p-3.5 rounded-xl border border-rose-200/70 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/20 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">{pay.residentName || pay.resident?.fullName} (Rm {pay.roomNumber || pay.resident?.room?.number || 'N/A'})</h4>
                      <p className="text-[11px] text-slate-500">Period: {pay.period || pay.month} • Due: {new Date(pay.dueDate).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-rose-600 dark:text-rose-400">₹{(pay.amount || 0).toLocaleString('en-IN')}</p>
                      <StatusBadge status="OVERDUE" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Quick Visitor Approval & Maintenance Desk */}
        <div className="space-y-6">
          {/* Recent Visitor Approvals Card */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                Today's Visitor Desk
              </h3>
              <Link to="/owner/visitors" className="text-xs text-blue-600 hover:underline">
                View Desk
              </Link>
            </div>

            {recentVisitors.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No recent visitor passes.</p>
            ) : (
              <div className="space-y-3">
                {recentVisitors.slice(0, 3).map((vis: any) => (
                  <div key={vis.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">{vis.visitorName || vis.name}</span>
                      <StatusBadge status={vis.status} />
                    </div>
                    <p className="text-[11px] text-slate-500">Host: {vis.residentName || vis.resident?.fullName} (Rm {vis.roomNumber || vis.resident?.room?.number || 'N/A'})</p>
                    <p className="text-[11px] text-slate-400">Purpose: {vis.purpose}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Maintenance Tickets Card */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-purple-600" />
                Active Maintenance
              </h3>
              <Link to="/owner/maintenance" className="text-xs text-blue-600 hover:underline">
                View All
              </Link>
            </div>

            {recentTickets.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No active maintenance complaints.</p>
            ) : (
              <div className="space-y-3">
                {recentTickets.slice(0, 3).map((tkt: any) => (
                  <div key={tkt.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white truncate max-w-[170px]">{tkt.title}</span>
                      <StatusBadge status={tkt.status} />
                    </div>
                    <p className="text-[11px] text-slate-500">Rm {tkt.roomNumber || tkt.resident?.room?.number || 'N/A'} • {tkt.residentName || tkt.resident?.fullName}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Notices Card */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-600" />
                Active Announcements
              </h3>
              <span className="text-xs text-slate-400">{recentNotices.length} Published</span>
            </div>

            {recentNotices.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No notices published.</p>
            ) : (
              <div className="space-y-2">
                {recentNotices.slice(0, 2).map((n: any) => (
                  <div key={n.id} className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-xs">
                    <p className="font-bold text-slate-900 dark:text-white">{n.title}</p>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{n.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Charge Modal */}
      <Modal isOpen={createChargeModal} onClose={() => setCreateChargeModal(false)} title="Generate Rent / Extra Charge Invoice">
        <form onSubmit={handleCreateCharge} className="space-y-4">
          <Select
            label="Target Resident"
            options={residentOptions.length > 0 ? residentOptions : [{ label: 'Aakash Verma (Room 101)', value: 'res-1' }]}
            value={chargeForm.residentId}
            onChange={(e) => setChargeForm({ ...chargeForm, residentId: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Charge Category"
              options={[
                { label: 'Monthly Rent', value: 'RENT' },
                { label: 'Electricity Bill', value: 'ELECTRICITY' },
                { label: 'Maintenance Fee', value: 'MAINTENANCE_FEE' },
                { label: 'Late Fine', value: 'LATE_FINE' }
              ]}
              value={chargeForm.category}
              onChange={(e) => setChargeForm({ ...chargeForm, category: e.target.value })}
            />
            <Input
              label="Amount (₹)"
              placeholder="16000"
              type="number"
              value={chargeForm.amount}
              onChange={(e) => setChargeForm({ ...chargeForm, amount: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Billing Period"
              placeholder="e.g. October 2026"
              value={chargeForm.period}
              onChange={(e) => setChargeForm({ ...chargeForm, period: e.target.value })}
              required
            />
            <Input
              label="Due Date"
              type="date"
              value={chargeForm.dueDate}
              onChange={(e) => setChargeForm({ ...chargeForm, dueDate: e.target.value })}
              required
            />
          </div>
          <Input
            label="Description / Remarks"
            placeholder="e.g. Monthly room rent including high-speed WiFi"
            value={chargeForm.description}
            onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button variant="outline" size="sm" type="button" onClick={() => setCreateChargeModal(false)}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit">Generate Charge Invoice</Button>
          </div>
        </form>
      </Modal>

      {/* Create Notice Modal */}
      <Modal isOpen={createNoticeModal} onClose={() => setCreateNoticeModal(false)} title="Publish PG Announcement">
        <form onSubmit={handleCreateNotice} className="space-y-4">
          <Input
            label="Notice Title"
            placeholder="e.g. Water Tank Cleaning & Filter Maintenance"
            value={noticeForm.title}
            onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category"
              options={[
                { label: 'General Announcement', value: 'GENERAL' },
                { label: 'Maintenance Drive', value: 'MAINTENANCE' },
                { label: 'Payment Notice', value: 'PAYMENT' },
                { label: 'Emergency Alert', value: 'EMERGENCY' }
              ]}
              value={noticeForm.category}
              onChange={(e) => setNoticeForm({ ...noticeForm, category: e.target.value })}
            />
            <Select
              label="Priority Level"
              options={[
                { label: 'Normal Priority', value: 'NORMAL' },
                { label: 'Urgent Priority', value: 'URGENT' }
              ]}
              value={noticeForm.priority}
              onChange={(e) => setNoticeForm({ ...noticeForm, priority: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Notice Body / Message</label>
            <textarea
              className="w-full h-24 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Enter full notice description to display on resident dashboards..."
              value={noticeForm.content}
              onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button variant="outline" size="sm" type="button" onClick={() => setCreateNoticeModal(false)}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit">Publish Announcement</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
