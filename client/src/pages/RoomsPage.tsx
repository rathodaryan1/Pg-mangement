import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, Home, Tag, Info, Trash2, CheckCircle2, AlertTriangle, Eye } from 'lucide-react';

export const RoomsPage: React.FC = () => {
  const { activeProperty } = useAuth();
  const [rooms, setRooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states
  const [number, setNumber] = useState('');
  const [type, setType] = useState('Single');
  const [capacity, setCapacity] = useState('1');
  const [rent, setRent] = useState('');
  const [status, setStatus] = useState('AVAILABLE');
  const [amenities, setAmenities] = useState('');

  const loadRooms = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    const propId = activeProperty?.id;

    try {
      const url = propId ? `http://localhost:5000/api/rooms?propertyId=${propId}` : 'http://localhost:5000/api/rooms';
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      } else {
        throw new Error('API failed');
      }
    } catch (err) {
      console.warn('Backend rooms API failed. Reading local mock values.');
      const savedRooms = localStorage.getItem('mock_rooms');
      if (savedRooms) {
        setRooms(JSON.parse(savedRooms));
      } else {
        const defaultRooms = [
          { id: 'r1', number: '101', type: 'Single', rent: 18000, capacity: 1, occupiedBeds: 1, status: 'OCCUPIED', amenities: 'AC, Wifi, TV', propertyId: propId },
          { id: 'r2', number: '102', type: 'Double', rent: 12000, capacity: 2, occupiedBeds: 0, status: 'AVAILABLE', amenities: 'AC, Wifi, Balcony', propertyId: propId },
          { id: 'r3', number: '103', type: 'Double', rent: 11000, capacity: 2, occupiedBeds: 1, status: 'AVAILABLE', amenities: 'Wifi', propertyId: propId },
          { id: 'r4', number: '203', type: 'Double', rent: 12000, capacity: 2, occupiedBeds: 0, status: 'MAINTENANCE', amenities: 'AC, Wifi', propertyId: propId },
        ];
        setRooms(defaultRooms);
        localStorage.setItem('mock_rooms', JSON.stringify(defaultRooms));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, [activeProperty]);

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!number || !rent || !capacity) {
      alert('Required parameters missing.');
      return;
    }

    const payload = {
      number,
      type,
      capacity: parseInt(capacity),
      rent: parseFloat(rent),
      status,
      amenities,
      propertyId: activeProperty?.id || 'c9284cdd-f556-4d74-af01-611da1397c0d',
    };

    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`http://localhost:5000/api/rooms`, {
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
        loadRooms();
      } else {
        const err = await res.json();
        throw new Error(err.error);
      }
    } catch (err: any) {
      console.warn('Real room creation failed, updating local mock state.');
      const newRoom = {
        id: 'room_mock_' + Date.now(),
        ...payload,
        occupiedBeds: 0,
        availableBeds: payload.capacity,
      };
      const updated = [...rooms, newRoom];
      setRooms(updated);
      localStorage.setItem('mock_rooms', JSON.stringify(updated));
      setIsAddModalOpen(false);
      resetForm();
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    const target = rooms.find(r => r.id === roomId);
    if (target?.occupiedBeds > 0) {
      alert('Cannot remove room. Beds are occupied by residents.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this room?')) return;
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`http://localhost:5000/api/rooms/${roomId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        loadRooms();
      } else {
        const data = await res.json();
        throw new Error(data.error);
      }
    } catch (err: any) {
      const updated = rooms.filter(r => r.id !== roomId);
      setRooms(updated);
      localStorage.setItem('mock_rooms', JSON.stringify(updated));
    }
  };

  const resetForm = () => {
    setNumber('');
    setType('Single');
    setCapacity('1');
    setRent('');
    setStatus('AVAILABLE');
    setAmenities('');
  };

  return (
    <div className="space-y-6">
      
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Room Configuration</h1>
          <p className="text-xs text-slate-400 font-bold uppercase mt-1">Configure layout capacity and bed occupancies</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:opacity-90 active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-purple-500/20"
        >
          <Plus size={16} />
          Create New Room
        </button>
      </div>

      {/* 2. ROOM DIRECTORY GRID */}
      {isLoading ? (
        <div className="py-20 text-center text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">
          Retrieving rooms ledger...
        </div>
      ) : rooms.length === 0 ? (
        <div className="py-20 rounded-3xl glass-card text-center space-y-2 border border-slate-500/10">
          <p className="text-sm font-bold text-slate-400 uppercase">No Rooms created.</p>
          <p className="text-[10px] text-slate-400">Click create room to assign starting layouts.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {rooms.map((r) => {
            const occupied = r.occupiedBeds || 0;
            const cap = r.capacity || 1;
            const emptyBeds = Math.max(0, cap - occupied);
            
            return (
              <div key={r.id} className="rounded-3xl glass-card border border-white/20 p-5 flex flex-col justify-between h-56 shadow-sm">
                <div>
                  <div className="flex justify-between items-start">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                      r.status === 'MAINTENANCE' ? 'bg-red-500/10 text-red-500' :
                      occupied >= cap ? 'bg-pink-500/10 text-pink-500' : 'bg-blue-500/10 text-blue-500'
                    }`}>
                      {r.status === 'MAINTENANCE' ? 'Maintenance' : occupied >= cap ? 'Fully Booked' : 'Available'}
                    </span>
                    
                    <span className="text-xs font-bold text-purple-500">₹{r.rent.toLocaleString()}/mo</span>
                  </div>

                  <h3 className="text-lg font-black mt-2">Room {r.number}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{r.type} Sharing</p>

                  {/* Bed occupancy grid dots indicator */}
                  <div className="flex gap-1.5 items-center mt-3">
                    {Array.from({ length: cap }).map((_, i) => (
                      <span 
                        key={i} 
                        className={`w-3.5 h-3.5 rounded-full border border-white/10 ${
                          i < occupied ? 'bg-pink-500' : 'bg-emerald-500/20'
                        }`} 
                        title={i < occupied ? 'Bed Occupied' : 'Bed Empty'}
                      />
                    ))}
                    <span className="text-[9px] text-slate-400 font-bold uppercase ml-1">
                      ({occupied}/{cap} Beds)
                    </span>
                  </div>

                  {/* Amenities */}
                  <p className="text-[10px] text-slate-400 truncate mt-3 font-semibold">
                    ⭐ {r.amenities || 'Attach washroom, wifi'}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-500/5 mt-auto flex items-center justify-between">
                  <span className="text-[9px] text-slate-400 font-bold">
                    {emptyBeds} bed available
                  </span>
                  
                  <button
                    onClick={() => handleDeleteRoom(r.id)}
                    className="p-2 rounded-xl bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 text-red-500 transition-colors"
                    title="Remove Room"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. DIALOG MODAL: ADD ROOM */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl glass-card border border-white/20 p-6 shadow-xl space-y-4 animate-scale-up">
            <div className="flex justify-between items-center pb-2 border-b border-slate-500/10">
              <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5"><Home size={16} className="text-purple-500" /> Configure Room</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddRoom} className="space-y-4 text-xs font-bold text-slate-400">
              <div>
                <label className="block uppercase mb-1.5 pl-0.5">Room Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 101, 204A"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase mb-1.5 pl-0.5">Sharing Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold bg-transparent"
                  >
                    <option value="Single" className="dark:bg-slate-900">Single Bed</option>
                    <option value="Double" className="dark:bg-slate-900">Double Sharing</option>
                    <option value="Triple" className="dark:bg-slate-900">Triple Sharing</option>
                    <option value="Four-sharing" className="dark:bg-slate-900">Four Sharing</option>
                  </select>
                </div>
                <div>
                  <label className="block uppercase mb-1.5 pl-0.5">Bed Capacity *</label>
                  <input
                    type="number"
                    required
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase mb-1.5 pl-0.5">Rent Price (INR) *</label>
                  <input
                    type="number"
                    required
                    placeholder="Rate per resident"
                    value={rent}
                    onChange={(e) => setRent(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                  />
                </div>
                <div>
                  <label className="block uppercase mb-1.5 pl-0.5">Starting Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold bg-transparent"
                  >
                    <option value="AVAILABLE" className="dark:bg-slate-900">Available</option>
                    <option value="MAINTENANCE" className="dark:bg-slate-900">Maintenance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block uppercase mb-1.5 pl-0.5">Amenities (Comma Separated)</label>
                <input
                  type="text"
                  placeholder="AC, Wifi, Balcony, attach bathroom"
                  value={amenities}
                  onChange={(e) => setAmenities(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:opacity-90 active:scale-95 text-white font-bold text-xs tracking-wide transition-all shadow-md shadow-purple-500/20"
              >
                Register Room
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
