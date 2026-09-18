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
import { toast } from '../../context/ToastContext';

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
      toast.error(err.message || 'Unable to retrieve receipt for this payment.');
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
      toast.success('Payment completed successfully.');
      await fetchPayments();
    } catch (err: any) {
      console.error('Payment processing failed:', err);
      toast.error(err.message || 'Payment processing failed. Please retry.');
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
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0B4036] to-[#12584B] text-white shadow-lg space-y-1">
          <p className="text-xs font-semibold text-[#EAF2EE]">Total Outstanding Dues</p>
          <h3 className="text-2xl font-black">₹{summary.totalOutstanding.toLocaleString('en-IN')}</h3>
          <p className="text-[11px] text-[#EAF2EE]">
            {summary.pendingCount > 0 ? `${summary.pendingCount} Pending Invoice(s)` : 'All rent dues cleared'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#DDE2DD] shadow-xs space-y-1">
          <p className="text-xs font-semibold text-[#68736D]">Next Upcoming Due Date</p>
          <h3 className="text-xl font-bold text-[#18231F]">
            {summary.nextDueDate ? new Date(summary.nextDueDate).toLocaleDateString() : 'N/A'}
          </h3>
          <p className="text-[11px] text-[#68736D]">
            {summary.nextDueAmount > 0 ? `Amount: ₹${summary.nextDueAmount.toLocaleString('en-IN')}` : 'No upcoming dues'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#DDE2DD] shadow-xs space-y-1">
          <p className="text-xs font-semibold text-[#68736D]">Total Invoices Paid</p>
          <h3 className="text-xl font-bold text-[#18231F]">{summary.paidCount} Cleared</h3>
          <p className="text-[11px] text-[#0B4036] font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Official receipts available
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Payment History List */}
        <Card className="p-6 md:col-span-2 space-y-4 border-[#DDE2DD]">
          <div className="flex items-center justify-between border-b border-[#DDE2DD] pb-3">
            <h3 className="text-sm font-bold text-[#18231F] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#0B4036]" />
              Payment Invoices & History
            </h3>
            <span className="text-xs text-[#68736D]">{payments.length} Records</span>
          </div>

          {payments.length === 0 ? (
            <div className="p-12 text-center text-[#68736D] space-y-2">
              <Receipt className="w-10 h-10 text-[#8A928D] mx-auto" />
              <p className="text-xs font-semibold">No payment records found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((p) => {
                const isPending = p.status === 'PENDING' || p.status === 'OVERDUE';
                return (
                  <div
                    key={p.id}
                    className="p-4 rounded-xl border border-[#DDE2DD] bg-[#FCFBF8] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#18231F] text-sm">
                          {p.period}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#F8F7F3] border border-[#DDE2DD] text-[10px] font-semibold text-[#18231F]">
                          {p.category}
                        </span>
                      </div>
                      <p className="text-[#68736D] text-[11px]">
                        Due Date: {new Date(p.dueDate).toLocaleDateString()}
                        {p.paidDate && ` • Paid: ${new Date(p.paidDate).toLocaleDateString()}`}
                        {p.transactionId && ` • Txn: ${p.transactionId}`}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="text-right">
                        <p className="font-black text-[#18231F] text-sm">
                          ₹{p.amount.toLocaleString('en-IN')}
                        </p>
                        <StatusBadge status={p.status} />
                      </div>

                      {isPending ? (
                        <Button
                          variant="primary"
                          size="xs"
                          className="bg-[#0B4036] hover:bg-[#08332c] text-white border-none shadow-xs"
                          onClick={() => handleOpenPayModal(p)}
                        >
                          Pay Now
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => handleOpenReceiptModal(p.id)}
                          leftIcon={<Receipt className="w-3.5 h-3.5 text-[#0B4036]" />}
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
          <Card className="p-6 space-y-4 border-[#DDE2DD]">
            <div className="border-b border-[#DDE2DD] pb-3">
              <h3 className="text-sm font-bold text-[#18231F] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#0B4036]" />
                Security Deposit Holding
              </h3>
              <p className="text-[11px] text-[#68736D]">Held securely under rental agreement terms</p>
            </div>

            {securityDeposit ? (
              <div className="space-y-3 text-xs">
                <div className="p-4 rounded-xl bg-[#FAF5EB] border border-[#C8A45D]/30 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[#68736D]">Status:</span>
                    <StatusBadge status={securityDeposit.status} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#68736D]">Total Security Deposit:</span>
                    <span className="font-bold text-sm text-[#18231F]">
                      ₹{securityDeposit.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  {securityDeposit.paidAt && (
                    <div className="flex justify-between items-center">
                      <span className="text-[#68736D]">Paid On:</span>
                      <span className="font-medium text-[#18231F]">
                        {new Date(securityDeposit.paidAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {securityDeposit.deductions !== undefined && securityDeposit.deductions > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-[#68736D]">Deductions:</span>
                      <span className="font-medium text-emerald-700">₹{securityDeposit.deductions.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-[#EAF2EE] border border-[#0B4036]/20 text-[11px] text-[#0B4036]">
                  🛡️ Security deposit is held securely by PG management and is fully refundable upon move-out clearance as per the lease agreement.
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#68736D]">No security deposit record found.</p>
            )}
          </Card>
        </div>
      </div>

      {/* Pay Rent Modal */}
      <Modal isOpen={payModalOpen} onClose={() => setPayModalOpen(false)} maxWidth="md">
        <div className="space-y-5 p-2">
          <div className="flex items-center gap-3 border-b border-[#DDE2DD] pb-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EAF2EE] text-[#0B4036] flex items-center justify-center font-bold">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#18231F]">Complete Rent Payment</h3>
              <p className="text-xs text-[#68736D]">
                {selectedPayment?.period} • {selectedPayment?.category}
              </p>
            </div>
          </div>

          {paymentSuccessMessage ? (
            <div className="p-6 text-center space-y-3 bg-[#EAF2EE] rounded-2xl border border-[#DDE2DD]">
              <CheckCircle2 className="w-12 h-12 text-[#0B4036] mx-auto" />
              <h4 className="text-base font-bold text-[#18231F]">Payment Successful!</h4>
              <p className="text-xs text-[#68736D]">{paymentSuccessMessage}</p>
              <Button
                variant="primary"
                size="sm"
                className="bg-[#0B4036] hover:bg-[#08332c] text-white mt-2"
                onClick={() => setPayModalOpen(false)}
              >
                Done
              </Button>
            </div>
          ) : (
            <>
              {/* Payment Summary */}
              <div className="p-4 rounded-xl bg-[#F8F7F3] border border-[#DDE2DD] flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#68736D]">Payable Amount:</span>
                  <h3 className="text-xl font-black text-[#18231F]">
                    ₹{selectedPayment?.amount.toLocaleString('en-IN')}
                  </h3>
                </div>
                <Badge variant="warning">DUE NOW</Badge>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#18231F]">Select Payment Mode</label>
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
                          ? 'border-[#0B4036] bg-[#EAF2EE] text-[#0B4036]'
                          : 'border-[#DDE2DD] text-[#68736D] hover:bg-[#F8F7F3]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DDE2DD]">
                <Button variant="secondary" size="sm" onClick={() => setPayModalOpen(false)} disabled={isProcessingPayment}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-[#0B4036] text-white"
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
            <div className="flex items-center justify-between border-b border-[#DDE2DD] pb-3">
              <div>
                <h3 className="text-base font-black tracking-tight text-[#18231F]">
                  URBAN NEST PG RECEIPT
                </h3>
                <p className="text-[11px] text-[#68736D]">Official Payment Confirmation</p>
              </div>
              <Badge variant="success">PAID & VERIFIED</Badge>
            </div>

            <div className="p-4 rounded-xl bg-[#F8F7F3] border border-[#DDE2DD] space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#68736D]">Receipt Number:</span>
                <span className="font-mono font-bold text-[#18231F]">{receiptData.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#68736D]">Generated At:</span>
                <span className="font-semibold text-[#18231F]">
                  {new Date(receiptData.generatedAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#68736D]">Resident Name:</span>
                <span className="font-bold text-[#18231F]">{receiptData.residentDetails?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#68736D]">Room & Bed:</span>
                <span className="font-semibold text-[#18231F]">
                  Room {receiptData.residentDetails?.room} ({receiptData.residentDetails?.bed})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#68736D]">Billing Period:</span>
                <span className="font-semibold text-[#18231F]">
                  {receiptData.paymentDetails?.period} ({receiptData.paymentDetails?.category})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#68736D]">Transaction ID:</span>
                <span className="font-mono font-bold text-[#18231F]">
                  {receiptData.paymentDetails?.transactionId}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#DDE2DD] text-sm">
                <span className="font-bold text-[#18231F]">Amount Paid:</span>
                <span className="font-black text-[#0B4036]">
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
