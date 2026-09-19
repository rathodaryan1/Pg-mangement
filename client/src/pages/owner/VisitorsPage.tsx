import { toast, useToast } from '../../context/ToastContext';
import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Search,
  CheckCircle2,
  XCircle,
  QrCode,
  Clock,
  ShieldCheck,
  AlertCircle,
  Scan,
  Key,
  Plus,
  RefreshCw
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { Input, Select } from '../../components/ui/Input';
import type { Column } from '../../components/ui/Table';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { QRPassCard } from '../../components/ui/QRPassCard';
import { useAuth } from '../../context/AuthContext';
import { ownerApi } from '../../services/ownerApi';
import type { VisitorRequest } from '../../types';

export const VisitorsPage: React.FC = () => {
  const { activeProperty } = useAuth();
  const [visitors, setVisitors] = useState<VisitorRequest[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorRequest | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [gateScanModalOpen, setGateScanModalOpen] = useState(false);
  const [createVisitorModalOpen, setCreateVisitorModalOpen] = useState(false);
  const [qrCodeInput, setQrCodeInput] = useState('');
  const [qrVerificationResult, setQrVerificationResult] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form for direct visitor logging
  const [visitorForm, setVisitorForm] = useState({
    residentId: '',
    visitorName: '',
    visitorMobile: '',
    relation: 'Friend',
    purpose: '',
    visitDate: new Date().toISOString().split('T')[0],
    expectedTime: '14:00'
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [resVisitors, resResidents] = await Promise.all([
        ownerApi.getVisitors(activeProperty?.id),
        ownerApi.getResidents({ propertyId: activeProperty?.id, status: 'ACTIVE' }).catch(() => ({ data: [] }))
      ]);
      setVisitors(resVisitors.data || []);
      setResidents(resResidents.data || []);
    } catch (err: any) {
      console.error('Failed to fetch visitors:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeProperty]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCreateVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!visitorForm.visitorName || !visitorForm.visitorMobile) {
        toast.error('Please provide visitor name and mobile number.');
        return;
      }
      await ownerApi.createVisitor({
        propertyId: activeProperty?.id,
        residentId: visitorForm.residentId || undefined,
        visitorName: visitorForm.visitorName,
        visitorMobile: visitorForm.visitorMobile,
        relation: visitorForm.relation,
        purpose: visitorForm.purpose || 'Visit',
        visitDate: visitorForm.visitDate,
        expectedTime: visitorForm.expectedTime
      });

      setCreateVisitorModalOpen(false);
      showToast(`Visitor pass created for ${visitorForm.visitorName}!`);
      setVisitorForm({
        residentId: '',
        visitorName: '',
        visitorMobile: '',
        relation: 'Friend',
        purpose: '',
        visitDate: new Date().toISOString().split('T')[0],
        expectedTime: '14:00'
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create visitor pass');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await ownerApi.approveVisitor(id);
      showToast('Visitor request approved! QR pass generated.');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve visitor');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await ownerApi.rejectVisitor(id);
      showToast('Visitor request rejected.');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject visitor');
    }
  };

  const handleCheckIn = async (id: string) => {
    try {
      await ownerApi.checkInVisitor(id);
      showToast('Visitor checked in at security gate.');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to check in');
    }
  };

  const handleCheckOut = async (id: string) => {
    try {
      await ownerApi.checkOutVisitor(id);
      showToast('Visitor marked as checked out.');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to check out');
    }
  };

  const handleVerifyQR = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!qrCodeInput.trim()) return;
      
      // Extract the actual token if the scanner read the full URL
      let tokenToVerify = qrCodeInput.trim();
      if (tokenToVerify.includes('/gate/verify/')) {
        tokenToVerify = tokenToVerify.split('/gate/verify/').pop() || tokenToVerify;
      }

      const res = await ownerApi.verifyVisitorQR(tokenToVerify);
      setQrVerificationResult(res.data);
      if (res.data.valid) {
        const visitorData = res.data.visitor || res.data.pass;
        showToast(`Valid pass verified for ${visitorData?.visitorName || visitorData?.name}!`);
        fetchData();
      }
    } catch (err: any) {
      setQrVerificationResult({ valid: false, message: err.message || 'Verification failed' });
    }
  };

  const filteredVisitors = visitors.filter((v) => {
    const matchesSearch =
      v.visitorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.residentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.visitorMobile?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns: Column<VisitorRequest>[] = [
    {
      header: 'Visitor Details',
      cell: (row) => (
        <div>
          <p className="font-bold text-xs text-slate-900 dark:text-white">{row.visitorName}</p>
          <p className="text-[11px] text-slate-400">
            {row.relation || 'Guest'} • {row.visitorMobile}
          </p>
        </div>
      )
    },
    {
      header: 'Host Resident',
      cell: (row) => (
        <div>
          <p className="font-bold text-xs text-brand-forest dark:text-brand-gold">{row.residentName || 'Walk-in / Gate Pass'}</p>
          <p className="text-[11px] text-slate-500">{row.roomNumber ? `Room ${row.roomNumber}` : 'General Entry'}</p>
        </div>
      )
    },
    {
      header: 'Visit Schedule',
      cell: (row) => (
        <span className="text-xs">
          {row.visitDate ? new Date(row.visitDate).toLocaleDateString() : 'Today'} ({row.expectedTime || 'Anytime'})
        </span>
      )
    },
    {
      header: 'Purpose',
      accessorKey: 'purpose'
    },
    {
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />
    },
    {
      header: 'Actions & Pass',
      cell: (row) => (
        <div className="flex items-center gap-2">
          {row.status === 'PENDING' && (
            <>
              <Button variant="success" size="sm" onClick={() => handleApprove(row.id)}>
                Approve
              </Button>
              <Button variant="danger" size="sm" onClick={() => handleReject(row.id)}>
                Reject
              </Button>
            </>
          )}

          {row.status === 'APPROVED' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedVisitor(row);
                  setQrModalOpen(true);
                }}
                leftIcon={<QrCode className="w-3.5 h-3.5 text-brand-forest dark:text-brand-gold" />}
              >
                QR Pass
              </Button>
              <Button variant="primary" size="sm" onClick={() => handleCheckIn(row.id)}>
                Check-In
              </Button>
            </>
          )}

          {row.status === 'CHECKED_IN' && (
            <Button variant="outline" size="sm" onClick={() => handleCheckOut(row.id)}>
              Mark Exit
            </Button>
          )}
        </div>
      )
    }
  ];

  const verifiedVisitor = qrVerificationResult?.visitor || qrVerificationResult?.pass;

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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Visitor Desk & Security Gate Pass
          </h1>
          <p className="text-xs text-slate-500">
            Approve resident guest entries, track cryptographically verified digital QR passes, and log gate check-ins/outs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setQrCodeInput('');
              setQrVerificationResult(null);
              setGateScanModalOpen(true);
            }}
            leftIcon={<Scan className="w-3.5 h-3.5 text-brand-forest dark:text-brand-gold" />}
          >
            Verify / Scan QR
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateVisitorModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Log Visitor Pass
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <Card className="p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="w-full md:w-80">
          <Input
            placeholder="Search visitor, host, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        <Select
          options={[
            { label: 'All Gate Statuses', value: 'ALL' },
            { label: 'Pending Approval', value: 'PENDING' },
            { label: 'Approved', value: 'APPROVED' },
            { label: 'Checked In', value: 'CHECKED_IN' },
            { label: 'Checked Out', value: 'CHECKED_OUT' },
            { label: 'Rejected', value: 'REJECTED' }
          ]}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        />
      </Card>

      {/* Table */}
      <Table columns={columns} data={filteredVisitors} keyExtractor={(item) => item.id} isLoading={isLoading} />

      {/* Create Visitor Pass Modal */}
      <Modal
        isOpen={createVisitorModalOpen}
        onClose={() => setCreateVisitorModalOpen(false)}
        title="Log Visitor / Gate Pass"
      >
        <form onSubmit={handleCreateVisitor} className="space-y-4">
          <Select
            label="Host Resident (Optional for walk-ins)"
            options={[
              { label: 'None / Direct PG Guest / Delivery', value: '' },
              ...residents.map((r) => ({
                label: `${r.fullName} (Room ${r.room?.number || r.roomNumber || 'N/A'})`,
                value: r.id
              }))
            ]}
            value={visitorForm.residentId}
            onChange={(e) => setVisitorForm({ ...visitorForm, residentId: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Visitor Full Name"
              placeholder="e.g. Rahul Sharma"
              value={visitorForm.visitorName}
              onChange={(e) => setVisitorForm({ ...visitorForm, visitorName: e.target.value })}
              required
            />
            <Input
              label="Visitor Mobile Number"
              placeholder="e.g. +91 98765 43210"
              value={visitorForm.visitorMobile}
              onChange={(e) => setVisitorForm({ ...visitorForm, visitorMobile: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Relation to Host"
              options={[
                { label: 'Friend', value: 'Friend' },
                { label: 'Parent / Family', value: 'Parent' },
                { label: 'Sibling', value: 'Sibling' },
                { label: 'Colleague', value: 'Colleague' },
                { label: 'Delivery / Courier', value: 'Delivery' },
                { label: 'Maintenance Vendor', value: 'Vendor' },
                { label: 'Other', value: 'Other' }
              ]}
              value={visitorForm.relation}
              onChange={(e) => setVisitorForm({ ...visitorForm, relation: e.target.value })}
            />
            <Input
              label="Purpose of Visit"
              placeholder="e.g. Casual visit / parcel delivery"
              value={visitorForm.purpose}
              onChange={(e) => setVisitorForm({ ...visitorForm, purpose: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Visit Date"
              type="date"
              value={visitorForm.visitDate}
              onChange={(e) => setVisitorForm({ ...visitorForm, visitDate: e.target.value })}
              required
            />
            <Input
              label="Expected Arrival Time"
              type="time"
              value={visitorForm.expectedTime}
              onChange={(e) => setVisitorForm({ ...visitorForm, expectedTime: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button variant="outline" size="sm" type="button" onClick={() => setCreateVisitorModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Generate & Approve Pass
            </Button>
          </div>
        </form>
      </Modal>

      {/* QR Pass Modal */}
      {selectedVisitor && (
        <Modal isOpen={qrModalOpen} onClose={() => setQrModalOpen(false)} maxWidth="sm">
          <div className="py-2">
            <QRPassCard visitor={selectedVisitor} />
            <div className="mt-4 flex justify-center">
              <Button variant="outline" size="sm" onClick={() => setQrModalOpen(false)}>
                Close Pass Modal
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Security Gate QR Verifier Modal */}
      <Modal
        isOpen={gateScanModalOpen}
        onClose={() => setGateScanModalOpen(false)}
        title="Gate Security QR Pass Verification"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Enter the visitor's secure QR pass code or paste cryptographic verification payload to validate entry
            permissions.
          </p>

          <form onSubmit={handleVerifyQR} className="space-y-3">
            <Input
              label="QR Pass Code / Signature Payload"
              placeholder="e.g. UN-PASS-..."
              value={qrCodeInput}
              onChange={(e) => setQrCodeInput(e.target.value)}
              required
            />
            <div className="flex justify-end gap-2">
              <Button variant="primary" size="sm" type="submit" leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}>
                Verify Authenticity
              </Button>
            </div>
          </form>

          {qrVerificationResult && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-2 ${
                qrVerificationResult.valid
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 text-rose-900 dark:text-rose-200'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                {qrVerificationResult.valid ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600" />
                )}
                <span>{qrVerificationResult.valid ? 'VALID PASS VERIFIED' : 'INVALID / EXPIRED PASS'}</span>
              </div>

              {verifiedVisitor && (
                <div className="space-y-1 pt-1 border-t border-emerald-200/60 dark:border-emerald-800/40">
                  <p>
                    <strong>Visitor:</strong>{' '}
                    {verifiedVisitor.visitorName || verifiedVisitor.name}
                  </p>
                  <p>
                    <strong>Host Resident:</strong>{' '}
                    {verifiedVisitor.residentName || verifiedVisitor.resident?.fullName} (Room{' '}
                    {verifiedVisitor.roomNumber ||
                      verifiedVisitor.resident?.room?.number ||
                      'N/A'}
                    )
                  </p>
                  <p>
                    <strong>Purpose:</strong> {verifiedVisitor.purpose}
                  </p>
                  <p>
                    <strong>Status:</strong> {verifiedVisitor.status}
                  </p>
                  
                  <div className="mt-4 pt-3 border-t border-emerald-200/60 dark:border-emerald-800/40 flex justify-end gap-2">
                    {verifiedVisitor.status === 'APPROVED' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          handleCheckIn(verifiedVisitor.id);
                          setGateScanModalOpen(false);
                        }}
                      >
                        Check-In Visitor
                      </Button>
                    )}
                    {verifiedVisitor.status === 'CHECKED_IN' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          handleCheckOut(verifiedVisitor.id);
                          setGateScanModalOpen(false);
                        }}
                      >
                        Mark Exit (Check-Out)
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default VisitorsPage;
