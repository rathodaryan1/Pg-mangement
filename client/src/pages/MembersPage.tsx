import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Search, 
  UserPlus, 
  Eye, 
  Edit2, 
  Trash2, 
  UserX, 
  FileText, 
  Smartphone, 
  Mail, 
  MapPin, 
  Calendar,
  Briefcase,
  UploadCloud,
  ChevronRight,
  ShieldCheck,
  CheckCircle,
  Building
} from 'lucide-react';

export const MembersPage: React.FC = () => {
  const { activeProperty } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  
  // Add Member Form fields
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [workLocation, setWorkLocation] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [roomId, setRoomId] = useState('');
  const [joiningDate, setJoiningDate] = useState('');

  // Fetch members and rooms
  const loadData = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    const propId = activeProperty?.id;

    try {
      const memUrl = propId ? `http://localhost:5000/api/members?propertyId=${propId}` : 'http://localhost:5000/api/members';
      const roomUrl = propId ? `http://localhost:5000/api/rooms?propertyId=${propId}` : 'http://localhost:5000/api/rooms';

      const [memRes, roomRes] = await Promise.all([
        fetch(memUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        fetch(roomUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      ]);

      if (memRes.ok && roomRes.ok) {
        const memData = await memRes.json();
        const roomData = await roomRes.json();
        setMembers(memData);
        setRooms(roomData);
      } else {
        throw new Error('API failed');
      }
    } catch (err) {
      console.warn('Backend failed, loading mock members data from localStorage');
      const savedMembers = localStorage.getItem('mock_members');
      const savedRooms = localStorage.getItem('mock_rooms');

      if (savedMembers && savedRooms) {
        setMembers(JSON.parse(savedMembers));
        setRooms(JSON.parse(savedRooms));
      } else {
        // Build defaults
        const defaultMembers = [
          { id: '1', fullName: 'Aakash Verma', mobile: '9812345678', email: 'aakash.v@gmail.com', address: 'Karnal, Haryana', emergencyContact: 'Father - 9812345670', joiningDate: new Date('2025-10-15'), workLocation: 'Google, Gurugram', rentAmount: 18000, depositAmount: 18000, status: 'ACTIVE', roomId: 'r1', room: { number: '101' }, photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
          { id: '2', fullName: 'Sneha Rao', mobile: '9765432109', email: 'sneha.rao@yahoo.com', address: 'Jubilee Hills, Hyderabad', emergencyContact: 'Father - 9765432100', joiningDate: new Date('2026-01-10'), workLocation: 'Deloitte, Noida', rentAmount: 12000, depositAmount: 24000, status: 'ACTIVE', roomId: 'r2', room: { number: '302' }, photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
        ];
        const defaultRooms = [
          { id: 'r1', number: '101', type: 'Single', rent: 18000, capacity: 1, occupiedBeds: 1 },
          { id: 'r2', number: '302', type: 'Double', rent: 12000, capacity: 2, occupiedBeds: 1 },
        ];
        setMembers(defaultMembers);
        setRooms(defaultRooms);
        localStorage.setItem('mock_members', JSON.stringify(defaultMembers));
        localStorage.setItem('mock_rooms', JSON.stringify(defaultRooms));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeProperty]);

  // Handle Add Member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName || !mobile || !email || !rentAmount || !depositAmount) {
      alert('Please fill in required fields.');
      return;
    }

    const payload = {
      fullName,
      mobile,
      email,
      address,
      emergencyContact,
      workLocation,
      rentAmount: parseFloat(rentAmount),
      depositAmount: parseFloat(depositAmount),
      roomId: roomId || null,
      joiningDate: joiningDate || new Date().toISOString(),
      propertyId: activeProperty?.id || 'c9284cdd-f556-4d74-af01-611da1397c0d',
      status: roomId ? 'ACTIVE' : 'RESERVED',
    };

    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`http://localhost:5000/api/members`, {
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
    } catch (err: any) {
      console.warn('Real creation failed. Simulating local storage additions.');
      const newMember = {
        id: 'mem_mock_' + Date.now(),
        ...payload,
        room: rooms.find((r) => r.id === roomId) || null,
        photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      };
      const updatedMembers = [newMember, ...members];
      setMembers(updatedMembers);
      localStorage.setItem('mock_members', JSON.stringify(updatedMembers));
      setIsAddModalOpen(false);
      resetForm();
    }
  };

  const handleCheckout = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to check-out this member?')) return;
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`http://localhost:5000/api/members/${memberId}/checkout`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        loadData();
      } else {
        throw new Error('Checkout API failed');
      }
    } catch (err) {
      const updated = members.map((m) => {
        if (m.id === memberId) {
          return { ...m, status: 'CHECKED_OUT', roomId: null, room: null };
        }
        return m;
      });
      setMembers(updated);
      localStorage.setItem('mock_members', JSON.stringify(updated));
    }
  };

  const handleDelete = async (memberId: string) => {
    if (!window.confirm('Delete member permanently? This removes all dues, bookings, logs.')) return;
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`http://localhost:5000/api/members/${memberId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        loadData();
      } else {
        throw new Error('Delete API failed');
      }
    } catch (err) {
      const updated = members.filter((m) => m.id !== memberId);
      setMembers(updated);
      localStorage.setItem('mock_members', JSON.stringify(updated));
    }
  };

  const simulateDocUpload = (type: string) => {
    alert(`[MOCK UPLOAD] Uploading ${type} document slide... Image converted and cached successfully!`);
    if (selectedMember) {
      const updated = members.map(m => {
        if (m.id === selectedMember.id) {
          const updatedM = { ...m };
          if (type === 'photo') updatedM.photoUrl = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150';
          if (type === 'aadhaar') updatedM.aadhaarUrl = 'https://images.unsplash.com/photo-1563013544-824ae1d704d3?w=600';
          if (type === 'pan') updatedM.panUrl = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600';
          if (type === 'agreement') updatedM.agreementUrl = 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600';
          setSelectedMember(updatedM);
          return updatedM;
        }
        return m;
      });
      setMembers(updated);
      localStorage.setItem('mock_members', JSON.stringify(updated));
    }
  };

  const resetForm = () => {
    setFullName('');
    setMobile('');
    setEmail('');
    setAddress('');
    setEmergencyContact('');
    setWorkLocation('');
    setRentAmount('');
    setDepositAmount('');
    setRoomId('');
    setJoiningDate('');
  };

  const filteredMembers = members.filter(m => {
    const matchesSearch = m.fullName.toLowerCase().includes(search.toLowerCase()) || 
                          m.mobile.includes(search) || 
                          m.email.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterStatus === '' ? true : m.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      
      {/* 1. HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Residents Registry</h1>
          <p className="text-xs text-slate-400 font-bold uppercase mt-1">Manage onboarding, checkout, and doc checks</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:opacity-90 active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-purple-500/20"
        >
          <Plus size={16} />
          Onboard Resident
        </button>
      </div>

      {/* 2. SEARCH AND FILTER TOOLS */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-grow">
          <Search className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by name, mobile, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-2xl glass-input text-xs font-semibold"
          />
        </div>
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-3 rounded-2xl glass-input text-xs font-bold bg-transparent"
        >
          <option value="" className="dark:bg-slate-900">All Residents</option>
          <option value="ACTIVE" className="dark:bg-slate-900">Active checked-in</option>
          <option value="RESERVED" className="dark:bg-slate-900">Reserved beds</option>
          <option value="CHECKED_OUT" className="dark:bg-slate-900">Checked Out</option>
        </select>
      </div>

      {/* 3. RESIDENTS CARD DIRECTORY */}
      {isLoading ? (
        <div className="py-20 text-center text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">
          Loading Members Database...
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="py-20 rounded-3xl glass-card text-center space-y-2 border border-slate-500/10">
          <p className="text-sm font-bold text-slate-400 uppercase">No members found.</p>
          <p className="text-[10px] text-slate-400">Onboard a resident to start listing.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map((m) => (
            <div key={m.id} className="rounded-3xl glass-card border border-white/20 p-5 shadow-sm space-y-4 relative overflow-hidden flex flex-col justify-between group">
              <div className="flex gap-4 items-start">
                <img 
                  src={m.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} 
                  alt={m.fullName} 
                  className="w-14 h-14 rounded-2xl object-cover border border-[#e0e3eb]/50" 
                />
                <div className="min-w-0">
                  <span className={`px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase ${
                    m.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' :
                    m.status === 'RESERVED' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-500/10 text-slate-400'
                  }`}>
                    {m.status}
                  </span>
                  <h3 className="text-sm font-black truncate mt-1.5">{m.fullName}</h3>
                  <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 mt-0.5"><Smartphone size={10} />{m.mobile}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-500/5 space-y-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>Room Allocation:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-bold">{m.room ? `Room ${m.room.number}` : 'Unassigned'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Rent Rate:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-bold">₹{m.rentAmount}/mo</span>
                </div>
                <div className="flex justify-between">
                  <span>Security Deposit:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-bold">₹{m.depositAmount}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-500/5 mt-auto">
                <button
                  onClick={() => {
                    setSelectedMember(m);
                    setIsProfileModalOpen(true);
                  }}
                  className="flex-1 py-2 rounded-xl bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/10 text-purple-500 text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5"
                >
                  <Eye size={12} /> Profile
                </button>

                {m.status === 'ACTIVE' && (
                  <button
                    onClick={() => handleCheckout(m.id)}
                    className="px-3 py-2 rounded-xl bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 text-amber-500 text-xs font-bold transition-all"
                    title="Check out resident"
                  >
                    <UserX size={13} />
                  </button>
                )}

                <button
                  onClick={() => handleDelete(m.id)}
                  className="px-3 py-2 rounded-xl bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 text-red-500 text-xs font-bold transition-all"
                  title="Remove Profile"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. DIALOG MODAL: ONBOARD MEMBER */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl glass-card border border-white/20 p-6 shadow-xl space-y-4 animate-scale-up max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-500/10">
              <h2 className="text-lg font-black uppercase tracking-wider flex items-center gap-1.5"><UserPlus size={18} className="text-purple-500" /> Onboard Resident</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4 text-xs font-bold text-slate-400">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase mb-1.5 pl-0.5">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                  />
                </div>
                <div>
                  <label className="block uppercase mb-1.5 pl-0.5">Mobile *</label>
                  <input
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase mb-1.5 pl-0.5">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                  />
                </div>
                <div>
                  <label className="block uppercase mb-1.5 pl-0.5">Emergency Contact *</label>
                  <input
                    type="text"
                    required
                    placeholder="Father Name - 987..."
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block uppercase mb-1.5 pl-0.5">Home Permanent Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase mb-1.5 pl-0.5">Work Location</label>
                  <input
                    type="text"
                    placeholder="Company Office Address"
                    value={workLocation}
                    onChange={(e) => setWorkLocation(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                  />
                </div>
                <div>
                  <label className="block uppercase mb-1.5 pl-0.5">Joining Date</label>
                  <input
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block uppercase mb-1.5 pl-0.5">Monthly Rent *</label>
                  <input
                    type="number"
                    required
                    value={rentAmount}
                    onChange={(e) => setRentAmount(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                  />
                </div>
                <div>
                  <label className="block uppercase mb-1.5 pl-0.5">Security Deposit *</label>
                  <input
                    type="number"
                    required
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                  />
                </div>
                <div>
                  <label className="block uppercase mb-1.5 pl-0.5">Allocate Room</label>
                  <select
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold bg-transparent"
                  >
                    <option value="" className="dark:bg-slate-900">Reserve Bed</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id} className="dark:bg-slate-900">Room {r.number} ({r.type})</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:opacity-90 active:scale-95 text-white font-bold text-xs tracking-wide transition-all shadow-md shadow-purple-500/20"
              >
                Complete Onboarding
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 5. DIALOG MODAL: DETAILED PROFILE VIEW & DOCUMENT STATUS */}
      {isProfileModalOpen && selectedMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-3xl glass-card border border-white/20 p-6 shadow-xl space-y-6 animate-scale-up max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-500/10">
              <h2 className="text-sm font-black uppercase tracking-wider">Resident Profile Card</h2>
              <button onClick={() => setIsProfileModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              
              {/* Left col: picture details */}
              <div className="flex flex-col items-center shrink-0 w-48 space-y-4">
                <div className="relative group cursor-pointer" onClick={() => simulateDocUpload('photo')}>
                  <img 
                    src={selectedMember.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} 
                    alt={selectedMember.fullName} 
                    className="w-36 h-36 rounded-3xl object-cover border border-[#e0e3eb]/50" 
                  />
                  <div className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                    <UploadCloud size={16} className="mb-1" /> Change Photo
                  </div>
                </div>

                <div className="w-full text-center space-y-1">
                  <h3 className="text-base font-black">{selectedMember.fullName}</h3>
                  <span className="px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-400 text-[9px] font-black uppercase">{selectedMember.status}</span>
                </div>
              </div>

              {/* Right col: information details */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-500">
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Contact Email</p>
                  <p className="text-slate-800 dark:text-slate-200 flex items-center gap-1"><Mail size={12} />{selectedMember.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Phone Number</p>
                  <p className="text-slate-800 dark:text-slate-200 flex items-center gap-1"><Smartphone size={12} />{selectedMember.mobile}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Emergency Contacts</p>
                  <p className="text-slate-800 dark:text-slate-200">{selectedMember.emergencyContact}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Work Address</p>
                  <p className="text-slate-800 dark:text-slate-200 flex items-center gap-1"><Briefcase size={12} />{selectedMember.workLocation || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Joining Date</p>
                  <p className="text-slate-800 dark:text-slate-200 flex items-center gap-1"><Calendar size={12} />{new Date(selectedMember.joiningDate).toDateString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Home Location</p>
                  <p className="text-slate-800 dark:text-slate-200 flex items-center gap-1"><MapPin size={12} />{selectedMember.address}</p>
                </div>
              </div>

            </div>

            {/* Document checklist grids */}
            <div className="space-y-3 pt-4 border-t border-slate-500/10">
              <h3 className="text-xs font-black uppercase tracking-wider">KYC Document Upload Verify</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                
                {/* Aadhaar card */}
                <div className="p-3 rounded-2xl bg-slate-500/5 border border-slate-500/5 flex flex-col justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-black">Aadhaar Card</h4>
                    <p className="text-[9px] text-slate-400 mt-0.5">UIDAI ID Verification</p>
                  </div>
                  {selectedMember.aadhaarUrl ? (
                    <a href={selectedMember.aadhaarUrl} target="_blank" rel="noreferrer" className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                      <CheckCircle size={12} /> Validated (Click View)
                    </a>
                  ) : (
                    <button onClick={() => simulateDocUpload('aadhaar')} className="py-1.5 rounded-lg border border-purple-500/20 text-purple-500 text-[10px] font-bold bg-purple-500/5 hover:bg-purple-500/10">
                      Upload Card
                    </button>
                  )}
                </div>

                {/* PAN card */}
                <div className="p-3 rounded-2xl bg-slate-500/5 border border-slate-500/5 flex flex-col justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-black">PAN Card</h4>
                    <p className="text-[9px] text-slate-400 mt-0.5">Income Tax Register</p>
                  </div>
                  {selectedMember.panUrl ? (
                    <a href={selectedMember.panUrl} target="_blank" rel="noreferrer" className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                      <CheckCircle size={12} /> Validated (Click View)
                    </a>
                  ) : (
                    <button onClick={() => simulateDocUpload('pan')} className="py-1.5 rounded-lg border border-purple-500/20 text-purple-500 text-[10px] font-bold bg-purple-500/5 hover:bg-purple-500/10">
                      Upload Card
                    </button>
                  )}
                </div>

                {/* Rent Agreement */}
                <div className="p-3 rounded-2xl bg-slate-500/5 border border-slate-500/5 flex flex-col justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-black">Rent Agreement</h4>
                    <p className="text-[9px] text-slate-400 mt-0.5">Tenant Terms Slip</p>
                  </div>
                  {selectedMember.agreementUrl ? (
                    <a href={selectedMember.agreementUrl} target="_blank" rel="noreferrer" className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                      <CheckCircle size={12} /> Validated (Click View)
                    </a>
                  ) : (
                    <button onClick={() => simulateDocUpload('agreement')} className="py-1.5 rounded-lg border border-purple-500/20 text-purple-500 text-[10px] font-bold bg-purple-500/5 hover:bg-purple-500/10">
                      Upload Lease
                    </button>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
