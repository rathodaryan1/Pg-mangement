import { api } from './api';
import type {
  Menu,
  KitchenIngredient,
  PurchaseRequest,
  Lead,
  Booking,
  HousekeepingTask,
  UtilityReading,
} from '../types';

export const saasApi = {
  // Kitchen & Menus
  getMenus: (propertyId?: string, date?: string) =>
    api.get<Menu[]>('/kitchen/menus', { params: { propertyId, date } }),

  createOrUpdateMenu: (data: {
    propertyId?: string;
    date: string;
    mealPeriod: string;
    title: string;
    servingTime?: string;
    cutoffTime?: string;
    notes?: string;
    items?: Array<{ name: string; description?: string; dietaryType: string; allergens?: string }>;
  }) => api.post<Menu>('/kitchen/menus', data),

  optInOutMeal: (menuId: string, status: 'OPTED_IN' | 'OPTED_OUT', notes?: string) =>
    api.post('/kitchen/menus/participate', { menuId, status, notes }),

  getCookDashboard: () =>
    api.get<{
      totalActiveResidents: number;
      todayMeals: Array<{
        id: string;
        mealPeriod: string;
        title: string;
        servingTime?: string;
        cutoffTime?: string;
        expectedCount: number;
        optedInCount: number;
        optedOutCount: number;
        status: string;
        items: any[];
      }>;
      lowStockAlerts: KitchenIngredient[];
      pendingPurchaseRequests: PurchaseRequest[];
    }>('/kitchen/dashboard'),

  getKitchenInventory: (propertyId?: string) =>
    api.get<KitchenIngredient[]>('/kitchen/inventory', { params: { propertyId } }),

  recordStockMovement: (data: {
    ingredientId: string;
    propertyId?: string;
    type: 'STOCK_IN' | 'CONSUMED' | 'WASTED';
    quantity: number;
    reason?: string;
  }) => api.post('/kitchen/inventory/movement', data),

  createPurchaseRequest: (data: {
    propertyId?: string;
    itemTitle: string;
    quantity: number;
    unit: string;
    estimatedCost?: number;
    notes?: string;
  }) => api.post<PurchaseRequest>('/kitchen/inventory/purchase-request', data),

  // Security Guard & Visitors
  getVisitorLog: (propertyId?: string, status?: string, date?: string) =>
    api.get<any[]>('/security/visitors', { params: { propertyId, status, date } }),

  verifyPass: (tokenOrId: { token?: string; visitorId?: string }) =>
    api.post<any>('/security/verify-pass', tokenOrId),

  checkInVisitor: (tokenOrId: { token?: string; visitorId?: string }) =>
    api.post('/security/check-in', tokenOrId),

  checkOutVisitor: (tokenOrId: { token?: string; visitorId?: string }) =>
    api.post('/security/check-out', tokenOrId),

  registerDirectEntry: (data: {
    propertyId?: string;
    visitorName: string;
    visitorMobile: string;
    purpose?: string;
    residentId?: string;
    expectedExitTime?: string;
  }) => api.post('/security/direct-entry', data),

  getGuardDashboard: () =>
    api.get<{
      currentlyInside: number;
      todayTotal: number;
      pendingApprovals: number;
      activeSOS: any[];
    }>('/security/dashboard'),

  // Housekeeping
  getHousekeepingTasks: (propertyId?: string, status?: string) =>
    api.get<HousekeepingTask[]>('/housekeeping/tasks', { params: { propertyId, status } }),

  createHousekeepingTask: (data: Partial<HousekeepingTask>) =>
    api.post<HousekeepingTask>('/housekeeping/tasks', data),

  updateHousekeepingTask: (id: string, status: string, notes?: string) =>
    api.patch<HousekeepingTask>(`/housekeeping/tasks/${id}`, { status, notes }),

  verifyHousekeepingTask: (id: string, notes?: string) =>
    api.post<HousekeepingTask>(`/housekeeping/tasks/${id}/verify`, { notes }),

  getHousekeepingDashboard: () =>
    api.get<{
      stats: { pending: number; inProgress: number; completed: number };
      recentTasks: HousekeepingTask[];
    }>('/housekeeping/dashboard'),

  // Leads & Bookings
  getLeads: (propertyId?: string, status?: string) =>
    api.get<Lead[]>('/saas/leads', { params: { propertyId, status } }),

  createLead: (data: Partial<Lead>) =>
    api.post<Lead>('/saas/leads', data),

  updateLeadStatus: (id: string, status: string, notes?: string, followUpDate?: string, assignedTo?: string) =>
    api.patch<Lead>(`/saas/leads/${id}`, { status, notes, followUpDate, assignedTo }),

  updateLeadReferral: (id: string, data: { referrerName?: string; referrerPhone?: string; referralCommission?: number; commissionStatus?: string }) =>
    api.patch<Lead>(`/saas/leads/${id}/referral`, data),

  updateWhatsAppConsent: (id: string, data: { consent?: boolean; optOut?: boolean }) =>
    api.patch<Lead>(`/saas/leads/${id}/whatsapp`, data),

  getBookings: (propertyId?: string, status?: string) =>
    api.get<Booking[]>('/saas/bookings', { params: { propertyId, status } }),

  createBooking: (data: Partial<Booking>) =>
    api.post<Booking>('/saas/bookings', data),

  // Utilities
  getUtilities: (propertyId?: string, type?: string) =>
    api.get<UtilityReading[]>('/saas/utilities', { params: { propertyId, type } }),

  recordUtility: (data: Partial<UtilityReading>) =>
    api.post<UtilityReading>('/saas/utilities', data),

  // AI Business Assistant
  askAIAssistant: (query: string, propertyId?: string) =>
    api.post<{
      query: string;
      answer: string;
      insights: string[];
      timestamp: string;
    }>('/saas/ai/ask', { query, propertyId }),

  // Public Property & Booking Website
  getPublicProperty: (identifier: string) =>
    api.get<any>(`/saas/public/property/${identifier}`),

  submitPublicEnquiry: (data: {
    propertyId: string;
    name: string;
    email: string;
    phone: string;
    roomType?: string;
    visitDate?: string;
    notes?: string;
  }) => api.post('/saas/public/booking-enquiry', data),
};
