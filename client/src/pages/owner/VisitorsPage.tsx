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
  Key
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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorRequest | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [gateScanModalOpen, setGateScanModalOpen] = useState(false);
  const [qrCodeInput, setQrCodeInput] = useState('');
  const [qrVerificationResult, setQrVerificationResult] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchVisitors = async () => {
    try {
      setIsLoading(true);
      const res = await ownerApi.getVisitors(activeProperty.id);
      setVisitors(res.data || []);
    } catch (err: any) {
      console.error('Failed to fetch visitors:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitors();
  }, [activeProperty]);

  const handleApprove = async (id: string) => {
    try {
      await ownerApi.approveVisitor(id);
      setToastMessage('Visitor request approved! QR pass generated.');
      setTimeout(() => setToastMessage(null), 3000);
      fetchVisitors();
    } catch (err: any) {
      alert(err.message || 'Failed to approve visitor');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await ownerApi.rejectVisitor(id);
      setToastMessage('Visitor request rejected.');
      setTimeout(() => setToastMessage(null), 3000);
      fetchVisitors();
    } catch (err: any) {
      alert(err.message || 'Failed to reject visitor');
    }
  };

  const handleCheckIn = async (id: string) => {
    try {
      await ownerApi.checkInVisitor(id);
      setToastMessage('Visitor checked in at security gate.');
      setTimeout(() => setToastMessage(null), 3000);
      fetchVisitors();
    } catch (err: any) {
      alert(err.message || 'Failed to check in');
    }
  };

  const handleCheckOut = async (id: string) => {
    try {
      await ownerApi.checkOutVisitor(id);
      setToastMessage('Visitor checked out.');
      setTimeout(() => setToastMessage(null), 3000);
      fetchVisitors();
    } catch (err: any) {
      alert(err.message || 'Failed to check out');
    }
  };

  const handleVerifyQR = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!qrCodeInput.trim()) return;
      const res = await ownerApi.verifyVisitorQR(qrCodeInput.trim());
      setQrVerificationResult(res.data);
      if (res.data.valid) {
        setToastMessage(`Valid pass verified for ${res.data.visitor.visitorName || res.data.visitor.name}!`);
        setTimeout(() => setToastMessage(null), 4000);
        fetchVisitors();
      }
    } catch (err: any) {
      setQrVerificationResult({ valid: false, message: err.message || 'Verification failed' });
    }
  };

  const filteredVisitors = visitors.filter((v) => {
    const matchesSearch =
      v.visitorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.residentName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns: Column<VisitorRequest>[] = [
    {
      header: 'Visitor Details',
      cell: (row) => (
        <div>
          <p className="font-bold text-xs text-slate-900 dark:text-white">{row.visitorName}</p>
          <p className="text-[11px] text-slate-400">{row.relation || 'Guest'} • {row.visitorMobile}</p>
        </div>
      )
    },
    {
      header: 'Host Resident',
      cell: (row) => (
        <div>
          <p className="font-bold text-xs text-blue-600 dark:text-blue-400">{row.residentName}</p>
          <p className="text-[11px] text-slate-500">Room {row.roomNumber || 'N/A'}</p>
        </div>
      )
    },
    {
      header: 'Visit Schedule',
      cell: (row) => (
        <span className="text-xs">{new Date(row.visitDate).toLocaleDateString()} ({row.expectedTime || 'Anytime'})</span>
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
                leftIcon={<QrCode className="w-3.5 h-3.5 text-purple-600" />}
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Visitor Approval & Security Gate Desk</h1>
          <p className="text-xs text-slate-500">Approve resident guest entries, track cryptographically verified digital QR passes, and log gate entries</p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setQrCodeInput('');
            setQrVerificationResult(null);
            setGateScanModalOpen(true);
          }}
          leftIcon={<Scan className="w-3.5 h-3.5" />}
        >
          Verify / Scan QR Pass
        </Button>
      </div>

      {/* Toolbar */}
      <Card className="p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="w-full md:w-80">
          <Input
            placeholder="Search visitor, host..."
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
            { label: 'Checked Out', value: 'CHECKED_OUT' }
          ]}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        />
      </Card>

      {/* Table */}
      <Table
        columns={columns}
        data={filteredVisitors}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
      />

      {/* QR Pass Modal */}
      {selectedVisitor && (
        <Modal
          isOpen={qrModalOpen}
          onClose={() => setQrModalOpen(false)}
          maxWidth="sm"
        >
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
            Enter the visitor's secure QR pass code or paste cryptographic verification payload to validate entry permissions.
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
                {qrVerificationResult.valid ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-rose-600" />}
                <span>{qrVerificationResult.valid ? 'VALID PASS VERIFIED' : 'INVALID / EXPIRED PASS'}</span>
              </div>

              {qrVerificationResult.visitor && (
                <div className="space-y-1 pt-1 border-t border-emerald-200/60 dark:border-emerald-800/40">
                  <p><strong>Visitor:</strong> {qrVerificationResult.visitor.visitorName || qrVerificationResult.visitor.name}</p>
                  <p><strong>Host Resident:</strong> {qrVerificationResult.visitor.residentName || qrVerificationResult.visitor.resident?.fullName} (Room {qrVerificationResult.visitor.roomNumber || qrVerificationResult.visitor.resident?.room?.number || 'N/A'})</p>
                  <p><strong>Purpose:</strong> {qrVerificationResult.visitor.purpose}</p>
                  <p><strong>Status:</strong> {qrVerificationResult.visitor.status}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
