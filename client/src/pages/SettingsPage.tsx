import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Settings, Save, Plus, Building, Key, ShieldCheck } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { activeProperty, properties, addProperty } = useAuth();
  const [pgName, setPgName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [upiId, setUpiId] = useState('');
  const [gst, setGst] = useState('');
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('');
  
  // Toggles
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);

  // New Branch fields
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');
  const [newBranchUpi, setNewBranchUpi] = useState('');

  useEffect(() => {
    if (activeProperty) {
      setPgName(activeProperty.name);
      setAddress(activeProperty.address);
      setPhone(activeProperty.phone || '');
      setEmail(activeProperty.email || '');
      setUpiId(activeProperty.upiId || '');
      setGst(activeProperty.gstNumber || '');
      setRazorpayKeyId(activeProperty.razorpayKeyId || '');
      setRazorpayKeySecret(activeProperty.razorpayKeySecret || '');
    }
  }, [activeProperty]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProperty) return;

    const token = localStorage.getItem('token');
    const payload = {
      name: pgName,
      address,
      phone,
      email,
      upiId,
      gstNumber: gst,
      razorpayKeyId: razorpayKeyId || null,
      razorpayKeySecret: razorpayKeySecret || null,
    };

    try {
      const res = await fetch(`http://localhost:5000/api/properties/${activeProperty.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updatedProperties = properties.map((p) => (p.id === activeProperty.id ? { ...p, ...payload } : p));
        localStorage.setItem('properties', JSON.stringify(updatedProperties));
        localStorage.setItem('activeProperty', JSON.stringify({ ...activeProperty, ...payload }));
        
        alert('[DB SYNC SUCCESS] PG Branch configurations successfully updated in database!');
        window.location.reload();
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Server error');
      }
    } catch (err: any) {
      console.warn('Real settings save failed, updating mock store.');
      const updatedProperties = properties.map((p) => (p.id === activeProperty.id ? { ...p, ...payload } : p));
      localStorage.setItem('properties', JSON.stringify(updatedProperties));
      localStorage.setItem('activeProperty', JSON.stringify({ ...activeProperty, ...payload }));
      alert('[MOCK SAVE] PG Branch settings saved successfully in local storage.');
      window.location.reload();
    }
  };

  const handleAddBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName || !newBranchAddress) return;

    const newProp = {
      id: 'prop_mock_' + Date.now(),
      name: newBranchName,
      address: newBranchAddress,
      upiId: newBranchUpi,
    };

    addProperty(newProp);
    setNewBranchName('');
    setNewBranchAddress('');
    setNewBranchUpi('');
    alert(`[BRANCH CREATED] PG Branch "${newProp.name}" added successfully.`);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. HEADER */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">System Settings</h1>
        <p className="text-xs text-slate-400 font-bold uppercase mt-1">Configure general profiles, payout UPI targets, and branches</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left col: settings panel */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* General Configs */}
          <div className="p-5 rounded-3xl glass-card border border-white/20 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5"><Settings size={15} className="text-purple-500" /> General branch profile</h3>
            
            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs font-bold text-slate-400">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase mb-1.5 pl-0.5">PG Branch Name</label>
                  <input
                    type="text"
                    value={pgName}
                    onChange={(e) => setPgName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                  />
                </div>
                <div>
                  <label className="block uppercase mb-1.5 pl-0.5">Corporate UPI ID</label>
                  <input
                    type="text"
                    value={upiId}
                    placeholder="e.g. nest@okaxis"
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block uppercase mb-1.5 pl-0.5">Branch Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block uppercase mb-1.5 pl-0.5">Contact phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                  />
                </div>
                <div>
                  <label className="block uppercase mb-1.5 pl-0.5">Support Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                  />
                </div>
                <div>
                  <label className="block uppercase mb-1.5 pl-0.5">GST Registration</label>
                  <input
                    type="text"
                    value={gst}
                    onChange={(e) => setGst(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                  />
                </div>
              </div>

              {/* Razorpay Integration Sub-section */}
              <div className="pt-4 border-t border-[#e0e3eb]/20 dark:border-white/5 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-purple-500 flex items-center gap-1.5">
                  <Key size={14} /> Razorpay API Credentials (for QR Codes)
                </h4>
                <p className="text-[10px] text-slate-400 font-medium">Configure your Razorpay API credentials for this property branch. Residents will be presented with a dynamic UPI QR Code generated by Razorpay to scan and complete payments.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block uppercase mb-1.5 pl-0.5 text-slate-400">Razorpay Key ID</label>
                    <input
                      type="text"
                      placeholder="e.g. rzp_test_..."
                      value={razorpayKeyId}
                      onChange={(e) => setRazorpayKeyId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block uppercase mb-1.5 pl-0.5 text-slate-400">Razorpay Key Secret</label>
                    <input
                      type="password"
                      placeholder="••••••••••••••••"
                      value={razorpayKeySecret}
                      onChange={(e) => setRazorpayKeySecret(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-fit px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 active:scale-95 text-white font-bold transition-all shadow-md shadow-purple-500/10 flex items-center gap-1.5"
              >
                <Save size={14} /> Save Configurations
              </button>
            </form>
          </div>

          {/* Integrations panel */}
          <div className="p-5 rounded-3xl glass-card border border-white/20 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5"><Key size={15} className="text-purple-500" /> Notifications Integration Config</h3>
            
            <div className="space-y-4 text-xs font-semibold text-slate-500">
              <div className="flex justify-between items-center py-2 border-b border-slate-500/5">
                <div>
                  <h4 className="font-bold">SMS Notifications (Fast2SMS API)</h4>
                  <p className="text-[10px] text-slate-400">Dispatch payment receipts and onboarding details</p>
                </div>
                <input
                  type="checkbox"
                  checked={smsEnabled}
                  onChange={(e) => setSmsEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-500 focus:ring-purple-500 bg-transparent border-slate-500/20"
                />
              </div>

              <div className="flex justify-between items-center py-2 border-b border-slate-500/5">
                <div>
                  <h4 className="font-bold">Email Transmissions (Nodemailer API)</h4>
                  <p className="text-[10px] text-slate-400">Send detailed HTML lease copy and invoice notifications</p>
                </div>
                <input
                  type="checkbox"
                  checked={emailEnabled}
                  onChange={(e) => setEmailEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-500 focus:ring-purple-500 bg-transparent border-slate-500/20"
                />
              </div>

              <div className="flex justify-between items-center py-2">
                <div>
                  <h4 className="font-bold">WhatsApp Alert Templates (India Direct API)</h4>
                  <p className="text-[10px] text-slate-400">Send simulated check-in/out updates on tenant mobiles</p>
                </div>
                <input
                  type="checkbox"
                  checked={whatsappEnabled}
                  onChange={(e) => setWhatsappEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-500 focus:ring-purple-500 bg-transparent border-slate-500/20"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Right col: add branches */}
        <div className="space-y-6">
          
          {/* Add Branch */}
          <div className="p-5 rounded-3xl glass-card border border-white/20 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5"><Building size={15} className="text-purple-500" /> Add PG Branch</h3>
            
            <form onSubmit={handleAddBranch} className="space-y-4 text-xs font-bold text-slate-400">
              <div>
                <label className="block uppercase mb-1.5 pl-0.5">Branch Location Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sector 62 Branch"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                />
              </div>

              <div>
                <label className="block uppercase mb-1.5 pl-0.5">Physical Address *</label>
                <input
                  type="text"
                  required
                  placeholder="Full local address"
                  value={newBranchAddress}
                  onChange={(e) => setNewBranchAddress(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                />
              </div>

              <div>
                <label className="block uppercase mb-1.5 pl-0.5">UPI ID</label>
                <input
                  type="text"
                  placeholder="e.g. accounts@okaxis"
                  value={newBranchUpi}
                  onChange={(e) => setNewBranchUpi(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-purple-500 hover:bg-purple-600 active:scale-95 text-white font-bold transition-all shadow-md shadow-purple-500/10 flex items-center justify-center gap-1"
              >
                <Plus size={14} /> Create Branch Location
              </button>
            </form>
          </div>

          {/* Active branches listing */}
          <div className="p-5 rounded-3xl glass-card border border-white/20 shadow-sm space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider">PG Location branches list</h3>
            
            <div className="space-y-2">
              {properties.map(p => (
                <div key={p.id} className="p-3 rounded-2xl bg-slate-500/5 border border-slate-500/5 flex items-center justify-between">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold truncate">{p.name}</h4>
                    <p className="text-[10px] text-slate-400 truncate">{p.address}</p>
                  </div>
                  {activeProperty?.id === p.id && (
                    <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0 ml-2" />
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
