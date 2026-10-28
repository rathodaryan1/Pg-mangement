import { Router } from 'express';
import { HousekeepingController } from '../controllers/housekeeping.controller';
import { authenticateToken, requireHousekeeping } from '../middleware/auth';

const router = Router();

router.use(authenticateToken as any, requireHousekeeping as any);

router.get('/tasks', HousekeepingController.getTasks as any);
router.post('/tasks', HousekeepingController.createTask as any);
router.patch('/tasks/:id', HousekeepingController.updateTaskStatus as any);
router.patch('/tasks/:id/status', HousekeepingController.updateTaskStatus as any);
router.post('/tasks/:id/verify', HousekeepingController.verifyTask as any);
router.get('/dashboard', HousekeepingController.getDashboard as any);

export default router;
