import { Router } from 'express';
import { OperationsController } from '../controllers/operations.controller';
import { authenticateToken, requireOwnerOrStaff, requireSecurityGuard } from '../middleware/auth';

const router = Router();

// Protect all routes with authentication
router.use(authenticateToken as any);

// -------------------------------------------------------------
// 1. CONNECTED RESIDENT LIFECYCLE
// -------------------------------------------------------------
router.get('/lifecycle/pipeline', requireOwnerOrStaff as any, OperationsController.getLifecyclePipeline as any);
router.post('/lifecycle/admit-booking', requireOwnerOrStaff as any, OperationsController.admitBooking as any);
router.put('/lifecycle/move-in-checklist/:residentId', requireOwnerOrStaff as any, OperationsController.updateMoveInChecklist as any);
router.post('/lifecycle/initiate-move-out', requireOwnerOrStaff as any, OperationsController.initiateMoveOutNotice as any);
router.post('/lifecycle/finalize-settlement', requireOwnerOrStaff as any, OperationsController.finalizeMoveOutSettlement as any);

// -------------------------------------------------------------
// 2. UNIFIED OPERATIONS & STAFF TASK CENTER
// -------------------------------------------------------------
router.get('/tasks', requireOwnerOrStaff as any, OperationsController.getOperationalTasks as any);
router.post('/tasks', requireOwnerOrStaff as any, OperationsController.createOperationalTask as any);
router.put('/tasks/:id/status', requireOwnerOrStaff as any, OperationsController.updateTaskStatus as any);

// -------------------------------------------------------------
// 3. VISUAL ROOM, FLOOR & BED MANAGEMENT
// -------------------------------------------------------------
router.get('/visual-occupancy', requireOwnerOrStaff as any, OperationsController.getVisualOccupancyMap as any);
router.post('/bed/transfer', requireOwnerOrStaff as any, OperationsController.transferResidentBed as any);
router.post('/bed/toggle-maintenance', requireOwnerOrStaff as any, OperationsController.toggleBedMaintenance as any);

// -------------------------------------------------------------
// 4. PARCEL & COURIER MANAGEMENT (GUARD & RESIDENT)
// -------------------------------------------------------------
router.get('/parcels', OperationsController.getParcels as any);
router.post('/parcels', requireSecurityGuard as any, OperationsController.registerParcel as any);
router.post('/parcels/:id/collect', OperationsController.collectParcel as any);

// -------------------------------------------------------------
// 5. ASSET REGISTER & PREVENTIVE MAINTENANCE
// -------------------------------------------------------------
router.get('/assets', requireOwnerOrStaff as any, OperationsController.getAssets as any);
router.post('/assets', requireOwnerOrStaff as any, OperationsController.createAsset as any);
router.post('/assets/:id/service', requireOwnerOrStaff as any, OperationsController.logAssetService as any);

// -------------------------------------------------------------
// 6. VENDOR DIRECTORY
// -------------------------------------------------------------
router.get('/vendors', requireOwnerOrStaff as any, OperationsController.getVendors as any);
router.post('/vendors', requireOwnerOrStaff as any, OperationsController.createVendor as any);

// -------------------------------------------------------------
// 7. FINANCIAL RECONCILIATION & UTILITY ALLOCATION
// -------------------------------------------------------------
router.get('/finance/reconciliation', requireOwnerOrStaff as any, OperationsController.getPaymentReconciliation as any);
router.post('/finance/allocate-utility', requireOwnerOrStaff as any, OperationsController.allocateUtilityToInvoices as any);

// -------------------------------------------------------------
// 8. OPERATIONAL INTELLIGENCE & COMMAND CENTER
// -------------------------------------------------------------
router.get('/command-center', requireOwnerOrStaff as any, OperationsController.getCommandCenterFeed as any);

export default router;
