import api from '../lib/api';

export interface ResidentDashboardData {
  resident: {
    id: string;
    name: string;
    email: string;
    mobile: string;
    status: string;
    kycStatus: string;
    joiningDate: string;
    propertyName: string;
    propertyAddress?: string;
    buildingName?: string;
    floorNumber?: number;
    roomNumber?: string;
    bedNumber?: string;
    monthlyRent?: number;
  };
  financials: {
    monthlyRent: number;
    totalOutstanding: number;
    pendingPaymentsCount: number;
    nextDueDate: string | null;
    nextDueAmount: number;
    securityDeposit: {
      amount: number;
      status: string;
      paidAt?: string | null;
    } | null;
  };
  activeVisitors: Array<{
    id: string;
    visitorName: string;
    relation: string;
    visitDate: string;
    expectedEntryTime: string;
    expectedExitTime?: string | null;
    status: string;
    qrPassToken: string;
  }>;
  openComplaintsCount: number;
  openComplaints: Array<{
    id: string;
    ticketNumber: string;
    title: string;
    category: string;
    priority: string;
    status: string;
    createdAt: string;
  }>;
  pendingLeaveRequests: Array<{
    id: string;
    fromDate: string;
    toDate: string;
    reason: string;
    status: string;
  }>;
  recentNotices: Array<{
    id: string;
    title: string;
    content: string;
    category: string;
    isImportant: boolean;
    publishedAt: string;
    publisherName: string;
  }>;
  unreadNotificationsCount: number;
  recentNotifications: Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    createdAt: string;
  }>;
}

export interface ResidentRoomData {
  assigned: boolean;
  message?: string;
  room?: {
    id: string;
    roomNumber: string;
    roomType: string;
    capacity: number;
    baseRent: number;
    deposit: number;
    status: string;
    amenities: string[];
    building: string;
    floor: number;
  };
  myBed?: {
    id: string;
    bedNumber: string;
    monthlyRent: number;
    status: string;
  };
  property?: {
    id: string;
    name: string;
    address: string;
    phone: string;
    email: string;
    wardenContact: string;
  };
  roommates?: Array<{
    id: string;
    name: string;
    bedNumber: string;
    joiningDate: string;
    mobile: string;
  }>;
  totalBeds?: number;
  occupiedBeds?: number;
}

export const residentApi = {
  // 1. Dashboard
  getDashboard: async (): Promise<ResidentDashboardData> => {
    const res = await api.get<ResidentDashboardData>('/resident/dashboard');
    return res.data!;
  },

  // 2. Room
  getRoom: async (): Promise<ResidentRoomData> => {
    const res = await api.get<ResidentRoomData>('/resident/room');
    return res.data!;
  },

  // 3. Profile
  getProfile: async () => {
    const res = await api.get('/resident/profile');
    return res.data!;
  },
  updateProfile: async (data: any) => {
    const res = await api.patch('/resident/profile', data);
    return res.data!;
  },

  // 4. Payments
  getPayments: async () => {
    const res = await api.get<{
      payments: any[];
      securityDeposit: any;
      summary: {
        totalOutstanding: number;
        pendingCount: number;
        paidCount: number;
        nextDueDate: string | null;
        nextDueAmount: number;
      };
    }>('/resident/payments');
    return res.data!;
  },
  getPaymentById: async (id: string) => {
    const res = await api.get(`/resident/payments/${id}`);
    return res.data!;
  },
  createPaymentOrder: async (paymentId: string, method = 'UPI') => {
    const res = await api.post('/resident/payments/create-order', { paymentId, method });
    return res.data!;
  },
  verifyPayment: async (payload: {
    paymentId: string;
    transactionId?: string;
    method?: string;
    razorpayPaymentId?: string;
    razorpayOrderId?: string;
    razorpaySignature?: string;
  }) => {
    const res = await api.post('/resident/payments/verify', payload);
    return res.data!;
  },
  getReceipt: async (id: string) => {
    const res = await api.get(`/resident/payments/${id}/receipt`);
    return res.data!;
  },

  // 5. Visitors
  getVisitors: async () => {
    const res = await api.get<any[]>('/resident/visitors');
    return res.data || [];
  },
  createVisitorRequest: async (data: {
    visitorName: string;
    visitorMobile: string;
    relation: string;
    purpose?: string;
    visitDate: string;
    expectedEntryTime: string;
    expectedExitTime?: string;
  }) => {
    const res = await api.post('/resident/visitors', data);
    return res.data!;
  },
  cancelVisitorRequest: async (id: string) => {
    const res = await api.patch(`/resident/visitors/${id}/cancel`);
    return res.data!;
  },

  // 6. Complaints
  getComplaints: async () => {
    const res = await api.get<any[]>('/resident/complaints');
    return res.data || [];
  },
  createComplaint: async (data: {
    title: string;
    description: string;
    category?: string;
    priority?: string;
  }) => {
    const res = await api.post('/resident/complaints', data);
    return res.data!;
  },
  getComplaintById: async (id: string) => {
    const res = await api.get(`/resident/complaints/${id}`);
    return res.data!;
  },
  addComplaintComment: async (id: string, comment: string) => {
    const res = await api.post(`/resident/complaints/${id}/comments`, { comment });
    return res.data!;
  },

  // 7. Documents
  getDocuments: async () => {
    const res = await api.get<any[]>('/resident/documents');
    return res.data || [];
  },
  uploadDocument: async (formData: FormData) => {
    const res = await api.upload('/resident/documents', formData);
    return res.data!;
  },
  downloadDocument: async (id: string) => {
    const res = await api.get<{ downloadUrl: string; title: string; mimeType: string }>(
      `/resident/documents/${id}/download`
    );
    return res.data!;
  },

  // 8. Leave
  getLeaveRequests: async () => {
    const res = await api.get<any[]>('/resident/leave');
    return res.data || [];
  },
  createLeaveRequest: async (data: {
    fromDate: string;
    toDate: string;
    reason: string;
  }) => {
    const res = await api.post('/resident/leave', data);
    return res.data!;
  },
  cancelLeaveRequest: async (id: string) => {
    const res = await api.patch(`/resident/leave/${id}/cancel`);
    return res.data!;
  },

  // 9. Notices
  getNotices: async () => {
    const res = await api.get<any[]>('/resident/notices');
    return res.data || [];
  },

  // 10. Notifications
  getNotifications: async () => {
    const res = await api.get<any[]>('/resident/notifications');
    return res.data || [];
  },
  markNotificationRead: async (id: string) => {
    const res = await api.patch(`/resident/notifications/${id}/read`);
    return res.data!;
  },
  markAllNotificationsRead: async () => {
    const res = await api.patch('/resident/notifications/read-all');
    return res.data!;
  },

  // 11. Emergency SOS
  triggerSOS: async (notes?: string) => {
    const res = await api.post('/resident/emergency/sos', { notes });
    return res.data!;
  },
};

export default residentApi;
