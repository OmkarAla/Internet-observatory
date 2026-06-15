import express from 'express';
import { resolveDomain } from '../services/dohClient.js';

const router = express.Router();

const VALID_TYPES = ['A', 'AAAA', 'MX', 'NS', 'CNAME', 'TXT', 'SOA'];

const isValidDomain = (domain) => {
  if (!domain || typeof domain !== 'string') return false;
  if (domain.length > 253) return false;
  if (domain.includes(' ') || domain.includes('..')) return false;
  if (!domain.includes('.')) return false;
  if (!/^[a-zA-Z0-9.-]+$/.test(domain)) return false;
  return true;
};

/**
 * GET /api/dns/resolve?domain=example.com&types=A,MX
 */
router.get('/resolve', async (req, res) => {
  try {
    const { domain, types } = req.query;

    if (!isValidDomain(domain)) {
      return res.status(400).json({
        error: 'Invalid domain. Must contain at least one dot, no spaces, max 253 characters.',
      });
    }

    const requestedTypes = types
      ? types.split(',').map((t) => t.trim().toUpperCase())
      : ['A', 'AAAA', 'MX', 'NS', 'CNAME', 'TXT', 'SOA'];

    const invalidTypes = requestedTypes.filter((t) => !VALID_TYPES.includes(t));
    if (invalidTypes.length > 0) {
      return res.status(400).json({
        error: `Invalid record types: ${invalidTypes.join(', ')}. Valid: ${VALID_TYPES.join(', ')}`,
      });
    }

    const result = await resolveDomain(domain, requestedTypes);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;