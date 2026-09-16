import { Router } from 'express';
import authRoutes from './auth.routes';
import residentRoutes from './resident.routes';
import ownerRoutes from './owner.routes';

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
      }
    }
  });
});

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    name: 'Urban Nest API',
    status: 'HEALTHY',
    message: 'Urban Nest API is running smoothly',
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
