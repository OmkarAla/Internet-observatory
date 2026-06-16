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
import { initSocketIO } from './services/socketService.js';
import { loadTimersFromDB } from './services/timerManager.js';

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

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  await connectDB();
  
  initSocketIO(server);
  
  await loadTimersFromDB();
  
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
