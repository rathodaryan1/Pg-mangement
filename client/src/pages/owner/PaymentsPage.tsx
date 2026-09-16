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
  Tag
} from 'lucide-react';
import { Card, KPICard } from '../../components/ui/Card';
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
  const [activeTab, setActiveTab] = useState<'payments' | 'expenses'>('payments');
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [recordPaymentModal, setRecordPaymentModal] = useState(false);
  const [createInvoiceModal, setCreateInvoiceModal] = useState(false);
  const [createExpenseModal, setCreateExpenseModal] = useState(false);
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

  // Expense form
  const [expenseForm, setExpenseForm] = useState({
    category: 'ELECTRICITY',
    title: '',
    amount: '',
    vendor: 'Bescom Electricity',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [payRes, expRes, resRes] = await Promise.all([
        ownerApi.getPayments(activeProperty.id),
        ownerApi.getExpenses(activeProperty.id),
        ownerApi.getResidents(activeProperty.id)
      ]);
      setPayments(payRes.data || []);
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
      setToastMessage('Expense logged successfully!');
      setTimeout(() => setToastMessage(null), 4000);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to log expense');
    }
  };

  // Calculations
  const totalCollected = payments.filter((p) => p.status === 'PAID').reduce((sum, p) => sum + (p.amount || 0), 0);
  const outstandingDues = payments.filter((p) => p.status === 'OVERDUE' || p.status === 'PENDING').reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.residentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.roomNumber || '').includes(searchQuery);
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const paymentColumns: Column<PaymentRecord>[] = [
    {
      header: 'Resident & Room',
      cell: (row) => (
        <div>
          <p className="font-bold text-xs text-slate-900 dark:text-white">{row.residentName}</p>
          <p className="text-[11px] text-slate-400">Room {row.roomNumber || 'N/A'}</p>
        </div>
      )
    },
    {
      header: 'Charge Category',
      cell: (row) => <Badge variant="secondary">{row.category}</Badge>
    },
    {
      header: 'Billing Period',
      accessorKey: 'period'
    },
    {
      header: 'Amount',
      cell: (row) => <span className="font-bold text-xs">₹{(row.amount || 0).toLocaleString('en-IN')}</span>
    },
    {
      header: 'Due Date',
      cell: (row) => <span className="text-xs text-slate-500">{new Date(row.dueDate).toLocaleDateString()}</span>
    },
    {
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />
    },
    {
      header: 'Action',
      cell: (row) => (
        <div className="flex items-center gap-2">
          {row.status === 'PAID' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedPayment(row);
                setReceiptModalOpen(true);
              }}
              leftIcon={<Receipt className="w-3 h-3 text-blue-600" />}
            >
              Receipt
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setManualPayForm({
                  paymentId: row.id,
                  amount: row.amount.toString(),
                  paymentMethod: 'UPI',
                  transactionId: `TXN-${Date.now().toString().slice(-6)}`,
                  notes: 'Direct confirmation'
                });
                setRecordPaymentModal(true);
              }}
            >
              Record Paid
            </Button>
          )}
        </div>
      )
    }
  ];

  const expenseColumns: Column<any>[] = [
    {
      header: 'Expense Item',
      cell: (row) => (
        <div>
          <p className="font-bold text-xs text-slate-900 dark:text-white">{row.title}</p>
          <p className="text-[11px] text-slate-400">{row.vendor || 'Direct'}</p>
        </div>
      )
    },
    {
      header: 'Category',
      cell: (row) => <Badge variant="purple">{row.category}</Badge>
    },
    {
      header: 'Amount',
      cell: (row) => <span className="font-bold text-xs text-rose-600">₹{(row.amount || 0).toLocaleString('en-IN')}</span>
    },
    {
      header: 'Date',
      cell: (row) => <span className="text-xs text-slate-500">{new Date(row.date).toLocaleDateString()}</span>
    },
    {
      header: 'Description',
      accessorKey: 'description'
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Alert */}
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

      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Finance & Accounts Ledger</h1>
          <p className="text-xs text-slate-500">Track monthly rent collections, outstanding dues, receipts, and property operating expenses</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateExpenseModal(true)}
            leftIcon={<TrendingDown className="w-3.5 h-3.5 text-rose-600" />}
          >
            Log Expense
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateInvoiceModal(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Create Charge Invoice
          </Button>
        </div>
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <KPICard
          title="Total Collected"
          value={`₹${totalCollected.toLocaleString('en-IN')}`}
          subtitle={`${payments.filter((p) => p.status === 'PAID').length} invoices settled`}
          icon={TrendingUp}
          color="emerald"
        />
        <KPICard
          title="Outstanding Dues"
          value={`₹${outstandingDues.toLocaleString('en-IN')}`}
          subtitle={`${payments.filter((p) => p.status === 'OVERDUE' || p.status === 'PENDING').length} pending bills`}
          icon={AlertCircle}
          color="rose"
        />
        <KPICard
          title="Operating Expenses"
          value={`₹${totalExpenses.toLocaleString('en-IN')}`}
          subtitle={`${expenses.length} expense items logged`}
          icon={TrendingDown}
          color="purple"
        />
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'payments', label: `Rent & Invoices Ledger (${payments.length})`, icon: <Receipt className="w-4 h-4 text-blue-600" /> },
          { id: 'expenses', label: `Operating Expenses (${expenses.length})`, icon: <TrendingDown className="w-4 h-4 text-rose-600" /> }
        ]}
        activeTab={activeTab}
        onChange={(tab) => setActiveTab(tab as any)}
      />

      {activeTab === 'payments' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <Card className="p-4 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="w-full md:w-80">
              <Input
                placeholder="Search resident, room..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              />
            </div>

            <Select
              options={[
                { label: 'All Statuses', value: 'ALL' },
                { label: 'Paid', value: 'PAID' },
                { label: 'Overdue', value: 'OVERDUE' },
                { label: 'Pending', value: 'PENDING' }
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </Card>

          {/* Ledger Table */}
          <Table
            columns={paymentColumns}
            data={filteredPayments}
            keyExtractor={(item) => item.id}
            isLoading={isLoading}
          />
        </div>
      )}

      {activeTab === 'expenses' && (
        <Table
          columns={expenseColumns}
          data={expenses}
          keyExtractor={(item) => item.id}
          isLoading={isLoading}
        />
      )}

      {/* Receipt Modal */}
      {selectedPayment && (
        <Modal
          isOpen={receiptModalOpen}
          onClose={() => setReceiptModalOpen(false)}
          title={`Payment Receipt: ${selectedPayment.receiptNumber || 'UN-REC-2026'}`}
          maxWidth="md"
        >
          <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-blue-400">URBAN NEST PG</h3>
                <p className="text-[10px] text-slate-400">Official Payment Tax Receipt</p>
              </div>
              <StatusBadge status="PAID" />
            </div>

            <div className="space-y-2 py-2">
              <p><strong>Resident:</strong> {selectedPayment.residentName} (Room {selectedPayment.roomNumber || 'N/A'})</p>
              <p><strong>Billing Period:</strong> {selectedPayment.period}</p>
              <p><strong>Payment Method:</strong> {selectedPayment.method || 'UPI / NetBanking'}</p>
              <p><strong>Transaction Ref:</strong> {selectedPayment.transactionId || 'TXN-98213-VERIFIED'}</p>
              <p className="text-base font-bold text-emerald-400 pt-2 border-t border-slate-800">
                Amount Paid: ₹{(selectedPayment.amount || 0).toLocaleString('en-IN')}
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setReceiptModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Record Payment Modal */}
      <Modal
        isOpen={recordPaymentModal}
        onClose={() => setRecordPaymentModal(false)}
        title="Record Manual Payment Entry"
      >
        <form onSubmit={handleRecordManualPayment} className="space-y-4">
          <Input
            label="Amount Paid (₹)"
            type="number"
            value={manualPayForm.amount}
            onChange={(e) => setManualPayForm({ ...manualPayForm, amount: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Payment Method"
              options={[
                { label: 'UPI / QR', value: 'UPI' },
                { label: 'Bank Transfer / NEFT', value: 'NET_BANKING' },
                { label: 'Cash Payment', value: 'CASH' },
                { label: 'Credit / Debit Card', value: 'CARD' }
              ]}
              value={manualPayForm.paymentMethod}
              onChange={(e) => setManualPayForm({ ...manualPayForm, paymentMethod: e.target.value })}
            />
            <Input
              label="Transaction / Reference ID"
              value={manualPayForm.transactionId}
              onChange={(e) => setManualPayForm({ ...manualPayForm, transactionId: e.target.value })}
              required
            />
          </div>
          <Input
            label="Admin Notes"
            value={manualPayForm.notes}
            onChange={(e) => setManualPayForm({ ...manualPayForm, notes: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button variant="outline" size="sm" type="button" onClick={() => setRecordPaymentModal(false)}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit">Confirm & Mark As Paid</Button>
          </div>
        </form>
      </Modal>

      {/* Create Charge Invoice Modal */}
      <Modal
        isOpen={createInvoiceModal}
        onClose={() => setCreateInvoiceModal(false)}
        title="Generate Resident Charge Invoice"
      >
        <form onSubmit={handleCreateInvoice} className="space-y-4">
          <Select
            label="Target Resident"
            options={[
              { label: '-- Select Resident --', value: '' },
              ...residents.map((r) => ({
                label: `${r.fullName} (Room ${r.roomNumber || 'N/A'})`,
                value: r.id
              }))
            ]}
            value={invoiceForm.residentId}
            onChange={(e) => setInvoiceForm({ ...invoiceForm, residentId: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category"
              options={[
                { label: 'Monthly Rent', value: 'RENT' },
                { label: 'Electricity Bill', value: 'ELECTRICITY' },
                { label: 'Maintenance Fee', value: 'MAINTENANCE_FEE' },
                { label: 'Late Fine', value: 'LATE_FINE' }
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
          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button variant="outline" size="sm" type="button" onClick={() => setCreateInvoiceModal(false)}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit">Issue Invoice</Button>
          </div>
        </form>
      </Modal>

      {/* Create Expense Modal */}
      <Modal
        isOpen={createExpenseModal}
        onClose={() => setCreateExpenseModal(false)}
        title="Log Property Operating Expense"
      >
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <Input
            label="Expense Title"
            placeholder="e.g. October Commercial Electricity Bill"
            value={expenseForm.title}
            onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category"
              options={[
                { label: 'Electricity', value: 'ELECTRICITY' },
                { label: 'Water Supply', value: 'WATER' },
                { label: 'Maintenance & Repairs', value: 'MAINTENANCE' },
                { label: 'Staff Salaries', value: 'SALARY' },
                { label: 'High-Speed Internet / WiFi', value: 'INTERNET' },
                { label: 'Cleaning Supplies', value: 'SUPPLIES' },
                { label: 'Food & Mess Groceries', value: 'FOOD_MESS' },
                { label: 'Other Miscellaneous', value: 'OTHER' }
              ]}
              value={expenseForm.category}
              onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
            />
            <Input
              label="Amount (₹)"
              type="number"
              placeholder="8500"
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Vendor / Payee"
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
            label="Description / Receipt Notes"
            value={expenseForm.description}
            onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button variant="outline" size="sm" type="button" onClick={() => setCreateExpenseModal(false)}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit">Save Expense Record</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
