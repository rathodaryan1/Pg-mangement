import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/api';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS with support for frontend client requests
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
  credentials: true,
}));

// Body parser configurations
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Core API endpoints
app.use('/api', apiRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date(), message: 'PG Management Server is healthy.' });
});

// Global error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`================================================`);
  console.log(`   PG Management Server started successfully!   `);
  console.log(`   Local Server URL: http://localhost:${PORT}   `);
  console.log(`================================================`);
});

// Watcher trigger comment v3

