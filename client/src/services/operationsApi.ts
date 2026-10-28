import api from './api';

export const operationsApi = {
  // 1. Connected Lifecycle
  getLifecyclePipeline: (propertyId?: string) =>
    api.get('/operations/lifecycle/pipeline', { params: { propertyId } }),

  admitBooking: (data: {
    bookingId?: string;
    propertyId?: string;
    bedId: string;
    fullName: string;
    email: string;
    mobile: string;
    monthlyRent?: number;
    depositAmount?: number;
    leaseStartDate?: string;
    leaseEndDate?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactRelation?: string;
  }) => api.post('/operations/lifecycle/admit-booking', data),

  updateMoveInChecklist: (residentId: string, data: any) =>
    api.put(`/operations/lifecycle/move-in-checklist/${residentId}`, data),

  initiateMoveOutNotice: (data: { residentId: string; noticeEndDate: string; reason?: string }) =>
    api.post('/operations/lifecycle/initiate-move-out', data),

  finalizeMoveOutSettlement: (data: {
    residentId: string;
    damageDeductions?: number;
    utilityDeductions?: number;
    otherDeductions?: number;
    inspectionStatus?: string;
    inspectionNotes?: string;
  }) => api.post('/operations/lifecycle/finalize-settlement', data),

  // 2. Unified Tasks
  getOperationalTasks: (params?: { category?: string; priority?: string; status?: string; propertyId?: string }) =>
    api.get('/operations/tasks', { params }),

  createOperationalTask: (data: {
    propertyId?: string;
    title: string;
    category?: string;
    priority?: string;
    assignedTo?: string;
    dueDate?: string;
    notes?: string;
    sourceType?: string;
    sourceId?: string;
  }) => api.post('/operations/tasks', data),

  updateTaskStatus: (id: string, data: { status: string; notes?: string; assignedTo?: string }) =>
    api.put(`/operations/tasks/${id}/status`, data),

  // 3. Visual Occupancy
  getVisualOccupancyMap: (propertyId?: string) =>
    api.get('/operations/visual-occupancy', { params: { propertyId } }),

  transferResidentBed: (data: { residentId: string; targetBedId: string; reason?: string }) =>
    api.post('/operations/bed/transfer', data),

  toggleBedMaintenance: (data: { bedId: string; isMaintenance: boolean; reason?: string }) =>
    api.post('/operations/bed/toggle-maintenance', data),

  // 4. Parcels
  getParcels: (propertyId?: string) =>
    api.get('/operations/parcels', { params: { propertyId } }),

  registerParcel: (data: {
    propertyId?: string;
    residentId?: string;
    recipientName: string;
    recipientRoom?: string;
    courierCompany: string;
    trackingNumber?: string;
    notes?: string;
  }) => api.post('/operations/parcels', data),

  collectParcel: (id: string, data: { pickupPin?: string; collectedBy?: string }) =>
    api.post(`/operations/parcels/${id}/collect`, data),

  // 5. Assets
  getAssets: (propertyId?: string) =>
    api.get('/operations/assets', { params: { propertyId } }),

  createAsset: (data: any) =>
    api.post('/operations/assets', data),

  logAssetService: (id: string, data: { notes?: string; serviceCost?: number }) =>
    api.post(`/operations/assets/${id}/service`, data),

  // 6. Vendors
  getVendors: (propertyId?: string) =>
    api.get('/operations/vendors', { params: { propertyId } }),

  createVendor: (data: any) =>
    api.post('/operations/vendors', data),

  // 7. Finance Reconciliation
  getPaymentReconciliation: (propertyId?: string) =>
    api.get('/operations/finance/reconciliation', { params: { propertyId } }),

  allocateUtilityToInvoices: (data: {
    propertyId?: string;
    utilityReadingId: string;
    description?: string;
    billingPeriod?: string;
  }) => api.post('/operations/finance/allocate-utility', data),

  // 8. Command Center
  getCommandCenterFeed: (propertyId?: string) =>
    api.get('/operations/command-center', { params: { propertyId } }),
};
