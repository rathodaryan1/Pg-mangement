import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  User,
  Clock,
  AlertTriangle,
  MessageSquare
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/Badge';
import ownerApi from '../../services/ownerApi';

export const OwnerLeavePage: React.FC = () => {
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchLeaves = async () => {
    setIsLoading(true);
    try {
      const res = await ownerApi.getLeaveRequests();
      setLeaveRequests(res.data || []);
    } catch (err: any) {
      console.error('Failed to fetch leave requests:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await ownerApi.approveLeave(id);
      setToastMessage('Leave request approved successfully!');
      setTimeout(() => setToastMessage(null), 3500);
      fetchLeaves();
    } catch (err: any) {
      alert(err.message || 'Failed to approve leave');
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeave) return;
    try {
      await ownerApi.rejectLeave(selectedLeave.id, rejectionReason || 'Operational scheduling constraint');
      setRejectModalOpen(false);
      setSelectedLeave(null);
      setRejectionReason('');
      setToastMessage('Leave request rejected and resident notified.');
      setTimeout(() => setToastMessage(null), 3500);
      fetchLeaves();
    } catch (err: any) {
      alert(err.message || 'Failed to reject leave');
    }
  };

  const filteredLeaves = leaveRequests.filter((l) => {
    const matchesSearch =
      (l.residentName && l.residentName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (l.reason && l.reason.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (l.roomNumber && l.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Resident Leave & Absence Desk
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Review night-out requests, long leaves, and gate pass clearances
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <Card className="p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="w-full md:w-80">
          <Input
            placeholder="Search resident, room, reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </Card>

      {/* Leave Requests Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Resident</th>
                <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Leave Duration</th>
                <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Purpose / Reason</th>
                <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Applied On</th>
                <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Status</th>
                <th className="p-4 font-bold text-slate-600 dark:text-slate-300 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredLeaves.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No leave requests found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredLeaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white">{leave.residentName}</div>
                      <div className="text-[10px] text-slate-400">Room {leave.roomNumber || '101'}</div>
                    </td>
                    <td className="p-4 font-medium text-slate-800 dark:text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        <span>{leave.fromDate} → {leave.toDate}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {leave.reason}
                    </td>
                    <td className="p-4 text-slate-400">
                      {leave.appliedAt || 'Recent'}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={leave.status} />
                    </td>
                    <td className="p-4 text-right">
                      {leave.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            className="text-[11px] py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleApprove(leave.id)}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            className="text-[11px] py-1 px-2.5"
                            onClick={() => {
                              setSelectedLeave(leave);
                              setRejectionReason('');
                              setRejectModalOpen(true);
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Settled</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Rejection Modal with Mandatory Reason */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Resident Leave Request"
      >
        <form onSubmit={handleReject} className="space-y-4">
          <p className="text-xs text-slate-500">
            Provide a clear operational reason for declining <strong>{selectedLeave?.residentName}'s</strong> leave request. The resident will receive an immediate notification.
          </p>
          <Input
            label="Rejection Reason"
            placeholder="e.g. Mandatory attendance inspection / curfew constraint"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            required
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" type="submit">
              Confirm Rejection
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default OwnerLeavePage;
