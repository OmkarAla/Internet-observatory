import express from 'express';
import { crawlPage, crawlBFS } from '../services/crawlerService.js';

const router = express.Router();

const isValidUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  try {
    new URL(url);
    return url.startsWith('http://') || url.startsWith('https://');
  } catch {
    return false;
  }
};

/**
 * GET /api/crawler/crawl?url=https://example.com
 * Crawl a single page and extract links
 */
router.get('/crawl', async (req, res) => {
  try {
    const { url } = req.query;

    if (!isValidUrl(url)) {
      return res.status(400).json({
        error: 'Invalid URL. Must start with http:// or https://'
      });
    }

    const result = await crawlPage(url);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/crawler/bfs?url=https://example.com&depth=1&maxPages=10&sameDomain=false&concurrency=3&delay=200
 * BFS crawl with parallel fetching
 */
router.get('/bfs', async (req, res) => {
  try {
    const { url, depth, maxPages, sameDomain, concurrency, delay } = req.query;

    if (!isValidUrl(url)) {
      return res.status(400).json({
        error: 'Invalid URL. Must start with http:// or https://'
      });
    }

    const options = {
      maxDepth: Math.min(parseInt(depth) || 1, 3),
      maxPages: Math.min(parseInt(maxPages) || 10, 50),
      sameDomain: sameDomain === 'true',
      concurrency: Math.min(Math.max(parseInt(concurrency) || 3, 1), 5),
      delayMs: Math.min(Math.max(parseInt(delay) || 200, 0), 2000)
    };

    const result = await crawlBFS(url, options);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;