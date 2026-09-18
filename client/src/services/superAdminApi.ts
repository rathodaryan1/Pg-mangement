import api from '../lib/api';
import type { Tenant, Plan } from '../types';

export interface SuperAdminDashboardData {
  overview: {
    totalTenants: number;
    activeTenants: number;
    trialTenants: number;
    suspendedTenants: number;
    totalProperties: number;
    totalOwners: number;
    totalResidents: number;
    totalStaff: number;
    totalRooms: number;
    totalBeds: number;
    occupiedBeds: number;
    occupancyRate: number;
    monthlySaaSRevenue: number;
  };
  tenantsByPlan: Array<{ plan: string; _count: { id: number } }>;
  recentActivity: any[];
  systemHealth: {
    database: string;
    api: string;
    storage: string;
    gateway: string;
  };
}

export const superAdminApi = {
  // 1. Dashboard
  getDashboard: async () => {
    const res = await api.get<SuperAdminDashboardData>('/super-admin/dashboard');
    return res.data;
  },

  // 2. Tenants
  getTenants: async (params?: { search?: string; status?: string; plan?: string; city?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);
    if (params?.plan && params.plan !== 'ALL') query.append('plan', params.plan);
    if (params?.city && params.city !== 'ALL') query.append('city', params.city);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));

    const res = await api.get<{ tenants: Tenant[]; pagination: any }>(`/super-admin/tenants?${query.toString()}`);
    return res.data;
  },

  getTenantById: async (id: string) => {
    const res = await api.get<Tenant>(`/super-admin/tenants/${id}`);
    return res.data;
  },

  createTenant: async (data: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    ownerName: string;
    ownerEmail: string;
    ownerMobile?: string;
    password: string;
    plan?: string;
    trialDays?: number;
  }) => {
    const res = await api.post<any>('/super-admin/tenants', data);
    return res.data;
  },

  updateTenant: async (id: string, data: Partial<Tenant>) => {
    const res = await api.put<Tenant>(`/super-admin/tenants/${id}`, data);
    return res.data;
  },

  deleteTenant: async (id: string) => {
    const res = await api.delete<any>(`/super-admin/tenants/${id}`);
    return res.data;
  },

  suspendTenant: async (id: string, reason?: string) => {
    const res = await api.post<Tenant>(`/super-admin/tenants/${id}/suspend`, { reason });
    return res.data;
  },

  activateTenant: async (id: string) => {
    const res = await api.post<Tenant>(`/super-admin/tenants/${id}/activate`, {});
    return res.data;
  },

  archiveTenant: async (id: string) => {
    const res = await api.post<Tenant>(`/super-admin/tenants/${id}/archive`, {});
    return res.data;
  },

  resetOwnerPassword: async (id: string, newPassword: string) => {
    const res = await api.post<any>(`/super-admin/tenants/${id}/reset-owner-password`, { newPassword });
    return res.data;
  },

  impersonateTenant: async (id: string) => {
    const res = await api.post<{ token: string; user: any }>(`/super-admin/tenants/${id}/impersonate`, {});
    return res.data;
  },

  // 3. Owners Directory
  getOwners: async (search?: string) => {
    const url = search ? `/super-admin/owners?search=${encodeURIComponent(search)}` : '/super-admin/owners';
    const res = await api.get<any[]>(url);
    return res.data;
  },

  // 4. Plans
  getPlans: async () => {
    const res = await api.get<Plan[]>('/super-admin/plans');
    return res.data;
  },

  // 5. Audit Logs
  getAuditLogs: async (params?: { tenantId?: string; action?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.tenantId && params.tenantId !== 'ALL') query.append('tenantId', params.tenantId);
    if (params?.action && params.action !== 'ALL') query.append('action', params.action);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));

    const res = await api.get<{ logs: any[]; pagination: any }>(`/super-admin/audit-logs?${query.toString()}`);
    return res.data;
  },

  // 6. System Health
  getSystemHealth: async () => {
    const res = await api.get<any>('/super-admin/system-health');
    return res.data;
  },
};
