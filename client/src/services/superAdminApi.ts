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

export interface SupportTicketItem {
  id: string;
  tenantId?: string | null;
  creatorEmail: string;
  creatorName?: string | null;
  subject: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_CUSTOMER' | 'RESOLVED' | 'CLOSED';
  assignedAdmin?: string | null;
  internalNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    email: string;
  } | null;
}

export interface UserItem {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'OWNER' | 'MANAGER' | 'RECEPTIONIST' | 'ACCOUNTANT' | 'MAINTENANCE' | 'RESIDENT';
  mobile?: string | null;
  tenantId?: string | null;
  propertyId?: string | null;
  createdAt: string;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    status: string;
  } | null;
  property?: {
    id: string;
    name: string;
    city: string;
  } | null;
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
    password?: string;
    temporaryPassword?: string;
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

  getTenantProperties: async (id: string) => {
    const res = await api.get<any[]>(`/super-admin/tenants/${id}/properties`);
    return res.data;
  },

  getTenantSubscription: async (id: string) => {
    const res = await api.get<any>(`/super-admin/tenants/${id}/subscription`);
    return res.data;
  },

  updateTenantSubscription: async (
    id: string,
    data: {
      plan?: string;
      subscriptionStatus?: string;
      trialDaysExtension?: number;
      maxProperties?: number;
      maxRooms?: number;
      maxResidents?: number;
    }
  ) => {
    const res = await api.patch<any>(`/super-admin/tenants/${id}/subscription`, data);
    return res.data;
  },

  // 3. Owners Directory
  getOwners: async (search?: string) => {
    const url = search ? `/super-admin/owners?search=${encodeURIComponent(search)}` : '/super-admin/owners';
    const res = await api.get<any[]>(url);
    return res.data;
  },

  // 4. Unified Users Directory
  getUsers: async (params?: { search?: string; role?: string; tenantId?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.role && params.role !== 'ALL') query.append('role', params.role);
    if (params?.tenantId && params.tenantId !== 'ALL') query.append('tenantId', params.tenantId);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));

    const res = await api.get<{ users: UserItem[]; pagination: any }>(`/super-admin/users?${query.toString()}`);
    return res.data;
  },

  // 5. Plans CRUD
  getPlans: async () => {
    const res = await api.get<Plan[]>('/super-admin/plans');
    return res.data;
  },

  createPlan: async (data: Partial<Plan>) => {
    const res = await api.post<Plan>('/super-admin/plans', data);
    return res.data;
  },

  updatePlan: async (id: string, data: Partial<Plan>) => {
    const res = await api.patch<Plan>(`/super-admin/plans/${id}`, data);
    return res.data;
  },

  deletePlan: async (id: string) => {
    const res = await api.delete<any>(`/super-admin/plans/${id}`);
    return res.data;
  },

  // 6. Support Tickets
  getSupportTickets: async (params?: { search?: string; status?: string; priority?: string; tenantId?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);
    if (params?.priority && params.priority !== 'ALL') query.append('priority', params.priority);
    if (params?.tenantId && params.tenantId !== 'ALL') query.append('tenantId', params.tenantId);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));

    const res = await api.get<{ tickets: SupportTicketItem[]; pagination: any }>(`/super-admin/support?${query.toString()}`);
    return res.data;
  },

  createSupportTicket: async (data: {
    tenantId?: string;
    creatorEmail?: string;
    creatorName?: string;
    subject: string;
    description: string;
    priority?: string;
  }) => {
    const res = await api.post<SupportTicketItem>('/super-admin/support', data);
    return res.data;
  },

  updateSupportTicket: async (
    id: string,
    data: {
      status?: string;
      priority?: string;
      assignedAdmin?: string;
      internalNotes?: string;
    }
  ) => {
    const res = await api.patch<SupportTicketItem>(`/super-admin/support/${id}`, data);
    return res.data;
  },

  // 7. Platform Settings
  getSettings: async () => {
    const res = await api.get<Record<string, string>>('/super-admin/settings');
    return res.data;
  },

  updateSettings: async (settings: Record<string, any>) => {
    const res = await api.post<Record<string, string>>('/super-admin/settings', settings);
    return res.data;
  },

  // 8. Audit Logs
  getAuditLogs: async (params?: { tenantId?: string; action?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.tenantId && params.tenantId !== 'ALL') query.append('tenantId', params.tenantId);
    if (params?.action && params.action !== 'ALL') query.append('action', params.action);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));

    const res = await api.get<{ logs: any[]; pagination: any }>(`/super-admin/audit-logs?${query.toString()}`);
    return res.data;
  },

  // 9. System Health
  getSystemHealth: async () => {
    const res = await api.get<any>('/super-admin/system-health');
    return res.data;
  },
};
