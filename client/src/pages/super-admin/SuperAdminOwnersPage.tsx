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
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { StatusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { superAdminApi } from '../../services/superAdminApi';
import { useToast } from '../../context/ToastContext';
import api from '../../lib/api';

export const SuperAdminOwnersPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [owners, setOwners] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Reset Password Modal
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const fetchOwners = async () => {
    setIsLoading(true);
    try {
      const data = await superAdminApi.getOwners(searchQuery || undefined);
      setOwners(data || []);
    } catch (err: any) {
      console.error('Failed to load owners:', err);
      toast.error('Failed to load PG owners directory.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOwners();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOwners();
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

  const handleOpenReset = (owner: any) => {
    setSelectedOwner(owner);
    setNewPassword('SecurePass@' + Math.floor(1000 + Math.random() * 9000));
    setResetModalOpen(true);
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOwner || !newPassword) return;

    setIsResetting(true);
    try {
      await superAdminApi.resetOwnerPassword(selectedOwner.tenantId, newPassword);
      toast.success(`Password reset for ${selectedOwner.name} (${selectedOwner.email}).`);
      setResetModalOpen(false);
      setSelectedOwner(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password.');
    } finally {
      setIsResetting(false);
    }
  };

  const columns: Column<any>[] = [
    {
      header: 'Owner Administrator',
      cell: (o) => (
        <div>
          <p className="font-bold text-[#18231F]">{o.name}</p>
          <p className="text-[11px] text-[#68736D] flex items-center gap-1">
            <Mail className="w-3 h-3 text-[#8A928D]" /> {o.email}
          </p>
        </div>
      ),
    },
    {
      header: 'Assigned PG Tenant',
      cell: (o) => (
        <div>
          <p className="font-semibold text-[#0B4036] flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            <span>{o.tenant?.name || 'Default Tenant'}</span>
          </p>
          <span className="text-[10px] text-[#8A928D]">{o.tenant?.city || 'Ahmedabad'}</span>
        </div>
      ),
    },
    {
      header: 'Contact Phone',
      cell: (o) => (
        <span className="text-xs text-[#18231F] font-mono">
          {o.mobile || '+91 98765 00000'}
        </span>
      ),
    },
    {
      header: 'Tenant Status',
      cell: (o) => <StatusBadge status={o.tenant?.status || 'ACTIVE'} />,
    },
    {
      header: 'Joined On',
      cell: (o) => (
        <span className="text-xs text-[#68736D]">
          {new Date(o.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (o) => (
        <div className="flex items-center justify-end gap-2">
          {o.tenantId && (
            <Button
              variant="outline"
              size="xs"
              onClick={() => handleImpersonate(o.tenantId)}
              className="text-[#0B4036] border-[#0B4036]/30 hover:bg-[#EAF2EE]"
              leftIcon={<ExternalLink className="w-3 h-3" />}
            >
              Impersonate
            </Button>
          )}

          <Button
            variant="secondary"
            size="xs"
            onClick={() => handleOpenReset(o)}
            leftIcon={<KeyRound className="w-3 h-3 text-[#0B4036]" />}
          >
            Reset Password
          </Button>
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
            PG Business Owners Directory
          </h1>
          <p className="text-xs text-[#68736D] mt-0.5">
            Directory of all primary PG business administrators across all subscribed organizations
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={fetchOwners} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
          Refresh Directory
        </Button>
      </div>

      {/* Search Bar */}
      <Card className="p-4 border-[#DDE2DD]">
        <form onSubmit={handleSearch} className="flex gap-3 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A928D]" />
            <input
              type="text"
              placeholder="Search owner by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#DDE2DD] bg-white text-[#18231F] focus:outline-none focus:ring-1 focus:ring-[#0B4036]"
            />
          </div>
          <Button variant="primary" size="sm" type="submit">
            Search
          </Button>
        </form>
      </Card>

      {/* Table */}
      <Card className="p-0 border-[#DDE2DD] overflow-hidden">
        <Table
          columns={columns}
          data={owners}
          keyExtractor={(o) => o.id}
          isLoading={isLoading}
          emptyMessage="No PG owners found."
        />
      </Card>

      {/* Reset Password Modal */}
      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset Owner Password"
        maxWidth="sm"
      >
        <form onSubmit={handleConfirmReset} className="space-y-4 pt-1">
          <p className="text-xs text-[#68736D]">
            Reset password for <strong>{selectedOwner?.name}</strong> ({selectedOwner?.email}):
          </p>
          <Input
            label="New Password"
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

export default SuperAdminOwnersPage;
