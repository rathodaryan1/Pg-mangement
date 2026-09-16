import { Router } from 'express';
import { OwnerController } from '../controllers/owner.controller';
import { authenticateToken, requireOwnerOrStaff } from '../middleware/auth';

const router = Router();

// Require JWT authentication and Owner/Staff role for all owner routes
router.use(authenticateToken as any);
router.use(requireOwnerOrStaff as any);

// 1. Dashboard & KPIs
router.get('/dashboard', OwnerController.getDashboard as any);

// 2. Properties
router.get('/properties', OwnerController.getProperties as any);
router.get('/properties/:id', OwnerController.getPropertyById as any);
router.post('/properties', OwnerController.createProperty as any);
router.patch('/properties/:id', OwnerController.updateProperty as any);

// 3. Buildings & Floors
router.get('/buildings', OwnerController.getBuildings as any);
router.post('/buildings', OwnerController.createBuilding as any);

// 4. Rooms & Beds
router.get('/rooms', OwnerController.getRooms as any);
router.get('/rooms/:id', OwnerController.getRoomById as any);
router.post('/rooms', OwnerController.createRoom as any);
router.patch('/rooms/:id', OwnerController.updateRoom as any);
router.patch('/beds/:bedId', OwnerController.updateBedStatus as any);

// 5. Residents & Lifecycle
router.get('/residents', OwnerController.getResidents as any);
router.get('/residents/:id', OwnerController.getResidentById as any);
router.post('/residents/move-in', OwnerController.moveInResident as any);
router.post('/residents/:id/notice-period', OwnerController.placeOnNoticePeriod as any);
router.post('/residents/:id/move-out', OwnerController.moveOutResident as any);

// 6. Payments & Finance
router.get('/payments', OwnerController.getPayments as any);
router.post('/payments/record-manual', OwnerController.recordManualPayment as any);
router.post('/payments/create-invoice', OwnerController.createInvoice as any);

// 7. Expenses
router.get('/expenses', OwnerController.getExpenses as any);
router.post('/expenses', OwnerController.createExpense as any);

// 8. Visitors & QR Desk
router.get('/visitors', OwnerController.getVisitors as any);
router.patch('/visitors/:id/approve', OwnerController.approveVisitor as any);
router.patch('/visitors/:id/reject', OwnerController.rejectVisitor as any);
router.post('/visitors/verify-qr', OwnerController.verifyVisitorQR as any);
router.post('/visitors/:id/check-in', OwnerController.checkInVisitor as any);
router.post('/visitors/:id/check-out', OwnerController.checkOutVisitor as any);

// 9. Maintenance & Complaints
router.get('/complaints', OwnerController.getComplaints as any);
router.patch('/complaints/:id/status', OwnerController.updateComplaintStatus as any);

// 10. Staff Management
router.get('/staff', OwnerController.getStaff as any);
router.post('/staff', OwnerController.createStaff as any);

// 11. Inventory & Assets
router.get('/inventory', OwnerController.getInventory as any);
router.post('/inventory', OwnerController.createInventoryItem as any);

// 12. Tasks & Operations
router.get('/tasks', OwnerController.getTasks as any);
router.post('/tasks', OwnerController.createTask as any);

// 13. Documents & KYC
router.get('/documents', OwnerController.getDocuments as any);
router.patch('/documents/:id/verify', OwnerController.verifyDocument as any);

// 14. Notices
router.get('/notices', OwnerController.getNotices as any);
router.post('/notices', OwnerController.createNotice as any);

// 15. Audit Logs & Settings
router.get('/audit-logs', OwnerController.getAuditLogs as any);
router.get('/settings', OwnerController.getSettings as any);

export default router;
