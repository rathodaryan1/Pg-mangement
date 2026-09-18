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
router.patch('/tenants/:id', SuperAdminController.updateTenant as any);
router.delete('/tenants/:id', SuperAdminController.deleteTenant as any);

// 3. Tenant Operations & Actions
router.post('/tenants/:id/suspend', SuperAdminController.suspendTenant as any);
router.patch('/tenants/:id/suspend', SuperAdminController.suspendTenant as any);
router.post('/tenants/:id/activate', SuperAdminController.activateTenant as any);
router.patch('/tenants/:id/activate', SuperAdminController.activateTenant as any);
router.post('/tenants/:id/archive', SuperAdminController.archiveTenant as any);
router.patch('/tenants/:id/archive', SuperAdminController.archiveTenant as any);
router.post('/tenants/:id/reset-owner-password', SuperAdminController.resetOwnerPassword as any);
router.post('/tenants/:id/impersonate', SuperAdminController.impersonateTenant as any);
router.get('/tenants/:id/properties', SuperAdminController.getTenantProperties as any);
router.get('/tenants/:id/subscription', SuperAdminController.getTenantSubscription as any);
router.patch('/tenants/:id/subscription', SuperAdminController.updateTenantSubscription as any);

// 4. Owners Directory
router.get('/owners', SuperAdminController.getOwners as any);

// 5. Unified Users Directory
router.get('/users', SuperAdminController.getUsers as any);

// 6. Subscription Plans CRUD
router.get('/plans', SuperAdminController.getPlans as any);
router.post('/plans', SuperAdminController.createPlan as any);
router.patch('/plans/:id', SuperAdminController.updatePlan as any);
router.put('/plans/:id', SuperAdminController.updatePlan as any);
router.delete('/plans/:id', SuperAdminController.deletePlan as any);

// 7. Support Tickets System
router.get('/support', SuperAdminController.getSupportTickets as any);
router.post('/support', SuperAdminController.createSupportTicket as any);
router.patch('/support/:id', SuperAdminController.updateSupportTicket as any);
router.put('/support/:id', SuperAdminController.updateSupportTicket as any);

// 8. Global Platform Settings
router.get('/settings', SuperAdminController.getSettings as any);
router.post('/settings', SuperAdminController.updateSettings as any);
router.put('/settings', SuperAdminController.updateSettings as any);

// 9. Audit Logs
router.get('/audit-logs', SuperAdminController.getAuditLogs as any);

// 10. System Health
router.get('/system-health', SuperAdminController.getSystemHealth as any);
router.get('/system/health', SuperAdminController.getSystemHealth as any);
router.get('/health', SuperAdminController.getSystemHealth as any);

export default router;

