import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  ShieldCheck,
  Plus,
  UploadCloud,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  File,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { Input, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { residentApi } from '../../services/residentApi';
import { toast, useToast } from '../../context/ToastContext';

export const ResidentDocumentsPage: React.FC = () => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload modal
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('AADHAAR');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchDocuments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await residentApi.getDocuments();
      setDocuments(data || []);
    } catch (err: any) {
      console.error('Failed to load documents:', err.message);
      setError(err.message || 'Failed to fetch authorized documents.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please choose a file to upload.');
      return;
    }

    if (!docTitle.trim()) {
      toast.error('Please enter document title.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', docTitle.trim());
    formData.append('type', docType);

    setIsUploading(true);
    try {
      const createdDoc = await residentApi.uploadDocument(formData);
      setDocuments([createdDoc, ...documents]);
      setUploadModalOpen(false);
      setDocTitle('');
      setSelectedFile(null);
      toast.success('Document uploaded successfully.');
      await fetchDocuments();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed. Please verify file type and size.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (docId: string, title: string) => {
    try {
      const result = await residentApi.downloadDocument(docId);
      if (result.downloadUrl) {
        window.open(result.downloadUrl, '_blank');
      } else {
        toast.error('Download link currently unavailable.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to retrieve document download link.');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-60 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
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
            KYC & Document Vault
          </h1>
          <p className="text-xs text-slate-500">
            Securely upload, store, and access verified KYC proofs and signed lease agreements
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={fetchDocuments} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setUploadModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Upload Document
          </Button>
        </div>
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3 max-w-md mx-auto">
          <FileText className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No Documents Uploaded</h3>
          <p className="text-xs text-slate-500">
            Upload your government ID (Aadhaar/PAN/Passport) to complete KYC verification.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setUploadModalOpen(true)}
            leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
          >
            Upload KYC Proof
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {documents.map((doc) => {
            const isVerified = doc.status === 'VERIFIED';
            const isPending = doc.status === 'PENDING';

            return (
              <Card key={doc.id} className="p-5 flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-2xl bg-brand-surface dark:bg-brand-surface-dark text-brand-forest dark:text-brand-gold border border-brand-border dark:border-brand-border-dark">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-900 dark:text-white text-sm">{doc.title}</p>
                      <p className="text-[11px] text-slate-500">
                        Type: {doc.type} • Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                      </p>
                      {doc.fileSize && (
                        <p className="text-[10px] text-slate-400">
                          Size: {(doc.fileSize / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      )}
                    </div>
                  </div>

                  <StatusBadge status={doc.status} />
                </div>

                {doc.rejectionReason && (
                  <p className="text-[11px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-2 rounded-lg">
                    Rejection note: {doc.rejectionReason}
                  </p>
                )}

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    {isVerified ? 'Verified by PG Admin' : 'Under Review'}
                  </span>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => handleDownload(doc.id, doc.title)}
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                  >
                    View / Download
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload Document Modal */}
      <Modal isOpen={uploadModalOpen} onClose={() => setUploadModalOpen(false)} title="Upload Document for KYC">
        <form onSubmit={handleUpload} className="space-y-4 pt-2">
          <Input
            label="Document Title"
            placeholder="e.g. Aadhaar Card (Front & Back)"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            required
          />

          <Select
            label="Document Category"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            options={[
              { label: 'Aadhaar Card', value: 'AADHAAR' },
              { label: 'PAN Card', value: 'PAN' },
              { label: 'Signed Lease Agreement', value: 'AGREEMENT' },
              { label: 'Police Verification Form', value: 'POLICE_VERIFICATION' },
              { label: 'Other ID / Address Proof', value: 'OTHER' },
            ]}
          />

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-900 dark:text-white">Select File (PDF, PNG, JPG - Max 10MB)</label>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setSelectedFile(e.target.files[0]);
                }
              }}
              className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-surface file:text-brand-forest hover:file:bg-brand-forest/15 dark:file:bg-brand-surface-dark dark:file:text-brand-gold"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" size="sm" type="button" onClick={() => setUploadModalOpen(false)} disabled={isUploading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={isUploading}
            >
              Upload Securely
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
