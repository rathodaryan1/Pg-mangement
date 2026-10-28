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
  UserCheck,
  Plus,
  Award,
  Calendar,
  Building2,
  Sparkles,
  Copy,
  FileCheck
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Select, Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { useAuth } from '../../context/AuthContext';
import { ownerApi } from '../../services/ownerApi';

export const OwnerDocumentsPage: React.FC = () => {
  const { activeProperty } = useAuth();
  const [activeTab, setActiveTab] = useState<'kyc' | 'compliance' | 'templates'>('kyc');

  // KYC States
  const [documents, setDocuments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // KYC Rejection modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // KYC Preview modal
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [previewSignedUrl, setPreviewSignedUrl] = useState<string | null>(null);

  // Compliance States
  const [complianceRecords, setComplianceRecords] = useState<any[]>([]);
  const [complianceLoading, setComplianceLoading] = useState(false);
  const [complianceModalOpen, setComplianceModalOpen] = useState(false);
  const [newCompliance, setNewCompliance] = useState({
    category: 'FIRE_SAFETY',
    title: '',
    documentNumber: '',
    issuedBy: '',
    issuedDate: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
  });

  // Agreements States
  const [templates, setTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [residents, setResidents] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [selectedResidentId, setSelectedResidentId] = useState<string>('');
  const [generatedAgreement, setGeneratedAgreement] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch KYC
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

  // Fetch Compliance
  const fetchCompliance = async () => {
    setComplianceLoading(true);
    try {
      const res = await ownerApi.getComplianceRecords(activeProperty?.id);
      setComplianceRecords(res.data || []);
    } catch (err: any) {
      console.error('Failed to load compliance records:', err);
    } finally {
      setComplianceLoading(false);
    }
  };

  // Fetch Agreement Templates & Residents
  const fetchTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const [tmplRes, resRes] = await Promise.all([
        ownerApi.getAgreementTemplates(),
        ownerApi.getResidents(activeProperty?.id),
      ]);
      setTemplates(tmplRes.data || []);
      setResidents(resRes.data || []);
      if (tmplRes.data && tmplRes.data.length > 0 && !selectedTemplate) {
        setSelectedTemplate(tmplRes.data[0]);
      }
    } catch (err: any) {
      console.error('Failed to load agreement templates:', err);
    } finally {
      setTemplatesLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchCompliance();
    fetchTemplates();
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

  const handleOpenPreview = async (doc: any) => {
    setPreviewDoc(doc);
    setPreviewSignedUrl(null);
    try {
      const res = await ownerApi.downloadDocument(doc.id);
      if (res?.downloadUrl) {
        setPreviewSignedUrl(res.downloadUrl);
      } else {
        setPreviewSignedUrl(`/api/owner/documents/${doc.id}/file`);
      }
    } catch {
      setPreviewSignedUrl(`/api/owner/documents/${doc.id}/file`);
    }
  };

  // Submit new compliance record
  const handleSaveCompliance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProperty?.id) {
      showToast('Please select an active property first');
      return;
    }
    if (!newCompliance.title.trim()) {
      showToast('Title is required');
      return;
    }
    try {
      await ownerApi.createComplianceRecord({
        propertyId: activeProperty.id,
        ...newCompliance,
      });
      showToast('Statutory certificate registered successfully!');
      setComplianceModalOpen(false);
      setNewCompliance({
        category: 'FIRE_SAFETY',
        title: '',
        documentNumber: '',
        issuedBy: '',
        issuedDate: new Date().toISOString().split('T')[0],
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: '',
      });
      fetchCompliance();
    } catch (err: any) {
      showToast(err.message || 'Failed to register compliance record');
    }
  };

  // Generate Agreement
  const handleGenerateAgreement = async () => {
    if (!selectedTemplate?.id || !selectedResidentId) {
      showToast('Please select both an agreement template and an active resident');
      return;
    }
    setIsGenerating(true);
    try {
      const res = await ownerApi.generateAgreementText(selectedTemplate.id, selectedResidentId);
      setGeneratedAgreement(res.data.interpolatedAgreement);
      showToast('Agreement generated with real resident details!');
    } catch (err: any) {
      showToast(err.message || 'Failed to generate agreement');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedAgreement) {
      navigator.clipboard.writeText(generatedAgreement);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast('Agreement text copied to clipboard!');
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

  const kycColumns: Column<any>[] = [
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
              onClick={() => handleOpenPreview(d)}
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
            Documents & Statutory Compliance
          </h1>
          <p className="text-xs text-[#68736D] mt-0.5">
            Manage resident KYC identity verifications, co-living legal agreements, and building safety NOCs for {activeProperty?.name || 'your property'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'compliance' && (
            <Button
              variant="primary"
              size="sm"
              className="bg-[#0B4036] text-white"
              onClick={() => setComplianceModalOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Register Certificate
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (activeTab === 'kyc') fetchDocuments();
              if (activeTab === 'compliance') fetchCompliance();
              if (activeTab === 'templates') fetchTemplates();
            }}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#DDE2DD] dark:border-slate-800 space-x-6">
        <button
          onClick={() => setActiveTab('kyc')}
          className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'kyc'
              ? 'border-[#0B4036] text-[#0B4036] dark:border-[#C8A45D] dark:text-[#C8A45D]'
              : 'border-transparent text-[#68736D] hover:text-[#18231F]'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Resident KYC Vault
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0.2">
            {documents.length}
          </Badge>
        </button>

        <button
          onClick={() => setActiveTab('compliance')}
          className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'compliance'
              ? 'border-[#0B4036] text-[#0B4036] dark:border-[#C8A45D] dark:text-[#C8A45D]'
              : 'border-transparent text-[#68736D] hover:text-[#18231F]'
          }`}
        >
          <Award className="w-4 h-4" />
          Statutory & Safety Compliance
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0.2">
            {complianceRecords.length}
          </Badge>
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'templates'
              ? 'border-[#0B4036] text-[#0B4036] dark:border-[#C8A45D] dark:text-[#C8A45D]'
              : 'border-transparent text-[#68736D] hover:text-[#18231F]'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          Agreement Templates & Generator
        </button>
      </div>

      {/* TAB 1: Resident KYC */}
      {activeTab === 'kyc' && (
        <div className="space-y-4">
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

          <Card className="p-0 border-[#DDE2DD] overflow-hidden">
            <Table
              columns={kycColumns}
              data={filteredDocs}
              keyExtractor={(d) => d.id || String(Math.random())}
              isLoading={isLoading}
              emptyMessage="No KYC documents found matching your filter criteria."
            />
          </Card>
        </div>
      )}

      {/* TAB 2: Statutory Compliance */}
      {activeTab === 'compliance' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4 border-[#DDE2DD] bg-emerald-50/40 border-emerald-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium text-emerald-800 uppercase tracking-wider">Active Certificates</p>
                  <p className="text-xl font-bold text-emerald-950 mt-1">
                    {complianceRecords.filter((r) => r.status === 'ACTIVE').length}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-700">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card className="p-4 border-[#DDE2DD] bg-amber-50/40 border-amber-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium text-amber-800 uppercase tracking-wider">Expiring Soon (60d)</p>
                  <p className="text-xl font-bold text-amber-950 mt-1">
                    {complianceRecords.filter((r) => r.status === 'EXPIRING_SOON').length}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-700">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card className="p-4 border-[#DDE2DD] bg-rose-50/40 border-rose-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium text-rose-800 uppercase tracking-wider">Expired / Due</p>
                  <p className="text-xl font-bold text-rose-950 mt-1">
                    {complianceRecords.filter((r) => r.status === 'EXPIRED').length}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-700">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
            </Card>

            <Card className="p-4 border-[#DDE2DD] bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium text-slate-700 uppercase tracking-wider">Statutory Categories</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">
                    {new Set(complianceRecords.map((r) => r.category)).size}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-200 text-slate-700">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-0 border-[#DDE2DD] overflow-hidden">
            <div className="p-4 border-b border-[#DDE2DD] bg-[#F8F7F3] flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-[#18231F]">Mandatory Statutory & Safety Checklist</h3>
                <p className="text-[11px] text-[#68736D]">Local municipal regulations, fire safety audits, lift certifications, and health clearances</p>
              </div>
              <Button
                size="sm"
                variant="primary"
                className="bg-[#0B4036] text-white"
                onClick={() => setComplianceModalOpen(true)}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Add Compliance Record
              </Button>
            </div>

            <div className="divide-y divide-[#DDE2DD]">
              {complianceLoading ? (
                <div className="p-8 text-center text-xs text-[#8A928D]">Loading compliance checklist...</div>
              ) : complianceRecords.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#8A928D]">
                  No statutory certificates recorded yet for this property. Click "Register Certificate" to track Fire Safety NOC, Lift Fitness, or Health licenses.
                </div>
              ) : (
                complianceRecords.map((record) => {
                  const daysRemaining = Math.ceil(
                    (new Date(record.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <div key={record.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-[#18231F]">{record.title}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                            {record.category}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              record.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : record.status === 'EXPIRING_SOON'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {record.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#68736D] flex flex-wrap gap-x-4 gap-y-1">
                          <span>Cert #: {record.documentNumber || 'N/A'}</span>
                          <span>Issued by: {record.issuedBy || 'Municipal Authority'}</span>
                          <span>Valid: {new Date(record.issuedDate).toLocaleDateString()} to {new Date(record.validUntil).toLocaleDateString()}</span>
                        </div>
                        {record.notes && (
                          <p className="text-[11px] text-slate-500 italic mt-0.5">{record.notes}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={`text-xs font-bold ${daysRemaining < 0 ? 'text-rose-600' : daysRemaining < 30 ? 'text-amber-600' : 'text-emerald-700'}`}>
                            {daysRemaining < 0 ? `Expired ${Math.abs(daysRemaining)} days ago` : `${daysRemaining} days remaining`}
                          </p>
                          <p className="text-[10px] text-[#8A928D]">Renewal due</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: Agreement Templates & Generator */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Templates list & Resident Selector */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="p-4 border-[#DDE2DD] space-y-4">
              <div>
                <h3 className="font-bold text-sm text-[#18231F] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#0B4036]" />
                  Agreement Templates
                </h3>
                <p className="text-[11px] text-[#68736D]">Choose standard master agreement for student or professional co-living</p>
              </div>

              <div className="space-y-2">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    onClick={() => {
                      setSelectedTemplate(tpl);
                      setGeneratedAgreement(null);
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedTemplate?.id === tpl.id
                        ? 'border-[#0B4036] bg-[#0B4036]/5'
                        : 'border-[#DDE2DD] hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <p className="font-bold text-xs text-[#18231F]">{tpl.name}</p>
                      <Badge variant="secondary" className="text-[10px]">v{tpl.version}</Badge>
                    </div>
                    <p className="text-[11px] text-[#68736D] mt-1 line-clamp-1">{tpl.type}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(tpl.variables || []).slice(0, 4).map((v: string) => (
                        <span key={v} className="text-[9px] bg-slate-100 font-mono px-1.5 py-0.5 rounded text-slate-600">
                          {`{{${v}}}`}
                        </span>
                      ))}
                      {(tpl.variables || []).length > 4 && (
                        <span className="text-[9px] text-[#8A928D]">+{tpl.variables.length - 4} more</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4 border-[#DDE2DD] space-y-4">
              <div>
                <h3 className="font-bold text-sm text-[#18231F] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#C8A45D]" />
                  Instant Agreement Generator
                </h3>
                <p className="text-[11px] text-[#68736D]">Interpolate tenant and room terms into a legally formatted draft</p>
              </div>

              <div className="space-y-3">
                <Select
                  label="Select Active Resident"
                  value={selectedResidentId}
                  onChange={(e) => setSelectedResidentId(e.target.value)}
                  options={[
                    { value: '', label: '-- Select Active Resident --' },
                    ...residents.map((r) => ({
                      value: r.id,
                      label: `${r.fullName || r.user?.name || 'Resident'} (Room ${r.bed?.room?.number || 'N/A'}, Rent: ₹${r.monthlyRent || '0'})`,
                    })),
                  ]}
                />

                <Button
                  variant="primary"
                  className="w-full bg-[#0B4036] text-white flex items-center justify-center gap-2"
                  onClick={handleGenerateAgreement}
                  isLoading={isGenerating}
                  disabled={!selectedResidentId || !selectedTemplate}
                >
                  <Sparkles className="w-4 h-4 text-[#C8A45D]" />
                  Generate Customized Agreement
                </Button>
              </div>
            </Card>
          </div>

          {/* Preview & Output */}
          <div className="lg:col-span-7">
            <Card className="p-5 border-[#DDE2DD] space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-[#DDE2DD]">
                <div>
                  <h3 className="font-bold text-sm text-[#18231F]">
                    {generatedAgreement ? 'Generated Agreement Preview' : 'Template Content Preview'}
                  </h3>
                  <p className="text-[11px] text-[#68736D]">
                    {generatedAgreement
                      ? 'Live interpolated legal agreement ready to print or share with tenant'
                      : 'Raw template showing dynamic tags'}
                  </p>
                </div>
                {generatedAgreement && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyToClipboard}
                    leftIcon={copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  >
                    {copied ? 'Copied!' : 'Copy Text'}
                  </Button>
                )}
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-h-[500px] overflow-y-auto">
                <pre className="text-xs text-slate-800 dark:text-slate-200 font-sans whitespace-pre-wrap leading-relaxed">
                  {generatedAgreement || selectedTemplate?.content || 'Select a template on the left to preview.'}
                </pre>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 text-[11px] text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Legal Disclaimer:</strong> Generated agreements constitute an administrative draft based on registered tenancy terms. For statutory validity, execute via physical notarization or an authorized legal e-signature partner.
                </span>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* KYC Rejection Modal */}
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

      {/* KYC Document Preview Modal */}
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
              {previewSignedUrl?.endsWith('.pdf') || previewDoc.fileUrl?.endsWith('.pdf') ? (
                <iframe src={previewSignedUrl || `/api/owner/documents/${previewDoc.id}/file`} title={previewDoc.title} className="w-full h-96 rounded-lg" />
              ) : (
                <img
                  src={previewSignedUrl || `/api/owner/documents/${previewDoc.id}/file`}
                  alt={previewDoc.title}
                  className="max-h-96 object-contain rounded-lg shadow-sm"
                  onError={(e: any) => {
                    e.target.src = 'https://placehold.co/600x400/0B4036/FFFFFF?text=Document+Secured+in+Storage';
                  }}
                />
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-[#DDE2DD]">
              <span className="text-[11px] text-[#8A928D]">Protected KYC Record</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-[#0B4036] text-white flex items-center gap-1.5 hover:bg-[#08332c]"
                  onClick={() => {
                    if (previewSignedUrl && (previewSignedUrl.startsWith('http://') || previewSignedUrl.startsWith('https://'))) {
                      window.open(previewSignedUrl, '_blank');
                    } else {
                      window.open(`/api/owner/documents/${previewDoc.id}/file`, '_blank');
                    }
                  }}
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                >
                  Open / Download Original
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setPreviewDoc(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Compliance Registration Modal */}
      <Modal
        isOpen={complianceModalOpen}
        onClose={() => setComplianceModalOpen(false)}
        title="Register Statutory Compliance Certificate"
        maxWidth="md"
      >
        <form onSubmit={handleSaveCompliance} className="space-y-3">
          <Select
            label="Compliance Category"
            value={newCompliance.category}
            onChange={(e) => setNewCompliance({ ...newCompliance, category: e.target.value })}
            options={[
              { value: 'FIRE_SAFETY', label: 'Fire Safety NOC & Extinguisher Audit' },
              { value: 'LIFT_FITNESS', label: 'Elevator / Lift Fitness Certification' },
              { value: 'PEST_CONTROL', label: 'Pest Control & Sanitization Clearance' },
              { value: 'HEALTH_FOOD', label: 'Food Safety / FSSAI Kitchen License' },
              { value: 'MUNICIPAL_TRADE', label: 'Municipal Trade License' },
              { value: 'POLICE_INTIMATION', label: 'Local Police Intimation Compliance' },
              { value: 'OTHER', label: 'Other Statutory Compliance' },
            ]}
          />

          <Input
            label="Certificate / Audit Title"
            required
            placeholder="e.g., Annual Fire Audit Clearance Certificate 2026"
            value={newCompliance.title}
            onChange={(e) => setNewCompliance({ ...newCompliance, title: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Certificate / Reg Number"
              placeholder="e.g., FS-NOC-2026-981"
              value={newCompliance.documentNumber}
              onChange={(e) => setNewCompliance({ ...newCompliance, documentNumber: e.target.value })}
            />
            <Input
              label="Issuing Authority / Agency"
              placeholder="e.g., City Fire Brigade"
              value={newCompliance.issuedBy}
              onChange={(e) => setNewCompliance({ ...newCompliance, issuedBy: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Issued Date"
              type="date"
              required
              value={newCompliance.issuedDate}
              onChange={(e) => setNewCompliance({ ...newCompliance, issuedDate: e.target.value })}
            />
            <Input
              label="Valid Until (Expiry Date)"
              type="date"
              required
              value={newCompliance.validUntil}
              onChange={(e) => setNewCompliance({ ...newCompliance, validUntil: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#18231F] mb-1">Audit Notes / Conditions</label>
            <textarea
              rows={2}
              placeholder="Optional remarks, inspection conditions or renewal notes..."
              value={newCompliance.notes}
              onChange={(e) => setNewCompliance({ ...newCompliance, notes: e.target.value })}
              className="w-full p-2.5 text-xs rounded-xl border border-[#DDE2DD] bg-white text-[#18231F] focus:outline-none focus:ring-1 focus:ring-[#0B4036]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#DDE2DD]">
            <Button variant="secondary" size="sm" type="button" onClick={() => setComplianceModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" className="bg-[#0B4036] text-white">
              Save Certificate
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default OwnerDocumentsPage;
