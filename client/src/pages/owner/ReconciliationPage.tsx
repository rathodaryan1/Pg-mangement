import React, { useState, useEffect } from 'react';
import {
  Receipt,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  DollarSign,
  Search,
  Filter,
  RefreshCw,
  Share2
} from 'lucide-react';
import { operationsApi } from '../../services/operationsApi';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { toast } from '../../context/ToastContext';
import { useTranslation } from '../../i18n';

export const ReconciliationPage: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'overdue' | 'utilities' | 'all'>('pending');

  // Utility allocation modal
  const [allocModalOpen, setAllocModalOpen] = useState(false);
  const [selectedReading, setSelectedReading] = useState<any | null>(null);
  const [allocDesc, setAllocDesc] = useState('');

  const fetchReconciliation = async () => {
    setLoading(true);
    try {
      const res = await operationsApi.getPaymentReconciliation();
      setData(res.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load reconciliation data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReconciliation();
  }, []);

  const openAllocateModal = (reading: any) => {
    setSelectedReading(reading);
    setAllocDesc(`Sub-Meter Billing: ${reading.type} (${reading.unitsConsumed} units @ ₹${reading.unitRate})`);
    setAllocModalOpen(true);
  };

  const handleExecuteAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReading) return;
    try {
      const res = await operationsApi.allocateUtilityToInvoices({
        utilityReadingId: selectedReading.id,
        description: allocDesc,
      });
      toast.success(res.message || 'Utility bill successfully allocated to resident invoices.');
      setAllocModalOpen(false);
      fetchReconciliation();
    } catch (err: any) {
      toast.error(err.message || 'Failed to allocate utility bill');
    }
  };

  const summary = data?.summary || {};
  const transactions = data?.transactions || {};
  const readings = data?.utilityReadings || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Financial Integrity & Audit
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Payment Reconciliation & Utility Allocation
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit verified receipts against bank/UPI references, track overdue rent, and allocate sub-meter energy charges.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchReconciliation} className="gap-1.5 self-start sm:self-auto bg-white">
          <RefreshCw className="w-3.5 h-3.5" /> {t('refresh', 'Refresh')}
        </Button>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white">
          <p className="text-[10px] font-bold uppercase text-slate-500">Total Billed</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">₹{summary.totalBilled || 0}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">All active period invoices</p>
        </div>
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
          <p className="text-[10px] font-bold uppercase text-emerald-700">Verified Collected</p>
          <p className="text-2xl font-extrabold text-emerald-900 mt-1">₹{summary.totalCollected || 0}</p>
          <p className="text-[10px] text-emerald-600 mt-0.5">{summary.matchedCount || 0} Matched Transactions</p>
        </div>
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50">
          <p className="text-[10px] font-bold uppercase text-rose-700">Outstanding Receivables</p>
          <p className="text-2xl font-extrabold text-rose-900 mt-1">₹{summary.totalOutstanding || 0}</p>
          <p className="text-[10px] text-rose-600 mt-0.5">{summary.overdueCount || 0} Invoices Overdue</p>
        </div>
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50">
          <p className="text-[10px] font-bold uppercase text-amber-700">Pending Approval</p>
          <p className="text-2xl font-extrabold text-amber-900 mt-1">{summary.pendingApprovalCount || 0}</p>
          <p className="text-[10px] text-amber-600 mt-0.5">Offline UPI / Cash claims</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        {[
          { id: 'pending', label: 'Pending Approvals' },
          { id: 'overdue', label: 'Overdue Rent' },
          { id: 'utilities', label: 'Sub-Meter Allocations' },
          { id: 'all', label: 'All Invoices' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-emerald-700 text-emerald-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <Card className="p-4 sm:p-6 bg-white border border-slate-200">
        {/* Pending Offline Approvals */}
        {activeTab === 'pending' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Offline Bank / UPI Payment Claims Awaiting Audit</h3>
            {(transactions.pendingApproval || []).length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No transactions pending reconciliation approval.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {(transactions.pendingApproval || []).map((p: any) => (
                  <div key={p.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{p.resident?.fullName || 'Resident'}</p>
                      <p className="text-[11px] text-slate-500">₹{p.amount} • {p.period} • Transaction Ref: {p.transactionId || 'None'}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                      Approval Needed
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Overdue Rent */}
        {activeTab === 'overdue' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Overdue Rent Invoices (Follow-Up Required)</h3>
            {(transactions.overdue || []).length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">Zero overdue rent invoices! All collections up to date.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {(transactions.overdue || []).map((p: any) => (
                  <div key={p.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{p.resident?.fullName} (Phone: {p.resident?.mobile})</p>
                      <p className="text-[11px] text-rose-700 font-semibold">₹{p.amount} • Due since: {new Date(p.dueDate).toISOString().split('T')[0]}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                      Overdue
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sub-Meter Allocations */}
        {activeTab === 'utilities' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Recent Sub-Meter Readings Available for Billing Allocation</h3>
            {readings.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No sub-meter readings recorded.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {readings.map((r: any) => (
                  <div key={r.id} className="py-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{r.type} Meter #{r.meterNumber}</p>
                      <p className="text-[11px] text-slate-500">{r.unitsConsumed} units @ ₹{r.unitRate}/unit = <strong>₹{r.totalAmount}</strong> ({r.billingPeriod})</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => openAllocateModal(r)}
                      className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white gap-1"
                    >
                      <Share2 className="w-3 h-3" /> Split to Resident Invoices
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* All Invoices */}
        {activeTab === 'all' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">All Recent Invoices & Payment Ledger</h3>
            <div className="divide-y divide-slate-100">
              {(transactions.all || []).map((p: any) => (
                <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{p.resident?.fullName}</span>
                    <span className="text-slate-400 ml-2">({p.period})</span>
                    <p className="text-[11px] text-slate-500">₹{p.amount} • {p.category}</p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      p.status === 'PAID'
                        ? 'bg-emerald-100 text-emerald-800'
                        : p.status === 'OVERDUE'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Modal: Allocate Utility */}
      <Modal isOpen={allocModalOpen} onClose={() => setAllocModalOpen(false)} title="Allocate Sub-Meter Utility Charge">
        <form onSubmit={handleExecuteAllocation} className="space-y-4">
          <p className="text-xs text-slate-600">
            This will calculate the equal share of <strong>₹{selectedReading?.totalAmount}</strong> and add it as an official utility charge invoice to all currently active residents in this property.
          </p>

          <div>
            <label className="text-[11px] font-bold text-slate-700">Invoice Note / Description</label>
            <input
              type="text"
              value={allocDesc}
              onChange={(e) => setAllocDesc(e.target.value)}
              className="w-full text-xs p-2 rounded border border-slate-200 mt-1"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" size="sm" onClick={() => setAllocModalOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white">Execute Split Allocation</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
