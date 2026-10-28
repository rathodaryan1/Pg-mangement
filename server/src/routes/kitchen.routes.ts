import { Router } from 'express';
import { KitchenController } from '../controllers/kitchen.controller';
import { authenticateToken, requireCook, requireOwnerOrStaff } from '../middleware/auth';

const router = Router();

// Resident or Staff can view published menus
router.get('/menus', authenticateToken as any, KitchenController.getMenus as any);

// Resident meal opt-in/opt-out
router.post('/menus/participate', authenticateToken as any, KitchenController.toggleMealParticipation as any);

// Cook or Owner/Manager management routes
router.get('/dashboard', authenticateToken as any, requireCook as any, KitchenController.getCookDashboard as any);
router.post('/menus', authenticateToken as any, requireCook as any, KitchenController.createOrUpdateMenu as any);

// Kitchen Inventory
router.get('/inventory', authenticateToken as any, requireCook as any, KitchenController.getInventory as any);
router.post('/inventory/movement', authenticateToken as any, requireCook as any, KitchenController.recordStockMovement as any);
router.post('/inventory/purchase-request', authenticateToken as any, requireCook as any, KitchenController.createPurchaseRequest as any);

export default router;
