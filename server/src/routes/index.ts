import { Router } from 'express';
import { prisma } from '../config/prisma';
import authRoutes from './auth.routes';
import residentRoutes from './resident.routes';
import ownerRoutes from './owner.routes';
import superAdminRoutes from './super-admin.routes';
import webhookRoutes from './webhook.routes';
import { OwnerController } from '../controllers/owner.controller';

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
      superAdmin: {
        dashboard: 'GET /api/super-admin/dashboard/stats',
        tenants: 'GET /api/super-admin/tenants',
        owners: 'GET /api/super-admin/owners',
        plans: 'GET /api/super-admin/plans',
      },
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

// Production Safe Database Readiness & Health Check
router.get('/health', async (req, res) => {
  let dbStatus = 'DATABASE_UNAVAILABLE';
  let isConnected = false;
  let latencyMs = 0;
  let diagnosticReason: string | undefined = undefined;

  try {
    const startTime = Date.now();
    const timeout = new Promise((_, reject) => {
      const err: any = new Error('DATABASE_TIMEOUT');
      err.code = 'TIMEOUT';
      setTimeout(() => reject(err), 8000);
    });

    await Promise.race([prisma.$queryRaw`SELECT 1`, timeout]);
    latencyMs = Date.now() - startTime;
    dbStatus = 'DATABASE_CONNECTED';
    isConnected = true;
  } catch (error: any) {
    isConnected = false;
    diagnosticReason = error?.code || error?.name || 'UNKNOWN_ERROR';
    if (error.code === 'TIMEOUT' || error.message?.includes('DATABASE_TIMEOUT')) {
      dbStatus = 'DATABASE_TIMEOUT';
    } else if (
      error.message?.includes('password authentication failed') ||
      error.code === 'P1000' ||
      error.message?.includes('Authentication failed')
    ) {
      dbStatus = 'DATABASE_AUTH_ERROR';
    } else {
      dbStatus = 'DATABASE_UNAVAILABLE';
    }
  }

  const statusCode = isConnected ? 200 : 503;

  return res.status(statusCode).json({
    success: isConnected,
    name: 'Urban Nest API',
    status: isConnected ? 'HEALTHY' : 'DEGRADED',
    database: dbStatus,
    diagnostic: diagnosticReason,
    latencyMs: isConnected ? latencyMs : undefined,
    message: isConnected
      ? 'Urban Nest API and PostgreSQL database are fully operational.'
      : 'Database service is temporarily unreachable. Please verify PostgreSQL connection in server environment.',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Super Admin SaaS Platform Routes
router.use('/super-admin', superAdminRoutes);

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
