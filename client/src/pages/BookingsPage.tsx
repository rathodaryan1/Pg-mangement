import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CalendarDays, Plus, Search, Check, X, ShieldCheck, UserCheck } from 'lucide-react';

export const BookingsPage: React.FC = () => {
  const { activeProperty } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [notes, setNotes] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    const propId = activeProperty?.id;

    try {
      const bookUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/bookings`;
      const roomUrl = propId ? `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/rooms?propertyId=${propId}` : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/rooms`;
      const memUrl = propId ? `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/members?propertyId=${propId}` : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/members`;

      const [bookRes, roomRes, memRes] = await Promise.all([
        fetch(bookUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        fetch(roomUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        fetch(memUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      ]);

      if (bookRes.ok && roomRes.ok && memRes.ok) {
        setBookings(await bookRes.json());
        setRooms(await roomRes.json());
        setMembers(await memRes.json());
      } else {
        throw new Error('API failed');
      }
    } catch (err) {
      console.warn('Backend bookings failed, using mock states');
      const savedBookings = localStorage.getItem('mock_bookings');
      if (savedBookings) {
        setBookings(JSON.parse(savedBookings));
      } else {
        const defaultBookings = [
          { id: 'b1', checkInDate: new Date('2025-10-15'), status: 'CONFIRMED', notes: 'Requested first floor', member: { fullName: 'Aakash Verma', mobile: '9812345678' }, room: { number: '101', type: 'Single' } },
        ];
        setBookings(defaultBookings);
        localStorage.setItem('mock_bookings', JSON.stringify(defaultBookings));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeProperty]);

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!memberId || !roomId || !checkInDate) {
      alert('Required parameters missing.');
      return;
    }

    const payload = {
      memberId,
      roomId,
      checkInDate: new Date(checkInDate).toISOString(),
      notes,
    };

    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        setNotes('');
        loadData();
      } else {
        const err = await res.json();
        throw new Error(err.error);
      }
    } catch (err: any) {
      const targetMem = members.find(m => m.id === memberId);
      const targetRoom = rooms.find(r => r.id === roomId);
      
      const newBook = {
        id: 'book_mock_' + Date.now(),
        ...payload,
        status: 'PENDING',
        member: targetMem || { fullName: 'Resident Sandbox', mobile: '0000000000' },
        room: targetRoom || { number: '???', type: 'Single' },
      };
      
      const updated = [newBook, ...bookings];
      setBookings(updated);
      localStorage.setItem('mock_bookings', JSON.stringify(updated));
      setIsAddModalOpen(false);
      setNotes('');
    }
  };

  const handleConfirm = async (bookId: string) => {
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/bookings/${bookId}/confirm`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        loadData();
      } else {
        throw new Error('Confirm failed');
      }
    } catch (err) {
      const updated = bookings.map(b => {
        if (b.id === bookId) {
          return { ...b, status: 'CONFIRMED' };
        }
        return b;
      });
      setBookings(updated);
      localStorage.setItem('mock_bookings', JSON.stringify(updated));
    }
  };

  const handleCancel = async (bookId: string) => {
    if (!window.confirm('Cancel this booking reservation?')) return;
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/bookings/${bookId}/cancel`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        loadData();
      } else {
        throw new Error('Cancel failed');
      }
    } catch (err) {
      const updated = bookings.map(b => {
        if (b.id === bookId) {
          return { ...b, status: 'CANCELLED' };
        }
        return b;
      });
      setBookings(updated);
      localStorage.setItem('mock_bookings', JSON.stringify(updated));
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Reservations Ledger</h1>
          <p className="text-xs text-slate-400 font-bold uppercase mt-1">Audit upcoming residents bed bookings</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:opacity-90 active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-purple-500/20"
        >
          <Plus size={16} />
          Create Reservation
        </button>
      </div>

      {/* 2. DIRECTORY */}
      {isLoading ? (
        <div className="py-20 text-center text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">
          Retrieving reservation books...
        </div>
      ) : bookings.length === 0 ? (
        <div className="py-20 rounded-3xl glass-card text-center space-y-2 border border-slate-500/10">
          <p className="text-sm font-bold text-slate-400 uppercase">No active bookings.</p>
          <p className="text-[10px] text-slate-400">Click create reservation to pre-assign residents.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookings.map((b) => (
            <div key={b.id} className="rounded-3xl glass-card border border-white/20 p-5 shadow-sm space-y-4 flex flex-col justify-between h-52">
              <div>
                <div className="flex justify-between items-start">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                    b.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-500' :
                    b.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'
                  }`}>
                    {b.status}
                  </span>
                  
                  <span className="text-[10px] text-slate-400 font-bold uppercase">
                    Check-in: {new Date(b.checkInDate).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-sm font-black mt-2.5">{b.member.fullName}</h3>
                <p className="text-[10px] text-slate-400 font-semibold">{b.member.mobile}</p>
                
                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold mt-2.5">
                  Allocated Room: <span className="font-extrabold text-purple-500">Room {b.room.number}</span> ({b.room.type})
                </p>

                {b.notes && (
                  <p className="text-[9.5px] text-slate-400 truncate mt-1 italic">
                    Note: "{b.notes}"
                  </p>
                )}
              </div>

              {b.status === 'PENDING' && (
                <div className="flex items-center gap-2 pt-3 border-t border-slate-500/5 mt-auto">
                  <button
                    onClick={() => handleConfirm(b.id)}
                    className="flex-1 py-2 rounded-xl bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/10 text-purple-500 text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5"
                  >
                    <Check size={12} /> Confirm Allocation
                  </button>

                  <button
                    onClick={() => handleCancel(b.id)}
                    className="px-3 py-2 rounded-xl bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 text-red-500 transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 3. DIALOG: CREATE RESERVATION */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl glass-card border border-white/20 p-6 shadow-xl space-y-4 animate-scale-up">
            <div className="flex justify-between items-center pb-2 border-b border-slate-500/10">
              <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5"><CalendarDays size={16} className="text-purple-500" /> Book Room</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateBooking} className="space-y-4 text-xs font-bold text-slate-400">
              <div>
                <label className="block uppercase mb-1.5 pl-0.5">Select Resident *</label>
                <select
                  required
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold bg-transparent"
                >
                  <option value="" className="dark:bg-slate-900">Choose resident...</option>
                  {members.filter(m => m.status === 'RESERVED' || m.status === 'INACTIVE').map((m) => (
                    <option key={m.id} value={m.id} className="dark:bg-slate-900">{m.fullName} ({m.mobile})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase mb-1.5 pl-0.5">Select Room *</label>
                  <select
                    required
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold bg-transparent"
                  >
                    <option value="" className="dark:bg-slate-900">Select room...</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id} className="dark:bg-slate-900">Room {r.number} ({r.type})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block uppercase mb-1.5 pl-0.5">Expected Check-in *</label>
                  <input
                    type="date"
                    required
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block uppercase mb-1.5 pl-0.5">Special Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Needs upper bed, vegetarian"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:opacity-90 active:scale-95 text-white font-bold text-xs tracking-wide transition-all shadow-md shadow-purple-500/20"
              >
                Confirm Room Booking
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
