import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Download,
  ShieldCheck,
  Filter,
  RefreshCw,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { useAuth } from '../../context/AuthContext';
import { ownerApi } from '../../services/ownerApi';

export const OwnerDocumentsPage: React.FC = () => {
  const { activeProperty } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Rejection modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Document preview modal
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await ownerApi.getDocuments(activeProperty?.id);
      setDocuments(res.data || []);
    } catch (err: any) {
      console.error('Failed to load documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [activeProperty]);

  const handleVerify = async (docId: string) => {
    setIsProcessing(true);
    try {
      await ownerApi.verifyDocument(docId, { status: 'VERIFIED' });
      showToast('Document verified successfully!');
      fetchDocuments();
    } catch (err: any) {
      showToast(err.message || 'Verification failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenReject = (doc: any) => {
    setSelectedDoc(doc);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;
    if (!rejectionReason.trim()) {
      showToast('Please provide a rejection reason');
      return;
    }

    setIsProcessing(true);
    try {
      await ownerApi.verifyDocument(selectedDoc.id, {
        status: 'REJECTED',
        rejectionReason: rejectionReason.trim(),
      });
      showToast('Document marked as rejected.');
      setRejectModalOpen(false);
      setSelectedDoc(null);
      fetchDocuments();
    } catch (err: any) {
      showToast(err.message || 'Failed to reject document');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredDocs = documents.filter((d) => {
    const residentName = d.resident?.fullName || d.residentName || '';
    const roomNum = d.resident?.bed?.room?.number || d.roomNumber || '';
    const matchesSearch =
      d.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      residentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      roomNum.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || d.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const columns: Column<any>[] = [
    {
      header: 'Resident',
      cell: (d) => (
        <div>
          <p className="font-bold text-[#18231F] dark:text-white">
            {d.resident?.fullName || d.residentName || 'Resident'}
          </p>
          <p className="text-[11px] text-[#68736D]">
            Room {d.resident?.bed?.room?.number || d.roomNumber || 'N/A'} • Bed {d.resident?.bed?.bedNumber || d.bedNumber || 'N/A'}
          </p>
        </div>
      ),
    },
    {
      header: 'Document Title & Type',
      cell: (d) => (
        <div>
          <div className="flex items-center gap-1.5 font-semibold text-[#18231F] dark:text-slate-200">
            <FileText className="w-3.5 h-3.5 text-[#0B4036]" />
            <span>{d.title}</span>
          </div>
          <span className="text-[10px] text-[#8A928D] font-mono">
            {d.type || 'AADHAAR'} {d.documentNumber ? `• ${d.documentNumber}` : ''}
          </span>
        </div>
      ),
    },
    {
      header: 'Submitted On',
      cell: (d) => (
        <span className="text-xs text-[#68736D]">
          {new Date(d.createdAt || Date.now()).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'KYC Status',
      cell: (d) => <StatusBadge status={d.status || 'PENDING'} />,
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (d) => (
        <div className="flex items-center justify-end gap-1.5">
          {d.fileUrl && (
            <Button
              variant="secondary"
              size="xs"
              onClick={() => setPreviewDoc(d)}
              leftIcon={<Eye className="w-3 h-3 text-[#0B4036]" />}
            >
              View
            </Button>
          )}

          {d.status === 'PENDING' && (
            <>
              <Button
                variant="primary"
                size="xs"
                className="bg-[#0B4036] text-white"
                onClick={() => handleVerify(d.id)}
                disabled={isProcessing}
              >
                Verify
              </Button>
              <Button
                variant="outline"
                size="xs"
                className="text-rose-600 border-rose-200 hover:bg-rose-50"
                onClick={() => handleOpenReject(d)}
                disabled={isProcessing}
              >
                Reject
              </Button>
            </>
          )}

          {d.status === 'REJECTED' && d.rejectionReason && (
            <span className="text-[10px] text-rose-600 italic max-w-[120px] truncate" title={d.rejectionReason}>
              {d.rejectionReason}
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#0B4036] text-white px-4 py-2.5 rounded-xl shadow-lg border border-[#C8A45D]/40 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#C8A45D]" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-white/70 hover:text-white">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#18231F] dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#0B4036] dark:text-[#C8A45D]" />
            KYC & Document Verification
          </h1>
          <p className="text-xs text-[#68736D] mt-0.5">
            Review resident identity proofs, government IDs, and rental agreements for {activeProperty?.name || 'your property'}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchDocuments} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
          Refresh Documents
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 border-[#DDE2DD]">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A928D]" />
            <input
              type="text"
              placeholder="Search resident or document..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#DDE2DD] bg-white text-[#18231F] focus:outline-none focus:ring-1 focus:ring-[#0B4036]"
            />
          </div>

          <Select
            label=""
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Verification Statuses' },
              { value: 'PENDING', label: 'Pending Verification' },
              { value: 'VERIFIED', label: 'Verified & Approved' },
              { value: 'REJECTED', label: 'Rejected' },
            ]}
          />

          <Select
            label=""
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={[
              { value: 'ALL', label: 'All Document Types' },
              { value: 'AADHAAR', label: 'Aadhaar Card' },
              { value: 'PAN', label: 'PAN Card' },
              { value: 'PASSPORT', label: 'Passport' },
              { value: 'RENTAL_AGREEMENT', label: 'Rental Agreement' },
              { value: 'STUDENT_ID', label: 'Student / Employee ID' },
            ]}
          />
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0 border-[#DDE2DD] overflow-hidden">
        <Table
          columns={columns}
          data={filteredDocs}
          keyExtractor={(d) => d.id || String(Math.random())}
          isLoading={isLoading}
          emptyMessage="No KYC documents found matching your filter criteria."
        />
      </Card>

      {/* Rejection Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject KYC Document"
        maxWidth="sm"
      >
        <form onSubmit={handleConfirmReject} className="space-y-4">
          <p className="text-xs text-[#68736D]">
            Specify the reason why this document is being rejected (e.g., blurry photo, mismatched name, expired document):
          </p>
          <textarea
            rows={3}
            required
            placeholder="Enter reason for rejection..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="w-full p-2.5 text-xs rounded-xl border border-[#DDE2DD] bg-white text-[#18231F] focus:outline-none focus:ring-1 focus:ring-rose-500"
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-[#DDE2DD]">
            <Button variant="secondary" size="sm" onClick={() => setRejectModalOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" type="submit" isLoading={isProcessing}>
              Confirm Rejection
            </Button>
          </div>
        </form>
      </Modal>

      {/* Document Preview Modal */}
      <Modal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc?.title || 'Document Preview'}
        maxWidth="lg"
      >
        {previewDoc && (
          <div className="space-y-4">
            <div className="p-3 bg-[#F8F7F3] rounded-xl border border-[#DDE2DD] text-xs flex items-center justify-between">
              <div>
                <p className="font-bold text-[#18231F]">{previewDoc.title}</p>
                <p className="text-[#68736D]">
                  Resident: {previewDoc.resident?.fullName || previewDoc.residentName || 'N/A'} • Type: {previewDoc.type || 'AADHAAR'}
                </p>
              </div>
              <StatusBadge status={previewDoc.status} />
            </div>

            <div className="min-h-64 max-h-[65vh] overflow-auto flex items-center justify-center bg-slate-900/5 rounded-xl border border-dashed border-[#DDE2DD] p-4">
              {previewDoc.fileUrl?.endsWith('.pdf') ? (
                <iframe src={previewDoc.fileUrl} title={previewDoc.title} className="w-full h-96 rounded-lg" />
              ) : (
                <img
                  src={previewDoc.fileUrl}
                  alt={previewDoc.title}
                  className="max-h-96 object-contain rounded-lg shadow-sm"
                  onError={(e: any) => {
                    e.target.src = 'https://placehold.co/600x400/0B4036/FFFFFF?text=Document+Secured+in+Supabase+Storage';
                  }}
                />
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-[#DDE2DD]">
              <span className="text-[11px] text-[#8A928D]">Protected KYC Record</span>
              <div className="flex items-center gap-2">
                {previewDoc.fileUrl && (
                  <a
                    href={previewDoc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#0B4036] text-white flex items-center gap-1.5 hover:bg-[#08332c]"
                  >
                    <Download className="w-3.5 h-3.5" /> Open / Download Original
                  </a>
                )}
                <Button variant="secondary" size="sm" onClick={() => setPreviewDoc(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OwnerDocumentsPage;
