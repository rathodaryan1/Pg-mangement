import { Router } from 'express';
import multer from 'multer';

// Controllers
import {
  login,
  registerRequest,
  verifyOTP,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  getStaffList,
  deleteStaff,
} from '../controllers/authController';

import {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
} from '../controllers/roomController';

import {
  getAllMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  uploadDocument,
  checkInMember,
  checkOutMember,
} from '../controllers/memberController';

import {
  getAllBookings,
  createBooking,
  confirmBooking,
  cancelBooking,
} from '../controllers/bookingController';

import {
  getAllPayments,
  createPaymentRequest,
  recordManualPayment,
  initiateRazorpayPayment,
  verifyRazorpayPayment,
  requestPaymentApproval,
  approvePayment,
} from '../controllers/paymentController';

import {
  getAllIssues,
  createIssue,
  assignIssue,
  resolveIssue,
  getAllExpenses,
  createExpense,
  getAllNotices,
  createNotice,
  getSettings,
  updateSettings,
  getAllVisitors,
  createVisitorEntry,
  checkOutVisitor,
  getAllInventoryItems,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
} from '../controllers/operationsController';

import {
  getAllProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
} from '../controllers/propertyController';

import {
  getDashboardStats,
  getReportData,
} from '../controllers/reportController';

// Middlewares
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ==========================================
// 1. AUTHENTICATION & STAFF
// ==========================================
router.post('/auth/login', login);
router.post('/auth/register-request', registerRequest);
router.post('/auth/verify-otp', verifyOTP);
router.post('/auth/forgot-password', forgotPassword);
router.post('/auth/reset-password', resetPassword);
router.get('/auth/me', authenticateToken as any, getCurrentUser);
router.get('/staff', authenticateToken as any, getStaffList);
router.delete('/staff/:id', authenticateToken as any, requireRole(['ADMIN', 'OWNER']) as any, deleteStaff);

// ==========================================
// 2. PROPERTIES (PG BRANCHES)
// ==========================================
router.get('/properties', authenticateToken as any, getAllProperties);
router.get('/properties/:id', authenticateToken as any, getPropertyById);
router.post('/properties', authenticateToken as any, requireRole(['ADMIN', 'OWNER', 'SUPER_ADMIN']) as any, createProperty);
router.put('/properties/:id', authenticateToken as any, requireRole(['ADMIN', 'OWNER', 'SUPER_ADMIN']) as any, updateProperty);
router.delete('/properties/:id', authenticateToken as any, requireRole(['ADMIN', 'OWNER', 'SUPER_ADMIN']) as any, deleteProperty);

// ==========================================
// 3. ROOMS MANAGEMENT
// ==========================================
router.get('/rooms', authenticateToken as any, getAllRooms);
router.get('/rooms/:id', authenticateToken as any, getRoomById);
router.post('/rooms', authenticateToken as any, requireRole(['ADMIN', 'OWNER', 'MANAGER']) as any, createRoom);
router.put('/rooms/:id', authenticateToken as any, requireRole(['ADMIN', 'OWNER', 'MANAGER']) as any, updateRoom);
router.delete('/rooms/:id', authenticateToken as any, requireRole(['ADMIN', 'OWNER']) as any, deleteRoom);

// ==========================================
// 4. MEMBERS MANAGEMENT
// ==========================================
router.get('/members', authenticateToken as any, getAllMembers);
router.get('/members/:id', authenticateToken as any, getMemberById);
router.post('/members', authenticateToken as any, requireRole(['ADMIN', 'OWNER', 'MANAGER']) as any, createMember);
router.put('/members/:id', authenticateToken as any, requireRole(['ADMIN', 'OWNER', 'MANAGER']) as any, updateMember);
router.delete('/members/:id', authenticateToken as any, requireRole(['ADMIN', 'OWNER']) as any, deleteMember);
router.post(
  '/members/:id/upload',
  authenticateToken as any,
  requireRole(['ADMIN', 'OWNER', 'MANAGER']) as any,
  upload.single('document'),
  uploadDocument
);
router.post('/members/:id/checkin', authenticateToken as any, requireRole(['ADMIN', 'OWNER', 'MANAGER']) as any, checkInMember);
router.post('/members/:id/checkout', authenticateToken as any, requireRole(['ADMIN', 'OWNER', 'MANAGER']) as any, checkOutMember);

