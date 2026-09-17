import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Plus,
  Clock,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { Input, Textarea } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { residentApi } from '../../services/residentApi';

export const ResidentLeavePage: React.FC = () => {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');

  const fetchLeaves = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await residentApi.getLeaveRequests();
      setLeaves(data || []);
    } catch (err: any) {
      console.error('Failed to load leave requests:', err.message);
      setError(err.message || 'Failed to load leave records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromDate || !toDate || !reason.trim()) {
      alert('Please fill out all fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newLeave = await residentApi.createLeaveRequest({
        fromDate,
        toDate,
        reason: reason.trim(),
      });

      setLeaves([newLeave, ...leaves]);
      setModalOpen(false);
      setFromDate('');
      setToDate('');
      setReason('');
      await fetchLeaves();
    } catch (err: any) {
      alert(err.message || 'Failed to submit leave request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelLeave = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this leave application?')) return;
    try {
      await residentApi.cancelLeaveRequest(id);
      await fetchLeaves();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel leave request.');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-60 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
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
            Outstation Leave Applications
          </h1>
          <p className="text-xs text-slate-500">
            Apply for temporary out-of-station leave (home visits, vacations) for warden and security gate tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={fetchLeaves} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Apply Leave
          </Button>
        </div>
      </div>

      {/* Leave List */}
      {leaves.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3 max-w-md mx-auto">
          <CalendarDays className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No Leave Requests</h3>
          <p className="text-xs text-slate-500">
            You haven't submitted any out-of-station leave applications yet.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Apply First Leave
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {leaves.map((l) => {
            const isPending = l.status === 'PENDING';
            return (
              <Card key={l.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900 dark:text-white text-sm">{l.reason}</p>
                    <StatusBadge status={l.status} />
                  </div>
                  <p className="text-slate-500 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-brand-forest dark:text-brand-gold" />
                    <strong>Duration:</strong> {new Date(l.fromDate).toLocaleDateString()} to {new Date(l.toDate).toLocaleDateString()}
                    <span className="text-[10px] text-slate-400">
                      • Applied on {new Date(l.appliedAt).toLocaleDateString()}
                    </span>
                  </p>
                  {l.approvedBy && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      Approved by {l.approvedBy}
                    </p>
                  )}
                </div>

                {isPending && (
                  <Button
                    variant="secondary"
                    size="xs"
                    className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 self-start sm:self-center"
                    onClick={() => handleCancelLeave(l.id)}
                  >
                    Cancel Application
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Apply Leave Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Apply for Leave">
        <form onSubmit={handleApplyLeave} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Departure (From Date)"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              required
            />
            <Input
              label="Return (To Date)"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              required
            />
          </div>

          <Textarea
            label="Reason for Outstation Leave"
            rows={3}
            placeholder="e.g. Visiting hometown for festival, business travel..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" size="sm" type="button" onClick={() => setModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={isSubmitting}
            >
              Submit Application
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
