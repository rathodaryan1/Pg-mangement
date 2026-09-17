import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Receipt,
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Printer,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge, Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { residentApi } from '../../services/residentApi';

export const ResidentPaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [securityDeposit, setSecurityDeposit] = useState<any | null>(null);
  const [summary, setSummary] = useState<{
    totalOutstanding: number;
    pendingCount: number;
    paidCount: number;
    nextDueDate: string | null;
    nextDueAmount: number;
  }>({
    totalOutstanding: 0,
    pendingCount: 0,
    paidCount: 0,
    nextDueDate: null,
    nextDueAmount: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [receiptData, setReceiptData] = useState<any | null>(null);

  // Payment execution state
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState<string | null>(null);

  const fetchPayments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await residentApi.getPayments();
      setPayments(data.payments || []);
      setSecurityDeposit(data.securityDeposit || null);
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (err: any) {
      console.error('Failed to fetch payments:', err.message);
      setError(err.message || 'Failed to load payments ledger.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleOpenPayModal = (payment: any) => {
    setSelectedPayment(payment);
    setPaymentSuccessMessage(null);
    setPayModalOpen(true);
  };

  const handleOpenReceiptModal = async (paymentId: string) => {
    try {
      const receipt = await residentApi.getReceipt(paymentId);
      setReceiptData(receipt);
      setReceiptModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'Unable to retrieve receipt for this payment.');
    }
  };

  const handleProcessPayment = async () => {
    if (!selectedPayment) return;
    setIsProcessingPayment(true);

    try {
      // 1. Create order
      const order: any = await residentApi.createPaymentOrder(selectedPayment.id, paymentMethod);

      // 2. Verify payment on backend
      const result: any = await residentApi.verifyPayment({
        paymentId: selectedPayment.id,
        method: paymentMethod,
        transactionId: `TXN${Date.now()}`,
        razorpayOrderId: order.orderId,
      });

      setPaymentSuccessMessage(`Payment of ₹${selectedPayment.amount} confirmed! Receipt #${result.receipt?.receiptNumber || 'RCP-ACTIVE'} generated.`);
      await fetchPayments();
    } catch (err: any) {
      console.error('Payment processing failed:', err);
      alert(err.message || 'Payment processing failed. Please retry.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-60 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 h-96 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
          <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Rent & Payment Ledger
          </h1>
          <p className="text-xs text-slate-500">
            Real-time monthly rent ledger, pending dues, receipts, and security deposit holding
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchPayments} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
          Refresh Ledger
        </Button>
      </div>

      {/* Dues Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg space-y-1">
          <p className="text-xs font-semibold text-emerald-100">Total Outstanding Dues</p>
          <h3 className="text-2xl font-black">₹{summary.totalOutstanding.toLocaleString('en-IN')}</h3>
          <p className="text-[11px] text-emerald-200">
            {summary.pendingCount > 0 ? `${summary.pendingCount} Pending Invoice(s)` : 'All rent dues cleared'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Next Upcoming Due Date</p>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {summary.nextDueDate ? new Date(summary.nextDueDate).toLocaleDateString() : 'N/A'}
          </h3>
          <p className="text-[11px] text-slate-500">
            {summary.nextDueAmount > 0 ? `Amount: ₹${summary.nextDueAmount.toLocaleString('en-IN')}` : 'No upcoming dues'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Invoices Paid</p>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{summary.paidCount} Cleared</h3>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Official receipts available
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Payment History List */}
        <Card className="p-6 md:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-brand-forest dark:text-brand-gold" />
              Payment Invoices & History
            </h3>
            <span className="text-xs text-slate-500">{payments.length} Records</span>
          </div>

          {payments.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <Receipt className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold">No payment records found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((p) => {
                const isPending = p.status === 'PENDING' || p.status === 'OVERDUE';
                return (
                  <div
                    key={p.id}
                    className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {p.period}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                          {p.category}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px]">
                        Due Date: {new Date(p.dueDate).toLocaleDateString()}
                        {p.paidDate && ` • Paid: ${new Date(p.paidDate).toLocaleDateString()}`}
                        {p.transactionId && ` • Txn: ${p.transactionId}`}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="text-right">
                        <p className="font-black text-slate-900 dark:text-white text-sm">
                          ₹{p.amount.toLocaleString('en-IN')}
                        </p>
                        <StatusBadge status={p.status} />
                      </div>

                      {isPending ? (
                        <Button
                          variant="primary"
                          size="xs"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-sm"
                          onClick={() => handleOpenPayModal(p)}
                        >
                          Pay Now
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => handleOpenReceiptModal(p.id)}
                          leftIcon={<Receipt className="w-3.5 h-3.5 text-brand-forest dark:text-brand-gold" />}
                        >
                          Receipt
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Security Deposit Sidebar */}
        <div className="space-y-6">
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Security Deposit Holding
            </h3>

            {securityDeposit ? (
              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-slate-500">Total Security Deposit:</p>
                  <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                    ₹{securityDeposit.amount.toLocaleString('en-IN')}
                  </h4>
                </div>

                <div className="flex items-center justify-between py-1.5 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Status:</span>
                  <StatusBadge status={securityDeposit.status} />
                </div>

                {securityDeposit.paidAt && (
                  <div className="flex items-center justify-between py-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Paid On:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {new Date(securityDeposit.paidAt).toLocaleDateString()}
                    </span>
                  </div>
                )}

                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 text-[11px] text-emerald-800 dark:text-emerald-300">
                  🛡️ Security deposit is held securely by PG management and is fully refundable upon move-out clearance as per the lease agreement.
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">No security deposit record found.</p>
            )}
          </Card>
        </div>
      </div>

      {/* Pay Rent Modal */}
      <Modal isOpen={payModalOpen} onClose={() => setPayModalOpen(false)} maxWidth="md">
        <div className="space-y-5 p-2">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Complete Rent Payment</h3>
              <p className="text-xs text-slate-500">
                {selectedPayment?.period} • {selectedPayment?.category}
              </p>
            </div>
          </div>

          {paymentSuccessMessage ? (
            <div className="p-6 text-center space-y-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-900">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h4 className="text-base font-bold text-emerald-900 dark:text-emerald-200">Payment Successful!</h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">{paymentSuccessMessage}</p>
              <Button
                variant="primary"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white mt-2"
                onClick={() => setPayModalOpen(false)}
              >
                Done
              </Button>
            </div>
          ) : (
            <>
              {/* Payment Summary */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500">Payable Amount:</span>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    ₹{selectedPayment?.amount.toLocaleString('en-IN')}
                  </h3>
                </div>
                <Badge variant="warning">DUE NOW</Badge>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-900 dark:text-white">Select Payment Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'UPI', label: 'UPI (GPay/PhonePe)' },
                    { id: 'CARD', label: 'Debit / Credit Card' },
                    { id: 'NET_BANKING', label: 'Net Banking' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all text-center ${
                        paymentMethod === m.id
                          ? 'border-brand-forest bg-brand-forest/10 dark:border-brand-gold dark:bg-brand-gold/15 text-brand-forest dark:text-brand-gold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button variant="secondary" size="sm" onClick={() => setPayModalOpen(false)} disabled={isProcessingPayment}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleProcessPayment}
                  isLoading={isProcessingPayment}
                >
                  Pay ₹{selectedPayment?.amount.toLocaleString('en-IN')}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Official Receipt Modal */}
      <Modal isOpen={receiptModalOpen} onClose={() => setReceiptModalOpen(false)} maxWidth="md">
        {receiptData && (
          <div className="space-y-5 p-2" id="printable-receipt">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
                  URBAN NEST PG RECEIPT
                </h3>
                <p className="text-[11px] text-slate-500">Official Payment Confirmation</p>
              </div>
              <Badge variant="success">PAID & VERIFIED</Badge>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Receipt Number:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{receiptData.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Generated At:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {new Date(receiptData.generatedAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Resident Name:</span>
                <span className="font-bold text-slate-900 dark:text-white">{receiptData.residentDetails?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Room & Bed:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Room {receiptData.residentDetails?.room} ({receiptData.residentDetails?.bed})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Billing Period:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {receiptData.paymentDetails?.period} ({receiptData.paymentDetails?.category})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction ID:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {receiptData.paymentDetails?.transactionId}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-sm">
                <span className="font-bold text-slate-900 dark:text-white">Amount Paid:</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">
                  ₹{receiptData.paymentDetails?.amount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="secondary" size="sm" onClick={() => window.print()} leftIcon={<Printer className="w-3.5 h-3.5" />}>
                Print Receipt
              </Button>
              <Button variant="primary" size="sm" onClick={() => setReceiptModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