// ==========================================
// 5. BOOKINGS
// ==========================================
router.get('/bookings', authenticateToken as any, getAllBookings);
router.post('/bookings', authenticateToken as any, createBooking);
router.post('/bookings/:id/confirm', authenticateToken as any, requireRole(['ADMIN', 'OWNER', 'MANAGER']) as any, confirmBooking);
router.post('/bookings/:id/cancel', authenticateToken as any, cancelBooking);

// ==========================================
// 6. PAYMENTS & COLLECTIONS
// ==========================================
router.get('/payments', authenticateToken as any, getAllPayments);
router.post('/payments', authenticateToken as any, requireRole(['ADMIN', 'OWNER', 'MANAGER']) as any, createPaymentRequest);
router.post('/payments/:id/manual', authenticateToken as any, recordManualPayment);
router.post('/payments/:id/razorpay', authenticateToken as any, initiateRazorpayPayment);
router.post('/payments/razorpay-verify', authenticateToken as any, verifyRazorpayPayment);
router.post('/payments/:id/request-approval', authenticateToken as any, requestPaymentApproval);
router.post('/payments/:id/approve', authenticateToken as any, requireRole(['ADMIN', 'OWNER', 'MANAGER']) as any, approvePayment);

// ==========================================
// 7. MAINTENANCE (ISSUES)
// ==========================================
router.get('/issues', authenticateToken as any, getAllIssues);
router.post('/issues', authenticateToken as any, createIssue);
router.post('/issues/:id/assign', authenticateToken as any, requireRole(['ADMIN', 'OWNER', 'MANAGER']) as any, assignIssue);
router.post('/issues/:id/resolve', authenticateToken as any, requireRole(['ADMIN', 'OWNER', 'MANAGER', 'STAFF', 'MAINTENANCE']) as any, resolveIssue);

// ==========================================
// 8. EXPENSE MANAGEMENT
// ==========================================
router.get('/expenses', authenticateToken as any, getAllExpenses);
router.post('/expenses', authenticateToken as any, requireRole(['ADMIN', 'OWNER', 'MANAGER']) as any, createExpense);

// ==========================================
// 9. NOTICE BOARD
// ==========================================
router.get('/notices', authenticateToken as any, getAllNotices);
router.post('/notices', authenticateToken as any, requireRole(['ADMIN', 'OWNER', 'MANAGER']) as any, createNotice);

// ==========================================
// 10. VISITORS LOGS
// ==========================================
router.get('/visitors', authenticateToken as any, getAllVisitors);
router.post('/visitors', authenticateToken as any, createVisitorEntry);
router.post('/visitors/:id/checkout', authenticateToken as any, checkOutVisitor);

// ==========================================
// 11. INVENTORY TRACKING
// ==========================================
router.get('/inventory', authenticateToken as any, getAllInventoryItems);
router.post('/inventory', authenticateToken as any, requireRole(['ADMIN', 'OWNER', 'MANAGER']) as any, createInventoryItem);
router.put('/inventory/:id', authenticateToken as any, requireRole(['ADMIN', 'OWNER', 'MANAGER']) as any, updateInventoryItem);
router.delete('/inventory/:id', authenticateToken as any, requireRole(['ADMIN', 'OWNER', 'MANAGER']) as any, deleteInventoryItem);

// ==========================================
// 12. SYSTEM CONFIG / SETTINGS
// ==========================================
router.get('/settings', authenticateToken as any, getSettings);
router.put('/settings', authenticateToken as any, requireRole(['ADMIN', 'OWNER']) as any, updateSettings);

// ==========================================
// 13. METRICS & REPORTS
// ==========================================
router.get('/dashboard/stats', authenticateToken as any, getDashboardStats);
router.get('/reports', authenticateToken as any, getReportData);

export default router;
