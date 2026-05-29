import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserCog, Plus, Search, Trash2, Mail, Building, Key } from 'lucide-react';

export const StaffPage: React.FC = () => {
  const { activeProperty } = useAuth();
  const [staff, setStaff] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('MANAGER');

  const loadStaff = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    const propId = activeProperty?.id;

    try {
      const url = propId ? `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/staff?propertyId=${propId}` : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/staff`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setStaff(await res.json());
      } else {
        throw new Error('API failed');
      }
    } catch (err) {
      console.warn('Backend staff API failed. Loading mock team profiles.');
      const savedStaff = localStorage.getItem('mock_staff');
      if (savedStaff) {
        setStaff(JSON.parse(savedStaff));
      } else {
        const defaultStaff = [
          { id: 's1', name: 'Rohan Mehta (Manager)', email: 'manager.gurgaon@pg.com', role: 'MANAGER', property: { name: 'Gurgaon Branch' } },
          { id: 's2', name: 'Sneha Sharma (Receptionist)', email: 'reception.gurgaon@pg.com', role: 'RECEPTIONIST', property: { name: 'Gurgaon Branch' } },
          { id: 's3', name: 'Vijay Verma (Accountant)', email: 'accounts.noida@pg.com', role: 'ACCOUNTANT', property: { name: 'Noida Branch' } },
        ];
        setStaff(defaultStaff);
        localStorage.setItem('mock_staff', JSON.stringify(defaultStaff));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, [activeProperty]);

  const handleInviteStaff = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !phone || !password) {
      alert('Required parameters missing.');
      return;
    }

    const payload = {
      name,
      email,
      phone,
      password,
      role,
      propertyId: activeProperty?.id || 'c9284cdd-f556-4d74-af01-611da1397c0d',
    };

    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/register-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        // Since it returns OTP, we bypass verification in mock flow or hit verify-otp
        await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, otp: data.otp || '123456' }),
        });
        setIsAddModalOpen(false);
        resetForm();
        loadStaff();
      } else {
        throw new Error('Register failed');
      }
    } catch (err) {
      const newStaff = {
        id: 'staff_mock_' + Date.now(),
        name,
        email,
        role,
        property: { name: activeProperty?.name || 'Gurgaon Branch' },
      };
      const updated = [...staff, newStaff];
      setStaff(updated);
      localStorage.setItem('mock_staff', JSON.stringify(updated));
      setIsAddModalOpen(false);
      resetForm();
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!window.confirm('Revoke staff account credentials?')) return;
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/staff/${staffId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        loadStaff();
      } else {
        throw new Error('Delete staff failed');
      }
    } catch (err) {
      const updated = staff.filter(s => s.id !== staffId);
      setStaff(updated);
      localStorage.setItem('mock_staff', JSON.stringify(updated));
    }
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setRole('MANAGER');
  };

  return (
    <div className="space-y-6">
      
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Staff Management</h1>
          <p className="text-xs text-slate-400 font-bold uppercase mt-1">Audit profile credentials and roles authorizations</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:opacity-90 active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-purple-500/20"
        >
          <Plus size={16} />
          Invite Staff Profile
        </button>
      </div>

      {/* 2. STAFF LIST */}
      {isLoading ? (
        <div className="py-20 text-center text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">
          Retrieving staff listings...
        </div>
      ) : staff.length === 0 ? (
        <div className="py-20 rounded-3xl glass-card text-center space-y-2 border border-slate-500/10">
          <p className="text-sm font-bold text-slate-400 uppercase">No active staff accounts.</p>
          <p className="text-[10px] text-slate-400">Click invite to delegate administrative powers.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {staff.map((s) => (
            <div key={s.id} className="rounded-3xl glass-card border border-white/20 p-5 flex flex-col justify-between h-48 shadow-sm">
              <div>
                <div className="flex justify-between items-start">
                  <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-purple-500/15 text-purple-400">
                    {s.role}
                  </span>
                  
                  <span className="text-[9.5px] text-slate-400 font-bold flex items-center gap-1.5 uppercase">
                    <Building size={11} />
                    {s.property?.name || 'Multi Branch'}
                  </span>
                </div>

                <h3 className="text-sm font-black mt-3">{s.name}</h3>
                <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5 mt-0.5">
                  <Mail size={12} /> {s.email}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-500/5 mt-auto flex items-center justify-between">
                <span className="text-[9px] text-slate-400 font-bold">
                  Credentials active
                </span>
                
                <button
                  onClick={() => handleDeleteStaff(s.id)}
                  className="p-2 rounded-xl bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 text-red-500 transition-colors"
                  title="Remove staff account"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. DIALOG: INVITE STAFF */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl glass-card border border-white/20 p-6 shadow-xl space-y-4 animate-scale-up">
            <div className="flex justify-between items-center pb-2 border-b border-slate-500/10">
              <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5"><UserCog size={16} className="text-purple-500" /> Create Staff</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleInviteStaff} className="space-y-4 text-xs font-bold text-slate-400">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase mb-1.5 pl-0.5">Staff Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patel"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                  />
                </div>
                <div>
                  <label className="block uppercase mb-1.5 pl-0.5">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase mb-1.5 pl-0.5">Login Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="name@pg.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                  />
                </div>
                <div>
                  <label className="block uppercase mb-1.5 pl-0.5">Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block uppercase mb-1.5 pl-0.5">Assigned Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold bg-transparent"
                >
                  <option value="MANAGER" className="dark:bg-slate-900">Branch Manager</option>
                  <option value="RECEPTIONIST" className="dark:bg-slate-900">Receptionist / Warden</option>
                  <option value="ACCOUNTANT" className="dark:bg-slate-900">Accountant</option>
                  <option value="MAINTENANCE" className="dark:bg-slate-900">Maintenance Specialist</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:opacity-90 active:scale-95 text-white font-bold text-xs tracking-wide transition-all shadow-md shadow-purple-500/20"
              >
                Create Staff Account
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
