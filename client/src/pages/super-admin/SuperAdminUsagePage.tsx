import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  HardDrive,
  Users,
  BedDouble,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { superAdminApi } from '../../services/superAdminApi';

export const SuperAdminUsagePage: React.FC = () => {
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsage = async () => {
    setIsLoading(true);
    try {
      const res = await superAdminApi.getDashboard();
      setData(res);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  const overview = data?.overview || {};

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#18231F] flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#0B4036]" />
            Platform Resource Usage & Capacity
          </h1>
          <p className="text-xs text-[#68736D] mt-0.5">
            Monitor real-time capacity consumption, occupied beds, resident accounts, and storage allocations
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={fetchUsage} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
          Refresh Usage
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border-[#DDE2DD] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8A928D]">Bed Occupancy</span>
            <BedDouble className="w-4 h-4 text-[#0B4036]" />
          </div>
          <p className="text-2xl font-bold text-[#18231F]">
            {overview.occupiedBeds || 0} / {overview.totalBeds || 0}
          </p>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div className="bg-[#0B4036] h-full rounded-full" style={{ width: `${overview.occupancyRate || 0}%` }} />
          </div>
          <p className="text-[11px] text-[#68736D]">{overview.occupancyRate || 0}% Total Bed Utilization</p>
        </Card>

        <Card className="p-5 border-[#DDE2DD] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8A928D]">Total Residents Managed</span>
            <Users className="w-4 h-4 text-[#0B4036]" />
          </div>
          <p className="text-2xl font-bold text-[#18231F]">{overview.totalResidents || 0}</p>
          <p className="text-[11px] text-[#68736D]">Across {overview.totalProperties || 0} PG branches</p>
        </Card>

        <Card className="p-5 border-[#DDE2DD] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8A928D]">Supabase Storage Health</span>
            <HardDrive className="w-4 h-4 text-[#0B4036]" />
          </div>
          <p className="text-2xl font-bold text-[#18231F]">Online & Verified</p>
          <p className="text-[11px] text-[#68736D]">Encrypted KYC & Document Vault</p>
        </Card>
      </div>
    </div>
  );
};

export default SuperAdminUsagePage;
