import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  CheckCircle,
  Clock,
  CheckSquare,
  AlertCircle,
  Building,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { saasApi } from '../../services/saasApi';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { toast } from '../../context/ToastContext';

export const HousekeepingPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Form State
  const [targetName, setTargetName] = useState('');
  const [area, setArea] = useState('ROOM');
  const [scheduledAt, setScheduledAt] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [assignedTo, setAssignedTo] = useState('Housekeeping Team');

  const fetchHousekeeping = async () => {
    setLoading(true);
    try {
      const [tRes, dRes] = await Promise.all([
        saasApi.getHousekeepingTasks(),
        saasApi.getHousekeepingDashboard(),
      ]);
      setTasks(tRes.data || []);
      setStats(dRes.data?.stats || {});
    } catch (err: any) {
      toast.error(err.message || 'Failed to load housekeeping portal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHousekeeping();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saasApi.createHousekeepingTask({
        targetName,
        area: area as any,
        scheduledAt,
        notes,
        assignedTo,
      });
      toast.success('Cleaning schedule created successfully');
      setCreateModalOpen(false);
      setTargetName('');
      setNotes('');
      fetchHousekeeping();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create task');
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await saasApi.updateHousekeepingTask(id, status);
      toast.success(`Task marked as ${status.replace('_', ' ')}`);
      fetchHousekeeping();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update task');
    }
  };

  const handleVerify = async (id: string) => {
    try {
      await saasApi.verifyHousekeepingTask(id, 'Cleaned and sanitized inspection passed');
      toast.success('Task supervisor verification complete');
      fetchHousekeeping();
    } catch (err: any) {
      toast.error(err.message || 'Verification failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] p-4 sm:p-6 lg:p-8 text-slate-900">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-teal-100 text-teal-800 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Housekeeping & Sanitization Desk
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Daily Cleaning Schedules & Checklists
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track daily room cleanings, bathroom deep-cleans, common area sanitization, and supervisor audits.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={fetchHousekeeping} className="gap-1.5 bg-white border-slate-200">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setCreateModalOpen(true)} className="gap-1.5 bg-teal-700 hover:bg-teal-800 text-white">
            <Plus className="w-3.5 h-3.5" /> Schedule Cleaning
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-5 border border-slate-200 bg-white shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Pending Cleanings</p>
          <p className="text-3xl font-black text-amber-600">{stats?.pending || 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">Scheduled for today</p>
        </Card>

        <Card className="p-5 border border-slate-200 bg-white shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">In Progress</p>
          <p className="text-3xl font-black text-sky-600">{stats?.inProgress || 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">Currently being cleaned</p>
        </Card>

        <Card className="p-5 border border-slate-200 bg-white shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Completed & Verified</p>
          <p className="text-3xl font-black text-emerald-700">{stats?.completed || 0}</p>
          <p className="text-[11px] text-slate-400 mt-1">Cleaned and inspected</p>
        </Card>
      </div>

      {/* Tasks Grid */}
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-teal-600" /> Active Cleaning Checklist
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <Card key={task.id} className="p-5 border border-slate-200 bg-white shadow-xs hover:border-teal-300 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                      {task.area}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        task.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : task.status === 'IN_PROGRESS'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 mb-1">{task.targetName}</h3>
                  <p className="text-xs text-slate-500 mb-3 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> Due: {new Date(task.scheduledAt).toLocaleDateString()}
                  </p>

                  {task.notes && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 mb-4">
                      {task.notes}
                    </p>
                  )}

                  {task.verifiedBy && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold mb-3">
                      <CheckCircle className="w-4 h-4" /> Verified by: {task.verifiedBy}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  {task.status === 'PENDING' && (
                    <Button size="xs" onClick={() => handleUpdateStatus(task.id, 'IN_PROGRESS')} className="bg-sky-600 hover:bg-sky-700 text-white w-full">
                      Start Cleaning
                    </Button>
                  )}
                  {task.status === 'IN_PROGRESS' && (
                    <Button size="xs" onClick={() => handleUpdateStatus(task.id, 'COMPLETED')} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full">
                      Mark Completed
                    </Button>
                  )}
                  {task.status === 'COMPLETED' && !task.verifiedBy && (
                    <Button size="xs" variant="outline" onClick={() => handleVerify(task.id)} className="w-full text-teal-700 border-teal-200">
                      Supervisor Verify
                    </Button>
                  )}
                  {task.status === 'COMPLETED' && task.verifiedBy && (
                    <span className="text-xs text-slate-400 italic text-center w-full">Sanitization Verified</span>
                  )}
                </div>
              </Card>
            ))
          ) : (
            <div className="col-span-3 p-12 text-center bg-white rounded-xl border border-dashed border-slate-200">
              <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No cleaning tasks scheduled</p>
              <p className="text-xs text-slate-400 mt-1 mb-4">Create schedules for room turnovers, daily sweeping, and bathroom sanitization.</p>
              <Button size="sm" onClick={() => setCreateModalOpen(true)} className="bg-teal-700 hover:bg-teal-800 text-white">
                Schedule First Cleaning
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Schedule Task */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Schedule New Housekeeping Task">
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Target Area / Room</label>
            <input
              type="text"
              required
              placeholder="e.g. Room 102 or 3rd Floor Common Washroom"
              value={targetName}
              onChange={(e) => setTargetName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Area Category</label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium"
              >
                <option value="ROOM">Resident Room</option>
                <option value="BATHROOM">Bathroom / Washroom</option>
                <option value="CORRIDOR">Corridor / Hallway</option>
                <option value="KITCHEN">Kitchen / Pantry</option>
                <option value="DINING">Dining Hall</option>
                <option value="LOBBY">Reception / Lobby</option>
                <option value="TERRACE">Terrace / Balcony</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Scheduled Date</label>
              <input
                type="date"
                required
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Cleaner / Team</label>
            <input
              type="text"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Instructions / Specific Checklist</label>
            <textarea
              rows={3}
              placeholder="e.g. Mop floor with disinfectant, clean glass mirror, replace dustbin bag."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-teal-700 hover:bg-teal-800 text-white">
              Create Cleaning Schedule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
