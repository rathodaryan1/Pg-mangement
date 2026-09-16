import React, { useState, useEffect } from 'react';
import { History, Shield, Search, Settings as SettingsIcon, Building, Key, Bell, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input, Select } from '../../components/ui/Input';
import { Tabs } from '../../components/ui/Tabs';
import type { Column } from '../../components/ui/Table';
import { Table } from '../../components/ui/Table';
import { useAuth } from '../../context/AuthContext';
import { ownerApi } from '../../services/ownerApi';
import type { AuditLog } from '../../types';

export const AuditLogsPage: React.FC = () => {
  const { activeProperty } = useAuth();
  const [activeTab, setActiveTab] = useState<'logs' | 'settings'>('logs');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [logsRes, settingsRes] = await Promise.all([
        ownerApi.getAuditLogs(activeProperty.id),
        ownerApi.getSettings(activeProperty.id)
      ]);
      setLogs(logsRes.data || []);
      setSettings(settingsRes.data || null);
    } catch (err: any) {
      console.error('Failed to fetch audit logs and settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeProperty]);

  const filteredLogs = logs.filter((l) => {
    const matchesSearch =
      (l.actorName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.action || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.targetEntity || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.details || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const columns: Column<AuditLog>[] = [
    {
      header: 'Actor',
      cell: (row) => (
        <div>
          <p className="font-bold text-xs text-slate-900 dark:text-white">{row.actorName || 'System Admin'}</p>
          <Badge variant="purple">{row.actorRole || 'OWNER'}</Badge>
        </div>
      )
    },
    {
      header: 'Action',
      cell: (row) => <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{row.action}</span>
    },
    {
      header: 'Target Entity',
      accessorKey: 'targetEntity'
    },
    {
      header: 'Timestamp',
      cell: (row) => <span className="text-xs text-slate-400">{new Date(row.timestamp).toLocaleString()}</span>
    },
    {
      header: 'Details / Context',
      accessorKey: 'details'
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-purple-600" />
          Security Audit Trail & Property Configuration
        </h1>
        <p className="text-xs text-slate-500">
          Immutable security trail recording administrative, financial, and lifecycle events, and property parameters
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'logs', label: `Immutable Audit Logs (${logs.length})`, icon: <History className="w-4 h-4 text-blue-600" /> },
          { id: 'settings', label: 'Property & Operations Settings', icon: <SettingsIcon className="w-4 h-4 text-slate-600" /> }
        ]}
        activeTab={activeTab}
        onChange={(tab) => setActiveTab(tab as any)}
      />

      {activeTab === 'logs' && (
        <div className="space-y-4">
          <Card className="p-4 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="w-full md:w-80">
              <Input
                placeholder="Search actor, action, details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              />
            </div>
            <div className="text-xs text-slate-400">
              All records tamper-resistant & timestamped
            </div>
          </Card>

          <Table columns={columns} data={filteredLogs} keyExtractor={(item) => item.id} isLoading={isLoading} />
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" />
              Property Profile
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-medium">Property Name</label>
                <Input defaultValue={activeProperty.name} readOnly />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-medium">City</label>
                  <Input defaultValue={activeProperty.city || 'Bangalore'} readOnly />
                </div>
                <div>
                  <label className="text-slate-400 font-medium">Property Type</label>
                  <Input defaultValue="Co-Living PG" readOnly />
                </div>
              </div>
              <div>
                <label className="text-slate-400 font-medium">Registered Address</label>
                <Input defaultValue={activeProperty.address || 'Koramangala 4th Block, Bangalore'} readOnly />
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-purple-600" />
              Operational & Visitor Policies
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-medium">Gate Curfew Time</label>
                <Input defaultValue="10:30 PM (All Days)" readOnly />
              </div>
              <div>
                <label className="text-slate-400 font-medium">Visitor QR Expiration Window</label>
                <Input defaultValue="24 Hours from Approval" readOnly />
              </div>
              <div>
                <label className="text-slate-400 font-medium">Notice Period Policy</label>
                <Input defaultValue="30 Days Standard" readOnly />
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
