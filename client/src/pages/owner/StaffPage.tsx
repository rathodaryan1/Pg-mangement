import { toast, useToast } from '../../context/ToastContext';
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Search, Phone, User, CheckSquare, CheckCircle2, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge, Badge } from '../../components/ui/Badge';
import { Input, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import type { Column } from '../../components/ui/Table';
import { Table } from '../../components/ui/Table';
import { useAuth } from '../../context/AuthContext';
import { ownerApi } from '../../services/ownerApi';
import type { StaffMember } from '../../types';

export const StaffPage: React.FC = () => {
  const { activeProperty } = useAuth();
  const [activeTab, setActiveTab] = useState<'profiles' | 'attendance' | 'advances' | 'payroll'>('profiles');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [advances, setAdvances] = useState<any[]>([]);
  const [payrollData, setPayrollData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [archiveModal, setArchiveModal] = useState<{ id: string; name: string } | null>(null);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);

  // Form states
  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    mobile: '',
    role: 'MAINTENANCE',
    shift: 'Morning (8 AM - 4 PM)',
    salary: '22000'
  });

  const [attForm, setAttForm] = useState({
    userId: '',
    status: 'PRESENT',
    notes: '',
  });

  const [advForm, setAdvForm] = useState({
    userId: '',
    amount: '',
    reason: 'Medical / Personal emergency advance',
  });

  const fetchStaffData = async () => {
    setIsLoading(true);
    try {
      const [sRes, aRes, adRes, pRes] = await Promise.all([
        ownerApi.getStaff(activeProperty.id),
        ownerApi.getStaffAttendance(activeProperty.id),
        ownerApi.getStaffAdvances(activeProperty.id),
        ownerApi.getPayrollSummary(activeProperty.id),
      ]);
      setStaff(sRes.data || []);
      setAttendance(aRes.data || []);
      setAdvances(adRes.data || []);
      setPayrollData(pRes.data || null);
    } catch (err: any) {
      console.error('Failed to fetch workforce data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, [activeProperty]);

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!staffForm.name || !staffForm.mobile) {
        toast.error('Please fill name and mobile number');
        return;
      }

      if (editingStaff) {
        await ownerApi.updateStaff(editingStaff.id, {
          name: staffForm.name,
          email: staffForm.email,
          mobile: staffForm.mobile,
          role: staffForm.role,
          shift: staffForm.shift,
          salary: parseFloat(staffForm.salary)
        });
        setToastMessage(`Staff profile for ${staffForm.name} updated!`);
      } else {
        await ownerApi.createStaff({
          propertyId: activeProperty.id,
          name: staffForm.name,
          email: staffForm.email || undefined,
          mobile: staffForm.mobile,
          role: staffForm.role,
          shift: staffForm.shift,
          salary: parseFloat(staffForm.salary) || 22000
        });
        setToastMessage(`Staff member ${staffForm.name} registered successfully!`);
      }

      setStaffModalOpen(false);
      setEditingStaff(null);
      setTimeout(() => setToastMessage(null), 4000);
      fetchStaffData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save staff member');
    }
  };

  const handleLogAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attForm.userId) {
      toast.error('Please select a staff member');
      return;
    }
    try {
      await ownerApi.recordStaffAttendance({
        propertyId: activeProperty.id,
        userId: attForm.userId,
        status: attForm.status,
        notes: attForm.notes,
      });
      toast.success('Attendance recorded successfully');
      setAttendanceModalOpen(false);
      setAttForm({ userId: '', status: 'PRESENT', notes: '' });
      fetchStaffData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to log attendance');
    }
  };

  const handleDisburseAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advForm.userId || !advForm.amount) {
      toast.error('Please select staff member and enter amount');
      return;
    }
    try {
      await ownerApi.recordStaffAdvance({
        propertyId: activeProperty.id,
        userId: advForm.userId,
        amount: parseFloat(advForm.amount),
        reason: advForm.reason,
      });
      toast.success('Salary advance recorded');
      setAdvanceModalOpen(false);
      setAdvForm({ userId: '', amount: '', reason: 'Medical / Personal emergency advance' });
      fetchStaffData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record advance');
    }
  };

  const handleConfirmArchive = async () => {
    if (!archiveModal) return;
    try {
      await ownerApi.archiveStaff(archiveModal.id);
      setToastMessage(`Staff member ${archiveModal.name} deactivated.`);
      setArchiveModal(null);
      setTimeout(() => setToastMessage(null), 3500);
      fetchStaffData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to deactivate staff');
    }
  };

  const columns: Column<StaffMember>[] = [
    {
      header: 'Staff Name',
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-brand-forest/10 text-brand-forest dark:bg-brand-gold/15 dark:text-brand-gold font-bold flex items-center justify-center text-xs">
            {row.name.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-xs text-slate-900 dark:text-white">{row.name}</p>
            <p className="text-[11px] text-slate-400">{row.mobile}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Role',
      cell: (row) => <Badge variant="secondary">{row.role}</Badge>
    },
    {
      header: 'Shift',
      accessorKey: 'shift'
    },
    {
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />
    },
    {
      header: 'Monthly Salary',
      cell: (row) => <span className="font-bold text-xs">₹{(row.salary || 0).toLocaleString('en-IN')}</span>
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setEditingStaff(row);
              setStaffForm({
                name: row.name,
                email: (row as any).email || '',
                mobile: row.mobile,
                role: row.role,
                shift: row.shift || 'Morning (8 AM - 4 PM)',
                salary: (row.salary || 22000).toString()
              });
              setStaffModalOpen(true);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-[#0B4036] dark:hover:text-[#C8A45D] hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Edit Staff Profile"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setArchiveModal({ id: row.id, name: row.name })}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Deactivate Staff"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
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

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Workforce & Staff Operations</h1>
          <p className="text-xs text-slate-500">Manage property staff, daily shift attendance, salary advances, and monthly payroll summaries.</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'profiles' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingStaff(null);
                setStaffForm({
                  name: '',
                  email: '',
                  mobile: '',
                  role: 'MAINTENANCE',
                  shift: 'Morning (8 AM - 4 PM)',
                  salary: '22000'
                });
                setStaffModalOpen(true);
              }}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Staff Member
            </Button>
          )}
          {activeTab === 'attendance' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setAttendanceModalOpen(true)}
              leftIcon={<CheckSquare className="w-3.5 h-3.5" />}
            >
              Log Daily Attendance
            </Button>
          )}
          {activeTab === 'advances' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setAdvanceModalOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Disburse Salary Advance
            </Button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('profiles')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'profiles'
              ? 'bg-[#0B4036] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Staff Directory ({staff.length})
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'attendance'
              ? 'bg-[#0B4036] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Shift Attendance ({attendance.length})
        </button>
        <button
          onClick={() => setActiveTab('advances')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'advances'
              ? 'bg-[#0B4036] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Salary Advances ({advances.length})
        </button>
        <button
          onClick={() => setActiveTab('payroll')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'payroll'
              ? 'bg-[#0B4036] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Monthly Payroll Sheet
        </button>
      </div>

      {/* Tab: Staff Profiles */}
      {activeTab === 'profiles' && (
        <Table columns={columns} data={staff} keyExtractor={(item) => item.id} isLoading={isLoading} />
      )}

      {/* Tab: Attendance Tracker */}
      {activeTab === 'attendance' && (
        <Card className="border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden bg-white dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Attendance Status</th>
                  <th className="py-3 px-4">Check-In / Out</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {attendance.length > 0 ? (
                  attendance.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-medium">
                        {new Date(rec.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {rec.user?.name}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="secondary">{rec.user?.role}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          rec.status === 'PRESENT'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : rec.status === 'HALF_DAY'
                            ? 'bg-amber-100 text-amber-800'
                            : rec.status === 'LEAVE'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-500">
                        {rec.checkInTime ? new Date(rec.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{rec.notes || '—'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                      No daily attendance logged yet. Click "Log Daily Attendance" above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab: Salary Advances */}
      {activeTab === 'advances' && (
        <Card className="border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden bg-white dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-4">Date Disbursed</th>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Month Applied</th>
                  <th className="py-3 px-4">Advance Amount</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                  <th className="py-3 px-4">Recovery Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {advances.length > 0 ? (
                  advances.map((adv) => (
                    <tr key={adv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-medium">
                        {new Date(adv.disbursedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {adv.user?.name}
                      </td>
                      <td className="py-3 px-4">{adv.monthYear}</td>
                      <td className="py-3 px-4 font-mono font-bold text-amber-600">
                        ₹{adv.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{adv.reason || 'Personal Advance'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          adv.isDeducted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {adv.isDeducted ? 'Recovered' : 'Pending Deduction'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                      No salary advances recorded for this property.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab: Payroll Summary Sheet */}
      {activeTab === 'payroll' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Billing Period</p>
              <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                {payrollData?.month || 'Current Month'}
              </p>
              <p className="text-[11px] text-slate-500">{payrollData?.staffCount || 0} active employees</p>
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total Gross Budget</p>
              <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                ₹{(payrollData?.totalGrossBudget || 0).toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-slate-500">Base salary + HRA + Allowances</p>
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Net Estimated Payout</p>
              <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                ₹{(payrollData?.totalNetEstimatedPayout || 0).toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-slate-500">After absent deductions & advances</p>
            </Card>
          </div>

          <Card className="border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden bg-white dark:bg-slate-900">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500">
              * Note: Payout calculations are internal administrative estimates based on tracked attendance and disbursed advances.
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-3 px-4">Staff Member / Role</th>
                    <th className="py-3 px-4">Attendance</th>
                    <th className="py-3 px-4">Basic Pay</th>
                    <th className="py-3 px-4">HRA + Allowances</th>
                    <th className="py-3 px-4">Gross Total</th>
                    <th className="py-3 px-4">Advances Deducted</th>
                    <th className="py-3 px-4 font-bold text-slate-900 dark:text-white">Estimated Net Payable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {(payrollData?.payrollSheet || []).length > 0 ? (
                    payrollData.payrollSheet.map((emp: any) => (
                      <tr key={emp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900 dark:text-white">{emp.name}</p>
                          <p className="text-[10px] text-slate-400">{emp.role}</p>
                        </td>
                        <td className="py-3 px-4 text-[11px]">
                          <span className="text-emerald-700 font-bold">{emp.attendanceSummary?.present || 0}P</span>
                          {' '}|{' '}
                          <span className="text-rose-600 font-bold">{emp.attendanceSummary?.absent || 0}A</span>
                        </td>
                        <td className="py-3 px-4 font-mono">₹{emp.components?.baseSalary?.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 font-mono">₹{(emp.components?.hra + emp.components?.allowances)?.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 font-mono font-bold">₹{emp.components?.grossSalary?.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 font-mono text-rose-600 font-bold">-₹{emp.components?.advancesDeducted?.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 font-mono font-black text-emerald-700 dark:text-emerald-400">
                          ₹{emp.components?.netEstimatedPayable?.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                        No payroll data computed for this property.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Attendance Modal */}
      <Modal isOpen={attendanceModalOpen} onClose={() => setAttendanceModalOpen(false)} title="Log Daily Shift Attendance">
        <form onSubmit={handleLogAttendance} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Select Staff Member *</label>
            <select
              required
              value={attForm.userId}
              onChange={(e) => setAttForm({ ...attForm, userId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            >
              <option value="">-- Choose Staff Member --</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Attendance Status</label>
              <select
                value={attForm.status}
                onChange={(e) => setAttForm({ ...attForm, status: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              >
                <option value="PRESENT">PRESENT (Full Day)</option>
                <option value="HALF_DAY">HALF DAY</option>
                <option value="LEAVE">APPROVED LEAVE</option>
                <option value="ABSENT">ABSENT</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Remarks</label>
              <input
                type="text"
                placeholder="e.g. Regular shift on time"
                value={attForm.notes}
                onChange={(e) => setAttForm({ ...attForm, notes: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setAttendanceModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Save Attendance</Button>
          </div>
        </form>
      </Modal>

      {/* Advance Modal */}
      <Modal isOpen={advanceModalOpen} onClose={() => setAdvanceModalOpen(false)} title="Disburse Staff Salary Advance">
        <form onSubmit={handleDisburseAdvance} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Select Staff Member *</label>
            <select
              required
              value={advForm.userId}
              onChange={(e) => setAdvForm({ ...advForm, userId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            >
              <option value="">-- Choose Staff Member --</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Advance Amount (INR) *</label>
            <input
              type="number"
              required
              placeholder="e.g. 5000"
              value={advForm.amount}
              onChange={(e) => setAdvForm({ ...advForm, amount: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Advance</label>
            <input
              type="text"
              value={advForm.reason}
              onChange={(e) => setAdvForm({ ...advForm, reason: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setAdvanceModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Disburse Advance</Button>
          </div>
        </form>
      </Modal>

      {/* Staff Modal (Create / Edit) */}
      <Modal
        isOpen={staffModalOpen}
        onClose={() => setStaffModalOpen(false)}
        title={editingStaff ? `Edit Staff: ${editingStaff.name}` : 'Register New Staff Member'}
      >
        <form onSubmit={handleSaveStaff} className="space-y-4">
          <Input
            label="Staff Full Name"
            placeholder="e.g. Ramesh Kumar"
            value={staffForm.name}
            onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Mobile Number"
              placeholder="+91 98765 12345"
              value={staffForm.mobile}
              onChange={(e) => setStaffForm({ ...staffForm, mobile: e.target.value })}
              required
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="ramesh@pg.com"
              value={staffForm.email}
              onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Staff Role"
              options={[
                { label: 'Manager / Warden', value: 'MANAGER' },
                { label: 'Maintenance Technician', value: 'MAINTENANCE' },
                { label: 'Security Guard', value: 'SECURITY_GUARD' },
                { label: 'Housekeeping Specialist', value: 'HOUSEKEEPING' },
                { label: 'Chef / Mess Cook', value: 'COOK' },
                { label: 'Receptionist / Front Desk', value: 'RECEPTIONIST' },
                { label: 'Accountant', value: 'ACCOUNTANT' }
              ]}
              value={staffForm.role}
              onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
            />
            <Select
              label="Assigned Shift"
              options={[
                { label: 'Morning (8 AM - 4 PM)', value: 'Morning (8 AM - 4 PM)' },
                { label: 'Evening (2 PM - 10 PM)', value: 'Evening (2 PM - 10 PM)' },
                { label: 'Night (10 PM - 6 AM)', value: 'Night (10 PM - 6 AM)' },
                { label: 'General Full Day', value: 'General Full Day' }
              ]}
              value={staffForm.shift}
              onChange={(e) => setStaffForm({ ...staffForm, shift: e.target.value })}
            />
          </div>
          <Input
            label="Monthly Salary (₹)"
            type="number"
            value={staffForm.salary}
            onChange={(e) => setStaffForm({ ...staffForm, salary: e.target.value })}
            required
          />
          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button variant="outline" size="sm" type="button" onClick={() => setStaffModalOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit">
              {editingStaff ? 'Save Changes' : 'Register Staff'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Deactivation Modal */}
      <Modal
        isOpen={!!archiveModal}
        onClose={() => setArchiveModal(null)}
        title="Deactivate Staff Member"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Are you sure you want to deactivate <strong>{archiveModal?.name}</strong>? They will be removed from active dispatch duty.</span>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => setArchiveModal(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleConfirmArchive}>
              Confirm Deactivation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StaffPage;
