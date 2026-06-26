/**
 * Analytics Routes - Phase 8
 * 
 * Endpoints for traffic analytics and metrics
 */

import express from 'express';
import {
  getUptime,
  getResponseTimeStats,
  getHourlyStats,
  getErrorBreakdown,
  getDashboardSummary
} from '../services/analyticsService.js';

const router = express.Router();

/**
 * GET /api/analytics/dashboard?hours=24
 * Full dashboard summary
 */
router.get('/dashboard', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const result = await getDashboardSummary(hours);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/uptime?type=website&id=xxx&hours=24
 * Uptime percentage
 */
router.get('/uptime', async (req, res) => {
  try {
    const { type, id, hours } = req.query;
    const result = await getUptime(type || 'website', id, parseInt(hours) || 24);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/response-time?type=website&id=xxx&hours=24
 * Response time statistics
 */
router.get('/response-time', async (req, res) => {
  try {
    const { type, id, hours } = req.query;
    const result = await getResponseTimeStats(type || 'website', id, parseInt(hours) || 24);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/hourly?type=website&id=xxx&hours=24
 * Hourly time-series stats
 */
router.get('/hourly', async (req, res) => {
  try {
    const { type, id, hours } = req.query;
    const result = await getHourlyStats(type || 'website', id, parseInt(hours) || 24);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/errors?type=website&id=xxx&hours=24
 * Error breakdown
 */
router.get('/errors', async (req, res) => {
  try {
    const { type, id, hours } = req.query;
    const result = await getErrorBreakdown(type || 'website', id, parseInt(hours) || 24);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
