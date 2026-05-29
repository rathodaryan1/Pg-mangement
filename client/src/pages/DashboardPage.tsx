import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Home, 
  CheckSquare, 
  DollarSign, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingUp,
  FileText,
  Calendar
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const { activeProperty, isMockMode } = useAuth();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load dashboard metrics
  useEffect(() => {
    const fetchDashboard = async () => {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const url = activeProperty 
        ? `http://localhost:5000/api/dashboard/stats?propertyId=${activeProperty.id}`
        : 'http://localhost:5000/api/dashboard/stats';

      try {
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const statsData = await res.json();
          setData(statsData);
        } else {
          throw new Error('API fetch failed');
        }
      } catch (err) {
        console.warn('Dashboard API failed. Loading rich mock statistics.');
        // High quality mock aggregation fallback
        setData({
          stats: {
            totalInmates: activeProperty?.id === '71c32f62-6821-4613-976e-d6d020d2cbcd' ? 2 : 2,
            totalRooms: activeProperty?.id === '71c32f62-6821-4613-976e-d6d020d2cbcd' ? 3 : 4,
            occupiedRooms: activeProperty?.id === '71c32f62-6821-4613-976e-d6d020d2cbcd' ? 2 : 2,
            availableRooms: activeProperty?.id === '71c32f62-6821-4613-976e-d6d020d2cbcd' ? 1 : 2,
            maintenanceRooms: activeProperty?.id === '71c32f62-6821-4613-976e-d6d020d2cbcd' ? 0 : 0,
            monthlyRevenue: activeProperty?.id === '71c32f62-6821-4613-976e-d6d020d2cbcd' ? 20000 : 18000,
            pendingRevenue: activeProperty?.id === '71c32f62-6821-4613-976e-d6d020d2cbcd' ? 32000 : 18000,
            checkInsToday: 1,
            checkOutsToday: 0,
            occupancyRate: activeProperty?.id === '71c32f62-6821-4613-976e-d6d020d2cbcd' ? 66 : 50,
          },
          notices: [
            { id: '1', title: 'Power Shut Down', content: 'Scheduled maintenance from 2PM to 4PM.', category: 'Maintenance', isImportant: true, createdAt: new Date() },
            { id: '2', title: 'New Gate Timings', content: 'Main gate closes at 11:30 PM.', category: 'Rules', isImportant: false, createdAt: new Date() },
          ],
          maintenanceRequests: [
            { id: '1', title: 'Water Tap Leaking', status: 'OPEN', priority: 'HIGH', member: { fullName: 'Aakash Verma' } },
            { id: '2', title: 'Wifi Speed Drops', status: 'IN_PROGRESS', priority: 'MEDIUM', member: { fullName: 'Vikram Singh' } },
          ],
          upcomingPayments: [
            { id: '1', amount: 18000, dueDate: new Date('2026-06-05'), period: 'June 2026', status: 'PENDING', member: { fullName: 'Aakash Verma', mobile: '9812345678' } },
            { id: '2', amount: 12000, dueDate: new Date('2026-05-05'), period: 'May 2026', status: 'APPROVAL_PENDING', member: { fullName: 'Riya Sen', mobile: '8877665544' } },
          ],
          recentActivities: [
            { id: '1', title: 'New Booking Check-in', desc: 'Aakash Verma allocated Single bed (101)', time: new Date() },
            { id: '2', title: 'Rent Payment Captured', desc: 'Rs. 18,000 received for Aakash (May 2026)', time: new Date() },
            { id: '3', title: 'Maintenance Complaint Raised', desc: 'Room 103 reported flush leakage', time: new Date() },
          ],
          chartData: [
            { month: 'Dec', revenue: 75000, expenses: 42000 },
            { month: 'Jan', revenue: 84000, expenses: 48000 },
            { month: 'Feb', revenue: 95000, expenses: 51000 },
            { month: 'Mar', revenue: 104000, expenses: 58000 },
            { month: 'Apr', revenue: 110000, expenses: 62000 },
            { month: 'May', revenue: activeProperty?.id === '71c32f62-6821-4613-976e-d6d020d2cbcd' ? 20000 : 18000, expenses: 8400 },
          ],
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, [activeProperty]);

  if (isLoading || !data) {
    return (
      <div className="h-[60vh] flex items-center justify-center flex-col gap-3">
        <div className="w-10 h-10 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Compiling PG registers...</p>
      </div>
    );
  }

  const { stats, notices, maintenanceRequests, upcomingPayments, recentActivities, chartData } = data;

  const roomDistribution = [
    { name: 'Occupied', value: stats.occupiedRooms, color: '#ec4899' },
    { name: 'Available', value: stats.availableRooms, color: '#3b82f6' },
    { name: 'Maintenance', value: stats.maintenanceRooms, color: '#e2e8f0' },
  ];

  return (
    <div className="space-y-6">
      
      {/* 1. WELCOME BANNER AND INDICATOR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight font-sans">
            Dashboard
          </h1>
          <p className="text-xs text-slate-400 font-bold uppercase mt-1">
            Active context: <span className="text-purple-500">{activeProperty?.name || 'All Properties'}</span>
          </p>
        </div>
        {isMockMode && (
          <span className="px-3 py-1 text-[10px] font-black rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-wider animate-pulse-slow">
            ⚡ Sandbox Mock Mode Active
          </span>
        )}
      </div>

      {/* 2. KPI STAT CARDS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Occupancy */}
        <div className="p-4 rounded-3xl glass-card border border-white/20 shadow-sm relative overflow-hidden flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-2xl bg-pink-500/10 flex items-center justify-center text-pink-500">
              <Users size={20} />
            </div>
            <span className="px-2 py-0.5 rounded-lg bg-pink-500/10 text-[10px] font-bold text-pink-500 uppercase">
              {stats.occupancyRate}% Rate
            </span>
          </div>
          <div>
            <p className="text-2xl font-black">{stats.totalInmates}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Inmates</p>
          </div>
        </div>

        {/* Card 2: Rooms */}
        <div className="p-4 rounded-3xl glass-card border border-white/20 shadow-sm relative overflow-hidden flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Home size={20} />
            </div>
            <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 text-[10px] font-bold text-blue-500 uppercase">
              {stats.availableRooms} Empty Beds
            </span>
          </div>
          <div>
            <p className="text-2xl font-black">{stats.totalRooms}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Rooms</p>
          </div>
        </div>

        {/* Card 3: Revenue (Paid) */}
        <div className="p-4 rounded-3xl glass-card border border-white/20 shadow-sm relative overflow-hidden flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <DollarSign size={20} />
            </div>
            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-[10px] font-bold text-emerald-500 uppercase">
              Month May
            </span>
          </div>
          <div>
            <p className="text-2xl font-black">₹{stats.monthlyRevenue.toLocaleString()}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Monthly Revenue</p>
          </div>
        </div>

        {/* Card 4: Pending Dues */}
        <div className="p-4 rounded-3xl glass-card border border-white/20 shadow-sm relative overflow-hidden flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <AlertCircle size={20} />
            </div>
            <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-[10px] font-bold text-amber-500 uppercase">
              Action Req
            </span>
          </div>
          <div>
            <p className="text-2xl font-black">₹{stats.pendingRevenue.toLocaleString()}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Dues</p>
          </div>
        </div>

      </div>

      {/* 3. CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart A: Finance stats */}
        <div className="lg:col-span-2 p-5 rounded-3xl glass-card border border-white/20 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider">Financial Overview</h3>
              <p className="text-[10px] text-slate-400 font-bold">REVENUE VS EXPENSES COMPARISON</p>
            </div>
            <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded-lg">
              <TrendingUp size={14} />
              <span>+18.4%</span>
            </div>
          </div>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888815" />
                <XAxis dataKey="month" stroke="#88888860" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#88888860" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#0f1224', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '1rem', color: '#fff' }} />
                <Area type="monotone" dataKey="revenue" name="Revenue (INR)" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
                <Area type="monotone" dataKey="expenses" name="Expenses (INR)" stroke="#ec4899" fillOpacity={1} fill="url(#colorExp)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart B: Bed occupancy splits */}
        <div className="p-5 rounded-3xl glass-card border border-white/20 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider mb-1">Room Status Split</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-4">Current Bed Occupancy Allocation</p>
          </div>
          
          <div className="h-48 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={roomDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {roomDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black">{stats.occupancyRate}%</span>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Occupancy</span>
            </div>
          </div>

          <div className="flex justify-around items-center pt-2 border-t border-slate-500/5 mt-2">
            {roomDistribution.map((entry) => (
              <div key={entry.name} className="flex flex-col items-center">
                <span className="text-xs font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.value}
                </span>
                <span className="text-[9px] text-slate-400 uppercase font-semibold">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 4. DETAILS SECTION GRID (ACTIVITIES, NOTICE BOARD, BILLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Notice Board */}
        <div className="p-5 rounded-3xl glass-card border border-white/20 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider">Notice Board</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Recent PG Announcements</p>
          </div>
          
          <div className="space-y-3">
            {notices.length === 0 ? (
              <div className="py-6 text-center text-xs font-bold text-slate-400 uppercase">No active notices.</div>
            ) : (
              notices.map((n: any) => (
                <div key={n.id} className="p-3 rounded-2xl bg-slate-500/5 border border-slate-500/5 space-y-1 relative overflow-hidden">
                  <div className="flex justify-between items-center">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                      n.category === 'Maintenance' ? 'bg-amber-500/10 text-amber-500' : 'bg-purple-500/10 text-purple-500'
                    }`}>
                      {n.category}
                    </span>
                    {n.isImportant && (
                      <span className="text-[9px] text-rose-500 font-black uppercase tracking-wider animate-pulse-slow">★ Important</span>
                    )}
                  </div>
                  <h4 className="text-xs font-black truncate">{n.title}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{n.content}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active Maintenance complaints */}
        <div className="p-5 rounded-3xl glass-card border border-white/20 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider">Complaints</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Active Maintenance Tickets</p>
          </div>
          
          <div className="space-y-3">
            {maintenanceRequests.length === 0 ? (
              <div className="py-6 text-center text-xs font-bold text-slate-400 uppercase">No open issues!</div>
            ) : (
              maintenanceRequests.map((m: any) => (
                <div key={m.id} className="p-3 rounded-2xl bg-slate-500/5 border border-slate-500/5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-xs font-black truncate">{m.title}</h4>
                    <p className="text-[9px] font-semibold text-slate-400">By: {m.member.fullName}</p>
                  </div>
                  <div className="flex flex-col items-end shrink-0 gap-1">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                      m.status === 'OPEN' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      {m.status}
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[7px] font-black uppercase ${
                      m.priority === 'HIGH' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-500/10 text-slate-400'
                    }`}>
                      {m.priority}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Collections */}
        <div className="p-5 rounded-3xl glass-card border border-white/20 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider">Rent Dues</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Pending Billing Collections</p>
          </div>
          
          <div className="space-y-3">
            {upcomingPayments.length === 0 ? (
              <div className="py-6 text-center text-xs font-bold text-slate-400 uppercase">No pending dues.</div>
            ) : (
              upcomingPayments.map((p: any) => (
                <div key={p.id} className="p-3 rounded-2xl bg-slate-500/5 border border-slate-500/5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-xs font-black truncate">{p.member.fullName}</h4>
                    <p className="text-[9px] font-semibold text-slate-400">Period: {p.period}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-purple-500">₹{p.amount.toLocaleString()}</p>
                    <p className="text-[8px] text-rose-500 font-bold">Due: {new Date(p.dueDate).getDate()}/{new Date(p.dueDate).getMonth()+1}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* 5. RECENT ACTIVITIES FEED */}
      <div className="p-5 rounded-3xl glass-card border border-white/20 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider">Recent Operational Activity</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase">Real-time status timeline feed</p>
        </div>
        
        <div className="relative border-l border-purple-500/10 pl-4 space-y-5 ml-2 py-1">
          {recentActivities.map((act: any, index: number) => (
            <div key={act.id || index} className="relative group">
              <span className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 ring-4 ring-[#f3f4f9] dark:ring-[#080913]" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-xs font-black text-slate-800 dark:text-slate-200">{act.title}</span>
                <span className="text-[9px] text-slate-400 font-bold flex items-center gap-1 uppercase">
                  <Calendar size={10} />
                  {new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5 leading-relaxed">{act.desc || act.title}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
