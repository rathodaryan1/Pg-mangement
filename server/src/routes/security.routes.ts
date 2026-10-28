import { Router } from 'express';
import { SecurityController } from '../controllers/security.controller';
import { authenticateToken, requireSecurityGuard } from '../middleware/auth';

const router = Router();

router.use(authenticateToken as any, requireSecurityGuard as any);

router.get('/visitors', SecurityController.getVisitorLog as any);
router.post('/verify-pass', SecurityController.verifyPass as any);
router.get('/verify-pass/:token', SecurityController.verifyPass as any);
router.post('/check-in', SecurityController.checkInVisitor as any);
router.post('/check-out', SecurityController.checkOutVisitor as any);
router.post('/direct-entry', SecurityController.registerDirectEntry as any);
router.get('/dashboard', SecurityController.getGuardDashboard as any);

export default router;
