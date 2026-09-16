import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Search,
  Plus,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  History,
  CheckSquare,
  Sparkles,
  User
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge, Badge } from '../../components/ui/Badge';
import { Input, Select } from '../../components/ui/Input';
import { Tabs } from '../../components/ui/Tabs';
import type { Column } from '../../components/ui/Table';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Timeline } from '../../components/ui/Timeline';
import { useAuth } from '../../context/AuthContext';
import { ownerApi } from '../../services/ownerApi';
import type { MaintenanceTicket, StaffMember } from '../../types';

export const MaintenancePage: React.FC = () => {
  const { activeProperty } = useAuth();
  const [activeTab, setActiveTab] = useState<'complaints' | 'tasks'>('complaints');
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Update Ticket State
  const [assignStaffId, setAssignStaffId] = useState('');
  const [resolutionComment, setResolutionComment] = useState('');

  // Create Task Form
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    category: 'HOUSEKEEPING',
    priority: 'MEDIUM',
    assignedStaffId: '',
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0]
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [tkts, stf, tsk] = await Promise.all([
        ownerApi.getComplaints(activeProperty.id),
        ownerApi.getStaff(activeProperty.id),
        ownerApi.getTasks(activeProperty.id)
      ]);
      setTickets(tkts.data || []);
      setStaffList(stf.data || []);
      setTasks(tsk.data || []);
    } catch (err: any) {
      console.error('Failed to load maintenance data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeProperty]);

  const handleUpdateStatus = async (status: string) => {
    if (!selectedTicket) return;
    try {
      await ownerApi.updateComplaintStatus(selectedTicket.id, {
        status,
        assignedStaffId: assignStaffId || undefined,
        note: resolutionComment || `Status transitioned to ${status}`
      });
      setToastMessage(`Ticket marked as ${status}`);
      setTimeout(() => setToastMessage(null), 3000);
      setTicketModalOpen(false);
      setResolutionComment('');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update ticket status');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!taskForm.title) {
        alert('Please enter task title');
        return;
      }
      await ownerApi.createTask({
        propertyId: activeProperty.id,
        title: taskForm.title,
        description: taskForm.description,
        category: taskForm.category,
        priority: taskForm.priority,
        assignedStaffId: taskForm.assignedStaffId || undefined,
        dueDate: taskForm.dueDate
      });
      setCreateTaskModalOpen(false);
      setToastMessage('Operational task created & assigned!');
      setTimeout(() => setToastMessage(null), 4000);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create task');
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.residentName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const complaintColumns: Column<MaintenanceTicket>[] = [
    {
      header: 'Ticket Info',
      cell: (row) => (
        <div>
          <span className="font-mono text-[11px] font-bold text-slate-400">{row.ticketNumber}</span>
          <p className="font-bold text-xs text-slate-900 dark:text-white">{row.title}</p>
          <p className="text-[11px] text-slate-500">Category: {row.category}</p>
        </div>
      )
    },
    {
      header: 'Resident & Room',
      cell: (row) => (
        <div>
          <p className="font-bold text-xs text-blue-600 dark:text-blue-400">{row.residentName}</p>
          <p className="text-[11px] text-slate-500">Room {row.roomNumber || 'N/A'}</p>
        </div>
      )
    },
    {
      header: 'Priority',
      cell: (row) => <StatusBadge status={row.priority} />
    },
    {
      header: 'Assigned Staff',
      cell: (row) => (
        <span className="text-xs font-semibold">{row.assignedStaffName || 'Unassigned'}</span>
      )
    },
    {
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />
    },
    {
      header: 'Action',
      cell: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedTicket(row);
            setAssignStaffId(row.assignedStaffId || '');
            setTicketModalOpen(true);
          }}
        >
          Manage Ticket
        </Button>
      )
    }
  ];

  const taskColumns: Column<any>[] = [
    {
      header: 'Task Name',
      cell: (row) => (
        <div>
          <p className="font-bold text-xs text-slate-900 dark:text-white">{row.title}</p>
          <p className="text-[11px] text-slate-400">{row.description}</p>
        </div>
      )
    },
    {
      header: 'Category',
      cell: (row) => <Badge variant="purple">{row.category}</Badge>
    },
    {
      header: 'Assigned Technician',
      cell: (row) => (
        <span className="text-xs font-medium">{row.assignedStaff?.name || row.staffName || 'General Staff'}</span>
      )
    },
    {
      header: 'Priority',
      cell: (row) => <StatusBadge status={row.priority} />
    },
    {
      header: 'Due Date',
      cell: (row) => <span className="text-xs text-slate-500">{new Date(row.dueDate).toLocaleDateString()}</span>
    },
    {
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Maintenance & Operations Desk</h1>
          <p className="text-xs text-slate-500">Manage reported resident issues, assign staff technicians, and track resolution timelines</p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setCreateTaskModalOpen(true)}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          Assign Internal Task
        </Button>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'complaints', label: `Resident Complaints (${tickets.length})`, icon: <Wrench className="w-4 h-4 text-purple-600" /> },
          { id: 'tasks', label: `Internal Operations & Tasks (${tasks.length})`, icon: <CheckSquare className="w-4 h-4 text-emerald-600" /> }
        ]}
        activeTab={activeTab}
        onChange={(tab) => setActiveTab(tab as any)}
      />

      {activeTab === 'complaints' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <Card className="p-4 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="w-full md:w-80">
              <Input
                placeholder="Search ticket #, title, resident..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              />
            </div>

            <Select
              options={[
                { label: 'All Statuses', value: 'ALL' },
                { label: 'Reported / Open', value: 'OPEN' },
                { label: 'Assigned', value: 'ASSIGNED' },
                { label: 'In Progress', value: 'IN_PROGRESS' },
                { label: 'Waiting on Parts', value: 'WAITING' },
                { label: 'Resolved', value: 'RESOLVED' },
                { label: 'Closed', value: 'CLOSED' }
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </Card>

          {/* Complaints Table */}
          <Table
            columns={complaintColumns}
            data={filteredTickets}
            keyExtractor={(item) => item.id}
            isLoading={isLoading}
          />
        </div>
      )}

      {activeTab === 'tasks' && (
        <Table
          columns={taskColumns}
          data={tasks}
          keyExtractor={(item) => item.id}
          isLoading={isLoading}
        />
      )}

      {/* Manage Ticket Modal */}
      {selectedTicket && (
        <Modal
          isOpen={ticketModalOpen}
          onClose={() => setTicketModalOpen(false)}
          title={`Ticket: ${selectedTicket.ticketNumber} - ${selectedTicket.title}`}
          maxWidth="lg"
        >
          <div className="space-y-6 text-xs">
            {/* Ticket Info Card */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white">Resident: {selectedTicket.residentName} (Room {selectedTicket.roomNumber || 'N/A'})</span>
                <StatusBadge status={selectedTicket.status} />
              </div>
              <p className="text-slate-600 dark:text-slate-300 font-medium">{selectedTicket.description}</p>
              <div className="flex gap-4 text-[11px] text-slate-400 pt-1">
                <span>Category: <strong>{selectedTicket.category}</strong></span>
                <span>Priority: <strong>{selectedTicket.priority}</strong></span>
                <span>Reported: <strong>{new Date(selectedTicket.createdAt).toLocaleString()}</strong></span>
              </div>
            </div>

            {/* Assignment & Status Controls */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
              <h4 className="font-bold text-slate-900 dark:text-white">Technician Assignment & Resolution</h4>
              
              <Select
                label="Assign Staff Member"
                options={[
                  { label: '-- Select Staff Member --', value: '' },
                  ...staffList.map((s) => ({
                    label: `${s.name} (${s.role} - ${s.mobile})`,
                    value: s.id
                  }))
                ]}
                value={assignStaffId}
                onChange={(e) => setAssignStaffId(e.target.value)}
              />

              <Input
                label="Resolution Notes / Update Log"
                placeholder="Enter remarks or update details..."
                value={resolutionComment}
                onChange={(e) => setResolutionComment(e.target.value)}
              />

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => handleUpdateStatus('ASSIGNED')}>
                  Mark Assigned
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleUpdateStatus('IN_PROGRESS')}>
                  In Progress
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleUpdateStatus('WAITING')}>
                  Waiting Parts
                </Button>
                <Button variant="success" size="sm" onClick={() => handleUpdateStatus('RESOLVED')}>
                  Mark Resolved
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleUpdateStatus('CLOSED')}>
                  Close Ticket
                </Button>
              </div>
            </div>

            {/* Activity History */}
            {selectedTicket.activities && selectedTicket.activities.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white">Activity Log History</h4>
                <div className="space-y-2">
                  {selectedTicket.activities.map((act: any) => (
                    <div key={act.id} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-[11px]">
                      <div className="flex justify-between font-semibold">
                        <span>{act.actorName} ({act.action})</span>
                        <span className="text-slate-400">{new Date(act.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-500 mt-0.5">{act.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Create Task Modal */}
      <Modal
        isOpen={createTaskModalOpen}
        onClose={() => setCreateTaskModalOpen(false)}
        title="Assign Operational / Housekeeping Task"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <Input
            label="Task Title"
            placeholder="e.g. Water Filter Replacement & Sump Cleaning"
            value={taskForm.title}
            onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category"
              options={[
                { label: 'Housekeeping', value: 'HOUSEKEEPING' },
                { label: 'Plumbing', value: 'PLUMBING' },
                { label: 'Electrical', value: 'ELECTRICAL' },
                { label: 'Security & Safety', value: 'SECURITY' },
                { label: 'General Maintenance', value: 'GENERAL' }
              ]}
              value={taskForm.category}
              onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })}
            />
            <Select
              label="Priority"
              options={[
                { label: 'Low', value: 'LOW' },
                { label: 'Medium', value: 'MEDIUM' },
                { label: 'High', value: 'HIGH' },
                { label: 'Urgent', value: 'URGENT' }
              ]}
              value={taskForm.priority}
              onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Assign Staff"
              options={[
                { label: '-- Select Staff --', value: '' },
                ...staffList.map((s) => ({ label: `${s.name} (${s.role})`, value: s.id }))
              ]}
              value={taskForm.assignedStaffId}
              onChange={(e) => setTaskForm({ ...taskForm, assignedStaffId: e.target.value })}
            />
            <Input
              label="Due Date"
              type="date"
              value={taskForm.dueDate}
              onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
              required
            />
          </div>

          <Input
            label="Task Description"
            placeholder="Details of the job to be completed..."
            value={taskForm.description}
            onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button variant="outline" size="sm" type="button" onClick={() => setCreateTaskModalOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit">Create Task</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
