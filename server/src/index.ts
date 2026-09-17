import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { config } from './config/env';
import apiRouter from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';

const app = express();
const PORT = config.port;

// Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Dynamic CORS configuration for Vercel + Local + Custom Domains
const configuredOrigins: string[] = [
  config.frontendUrl,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

if (process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL.split(',').forEach((u) => {
    const trimmed = u.trim();
    if (trimmed && !configuredOrigins.includes(trimmed)) {
      configuredOrigins.push(trimmed);
    }
  });
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, server-to-server, curl)
      if (!origin) return callback(null, true);

      if (
        configuredOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:')
      ) {
        return callback(null, true);
      }

      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-razorpay-signature', 'x-requested-with'],
  })
);

// Rate limiting
app.use('/api', apiLimiter);

// Body Parsers with Raw Body preservation for cryptographic signature verifications (Webhooks)
app.use(
  express.json({
    limit: '10mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for local uploads directory fallback
const uploadsDir = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api', apiRouter);

// Root / Health check fallback
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🏢 Urban Nest — Smart PG Backend API Server is running.',
    version: '1.0.0',
    environment: config.nodeEnv,
    apiRoot: '/api',
    health: '/api/health',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Urban Nest API is running',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

// 404 Catch-All Handler
app.use(notFoundHandler);

// Centralized Error Handling Middleware
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`================================================`);
  console.log(`  🏢 URBAN NEST — SMART PG BACKEND SERVICE     `);
  console.log(`  Environment: ${config.nodeEnv}               `);
  console.log(`  Server Port: ${PORT}                         `);
  console.log(`  Frontend:    ${config.frontendUrl}           `);
  console.log(`================================================`);
});

export default app;
