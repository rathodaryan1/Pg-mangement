import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  DoorClosed,
  BedDouble,
  CreditCard,
  KeyRound,
  ShieldAlert,
  ArrowLeft,
  ExternalLink,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge, Badge } from '../../components/ui/Badge';
import { superAdminApi } from '../../services/superAdminApi';
import { useToast } from '../../context/ToastContext';
import api from '../../lib/api';

export const SuperAdminTenantDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tenant, setTenant] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenant = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await superAdminApi.getTenantById(id);
      setTenant(data);
    } catch (err: any) {
      console.error('Failed to load tenant details:', err);
      setError(err.message || 'Tenant organization not found.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenant();
  }, [id]);

  const handleImpersonate = async () => {
    if (!id) return;
    try {
      const currentSuperToken = api.getToken();
      if (currentSuperToken) {
        localStorage.setItem('saas_superadmin_original_token', currentSuperToken);
      }

      const res = await superAdminApi.impersonateTenant(id);
      if (res && res.token) {
        api.setToken(res.token);
        localStorage.setItem('urbannest_user_session', JSON.stringify(res.user));
        toast.success(`Impersonating owner for "${tenant?.name || 'Tenant'}"`);
        window.location.href = '/owner/dashboard';
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to initiate impersonation.');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-slate-200 rounded-lg" />
        <div className="h-96 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-[#DDE2DD] space-y-4 max-w-md mx-auto mt-10">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-[#18231F]">Tenant Not Found</h3>
        <p className="text-xs text-[#68736D]">{error || 'Unable to retrieve organization profile.'}</p>
        <Button variant="secondary" size="sm" onClick={() => navigate('/super-admin/tenants')} leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
          Back to Tenants Directory
        </Button>
      </div>
    );
  }

  const owner = tenant.users?.find((u: any) => u.role === 'OWNER') || tenant.users?.[0];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => navigate('/super-admin/tenants')} leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
            Tenants
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#18231F] flex items-center gap-2">
              <Building2 className="w-6 h-6 text-[#0B4036]" />
              {tenant.name}
            </h1>
            <p className="text-xs text-[#68736D]">
              Slug: <span className="font-mono text-[#0B4036]">{tenant.slug}</span> • Created on {new Date(tenant.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleImpersonate}
            className="text-[#0B4036] border-[#0B4036]/30 hover:bg-[#EAF2EE]"
            leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
          >
            Impersonate Session
          </Button>
          <Button variant="secondary" size="sm" onClick={fetchTenant} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Tenant Dossier */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Info Card */}
          <Card className="p-6 border-[#DDE2DD] space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-[#DDE2DD] pb-4">
              <div>
                <p className="text-xs text-[#8A928D] uppercase font-bold tracking-wider">PG Business Organization</p>
                <h3 className="text-lg font-bold text-[#18231F]">{tenant.name}</h3>
                <p className="text-xs text-[#68736D] mt-0.5">{tenant.address || 'Address not specified'}, {tenant.city || 'Bengaluru'}, {tenant.state || 'Karnataka'}</p>
              </div>
              <StatusBadge status={tenant.status} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-[#F8F7F3] rounded-xl border border-[#DDE2DD]">
                <span className="text-[10px] text-[#8A928D] uppercase font-semibold">Active Plan</span>
                <p className="font-bold text-[#C8A45D] text-sm mt-0.5">{tenant.plan}</p>
              </div>
              <div className="p-3 bg-[#F8F7F3] rounded-xl border border-[#DDE2DD]">
                <span className="text-[10px] text-[#8A928D] uppercase font-semibold">PG Branches Limit</span>
                <p className="font-bold text-[#18231F] text-sm mt-0.5">{tenant.properties?.length || 0} / {tenant.maxProperties}</p>
              </div>
              <div className="p-3 bg-[#F8F7F3] rounded-xl border border-[#DDE2DD]">
                <span className="text-[10px] text-[#8A928D] uppercase font-semibold">Room Capacity Limit</span>
                <p className="font-bold text-[#18231F] text-sm mt-0.5">{tenant.maxRooms} Rooms</p>
              </div>
            </div>

            {/* Owner Section */}
            <div className="p-4 bg-[#FAF5EB] rounded-xl border border-[#C8A45D]/30 space-y-2">
              <h4 className="text-xs font-bold text-[#18231F] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#0B4036]" />
                Primary Owner & Administrator
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-[#8A928D]">Name:</span>
                  <p className="font-bold text-[#18231F]">{owner?.name || 'Rajesh Singhania'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-[#8A928D]">Email:</span>
                  <p className="font-mono text-[#0B4036]">{owner?.email || tenant.email}</p>
                </div>
                <div>
                  <span className="text-[10px] text-[#8A928D]">Mobile:</span>
                  <p className="text-[#18231F]">{owner?.mobile || tenant.phone || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-[#8A928D]">Account Role:</span>
                  <p className="font-semibold text-[#0B4036]">OWNER (Full Admin Access)</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Properties / Branches List */}
          <Card className="p-5 border-[#DDE2DD] space-y-4">
            <h3 className="text-sm font-bold text-[#18231F] flex items-center justify-between">
              <span>Managed PG Branches ({tenant.properties?.length || 0})</span>
            </h3>

            <div className="space-y-3">
              {tenant.properties?.length === 0 ? (
                <p className="text-xs text-[#68736D] text-center py-4">No PG properties registered under this tenant.</p>
              ) : (
                tenant.properties?.map((prop: any) => (
                  <div key={prop.id} className="p-3.5 rounded-xl bg-[#F8F7F3] border border-[#DDE2DD] flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <p className="font-bold text-[#18231F] text-sm">{prop.name}</p>
                      <p className="text-[#68736D]">{prop.address}, {prop.city}</p>
                    </div>
                    <div className="text-right space-y-0.5">
                      <span className="font-bold text-[#0B4036]">{prop._count?.rooms || 0} Rooms</span>
                      <p className="text-[11px] text-[#8A928D]">{prop._count?.residents || 0} Residents</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right Col: Audit Trail & Subscription */}
        <div className="space-y-6">
          <Card className="p-5 border-[#DDE2DD] space-y-4">
            <h3 className="text-sm font-bold text-[#18231F] flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-[#C8A45D]" />
              SaaS Subscription Details
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-[#DDE2DD]">
                <span className="text-[#68736D]">Subscription Plan:</span>
                <span className="font-bold text-[#0B4036]">{tenant.plan}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#DDE2DD]">
                <span className="text-[#68736D]">Subscription Status:</span>
                <span className="font-semibold text-[#18231F]">{tenant.subscriptionStatus || 'ACTIVE'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#DDE2DD]">
                <span className="text-[#68736D]">Trial Ends:</span>
                <span className="text-[#18231F]">
                  {tenant.trialEndsAt ? new Date(tenant.trialEndsAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#DDE2DD]">
                <span className="text-[#68736D]">Started On:</span>
                <span className="text-[#18231F]">
                  {new Date(tenant.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </Card>

          {/* Tenant Audit Logs */}
          <Card className="p-5 border-[#DDE2DD] space-y-3">
            <h3 className="text-sm font-bold text-[#18231F] flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#0B4036]" />
              Tenant Activity History
            </h3>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {tenant.auditLogs?.length === 0 ? (
                <p className="text-xs text-[#68736D] text-center py-4">No audit events recorded</p>
              ) : (
                tenant.auditLogs?.map((log: any) => (
                  <div key={log.id} className="p-2.5 rounded-lg bg-[#F8F7F3] border border-[#DDE2DD] text-[11px] space-y-0.5">
                    <div className="flex items-center justify-between font-bold text-[#18231F]">
                      <span>{log.action}</span>
                      <span className="text-[10px] text-[#8A928D]">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[#68736D]">{log.details}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminTenantDetailPage;
