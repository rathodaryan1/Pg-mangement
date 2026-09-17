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
  User,
  Trash2,
  MessageSquare,
  Edit2
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge, Badge } from '../../components/ui/Badge';
import { Input, Select } from '../../components/ui/Input';
import { Tabs } from '../../components/ui/Tabs';
import type { Column } from '../../components/ui/Table';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
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
  const [createComplaintModalOpen, setCreateComplaintModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Update Ticket State
  const [assignStaffId, setAssignStaffId] = useState('');
  const [resolutionComment, setResolutionComment] = useState('');
  const [newNote, setNewNote] = useState('');

  // Complaint Form
  const [complaintForm, setComplaintForm] = useState({
    title: '',
    category: 'PLUMBING',
    priority: 'HIGH',
    description: '',
    residentName: 'Management Request',
    roomNumber: 'Common Area'
  });

  // Create Task Form
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    category: 'HOUSEKEEPING',
    priority: 'MEDIUM',
    assignedTo: '',
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    notes: ''
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

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newNote) return;
    try {
      await ownerApi.addComplaintComment(selectedTicket.id, newNote);
      setToastMessage('Internal note added to ticket.');
      setNewNote('');
      const res = await ownerApi.getComplaints();
      const updated = res.data.find((c: any) => c.id === selectedTicket.id);
      if (updated) setSelectedTicket(updated);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to add note');
    }
  };

  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ownerApi.createComplaint(complaintForm);
      setCreateComplaintModalOpen(false);
      setToastMessage('Maintenance ticket created successfully!');
      setTimeout(() => setToastMessage(null), 4000);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create ticket');
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
        notes: taskForm.notes || taskForm.description,
        category: taskForm.category,
        priority: taskForm.priority,
        assignedTo: taskForm.assignedTo || 'Assigned Staff',
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

  const handleToggleTaskStatus = async (task: any, newStatus: string) => {
    try {
      await ownerApi.updateTask(task.id, { status: newStatus });
      setToastMessage(`Task marked as ${newStatus}`);
      setTimeout(() => setToastMessage(null), 3000);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update task');
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Are you sure you want to remove this task?')) return;
    try {
      await ownerApi.archiveTask(id);
      setToastMessage('Task removed.');
      setTimeout(() => setToastMessage(null), 3000);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete task');
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.residentName && t.residentName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
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
            Maintenance & Operations Command
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Resident issue resolution pipeline, staff dispatch, and recurring housekeeping tasks
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'complaints' ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCreateComplaintModalOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Log Issue
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCreateTaskModalOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Create Task
            </Button>
          )}
        </div>
      </div>

      {/* Tab Selector & Filter Bar */}
      <Card className="p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-brand-surface dark:bg-brand-surface-dark border border-brand-border dark:border-brand-border-dark rounded-xl w-full md:w-auto">
          <button
            onClick={() => setActiveTab('complaints')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'complaints'
                ? 'bg-brand-forest text-white shadow-sm'
                : 'text-brand-muted hover:text-brand-text dark:hover:text-white'
            }`}
          >
            Resident Complaints ({tickets.length})
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'tasks'
                ? 'bg-brand-forest text-white shadow-sm'
                : 'text-brand-muted hover:text-brand-text dark:hover:text-white'
            }`}
          >
            Operational Tasks ({tasks.length})
          </button>
        </div>

        <div className="w-full md:w-72">
          <Input
            placeholder="Search issue, ticket #, staff..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>
      </Card>

      {/* TAB 1: COMPLAINTS */}
      {activeTab === 'complaints' && (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Ticket # & Issue</th>
                  <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Resident / Room</th>
                  <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Category & Priority</th>
                  <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Assigned Staff</th>
                  <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Status</th>
                  <th className="p-4 font-bold text-slate-600 dark:text-slate-300 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="p-4">
                      <span className="font-mono text-[10px] text-slate-400 font-bold block">{t.ticketNumber}</span>
                      <strong className="text-slate-900 dark:text-white text-xs">{t.title}</strong>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-blue-600 dark:text-blue-400">{t.residentName}</span>
                      <p className="text-[10px] text-slate-400">Room {t.roomNumber || 'Common'}</p>
                    </td>
                    <td className="p-4">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{t.category}</span>
                      <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        t.priority === 'HIGH' || t.priority === 'URGENT' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300">
                      {t.assignedStaffName || <span className="text-amber-500 font-semibold italic">Unassigned</span>}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[11px] py-1 px-2.5"
                        onClick={() => {
                          setSelectedTicket(t);
                          setAssignStaffId(t.assignedStaffName || '');
                          setResolutionComment('');
                          setTicketModalOpen(true);
                        }}
                      >
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: OPERATIONAL TASKS */}
      {activeTab === 'tasks' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <Card key={task.id} className="p-5 space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {task.category}
                  </span>
                  <StatusBadge status={task.status} />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{task.title}</h3>
                <div className="text-xs text-slate-500 space-y-1">
                  <p>Assigned to: <strong className="text-slate-800 dark:text-slate-200">{task.staffName || task.assignedTo || 'Staff'}</strong></p>
                  <p>Due: <span className="font-mono">{task.dueDate}</span></p>
                  {task.notes && <p className="text-[11px] italic text-slate-400">"{task.notes}"</p>}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {task.status !== 'COMPLETED' ? (
                    <Button
                      variant="primary"
                      size="sm"
                      className="text-[10px] py-1 px-2 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleToggleTaskStatus(task, 'COMPLETED')}
                    >
                      Complete
                    </Button>
                  ) : (
                    <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Done
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100"
                  title="Remove Task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Ticket Details & Action Modal */}
      {selectedTicket && (
        <Modal
          isOpen={ticketModalOpen}
          onClose={() => setTicketModalOpen(false)}
          title={`Ticket ${selectedTicket.ticketNumber}: ${selectedTicket.title}`}
          maxWidth="lg"
        >
          <div className="space-y-6 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white">Resident: {selectedTicket.residentName} (Room {selectedTicket.roomNumber})</span>
                <StatusBadge status={selectedTicket.status} />
              </div>
              <p className="text-slate-600 dark:text-slate-300">{selectedTicket.description || 'No detailed description provided.'}</p>
            </div>

            {/* Assign Staff & Transition Status */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-white">Update Status & Staff Dispatch</h4>
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Assign Technician / Staff"
                  options={staffList.map((s) => ({ label: `${s.name} (${s.role})`, value: s.name }))}
                  value={assignStaffId}
                  onChange={(e) => setAssignStaffId(e.target.value)}
                />
                <Input
                  label="Resolution Note / Comment"
                  placeholder="e.g. Geyser coil replaced. Tested OK."
                  value={resolutionComment}
                  onChange={(e) => setResolutionComment(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => handleUpdateStatus('IN_PROGRESS')}>
                  Mark In Progress
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleUpdateStatus('WAITING')}>
                  Waiting for Parts
                </Button>
                <Button variant="primary" size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleUpdateStatus('RESOLVED')}>
                  Mark Resolved
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleUpdateStatus('CLOSED')}>
                  Close Ticket
                </Button>
              </div>
            </div>

            {/* Internal Activity Log */}
            <div className="space-y-3 pt-3 border-t">
              <h4 className="font-bold text-slate-900 dark:text-white">Activity Trail & Internal Notes</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {(selectedTicket.activities || []).map((act: any, idx: number) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border text-slate-600 dark:text-slate-300">
                    <span className="font-bold text-slate-900 dark:text-white">{act.actorName || 'Owner'}</span> ({act.action}): {act.comment}
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddNote} className="flex gap-2">
                <Input
                  placeholder="Add internal technician note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline" size="sm" type="submit">Post Note</Button>
              </form>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Task Modal */}
      <Modal
        isOpen={createTaskModalOpen}
        onClose={() => setCreateTaskModalOpen(false)}
        title="Schedule Operational Task"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <Input
            label="Task Title"
            placeholder="e.g. Overhead Water Tank Chlorination & Filter Clean"
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
                { label: 'Security & Fire Safety', value: 'SECURITY' },
                { label: 'Inspection', value: 'INSPECTION' }
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
              options={staffList.map((s) => ({ label: `${s.name} (${s.role})`, value: s.name }))}
              value={taskForm.assignedTo}
              onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
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
            label="Task Instructions / Notes"
            value={taskForm.notes}
            onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setCreateTaskModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Schedule Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create Complaint Modal */}
      <Modal
        isOpen={createComplaintModalOpen}
        onClose={() => setCreateComplaintModalOpen(false)}
        title="Log Maintenance Issue"
      >
        <form onSubmit={handleCreateComplaint} className="space-y-4">
          <Input
            label="Issue Title"
            placeholder="e.g. Wi-Fi Repeater signal drop on Floor 2"
            value={complaintForm.title}
            onChange={(e) => setComplaintForm({ ...complaintForm, title: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category"
              options={[
                { label: 'Plumbing', value: 'PLUMBING' },
                { label: 'Electrical', value: 'ELECTRICAL' },
                { label: 'Wi-Fi / Internet', value: 'WIFI_INTERNET' },
                { label: 'Air Conditioning', value: 'AIR_CONDITIONING' },
                { label: 'Cleaning', value: 'CLEANING' },
                { label: 'Other', value: 'OTHER' }
              ]}
              value={complaintForm.category}
              onChange={(e) => setComplaintForm({ ...complaintForm, category: e.target.value })}
            />
            <Select
              label="Priority"
              options={[
                { label: 'Low', value: 'LOW' },
                { label: 'Medium', value: 'MEDIUM' },
                { label: 'High', value: 'HIGH' },
                { label: 'Urgent', value: 'URGENT' }
              ]}
              value={complaintForm.priority}
              onChange={(e) => setComplaintForm({ ...complaintForm, priority: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Resident Name"
              value={complaintForm.residentName}
              onChange={(e) => setComplaintForm({ ...complaintForm, residentName: e.target.value })}
            />
            <Input
              label="Room / Location"
              value={complaintForm.roomNumber}
              onChange={(e) => setComplaintForm({ ...complaintForm, roomNumber: e.target.value })}
            />
          </div>
          <Input
            label="Detailed Description"
            value={complaintForm.description}
            onChange={(e) => setComplaintForm({ ...complaintForm, description: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setCreateComplaintModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Log Ticket
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MaintenancePage;
