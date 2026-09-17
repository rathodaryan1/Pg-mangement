import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Timeline } from '../../components/ui/Timeline';
import { residentApi } from '../../services/residentApi';

export const ResidentComplaintsPage: React.FC = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals & UI states
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('PLUMBING');
  const [priority, setPriority] = useState('MEDIUM');
  const [description, setDescription] = useState('');

  // Comment state
  const [commentText, setCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  const fetchTickets = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await residentApi.getComplaints();
      setTickets(data || []);
      if (selectedTicket) {
        const updated = data.find((t: any) => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    } catch (err: any) {
      console.error('Failed to fetch complaints:', err.message);
      setError(err.message || 'Failed to load maintenance tickets.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert('Please fill in both title and description.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newTkt = await residentApi.createComplaint({
        title: title.trim(),
        category,
        priority,
        description: description.trim(),
      });

      setTickets([newTkt, ...tickets]);
      setNewModalOpen(false);
      setTitle('');
      setDescription('');
      await fetchTickets();
    } catch (err: any) {
      console.error('Failed to submit ticket:', err);
      alert(err.message || 'Failed to submit complaint.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !commentText.trim()) return;

    setIsPostingComment(true);
    try {
      await residentApi.addComplaintComment(selectedTicket.id, commentText.trim());
      setCommentText('');
      await fetchTickets();
      const updated = await residentApi.getComplaintById(selectedTicket.id);
      setSelectedTicket(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to add comment.');
    } finally {
      setIsPostingComment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-60 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
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
            Maintenance Tickets & Complaints
          </h1>
          <p className="text-xs text-slate-500">
            Report room maintenance issues (AC, plumbing, electrical) and track staff resolution timeline
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={fetchTickets} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setNewModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Raise New Ticket
          </Button>
        </div>
      </div>

      {/* Tickets List */}
      {tickets.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3 max-w-md mx-auto">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No Complaints Reported</h3>
          <p className="text-xs text-slate-500">
            You do not have any active or previous maintenance tickets. Everything looks clean and operational!
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setNewModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Raise First Ticket
          </Button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {tickets.map((tkt) => (
            <Card
              key={tkt.id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-brand-forest dark:hover:border-brand-gold transition-all"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-brand-forest dark:text-brand-gold bg-brand-surface dark:bg-brand-surface-dark border border-brand-border dark:border-brand-border-dark px-2 py-0.5 rounded-md">
                    {tkt.ticketNumber}
                  </span>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{tkt.title}</h4>
                  <StatusBadge status={tkt.status} />
                  <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {tkt.priority} Priority
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{tkt.description}</p>
                <p className="text-[11px] text-slate-400">
                  Category: {tkt.category} • Created: {new Date(tkt.createdAt).toLocaleString()}
                  {tkt.assignedStaff && ` • Assigned to: ${tkt.assignedStaff}`}
                </p>
              </div>

              <div className="shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedTicket(tkt);
                    setDetailModalOpen(true);
                  }}
                  className="text-brand-forest dark:text-brand-gold border-brand-border dark:border-brand-border-dark hover:bg-brand-surface"
                >
                  Track Live Timeline
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* New Complaint Modal */}
      <Modal isOpen={newModalOpen} onClose={() => setNewModalOpen(false)} title="Report Maintenance Issue">
        <form onSubmit={handleCreateTicket} className="space-y-4 pt-2">
          <Input
            label="Issue Title"
            placeholder="e.g. AC unit stops cooling after 15 mins"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={[
                { label: 'Plumbing / Washroom', value: 'PLUMBING' },
                { label: 'Electrical / Lights / Power', value: 'ELECTRICAL' },
                { label: 'Air Conditioning (AC)', value: 'AIR_CONDITIONING' },
                { label: 'Wi-Fi / Internet', value: 'WIFI_INTERNET' },
                { label: 'Room Housekeeping / Cleaning', value: 'CLEANING' },
                { label: 'Carpentry / Furniture', value: 'CARPENTRY' },
                { label: 'Pest Control', value: 'PEST_CONTROL' },
                { label: 'Other', value: 'OTHER' },
              ]}
            />

            <Select
              label="Priority Level"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              options={[
                { label: 'Low Priority', value: 'LOW' },
                { label: 'Medium Priority', value: 'MEDIUM' },
                { label: 'High Priority', value: 'HIGH' },
                { label: 'Urgent (Immediate Attention)', value: 'URGENT' },
              ]}
            />
          </div>

          <Textarea
            label="Detailed Description of the Problem"
            rows={3}
            placeholder="Describe the issue in detail to help our maintenance staff bring required parts..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="secondary" size="sm" type="button" onClick={() => setNewModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={isSubmitting}
            >
              Submit Ticket
            </Button>
          </div>
        </form>
      </Modal>

      {/* Ticket Details & Timeline Modal */}
      {selectedTicket && (
        <Modal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title={`Ticket Timeline: ${selectedTicket.ticketNumber}`}
          maxWidth="lg"
        >
          <div className="space-y-5 p-1">
            {/* Overview Box */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{selectedTicket.title}</h4>
                <StatusBadge status={selectedTicket.status} />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">{selectedTicket.description}</p>
              <div className="text-[11px] text-slate-500 pt-1 flex flex-wrap gap-4 border-t border-slate-200 dark:border-slate-800">
                <span><strong>Category:</strong> {selectedTicket.category}</span>
                <span><strong>Priority:</strong> {selectedTicket.priority}</span>
                {selectedTicket.assignedStaff && <span><strong>Staff:</strong> {selectedTicket.assignedStaff}</span>}
              </div>
            </div>

            {/* Resolution Timeline */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Staff Activity Timeline
              </h5>
              <Timeline
                items={
                  selectedTicket.activities?.map((a: any) => ({
                    id: a.id,
                    title: `Status: ${a.status}`,
                    actor: a.updatedBy,
                    timestamp: new Date(a.timestamp).toLocaleString(),
                    comment: a.comment,
                    status: a.status,
                  })) || []
                }
              />
            </div>

            {/* Add Resident Comment Form */}
            <form onSubmit={handleAddComment} className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-brand-forest dark:text-brand-gold" />
                Add Message / Comment
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type an update or reply to technician..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-brand-forest"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="shrink-0"
                  isLoading={isPostingComment}
                  leftIcon={<Send className="w-3.5 h-3.5" />}
                >
                  Send
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
};
