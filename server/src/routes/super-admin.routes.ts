import { Router } from 'express';
import { SuperAdminController } from '../controllers/super-admin.controller';
import { authenticateToken, requireSuperAdmin } from '../middleware/auth';

const router = Router();

// Protect all Super Admin routes with JWT Auth + Super Admin Role check
router.use(authenticateToken as any);
router.use(requireSuperAdmin as any);

// 1. Dashboard & Global Stats
router.get('/dashboard', SuperAdminController.getDashboardStats as any);
router.get('/dashboard/stats', SuperAdminController.getDashboardStats as any);

// 2. Tenants Management
router.get('/tenants', SuperAdminController.getTenants as any);
router.post('/tenants', SuperAdminController.createTenant as any);
router.get('/tenants/:id', SuperAdminController.getTenantById as any);
router.put('/tenants/:id', SuperAdminController.updateTenant as any);
router.delete('/tenants/:id', SuperAdminController.deleteTenant as any);

// 3. Tenant Operations & Actions
router.post('/tenants/:id/suspend', SuperAdminController.suspendTenant as any);
router.post('/tenants/:id/activate', SuperAdminController.activateTenant as any);
router.post('/tenants/:id/reset-owner-password', SuperAdminController.resetOwnerPassword as any);
router.post('/tenants/:id/impersonate', SuperAdminController.impersonateTenant as any);

// 4. Owners Directory
router.get('/owners', SuperAdminController.getOwners as any);

// 5. Subscription Plans
router.get('/plans', SuperAdminController.getPlans as any);

// 6. Audit Logs
router.get('/audit-logs', SuperAdminController.getAuditLogs as any);

// 7. System Health
router.get('/system-health', SuperAdminController.getSystemHealth as any);
router.get('/system/health', SuperAdminController.getSystemHealth as any);
router.get('/health', SuperAdminController.getSystemHealth as any);

export default router;

