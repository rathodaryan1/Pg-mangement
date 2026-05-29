import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserCheck, Plus, Search, LogOut, Clock, Calendar } from 'lucide-react';

export const VisitorsPage: React.FC = () => {
  const { activeProperty } = useAuth();
  const [visitors, setVisitors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [purpose, setPurpose] = useState('');
  const [hostMember, setHostMember] = useState('');

  const loadVisitors = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    const propId = activeProperty?.id;

    try {
      const url = propId ? `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/visitors?propertyId=${propId}` : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/visitors`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setVisitors(await res.json());
      } else {
        throw new Error('API failed');
      }
    } catch (err) {
      console.warn('Backend visitors failed. Fetching mock registries.');
      const savedVisitors = localStorage.getItem('mock_visitors');
      if (savedVisitors) {
        setVisitors(JSON.parse(savedVisitors));
      } else {
        const defaultVisitors = [
          { id: 'v1', fullName: 'Satish Verma (Uncle)', mobile: '9876599999', purpose: 'Dinner meet', hostMember: 'Aakash Verma', checkInTime: new Date('2026-05-29T14:00:00Z'), checkOutTime: new Date('2026-05-29T15:30:00Z') },
          { id: 'v2', fullName: 'Ramesh courier', mobile: '9888877777', purpose: 'Parcel delivery', hostMember: 'Sneha Rao', checkInTime: new Date() },
        ];
        setVisitors(defaultVisitors);
        localStorage.setItem('mock_visitors', JSON.stringify(defaultVisitors));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVisitors();
  }, [activeProperty]);

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName || !mobile || !purpose) {
      alert('Required parameters missing.');
      return;
    }

    const payload = {
      fullName,
      mobile,
      purpose,
      hostMember,
      propertyId: activeProperty?.id || 'c9284cdd-f556-4d74-af01-611da1397c0d',
    };

    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/visitors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        resetForm();
        loadVisitors();
      } else {
        throw new Error('Visitor failed');
      }
    } catch (err) {
      const newVisitor = {
        id: 'visitor_mock_' + Date.now(),
        ...payload,
        checkInTime: new Date(),
      };
      const updated = [newVisitor, ...visitors];
      setVisitors(updated);
      localStorage.setItem('mock_visitors', JSON.stringify(updated));
      setIsAddModalOpen(false);
      resetForm();
    }
  };

  const handleCheckout = async (visitorId: string) => {
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/visitors/${visitorId}/checkout`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        loadVisitors();
      } else {
        throw new Error('Checkout visitor failed');
      }
    } catch (err) {
      const updated = visitors.map(v => {
        if (v.id === visitorId) {
          return { ...v, checkOutTime: new Date() };
        }
        return v;
      });
      setVisitors(updated);
      localStorage.setItem('mock_visitors', JSON.stringify(updated));
    }
  };

  const resetForm = () => {
    setFullName('');
    setMobile('');
    setPurpose('');
    setHostMember('');
  };

  return (
    <div className="space-y-6">
      
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Visitor Gate Register</h1>
          <p className="text-xs text-slate-400 font-bold uppercase mt-1">Audit guest logs and exit checkout timers</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:opacity-90 active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-purple-500/20"
        >
          <Plus size={16} />
          New Visitor Check-in
        </button>
      </div>

      {/* 2. ACTIVE VISITORS */}
      {isLoading ? (
        <div className="py-20 text-center text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">
          Retrieving guest registry...
        </div>
      ) : visitors.length === 0 ? (
        <div className="py-20 rounded-3xl glass-card text-center space-y-2 border border-slate-500/10">
          <p className="text-sm font-bold text-slate-400 uppercase">Visitor log is empty.</p>
          <p className="text-[10px] text-slate-400">Recorded entry times will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visitors.map((v) => (
            <div key={v.id} className="rounded-3xl glass-card border border-white/20 p-5 shadow-sm space-y-4 flex flex-col justify-between h-52">
              <div>
                <div className="flex justify-between items-start">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                    v.checkOutTime ? 'bg-slate-500/15 text-slate-400' : 'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    {v.checkOutTime ? 'Departed' : 'Active Check-in'}
                  </span>
                  
                  <span className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-1.5">
                    <Clock size={11} />
                    {new Date(v.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <h3 className="text-sm font-black mt-2.5">{v.fullName}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{v.mobile}</p>
                
                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold mt-2.5 leading-relaxed">
                  Purpose: "{v.purpose}" {v.hostMember && `• Visiting: ${v.hostMember}`}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-500/5 mt-auto">
                {!v.checkOutTime ? (
                  <button
                    onClick={() => handleCheckout(v.id)}
                    className="w-full py-2 rounded-xl bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/10 text-purple-500 text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5"
                  >
                    <LogOut size={12} /> Log Departure Exit
                  </button>
                ) : (
                  <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1 mx-auto py-1">
                    Left at {new Date(v.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(v.checkOutTime).toLocaleDateString()})
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. DIALOG: NEW ENTRY CHECK-IN */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl glass-card border border-white/20 p-6 shadow-xl space-y-4 animate-scale-up">
            <div className="flex justify-between items-center pb-2 border-b border-slate-500/10">
              <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5"><UserCheck size={16} className="text-purple-500" /> New Guest Entry</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateEntry} className="space-y-4 text-xs font-bold text-slate-400">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase mb-1.5 pl-0.5">Visitor Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Guest full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                  />
                </div>
                <div>
                  <label className="block uppercase mb-1.5 pl-0.5">Contact Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block uppercase mb-1.5 pl-0.5">Host Resident (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Aakash Verma"
                  value={hostMember}
                  onChange={(e) => setHostMember(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                />
              </div>

              <div>
                <label className="block uppercase mb-1.5 pl-0.5">Purpose of Visit *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Courier drop, meeting, family visit"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:opacity-90 active:scale-95 text-white font-bold text-xs tracking-wide transition-all shadow-md shadow-purple-500/20"
              >
                Confirm Gate Entry
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
