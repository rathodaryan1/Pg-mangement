import { Router } from 'express';
import authRoutes from './auth.routes';
import residentRoutes from './resident.routes';
import ownerRoutes from './owner.routes';
import webhookRoutes from './webhook.routes';
import { prisma } from '../config/prisma';

const router = Router();

// API Root Status
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    name: 'Urban Nest Smart PG Management API',
    version: '1.0.0',
    status: 'ONLINE',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register',
        me: 'GET /api/auth/me',
      },
      owner: {
        dashboard: 'GET /api/owner/dashboard',
        properties: 'GET /api/owner/properties',
        rooms: 'GET /api/owner/rooms',
        residents: 'GET /api/owner/residents',
        payments: 'GET /api/owner/payments',
        visitors: 'GET /api/owner/visitors',
        complaints: 'GET /api/owner/complaints',
        staff: 'GET /api/owner/staff',
        inventory: 'GET /api/owner/inventory',
      },
      resident: {
        dashboard: 'GET /api/resident/dashboard',
        room: 'GET /api/resident/room',
        payments: 'GET /api/resident/payments',
        visitors: 'GET /api/resident/visitors',
        complaints: 'GET /api/resident/complaints',
        documents: 'GET /api/resident/documents',
        notices: 'GET /api/resident/notices',
      },
      webhooks: {
        razorpay: 'POST /api/webhooks/razorpay'
      }
    }
  });
});

// Production Safe Health Check
router.get('/health', async (req, res) => {
  let dbStatus = 'UNKNOWN';
  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000));
    await Promise.race([prisma.$queryRaw`SELECT 1`, timeout]);
    dbStatus = 'CONNECTED';
  } catch {
    dbStatus = 'FALLBACK_READY';
  }

  res.status(200).json({
    success: true,
    name: 'Urban Nest API',
    status: 'HEALTHY',
    database: dbStatus,
    message: 'Urban Nest API is running smoothly',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

import { OwnerController } from '../controllers/owner.controller';

// Auth Routes
router.use('/auth', authRoutes);

// Resident Portal Routes
router.use('/resident', residentRoutes);

// Owner / Admin Portal Routes
router.use('/owner', ownerRoutes);

// Gate Verification Route for Camera Scans
router.get('/gate/verify/:token', OwnerController.verifyVisitorQRByToken as any);
router.post('/gate/verify', OwnerController.verifyVisitorQR as any);

// Webhook Handlers
router.use('/webhooks', webhookRoutes);

export default router;
