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

// CORS configuration
app.use(
  cors({
    origin: [
      config.frontendUrl,
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate limiting
app.use('/api', apiLimiter);

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for local uploads directory
const uploadsDir = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api', apiRouter);

// Root / Health check fallback
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Urban Nest API is running',
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
  console.log(`  Server URL:  http://localhost:${PORT}        `);
  console.log(`  API Base:    http://localhost:${PORT}/api    `);
  console.log(`  Health:      http://localhost:${PORT}/api/health`);
  console.log(`================================================`);
});

export default app;
