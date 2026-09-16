import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  Plus,
  Phone,
  Mail,
  ShieldCheck,
  FileText,
  Calendar,
  CreditCard,
  Building,
  UserCheck,
  ChevronRight,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Eye
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge, Badge } from '../../components/ui/Badge';
import { Input, Select } from '../../components/ui/Input';
import type { Column } from '../../components/ui/Table';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';
import { useAuth } from '../../context/AuthContext';
import { ownerApi } from '../../services/ownerApi';
import type { Resident } from '../../types';

export const ResidentsPage: React.FC = () => {
  const { activeProperty } = useAuth();
  const navigate = useNavigate();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [kycFilter, setKycFilter] = useState('ALL');
  const [selectedResident, setSelectedResident] = useState<any | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchResidents = async () => {
    try {
      setIsLoading(true);
      const res = await ownerApi.getResidents(activeProperty.id);
      setResidents(res.data || []);
    } catch (err: any) {
      console.error('Failed to fetch residents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResidents();
  }, [activeProperty]);

  const handleVerifyDoc = async (docId: string, status: 'VERIFIED' | 'REJECTED') => {
    try {
      let reason: string | undefined = undefined;
      if (status === 'REJECTED') {
        const inputReason = prompt('Please enter the rejection reason for this document:');
        if (!inputReason) return;
        reason = inputReason;
      }

      await ownerApi.verifyDocument(docId, { status, rejectionReason: reason });
      setToastMessage(`Document marked as ${status}`);
      setTimeout(() => setToastMessage(null), 3000);

      // Refresh selected resident profile
      if (selectedResident) {
        const res = await ownerApi.getResidentById(selectedResident.id);
        setSelectedResident(res.data);
      }
      fetchResidents();
    } catch (err: any) {
      alert(err.message || 'Failed to update document status');
    }
  };

  const handleOpenProfile = async (resident: Resident) => {
    try {
      const res = await ownerApi.getResidentById(resident.id);
      setSelectedResident(res.data || resident);
    } catch {
      setSelectedResident(resident);
    }
    setActiveTab('overview');
    setProfileModalOpen(true);
  };

  const filteredResidents = residents.filter((r) => {
    const matchesSearch =
      r.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.mobile.includes(searchQuery) ||
      (r.roomNumber || '').includes(searchQuery);
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesKyc = kycFilter === 'ALL' || r.kycStatus === kycFilter;
    return matchesSearch && matchesStatus && matchesKyc;
  });

  const columns: Column<Resident>[] = [
    {
      header: 'Resident Name',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-xs">
            {row.fullName.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-white text-xs">{row.fullName}</p>
            <p className="text-[11px] text-slate-400">{row.email}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Room & Bed',
      cell: (row) => (
        <div>
          <span className="font-bold text-xs text-blue-600 dark:text-blue-400">Room {row.roomNumber || 'N/A'}</span>
          <p className="text-[11px] text-slate-500">Bed {row.bedNumber || 'N/A'}</p>
        </div>
      )
    },
    {
      header: 'Mobile',
      accessorKey: 'mobile'
    },
    {
      header: 'KYC Status',
      cell: (row) => <StatusBadge status={row.kycStatus || 'PENDING'} />
    },
    {
      header: 'Resident Status',
      cell: (row) => <StatusBadge status={row.status} />
    },
    {
      header: 'Monthly Rent',
      cell: (row) => <span className="font-bold text-xs">₹{(row.monthlyRent || 0).toLocaleString('en-IN')}</span>
    },
    {
      header: 'Action',
      cell: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleOpenProfile(row)}
        >
          View Dossier
        </Button>
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Resident Directory</h1>
          <p className="text-xs text-slate-500">Manage tenant profiles, KYC documents, agreements, and lifecycle statuses</p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/owner/residents/lifecycle')}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          Register New Resident
        </Button>
      </div>

      {/* Search & Filters */}
      <Card className="p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="w-full md:w-80">
          <Input
            placeholder="Search name, room, mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Select
            options={[
              { label: 'All Statuses', value: 'ALL' },
              { label: 'Active', value: 'ACTIVE' },
              { label: 'Notice Period', value: 'NOTICE_PERIOD' },
              { label: 'Moved Out', value: 'MOVED_OUT' },
              { label: 'Pending', value: 'PENDING' }
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />

          <Select
            options={[
              { label: 'All KYC Statuses', value: 'ALL' },
              { label: 'Verified', value: 'VERIFIED' },
              { label: 'Pending Verification', value: 'PENDING' },
              { label: 'Rejected', value: 'REJECTED' }
            ]}
            value={kycFilter}
            onChange={(e) => setKycFilter(e.target.value)}
          />
        </div>
      </Card>

      {/* Table */}
      <Table
        columns={columns}
        data={filteredResidents}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
      />

      {/* Resident Full Profile Dossier Modal */}
      {selectedResident && (
        <Modal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          title={`Resident Profile: ${selectedResident.fullName}`}
          maxWidth="lg"
        >
          <div className="space-y-6">
            <Tabs
              tabs={[
                { id: 'overview', label: 'Overview & Room' },
                { id: 'kyc', label: `KYC Documents (${selectedResident.documents?.length || 0})` },
                { id: 'payments', label: `Payments (${selectedResident.payments?.length || 0})` },
                { id: 'complaints', label: `Complaints (${selectedResident.complaints?.length || 0})` }
              ]}
              activeTab={activeTab}
              onChange={setActiveTab}
            />

            {/* Tab: Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-slate-400 font-medium">Room & Bed:</span>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                      Room {selectedResident.roomNumber || selectedResident.room?.number || 'N/A'} (Bed {selectedResident.bedNumber || selectedResident.bed?.bedNumber || 'N/A'})
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Monthly Rent:</span>
                    <p className="font-bold text-emerald-600 mt-0.5">
                      ₹{(selectedResident.monthlyRent || 0).toLocaleString('en-IN')}/mo
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Security Deposit:</span>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                      ₹{(selectedResident.securityDeposit || selectedResident.depositAmount || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Mobile:</span>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5">{selectedResident.mobile}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Email:</span>
                    <p className="font-bold text-slate-900 dark:text-white mt-0.5">{selectedResident.email}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Current Status:</span>
                    <div className="mt-0.5"><StatusBadge status={selectedResident.status} /></div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <h4 className="font-bold text-slate-900 dark:text-white">Emergency & Permanent Info</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-400">Emergency Contact:</span>
                      <p className="font-medium mt-0.5">{selectedResident.emergencyContact || 'Not provided'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Permanent Address:</span>
                      <p className="font-medium mt-0.5">{selectedResident.address || selectedResident.permanentAddress || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setProfileModalOpen(false);
                      navigate('/owner/residents/lifecycle');
                    }}
                  >
                    Open Lifecycle Pipeline
                  </Button>
                </div>
              </div>
            )}

            {/* Tab: KYC Documents */}
            {activeTab === 'kyc' && (
              <div className="space-y-4">
                {(!selectedResident.documents || selectedResident.documents.length === 0) ? (
                  <p className="text-xs text-slate-400 text-center py-6">No KYC documents submitted yet.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedResident.documents.map((doc: any) => (
                      <div
                        key={doc.id}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">{doc.type || doc.documentType}</span>
                            <StatusBadge status={doc.status} />
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Doc Number: {doc.documentNumber || 'N/A'} • Submitted: {new Date(doc.createdAt).toLocaleDateString()}
                          </p>
                          {doc.rejectionReason && (
                            <p className="text-[11px] text-rose-500 font-semibold mt-0.5">
                              Rejection Reason: {doc.rejectionReason}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1 text-blue-600"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </a>
                          {doc.status === 'PENDING' && (
                            <>
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => handleVerifyDoc(doc.id, 'VERIFIED')}
                                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                              >
                                Verify
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleVerifyDoc(doc.id, 'REJECTED')}
                                leftIcon={<XCircle className="w-3.5 h-3.5" />}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Payments */}
            {activeTab === 'payments' && (
              <div className="space-y-3 text-xs">
                {(!selectedResident.payments || selectedResident.payments.length === 0) ? (
                  <p className="text-slate-400 text-center py-6">No payment records found.</p>
                ) : (
                  selectedResident.payments.map((p: any) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{p.category} ({p.period || p.month})</p>
                        <p className="text-[11px] text-slate-400">Due: {new Date(p.dueDate).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-600">₹{(p.amount || 0).toLocaleString('en-IN')}</p>
                        <StatusBadge status={p.status} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab: Complaints */}
            {activeTab === 'complaints' && (
              <div className="space-y-3 text-xs">
                {(!selectedResident.complaints || selectedResident.complaints.length === 0) ? (
                  <p className="text-slate-400 text-center py-6">No maintenance complaints reported.</p>
                ) : (
                  selectedResident.complaints.map((c: any) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{c.title}</p>
                        <p className="text-[11px] text-slate-400">{c.category} • {c.priority} Priority</p>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
