import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Mail,
  Plus,
  Search,
  Filter,
  AlertCircle,
  ChevronRight,
  User,
  Building,
  Calendar,
  Send,
  Loader2,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

interface SupportTicket {
  id: string;
  tenantId?: string | null;
  tenant?: { id: string; name: string; slug: string; email: string };
  creatorEmail: string;
  creatorName?: string;
  subject: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_CUSTOMER' | 'RESOLVED' | 'CLOSED';
  assignedAdmin?: string | null;
  internalNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const SuperAdminSupportPage: React.FC = () => {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // New ticket state
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    priority: 'MEDIUM',
    creatorEmail: '',
    creatorName: '',
  });

  // Edit ticket state
  const [editStatus, setEditStatus] = useState<string>('OPEN');
  const [editPriority, setEditPriority] = useState<string>('MEDIUM');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editAssigned, setEditAssigned] = useState<string>('');

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (priorityFilter !== 'ALL') params.append('priority', priorityFilter);

      const res = await api.get<{ tickets: SupportTicket[]; pagination: any }>(`/super-admin/support?${params.toString()}`);
      if (res.success && res.data) {
        setTickets(res.data.tickets || []);
      }
    } catch (err: any) {
      toast.error('Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTickets();
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.subject || !newTicket.description) {
      toast.error('Subject and description are required');
      return;
    }

    try {
      setSaving(true);
      const res = await api.post('/super-admin/support', newTicket);
      if (res.success) {
        toast.success('Support ticket created successfully');
        setIsCreateOpen(false);
        setNewTicket({ subject: '', description: '', priority: 'MEDIUM', creatorEmail: '', creatorName: '' });
        fetchTickets();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to create ticket');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    try {
      setSaving(true);
      const res = await api.patch(`/super-admin/support/${selectedTicket.id}`, {
        status: editStatus,
        priority: editPriority,
        internalNotes: editNotes,
        assignedAdmin: editAssigned,
      });

      if (res.success) {
        toast.success('Ticket updated successfully');
        setIsDetailOpen(false);
        fetchTickets();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update ticket');
    } finally {
      setSaving(false);
    }
  };

  const openTicketDetail = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setEditStatus(ticket.status);
    setEditPriority(ticket.priority);
    setEditNotes(ticket.internalNotes || '');
    setEditAssigned(ticket.assignedAdmin || '');
    setIsDetailOpen(true);
  };

  const totalCount = tickets.length;
  const openCount = tickets.filter((t) => t.status === 'OPEN').length;
  const inProgressCount = tickets.filter((t) => t.status === 'IN_PROGRESS').length;
  const resolvedCount = tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length;

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'URGENT':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'HIGH':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'MEDIUM':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'OPEN':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'IN_PROGRESS':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'WAITING_FOR_CUSTOMER':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'RESOLVED':
      case 'CLOSED':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#18231F] flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-[#0B4036]" />
            Tenant Support & Help Desk
          </h1>
          <p className="text-xs text-[#68736D] mt-0.5">
            Manage escalations, technical inquiries, and onboarding support requests across PG tenants
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Create Support Ticket
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-[#DDE2DD] bg-white">
          <p className="text-xs font-semibold text-[#68736D]">Total Inquiries</p>
          <p className="text-2xl font-bold text-[#18231F] mt-1">{totalCount}</p>
        </Card>
        <Card className="p-4 border-[#DDE2DD] bg-white">
          <p className="text-xs font-semibold text-emerald-600">Open Tickets</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{openCount}</p>
        </Card>
        <Card className="p-4 border-[#DDE2DD] bg-white">
          <p className="text-xs font-semibold text-blue-600">In Progress</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{inProgressCount}</p>
        </Card>
        <Card className="p-4 border-[#DDE2DD] bg-white">
          <p className="text-xs font-semibold text-[#68736D]">Resolved</p>
          <p className="text-2xl font-bold text-[#18231F] mt-1">{resolvedCount}</p>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card className="p-4 border-[#DDE2DD]">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#68736D]" />
            <input
              type="text"
              placeholder="Search by subject, description, or requester email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-[#DDE2DD] rounded-md text-xs focus:outline-none focus:border-[#0B4036]"
            />
          </form>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-[#DDE2DD] rounded-md px-3 py-2 bg-white text-[#18231F] focus:outline-none focus:border-[#0B4036]"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_FOR_CUSTOMER">Waiting for Customer</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs border border-[#DDE2DD] rounded-md px-3 py-2 bg-white text-[#18231F] focus:outline-none focus:border-[#0B4036]"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Tickets Table */}
      <Card className="border-[#DDE2DD] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#68736D] flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#0B4036]" />
            Loading support tickets from database...
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-[#0B4036] mx-auto" />
            <h3 className="text-sm font-bold text-[#18231F]">No Support Tickets Found</h3>
            <p className="text-xs text-[#68736D] max-w-sm mx-auto">
              All PG tenant inquiries have been addressed or no tickets match the current filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#FCFBF8] border-b border-[#DDE2DD] text-[#68736D] font-semibold">
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Organization / Requester</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE2DD]">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-[#F9FAF9] transition-colors">
                    <td className="py-3 px-4 font-medium text-[#18231F]">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-[#0B4036] shrink-0" />
                        <div>
                          <p className="font-semibold">{t.subject}</p>
                          <p className="text-[10px] text-[#68736D] line-clamp-1">{t.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-[#18231F]">{t.tenant?.name || 'Platform System'}</p>
                      <p className="text-[10px] text-[#68736D]">{t.creatorEmail}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getPriorityBadge(t.priority)}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadge(t.status)}`}>
                        {t.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#68736D]">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => openTicketDetail(t)}>
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create Ticket Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Support Ticket">
        <form onSubmit={handleCreateTicket} className="space-y-4">
          <Input
            label="Ticket Subject"
            placeholder="e.g. Supabase Storage KYC upload latency inquiry"
            value={newTicket.subject}
            onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
            required
          />
          <div>
            <label className="block text-xs font-semibold text-[#18231F] mb-1">Detailed Description</label>
            <textarea
              rows={4}
              placeholder="Provide context regarding the issue, affected PG organization, or required administrative assistance..."
              value={newTicket.description}
              onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
              className="w-full p-2.5 text-xs border border-[#DDE2DD] rounded-md focus:outline-none focus:border-[#0B4036]"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Requester Email"
              type="email"
              placeholder="owner@example.com"
              value={newTicket.creatorEmail}
              onChange={(e) => setNewTicket({ ...newTicket, creatorEmail: e.target.value })}
            />
            <div>
              <label className="block text-xs font-semibold text-[#18231F] mb-1">Priority</label>
              <select
                value={newTicket.priority}
                onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value as any })}
                className="w-full p-2 text-xs border border-[#DDE2DD] rounded-md bg-white focus:outline-none focus:border-[#0B4036]"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={saving}>
              {saving ? 'Creating...' : 'Create Ticket'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Manage Ticket Modal */}
      {selectedTicket && (
        <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title={`Manage Ticket: ${selectedTicket.subject}`}>
          <form onSubmit={handleUpdateTicket} className="space-y-4">
            <div className="p-3 bg-[#FCFBF8] border border-[#DDE2DD] rounded-md space-y-1 text-xs">
              <p className="font-semibold text-[#18231F]">Requester: {selectedTicket.creatorEmail}</p>
              <p className="text-[#68736D]">Organization: {selectedTicket.tenant?.name || 'Platform Level'}</p>
              <p className="text-[#18231F] mt-2 whitespace-pre-wrap">{selectedTicket.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#18231F] mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full p-2 text-xs border border-[#DDE2DD] rounded-md bg-white focus:outline-none focus:border-[#0B4036]"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="WAITING_FOR_CUSTOMER">WAITING FOR CUSTOMER</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#18231F] mb-1">Priority</label>
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value)}
                  className="w-full p-2 text-xs border border-[#DDE2DD] rounded-md bg-white focus:outline-none focus:border-[#0B4036]"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </select>
              </div>
            </div>

            <Input
              label="Assigned Administrator"
              placeholder="e.g. Platform Admin (DevOps)"
              value={editAssigned}
              onChange={(e) => setEditAssigned(e.target.value)}
            />

            <div>
              <label className="block text-xs font-semibold text-[#18231F] mb-1">Internal Resolution Notes</label>
              <textarea
                rows={3}
                placeholder="Log internal resolution steps, investigation details, or tenant communication..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full p-2.5 text-xs border border-[#DDE2DD] rounded-md focus:outline-none focus:border-[#0B4036]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setIsDetailOpen(false)}>
                Close
              </Button>
              <Button variant="primary" size="sm" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Update Ticket'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default SuperAdminSupportPage;
