import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Receipt,
  Download,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Plus,
  ShieldCheck,
  Building,
  FileText,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Tag,
  Wallet,
  Trash2,
  Edit2,
  AlertTriangle
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge, Badge } from '../../components/ui/Badge';
import { Input, Select } from '../../components/ui/Input';
import { Tabs } from '../../components/ui/Tabs';
import type { Column } from '../../components/ui/Table';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { ownerApi } from '../../services/ownerApi';
import type { PaymentRecord } from '../../types';

export const PaymentsPage: React.FC = () => {
  const { activeProperty } = useAuth();
  const [activeTab, setActiveTab] = useState<'payments' | 'deposits' | 'expenses'>('payments');
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [recordPaymentModal, setRecordPaymentModal] = useState(false);
  const [createInvoiceModal, setCreateInvoiceModal] = useState(false);
  const [createExpenseModal, setCreateExpenseModal] = useState(false);
  const [createDepositModal, setCreateDepositModal] = useState(false);
  const [settleDepositModal, setSettleDepositModal] = useState<any | null>(null);
  const [settleForm, setSettleForm] = useState({ deductions: '0', refundAmount: '28000', notes: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Manual payment record form
  const [manualPayForm, setManualPayForm] = useState({
    paymentId: '',
    amount: '',
    paymentMethod: 'UPI',
    transactionId: '',
    notes: 'Paid via direct bank transfer / cash'
  });

  // Invoice form
  const [invoiceForm, setInvoiceForm] = useState({
    residentId: '',
    category: 'RENT',
    amount: '14000',
    period: 'October 2026',
    dueDate: '2026-10-05',
    description: 'Monthly Room Rent'
  });

  // Deposit form
  const [depositForm, setDepositForm] = useState({
    residentId: '',
    amount: '28000',
    notes: '2-Month Move-in Security Deposit'
  });

  // Expense form
  const [expenseForm, setExpenseForm] = useState({
    id: '',
    category: 'ELECTRICITY',
    title: '',
    amount: '',
    vendor: 'DHBVN Ahmedabad',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [payRes, depRes, expRes, resRes] = await Promise.all([
        ownerApi.getPayments(activeProperty.id),
        ownerApi.getDeposits(),
        ownerApi.getExpenses(activeProperty.id),
        ownerApi.getResidents(activeProperty.id)
      ]);
      setPayments(payRes.data || []);
      setDeposits(depRes.data || []);
      setExpenses(expRes.data || []);
      setResidents(resRes.data || []);
    } catch (err: any) {
      console.error('Failed to load financial data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeProperty]);

  const handleRecordManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!manualPayForm.paymentId || !manualPayForm.amount) {
        alert('Please select an invoice and enter amount');
        return;
      }
      await ownerApi.recordManualPayment(manualPayForm.paymentId, {
        amount: parseFloat(manualPayForm.amount),
        paymentMethod: manualPayForm.paymentMethod,
        transactionId: manualPayForm.transactionId || `MANUAL-${Date.now()}`,
        note: manualPayForm.notes
      });
      setRecordPaymentModal(false);
      setToastMessage('Payment recorded successfully!');
      setTimeout(() => setToastMessage(null), 4000);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to record payment');
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!invoiceForm.residentId || !invoiceForm.amount) {
        alert('Please select resident and amount');
        return;
      }
      await ownerApi.createInvoice({
        residentId: invoiceForm.residentId,
        category: invoiceForm.category,
        amount: parseFloat(invoiceForm.amount),
        period: invoiceForm.period,
        dueDate: invoiceForm.dueDate,
        description: invoiceForm.description
      });
      setCreateInvoiceModal(false);
      setToastMessage('Charge invoice generated successfully!');
      setTimeout(() => setToastMessage(null), 4000);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to generate invoice');
    }
  };

  const handleCancelPayment = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this unpaid charge invoice?')) return;
    try {
      await ownerApi.cancelPayment(id);
      setToastMessage('Charge invoice cancelled.');
      setTimeout(() => setToastMessage(null), 3500);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel invoice');
    }
  };

  const handleCreateDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!depositForm.residentId || !depositForm.amount) {
        alert('Please select resident and deposit amount');
        return;
      }
      const sel = residents.find((r) => r.id === depositForm.residentId);
      await ownerApi.createDeposit({
        residentId: depositForm.residentId,
        residentName: sel?.fullName || 'Resident',
        roomNumber: sel?.roomNumber || '101',
        amount: parseFloat(depositForm.amount),
        notes: depositForm.notes
      });
      setCreateDepositModal(false);
      setToastMessage('Security deposit logged successfully!');
      setTimeout(() => setToastMessage(null), 4000);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to log deposit');
    }
  };

  const handleSettleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleDepositModal) return;
    try {
      await ownerApi.settleDeposit(settleDepositModal.id, {
        deductions: parseFloat(settleForm.deductions || '0'),
        refundAmount: parseFloat(settleForm.refundAmount || '0'),
        notes: settleForm.notes || 'Settled upon move-out clearance'
      });
      setSettleDepositModal(null);
      setToastMessage('Deposit refund settlement completed.');
      setTimeout(() => setToastMessage(null), 4000);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to settle deposit');
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!expenseForm.title || !expenseForm.amount) {
        alert('Please enter expense title and amount');
        return;
      }
      await ownerApi.createExpense({
        propertyId: activeProperty.id,
        category: expenseForm.category,
        title: expenseForm.title,
        amount: parseFloat(expenseForm.amount),
        vendor: expenseForm.vendor,
        date: expenseForm.date,
        description: expenseForm.description
      });
      setCreateExpenseModal(false);
      setToastMessage('Operational expense logged successfully!');
      setTimeout(() => setToastMessage(null), 4000);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to log expense');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to remove this expense entry?')) return;
    try {
      await ownerApi.archiveExpense(id);
      setToastMessage('Expense entry archived.');
      setTimeout(() => setToastMessage(null), 3500);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete expense');
    }
  };

  const totalCollected = payments.filter((p) => p.status === 'PAID').reduce((sum, p) => sum + p.amount, 0);
  const totalPending = payments.filter((p) => p.status === 'PENDING' || p.status === 'OVERDUE').reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      (p.residentName && p.residentName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.roomNumber && p.roomNumber.includes(searchQuery)) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-500 text-white flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-semibold">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-white/80 hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Finance & Accounts Ledger</h1>
          <p className="text-xs text-slate-500">Rent collections, deposits tracking, invoice creation, and operational expenses</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateInvoiceModal(true)}
            leftIcon={<FileText className="w-3.5 h-3.5" />}
          >
            Create Charge
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              const pending = payments.find((p) => p.status === 'PENDING' || p.status === 'OVERDUE');
              setManualPayForm({
                paymentId: pending ? pending.id : (payments[0]?.id || ''),
                amount: pending ? pending.amount.toString() : '14000',
                paymentMethod: 'UPI',
                transactionId: `MANUAL-${Date.now()}`,
                notes: 'Manual payment recorded by admin'
              });
              setRecordPaymentModal(true);
            }}
            leftIcon={<CreditCard className="w-3.5 h-3.5" />}
          >
            Record Payment
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateExpenseModal(true)}
            leftIcon={<TrendingDown className="w-3.5 h-3.5 text-rose-500" />}
          >
            Add Expense
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 space-y-1.5 border-l-4 border-l-emerald-500">
          <span className="text-[10px] font-bold uppercase text-slate-400">Total Rent Collected</span>
          <div className="text-2xl font-black text-emerald-600">₹{totalCollected.toLocaleString('en-IN')}</div>
          <p className="text-[11px] text-slate-500">Settled invoices this period</p>
        </Card>
        <Card className="p-5 space-y-1.5 border-l-4 border-l-rose-500">
          <span className="text-[10px] font-bold uppercase text-slate-400">Outstanding / Pending Rent</span>
          <div className="text-2xl font-black text-rose-600">₹{totalPending.toLocaleString('en-IN')}</div>
          <p className="text-[11px] text-slate-500">Awaiting resident payment</p>
        </Card>
        <Card className="p-5 space-y-1.5 border-l-4 border-l-amber-500">
          <span className="text-[10px] font-bold uppercase text-slate-400">Operational Expenses</span>
          <div className="text-2xl font-black text-amber-600">₹{totalExpenses.toLocaleString('en-IN')}</div>
          <p className="text-[11px] text-slate-500">Utilities, supplies, maintenance</p>
        </Card>
      </div>

      {/* Tabs */}
      <Card className="p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-brand-surface dark:bg-brand-surface-dark border border-brand-border dark:border-brand-border-dark rounded-xl w-full md:w-auto">
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'payments'
                ? 'bg-brand-forest text-white shadow-sm'
                : 'text-brand-muted hover:text-brand-text dark:hover:text-white'
            }`}
          >
            Rent Invoices ({payments.length})
          </button>
          <button
            onClick={() => setActiveTab('deposits')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'deposits'
                ? 'bg-brand-forest text-white shadow-sm'
                : 'text-brand-muted hover:text-brand-text dark:hover:text-white'
            }`}
          >
            Security Deposits ({deposits.length})
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'expenses'
                ? 'bg-brand-forest text-white shadow-sm'
                : 'text-brand-muted hover:text-brand-text dark:hover:text-white'
            }`}
          >
            Operating Expenses ({expenses.length})
          </button>
        </div>

        <div className="w-full md:w-72">
          <Input
            placeholder="Search resident, room, title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>
      </Card>

      {/* TAB 1: RENT INVOICES */}
      {activeTab === 'payments' && (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Invoice / Category</th>
                  <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Resident</th>
                  <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Due Date</th>
                  <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Amount</th>
                  <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Status</th>
                  <th className="p-4 font-bold text-slate-600 dark:text-slate-300 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="p-4">
                      <span className="font-bold text-slate-900 dark:text-white">{p.category}</span>
                      <p className="text-[11px] text-slate-400">{p.period}</p>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{p.residentName || 'Aakash Verma'}</span>
                      <p className="text-[10px] text-slate-400">Room {p.roomNumber || '101'}</p>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400 font-mono">
                      {p.dueDate}
                    </td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white font-mono">
                      ₹{p.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {p.status === 'PAID' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[11px] py-1 px-2.5"
                            onClick={() => {
                              setSelectedPayment(p);
                              setReceiptModalOpen(true);
                            }}
                          >
                            Receipt
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              className="text-[11px] py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => {
                                setManualPayForm({
                                  paymentId: p.id,
                                  amount: p.amount.toString(),
                                  paymentMethod: 'UPI',
                                  transactionId: `MANUAL-${Date.now()}`,
                                  notes: `Settled for ${p.period}`
                                });
                                setRecordPaymentModal(true);
                              }}
                            >
                              Collect
                            </Button>
                            <button
                              onClick={() => handleCancelPayment(p.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100"
                              title="Cancel Charge"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: SECURITY DEPOSITS */}
      {activeTab === 'deposits' && (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Resident</th>
                  <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Deposit Amount</th>
                  <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Deductions</th>
                  <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Refund Amount</th>
                  <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Status</th>
                  <th className="p-4 font-bold text-slate-600 dark:text-slate-300 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {deposits.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="p-4">
                      <span className="font-bold text-slate-900 dark:text-white">{d.residentName}</span>
                      <p className="text-[10px] text-slate-400">Room {d.roomNumber || '101'}</p>
                    </td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white font-mono">
                      ₹{d.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="p-4 text-rose-500 font-mono">
                      ₹{(d.deductions || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="p-4 text-emerald-600 font-mono font-bold">
                      {d.refundAmount ? `₹${d.refundAmount.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="p-4 text-right">
                      {d.status === 'PAID' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[11px] py-1 px-2.5"
                          onClick={() => {
                            setSettleDepositModal(d);
                            setSettleForm({
                              deductions: '0',
                              refundAmount: d.amount.toString(),
                              notes: 'Full deposit refund'
                            });
                          }}
                        >
                          Settle Refund
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: OPERATING EXPENSES */}
      {activeTab === 'expenses' && (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Expense Title</th>
                  <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Category</th>
                  <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Vendor</th>
                  <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Date</th>
                  <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Amount</th>
                  <th className="p-4 font-bold text-slate-600 dark:text-slate-300 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="p-4">
                      <span className="font-bold text-slate-900 dark:text-white">{e.title}</span>
                      {e.description && <p className="text-[10px] text-slate-400">{e.description}</p>}
                    </td>
                    <td className="p-4 font-medium text-slate-700 dark:text-slate-300">
                      {e.category}
                    </td>
                    <td className="p-4 text-slate-500">
                      {e.vendor || 'Direct'}
                    </td>
                    <td className="p-4 text-slate-400 font-mono">
                      {e.date}
                    </td>
                    <td className="p-4 font-bold text-rose-600 font-mono">
                      ₹{e.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDeleteExpense(e.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100"
                        title="Archive Expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Record Payment Modal */}
      <Modal
        isOpen={recordPaymentModal}
        onClose={() => setRecordPaymentModal(false)}
        title="Record Payment Collection"
      >
        <form onSubmit={handleRecordManualPayment} className="space-y-4">
          <Select
            label="Select Invoice to Settle"
            options={payments.filter((p) => p.status !== 'PAID').map((p) => ({
              label: `${p.residentName} - ${p.category} (${p.period}) - ₹${p.amount}`,
              value: p.id
            }))}
            value={manualPayForm.paymentId}
            onChange={(e) => {
              const pid = e.target.value;
              const p = payments.find((x) => x.id === pid);
              setManualPayForm({ ...manualPayForm, paymentId: pid, amount: p ? p.amount.toString() : '' });
            }}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Amount Paid (₹)"
              type="number"
              value={manualPayForm.amount}
              onChange={(e) => setManualPayForm({ ...manualPayForm, amount: e.target.value })}
              required
            />
            <Select
              label="Payment Method"
              options={[
                { label: 'UPI (GPay / PhonePe / Paytm)', value: 'UPI' },
                { label: 'Cash Collection', value: 'CASH' },
                { label: 'Net Banking (NEFT / IMPS)', value: 'NET_BANKING' },
                { label: 'Card / POS Terminal', value: 'CARD' }
              ]}
              value={manualPayForm.paymentMethod}
              onChange={(e) => setManualPayForm({ ...manualPayForm, paymentMethod: e.target.value })}
            />
          </div>
          <Input
            label="Transaction ID / Reference"
            placeholder="e.g. UPI-981244-VERIFIED"
            value={manualPayForm.transactionId}
            onChange={(e) => setManualPayForm({ ...manualPayForm, transactionId: e.target.value })}
          />
          <Input
            label="Internal Notes"
            value={manualPayForm.notes}
            onChange={(e) => setManualPayForm({ ...manualPayForm, notes: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setRecordPaymentModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Confirm & Generate Receipt
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Invoice Modal */}
      <Modal
        isOpen={createInvoiceModal}
        onClose={() => setCreateInvoiceModal(false)}
        title="Create New Charge Invoice"
      >
        <form onSubmit={handleCreateInvoice} className="space-y-4">
          <Select
            label="Select Resident"
            options={residents.map((r) => ({
              label: `${r.fullName} (Room ${r.roomNumber || '101'})`,
              value: r.id
            }))}
            value={invoiceForm.residentId}
            onChange={(e) => setInvoiceForm({ ...invoiceForm, residentId: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category"
              options={[
                { label: 'Monthly Rent', value: 'RENT' },
                { label: 'Electricity Sub-meter', value: 'ELECTRICITY' },
                { label: 'Security Deposit', value: 'SECURITY_DEPOSIT' },
                { label: 'Late Fine / Penalty', value: 'LATE_FINE' },
                { label: 'Maintenance Fee', value: 'MAINTENANCE_FEE' },
                { label: 'Food / Mess Charges', value: 'FOOD' }
              ]}
              value={invoiceForm.category}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, category: e.target.value })}
            />
            <Input
              label="Amount (₹)"
              type="number"
              value={invoiceForm.amount}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Billing Period"
              value={invoiceForm.period}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, period: e.target.value })}
              required
            />
            <Input
              label="Due Date"
              type="date"
              value={invoiceForm.dueDate}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
              required
            />
          </div>
          <Input
            label="Description"
            value={invoiceForm.description}
            onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setCreateInvoiceModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Issue Invoice
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Expense Modal */}
      <Modal
        isOpen={createExpenseModal}
        onClose={() => setCreateExpenseModal(false)}
        title="Log Operating Expense"
      >
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <Input
            label="Expense Title"
            placeholder="e.g. Water Tank Repair & Disinfection"
            value={expenseForm.title}
            onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category"
              options={[
                { label: 'Electricity Bill', value: 'ELECTRICITY' },
                { label: 'Water & Tanker', value: 'WATER' },
                { label: 'Wi-Fi Broadband', value: 'INTERNET' },
                { label: 'Staff Salaries', value: 'SALARY' },
                { label: 'Supplies & Housekeeping', value: 'SUPPLIES' },
                { label: 'Repair & Maintenance', value: 'MAINTENANCE' },
                { label: 'Other', value: 'OTHER' }
              ]}
              value={expenseForm.category}
              onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
            />
            <Input
              label="Amount (₹)"
              type="number"
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Vendor / Payee"
              placeholder="e.g. CleanPro Services"
              value={expenseForm.vendor}
              onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
            />
            <Input
              label="Expense Date"
              type="date"
              value={expenseForm.date}
              onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
              required
            />
          </div>
          <Input
            label="Notes / Receipt Remarks"
            value={expenseForm.description}
            onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setCreateExpenseModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save Expense
            </Button>
          </div>
        </form>
      </Modal>

      {/* Settle Deposit Modal */}
      {settleDepositModal && (
        <Modal
          isOpen={!!settleDepositModal}
          onClose={() => setSettleDepositModal(null)}
          title={`Settle Deposit: ${settleDepositModal.residentName}`}
        >
          <form onSubmit={handleSettleDeposit} className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border text-xs flex justify-between">
              <span>Original Security Deposit:</span>
              <strong className="font-mono">₹{settleDepositModal.amount.toLocaleString('en-IN')}</strong>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Deductions (Damage/Late Fee)"
                type="number"
                value={settleForm.deductions}
                onChange={(e) => {
                  const d = parseFloat(e.target.value || '0');
                  const ref = Math.max(0, settleDepositModal.amount - d);
                  setSettleForm({ ...settleForm, deductions: e.target.value, refundAmount: ref.toString() });
                }}
                required
              />
              <Input
                label="Final Refund Amount (₹)"
                type="number"
                value={settleForm.refundAmount}
                onChange={(e) => setSettleForm({ ...settleForm, refundAmount: e.target.value })}
                required
              />
            </div>
            <Input
              label="Deduction / Settlement Notes"
              placeholder="e.g. ₹0 deductions, full refund issued via UPI"
              value={settleForm.notes}
              onChange={(e) => setSettleForm({ ...settleForm, notes: e.target.value })}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setSettleDepositModal(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit">
                Complete Refund Settlement
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Receipt View Modal */}
      {selectedPayment && (
        <Modal
          isOpen={receiptModalOpen}
          onClose={() => setReceiptModalOpen(false)}
          title="Payment Settlement Receipt"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
                <span className="font-bold text-sm text-slate-900 dark:text-white">URBAN NEST RECEIPT</span>
                <span className="font-mono text-[#0B4036] dark:text-[#C8A45D] font-bold">{selectedPayment.receiptNumber || 'UN-REC-2026-0901'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Resident</span>
                  <strong className="text-slate-900 dark:text-white">{selectedPayment.residentName || 'Aakash Verma'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Billing Period</span>
                  <strong className="text-slate-900 dark:text-white">{selectedPayment.period}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Amount Paid</span>
                  <strong className="text-emerald-600 font-mono text-sm font-black">₹{selectedPayment.amount.toLocaleString('en-IN')}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Payment Method</span>
                  <strong className="text-slate-900 dark:text-white">{selectedPayment.method || 'UPI'}</strong>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setReceiptModalOpen(false)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  alert(`Receipt ${selectedPayment.receiptNumber || 'UN-REC'} downloaded as PDF.`);
                  setReceiptModalOpen(false);
                }}
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                Download PDF
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PaymentsPage;
