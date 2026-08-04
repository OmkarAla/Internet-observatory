import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4', '175.101.64.8', '202.153.32.3']);

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import connectDB from './config/db.js';
import websiteRoutes from './routes/websites.js';
import checkRoutes from './routes/checks.js';
import apiRoutes from './routes/apis.js';
import dnsRoutes from './routes/dns.js';
import crawlerRoutes from './routes/crawler.js';
import networkRoutes from './routes/network.js';
import analyticsRoutes from './routes/analytics.js';
import cacheRoutes from './routes/cache.js';
import scalingRoutes from './routes/scaling.js';
import { initSocketIO } from './services/socketService.js';
import { loadTimersFromDB, getQueueStats } from './services/timerManager.js';
import { ensureIndexes } from './services/analyticsService.js';

dotenv.config();

const app = express();
const server = createServer(app);

// Security headers
app.use(helmet());

// CORS — allow frontend origin
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Routes
app.use('/api/websites', websiteRoutes);
app.use('/api/websites', checkRoutes);
app.use('/api/apis', apiRoutes);
app.use('/api/dns', dnsRoutes);
app.use('/api/crawler', crawlerRoutes);
app.use('/api/network', networkRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/cache', cacheRoutes);
app.use('/api/scaling', scalingRoutes);

// Health check
app.get('/health', (req, res) => {
  const queueStats = getQueueStats();
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    queue: queueStats
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});

const PORT = process.env.PORT || 3001;
let httpServer;

const startServer = async () => {
  await connectDB();

  initSocketIO(server);

  await ensureIndexes();
  await loadTimersFromDB();

  httpServer = server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

// Graceful shutdown
const shutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  if (httpServer) {
    httpServer.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }

  // Force shutdown after 10s
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();
