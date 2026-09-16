import type {
  Property,
  Room,
  Resident,
  PaymentRecord,
  VisitorRequest,
  MaintenanceTicket,
  StaffMember,
  OperationalTask,
  AssetInventoryItem,
  PGNotice,
  AuditLog,
  LeaveRequest,
  DashboardKPIs
} from '../types';

import {
  MOCK_PROPERTIES,
  MOCK_ROOMS,
  MOCK_RESIDENTS,
  MOCK_PAYMENTS,
  MOCK_VISITORS,
  MOCK_MAINTENANCE_TICKETS,
  MOCK_STAFF,
  MOCK_TASKS,
  MOCK_ASSETS,
  MOCK_NOTICES,
  MOCK_AUDIT_LOGS,
  MOCK_LEAVE_REQUESTS,
  MOCK_DASHBOARD_KPIS
} from '../data/mockData';

const delay = (ms: number = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export const apiService = {
  // --- PROPERTIES ---
  getProperties: async (): Promise<Property[]> => {
    await delay();
    return [...MOCK_PROPERTIES];
  },
  getPropertyById: async (id: string): Promise<Property | undefined> => {
    await delay();
    return MOCK_PROPERTIES.find((p) => p.id === id);
  },

  // --- ROOMS & BEDS ---
  getRooms: async (propertyId?: string): Promise<Room[]> => {
    await delay();
    if (propertyId) {
      return MOCK_ROOMS.filter((r) => r.propertyId === propertyId);
    }
    return [...MOCK_ROOMS];
  },
  getRoomById: async (roomId: string): Promise<Room | undefined> => {
    await delay();
    return MOCK_ROOMS.find((r) => r.id === roomId);
  },

  // --- RESIDENTS ---
  getResidents: async (propertyId?: string): Promise<Resident[]> => {
    await delay();
    if (propertyId) {
      return MOCK_RESIDENTS.filter((r) => r.propertyId === propertyId);
    }
    return [...MOCK_RESIDENTS];
  },
  getResidentById: async (id: string): Promise<Resident | undefined> => {
    await delay();
    return MOCK_RESIDENTS.find((r) => r.id === id);
  },

  // --- PAYMENTS & FINANCE ---
  getPayments: async (residentId?: string): Promise<PaymentRecord[]> => {
    await delay();
    if (residentId) {
      return MOCK_PAYMENTS.filter((p) => p.residentId === residentId);
    }
    return [...MOCK_PAYMENTS];
  },
  createPaymentRecord: async (payment: Omit<PaymentRecord, 'id'>): Promise<PaymentRecord> => {
    await delay(500);
    const newRecord: PaymentRecord = {
      ...payment,
      id: `pay-${Date.now()}`
    };
    MOCK_PAYMENTS.unshift(newRecord);
    return newRecord;
  },

  // --- VISITORS ---
  getVisitors: async (residentId?: string): Promise<VisitorRequest[]> => {
    await delay();
    if (residentId) {
      return MOCK_VISITORS.filter((v) => v.residentId === residentId);
    }
    return [...MOCK_VISITORS];
  },
  createVisitorRequest: async (req: Omit<VisitorRequest, 'id' | 'qrPassCode' | 'status' | 'createdTime'>): Promise<VisitorRequest> => {
    await delay(500);
    const newVisitor: VisitorRequest = {
      ...req,
      id: `vis-${Date.now()}`,
      status: 'PENDING',
      qrPassCode: `QR-UN-${Math.floor(1000 + Math.random() * 9000)}-PASS`,
      createdTime: new Date().toLocaleString()
    };
    MOCK_VISITORS.unshift(newVisitor);
    return newVisitor;
  },
  updateVisitorStatus: async (id: string, status: VisitorRequest['status'], approvedBy?: string): Promise<VisitorRequest | null> => {
    await delay(400);
    const vis = MOCK_VISITORS.find((v) => v.id === id);
    if (vis) {
      vis.status = status;
      if (approvedBy) vis.approvedBy = approvedBy;
      if (status === 'CHECKED_IN') vis.checkInTime = new Date().toLocaleTimeString();
      if (status === 'CHECKED_OUT') vis.checkOutTime = new Date().toLocaleTimeString();
    }
    return vis || null;
  },

  // --- MAINTENANCE TICKETS ---
  getMaintenanceTickets: async (residentId?: string): Promise<MaintenanceTicket[]> => {
    await delay();
    if (residentId) {
      return MOCK_MAINTENANCE_TICKETS.filter((t) => t.residentId === residentId);
    }
    return [...MOCK_MAINTENANCE_TICKETS];
  },
  createTicket: async (ticket: Omit<MaintenanceTicket, 'id' | 'ticketNumber' | 'status' | 'createdAt' | 'history'>): Promise<MaintenanceTicket> => {
    await delay(500);
    const newTicket: MaintenanceTicket = {
      ...ticket,
      id: `tkt-${Date.now()}`,
      ticketNumber: `TKT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      status: 'REPORTED',
      createdAt: new Date().toLocaleString(),
      history: [
        {
          id: `h-${Date.now()}`,
          status: 'REPORTED',
          updatedBy: ticket.residentName,
          timestamp: new Date().toLocaleString(),
          comment: 'Ticket reported by resident'
        }
      ]
    };
    MOCK_MAINTENANCE_TICKETS.unshift(newTicket);
    return newTicket;
  },
  updateTicketStatus: async (id: string, status: MaintenanceTicket['status'], updatedBy: string, comment: string): Promise<MaintenanceTicket | null> => {
    await delay(400);
    const tkt = MOCK_MAINTENANCE_TICKETS.find((t) => t.id === id);
    if (tkt) {
      tkt.status = status;
      if (status === 'RESOLVED') tkt.resolvedAt = new Date().toLocaleString();
      tkt.history.push({
        id: `h-${Date.now()}`,
        status,
        updatedBy,
        timestamp: new Date().toLocaleString(),
        comment
      });
    }
    return tkt || null;
  },

  // --- STAFF & TASKS ---
  getStaff: async (): Promise<StaffMember[]> => {
    await delay();
    return [...MOCK_STAFF];
  },
  getTasks: async (): Promise<OperationalTask[]> => {
    await delay();
    return [...MOCK_TASKS];
  },

  // --- ASSETS & INVENTORY ---
  getAssets: async (): Promise<AssetInventoryItem[]> => {
    await delay();
    return [...MOCK_ASSETS];
  },

  // --- NOTICES ---
  getNotices: async (): Promise<PGNotice[]> => {
    await delay();
    return [...MOCK_NOTICES];
  },
  createNotice: async (notice: Omit<PGNotice, 'id' | 'publishedAt'>): Promise<PGNotice> => {
    await delay(400);
    const newNotice: PGNotice = {
      ...notice,
      id: `ntc-${Date.now()}`,
      publishedAt: new Date().toISOString().split('T')[0]
    };
    MOCK_NOTICES.unshift(newNotice);
    return newNotice;
  },

  // --- AUDIT LOGS ---
  getAuditLogs: async (): Promise<AuditLog[]> => {
    await delay();
    return [...MOCK_AUDIT_LOGS];
  },

  // --- LEAVE REQUESTS ---
  getLeaveRequests: async (residentId?: string): Promise<LeaveRequest[]> => {
    await delay();
    if (residentId) {
      return MOCK_LEAVE_REQUESTS.filter((l) => l.residentId === residentId);
    }
    return [...MOCK_LEAVE_REQUESTS];
  },
  createLeaveRequest: async (leave: Omit<LeaveRequest, 'id' | 'status' | 'appliedOn'>): Promise<LeaveRequest> => {
    await delay(400);
    const newLeave: LeaveRequest = {
      ...leave,
      id: `lv-${Date.now()}`,
      status: 'PENDING',
      appliedOn: new Date().toISOString().split('T')[0]
    };
    MOCK_LEAVE_REQUESTS.unshift(newLeave);
    return newLeave;
  },

  // --- DASHBOARD KPIS ---
  getDashboardKPIs: async (): Promise<DashboardKPIs> => {
    await delay(300);
    return { ...MOCK_DASHBOARD_KPIS };
  }
};
