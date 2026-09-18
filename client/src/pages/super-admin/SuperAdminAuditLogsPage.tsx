import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Clock,
  User,
  Building2,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { superAdminApi } from '../../services/superAdminApi';
import { useToast } from '../../context/ToastContext';

export const SuperAdminAuditLogsPage: React.FC = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await superAdminApi.getAuditLogs({ limit: 100 });
      setLogs(res.logs || []);
    } catch (err: any) {
      toast.error('Failed to load audit trail.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const columns: Column<any>[] = [
    {
      header: 'Timestamp',
      cell: (l) => (
        <span className="text-xs text-[#68736D] whitespace-nowrap">
          {new Date(l.timestamp).toLocaleString()}
        </span>
      ),
    },
    {
      header: 'Action',
      cell: (l) => (
        <span className="px-2 py-0.5 rounded-full bg-[#FAF5EB] text-[#C8A45D] border border-[#C8A45D]/40 text-[11px] font-bold">
          {l.action}
        </span>
      ),
    },
    {
      header: 'Tenant Organization',
      cell: (l) => (
        <span className="text-xs font-semibold text-[#0B4036]">
          {l.tenant?.name || 'Platform Wide'}
        </span>
      ),
    },
    {
      header: 'Actor',
      cell: (l) => (
        <div>
          <p className="font-semibold text-[#18231F] text-xs">{l.actorName}</p>
          <p className="text-[10px] text-[#8A928D]">{l.actorRole}</p>
        </div>
      ),
    },
    {
      header: 'Event Details',
      cell: (l) => (
        <span className="text-xs text-[#68736D]">
          {l.details}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#18231F] flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-[#0B4036]" />
            Platform-Wide Audit Logs
          </h1>
          <p className="text-xs text-[#68736D] mt-0.5">
            Immutable security and administrative event trail across all tenants, owners, and platform operators
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={fetchLogs} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
          Refresh Audit Trail
        </Button>
      </div>

      <Card className="p-0 border-[#DDE2DD] overflow-hidden">
        <Table
          columns={columns}
          data={logs}
          keyExtractor={(l) => l.id}
          isLoading={isLoading}
          emptyMessage="No platform audit log records found."
        />
      </Card>
    </div>
  );
};

export default SuperAdminAuditLogsPage;
