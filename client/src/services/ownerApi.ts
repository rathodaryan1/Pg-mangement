import api from '../lib/api';

export interface OwnerDashboardData {
  kpis: {
    totalProperties: number;
    totalBuildings: number;
    totalRooms: number;
    totalBeds: number;
    occupiedBeds: number;
    availableBeds: number;
    occupancyRate: number;
    totalOccupancyPercentage?: number;
    activeResidentsCount: number;
    activeResidents?: number;
    pendingMoveInsCount?: number;
    noticePeriodCount?: number;
    totalRevenueCollected: number;
    monthlyRevenue?: number;
    totalOutstandingRent: number;
    outstandingRent?: number;
    totalSecurityDeposits?: number;
    totalDeposits?: number;
    overdueInvoicesCount?: number;
    openComplaintsCount?: number;
    openComplaints?: number;
    pendingVisitorsCount?: number;
    pendingVisitors?: number;
    activeVisitorPassesCount?: number;
    lowStockAlertsCount?: number;
    lowInventoryAlerts?: number;
    staffCount: number;
  };
  recentPayments: Array<any>;
  recentComplaints: Array<any>;
  recentVisitors: Array<any>;
  recentNotices: Array<any>;
  recentTasks: Array<any>;
  allResidents?: Array<any>;
  actionRequired: {
    overduePaymentsCount?: number;
    overdueRentsCount?: number;
    openComplaintsCount?: number;
    openMaintenanceCount?: number;
    pendingVisitorsCount?: number;
    lowStockCount?: number;
  };
}

