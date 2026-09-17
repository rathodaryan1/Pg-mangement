import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Plus,
  QrCode,
  Clock,
  ShieldCheck,
  Calendar,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { Input, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { QRPassCard } from '../../components/ui/QRPassCard';
import { residentApi } from '../../services/residentApi';

export const ResidentVisitorsPage: React.FC = () => {
  const [visitors, setVisitors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals & UI states
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<any | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [visitorName, setVisitorName] = useState('');
  const [visitorMobile, setVisitorMobile] = useState('');
  const [relation, setRelation] = useState('Friend');
  const [purpose, setPurpose] = useState('');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedEntryTime, setExpectedEntryTime] = useState('04:00 PM');
  const [expectedExitTime, setExpectedExitTime] = useState('08:00 PM');

  const fetchVisitors = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await residentApi.getVisitors();
      setVisitors(data || []);
    } catch (err: any) {
      console.error('Failed to load visitors:', err.message);
      setError(err.message || 'Failed to load visitor requests.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitors();
  }, []);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim() || !visitorMobile.trim()) {
      alert('Please provide visitor name and mobile number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newPass = await residentApi.createVisitorRequest({
        visitorName: visitorName.trim(),
        visitorMobile: visitorMobile.trim(),
        relation,
        purpose: purpose.trim(),
        visitDate,
        expectedEntryTime,
        expectedExitTime,
      });

      setVisitors([newPass, ...visitors]);
      setRequestModalOpen(false);

      // Reset form
      setVisitorName('');
      setVisitorMobile('');
      setPurpose('');
    } catch (err: any) {
      console.error('Failed to create visitor request:', err);
      alert(err.message || 'Failed to submit visitor request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async (visitorId: string) => {
    if (!confirm('Are you sure you want to cancel this visitor pass?')) return;
    try {
      await residentApi.cancelVisitorRequest(visitorId);
      await fetchVisitors();
    } catch (err: any) {
      alert(err.message || 'Unable to cancel visitor request.');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-60 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
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
            Visitor Gate Passes
          </h1>
          <p className="text-xs text-slate-500">
            Pre-register guests, manage warden approval, and generate digital QR entry passes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={fetchVisitors} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setRequestModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Request Pass
          </Button>
        </div>
      </div>

      {/* Visitors List */}
      {visitors.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white border border-[#DDE2DD] text-center space-y-3 max-w-md mx-auto">
          <UserCheck className="w-12 h-12 text-[#8A928D] mx-auto" />
          <h3 className="text-base font-bold text-[#18231F]">No Visitor Passes</h3>
          <p className="text-xs text-[#68736D]">
            You have not requested any visitor passes yet. Pre-register your guests for seamless gate entry.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setRequestModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Create First Visitor Pass
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visitors.map((vis) => {
            const isApproved = vis.status === 'APPROVED' || vis.status === 'CHECKED_IN';
            const isPending = vis.status === 'PENDING';

            return (
              <Card key={vis.id} className="p-5 space-y-3.5 border-[#DDE2DD]">
                <div className="flex items-center justify-between border-b border-[#DDE2DD] pb-3">
                  <div>
                    <h4 className="font-bold text-sm text-[#18231F]">{vis.visitorName}</h4>
                    <p className="text-[11px] text-[#68736D]">
                      {vis.relation} • {vis.visitorMobile}
                    </p>
                  </div>
                  <StatusBadge status={vis.status} />
                </div>

                <div className="text-xs space-y-1.5 text-[#68736D]">
                  <p className="flex items-center gap-1.5">
                    <strong className="text-[#18231F]">Purpose:</strong> {vis.purpose || 'Personal'}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#0B4036]" />
                    <strong>Date:</strong> {new Date(vis.visitDate).toLocaleDateString()}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#0B4036]" />
                    <strong>Entry:</strong> {vis.expectedEntryTime}
                    {vis.expectedExitTime && ` • Exit: ${vis.expectedExitTime}`}
                  </p>
                  {vis.approvedBy && (
                    <p className="text-[11px] text-[#0B4036] font-semibold">
                      Approved by {vis.approvedBy}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-[#DDE2DD] flex items-center justify-between gap-2">
                  {isApproved && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-[#0B4036] border-[#DDE2DD] bg-white hover:bg-[#EAF2EE]"
                      onClick={() => {
                        setSelectedVisitor(vis);
                        setQrModalOpen(true);
                      }}
                      leftIcon={<QrCode className="w-4 h-4 text-[#0B4036]" />}
                    >
                      View Digital QR Gate Pass
                    </Button>
                  )}

                  {isPending && (
                    <div className="w-full flex items-center justify-between">
                      <span className="text-[11px] text-amber-700 font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Awaiting Warden Approval
                      </span>
                      <Button
                        variant="secondary"
                        size="xs"
                        className="text-rose-600 hover:bg-rose-50 border-none"
                        onClick={() => handleCancelRequest(vis.id)}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}

                  {vis.status === 'CANCELLED' && (
                    <span className="text-[11px] text-[#8A928D]">Pass cancelled</span>
                  )}
                  {vis.status === 'CHECKED_OUT' && (
                    <span className="text-[11px] text-[#8A928D]">Visit completed & checked out</span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* New Visitor Pass Request Modal */}
      <Modal isOpen={requestModalOpen} onClose={() => setRequestModalOpen(false)} title="New Visitor Pass Request">
        <form onSubmit={handleCreateRequest} className="space-y-4 pt-2">
          <Input
            label="Visitor Full Name"
            placeholder="e.g. Rahul Sharma"
            value={visitorName}
            onChange={(e) => setVisitorName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Visitor Mobile Number"
              placeholder="e.g. +91 98765 43210"
              value={visitorMobile}
              onChange={(e) => setVisitorMobile(e.target.value)}
              required
            />

            <Select
              label="Relationship"
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
              options={[
                { label: 'Friend', value: 'Friend' },
                { label: 'Parent / Family', value: 'Parent' },
                { label: 'Colleague', value: 'Colleague' },
                { label: 'Sibling', value: 'Sibling' },
                { label: 'Other', value: 'Other' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Visit Date"
              type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              required
            />
            <Input
              label="Expected Entry"
              type="text"
              placeholder="04:00 PM"
              value={expectedEntryTime}
              onChange={(e) => setExpectedEntryTime(e.target.value)}
            />
            <Input
              label="Expected Exit"
              type="text"
              placeholder="08:00 PM"
              value={expectedExitTime}
              onChange={(e) => setExpectedExitTime(e.target.value)}
            />
          </div>

          <Input
            label="Purpose of Visit"
            placeholder="e.g. Weekend study session, festival visit"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" size="sm" type="button" onClick={() => setRequestModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
              Submit for Approval
            </Button>
          </div>
        </form>
      </Modal>

      {/* QR Pass Card Modal */}
      {selectedVisitor && (
        <Modal isOpen={qrModalOpen} onClose={() => setQrModalOpen(false)} maxWidth="sm">
          <QRPassCard visitor={selectedVisitor} />
        </Modal>
      )}
    </div>
  );
};
