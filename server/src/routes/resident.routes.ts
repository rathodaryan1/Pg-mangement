import { Router } from 'express';
import multer from 'multer';
import { ResidentController } from '../controllers/resident.controller';
import { authenticateToken, requireResident } from '../middleware/auth';

const router = Router();

// Multer in-memory storage for secure uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
});

// All routes here require valid JWT authentication & Resident role
router.use(authenticateToken as any);
router.use(requireResident as any);

// 1. Dashboard
router.get('/dashboard', ResidentController.getDashboard as any);

// 2. Room & Property Info
router.get('/room', ResidentController.getRoomDetails as any);

// 3. Profile
router.get('/profile', ResidentController.getProfile as any);
router.patch('/profile', ResidentController.updateProfile as any);

// 4. Payments
router.get('/payments', ResidentController.getPayments as any);
router.get('/payments/:id', ResidentController.getPaymentById as any);
router.post('/payments/create-order', ResidentController.createPaymentOrder as any);
router.post('/payments/verify', ResidentController.verifyPayment as any);
router.get('/payments/:id/receipt', ResidentController.getReceipt as any);

// 5. Visitors & QR Pass
router.get('/visitors', ResidentController.getVisitors as any);
router.post('/visitors', ResidentController.createVisitorRequest as any);
router.get('/visitors/:id', ResidentController.getVisitorById as any);
router.patch('/visitors/:id/cancel', ResidentController.cancelVisitorRequest as any);

// 6. Complaints & Maintenance
router.get('/complaints', ResidentController.getComplaints as any);
router.post('/complaints', ResidentController.createComplaint as any);
router.get('/complaints/:id', ResidentController.getComplaintById as any);
router.post('/complaints/:id/comments', ResidentController.addComplaintComment as any);

// 7. Documents (KYC & Agreements)
router.get('/documents', ResidentController.getDocuments as any);
router.post('/documents', upload.single('file') as any, ResidentController.uploadDocument as any);
router.get('/documents/:id/download', ResidentController.downloadDocument as any);

// 8. Leave Requests
router.get('/leave', ResidentController.getLeaveRequests as any);
router.post('/leave', ResidentController.createLeaveRequest as any);
router.patch('/leave/:id/cancel', ResidentController.cancelLeaveRequest as any);

// 9. Notices
router.get('/notices', ResidentController.getNotices as any);

// 10. Notifications
router.get('/notifications', ResidentController.getNotifications as any);
router.patch('/notifications/:id/read', ResidentController.markNotificationAsRead as any);
router.patch('/notifications/read-all', ResidentController.markAllNotificationsAsRead as any);

// 11. Emergency SOS
router.post('/emergency/sos', ResidentController.triggerSOS as any);

export default router;
