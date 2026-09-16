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
  Bell,
  CheckSquare,
  DollarSign,
  UserPlus,
  Home,
  RefreshCw
} from 'lucide-react';
import { KPICard } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { ownerApi } from '../../services/ownerApi';

export const OwnerDashboardPage: React.FC = () => {
  const { activeProperty } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quick Action Modal states
  const [createPropertyModal, setCreatePropertyModal] = useState(false);
  const [createRoomModal, setCreateRoomModal] = useState(false);
  const [createChargeModal, setCreateChargeModal] = useState(false);
  const [createExpenseModal, setCreateExpenseModal] = useState(false);
  const [createStaffModal, setCreateStaffModal] = useState(false);
  const [createNoticeModal, setCreateNoticeModal] = useState(false);
  const [createTaskModal, setCreateTaskModal] = useState(false);

  // Form states
  const [propertyForm, setPropertyForm] = useState({
    name: '',
    address: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560034',
    type: 'COED'
  });

  const [roomForm, setRoomForm] = useState({
    number: '',
    floor: '1',
    type: 'DOUBLE',
    capacity: '2',
    baseRent: '12000'
  });

  const [chargeForm, setChargeForm] = useState({
    residentId: '',
    category: 'RENT',
    amount: '',
    period: 'October 2026',
    dueDate: new Date().toISOString().split('T')[0],
    description: ''
  });

  const [expenseForm, setExpenseForm] = useState({
    title: '',
    category: 'UTILITIES',
    amount: '',
    vendor: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    mobile: '',
    role: 'CLEANING',
    shift: 'MORNING',
    salary: '18000'
  });

  const [noticeForm, setNoticeForm] = useState({
    title: '',
    content: '',
    category: 'GENERAL',
    priority: 'NORMAL'
  });

  const [taskForm, setTaskForm] = useState({
    title: '',
    category: 'HOUSEKEEPING',
    priority: 'MEDIUM',
    dueDate: new Date().toISOString().split('T')[0],
    description: ''
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

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

  // Submit Handlers
  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ownerApi.createProperty({
        ...propertyForm,
        totalFloors: 4,
        amenities: ['High-speed WiFi', 'Power Backup', 'Housekeeping']
      });
      setCreatePropertyModal(false);
      showToast(`Property "${propertyForm.name}" created successfully!`);
      setPropertyForm({ name: '', address: '', city: 'Bengaluru', state: 'Karnataka', pincode: '560034', type: 'COED' });
      fetchDashboard();
    } catch (err: any) {
      alert(err.message || 'Failed to create property');
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ownerApi.createRoom({
        propertyId: activeProperty?.id,
        number: roomForm.number,
        floor: parseInt(roomForm.floor) || 1,
        type: roomForm.type,
        capacity: parseInt(roomForm.capacity) || 2,
        baseRent: parseFloat(roomForm.baseRent) || 12000
      });
      setCreateRoomModal(false);
      showToast(`Room ${roomForm.number} and beds added!`);
      setRoomForm({ number: '', floor: '1', type: 'DOUBLE', capacity: '2', baseRent: '12000' });
      fetchDashboard();
    } catch (err: any) {
      alert(err.message || 'Failed to create room');
    }
  };

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
      showToast('Charge invoice generated successfully!');
      setChargeForm({ residentId: '', category: 'RENT', amount: '', period: 'October 2026', dueDate: new Date().toISOString().split('T')[0], description: '' });
      fetchDashboard();
    } catch (err: any) {
      alert(err.message || 'Failed to create charge');
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ownerApi.createExpense({
        propertyId: activeProperty?.id,
        title: expenseForm.title,
        category: expenseForm.category,
        amount: parseFloat(expenseForm.amount) || 0,
        vendor: expenseForm.vendor,
        date: expenseForm.date,
        description: expenseForm.notes
      });
      setCreateExpenseModal(false);
      showToast('Operating expense recorded!');
      setExpenseForm({ title: '', category: 'UTILITIES', amount: '', vendor: '', date: new Date().toISOString().split('T')[0], notes: '' });
      fetchDashboard();
    } catch (err: any) {
      alert(err.message || 'Failed to record expense');
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ownerApi.createStaff({
        propertyId: activeProperty?.id,
        name: staffForm.name,
        email: staffForm.email || undefined,
        mobile: staffForm.mobile,
        role: staffForm.role,
        shift: staffForm.shift,
        salary: staffForm.salary ? parseFloat(staffForm.salary) : undefined
      });
      setCreateStaffModal(false);
      showToast(`Staff member "${staffForm.name}" registered!`);
      setStaffForm({ name: '', email: '', mobile: '', role: 'CLEANING', shift: 'MORNING', salary: '18000' });
      fetchDashboard();
    } catch (err: any) {
      alert(err.message || 'Failed to add staff');
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
        propertyId: activeProperty?.id,
        title: noticeForm.title,
        content: noticeForm.content,
        category: noticeForm.category,
        priority: noticeForm.priority
      });
      setCreateNoticeModal(false);
      showToast('Notice published to resident board!');
      setNoticeForm({ title: '', content: '', category: 'GENERAL', priority: 'NORMAL' });
      fetchDashboard();
    } catch (err: any) {
      alert(err.message || 'Failed to publish notice');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ownerApi.createTask({
        propertyId: activeProperty?.id,
        title: taskForm.title,
        category: taskForm.category,
        priority: taskForm.priority,
        dueDate: taskForm.dueDate,
        notes: taskForm.description
      });
      setCreateTaskModal(false);
      showToast('Operational task created!');
      setTaskForm({ title: '', category: 'HOUSEKEEPING', priority: 'MEDIUM', dueDate: new Date().toISOString().split('T')[0], description: '' });
      fetchDashboard();
    } catch (err: any) {
      alert(err.message || 'Failed to create task');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20">
        <div className="w-10 h-10 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
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
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-500 text-white flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-semibold">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-white/80 hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Dashboard Title & Property Identity */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Operations & Admin Hub
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time multi-branch PG operations for{' '}
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              {activeProperty?.name || 'Urban Nest Premium PG'}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchDashboard} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/owner/residents/lifecycle')}
            leftIcon={<UserPlus className="w-3.5 h-3.5" />}
          >
            Move-In Resident
          </Button>
        </div>
      </div>

      {/* Quick Action Matrix (All 8 Working CRUD Actions) */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Quick Actions Hub</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/owner/residents/lifecycle')}
            className="flex flex-col items-center justify-center p-3 h-auto text-xs hover:border-indigo-400"
          >
            <UserPlus className="w-4 h-4 text-indigo-600 mb-1" />
            <span>+ Resident</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreatePropertyModal(true)}
            className="flex flex-col items-center justify-center p-3 h-auto text-xs hover:border-indigo-400"
          >
            <Home className="w-4 h-4 text-blue-600 mb-1" />
            <span>+ Property</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateRoomModal(true)}
            className="flex flex-col items-center justify-center p-3 h-auto text-xs hover:border-indigo-400"
          >
            <BedDouble className="w-4 h-4 text-violet-600 mb-1" />
            <span>+ Room</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateChargeModal(true)}
            className="flex flex-col items-center justify-center p-3 h-auto text-xs hover:border-indigo-400"
          >
            <CreditCard className="w-4 h-4 text-emerald-600 mb-1" />
            <span>+ Invoice</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateExpenseModal(true)}
            className="flex flex-col items-center justify-center p-3 h-auto text-xs hover:border-indigo-400"
          >
            <DollarSign className="w-4 h-4 text-rose-600 mb-1" />
            <span>+ Expense</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateStaffModal(true)}
            className="flex flex-col items-center justify-center p-3 h-auto text-xs hover:border-indigo-400"
          >
            <Users className="w-4 h-4 text-amber-600 mb-1" />
            <span>+ Staff</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateNoticeModal(true)}
            className="flex flex-col items-center justify-center p-3 h-auto text-xs hover:border-indigo-400"
          >
            <Bell className="w-4 h-4 text-purple-600 mb-1" />
            <span>+ Notice</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateTaskModal(true)}
            className="flex flex-col items-center justify-center p-3 h-auto text-xs hover:border-indigo-400"
          >
            <CheckSquare className="w-4 h-4 text-teal-600 mb-1" />
            <span>+ Task</span>
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
              <span>
                • <strong>{overduePayments.length}</strong> overdue rent payments
              </span>
              <span>
                • <strong>{recentVisitors.filter((v: any) => v.status === 'PENDING').length}</strong> visitor requests
                pending
              </span>
              <span>
                • <strong>{kpis.openComplaints}</strong> open maintenance complaints
              </span>
              <span>
                • <strong>{kpis.lowInventoryAlerts || 0}</strong> low stock asset alerts
              </span>
            </div>
          </div>
        </div>

        <Link to="/owner/payments">
          <Button
            variant="outline"
            size="sm"
            className="border-amber-300 text-amber-900 dark:text-amber-200 bg-white dark:bg-slate-900"
          >
            Resolve Overdues
          </Button>
        </Link>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KPICard
          title="Occupancy Rate"
          value={`${kpis.totalOccupancyPercentage || 0}%`}
          subtitle={`${kpis.occupiedBeds || 0} of ${kpis.totalBeds || 0} beds occupied (${kpis.availableBeds || 0} vacant)`}
          icon={BedDouble}
          color="blue"
        />
        <KPICard
          title="Monthly Revenue"
          value={`₹${(kpis.monthlyRevenue || 0).toLocaleString('en-IN')}`}
          subtitle={`Collected from ${kpis.activeResidents || 0} active residents`}
          icon={TrendingUp}
          color="emerald"
        />
        <KPICard
          title="Outstanding Rent"
          value={`₹${(kpis.outstandingRent || 0).toLocaleString('en-IN')}`}
          subtitle={`${overduePayments.length} overdue invoices`}
          icon={CreditCard}
          color="amber"
        />
        <KPICard
          title="Open Maintenance"
          value={kpis.openComplaints || 0}
          subtitle={`${kpis.staffCount || 0} staff members on duty`}
          icon={Wrench}
          color="purple"
        />
      </div>

      {/* Main Grid: Charts & Operational Streams */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Financial & Occupancy Trend */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Occupancy & Revenue Trend</h3>
                <p className="text-xs text-slate-500">Monthly billing and bed occupancy performance</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                FY 2026-27
              </span>
            </div>

            {/* SaaS Bar Chart */}
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
                    <div
                      className="w-1/2 bg-indigo-600 rounded-t-lg transition-all group-hover:bg-indigo-700"
                      style={{ height: `${(bar.rev / 600) * 100}%` }}
                      title={`Revenue: ₹${bar.rev}k`}
                    />
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
                <span className="w-3 h-3 rounded bg-indigo-600 inline-block" />
                <span>Monthly Collection</span>
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
              <Link
                to="/owner/payments"
                className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
              >
                View Ledger <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {overduePayments.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                No overdue payments at this time. All resident accounts are current!
              </p>
            ) : (
              <div className="space-y-3">
                {overduePayments.map((pay: any) => (
                  <div
                    key={pay.id}
                    className="p-3.5 rounded-xl border border-rose-200/70 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/20 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {pay.residentName || pay.resident?.fullName} (Rm{' '}
                        {pay.roomNumber || pay.resident?.room?.number || 'N/A'})
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Period: {pay.period || pay.month} • Due: {new Date(pay.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-extrabold text-rose-600 dark:text-rose-400">
                        ₹{(pay.amount || 0).toLocaleString('en-IN')}
                      </p>
                      <StatusBadge status="OVERDUE" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Operations Overview */}
        <div className="space-y-6">
          {/* Recent Visitors */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                Today's Visitor Desk
              </h3>
              <Link to="/owner/visitors" className="text-xs text-indigo-600 hover:underline">
                View Desk
              </Link>
            </div>

            {recentVisitors.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No recent visitor passes.</p>
            ) : (
              <div className="space-y-3">
                {recentVisitors.slice(0, 3).map((vis: any) => (
                  <div
                    key={vis.id}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">{vis.visitorName || vis.name}</span>
                      <StatusBadge status={vis.status} />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Host: {vis.residentName || vis.resident?.fullName} (Rm{' '}
                      {vis.roomNumber || vis.resident?.room?.number || 'N/A'})
                    </p>
                    <p className="text-[11px] text-slate-400">Purpose: {vis.purpose}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Maintenance Desk */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-purple-600" />
                Active Maintenance
              </h3>
              <Link to="/owner/maintenance" className="text-xs text-indigo-600 hover:underline">
                View All
              </Link>
            </div>

            {recentTickets.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No active maintenance complaints.</p>
            ) : (
              <div className="space-y-3">
                {recentTickets.slice(0, 3).map((tkt: any) => (
                  <div
                    key={tkt.id}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white truncate max-w-[170px]">
                        {tkt.title}
                      </span>
                      <StatusBadge status={tkt.status} />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Rm {tkt.roomNumber || tkt.resident?.room?.number || 'N/A'} •{' '}
                      {tkt.residentName || tkt.resident?.fullName}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notices */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-600" />
                Active Announcements
              </h3>
              <Link to="/owner/notices" className="text-xs text-indigo-600 hover:underline">
                Manage
              </Link>
            </div>

            {recentNotices.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No notices published.</p>
            ) : (
              <div className="space-y-2">
                {recentNotices.slice(0, 2).map((n: any) => (
                  <div
                    key={n.id}
                    className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-xs"
                  >
                    <p className="font-bold text-slate-900 dark:text-white">{n.title}</p>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{n.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 1. Add Property Modal */}
      <Modal isOpen={createPropertyModal} onClose={() => setCreatePropertyModal(false)} title="Register New PG Property">
        <form onSubmit={handleCreateProperty} className="space-y-4">
          <Input
            label="Property Name"
            placeholder="e.g. Urban Nest Signature Whitefield"
            value={propertyForm.name}
            onChange={(e) => setPropertyForm({ ...propertyForm, name: e.target.value })}
            required
          />
          <Input
            label="Full Address"
            placeholder="e.g. 42 ITPL Main Road, Whitefield"
            value={propertyForm.address}
            onChange={(e) => setPropertyForm({ ...propertyForm, address: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="City"
              value={propertyForm.city}
              onChange={(e) => setPropertyForm({ ...propertyForm, city: e.target.value })}
              required
            />
            <Select
              label="PG Type"
              options={[
                { label: 'Co-ed PG', value: 'COED' },
                { label: 'Boys PG Only', value: 'BOYS' },
                { label: 'Girls PG Only', value: 'GIRLS' }
              ]}
              value={propertyForm.type}
              onChange={(e) => setPropertyForm({ ...propertyForm, type: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button variant="outline" size="sm" type="button" onClick={() => setCreatePropertyModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Register Property
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Add Room Modal */}
      <Modal isOpen={createRoomModal} onClose={() => setCreateRoomModal(false)} title="Add Room & Auto-create Beds">
        <form onSubmit={handleCreateRoom} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Room Number"
              placeholder="e.g. 201"
              value={roomForm.number}
              onChange={(e) => setRoomForm({ ...roomForm, number: e.target.value })}
              required
            />
            <Input
              label="Floor Number"
              type="number"
              value={roomForm.floor}
              onChange={(e) => setRoomForm({ ...roomForm, floor: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Room Sharing Type"
              options={[
                { label: 'Single Occupancy (1 Bed)', value: 'SINGLE' },
                { label: 'Double Sharing (2 Beds)', value: 'DOUBLE' },
                { label: 'Triple Sharing (3 Beds)', value: 'TRIPLE' },
                { label: 'Four Sharing (4 Beds)', value: 'FOUR' }
              ]}
              value={roomForm.type}
              onChange={(e) => {
                const cap = e.target.value === 'SINGLE' ? '1' : e.target.value === 'DOUBLE' ? '2' : e.target.value === 'TRIPLE' ? '3' : '4';
                setRoomForm({ ...roomForm, type: e.target.value, capacity: cap });
              }}
            />
            <Input
              label="Monthly Rent per Bed (₹)"
              type="number"
              value={roomForm.baseRent}
              onChange={(e) => setRoomForm({ ...roomForm, baseRent: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button variant="outline" size="sm" type="button" onClick={() => setCreateRoomModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Create Room & Beds
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. Create Charge Invoice Modal */}
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
            <Button variant="outline" size="sm" type="button" onClick={() => setCreateChargeModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Generate Charge Invoice
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. Add Expense Modal */}
      <Modal isOpen={createExpenseModal} onClose={() => setCreateExpenseModal(false)} title="Record Operational Expense">
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <Input
            label="Expense Title"
            placeholder="e.g. Commercial Water Tanker Delivery"
            value={expenseForm.title}
            onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Expense Category"
              options={[
                { label: 'Utilities (Water/Power)', value: 'UTILITIES' },
                { label: 'Maintenance & Repairs', value: 'MAINTENANCE' },
                { label: 'Housekeeping & Supplies', value: 'SUPPLIES' },
                { label: 'High-speed Internet / WiFi', value: 'INTERNET' },
                { label: 'Staff Salaries', value: 'SALARY' },
                { label: 'Security & Surveillance', value: 'SECURITY' },
                { label: 'Other Operating Expense', value: 'OTHER' }
              ]}
              value={expenseForm.category}
              onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
            />
            <Input
              label="Amount (₹)"
              type="number"
              placeholder="3500"
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Vendor / Payee"
              placeholder="e.g. Kaveri Water Supplies"
              value={expenseForm.vendor}
              onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
            />
            <Input
              label="Expense Date"
              type="date"
              value={expenseForm.date}
              onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
              required
            />
          </div>
          <Input
            label="Notes / Receipt Ref"
            placeholder="e.g. Receipt #INV-9821"
            value={expenseForm.notes}
            onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button variant="outline" size="sm" type="button" onClick={() => setCreateExpenseModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Log Expense
            </Button>
          </div>
        </form>
      </Modal>

      {/* 5. Add Staff Modal */}
      <Modal isOpen={createStaffModal} onClose={() => setCreateStaffModal(false)} title="Register PG Staff Member">
        <form onSubmit={handleCreateStaff} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="e.g. Ramesh Kumar"
            value={staffForm.name}
            onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Mobile Number"
              placeholder="e.g. +91 98765 43210"
              value={staffForm.mobile}
              onChange={(e) => setStaffForm({ ...staffForm, mobile: e.target.value })}
              required
            />
            <Input
              label="Email (Optional)"
              placeholder="e.g. ramesh@gmail.com"
              value={staffForm.email}
              onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Select
              label="Role"
              options={[
                { label: 'Cleaning & Housekeeping', value: 'CLEANING' },
                { label: 'Security Guard', value: 'SECURITY' },
                { label: 'Electrician / Plumber', value: 'MAINTENANCE' },
                { label: 'Cook & Kitchen', value: 'COOK' },
                { label: 'Supervisor / Manager', value: 'MANAGER' }
              ]}
              value={staffForm.role}
              onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
            />
            <Select
              label="Assigned Shift"
              options={[
                { label: 'Morning (06:00 - 14:00)', value: 'MORNING' },
                { label: 'Evening (14:00 - 22:00)', value: 'EVENING' },
                { label: 'Night (22:00 - 06:00)', value: 'NIGHT' },
                { label: 'Full Day General', value: 'GENERAL' }
              ]}
              value={staffForm.shift}
              onChange={(e) => setStaffForm({ ...staffForm, shift: e.target.value })}
            />
            <Input
              label="Monthly Salary (₹)"
              type="number"
              value={staffForm.salary}
              onChange={(e) => setStaffForm({ ...staffForm, salary: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button variant="outline" size="sm" type="button" onClick={() => setCreateStaffModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Register Staff Member
            </Button>
          </div>
        </form>
      </Modal>

      {/* 6. Create Notice Modal */}
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
              className="w-full h-24 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Enter full notice description to display on resident dashboards..."
              value={noticeForm.content}
              onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button variant="outline" size="sm" type="button" onClick={() => setCreateNoticeModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Publish Announcement
            </Button>
          </div>
        </form>
      </Modal>

      {/* 7. Create Operational Task Modal */}
      <Modal isOpen={createTaskModal} onClose={() => setCreateTaskModal(false)} title="Create Staff Operational Task">
        <form onSubmit={handleCreateTask} className="space-y-4">
          <Input
            label="Task Title"
            placeholder="e.g. Deep clean 3rd Floor common corridor & water dispenser"
            value={taskForm.title}
            onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
            required
          />
          <div className="grid grid-cols-3 gap-3">
            <Select
              label="Category"
              options={[
                { label: 'Housekeeping', value: 'HOUSEKEEPING' },
                { label: 'Maintenance', value: 'MAINTENANCE' },
                { label: 'Inspection', value: 'INSPECTION' },
                { label: 'Security Check', value: 'SECURITY' },
                { label: 'General', value: 'GENERAL' }
              ]}
              value={taskForm.category}
              onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })}
            />
            <Select
              label="Priority"
              options={[
                { label: 'Low', value: 'LOW' },
                { label: 'Medium', value: 'MEDIUM' },
                { label: 'High', value: 'HIGH' },
                { label: 'Urgent', value: 'URGENT' }
              ]}
              value={taskForm.priority}
              onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
            />
            <Input
              label="Target Due Date"
              type="date"
              value={taskForm.dueDate}
              onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
              required
            />
          </div>
          <Input
            label="Instructions / Notes"
            placeholder="e.g. Check floor mop heads and sanitize door handles"
            value={taskForm.description}
            onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button variant="outline" size="sm" type="button" onClick={() => setCreateTaskModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Assign & Create Task
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default OwnerDashboardPage;
