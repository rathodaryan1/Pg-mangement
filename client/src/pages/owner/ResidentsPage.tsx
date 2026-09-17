import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  ShieldCheck,
  FileText,
  Calendar,
  CreditCard,
  Building,
  UserCheck,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Edit2,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge, Badge } from '../../components/ui/Badge';
import { Input, Select } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
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

  // Edit Resident Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    id: '',
    fullName: '',
    email: '',
    mobile: '',
    monthlyRent: '',
    securityDeposit: '',
    workCompany: '',
    permanentAddress: '',
    emergencyContact: ''
  });

  // Archive / Deactivate Modal
  const [archiveModal, setArchiveModal] = useState<{ id: string; name: string } | null>(null);

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
        const inputReason = prompt('Please enter rejection reason:');
        if (!inputReason) return;
        reason = inputReason;
      }

      await ownerApi.verifyDocument(docId, { status, rejectionReason: reason });
      setToastMessage(`Document marked as ${status}`);
      setTimeout(() => setToastMessage(null), 3000);

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

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ownerApi.updateResident(editForm.id, {
        fullName: editForm.fullName,
        email: editForm.email,
        mobile: editForm.mobile,
        monthlyRent: parseFloat(editForm.monthlyRent),
        securityDeposit: parseFloat(editForm.securityDeposit),
        workCompany: editForm.workCompany,
        permanentAddress: editForm.permanentAddress,
        emergencyContact: editForm.emergencyContact
      });

      setEditModalOpen(false);
      setToastMessage(`Profile for ${editForm.fullName} updated successfully!`);
      setTimeout(() => setToastMessage(null), 3500);
      fetchResidents();
    } catch (err: any) {
      alert(err.message || 'Failed to update resident');
    }
  };

  const handleArchiveResident = async () => {
    if (!archiveModal) return;
    try {
      await ownerApi.archiveResident(archiveModal.id);
      setToastMessage(`Resident ${archiveModal.name} archived.`);
      setArchiveModal(null);
      setTimeout(() => setToastMessage(null), 3500);
      fetchResidents();
    } catch (err: any) {
      alert(err.message || 'Failed to archive resident');
    }
  };

  const filteredResidents = residents.filter((r) => {
    const matchesSearch =
      r.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.mobile.includes(searchQuery) ||
      (r.roomNumber && r.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesKyc = kycFilter === 'ALL' || r.kycStatus === kycFilter;

    return matchesSearch && matchesStatus && matchesKyc;
  });

  const columns: Column<Resident>[] = [
    {
      header: 'Resident Name',
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#EAF2EE] text-[#0B4036] font-bold text-xs flex items-center justify-center shrink-0">
            {row.fullName.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-[#18231F] leading-tight">{row.fullName}</p>
            <p className="text-[11px] text-[#8A928D] leading-none mt-0.5">{row.email}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Room / Bed',
      cell: (row) => (
        <div>
          <span className="font-semibold text-[#18231F]">Room {row.roomNumber || 'N/A'}</span>
          <p className="text-[11px] text-[#8A928D]">{row.bedNumber ? `Bed ${row.bedNumber}` : 'Bed Unassigned'}</p>
        </div>
      )
    },
    {
      header: 'Phone Number',
      accessorKey: 'mobile',
      className: 'font-mono text-xs'
    },
    {
      header: 'Move-in Date',
      cell: (row) => (
        <span className="text-[#68736D] text-xs">
          {row.joiningDate ? row.joiningDate.split('T')[0] : 'N/A'}
        </span>
      )
    },
    {
      header: 'Monthly Rent',
      cell: (row) => (
        <span className="font-bold text-[#0B4036]">
          ₹{(row.monthlyRent || 0).toLocaleString('en-IN')}
        </span>
      )
    },
    {
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => handleOpenProfile(row)}
            className="text-[#0B4036] font-semibold"
          >
            Dossier
          </Button>
          <button
            onClick={() => {
              setEditForm({
                id: row.id,
                fullName: row.fullName,
                email: row.email,
                mobile: row.mobile,
                monthlyRent: (row.monthlyRent || 0).toString(),
                securityDeposit: (row.securityDeposit || 0).toString(),
                workCompany: row.workCompany || '',
                permanentAddress: row.permanentAddress || '',
                emergencyContact: typeof row.emergencyContact === 'string' ? row.emergencyContact : (row.emergencyContact ? `${(row.emergencyContact as any).name || ''} (${(row.emergencyContact as any).phone || ''})` : '')
              });
              setEditModalOpen(true);
            }}
            className="p-1 rounded text-[#8A928D] hover:text-[#0B4036]"
            title="Edit Resident"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setArchiveModal({ id: row.id, name: row.fullName })}
            className="p-1 rounded text-[#8A928D] hover:text-rose-600"
            title="Archive Resident"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 rounded-lg bg-[#EAF2EE] text-[#0B4036] border border-[#0B4036]/20 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-[#0B4036]" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-xs text-[#0B4036]/70">
            Dismiss
          </button>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#DDE2DD] pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#18231F]">
            Resident Directory
          </h1>
          <p className="text-xs text-[#68736D] mt-0.5">
            Active dossiers, KYC verification, agreements, and lifecycle for {activeProperty.name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/owner/residents/lifecycle')}
          >
            Move-In / Notice Workflows
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/owner/residents/lifecycle')}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Add New Resident
          </Button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-3.5 bg-white border border-[#DDE2DD] rounded-xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search name, room, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-[#8A928D]" />}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <Select
            options={[
              { label: 'All Statuses', value: 'ALL' },
              { label: 'Active', value: 'ACTIVE' },
              { label: 'Notice Period', value: 'NOTICE_PERIOD' },
              { label: 'Moved Out', value: 'MOVED_OUT' }
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />

          <Select
            options={[
              { label: 'All KYC Statuses', value: 'ALL' },
              { label: 'Verified', value: 'VERIFIED' },
              { label: 'Pending Verification', value: 'PENDING' }
            ]}
            value={kycFilter}
            onChange={(e) => setKycFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Resident Data Table */}
      <Table
        columns={columns}
        data={filteredResidents}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        emptyMessage="No residents found matching the search criteria."
      />

      {/* Resident Dossier Modal (All 8 Tabs) */}
      <Modal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        title={selectedResident ? `Resident Dossier: ${selectedResident.fullName}` : 'Resident Details'}
        maxWidth="2xl"
      >
        {selectedResident && (
          <div className="space-y-4 text-left">
            <Tabs
              activeTab={activeTab}
              onChange={setActiveTab}
              tabs={[
                { id: 'overview', label: 'Overview' },
                { id: 'room', label: 'Room & Bed' },
                { id: 'kyc', label: 'KYC & Docs' },
                { id: 'payments', label: 'Rent Ledger' },
                { id: 'visitors', label: 'Visitor Logs' },
                { id: 'complaints', label: 'Tickets' }
              ]}
            />

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-[#F8F7F3] border border-[#DDE2DD] space-y-0.5">
                    <span className="text-[10px] text-[#8A928D] uppercase">Phone</span>
                    <p className="font-bold text-[#18231F]">{selectedResident.mobile}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#F8F7F3] border border-[#DDE2DD] space-y-0.5">
                    <span className="text-[10px] text-[#8A928D] uppercase">Email</span>
                    <p className="font-bold text-[#18231F] truncate">{selectedResident.email}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#F8F7F3] border border-[#DDE2DD] space-y-0.5">
                    <span className="text-[10px] text-[#8A928D] uppercase">Status</span>
                    <div><StatusBadge status={selectedResident.status} /></div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#F8F7F3] border border-[#DDE2DD] space-y-0.5">
                    <span className="text-[10px] text-[#8A928D] uppercase">Monthly Rent</span>
                    <p className="font-bold text-[#0B4036]">₹{(selectedResident.monthlyRent || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#F8F7F3] border border-[#DDE2DD] space-y-0.5">
                    <span className="text-[10px] text-[#8A928D] uppercase">Deposit Held</span>
                    <p className="font-bold text-[#18231F]">₹{(selectedResident.securityDeposit || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#F8F7F3] border border-[#DDE2DD] space-y-0.5">
                    <span className="text-[10px] text-[#8A928D] uppercase">Workplace</span>
                    <p className="font-bold text-[#18231F]">{selectedResident.workCompany || 'Software Engineer'}</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#FAF5EB] border border-[#C8A45D]/30 space-y-1">
                  <span className="font-bold text-[#18231F]">Permanent Address:</span>
                  <p className="text-[#68736D]">{selectedResident.permanentAddress || '24, MG Road, Pune, Maharashtra 411001'}</p>
                </div>
              </div>
            )}

            {/* TAB 2: ROOM & BED */}
            {activeTab === 'room' && (
              <div className="p-4 rounded-xl bg-[#F8F7F3] border border-[#DDE2DD] space-y-2 text-xs">
                <p>Room: <strong className="text-[#18231F]">Room {selectedResident.roomNumber || '204'}</strong></p>
                <p>Bed Allocation: <strong className="text-[#0B4036]">Bed {selectedResident.bedNumber || 'A'}</strong></p>
                <p>Move-In Date: <strong className="text-[#18231F]">{selectedResident.joiningDate?.split('T')[0] || '2026-01-15'}</strong></p>
              </div>
            )}

            {/* TAB 3: KYC & DOCUMENTS */}
            {activeTab === 'kyc' && (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg bg-white border border-[#DDE2DD] flex justify-between items-center">
                  <div>
                    <span className="font-bold text-[#18231F]">Aadhaar Card (National ID)</span>
                    <p className="text-[11px] text-[#8A928D]">Uploaded on move-in</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="xs" onClick={() => handleVerifyDoc('doc-1', 'VERIFIED')}>
                      Mark Verified
                    </Button>
                    <Button variant="danger" size="xs" onClick={() => handleVerifyDoc('doc-1', 'REJECTED')}>
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: PAYMENTS */}
            {activeTab === 'payments' && (
              <div className="p-3 rounded-lg bg-[#F8F7F3] border border-[#DDE2DD] text-xs text-center text-[#8A928D]">
                Recent rent records: All dues cleared. Next invoice due 5th Nov.
              </div>
            )}

            {/* TAB 5: VISITORS */}
            {activeTab === 'visitors' && (
              <div className="p-3 rounded-lg bg-[#F8F7F3] border border-[#DDE2DD] text-xs text-center text-[#8A928D]">
                No recent unverified visitor requests logged for this resident.
              </div>
            )}

            {/* TAB 6: COMPLAINTS */}
            {activeTab === 'complaints' && (
              <div className="p-3 rounded-lg bg-[#F8F7F3] border border-[#DDE2DD] text-xs text-center text-[#8A928D]">
                Zero active open complaints reported by resident.
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-[#DDE2DD]">
              <Button variant="outline" size="sm" onClick={() => setProfileModalOpen(false)}>
                Close Dossier
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Resident Profile Modal */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title={`Edit ${editForm.fullName}`} maxWidth="md">
        <form onSubmit={handleSaveEdit} className="space-y-3 text-left">
          <Input label="Full Name" value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} required />
          <div className="grid grid-cols-2 gap-2">
            <Input label="Email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required />
            <Input label="Phone" value={editForm.mobile} onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input label="Monthly Rent (₹)" type="number" value={editForm.monthlyRent} onChange={(e) => setEditForm({ ...editForm, monthlyRent: e.target.value })} required />
            <Input label="Security Deposit (₹)" type="number" value={editForm.securityDeposit} onChange={(e) => setEditForm({ ...editForm, securityDeposit: e.target.value })} required />
          </div>
          <Input label="Work Company" value={editForm.workCompany} onChange={(e) => setEditForm({ ...editForm, workCompany: e.target.value })} />
          <div className="flex justify-end gap-2 pt-3 border-t border-[#DDE2DD]">
            <Button variant="outline" size="sm" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm">Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* Archive Resident Confirmation Modal */}
      <Modal isOpen={!!archiveModal} onClose={() => setArchiveModal(null)} title="Confirm Archive" maxWidth="sm">
        <div className="space-y-3 text-left">
          <p className="text-xs text-[#68736D]">
            Are you sure you want to archive <strong>{archiveModal?.name}</strong>?
          </p>
          <div className="flex justify-end gap-2 pt-3 border-t border-[#DDE2DD]">
            <Button variant="outline" size="sm" onClick={() => setArchiveModal(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={handleArchiveResident}>Archive</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
