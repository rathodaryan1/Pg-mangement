import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Wrench,
  Sparkles,
  Search,
  Filter,
  Plus,
  Clock,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { operationsApi } from '../../services/operationsApi';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { toast } from '../../context/ToastContext';
import { useTranslation } from '../../i18n';

export const UnifiedTasksPage: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [category, setCategory] = useState('MAINTENANCE');
  const [priority, setPriority] = useState('MEDIUM');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await operationsApi.getOperationalTasks({
        category: categoryFilter,
        priority: priorityFilter,
      });
      setData(res.data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load staff tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [categoryFilter, priorityFilter]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await operationsApi.createOperationalTask({
        title: taskTitle,
        category,
        priority,
        assignedTo,
        dueDate,
        notes,
      });
      toast.success('Task dispatched successfully');
      setCreateModalOpen(false);
      setTaskTitle('');
      setNotes('');
      fetchTasks();
    } catch (err: any) {
      toast.error(err.message || 'Failed to dispatch task');
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await operationsApi.updateTaskStatus(id, { status });
      toast.success(`Task moved to ${status}`);
      fetchTasks();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update task');
    }
  };

  const tasks = data?.tasks || [];
  const complaints = data?.activeComplaints || [];
  const housekeeping = data?.pendingHousekeeping || [];

  const filteredTasks = tasks.filter((t: any) =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    (t.notes && t.notes.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Operations Center
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Unified Staff Task & Work Order Center
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cross-module operational dispatch covering maintenance, housekeeping, inspections, and kitchen orders.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button variant="outline" size="sm" onClick={fetchTasks} className="gap-1.5 bg-white">
            <RefreshCw className="w-3.5 h-3.5" /> {t('refresh', 'Refresh')}
          </Button>
          <Button size="sm" onClick={() => setCreateModalOpen(true)} className="gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white">
            <Plus className="w-3.5 h-3.5" /> Dispatch Work Order
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search tasks, descriptions, or assigned personnel..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-xs p-2 rounded-lg border border-slate-200 bg-white"
        >
          <option value="ALL">All Categories</option>
          <option value="MAINTENANCE">Maintenance</option>
          <option value="HOUSEKEEPING">Housekeeping</option>
          <option value="INSPECTION">Inspection</option>
          <option value="KITCHEN">Kitchen & Food</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="text-xs p-2 rounded-lg border border-slate-200 bg-white"
        >
          <option value="ALL">All Priorities</option>
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      {/* Task List */}
      <Card className="p-4 sm:p-6 bg-white border border-slate-200">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Active Operational Work Orders</h3>
        {filteredTasks.length === 0 ? (
          <p className="text-xs text-slate-500 py-8 text-center">No tasks match the selected filters.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTasks.map((task: any) => (
              <div key={task.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                        task.priority === 'URGENT'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : task.priority === 'HIGH'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {task.priority}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                      {task.category}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900">{task.title}</h4>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Assigned: <strong>{task.assignedTo || 'Unassigned'}</strong> • Due: {task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : 'Open'}
                    {task.notes && ` • Notes: ${task.notes}`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      task.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : task.status === 'IN_PROGRESS'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {task.status}
                  </span>

                  {task.status !== 'COMPLETED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateStatus(task.id, 'COMPLETED')}
                      className="text-xs h-7 text-emerald-700 hover:bg-emerald-50 gap-1 border-emerald-200"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Mark Done
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal: Dispatch Work Order */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Dispatch Operational Work Order">
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-slate-700">Work Order Title</label>
            <input
              type="text"
              placeholder="e.g., Deep clean water tank / Fix AC compressor room 104"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="w-full text-xs p-2 rounded border border-slate-200 mt-1"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs p-2 rounded border border-slate-200 mt-1"
              >
                <option value="MAINTENANCE">Maintenance & Repairs</option>
                <option value="HOUSEKEEPING">Housekeeping & Sanitation</option>
                <option value="INSPECTION">Inspection & Audit</option>
                <option value="KITCHEN">Kitchen & Supplies</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full text-xs p-2 rounded border border-slate-200 mt-1"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent (SLA &lt; 4 Hours)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700">Assign To Staff</label>
              <input
                type="text"
                placeholder="Staff name / role"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full text-xs p-2 rounded border border-slate-200 mt-1"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-700">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-xs p-2 rounded border border-slate-200 mt-1"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700">Instructions / Notes</label>
            <textarea
              placeholder="Provide exact room location, tools required, or safety notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs p-2 rounded border border-slate-200 mt-1"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" size="sm" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white">Dispatch Task</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
