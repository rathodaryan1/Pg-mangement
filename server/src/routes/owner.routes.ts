import { Router } from 'express';
import { OwnerController } from '../controllers/owner.controller';
import { authenticateToken, requireOwnerOrStaff } from '../middleware/auth';

const router = Router();

// Require JWT authentication and Owner/Staff role for all owner routes
router.use(authenticateToken as any);
router.use(requireOwnerOrStaff as any);

// 1. Dashboard & KPIs
router.get('/dashboard', OwnerController.getDashboard as any);

// 2. Properties (CRUD)
router.get('/properties', OwnerController.getProperties as any);
router.get('/properties/:id', OwnerController.getPropertyById as any);
router.post('/properties', OwnerController.createProperty as any);
router.patch('/properties/:id', OwnerController.updateProperty as any);
router.delete('/properties/:id', OwnerController.archiveProperty as any);

// 3. Buildings & Floors (CRUD)
router.get('/buildings', OwnerController.getBuildings as any);
router.post('/buildings', OwnerController.createBuilding as any);
router.patch('/buildings/:id', OwnerController.updateBuilding as any);
router.delete('/buildings/:id', OwnerController.archiveBuilding as any);

router.get('/floors', OwnerController.getFloors as any);
router.post('/floors', OwnerController.createFloor as any);
router.delete('/floors/:id', OwnerController.archiveFloor as any);

// 4. Rooms & Beds (CRUD)
router.get('/rooms', OwnerController.getRooms as any);
router.get('/rooms/:id', OwnerController.getRoomById as any);
router.post('/rooms', OwnerController.createRoom as any);
router.patch('/rooms/:id', OwnerController.updateRoom as any);
router.delete('/rooms/:id', OwnerController.archiveRoom as any);
router.patch('/beds/:bedId', OwnerController.updateBedStatus as any);

// 5. Residents & Dossier (CRUD)
router.get('/residents', OwnerController.getResidents as any);
router.get('/residents/:id', OwnerController.getResidentById as any);
router.post('/residents', OwnerController.createResident as any);
router.patch('/residents/:id', OwnerController.updateResident as any);
router.delete('/residents/:id', OwnerController.archiveResident as any);

// 6. Resident Lifecycle (Move-In, Notice Period, Move-Out)
router.post('/residents/move-in', OwnerController.moveInResident as any);
router.post('/residents/:id/notice-period', OwnerController.placeOnNoticePeriod as any);
router.post('/residents/:id/move-out', OwnerController.moveOutResident as any);

// 7. Finance & Payments
router.get('/payments', OwnerController.getPayments as any);
router.post('/payments/record-manual', OwnerController.recordManualPayment as any);
router.post('/payments/create-invoice', OwnerController.createInvoice as any);
router.patch('/payments/:id', OwnerController.updatePayment as any);
router.delete('/payments/:id', OwnerController.cancelPayment as any);
router.get('/payments/:id/receipt', OwnerController.getPaymentReceipt as any);

// 8. Security Deposits
router.get('/deposits', OwnerController.getDeposits as any);
router.post('/deposits', OwnerController.createDeposit as any);
router.post('/deposits/:id/settle', OwnerController.settleDeposit as any);

// 9. Operating Expenses (CRUD)
router.get('/expenses', OwnerController.getExpenses as any);
router.post('/expenses', OwnerController.createExpense as any);
router.patch('/expenses/:id', OwnerController.updateExpense as any);
router.delete('/expenses/:id', OwnerController.archiveExpense as any);

// 10. Visitor Desk & QR Verification
router.get('/visitors', OwnerController.getVisitors as any);
router.post('/visitors', OwnerController.createVisitor as any);
router.patch('/visitors/:id/approve', OwnerController.approveVisitor as any);
router.patch('/visitors/:id/reject', OwnerController.rejectVisitor as any);
router.get('/visitors/verify/:token', OwnerController.verifyVisitorQRByToken as any);
router.post('/visitors/verify-qr', OwnerController.verifyVisitorQR as any);
router.post('/visitors/:id/check-in', OwnerController.checkInVisitor as any);
router.post('/visitors/:id/check-out', OwnerController.checkOutVisitor as any);

// 11. Maintenance & Complaints
router.get('/complaints', OwnerController.getComplaints as any);
router.post('/complaints', OwnerController.createComplaint as any);
router.patch('/complaints/:id/status', OwnerController.updateComplaintStatus as any);
router.post('/complaints/:id/comments', OwnerController.addComplaintComment as any);

// 12. Staff Management (CRUD)
router.get('/staff', OwnerController.getStaff as any);
router.post('/staff', OwnerController.createStaff as any);
router.patch('/staff/:id', OwnerController.updateStaff as any);
router.delete('/staff/:id', OwnerController.archiveStaff as any);

// 13. Asset Inventory & Stock (CRUD)
router.get('/inventory', OwnerController.getInventory as any);
router.post('/inventory', OwnerController.createInventoryItem as any);
router.patch('/inventory/:id', OwnerController.updateInventoryItem as any);
router.post('/inventory/:id/stock', OwnerController.updateStock as any);
router.delete('/inventory/:id', OwnerController.archiveInventoryItem as any);

// 14. Operational Tasks & Housekeeping (CRUD)
router.get('/tasks', OwnerController.getTasks as any);
router.post('/tasks', OwnerController.createTask as any);
router.patch('/tasks/:id', OwnerController.updateTask as any);
router.delete('/tasks/:id', OwnerController.archiveTask as any);

// 15. Documents & KYC Verification
router.get('/documents', OwnerController.getDocuments as any);
router.patch('/documents/:id/verify', OwnerController.verifyDocument as any);

// 16. Notices & Announcements (CRUD)
router.get('/notices', OwnerController.getNotices as any);
router.post('/notices', OwnerController.createNotice as any);
router.patch('/notices/:id', OwnerController.updateNotice as any);
router.delete('/notices/:id', OwnerController.archiveNotice as any);

// 17. Leave Management
router.get('/leave', OwnerController.getLeaveRequests as any);
router.patch('/leave/:id/approve', OwnerController.approveLeave as any);
router.patch('/leave/:id/reject', OwnerController.rejectLeave as any);

// 18. Emergency & SOS Events
router.get('/sos', OwnerController.getSOSEvents as any);
router.patch('/sos/:id/acknowledge', OwnerController.acknowledgeSOS as any);
router.patch('/sos/:id/resolve', OwnerController.resolveSOS as any);

// 19. Reports & Analytics
router.get('/reports', OwnerController.getReports as any);

// 20. Audit Logs & Settings
router.get('/audit-logs', OwnerController.getAuditLogs as any);
router.get('/settings', OwnerController.getSettings as any);
router.patch('/settings', OwnerController.updateSettings as any);

export default router;
