/**
 * Scaling Routes - Phase 10
 * 
 * Endpoints for rate limiting, load balancing, and bottleneck analysis
 */

import express from 'express';
import { 
  rateLimiter, 
  slidingWindow, 
  loadBalancer, 
  bottleneckAnalyzer 
} from '../services/scalingService.js';

const router = express.Router();

/**
 * POST /api/scaling/rate-limit
 * Test token bucket rate limiter
 */
router.post('/rate-limit', (req, res) => {
  const result = rateLimiter.consume();
  const stats = rateLimiter.getStats();
  res.json({ ...result, stats });
});

/**
 * GET /api/scaling/rate-limit/stats
 * Get rate limiter statistics
 */
router.get('/rate-limit/stats', (req, res) => {
  const stats = rateLimiter.getStats();
  res.json(stats);
});

/**
 * POST /api/scaling/sliding-window
 * Test sliding window rate limiter
 */
router.post('/sliding-window', (req, res) => {
  const result = slidingWindow.consume();
  const stats = slidingWindow.getStats();
  res.json({ ...result, stats });
});

/**
 * GET /api/scaling/sliding-window/stats
 * Get sliding window statistics
 */
router.get('/sliding-window/stats', (req, res) => {
  const stats = slidingWindow.getStats();
  res.json(stats);
});

/**
 * POST /api/scaling/load-balance
 * Distribute a request across servers
 */
router.post('/load-balance', (req, res) => {
  const server = loadBalancer.distribute();
  const stats = loadBalancer.getStats();
  res.json({ server, stats });
});

/**
 * POST /api/scaling/load-balance/complete
 * Mark a request as complete
 */
router.post('/load-balance/complete', (req, res) => {
  const { serverId } = req.body;
  if (serverId) {
    loadBalancer.complete(serverId);
  }
  const stats = loadBalancer.getStats();
  res.json({ stats });
});

/**
 * POST /api/scaling/load-balance/algorithm
 * Change load balancing algorithm
 */
router.post('/load-balance/algorithm', (req, res) => {
  const { algorithm } = req.body;
  loadBalancer.setAlgorithm(algorithm);
  const stats = loadBalancer.getStats();
  res.json({ stats });
});

/**
 * POST /api/scaling/load-balance/toggle
 * Toggle server health status
 */
router.post('/load-balance/toggle', (req, res) => {
  const { serverId } = req.body;
  loadBalancer.toggleServer(serverId);
  const stats = loadBalancer.getStats();
  res.json({ stats });
});

/**
 * GET /api/scaling/load-balance/stats
 * Get load balancer statistics
 */
router.get('/load-balance/stats', (req, res) => {
  const stats = loadBalancer.getStats();
  res.json(stats);
});

/**
 * POST /api/scaling/record-request
 * Record a request for bottleneck analysis
 */
router.post('/record-request', (req, res) => {
  const { responseTime } = req.body;
  bottleneckAnalyzer.recordRequest(responseTime || Math.random() * 500);
  res.json({ success: true });
});

/**
 * POST /api/scaling/record-db
 * Record a database query for bottleneck analysis
 */
router.post('/record-db', (req, res) => {
  const { queryTime } = req.body;
  bottleneckAnalyzer.recordDatabase(queryTime || Math.random() * 100);
  res.json({ success: true });
});

/**
 * GET /api/scaling/bottleneck
 * Analyze current bottlenecks
 */
router.get('/bottleneck', (req, res) => {
  const analysis = bottleneckAnalyzer.analyze();
  res.json(analysis);
});

/**
 * POST /api/scaling/simulate
 * Simulate load for testing
 */
router.post('/simulate', (req, res) => {
  const { requests, avgResponseTime } = req.body;
  const count = Math.min(requests || 100, 1000);
  const avgTime = avgResponseTime || 200;
  
  for (let i = 0; i < count; i++) {
    const responseTime = avgTime * (0.5 + Math.random());
    bottleneckAnalyzer.recordRequest(responseTime);
  }
  
  const analysis = bottleneckAnalyzer.analyze();
  res.json({ 
    simulated: count, 
    avgResponseTime: avgTime,
    analysis 
  });
});

export default router;
