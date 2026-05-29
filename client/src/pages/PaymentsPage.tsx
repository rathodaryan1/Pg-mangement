import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  CreditCard, 
  Plus, 
  Search, 
  ArrowDownCircle, 
  CheckCircle, 
  FileText, 
  Clock, 
  ShieldAlert,
  Smartphone,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { jsPDF } from 'jspdf';

export const PaymentsPage: React.FC = () => {
  const { activeProperty, user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutPayment, setCheckoutPayment] = useState<any>(null);
  
  // Razorpay QR code checkout states
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [qrPaymentData, setQrPaymentData] = useState<any>(null);
  const [qrTxnId, setQrTxnId] = useState('');
  const [timer, setTimer] = useState(300);

  // Form states
  const [memberId, setMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [period, setPeriod] = useState('May 2026');
  const [method, setMethod] = useState('UPI');

  // Checkout inputs
  const [checkoutMethod, setCheckoutMethod] = useState('UPI');
  const [txnId, setTxnId] = useState('');

  useEffect(() => {
    let interval: any;
    if (isQrModalOpen && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setIsQrModalOpen(false);
    }
    return () => clearInterval(interval);
  }, [isQrModalOpen, timer]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const loadData = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    const propId = activeProperty?.id;

    try {
      const payUrl = propId ? `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/payments?propertyId=${propId}` : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/payments`;
      const memUrl = propId ? `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/members?propertyId=${propId}` : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/members`;

      const [payRes, memRes] = await Promise.all([
        fetch(payUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        fetch(memUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      ]);

      if (payRes.ok && memRes.ok) {
        setPayments(await payRes.json());
        setMembers(await memRes.json());
      } else {
        throw new Error('API failed');
      }
    } catch (err) {
      console.warn('Backend billing APIs failed. Fetching mock states.');
      const savedPay = localStorage.getItem('mock_payments');
      const savedMem = localStorage.getItem('mock_members');

      if (savedPay) {
        setPayments(JSON.parse(savedPay));
      } else {
        const defaultPayments = [
          { id: 'p1', amount: 18000, period: 'May 2026', status: 'PAID', method: 'ONLINE', dueDate: new Date('2026-05-05'), paidDate: new Date('2026-05-04'), transactionId: 'TXNGUR120391', member: { fullName: 'Aakash Verma', mobile: '9812345678', email: 'aakash.v@gmail.com', room: { number: '101' } } },
          { id: 'p2', amount: 18000, period: 'June 2026', status: 'PENDING', method: 'UPI', dueDate: new Date('2026-06-05'), member: { fullName: 'Aakash Verma', mobile: '9812345678', email: 'aakash.v@gmail.com', room: { number: '101' } } },
          { id: 'p3', amount: 12000, period: 'May 2026', status: 'APPROVAL_PENDING', method: 'UPI', dueDate: new Date('2026-05-05'), transactionId: 'TXNNOI901823', member: { fullName: 'Riya Sen', mobile: '8877665544', email: 'riya.sen@gmail.com', room: { number: '302' } } },
        ];
        setPayments(defaultPayments);
        localStorage.setItem('mock_payments', JSON.stringify(defaultPayments));
      }
      if (savedMem) setMembers(JSON.parse(savedMem));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeProperty]);

  // Download Invoice PDF using jsPDF
  const generateInvoice = (pay: any) => {
    const doc = new jsPDF();
    
    // Header Banner
    doc.setFillColor(139, 92, 246); // Purple theme
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('URBAN NEST PREMIUM PG', 14, 25);
    
    doc.setFontSize(10);
    doc.text('OFFICIAL RENT PAYMENT RECEIPT', 14, 32);

    // Metadata
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(10);
    doc.text(`Invoice ID: INV-${pay.id.substring(0, 8).toUpperCase()}`, 14, 55);
    doc.text(`Issue Date: ${new Date().toLocaleDateString()}`, 14, 61);
    doc.text(`Billing Location: ${activeProperty?.name || 'Gurgaon Branch'}`, 14, 67);

    // Tenant info
    doc.setFillColor(243, 244, 249);
    doc.rect(14, 75, 182, 35, 'F');
    
    doc.setTextColor(0, 0, 0);
    doc.setFont('Helvetica', 'bold');
    doc.text('RECEIPT ISSUED TO:', 20, 83);
    doc.setFont('Helvetica', 'normal');
    doc.text(`Resident Name: ${pay.member.fullName}`, 20, 89);
    doc.text(`Phone: ${pay.member.mobile}`, 20, 95);
    doc.text(`Email: ${pay.member.email}`, 20, 101);

    // Details Grid Table Header
    doc.setFillColor(139, 92, 246);
    doc.rect(14, 120, 182, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('DESCRIPTION', 20, 125);
    doc.text('BILLING PERIOD', 100, 125);
    doc.text('AMOUNT (INR)', 160, 125);

    // Row
    doc.setTextColor(0, 0, 0);
    doc.text('Monthly Rent Payment', 20, 137);
    doc.text(pay.period, 100, 137);
    doc.text(`INR ${pay.amount.toLocaleString()}`, 160, 137);
    
    doc.line(14, 142, 196, 142);

    // Totals
    doc.setFont('Helvetica', 'bold');
    doc.text('TOTAL PAID:', 120, 155);
    doc.text(`INR ${pay.amount.toLocaleString()}`, 160, 155);

    // Transaction Details
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Payment Status: ${pay.status.toUpperCase()}`, 14, 175);
    doc.text(`Payment Mode: ${pay.method}`, 14, 181);
    doc.text(`Transaction Reference ID: ${pay.transactionId || 'CASH_SETTLEMENT'}`, 14, 187);
    if (pay.paidDate) doc.text(`Timestamp: ${new Date(pay.paidDate).toLocaleString()}`, 14, 193);

    // Signature stamp
    doc.text('Authorized Signatory', 150, 210);
    doc.line(140, 205, 190, 205);

    // Footer
    doc.setFontSize(8);
    doc.text('Thank you for choosing Urban Nest. For queries contact support@urbannestpg.com', 45, 240);

    doc.save(`invoice_${pay.id.substring(0, 6)}.pdf`);
  };

  // Generate new due request
  const handleGeneratePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!memberId || !amount || !dueDate) {
      alert('Required parameters missing.');
      return;
    }

    const payload = {
      memberId,
      amount: parseFloat(amount),
      dueDate: new Date(dueDate).toISOString(),
      period,
      method: 'UPI',
    };

    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/payments`, {
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
      console.warn('Real dues creation failed, updating local mock state.');
      const targetMem = members.find((m) => m.id === memberId);
      const newPay = {
        id: 'pay_mock_' + Date.now(),
        ...payload,
        status: 'PENDING',
        member: targetMem || { fullName: 'Mock Resident', mobile: '99999', email: 'mock@pg.com' },
      };
      const updated = [newPay, ...payments];
      setPayments(updated);
      localStorage.setItem('mock_payments', JSON.stringify(updated));
      setIsAddModalOpen(false);
      resetForm();
    }
  };

  const handleManualCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!checkoutPayment) return;
    const token = localStorage.getItem('token');
    
    // Check if the selected method requires admin verification/approval
    const isApprovalRequired = checkoutMethod.includes('_APPROVAL');
    
    // Extract clean method type: UPI or ONLINE
    const cleanMethod = checkoutMethod.replace('_APPROVAL', '').replace('_PAID', '');

    const endpoint = isApprovalRequired 
      ? `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/payments/${checkoutPayment.id}/request-approval`
      : `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/payments/${checkoutPayment.id}/manual`;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          method: cleanMethod,
          transactionId: txnId || `TXN${Date.now()}`,
          paidDate: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        setIsCheckoutOpen(false);
        loadData();
        alert(isApprovalRequired ? 'Direct payment submitted for approval successfully!' : 'Manual payment recorded successfully!');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Request failed');
      }
    } catch (err) {
      console.warn('Real settlement failed. Simulating local storage mock update.');
      const targetStatus = isApprovalRequired ? 'APPROVAL_PENDING' : 'PAID';
      const updated = payments.map((p) => {
        if (p.id === checkoutPayment.id) {
          return {
            ...p,
            status: targetStatus,
            method: cleanMethod,
            paidDate: targetStatus === 'PAID' ? new Date() : null,
            transactionId: txnId || `TXN_SETTL_${Date.now().toString().substring(5)}`,
          };
        }
        return p;
      });
      setPayments(updated);
      localStorage.setItem('mock_payments', JSON.stringify(updated));
      setIsCheckoutOpen(false);
      alert(`[MOCK] Recorded manual payment as: ${targetStatus}`);
    }
  };

  const handleApprove = async (payId: string) => {
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/payments/${payId}/approve`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        loadData();
      } else {
        throw new Error('Approval failed');
      }
    } catch (err) {
      const updated = payments.map((p) => {
        if (p.id === payId) {
          return { ...p, status: 'PAID', paidDate: new Date() };
        }
        return p;
      });
      setPayments(updated);
      localStorage.setItem('mock_payments', JSON.stringify(updated));
    }
  };

  const handleInitiateQrPayment = async (pay: any) => {
    setCheckoutPayment(pay);
    setQrLoading(true);
    setQrCodeUrl('');
    setQrPaymentData(null);
    setTimer(300);
    setQrTxnId(`TXN_RPAY_${Math.floor(100000 + Math.random() * 900000)}`);
    setIsQrModalOpen(true);

    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/payments/${pay.id}/razorpay`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        const data = await res.json();
        setQrPaymentData(data);
        setQrCodeUrl(data.qrCodeUrl);
      } else {
        throw new Error('Failed to initiate online transaction');
      }
    } catch (err) {
      console.warn('Real Razorpay QR API failed, falling back to mock UPI QR Code.');
      const upiId = activeProperty?.upiId || 'urbannest.gurgaon@okaxis';
      const propertyName = activeProperty?.name || 'Urban Nest Premium PG';
      const description = `Rent for ${pay.period} - Room ${pay.member?.room?.number || ''}`;
      const upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(propertyName)}&am=${pay.amount}&cu=INR&tn=${encodeURIComponent(description)}`;
      const mockQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiString)}`;

      setQrPaymentData({
        orderId: `order_mock_${Math.random().toString(36).substring(2, 12).toUpperCase()}`,
        amount: pay.amount,
        currency: 'INR',
        paymentId: pay.id,
        qrCodeUrl: mockQrUrl,
        isRealRazorpay: false,
        upiId,
        propertyName,
        keyId: 'rzp_test_mockKeyId123',
      });
      setQrCodeUrl(mockQrUrl);
    } finally {
      setQrLoading(false);
    }
  };

  const handleVerifyQrPayment = async () => {
    if (!checkoutPayment || !qrPaymentData) return;
    
    setQrLoading(true);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/payments/razorpay-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          paymentId: checkoutPayment.id,
          razorpayOrderId: qrPaymentData.orderId,
          razorpayPaymentId: qrTxnId,
        }),
      });

      if (res.ok) {
        setIsQrModalOpen(false);
        loadData();
        alert('Payment verified and rent record updated to PAID.');
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Verification failed');
      }
    } catch (err) {
      console.warn('Verify API failed, simulating local payment success.');
      const updated = payments.map((p) => {
        if (p.id === checkoutPayment.id) {
          return {
            ...p,
            status: 'PAID',
            method: 'ONLINE',
            paidDate: new Date(),
            transactionId: qrTxnId,
          };
        }
        return p;
      });
      setPayments(updated);
      localStorage.setItem('mock_payments', JSON.stringify(updated));
      setIsQrModalOpen(false);
      alert('Payment successfully captured locally in fallback sandbox.');
    } finally {
      setQrLoading(false);
    }
  };

  const resetForm = () => {
    setMemberId('');
    setAmount('');
    setDueDate('');
    setPeriod('May 2026');
  };

  const filteredPayments = payments.filter((p) => {
    const nameMatch = p.member?.fullName.toLowerCase().includes(search.toLowerCase()) || 
                      p.member?.mobile.includes(search);
    const statusMatch = filterStatus === '' ? true : p.status === filterStatus;
    return nameMatch && statusMatch;
  });

  return (
    <div className="space-y-6">
      
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Rent & Collections</h1>
          <p className="text-xs text-slate-400 font-bold uppercase mt-1">Manage rent invoices, approvals and online checkouts</p>
        </div>
        {user?.role !== 'ACCOUNTANT' && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:opacity-90 active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-purple-500/20"
          >
            <Plus size={16} />
            Generate Dues Request
          </button>
        )}
      </div>

      {/* 2. FILTERS */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-grow">
          <Search className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by resident name or mobile..."
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
          <option value="" className="dark:bg-slate-900">All Statuses</option>
          <option value="PAID" className="dark:bg-slate-900">Paid Invoices</option>
          <option value="PENDING" className="dark:bg-slate-900">Pending Dues</option>
          <option value="APPROVAL_PENDING" className="dark:bg-slate-900">Approval Pending</option>
          <option value="OVERDUE" className="dark:bg-slate-900">Overdue bills</option>
        </select>
      </div>

      {/* 3. PAYMENTS LIST */}
      {isLoading ? (
        <div className="py-20 text-center text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">
          Retrieving bills ledger...
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="py-20 rounded-3xl glass-card text-center space-y-2 border border-slate-500/10">
          <p className="text-sm font-bold text-slate-400 uppercase">No payment invoices logged.</p>
          <p className="text-[10px] text-slate-400">Dues records will appear when checked in or requested.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPayments.map((p) => (
            <div 
              key={p.id} 
              className="rounded-3xl glass-card border border-white/20 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm group hover:border-purple-500/20 transition-all"
            >
              <div className="flex gap-4 items-center min-w-0">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  p.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-500' :
                  p.status === 'APPROVAL_PENDING' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'
                }`}>
                  {p.status === 'PAID' ? <CheckCircle size={20} /> : <Clock size={20} />}
                </div>
                
                <div className="min-w-0">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                    p.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-500' :
                    p.status === 'APPROVAL_PENDING' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'
                  }`}>
                    {p.status.replace('_', ' ')}
                  </span>
                  <h3 className="text-sm font-black truncate mt-1">{p.member?.fullName}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                    <span>Period: {p.period}</span>
                    <span>•</span>
                    <span>Due: {new Date(p.dueDate).toLocaleDateString()}</span>
                  </p>
                </div>
              </div>

              {/* Dues Rate & Collect Actions */}
              <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 border-t md:border-t-0 border-slate-500/5 pt-3 md:pt-0">
                <div className="text-left md:text-right">
                  <p className="text-base font-black text-purple-500">₹{p.amount.toLocaleString()}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Rent Due amount</p>
                </div>

                <div className="flex items-center gap-2">
                  {p.status === 'PAID' && (
                    <button
                      onClick={() => generateInvoice(p)}
                      className="p-2.5 rounded-xl bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/15 text-purple-500 text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <FileText size={14} /> Receipt PDF
                    </button>
                  )}

                  {p.status !== 'PAID' && p.status !== 'APPROVAL_PENDING' && (
                    <>
                      <button
                        onClick={() => handleInitiateQrPayment(p)}
                        className="px-3 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-pink-500/15"
                      >
                        Pay Online (Razorpay)
                      </button>
                      
                      <button
                        onClick={() => {
                          setCheckoutPayment(p);
                          setCheckoutMethod('CASH');
                          setTxnId('');
                          setIsCheckoutOpen(true);
                        }}
                        className="px-3 py-2.5 rounded-xl bg-slate-500/5 border border-slate-500/10 hover:bg-slate-500/10 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all"
                      >
                        Record Cash
                      </button>
                    </>
                  )}

                  {p.status === 'APPROVAL_PENDING' && (user?.role === 'OWNER' || user?.role === 'MANAGER') && (
                    <button
                      onClick={() => handleApprove(p.id)}
                      className="px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-500 text-xs font-bold transition-all"
                    >
                      Approve Receipt
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. DIALOG MODAL: GENERATE DUES REQUEST */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl glass-card border border-white/20 p-6 shadow-xl space-y-4 animate-scale-up">
            <div className="flex justify-between items-center pb-2 border-b border-slate-500/10">
              <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5"><CreditCard size={16} className="text-purple-500" /> Create Dues Request</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleGeneratePayment} className="space-y-4 text-xs font-bold text-slate-400">
              <div>
                <label className="block uppercase mb-1.5 pl-0.5">Select Resident *</label>
                <select
                  required
                  value={memberId}
                  onChange={(e) => {
                    setMemberId(e.target.value);
                    const target = members.find(m => m.id === e.target.value);
                    if (target) setAmount(String(target.rentAmount));
                  }}
                  className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold bg-transparent"
                >
                  <option value="" className="dark:bg-slate-900">Choose member...</option>
                  {members.filter(m => m.status === 'ACTIVE').map((m) => (
                    <option key={m.id} value={m.id} className="dark:bg-slate-900">{m.fullName} (Room {m.room?.number || '?'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase mb-1.5 pl-0.5">Rent Due amount (INR) *</label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                  />
                </div>
                <div>
                  <label className="block uppercase mb-1.5 pl-0.5">Billing Period *</label>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold bg-transparent"
                  >
                    <option value="May 2026" className="dark:bg-slate-900">May 2026</option>
                    <option value="June 2026" className="dark:bg-slate-900">June 2026</option>
                    <option value="July 2026" className="dark:bg-slate-900">July 2026</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block uppercase mb-1.5 pl-0.5">Payment Due Date *</label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold text-slate-800 dark:text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:opacity-90 active:scale-95 text-white font-bold text-xs tracking-wide transition-all shadow-md shadow-purple-500/20"
              >
                Dispatch Bill Request
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 5. DIALOG MODAL: RECORD TRANSACTION (CHECKOUT GATEWAY SLIP) */}
      {isCheckoutOpen && checkoutPayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl glass-card border border-white/20 p-6 shadow-xl space-y-4 animate-scale-up">
            <div className="flex justify-between items-center pb-2 border-b border-slate-500/10">
              <h2 className="text-sm font-black uppercase tracking-wider">Checkout Gateway Settlement</h2>
              <button onClick={() => setIsCheckoutOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-bold space-y-1">
              <div className="flex justify-between"><span>Tenant:</span> <span>{checkoutPayment.member?.fullName}</span></div>
              <div className="flex justify-between"><span>Rent amount:</span> <span>₹{checkoutPayment.amount.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Period:</span> <span>{checkoutPayment.period}</span></div>
            </div>

            <form onSubmit={handleManualCheckout} className="space-y-4 text-xs font-bold text-slate-400">
              <div>
                <label className="block uppercase mb-1.5 pl-0.5">Settlement Method</label>
                <select
                  value={checkoutMethod}
                  onChange={(e) => setCheckoutMethod(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold bg-transparent"
                >
                  <option value="CASH" className="dark:bg-slate-900">Cash (Mark Paid Directly)</option>
                  <option value="UPI_PAID" className="dark:bg-slate-900">Direct UPI Transfer (Mark Paid Directly)</option>
                  <option value="ONLINE_PAID" className="dark:bg-slate-900">Direct Bank/Online Transfer (Mark Paid Directly)</option>
                  <option value="UPI_APPROVAL" className="dark:bg-slate-900">Direct UPI Transfer (Submit for Verification)</option>
                  <option value="ONLINE_APPROVAL" className="dark:bg-slate-900">Direct Bank/Online Transfer (Submit for Verification)</option>
                </select>
              </div>

              {checkoutMethod !== 'CASH' && (
                <div>
                  <label className="block uppercase mb-1.5 pl-0.5">Transaction ID / Reference Number</label>
                  <input
                    type="text"
                    placeholder="e.g. TXN9481928392"
                    value={txnId}
                    onChange={(e) => setTxnId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input font-semibold"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:opacity-90 active:scale-95 text-white font-bold text-xs tracking-wide transition-all shadow-md shadow-purple-500/20"
              >
                Record Payment Success
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 6. DIALOG MODAL: RAZORPAY UPI QR CODE PAYMENT GATEWAY */}
      {isQrModalOpen && checkoutPayment && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-[32px] glass-panel border border-white/20 p-6 shadow-2xl space-y-5 animate-scale-up text-center relative overflow-hidden">
            
            {/* Ambient Background Glows */}
            <div className="absolute -top-10 -left-10 w-24 h-24 bg-pink-500/20 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl" />
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-2 border-b border-white/5 relative z-10">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping" />
                <span className="text-xs font-black uppercase tracking-wider bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">Razorpay Secured UPI</span>
              </div>
              <button 
                onClick={() => setIsQrModalOpen(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Resident & Bill details */}
            <div className="space-y-1 relative z-10 text-slate-800 dark:text-white">
              <h3 className="text-lg font-black">{checkoutPayment.member?.fullName}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{checkoutPayment.period} Rent Bill</p>
              <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-400 to-blue-500 mt-2">
                ₹{checkoutPayment.amount.toLocaleString()}
              </div>
            </div>

            {/* QR CODE CONTAINER with scanning visual overlay */}
            <div className="flex flex-col items-center justify-center relative py-4 z-10">
              <div className="relative p-4 bg-white rounded-3xl border border-white/10 shadow-lg overflow-hidden group">
                
                {/* SCANNING LINE ANIMATION */}
                <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-pink-500 to-purple-500 shadow-[0_0_10px_#d946ef] opacity-80 animate-pulse z-20" />
                
                {qrLoading ? (
                  <div className="w-[180px] h-[180px] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-2xl text-xs font-bold text-slate-400 uppercase tracking-wider animate-pulse">
                    <span>Generating</span>
                    <span>QR Code...</span>
                  </div>
                ) : qrCodeUrl ? (
                  <img 
                    src={qrCodeUrl} 
                    alt="Payment QR Code" 
                    className="w-[180px] h-[180px] rounded-xl object-contain relative z-10 dark:brightness-95"
                  />
                ) : (
                  <div className="w-[180px] h-[180px] flex items-center justify-center bg-red-500/10 text-red-500 rounded-2xl text-[10px] font-bold p-3">
                    Failed to load QR code.
                  </div>
                )}
              </div>
              
              {/* UPI details */}
              {qrPaymentData && (
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-3 tracking-wide">
                  Payee UPI: <span className="text-purple-400 font-mono select-all lowercase">{qrPaymentData.upiId}</span>
                </p>
              )}
            </div>

            {/* Instructions */}
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-[10px] text-slate-400 leading-relaxed font-semibold relative z-10 space-y-1">
              <p className="font-bold text-slate-300">📱 Scan QR with Google Pay, PhonePe, Paytm, or BHIM</p>
              <p>The amount and description are automatically filled. Do not close this modal until you complete the payment.</p>
            </div>

            {/* Timer and Reference */}
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-500 px-1 relative z-10">
              <div className="flex items-center gap-1">
                <Clock size={11} className="text-pink-500" />
                <span>Expires: <span className="text-pink-400 font-mono">{formatTimer(timer)}</span></span>
              </div>
              <div>
                <span>Ref: <span className="text-purple-400 font-mono text-[9px]">{qrTxnId.substring(0, 15)}</span></span>
              </div>
            </div>

            {/* Action triggers */}
            <div className="pt-2 flex flex-col gap-2 relative z-10">
              <button
                onClick={handleVerifyQrPayment}
                disabled={qrLoading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:opacity-90 active:scale-95 text-white font-black text-xs tracking-wider transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50"
              >
                {qrLoading ? 'Verifying...' : 'Simulate / Verify Payment Success'}
              </button>
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="w-full py-2.5 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white text-xs font-bold transition-all"
              >
                Cancel Payment
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
