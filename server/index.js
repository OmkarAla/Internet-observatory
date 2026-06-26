import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4', '175.101.64.8', '202.153.32.3']);

import express from 'express';
import cors from 'cors';
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
import { initSocketIO } from './services/socketService.js';
import { loadTimersFromDB, getQueueStats } from './services/timerManager.js';
import { ensureIndexes } from './services/analyticsService.js';

dotenv.config();

const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());

app.use('/api/websites', websiteRoutes);
app.use('/api/websites', checkRoutes);
app.use('/api/apis', apiRoutes);
app.use('/api/dns', dnsRoutes);
app.use('/api/crawler', crawlerRoutes);
app.use('/api/network', networkRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/cache', cacheRoutes);

app.get('/health', (req, res) => {
  const queueStats = getQueueStats();
  res.json({ 
    status: 'ok',
    queue: queueStats
  });
});

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  await connectDB();
  
  initSocketIO(server);
  
  await ensureIndexes();
  await loadTimersFromDB();
  
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
