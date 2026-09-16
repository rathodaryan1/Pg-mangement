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
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [archiveModal, setArchiveModal] = useState<{ id: string; name: string } | null>(null);

  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    mobile: '',
    role: 'MAINTENANCE',
    shift: 'Morning (8 AM - 4 PM)',
    salary: '22000'
  });

  const fetchStaff = async () => {
    try {
      setIsLoading(true);
      const res = await ownerApi.getStaff(activeProperty.id);
      setStaff(res.data || []);
    } catch (err: any) {
      console.error('Failed to fetch staff:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [activeProperty]);

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!staffForm.name || !staffForm.mobile) {
        alert('Please fill name and mobile number');
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
          salary: parseFloat(staffForm.salary) || 20000
        });
        setToastMessage(`Staff member ${staffForm.name} registered successfully!`);
      }

      setStaffModalOpen(false);
      setEditingStaff(null);
      setTimeout(() => setToastMessage(null), 4000);
      fetchStaff();
    } catch (err: any) {
      alert(err.message || 'Failed to save staff member');
    }
  };

  const handleConfirmArchive = async () => {
    if (!archiveModal) return;
    try {
      await ownerApi.archiveStaff(archiveModal.id);
      setToastMessage(`Staff member ${archiveModal.name} deactivated.`);
      setArchiveModal(null);
      setTimeout(() => setToastMessage(null), 3500);
      fetchStaff();
    } catch (err: any) {
      alert(err.message || 'Failed to deactivate staff');
    }
  };

  const columns: Column<StaffMember>[] = [
    {
      header: 'Staff Name',
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs">
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
      cell: (row) => <Badge variant="purple">{row.role}</Badge>
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
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800"
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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Staff Management</h1>
          <p className="text-xs text-slate-500">Manage property wardens, technicians, security personnel, shifts, and payroll</p>
        </div>
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
      </div>

      <Table columns={columns} data={staff} keyExtractor={(item) => item.id} isLoading={isLoading} />

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
                { label: 'Security Guard', value: 'SECURITY' },
                { label: 'Housekeeping', value: 'HOUSEKEEPING' },
                { label: 'Receptionist', value: 'RECEPTIONIST' },
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
