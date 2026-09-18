import { toast, useToast } from '../../context/ToastContext';
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
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { KPICard, Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { ownerApi } from '../../services/ownerApi';

export const OwnerDashboardPage: React.FC = () => {
  const { user, activeProperty } = useAuth();
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
    city: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '380009',
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
      setPropertyForm({ name: '', address: '', city: 'Ahmedabad', state: 'Gujarat', pincode: '380009', type: 'COED' });
      fetchDashboard();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create property');
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
      showToast(`Room ${roomForm.number} added!`);
      setRoomForm({ number: '', floor: '1', type: 'DOUBLE', capacity: '2', baseRent: '12000' });
      fetchDashboard();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create room');
    }
  };

  const handleCreateCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!chargeForm.residentId || !chargeForm.amount) {
        toast.error('Please fill all required fields');
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
      toast.error(err.message || 'Failed to create charge');
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
      toast.error(err.message || 'Failed to record expense');
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
      toast.error(err.message || 'Failed to add staff');
    }
  };

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!noticeForm.title || !noticeForm.content) {
        toast.error('Please fill title and content');
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
      toast.error(err.message || 'Failed to publish notice');
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
      toast.error(err.message || 'Failed to create task');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20">
        <div className="w-8 h-8 border-2 border-[#0B4036]/20 border-t-[#0B4036] rounded-full animate-spin" />
        <p className="mt-3 text-xs font-medium text-[#68736D]">Loading property operations...</p>
      </div>
    );
  }

  const kpis = dashboardData?.kpis || {
    totalProperties: 1,
    totalRooms: 0,
    totalBeds: 48,
    occupiedBeds: 45,
    availableBeds: 3,
    totalOccupancyPercentage: 94,
    activeResidents: 45,
    monthlyRevenue: 428000,
    outstandingRent: 24000,
    totalDeposits: 890000,
    openComplaints: 1,
    pendingVisitors: 2,
    staffCount: 6,
    lowInventoryAlerts: 1
  };

  const recentTickets = dashboardData?.recentComplaints || [];
  const recentVisitors = dashboardData?.recentVisitors || [];
  const overduePayments = dashboardData?.recentPayments?.filter((p: any) => p.status === 'OVERDUE') || [];
  const recentNotices = dashboardData?.recentNotices || [];
  const residentOptions = (dashboardData?.allResidents || []).map((r: any) => ({
    label: `${r.fullName} (Rm ${r.roomNumber || 'N/A'})`,
    value: r.id
  }));

  // Revenue Trend Mock Data for clean Recharts
  const revenueData = [
    { month: 'May', revenue: 380000, collected: 365000 },
    { month: 'Jun', revenue: 395000, collected: 390000 },
    { month: 'Jul', revenue: 410000, collected: 405000 },
    { month: 'Aug', revenue: 415000, collected: 410000 },
    { month: 'Sep', revenue: 425000, collected: 418000 },
    { month: 'Oct', revenue: 428000, collected: 404000 }
  ];

  const occupancyTrendData = [
    { month: 'May', occupancy: 88 },
    { month: 'Jun', occupancy: 91 },
    { month: 'Jul', occupancy: 90 },
    { month: 'Aug', occupancy: 93 },
    { month: 'Sep', occupancy: 95 },
    { month: 'Oct', occupancy: 94 }
  ];

  const ownerDisplayName = user?.name ? user.name.split(' ')[0] : 'Owner';

  return (
    <div className="space-y-6 text-left">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3.5 rounded-lg bg-[#EAF2EE] text-[#0B4036] border border-[#0B4036]/20 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-[#0B4036]" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-xs text-[#0B4036]/70 hover:text-[#0B4036]">
            Dismiss
          </button>
        </div>
      )}

      {/* Header: Exact Required Greeting & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#DDE2DD] pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#18231F]">
            Good morning, {ownerDisplayName}
          </h1>
          <p className="text-xs text-[#68736D] mt-0.5">
            Here's what's happening across your properties.
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

      {/* KPI Row (Occupancy, Revenue, Pending Rent, Open Tickets) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Occupancy Rate"
          value={`${kpis.totalOccupancyPercentage || kpis.occupancyRate || 94}%`}
          subtitle={`${kpis.occupiedBeds || 45} of ${kpis.totalBeds || 48} Beds Occupied`}
          icon={BedDouble}
          trend={{ value: '+2.4%', isPositive: true }}
          color="forest"
          onClick={() => navigate('/owner/rooms')}
        />

        <KPICard
          title="Total Revenue"
          value={`₹${(kpis.totalRevenueCollected || kpis.monthlyRevenue || 428000).toLocaleString('en-IN')}`}
          subtitle="Monthly cycle collections"
          icon={CreditCard}
          trend={{ value: '+4.1%', isPositive: true }}
          color="forest"
          onClick={() => navigate('/owner/payments')}
        />

        <KPICard
          title="Rent Pending"
          value={`₹${(kpis.totalOutstandingRent || kpis.outstandingRent || 24000).toLocaleString('en-IN')}`}
          subtitle={`${overduePayments.length || 2} overdue invoices`}
          icon={Wallet}
          color="gold"
          onClick={() => navigate('/owner/payments')}
        />

        <KPICard
          title="Open Tickets"
          value={kpis.openComplaints || kpis.openComplaintsCount || 1}
          subtitle="Maintenance requests"
          icon={Wrench}
          color={kpis.openComplaints > 0 ? 'amber' : 'forest'}
          onClick={() => navigate('/owner/maintenance')}
        />
      </div>

      {/* Quick Actions Strip */}
      <div className="p-3.5 rounded-xl bg-white border border-[#DDE2DD] shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A928D]">Quick Actions</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          <Button
            variant="outline"
            size="xs"
            onClick={() => navigate('/owner/residents/lifecycle')}
            className="flex flex-col items-center justify-center p-2.5 h-auto text-xs"
          >
            <UserPlus className="w-3.5 h-3.5 text-[#0B4036] mb-1" />
            <span>+ Resident</span>
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => setCreatePropertyModal(true)}
            className="flex flex-col items-center justify-center p-2.5 h-auto text-xs"
          >
            <Home className="w-3.5 h-3.5 text-[#0B4036] mb-1" />
            <span>+ Property</span>
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => setCreateRoomModal(true)}
            className="flex flex-col items-center justify-center p-2.5 h-auto text-xs"
          >
            <BedDouble className="w-3.5 h-3.5 text-[#0B4036] mb-1" />
            <span>+ Room</span>
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => setCreateChargeModal(true)}
            className="flex flex-col items-center justify-center p-2.5 h-auto text-xs"
          >
            <CreditCard className="w-3.5 h-3.5 text-[#0B4036] mb-1" />
            <span>+ Invoice</span>
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => setCreateExpenseModal(true)}
            className="flex flex-col items-center justify-center p-2.5 h-auto text-xs"
          >
            <DollarSign className="w-3.5 h-3.5 text-[#B9954E] mb-1" />
            <span>+ Expense</span>
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => setCreateStaffModal(true)}
            className="flex flex-col items-center justify-center p-2.5 h-auto text-xs"
          >
            <Users className="w-3.5 h-3.5 text-[#0B4036] mb-1" />
            <span>+ Staff</span>
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => setCreateNoticeModal(true)}
            className="flex flex-col items-center justify-center p-2.5 h-auto text-xs"
          >
            <Bell className="w-3.5 h-3.5 text-[#0B4036] mb-1" />
            <span>+ Notice</span>
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => setCreateTaskModal(true)}
            className="flex flex-col items-center justify-center p-2.5 h-auto text-xs"
          >
            <CheckSquare className="w-3.5 h-3.5 text-[#0B4036] mb-1" />
            <span>+ Task</span>
          </Button>
        </div>
      </div>

      {/* Row 2: Charts in Forest Green and Champagne Gold */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-8 p-5 bg-white border border-[#DDE2DD] rounded-xl shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#18231F]">Revenue Collection Trend</h3>
              <p className="text-xs text-[#8A928D]">Billed vs Collected Rent over the last 6 months</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-[#0B4036]" /> Collected
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-[#C8A45D]" /> Billed
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="forestArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0B4036" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0B4036" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="goldArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C8A45D" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#C8A45D" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#DDE2DD" opacity={0.6} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#68736D' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#68736D' }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip
                  formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Amount']}
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDE2DD', borderRadius: '8px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#C8A45D" strokeWidth={2} fillOpacity={1} fill="url(#goldArea)" />
                <Area type="monotone" dataKey="collected" stroke="#0B4036" strokeWidth={2} fillOpacity={1} fill="url(#forestArea)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Occupancy Trend Chart */}
        <div className="lg:col-span-4 p-5 bg-white border border-[#DDE2DD] rounded-xl shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-[#18231F]">Occupancy Rate (%)</h3>
            <p className="text-xs text-[#8A928D]">Consistent occupancy across branches</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={occupancyTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#DDE2DD" opacity={0.6} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#68736D' }} tickLine={false} axisLine={false} />
                <YAxis domain={[70, 100]} tick={{ fontSize: 11, fill: '#68736D' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  formatter={(v: any) => [`${v}%`, 'Occupancy']}
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#DDE2DD', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="occupancy" fill="#0B4036" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Recent Payments & Maintenance Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payments Table */}
        <div className="p-5 bg-white border border-[#DDE2DD] rounded-xl shadow-xs space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-[#DDE2DD]">
            <div>
              <h3 className="text-sm font-bold text-[#18231F]">Recent Rent Payments</h3>
              <p className="text-[11px] text-[#8A928D]">Real-time ledger updates</p>
            </div>
            <Link to="/owner/payments" className="text-xs font-semibold text-[#0B4036] hover:underline">
              View All
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="text-[#8A928D] border-b border-[#DDE2DD]">
                  <th className="py-2">Resident</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2">Date</th>
                  <th className="py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE2DD]">
                {dashboardData?.recentPayments?.slice(0, 5).map((p: any, idx: number) => (
                  <tr key={idx} className="hover:bg-[#F8F7F3]">
                    <td className="py-2.5 font-medium text-[#18231F]">{p.residentName || 'Resident'}</td>
                    <td className="py-2.5 font-bold text-[#0B4036]">₹{(p.amount || 0).toLocaleString('en-IN')}</td>
                    <td className="py-2.5 text-[#68736D]">{p.paidDate || p.createdAt?.split('T')[0] || 'Today'}</td>
                    <td className="py-2.5 text-right">
                      <StatusBadge status={p.status || 'PAID'} />
                    </td>
                  </tr>
                )) || (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-[#8A928D]">
                      No recent payment records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Maintenance Tickets */}
        <div className="p-5 bg-white border border-[#DDE2DD] rounded-xl shadow-xs space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-[#DDE2DD]">
            <div>
              <h3 className="text-sm font-bold text-[#18231F]">Maintenance Work Orders</h3>
              <p className="text-[11px] text-[#8A928D]">Open service requests</p>
            </div>
            <Link to="/owner/maintenance" className="text-xs font-semibold text-[#0B4036] hover:underline">
              View All
            </Link>
          </div>

          <div className="space-y-2">
            {recentTickets.length > 0 ? (
              recentTickets.slice(0, 4).map((ticket: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 bg-[#F8F7F3] rounded-lg border border-[#DDE2DD] flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#18231F]">{ticket.title || 'Maintenance Issue'}</span>
                      <span className="text-[10px] text-[#8A928D]">Room {ticket.roomNumber || '204'}</span>
                    </div>
                    <p className="text-[11px] text-[#68736D] mt-0.5">
                      Reported by {ticket.residentName || 'Resident'} · {ticket.category || 'General'}
                    </p>
                  </div>
                  <StatusBadge status={ticket.status || 'IN_PROGRESS'} />
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-[#8A928D]">
                No open maintenance tickets. All facilities operational.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 4: Visitor Desk & Today's Operational Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visitor Desk Overview */}
        <div className="p-5 bg-white border border-[#DDE2DD] rounded-xl shadow-xs space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-[#DDE2DD]">
            <div>
              <h3 className="text-sm font-bold text-[#18231F]">Gate Visitor Desk</h3>
              <p className="text-[11px] text-[#8A928D]">Today's active visitor passes</p>
            </div>
            <Link to="/owner/visitors" className="text-xs font-semibold text-[#0B4036] hover:underline">
              Manage Passes
            </Link>
          </div>

          <div className="space-y-2">
            {recentVisitors.length > 0 ? (
              recentVisitors.slice(0, 3).map((vis: any, idx: number) => (
                <div key={idx} className="p-2.5 bg-[#F8F7F3] rounded-lg border border-[#DDE2DD] flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-[#18231F]">{vis.visitorName}</span>
                    <p className="text-[11px] text-[#68736D]">Visiting: {vis.hostName || 'Resident'}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={vis.status || 'CHECKED_IN'} />
                    <p className="text-[10px] text-[#8A928D] mt-0.5">{vis.expectedTime || '04:00 PM'}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-[#8A928D]">
                No active visitor passes at the moment.
              </div>
            )}
          </div>
        </div>

        {/* Notices Feed */}
        <div className="p-5 bg-white border border-[#DDE2DD] rounded-xl shadow-xs space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-[#DDE2DD]">
            <div>
              <h3 className="text-sm font-bold text-[#18231F]">Noticeboard Announcements</h3>
              <p className="text-[11px] text-[#8A928D]">Broadcasted updates</p>
            </div>
            <button onClick={() => setCreateNoticeModal(true)} className="text-xs font-semibold text-[#0B4036] hover:underline">
              + New Notice
            </button>
          </div>

          <div className="space-y-2">
            {recentNotices.length > 0 ? (
              recentNotices.slice(0, 3).map((n: any, idx: number) => (
                <div key={idx} className="p-2.5 bg-[#FAF5EB] rounded-lg border border-[#C8A45D]/30 text-xs">
                  <div className="flex justify-between items-center font-bold text-[#18231F]">
                    <span>{n.title}</span>
                    <span className="text-[10px] text-[#B9954E] font-semibold">{n.priority || 'NORMAL'}</span>
                  </div>
                  <p className="text-[11px] text-[#68736D] mt-1 line-clamp-2">{n.content}</p>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-xs text-[#8A928D]">
                No active notices. Broadcast announcements to residents here.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- ALL 8 ACTION MODALS --- */}
      {/* 1. Create Property Modal */}
      <Modal isOpen={createPropertyModal} onClose={() => setCreatePropertyModal(false)} title="Add New Property" maxWidth="md">
        <form onSubmit={handleCreateProperty} className="space-y-3">
          <Input label="Property Name" placeholder="e.g. Urban Nest Residency" value={propertyForm.name} onChange={(e) => setPropertyForm({ ...propertyForm, name: e.target.value })} required />
          <Input label="Address" placeholder="Street, Landmark" value={propertyForm.address} onChange={(e) => setPropertyForm({ ...propertyForm, address: e.target.value })} required />
          <div className="grid grid-cols-2 gap-2">
            <Input label="City" value={propertyForm.city} onChange={(e) => setPropertyForm({ ...propertyForm, city: e.target.value })} required />
            <Input label="Pincode" value={propertyForm.pincode} onChange={(e) => setPropertyForm({ ...propertyForm, pincode: e.target.value })} required />
          </div>
          <Select label="Type" value={propertyForm.type} onChange={(e) => setPropertyForm({ ...propertyForm, type: e.target.value })} options={[{ label: 'Co-Ed', value: 'COED' }, { label: "Boys PG", value: 'BOYS' }, { label: "Girls PG", value: 'GIRLS' }]} />
          <div className="flex justify-end gap-2 pt-3 border-t border-[#DDE2DD]">
            <Button variant="outline" size="sm" onClick={() => setCreatePropertyModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm">Create Property</Button>
          </div>
        </form>
      </Modal>

      {/* 2. Create Room Modal */}
      <Modal isOpen={createRoomModal} onClose={() => setCreateRoomModal(false)} title="Add Room & Beds" maxWidth="md">
        <form onSubmit={handleCreateRoom} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input label="Room Number" placeholder="e.g. 204" value={roomForm.number} onChange={(e) => setRoomForm({ ...roomForm, number: e.target.value })} required />
            <Input label="Floor" type="number" value={roomForm.floor} onChange={(e) => setRoomForm({ ...roomForm, floor: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select label="Sharing Type" value={roomForm.type} onChange={(e) => setRoomForm({ ...roomForm, type: e.target.value })} options={[{ label: 'Single', value: 'SINGLE' }, { label: 'Double', value: 'DOUBLE' }, { label: 'Triple', value: 'TRIPLE' }, { label: 'Four Sharing', value: 'FOUR' }]} />
            <Input label="Base Monthly Rent (₹)" type="number" value={roomForm.baseRent} onChange={(e) => setRoomForm({ ...roomForm, baseRent: e.target.value })} required />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-[#DDE2DD]">
            <Button variant="outline" size="sm" onClick={() => setCreateRoomModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm">Create Room</Button>
          </div>
        </form>
      </Modal>

      {/* 3. Create Charge Modal */}
      <Modal isOpen={createChargeModal} onClose={() => setCreateChargeModal(false)} title="Generate Rent Invoice" maxWidth="md">
        <form onSubmit={handleCreateCharge} className="space-y-3">
          <Select label="Select Resident" value={chargeForm.residentId} onChange={(e) => setChargeForm({ ...chargeForm, residentId: e.target.value })} options={[{ label: '-- Select Resident --', value: '' }, ...residentOptions]} required />
          <div className="grid grid-cols-2 gap-2">
            <Input label="Invoice Amount (₹)" type="number" placeholder="14000" value={chargeForm.amount} onChange={(e) => setChargeForm({ ...chargeForm, amount: e.target.value })} required />
            <Input label="Billing Period" placeholder="October 2026" value={chargeForm.period} onChange={(e) => setChargeForm({ ...chargeForm, period: e.target.value })} required />
          </div>
          <Input label="Due Date" type="date" value={chargeForm.dueDate} onChange={(e) => setChargeForm({ ...chargeForm, dueDate: e.target.value })} required />
          <div className="flex justify-end gap-2 pt-3 border-t border-[#DDE2DD]">
            <Button variant="outline" size="sm" onClick={() => setCreateChargeModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm">Issue Invoice</Button>
          </div>
        </form>
      </Modal>

      {/* 4. Create Expense Modal */}
      <Modal isOpen={createExpenseModal} onClose={() => setCreateExpenseModal(false)} title="Record Operating Expense" maxWidth="md">
        <form onSubmit={handleCreateExpense} className="space-y-3">
          <Input label="Expense Title" placeholder="e.g. October Electricity Bill" value={expenseForm.title} onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })} required />
          <div className="grid grid-cols-2 gap-2">
            <Select label="Category" value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })} options={[{ label: 'Utilities & Power', value: 'UTILITIES' }, { label: 'Wi-Fi & Internet', value: 'INTERNET' }, { label: 'Cleaning Supplies', value: 'CLEANING' }, { label: 'Repairs', value: 'MAINTENANCE' }]} />
            <Input label="Amount (₹)" type="number" placeholder="4500" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} required />
          </div>
          <Input label="Vendor / Payee" placeholder="BESCOM / ACT Fibernet" value={expenseForm.vendor} onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })} />
          <div className="flex justify-end gap-2 pt-3 border-t border-[#DDE2DD]">
            <Button variant="outline" size="sm" onClick={() => setCreateExpenseModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm">Save Expense</Button>
          </div>
        </form>
      </Modal>

      {/* 5. Create Staff Modal */}
      <Modal isOpen={createStaffModal} onClose={() => setCreateStaffModal(false)} title="Add Staff Member" maxWidth="md">
        <form onSubmit={handleCreateStaff} className="space-y-3">
          <Input label="Full Name" placeholder="e.g. Ramesh Kumar" value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} required />
          <Input label="Phone Number" placeholder="+91 98765 43210" value={staffForm.mobile} onChange={(e) => setStaffForm({ ...staffForm, mobile: e.target.value })} required />
          <div className="grid grid-cols-2 gap-2">
            <Select label="Role" value={staffForm.role} onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })} options={[{ label: 'Housekeeping', value: 'CLEANING' }, { label: 'Warden', value: 'WARDEN' }, { label: 'Security Guard', value: 'SECURITY' }, { label: 'Electrician / Plumber', value: 'MAINTENANCE' }]} />
            <Select label="Shift" value={staffForm.shift} onChange={(e) => setStaffForm({ ...staffForm, shift: e.target.value })} options={[{ label: 'Morning Shift', value: 'MORNING' }, { label: 'Evening Shift', value: 'EVENING' }, { label: 'Night Shift', value: 'NIGHT' }]} />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-[#DDE2DD]">
            <Button variant="outline" size="sm" onClick={() => setCreateStaffModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm">Register Staff</Button>
          </div>
        </form>
      </Modal>

      {/* 6. Create Notice Modal */}
      <Modal isOpen={createNoticeModal} onClose={() => setCreateNoticeModal(false)} title="Broadcast Notice" maxWidth="md">
        <form onSubmit={handleCreateNotice} className="space-y-3">
          <Input label="Notice Title" placeholder="e.g. Water Tank Cleaning on Sunday" value={noticeForm.title} onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })} required />
          <Textarea label="Notice Details" rows={3} placeholder="Provide complete information for residents..." value={noticeForm.content} onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })} required />
          <div className="flex justify-end gap-2 pt-3 border-t border-[#DDE2DD]">
            <Button variant="outline" size="sm" onClick={() => setCreateNoticeModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm">Publish Notice</Button>
          </div>
        </form>
      </Modal>

      {/* 7. Create Task Modal */}
      <Modal isOpen={createTaskModal} onClose={() => setCreateTaskModal(false)} title="Create Operational Task" maxWidth="md">
        <form onSubmit={handleCreateTask} className="space-y-3">
          <Input label="Task Title" placeholder="e.g. Inspect Floor 2 Fire Extinguishers" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} required />
          <div className="grid grid-cols-2 gap-2">
            <Select label="Category" value={taskForm.category} onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })} options={[{ label: 'Housekeeping', value: 'HOUSEKEEPING' }, { label: 'Security Check', value: 'SECURITY' }, { label: 'Maintenance Audit', value: 'MAINTENANCE' }]} />
            <Input label="Due Date" type="date" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} required />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-[#DDE2DD]">
            <Button variant="outline" size="sm" onClick={() => setCreateTaskModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm">Assign Task</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
