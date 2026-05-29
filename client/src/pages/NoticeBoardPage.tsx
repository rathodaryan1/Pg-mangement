import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, Plus, Calendar, Tag, AlertTriangle } from 'lucide-react';

export const NoticeBoardPage: React.FC = () => {
  const { activeProperty } = useAuth();
  const [notices, setNotices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('General');
  const [isImportant, setIsImportant] = useState(false);

  const loadNotices = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    const propId = activeProperty?.id;

    try {
      const url = propId ? `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/notices?propertyId=${propId}` : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/notices`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setNotices(await res.json());
      } else {
        throw new Error('API failed');
      }
    } catch (err) {
      console.warn('Backend notices API failed. Loading mock notice boards.');
      const savedNotices = localStorage.getItem('mock_notices');
      if (savedNotices) {
        setNotices(JSON.parse(savedNotices));
      } else {
        const defaultNotices = [
          { id: 'n1', title: 'Pest Control Services Sunday', content: 'There will be pest treatment in Gurgaon branch this Sunday 10AM to 2PM.', category: 'Maintenance', isImportant: true, createdAt: new Date() },
          { id: 'n2', title: 'Holi celebration party', content: 'Common hall sweets and colours will be arranged this Friday evening.', category: 'Event', isImportant: false, createdAt: new Date() },
        ];
        setNotices(defaultNotices);
        localStorage.setItem('mock_notices', JSON.stringify(defaultNotices));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotices();
  }, [activeProperty]);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !content) {
      alert('Fill in all fields.');
      return;
    }

    const payload = {
      title,
      content,
      category,
      isImportant,
      propertyId: activeProperty?.id || 'c9284cdd-f556-4d74-af01-611da1397c0d',
    };

    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/notices`, {
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
        loadNotices();
      } else {
        const err = await res.json();
        throw new Error(err.error);
      }
    } catch (err) {
      const newNotice = {
        id: 'notice_mock_' + Date.now(),
        ...payload,
        createdAt: new Date(),
      };
      const updated = [newNotice, ...notices];
      setNotices(updated);
      localStorage.setItem('mock_notices', JSON.stringify(updated));
      setIsAddModalOpen(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setCategory('General');
    setIsImportant(false);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Notice Board</h1>
          <p className="text-xs text-slate-400 font-bold uppercase mt-1">Publish alerts and announcements for residents</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:opacity-90 active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-purple-500/20"
        >
          <Plus size={16} />
          Create Announcement
        </button>
      </div>

      {/* 2. NOTICE SLIPS LIST */}
      {isLoading ? (
        <div className="py-20 text-center text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">
          Retrieving notices logs...
        </div>
      ) : notices.length === 0 ? (
        <div className="py-20 rounded-3xl glass-card text-center space-y-2 border border-slate-500/10">
          <p className="text-sm font-bold text-slate-400 uppercase">Notice board is empty.</p>
          <p className="text-[10px] text-slate-400">Announcements will appear here when published.</p>
        </div>
      ) : (
        <div className="space-y-4 max-w-4xl">
          {notices.map((n) => (
            <div 
              key={n.id} 
              className={`rounded-3xl glass-card border p-5 shadow-sm space-y-3 relative overflow-hidden transition-all ${
                n.isImportant ? 'border-rose-500/30 bg-rose-500/5' : 'border-white/20'
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="flex gap-2 items-center">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                    n.category === 'Maintenance' ? 'bg-amber-500/10 text-amber-500' :
                    n.category === 'Rules' ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500'
                  }`}>
                    {n.category}
                  </span>
                  
                  {n.isImportant && (
                    <span className="px-2 py-0.5 rounded bg-rose-500/15 text-[8.5px] font-black text-rose-500 uppercase tracking-wider animate-pulse-slow">
                      ★ Critical Alert
                    </span>
                  )}
                </div>

                <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1.5">
                  <Calendar size={12} />
                  {new Date(n.createdAt).toLocaleDateString()}
                </span>
              </div>

              <h3 className="text-sm font-black">{n.title}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold leading-relaxed">
                {n.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 3. DIALOG: CREATE ANNOUNCEMENT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl glass-card border border-white/20 p-6 shadow-xl space-y-4 animate-scale-up">
            <div className="flex justify-between items-center pb-2 border-b border-slate-500/10">
              <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5"><Bell size={16} className="text-purple-500" /> Create Notice</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handlePublish} className="space-y-4 text-xs font-bold text-slate-400">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase mb-1.5 pl-0.5">Alert Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold bg-transparent"
                  >
                    <option value="General" className="dark:bg-slate-900">General Notice</option>
                    <option value="Rules" className="dark:bg-slate-900">House Rules</option>
                    <option value="Maintenance" className="dark:bg-slate-900">Maintenance Work</option>
                    <option value="Event" className="dark:bg-slate-900">Celebration / Events</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2 mt-6 pl-2">
                  <input
                    type="checkbox"
                    id="isImportant"
                    checked={isImportant}
                    onChange={(e) => setIsImportant(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-500 focus:ring-purple-500 bg-transparent border-slate-500/20"
                  />
                  <label htmlFor="isImportant" className="uppercase select-none text-rose-500 cursor-pointer">★ Mark Critical</label>
                </div>
              </div>

              <div>
                <label className="block uppercase mb-1.5 pl-0.5">Notice Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Schedule Pest Control"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                />
              </div>

              <div>
                <label className="block uppercase mb-1.5 pl-0.5">Announcement Details *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Explain terms clearly to residents..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold bg-transparent"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:opacity-90 active:scale-95 text-white font-bold text-xs tracking-wide transition-all shadow-md shadow-purple-500/20"
              >
                Publish Notice
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
