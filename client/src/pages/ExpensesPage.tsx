import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, Receipt, Tag, Calendar, DollarSign } from 'lucide-react';

export const ExpensesPage: React.FC = () => {
  const { activeProperty } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form inputs
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Misc');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');

  const loadExpenses = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    const propId = activeProperty?.id;

    try {
      const url = propId ? `http://localhost:5000/api/expenses?propertyId=${propId}` : 'http://localhost:5000/api/expenses';
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        setExpenses(await res.json());
      } else {
        throw new Error('API failed');
      }
    } catch (err) {
      console.warn('Backend expenses failed. Loading mock transactions.');
      const savedExp = localStorage.getItem('mock_expenses');
      if (savedExp) {
        setExpenses(JSON.parse(savedExp));
      } else {
        const defaultExp = [
          { id: 'e1', title: 'May broadband line', amount: 4500, category: 'Misc', date: new Date('2026-05-10'), notes: '100 Mbps lines' },
          { id: 'e2', title: 'Gurgaon Mess Groceries', amount: 18500, category: 'Food', date: new Date('2026-05-12') },
        ];
        setExpenses(defaultExp);
        localStorage.setItem('mock_expenses', JSON.stringify(defaultExp));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [activeProperty]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !amount) {
      alert('Required parameters missing.');
      return;
    }

    const payload = {
      title,
      amount: parseFloat(amount),
      category,
      date: date || new Date().toISOString(),
      notes,
      propertyId: activeProperty?.id || 'c9284cdd-f556-4d74-af01-611da1397c0d',
    };

    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`http://localhost:5000/api/expenses`, {
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
        loadExpenses();
      } else {
        throw new Error('Expense failed');
      }
    } catch (err) {
      const newExp = {
        id: 'exp_mock_' + Date.now(),
        ...payload,
      };
      const updated = [newExp, ...expenses];
      setExpenses(updated);
      localStorage.setItem('mock_expenses', JSON.stringify(updated));
      setIsAddModalOpen(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setTitle('');
    setAmount('');
    setCategory('Misc');
    setDate('');
    setNotes('');
  };

  const totalExpenseSum = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Expense Register</h1>
          <p className="text-xs text-slate-400 font-bold uppercase mt-1">Audit outbox transactions and utility bills</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:opacity-90 active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-purple-500/20"
        >
          <Plus size={16} />
          Record Expense
        </button>
      </div>

      {/* 2. STAT TOTAL */}
      <div className="p-5 rounded-3xl glass-card border border-white/20 shadow-sm w-fit min-w-[200px]">
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Output</span>
        <p className="text-2xl font-black text-rose-500 mt-1">₹{totalExpenseSum.toLocaleString()}</p>
        <span className="text-[9px] font-semibold text-slate-400 uppercase">Across {expenses.length} records</span>
      </div>

      {/* 3. EXPENSES REGISTER LIST */}
      {isLoading ? (
        <div className="py-20 text-center text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">
          Retrieving expense logs...
        </div>
      ) : expenses.length === 0 ? (
        <div className="py-20 rounded-3xl glass-card text-center space-y-2 border border-slate-500/10">
          <p className="text-sm font-bold text-slate-400 uppercase">Expense log is empty.</p>
          <p className="text-[10px] text-slate-400">Recorded payouts will print here.</p>
        </div>
      ) : (
        <div className="space-y-3 max-w-4xl">
          {expenses.map((e) => (
            <div key={e.id} className="rounded-3xl glass-card border border-white/20 p-4 flex justify-between items-center gap-4 shadow-sm">
              <div className="flex gap-3.5 items-center min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                  <Receipt size={18} />
                </div>
                <div className="min-w-0">
                  <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase bg-slate-500/10 text-slate-400">
                    {e.category}
                  </span>
                  <h3 className="text-xs font-black truncate mt-1">{e.title}</h3>
                  <p className="text-[9.5px] text-slate-400 font-semibold flex items-center gap-1 mt-0.5">
                    <Calendar size={11} /> {new Date(e.date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="text-sm font-black text-rose-500">₹{e.amount.toLocaleString()}</p>
                {e.notes && (
                  <p className="text-[9px] text-slate-400 font-medium italic mt-0.5">"{e.notes}"</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. DIALOG: RECORD EXPENSE */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl glass-card border border-white/20 p-6 shadow-xl space-y-4 animate-scale-up">
            <div className="flex justify-between items-center pb-2 border-b border-slate-500/10">
              <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5"><Receipt size={16} className="text-purple-500" /> Record Expense</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4 text-xs font-bold text-slate-400">
              <div>
                <label className="block uppercase mb-1.5 pl-0.5">Expense Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mess groceries, plumber charge"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase mb-1.5 pl-0.5">Payout Amount (INR) *</label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                  />
                </div>
                <div>
                  <label className="block uppercase mb-1.5 pl-0.5">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold bg-transparent"
                  >
                    <option value="Electricity" className="dark:bg-slate-900">Electricity</option>
                    <option value="Rent" className="dark:bg-slate-900">PG Land Rent</option>
                    <option value="Food" className="dark:bg-slate-900">Food / Mess</option>
                    <option value="Salaries" className="dark:bg-slate-900">Staff Salaries</option>
                    <option value="Maintenance" className="dark:bg-slate-900">Maintenance Repairs</option>
                    <option value="Misc" className="dark:bg-slate-900">Misc expenses</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase mb-1.5 pl-0.5">Payment Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block uppercase mb-1.5 pl-0.5">Special Notes</label>
                  <input
                    type="text"
                    placeholder="Bill slip reference..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:opacity-90 active:scale-95 text-white font-bold text-xs tracking-wide transition-all shadow-md shadow-purple-500/20"
              >
                Log Transaction
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
