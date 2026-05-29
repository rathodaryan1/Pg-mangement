import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Wrench, Plus, Check, Play, UserPlus, AlertCircle } from 'lucide-react';

export const MaintenancePage: React.FC = () => {
  const { activeProperty } = useAuth();
  const [issues, setIssues] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form inputs
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Plumbing');
  const [priority, setPriority] = useState('MEDIUM');
  const [memberId, setMemberId] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    const propId = activeProperty?.id;

    try {
      const issueUrl = propId ? `http://localhost:5000/api/issues?propertyId=${propId}` : 'http://localhost:5000/api/issues';
      const memUrl = propId ? `http://localhost:5000/api/members?propertyId=${propId}` : 'http://localhost:5000/api/members';

      const [issueRes, memRes] = await Promise.all([
        fetch(issueUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        fetch(memUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      ]);

      if (issueRes.ok && memRes.ok) {
        setIssues(await issueRes.json());
        setMembers(await memRes.json());
      } else {
        throw new Error('API failed');
      }
    } catch (err) {
      console.warn('Backend issues API failed. Loading mock complaints.');
      const savedIssues = localStorage.getItem('mock_issues');
      const savedMembers = localStorage.getItem('mock_members');

      if (savedIssues) setIssues(JSON.parse(savedIssues));
      if (savedMembers) setMembers(JSON.parse(savedMembers));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeProperty]);

  const handleRaiseIssue = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !description || !memberId) {
      alert('Required parameters missing.');
      return;
    }

    const payload = {
      title,
      description,
      category,
      priority,
      memberId,
    };

    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`http://localhost:5000/api/issues`, {
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
        loadData();
      } else {
        const err = await res.json();
        throw new Error(err.error);
      }
    } catch (err) {
      const targetMem = members.find(m => m.id === memberId);
      const newIssue = {
        id: 'issue_mock_' + Date.now(),
        ...payload,
        status: 'OPEN',
        createdAt: new Date(),
        member: targetMem || { fullName: 'Mock Tenant', room: { number: '101' } },
      };
      const updated = [newIssue, ...issues];
      setIssues(updated);
      localStorage.setItem('mock_issues', JSON.stringify(updated));
      setIsAddModalOpen(false);
      resetForm();
    }
  };

  const handleAssign = async (issueId: string) => {
    const assignee = prompt('Enter staff name or maintenance technician details:');
    if (!assignee) return;
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`http://localhost:5000/api/issues/${issueId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ assignedTo: assignee }),
      });
      if (res.ok) {
        loadData();
      } else {
        throw new Error('Assign API failed');
      }
    } catch (err) {
      const updated = issues.map(i => {
        if (i.id === issueId) {
          return { ...i, assignedTo: assignee, status: 'IN_PROGRESS' };
        }
        return i;
      });
      setIssues(updated);
      localStorage.setItem('mock_issues', JSON.stringify(updated));
    }
  };

  const handleResolve = async (issueId: string) => {
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`http://localhost:5000/api/issues/${issueId}/resolve`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        loadData();
      } else {
        throw new Error('Resolve API failed');
      }
    } catch (err) {
      const updated = issues.map(i => {
        if (i.id === issueId) {
          return { ...i, status: 'RESOLVED', resolvedAt: new Date() };
        }
        return i;
      });
      setIssues(updated);
      localStorage.setItem('mock_issues', JSON.stringify(updated));
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('Plumbing');
    setPriority('MEDIUM');
    setMemberId('');
  };

  return (
    <div className="space-y-6">
      
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Maintenance Board</h1>
          <p className="text-xs text-slate-400 font-bold uppercase mt-1">Audit active complaints and assign specialists</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:opacity-90 active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-purple-500/20"
        >
          <Plus size={16} />
          Raise Complaint
        </button>
      </div>

      {/* 2. COMPLAINT REGISTER LIST */}
      {isLoading ? (
        <div className="py-20 text-center text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">
          Retrieving maintenance logs...
        </div>
      ) : issues.length === 0 ? (
        <div className="py-20 rounded-3xl glass-card text-center space-y-2 border border-slate-500/10">
          <p className="text-sm font-bold text-slate-400 uppercase">No active maintenance complaints.</p>
          <p className="text-[10px] text-slate-400">Tickets will show up when logged by residents.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {issues.map((i) => (
            <div key={i.id} className="rounded-3xl glass-card border border-white/20 p-5 shadow-sm space-y-4 flex flex-col justify-between h-56">
              <div>
                <div className="flex justify-between items-start">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                    i.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-500' :
                    i.status === 'IN_PROGRESS' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'
                  }`}>
                    {i.status.replace('_', ' ')}
                  </span>
                  
                  <span className={`px-2 py-0.2 rounded text-[7.5px] font-black uppercase ${
                    i.priority === 'HIGH' ? 'bg-rose-500/20 text-rose-500' : 'bg-slate-500/10 text-slate-400'
                  }`}>
                    {i.priority} Priority
                  </span>
                </div>

                <h3 className="text-sm font-black truncate mt-2.5">{i.title}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{i.category} • Room {i.member?.room?.number || 'Unallocated'}</p>
                
                <p className="text-[11px] text-slate-500 dark:text-slate-300 font-semibold line-clamp-2 leading-relaxed mt-2.5">
                  "{i.description}"
                </p>

                {i.assignedTo && (
                  <p className="text-[9.5px] text-slate-400 font-bold uppercase mt-2.5">
                    ⚙️ Assigned to: <span className="text-purple-500">{i.assignedTo}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-500/5 mt-auto">
                {i.status !== 'RESOLVED' && (
                  <>
                    <button
                      onClick={() => handleAssign(i.id)}
                      className="flex-1 py-2 rounded-xl bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/10 text-purple-500 text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5"
                    >
                      <UserPlus size={12} /> {i.assignedTo ? 'Re-assign Staff' : 'Assign Worker'}
                    </button>
                    
                    <button
                      onClick={() => handleResolve(i.id)}
                      className="px-3 py-2 rounded-xl bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 text-emerald-500 font-bold text-xs transition-colors flex items-center justify-center"
                      title="Mark Resolved"
                    >
                      <Check size={13} />
                    </button>
                  </>
                )}
                {i.status === 'RESOLVED' && (
                  <p className="text-[10px] text-emerald-500 font-bold uppercase flex items-center gap-1 mx-auto py-1">
                    ✓ Resolved on {new Date(i.resolvedAt || i.createdAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. DIALOG: RAISE COMPLAINT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl glass-card border border-white/20 p-6 shadow-xl space-y-4 animate-scale-up">
            <div className="flex justify-between items-center pb-2 border-b border-slate-500/10">
              <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5"><Wrench size={16} className="text-purple-500" /> Raise Complaint Ticket</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleRaiseIssue} className="space-y-4 text-xs font-bold text-slate-400">
              <div>
                <label className="block uppercase mb-1.5 pl-0.5">Select Resident *</label>
                <select
                  required
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold bg-transparent"
                >
                  <option value="" className="dark:bg-slate-900">Choose resident complaining...</option>
                  {members.filter(m => m.status === 'ACTIVE').map((m) => (
                    <option key={m.id} value={m.id} className="dark:bg-slate-900">{m.fullName} (Room {m.room?.number || '?'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase mb-1.5 pl-0.5">Issue Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold bg-transparent"
                  >
                    <option value="Plumbing" className="dark:bg-slate-900">Plumbing</option>
                    <option value="Electrical" className="dark:bg-slate-900">Electrical / Power</option>
                    <option value="Cleaning" className="dark:bg-slate-900">Cleaning</option>
                    <option value="Wifi" className="dark:bg-slate-900">Wifi / Broadband</option>
                    <option value="Others" className="dark:bg-slate-900">Others</option>
                  </select>
                </div>
                <div>
                  <label className="block uppercase mb-1.5 pl-0.5">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold bg-transparent"
                  >
                    <option value="LOW" className="dark:bg-slate-900">Low</option>
                    <option value="MEDIUM" className="dark:bg-slate-900">Medium</option>
                    <option value="HIGH" className="dark:bg-slate-900">High</option>
                    <option value="URGENT" className="dark:bg-slate-900">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block uppercase mb-1.5 pl-0.5">Complaint Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Geyser not working"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                />
              </div>

              <div>
                <label className="block uppercase mb-1.5 pl-0.5">Description details *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Write clear explanation of the issue..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold bg-transparent"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:opacity-90 active:scale-95 text-white font-bold text-xs tracking-wide transition-all shadow-md shadow-purple-500/20"
              >
                File Complaint Ticket
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
