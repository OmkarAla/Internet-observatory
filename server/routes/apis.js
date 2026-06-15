import express from 'express';
import axios from 'axios';
import Api from '../models/Api.js';
import ApiCheckResult from '../models/ApiCheckResult.js';
import { retryWithBackoff } from '../services/retry.js';
import { shouldAllowRequest, recordSuccess, recordFailure, getCircuitStatus } from '../services/circuitBreaker.js';

const router = express.Router();

export const checkApi = async (apiId) => {
  const api = await Api.findById(apiId);
  if (!api) {
    throw new Error('API not found');
  }

  if (!shouldAllowRequest(api._id)) {
    const result = new ApiCheckResult({
      apiId: api._id,
      status: null,
      success: false,
      error: 'Circuit breaker is OPEN - API marked as down',
      responseTime: 0,
      checkedAt: new Date()
    });
    await result.save();
    return result;
  }

  const startTime = Date.now();
  let result;

  try {
    const response = await retryWithBackoff(
      async () => {
        return await axios({
          method: api.method,
          url: api.url,
          headers: api.headers,
          timeout: api.timeout,
          validateStatus: () => true
        });
      },
      {
        maxRetries: api.retries,
        baseDelay: 1000,
        maxDelay: 10000,
        onRetry: ({ attempt, delay, error }) => {
          console.log(`API ${api.name}: Retry ${attempt} after ${delay}ms - ${error}`);
        }
      }
    );
    
    const responseTime = Date.now() - startTime;
    
    const statusMatch = response.status === api.expectedStatus;
    const isJson = response.headers['content-type']?.includes('application/json');
    let jsonValid = true;
    
    if (isJson && api.method !== 'HEAD' && typeof response.data === 'string') {
      try {
        JSON.parse(response.data);
      } catch {
        jsonValid = false;
      }
    }
    
    const success = statusMatch && jsonValid;
    
    if (success) {
      recordSuccess(api._id);
    } else {
      recordFailure(api._id);
    }
    
    result = new ApiCheckResult({
      apiId: api._id,
      status: response.status,
      success,
      responseTime,
      error: success ? null : `Status: ${response.status}, JSON valid: ${jsonValid}`,
      checkedAt: new Date()
    });
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    recordFailure(api._id);
    
    result = new ApiCheckResult({
      apiId: api._id,
      status: null,
      success: false,
      responseTime,
      error: error.message,
      checkedAt: new Date()
    });
  }

  await result.save();
  return result;
};

/**
 * GET /api/apis
 */
router.get('/', async (req, res) => {
  try {
    const apis = await Api.find().sort({ createdAt: -1 });
    
    const apisWithStatus = apis.map(api => ({
      ...api.toObject(),
      circuitBreaker: getCircuitStatus(api._id)
    }));
    
    res.json(apisWithStatus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/apis
 */
router.post('/', async (req, res) => {
  try {
    const { name, url, method, headers, expectedStatus, timeout, retries } = req.body;
    
    if (!name || !url) {
      return res.status(400).json({ error: 'Name and URL are required' });
    }
    
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    const api = new Api({
      name,
      url,
      method: method || 'GET',
      headers: headers || {},
      expectedStatus: expectedStatus || 200,
      timeout: timeout || 10000,
      retries: retries || 3
    });
    
    await api.save();
    res.status(201).json(api);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/apis/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const api = await Api.findByIdAndDelete(req.params.id);
    if (!api) {
      return res.status(404).json({ error: 'API not found' });
    }
    res.json({ message: 'API deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/apis/:apiId/checks
 */
router.get('/:apiId/checks', async (req, res) => {
  try {
    const checks = await ApiCheckResult.find({ apiId: req.params.apiId })
      .sort({ checkedAt: -1 })
      .limit(50);
    res.json(checks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/apis/:apiId/check
 */
router.post('/:apiId/check', async (req, res) => {
  try {
    const result = await checkApi(req.params.apiId);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/interval', async (req, res) => {
  try {
    const { checkInterval } = req.body;
    
    if (checkInterval !== null && (typeof checkInterval !== 'number' || checkInterval < 10000)) {
      return res.status(400).json({ error: 'Interval must be null or >= 10000ms' });
    }
    
    const api = await Api.findByIdAndUpdate(
      req.params.id,
      { checkInterval },
      { new: true }
    );
    
    if (!api) {
      return res.status(404).json({ error: 'API not found' });
    }
    
    res.json(api);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
