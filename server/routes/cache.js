/**
 * Cache Routes - Phase 9
 * 
 * Endpoints for cache demonstration and monitoring
 */

import express from 'express';
import { cache, cacheAside, thunderingHerdProtect } from '../services/cacheService.js';
import { getDashboardSummary } from '../services/analyticsService.js';

const router = express.Router();

/**
 * GET /api/cache/stats
 * Cache statistics
 */
router.get('/stats', (req, res) => {
  const stats = cache.getStats();
  res.json(stats);
});

/**
 * POST /api/cache/clear
 * Clear all cache entries
 */
router.post('/clear', (req, res) => {
  cache.clear();
  res.json({ message: 'Cache cleared' });
});

/**
 * GET /api/cache/demo/ttl
 * Demonstrate TTL expiration
 * 
 * First request: cache miss, fetches from "source" (simulated)
 * Subsequent requests within TTL: cache hit
 * After TTL expires: cache miss again
 */
router.get('/demo/ttl', async (req, res) => {
  const result = await cacheAside(
    'demo:ttl',
    async () => {
      // Simulate expensive computation
      await new Promise(r => setTimeout(r, 100));
      return {
        value: Math.random(),
        timestamp: new Date().toISOString()
      };
    },
    { ttl: 10000 } // 10 second TTL
  );
  
  res.json(result);
});

/**
 * GET /api/cache/demo/stale
 * Demonstrate stale-while-revalidate
 * 
 * After TTL expires:
 * - Returns stale data immediately
 * - Refreshes in background
 * - Next request gets fresh data
 */
router.get('/demo/stale', async (req, res) => {
  const result = await cacheAside(
    'demo:stale',
    async () => {
      await new Promise(r => setTimeout(r, 100));
      return {
        value: Math.random(),
        timestamp: new Date().toISOString()
      };
    },
    { 
      ttl: 5000,  // 5 second TTL
      staleWhileRevalidate: true // Allow stale data
    }
  );
  
  res.json(result);
});

/**
 * GET /api/cache/demo/thundering-herd
 * Demonstrate thundering herd protection
 * 
 * Without protection: 100 simultaneous requests → 100 DB queries
 * With protection: 100 simultaneous requests → 1 DB query
 */
router.get('/demo/thundering-herd', async (req, res) => {
  const result = await thunderingHerdProtect(
    'demo:thundering-herd',
    async () => {
      // Simulate expensive DB query
      console.log('[DEMO] Fetching from "DB" (only one request should see this)');
      await new Promise(r => setTimeout(r, 500));
      return {
        value: Math.random(),
        timestamp: new Date().toISOString(),
        message: 'Fetched from origin (should only appear once per cache miss)'
      };
    },
    { ttl: 30000 } // 30 second TTL
  );
  
  res.json(result);
});

/**
 * GET /api/cache/demo/analytics
 * Demonstrate caching expensive analytics queries
 * 
 * Without cache: Each request runs full aggregation pipeline
 * With cache: First request runs pipeline, subsequent requests use cache
 */
router.get('/demo/analytics', async (req, res) => {
  const hours = parseInt(req.query.hours) || 24;
  
  const result = await cacheAside(
    `analytics:dashboard:${hours}`,
    async () => {
      console.log('[CACHE] Running expensive analytics query...');
      return await getDashboardSummary(hours);
    },
    { 
      ttl: 60000, // 1 minute cache
      tags: ['analytics']
    }
  );
  
  res.json(result);
});

/**
 * POST /api/cache/invalidate
 * Invalidate cache by tag
 */
router.post('/invalidate', (req, res) => {
  const { tag } = req.body;
  
  if (!tag) {
    return res.status(400).json({ error: 'Tag is required' });
  }
  
  const count = cache.invalidateByTag(tag);
  res.json({ message: `Invalidated ${count} entries with tag "${tag}"` });
});

export default router;
