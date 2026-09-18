import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Building2,
  KeyRound,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Mail,
  Phone,
  UserCheck,
  Filter,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { StatusBadge, Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { superAdminApi } from '../../services/superAdminApi';
import type { UserItem } from '../../services/superAdminApi';
import { useToast } from '../../context/ToastContext';
import api from '../../lib/api';

export const SuperAdminUsersPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [tenantFilter, setTenantFilter] = useState('ALL');
  const [tenantsList, setTenantsList] = useState<any[]>([]);

  // Password reset modal
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await superAdminApi.getUsers({
        search: searchQuery || undefined,
        role: roleFilter,
        tenantId: tenantFilter,
        limit: 100,
      });
      setUsers(res.users || []);
    } catch (err: any) {
      console.error('Failed to load platform users:', err);
      toast.error('Failed to retrieve users directory.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTenantsDropdown = async () => {
    try {
      const res = await superAdminApi.getTenants({ limit: 100 });
      setTenantsList(res.tenants || []);
    } catch (err) {
      console.error('Failed to load tenants dropdown:', err);
    }
  };

  useEffect(() => {
    fetchTenantsDropdown();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, tenantFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleImpersonate = async (tenantId: string) => {
    try {
      const currentSuperToken = api.getToken();
      if (currentSuperToken) {
        localStorage.setItem('saas_superadmin_original_token', currentSuperToken);
      }

      const res = await superAdminApi.impersonateTenant(tenantId);
      if (res && res.token) {
        api.setToken(res.token);
        localStorage.setItem('urbannest_user_session', JSON.stringify(res.user));
        toast.success(`Impersonating owner for "${res.user.tenantName || 'Tenant'}"`);
        window.location.href = '/owner/dashboard';
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to initiate impersonation session.');
    }
  };

  const handleOpenReset = (user: UserItem) => {
    setSelectedUser(user);
    setNewPassword('SecurePass@' + Math.floor(1000 + Math.random() * 9000));
    setResetModalOpen(true);
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;

    if (!selectedUser.tenantId) {
      toast.error('Cannot reset password for unassigned user.');
      return;
    }

    setIsResetting(true);
    try {
      await superAdminApi.resetOwnerPassword(selectedUser.tenantId, newPassword);
      toast.success(`Password reset for ${selectedUser.name} (${selectedUser.email}).`);
      setResetModalOpen(false);
      setSelectedUser(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password.');
    } finally {
      setIsResetting(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'danger';
      case 'OWNER':
        return 'gold';
      case 'MANAGER':
        return 'primary';
      case 'RESIDENT':
        return 'success';
      default:
        return 'default';
    }
  };

  const columns: Column<UserItem>[] = [
    {
      header: 'User Profile',
      cell: (u) => (
        <div>
          <p className="font-bold text-[#18231F]">{u.name}</p>
          <p className="text-[11px] text-[#68736D] flex items-center gap-1">
            <Mail className="w-3 h-3 text-[#8A928D]" /> {u.email}
          </p>
        </div>
      ),
    },
    {
      header: 'Assigned Role',
      cell: (u) => (
        <span className="px-2.5 py-1 rounded-full bg-[#EAF2EE] text-[#0B4036] font-bold text-xs border border-[#0B4036]/20">
          {u.role}
        </span>
      ),
    },
    {
      header: 'PG Tenant Organization',
      cell: (u) => (
        <div>
          {u.tenant ? (
            <button
              onClick={() => navigate(`/super-admin/tenants/${u.tenant?.id}`)}
              className="font-semibold text-[#0B4036] hover:underline flex items-center gap-1.5 text-left"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{u.tenant.name}</span>
            </button>
          ) : (
            <span className="text-xs text-[#8A928D]">Platform Root (No Tenant)</span>
          )}
        </div>
      ),
    },
    {
      header: 'Mobile Contact',
      cell: (u) => (
        <span className="text-xs text-[#18231F] font-mono">
          {u.mobile || '+91 98765 00000'}
        </span>
      ),
    },
    {
      header: 'Created On',
      cell: (u) => (
        <span className="text-xs text-[#68736D]">
          {new Date(u.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (u) => (
        <div className="flex items-center justify-end gap-2">
          {u.role === 'OWNER' && u.tenantId && (
            <Button
              variant="outline"
              size="xs"
              onClick={() => handleImpersonate(u.tenantId!)}
              className="text-[#0B4036] border-[#0B4036]/30 hover:bg-[#EAF2EE]"
              leftIcon={<ExternalLink className="w-3 h-3" />}
            >
              Impersonate
            </Button>
          )}

          {u.tenantId && (
            <Button
              variant="secondary"
              size="xs"
              onClick={() => handleOpenReset(u)}
              leftIcon={<KeyRound className="w-3 h-3 text-[#0B4036]" />}
            >
              Reset Password
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#18231F] flex items-center gap-2">
            <Users className="w-6 h-6 text-[#0B4036]" />
            Unified Platform Users Directory
          </h1>
          <p className="text-xs text-[#68736D] mt-0.5">
            Audit and manage system users, role-based access controls, and administrative privileges
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={fetchUsers} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
          Refresh Directory
        </Button>
      </div>

      {/* Role Breakdown KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-[#DDE2DD] bg-[#FAF5EB]">
          <p className="text-xs font-semibold text-[#8A928D]">Business Owners</p>
          <p className="text-xl font-bold text-[#18231F] mt-1">
            {users.filter((u) => u.role === 'OWNER').length}
          </p>
        </Card>

        <Card className="p-4 border-[#DDE2DD] bg-[#EAF2EE]">
          <p className="text-xs font-semibold text-[#8A928D]">Staff & Managers</p>
          <p className="text-xl font-bold text-[#18231F] mt-1">
            {users.filter((u) => ['MANAGER', 'RECEPTIONIST', 'ACCOUNTANT', 'MAINTENANCE'].includes(u.role)).length}
          </p>
        </Card>

        <Card className="p-4 border-[#DDE2DD] bg-blue-50">
          <p className="text-xs font-semibold text-[#8A928D]">Active Residents</p>
          <p className="text-xl font-bold text-[#18231F] mt-1">
            {users.filter((u) => u.role === 'RESIDENT').length}
          </p>
        </Card>

        <Card className="p-4 border-[#DDE2DD] bg-rose-50">
          <p className="text-xs font-semibold text-[#8A928D]">Super Administrators</p>
          <p className="text-xl font-bold text-[#18231F] mt-1">
            {users.filter((u) => u.role === 'SUPER_ADMIN').length}
          </p>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="p-4 border-[#DDE2DD]">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md w-full">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A928D]" />
              <input
                type="text"
                placeholder="Search user name, email, or mobile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#DDE2DD] bg-white text-[#18231F] focus:outline-none focus:ring-1 focus:ring-[#0B4036]"
              />
            </div>
            <Button variant="primary" size="sm" type="submit">
              Search
            </Button>
          </form>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-xs rounded-xl border border-[#DDE2DD] p-2 bg-white text-[#18231F]"
            >
              <option value="ALL">All Roles</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              <option value="OWNER">OWNER</option>
              <option value="MANAGER">MANAGER</option>
              <option value="RECEPTIONIST">RECEPTIONIST</option>
              <option value="ACCOUNTANT">ACCOUNTANT</option>
              <option value="MAINTENANCE">MAINTENANCE</option>
              <option value="RESIDENT">RESIDENT</option>
            </select>

            <select
              value={tenantFilter}
              onChange={(e) => setTenantFilter(e.target.value)}
              className="text-xs rounded-xl border border-[#DDE2DD] p-2 bg-white text-[#18231F] max-w-[180px]"
            >
              <option value="ALL">All Tenants</option>
              {tenantsList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="p-0 border-[#DDE2DD] overflow-hidden">
        <Table
          columns={columns}
          data={users}
          keyExtractor={(u) => u.id}
          isLoading={isLoading}
          emptyMessage="No platform users found matching your search."
        />
      </Card>

      {/* Reset Password Modal */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset User Password"
        maxWidth="sm"
      >
        <form onSubmit={handleConfirmReset} className="space-y-4 pt-1">
          <p className="text-xs text-[#68736D]">
            Reset password for <strong>{selectedUser?.name}</strong> ({selectedUser?.email}):
          </p>
          <Input
            label="New Temporary Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-[#DDE2DD]">
            <Button variant="secondary" size="sm" type="button" onClick={() => setResetModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isResetting}>
              Set New Password
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SuperAdminUsersPage;
