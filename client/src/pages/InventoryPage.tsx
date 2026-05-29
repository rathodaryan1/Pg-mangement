import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PackageSearch, Plus, Search, Tag, Settings, Trash2, Edit2 } from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const { activeProperty } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [category, setCategory] = useState('AC');
  const [status, setStatus] = useState('GOOD');

  const loadInventory = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    const propId = activeProperty?.id;

    try {
      const url = propId ? `http://localhost:5000/api/inventory?propertyId=${propId}` : 'http://localhost:5000/api/inventory';
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setItems(await res.json());
      } else {
        throw new Error('API failed');
      }
    } catch (err) {
      console.warn('Backend inventory API failed. Loading mock items.');
      const savedItems = localStorage.getItem('mock_inventory');
      if (savedItems) {
        setItems(JSON.parse(savedItems));
      } else {
        const defaultItems = [
          { id: 'i1', name: 'Wooden single Bed Frame', quantity: 4, category: 'Bed', status: 'GOOD' },
          { id: 'i2', name: 'AC Split 1.5 Ton', quantity: 3, category: 'AC', status: 'GOOD' },
          { id: 'i3', name: 'Crompton Pedestal Fan', quantity: 2, category: 'Fan', status: 'UNDER_REPAIR' },
        ];
        setItems(defaultItems);
        localStorage.setItem('mock_inventory', JSON.stringify(defaultItems));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [activeProperty]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !quantity) {
      alert('Required parameters missing.');
      return;
    }

    const payload = {
      name,
      quantity: parseInt(quantity),
      category,
      status,
      propertyId: activeProperty?.id || 'c9284cdd-f556-4d74-af01-611da1397c0d',
    };

    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`http://localhost:5000/api/inventory`, {
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
        loadInventory();
      } else {
        throw new Error('Inventory failed');
      }
    } catch (err) {
      const newItem = {
        id: 'item_mock_' + Date.now(),
        ...payload,
      };
      const updated = [...items, newItem];
      setItems(updated);
      localStorage.setItem('mock_inventory', JSON.stringify(updated));
      setIsAddModalOpen(false);
      resetForm();
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm('Delete this item from inventory records?')) return;
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`http://localhost:5000/api/inventory/${itemId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        loadInventory();
      } else {
        throw new Error('Delete inventory item failed');
      }
    } catch (err) {
      const updated = items.filter(i => i.id !== itemId);
      setItems(updated);
      localStorage.setItem('mock_inventory', JSON.stringify(updated));
    }
  };

  const resetForm = () => {
    setName('');
    setQuantity('1');
    setCategory('AC');
    setStatus('GOOD');
  };

  return (
    <div className="space-y-6">
      
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Inventory Audits</h1>
          <p className="text-xs text-slate-400 font-bold uppercase mt-1">Audit and track appliance condition per branch</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:opacity-90 active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-purple-500/20"
        >
          <Plus size={16} />
          Register Equipment
        </button>
      </div>

      {/* 2. INVENTORY REGISTER GRID */}
      {isLoading ? (
        <div className="py-20 text-center text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">
          Retrieving inventory logs...
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 rounded-3xl glass-card text-center space-y-2 border border-slate-500/10">
          <p className="text-sm font-bold text-slate-400 uppercase">Inventory registry empty.</p>
          <p className="text-[10px] text-slate-400">Click register equipment to add beds, AC units, or fans.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map((i) => (
            <div key={i.id} className="rounded-3xl glass-card border border-white/20 p-5 flex flex-col justify-between h-48 shadow-sm">
              <div>
                <div className="flex justify-between items-start">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                    i.status === 'GOOD' ? 'bg-emerald-500/10 text-emerald-500' :
                    i.status === 'UNDER_REPAIR' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'
                  }`}>
                    {i.status.replace('_', ' ')}
                  </span>
                  
                  <span className="px-2 py-0.5 rounded bg-purple-500/10 text-[9px] font-black text-purple-400 uppercase tracking-wider">
                    Qty: {i.quantity}
                  </span>
                </div>

                <h3 className="text-sm font-black mt-3 truncate">{i.name}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{i.category}</p>
              </div>

              <div className="pt-3 border-t border-slate-500/5 mt-auto flex items-center justify-between">
                <span className="text-[9px] text-slate-400 font-bold">
                  Status validated
                </span>
                
                <button
                  onClick={() => handleDeleteItem(i.id)}
                  className="p-2 rounded-xl bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 text-red-500 transition-colors"
                  title="Remove asset log"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. DIALOG: REGISTER EQUIPMENT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl glass-card border border-white/20 p-6 shadow-xl space-y-4 animate-scale-up">
            <div className="flex justify-between items-center pb-2 border-b border-slate-500/10">
              <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5"><PackageSearch size={16} className="text-purple-500" /> Log Appliance</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-4 text-xs font-bold text-slate-400">
              <div>
                <label className="block uppercase mb-1.5 pl-0.5">Appliance Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Split AC LG 1.5 Ton"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase mb-1.5 pl-0.5">Asset Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold bg-transparent"
                  >
                    <option value="AC" className="dark:bg-slate-900">Air Conditioner</option>
                    <option value="Bed" className="dark:bg-slate-900">Bed Frame</option>
                    <option value="Mattress" className="dark:bg-slate-900">Mattress</option>
                    <option value="Fan" className="dark:bg-slate-900">Ceiling/Pedestal Fan</option>
                    <option value="Furniture" className="dark:bg-slate-900">TV / Furniture</option>
                  </select>
                </div>
                
                <div>
                  <label className="block uppercase mb-1.5 pl-0.5">Quantity *</label>
                  <input
                    type="number"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block uppercase mb-1.5 pl-0.5">Initial Condition</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold bg-transparent"
                >
                  <option value="GOOD" className="dark:bg-slate-900">Good Condition</option>
                  <option value="DAMAGED" className="dark:bg-slate-900">Damaged</option>
                  <option value="UNDER_REPAIR" className="dark:bg-slate-900">Under Repair</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:opacity-90 active:scale-95 text-white font-bold text-xs tracking-wide transition-all shadow-md shadow-purple-500/20"
              >
                Confirm Inventory Log
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