export const ownerApi = {
  // 1. Dashboard
  getDashboard: async (propertyId?: string): Promise<{ data: OwnerDashboardData }> => {
    const res = await api.get<OwnerDashboardData>('/owner/dashboard', propertyId ? { propertyId } : undefined);
    return { data: res.data as OwnerDashboardData };
  },

  // 2. Properties (CRUD)
  getProperties: async (): Promise<{ data: any[] }> => {
    const res = await api.get<any[]>('/owner/properties');
    return { data: (res.data as any[]) || [] };
  },
  getPropertyById: async (id: string): Promise<{ data: any }> => {
    const res = await api.get<any>(`/owner/properties/${id}`);
    return { data: res.data };
  },
  createProperty: async (data: any): Promise<{ data: any }> => {
    const res = await api.post<any>('/owner/properties', data);
    return { data: res.data };
  },
  updateProperty: async (id: string, data: any): Promise<{ data: any }> => {
    const res = await api.patch<any>(`/owner/properties/${id}`, data);
    return { data: res.data };
  },
  archiveProperty: async (id: string): Promise<{ data: any }> => {
    const res = await api.delete<any>(`/owner/properties/${id}`);
    return { data: res.data };
  },

  // 3. Buildings & Floors (CRUD)
  getBuildings: async (propertyId?: string): Promise<{ data: any[] }> => {
    const res = await api.get<any[]>('/owner/buildings', propertyId ? { propertyId } : undefined);
    return { data: (res.data as any[]) || [] };
  },
  createBuilding: async (data: { propertyId?: string; name: string; code?: string; numberOfFloors?: number }): Promise<{ data: any }> => {
    const res = await api.post<any>('/owner/buildings', data);
    return { data: res.data };
  },
  updateBuilding: async (id: string, data: any): Promise<{ data: any }> => {
    const res = await api.patch<any>(`/owner/buildings/${id}`, data);
    return { data: res.data };
  },
  archiveBuilding: async (id: string): Promise<{ data: any }> => {
    const res = await api.delete<any>(`/owner/buildings/${id}`);
    return { data: res.data };
  },
  getFloors: async (): Promise<{ data: any[] }> => {
    const res = await api.get<any[]>('/owner/floors');
    return { data: (res.data as any[]) || [] };
  },
  createFloor: async (data: { floorNumber: number; buildingId?: string; buildingName?: string }): Promise<{ data: any }> => {
    const res = await api.post<any>('/owner/floors', data);
    return { data: res.data };
  },
  archiveFloor: async (id: string): Promise<{ data: any }> => {
    const res = await api.delete<any>(`/owner/floors/${id}`);
    return { data: res.data };
  },

  // 4. Rooms & Beds (CRUD)
  getRooms: async (params?: string | { propertyId?: string; status?: string; type?: string; search?: string }): Promise<{ data: any[] }> => {
    const query = typeof params === 'string' ? { propertyId: params } : params;
    const res = await api.get<any[]>('/owner/rooms', query);
    return { data: (res.data as any[]) || [] };
  },
  getRoomById: async (id: string): Promise<{ data: any }> => {
    const res = await api.get<any>(`/owner/rooms/${id}`);
    return { data: res.data };
  },
  createRoom: async (data: any): Promise<{ data: any }> => {
    const res = await api.post<any>('/owner/rooms', data);
    return { data: res.data };
  },
  updateRoom: async (id: string, data: any): Promise<{ data: any }> => {
    const res = await api.patch<any>(`/owner/rooms/${id}`, data);
    return { data: res.data };
  },
  archiveRoom: async (id: string): Promise<{ data: any }> => {
    const res = await api.delete<any>(`/owner/rooms/${id}`);
    return { data: res.data };
  },
  updateBedStatus: async (bedId: string, data: string | { status?: string; monthlyRent?: number }): Promise<{ data: any }> => {
    const payload = typeof data === 'string' ? { status: data } : data;
    const res = await api.patch<any>(`/owner/beds/${bedId}`, payload);
    return { data: res.data };
  },

  // 5. Residents & Dossier (CRUD)
  getResidents: async (params?: string | { propertyId?: string; status?: string; search?: string }): Promise<{ data: any[] }> => {
    const query = typeof params === 'string' ? { propertyId: params } : params;
    const res = await api.get<any[]>('/owner/residents', query);
    return { data: (res.data as any[]) || [] };
  },
  getResidentById: async (id: string): Promise<{ data: any }> => {
    const res = await api.get<any>(`/owner/residents/${id}`);
    return { data: res.data };
  },
  createResident: async (data: any): Promise<{ data: any }> => {
    const res = await api.post<any>('/owner/residents', data);
    return { data: res.data };
  },
  updateResident: async (id: string, data: any): Promise<{ data: any }> => {
    const res = await api.patch<any>(`/owner/residents/${id}`, data);
    return { data: res.data };
  },
  archiveResident: async (id: string): Promise<{ data: any }> => {
    const res = await api.delete<any>(`/owner/residents/${id}`);
    return { data: res.data };
  },

  // 6. Resident Lifecycle (Move-In, Notice Period, Move-Out)
  moveInResident: async (data: {
    propertyId: string;
    bedId: string;
    fullName: string;
    email: string;
    mobile: string;
    gender?: string;
    emergencyContactName?: string;
    emergencyContactRelation?: string;
    emergencyContactPhone?: string;
    joiningDate?: string;
    monthlyRent?: number;
    depositAmount?: number;
    securityDepositAmount?: number;
    leaseStartDate?: string;
    leaseEndDate?: string;
    depositPaid?: boolean;
    permanentAddress?: string;
    workCompany?: string;
  }): Promise<{ data: any }> => {
    const res = await api.post<any>('/owner/residents/move-in', data);
    return { data: res.data };
  },
  placeOnNoticePeriod: async (id: string, data: { expectedMoveOutDate?: string; noticeEndDate?: string; reason?: string }): Promise<{ data: any }> => {
    const res = await api.post<any>(`/owner/residents/${id}/notice-period`, {
      expectedMoveOutDate: data.noticeEndDate || data.expectedMoveOutDate,
      reason: data.reason
    });
    return { data: res.data };
  },
  moveOutResident: async (id: string, data: { deductions?: number; deductionNotes?: string; refundAmount?: number; remarks?: string }): Promise<{ data: any }> => {
    const res = await api.post<any>(`/owner/residents/${id}/move-out`, {
      deductions: data.deductions,
      deductionNotes: data.remarks || data.deductionNotes,
      refundAmount: data.refundAmount
    });
    return { data: res.data };
  },

  // 7. Finance & Payments
  getPayments: async (params?: string | { propertyId?: string; status?: string; search?: string }): Promise<{ data: any[] }> => {
    const query = typeof params === 'string' ? { propertyId: params } : params;
    const res = await api.get<any[]>('/owner/payments', query);
    return { data: (res.data as any[]) || [] };
  },
  recordManualPayment: async (
    paymentIdOrData: string | { paymentId: string; paymentMethod?: string; method?: string; transactionId?: string; note?: string; notes?: string; amount?: number },
    dataObj?: { amount?: number; paymentMethod?: string; transactionId?: string; note?: string }
  ): Promise<{ data: any }> => {
    const payload = typeof paymentIdOrData === 'string'
      ? { paymentId: paymentIdOrData, ...dataObj }
      : paymentIdOrData;
    const res = await api.post<any>('/owner/payments/record-manual', payload);
    return { data: res.data };
  },
  createInvoice: async (data: {
    residentId: string;
    amount: number;
    category?: string;
    period: string;
    dueDate?: string;
    description?: string;
    notes?: string;
  }): Promise<{ data: any }> => {
    const res = await api.post<any>('/owner/payments/create-invoice', {
      residentId: data.residentId,
      amount: data.amount,
      category: data.category,
      period: data.period,
      dueDate: data.dueDate,
      notes: data.description || data.notes
    });
    return { data: res.data };
  },
  updatePayment: async (id: string, data: any): Promise<{ data: any }> => {
    const res = await api.patch<any>(`/owner/payments/${id}`, data);
    return { data: res.data };
  },
  cancelPayment: async (id: string): Promise<{ data: any }> => {
    const res = await api.delete<any>(`/owner/payments/${id}`);
    return { data: res.data };
  },
  getPaymentReceipt: async (id: string): Promise<{ data: any }> => {
    const res = await api.get<any>(`/owner/payments/${id}/receipt`);
    return { data: res.data };
  },

  // 8. Security Deposits
  getDeposits: async (): Promise<{ data: any[] }> => {
    const res = await api.get<any[]>('/owner/deposits');
    return { data: (res.data as any[]) || [] };
  },
  createDeposit: async (data: any): Promise<{ data: any }> => {
    const res = await api.post<any>('/owner/deposits', data);
    return { data: res.data };
  },
  settleDeposit: async (id: string, data: { deductions?: number; refundAmount?: number; notes?: string }): Promise<{ data: any }> => {
    const res = await api.post<any>(`/owner/deposits/${id}/settle`, data);
    return { data: res.data };
  },

  // 9. Operating Expenses (CRUD)
  getExpenses: async (params?: string | { propertyId?: string; status?: string; search?: string }): Promise<{ data: any[] }> => {
    const query = typeof params === 'string' ? { propertyId: params } : params;
    const res = await api.get<any[]>('/owner/expenses', query);
    return { data: (res.data as any[]) || [] };
  },
  createExpense: async (data: {
    propertyId: string;
    title: string;
    category?: string;
    amount: number;
    vendor?: string;
    date?: string;
    description?: string;
    notes?: string;
  }): Promise<{ data: any }> => {
    const res = await api.post<any>('/owner/expenses', {
      propertyId: data.propertyId,
      title: data.title,
      category: data.category,
      amount: data.amount,
      vendor: data.vendor,
      date: data.date,
      notes: data.description || data.notes
    });
    return { data: res.data };
  },
  updateExpense: async (id: string, data: any): Promise<{ data: any }> => {
    const res = await api.patch<any>(`/owner/expenses/${id}`, data);
    return { data: res.data };
  },
  archiveExpense: async (id: string): Promise<{ data: any }> => {
    const res = await api.delete<any>(`/owner/expenses/${id}`);
    return { data: res.data };
  },

  // 10. Visitors & QR Desk
  getVisitors: async (params?: string | { propertyId?: string; status?: string }): Promise<{ data: any[] }> => {
    const query = typeof params === 'string' ? { propertyId: params } : params;
    const res = await api.get<any[]>('/owner/visitors', query);
    return { data: (res.data as any[]) || [] };
  },
  createVisitor: async (data: any): Promise<{ data: any }> => {
    const res = await api.post<any>('/owner/visitors', data);
    return { data: res.data };
  },
  approveVisitor: async (id: string): Promise<{ data: any }> => {
    const res = await api.patch<any>(`/owner/visitors/${id}/approve`);
    return { data: res.data };
  },
  rejectVisitor: async (id: string): Promise<{ data: any }> => {
    const res = await api.patch<any>(`/owner/visitors/${id}/reject`);
    return { data: res.data };
  },
  verifyVisitorQR: async (qrPassToken: string): Promise<{ data: any }> => {
    const res = await api.post<any>('/owner/visitors/verify-qr', { qrPassToken });
    return { data: res.data };
  },
  checkInVisitor: async (id: string): Promise<{ data: any }> => {
    const res = await api.post<any>(`/owner/visitors/${id}/check-in`);
    return { data: res.data };
  },
  checkOutVisitor: async (id: string): Promise<{ data: any }> => {
    const res = await api.post<any>(`/owner/visitors/${id}/check-out`);
    return { data: res.data };
  },

  // 11. Maintenance & Complaints
  getComplaints: async (params?: string | { propertyId?: string; status?: string; priority?: string }): Promise<{ data: any[] }> => {
    const query = typeof params === 'string' ? { propertyId: params } : params;
    const res = await api.get<any[]>('/owner/complaints', query);
    return { data: (res.data as any[]) || [] };
  },
  createComplaint: async (data: any): Promise<{ data: any }> => {
    const res = await api.post<any>('/owner/complaints', data);
    return { data: res.data };
  },
  updateComplaintStatus: async (
    id: string,
    data: { status: string; comment?: string; note?: string; assignedStaff?: string; assignedStaffId?: string }
  ): Promise<{ data: any }> => {
    const res = await api.patch<any>(`/owner/complaints/${id}/status`, {
      status: data.status,
      assignedStaff: data.assignedStaffId || data.assignedStaff,
      comment: data.note || data.comment
    });
    return { data: res.data };
  },
  addComplaintComment: async (id: string, comment: string): Promise<{ data: any }> => {
    const res = await api.post<any>(`/owner/complaints/${id}/comments`, { comment });
    return { data: res.data };
  },

  // 12. Staff Management
  getStaff: async (propertyId?: string): Promise<{ data: any[] }> => {
    const res = await api.get<any[]>('/owner/staff', propertyId ? { propertyId } : undefined);
    return { data: (res.data as any[]) || [] };
  },
  createStaff: async (data: { name: string; email?: string; mobile?: string; role: string; shift?: string; salary?: number; propertyId?: string }): Promise<{ data: any }> => {
    const res = await api.post<any>('/owner/staff', data);
    return { data: res.data };
  },
  updateStaff: async (id: string, data: any): Promise<{ data: any }> => {
    const res = await api.patch<any>(`/owner/staff/${id}`, data);
    return { data: res.data };
  },
  archiveStaff: async (id: string): Promise<{ data: any }> => {
    const res = await api.delete<any>(`/owner/staff/${id}`);
    return { data: res.data };
  },

  // 13. Asset Inventory & Stock (CRUD)
  getInventory: async (propertyId?: string): Promise<{ data: any[] }> => {
    const res = await api.get<any[]>('/owner/inventory', propertyId ? { propertyId } : undefined);
    return { data: (res.data as any[]) || [] };
  },
  createInventoryItem: async (data: any): Promise<{ data: any }> => {
    const res = await api.post<any>('/owner/inventory', data);
    return { data: res.data };
  },
  updateInventoryItem: async (id: string, data: any): Promise<{ data: any }> => {
    const res = await api.patch<any>(`/owner/inventory/${id}`, data);
    return { data: res.data };
  },
  updateStock: async (id: string, data: { delta: number; type: 'IN' | 'OUT'; note?: string }): Promise<{ data: any }> => {
    const res = await api.post<any>(`/owner/inventory/${id}/stock`, data);
    return { data: res.data };
  },
  archiveInventoryItem: async (id: string): Promise<{ data: any }> => {
    const res = await api.delete<any>(`/owner/inventory/${id}`);
    return { data: res.data };
  },

  // 14. Tasks & Operations
  getTasks: async (propertyId?: string): Promise<{ data: any[] }> => {
    const res = await api.get<any[]>('/owner/tasks', propertyId ? { propertyId } : undefined);
    return { data: (res.data as any[]) || [] };
  },
  createTask: async (data: any): Promise<{ data: any }> => {
    const res = await api.post<any>('/owner/tasks', data);
    return { data: res.data };
  },
  updateTask: async (id: string, data: any): Promise<{ data: any }> => {
    const res = await api.patch<any>(`/owner/tasks/${id}`, data);
    return { data: res.data };
  },
  archiveTask: async (id: string): Promise<{ data: any }> => {
    const res = await api.delete<any>(`/owner/tasks/${id}`);
    return { data: res.data };
  },

  // 15. Documents & KYC Verification
  getDocuments: async (propertyId?: string): Promise<{ data: any[] }> => {
    const res = await api.get<any[]>('/owner/documents', propertyId ? { propertyId } : undefined);
    return { data: (res.data as any[]) || [] };
  },
  verifyDocument: async (id: string, data: { status: string; rejectionReason?: string }): Promise<{ data: any }> => {
    const res = await api.patch<any>(`/owner/documents/${id}/verify`, data);
    return { data: res.data };
  },

  // 16. Notices
  getNotices: async (propertyId?: string): Promise<{ data: any[] }> => {
    const res = await api.get<any[]>('/owner/notices', propertyId ? { propertyId } : undefined);
    return { data: (res.data as any[]) || [] };
  },
  createNotice: async (data: { propertyId?: string; title: string; content: string; category?: string; priority?: string; isImportant?: boolean; target?: string }): Promise<{ data: any }> => {
    const res = await api.post<any>('/owner/notices', {
      ...data,
      isImportant: data.priority === 'URGENT' || data.isImportant
    });
    return { data: res.data };
  },
  updateNotice: async (id: string, data: any): Promise<{ data: any }> => {
    const res = await api.patch<any>(`/owner/notices/${id}`, data);
    return { data: res.data };
  },
  archiveNotice: async (id: string): Promise<{ data: any }> => {
    const res = await api.delete<any>(`/owner/notices/${id}`);
    return { data: res.data };
  },

  // 17. Leave Requests
  getLeaveRequests: async (): Promise<{ data: any[] }> => {
    const res = await api.get<any[]>('/owner/leave');
    return { data: (res.data as any[]) || [] };
  },
  approveLeave: async (id: string): Promise<{ data: any }> => {
    const res = await api.patch<any>(`/owner/leave/${id}/approve`);
    return { data: res.data };
  },
  rejectLeave: async (id: string, reason?: string): Promise<{ data: any }> => {
    const res = await api.patch<any>(`/owner/leave/${id}/reject`, { reason });
    return { data: res.data };
  },

  // 18. Emergency SOS Events
  getSOSEvents: async (): Promise<{ data: any[] }> => {
    const res = await api.get<any[]>('/owner/sos');
    return { data: (res.data as any[]) || [] };
  },
  acknowledgeSOS: async (id: string): Promise<{ data: any }> => {
    const res = await api.patch<any>(`/owner/sos/${id}/acknowledge`);
    return { data: res.data };
  },
  resolveSOS: async (id: string, notes?: string): Promise<{ data: any }> => {
    const res = await api.patch<any>(`/owner/sos/${id}/resolve`, { notes });
    return { data: res.data };
  },

  // 19. Reports & Analytics
  getReports: async (params?: Record<string, any>): Promise<{ data: any }> => {
    const res = await api.get<any>('/owner/reports', params);
    return { data: res.data };
  },

  // 20. Audit Logs & Settings
  getAuditLogs: async (propertyId?: string): Promise<{ data: any[] }> => {
    const res = await api.get<any[]>('/owner/audit-logs', propertyId ? { propertyId } : undefined);
    return { data: (res.data as any[]) || [] };
  },
  getSettings: async (propertyId?: string): Promise<{ data: any }> => {
    const res = await api.get<any>('/owner/settings', propertyId ? { propertyId } : undefined);
    return { data: res.data || {} };
  },
  updateSettings: async (data: any): Promise<{ data: any }> => {
    const res = await api.patch<any>('/owner/settings', data);
    return { data: res.data || {} };
  },
};

export default ownerApi;
