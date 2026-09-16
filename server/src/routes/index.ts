import { Router } from 'express';
import authRoutes from './auth.routes';
import residentRoutes from './resident.routes';
import ownerRoutes from './owner.routes';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Urban Nest API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Auth Routes
router.use('/auth', authRoutes);

// Resident Portal Routes (Phase 1)
router.use('/resident', residentRoutes);

// Owner / Admin Portal Routes (Phase 2)
router.use('/owner', ownerRoutes);

export default router;
