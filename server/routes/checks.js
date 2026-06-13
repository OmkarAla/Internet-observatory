import express from 'express';
import axios from 'axios';
import Website from '../models/Website.js';
import CheckResult from '../models/CheckResult.js';

const router = express.Router();

const TIMEOUT_MS = 10000;

router.get('/:websiteId', async (req, res) => {
  try {
    const checks = await CheckResult.find({ websiteId: req.params.websiteId })
      .sort({ checkedAt: -1 })
      .limit(50);
    res.json(checks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:websiteId', async (req, res) => {
  try {
    const website = await Website.findById(req.params.websiteId);
    if (!website) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const startTime = Date.now();
    let result;

    try {
      const response = await axios.get(website.url, {
        timeout: TIMEOUT_MS,
        validateStatus: () => true
      });
      
      const responseTime = Date.now() - startTime;
      const success = response.status >= 200 && response.status < 300;
      
      result = new CheckResult({
        websiteId: website._id,
        status: response.status,
        success,
        responseTime,
        error: null,
        checkedAt: new Date()
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      result = new CheckResult({
        websiteId: website._id,
        status: null,
        success: false,
        responseTime,
        error: error.message,
        checkedAt: new Date()
      });
    }

    await result.save();
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;