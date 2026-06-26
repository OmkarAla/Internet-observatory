/**
 * Network Diagnostics Routes - Phase 7
 * 
 * Endpoints for TCP, UDP, ICMP, and latency testing
 */

import express from 'express';
import { 
  tcpConnect, 
  tcpPortScan, 
  udpDnsQuery, 
  ping, 
  traceroute, 
  latencyTest 
} from '../services/networkService.js';

const router = express.Router();

/**
 * POST /api/network/tcp-connect
 * Test TCP connection to a host:port
 */
router.post('/tcp-connect', async (req, res) => {
  try {
    const { host, port, timeout } = req.body;
    
    if (!host) {
      return res.status(400).json({ error: 'Host is required' });
    }
    
    const result = await tcpConnect(
      host, 
      parseInt(port) || 80, 
      parseInt(timeout) || 5000
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/network/port-scan
 * Scan common ports on a host
 */
router.post('/port-scan', async (req, res) => {
  try {
    const { host, ports, timeout } = req.body;
    
    if (!host) {
      return res.status(400).json({ error: 'Host is required' });
    }
    
    const portList = ports || [22, 80, 443, 3306, 5432, 8080, 8443];
    const result = await tcpPortScan(host, portList, parseInt(timeout) || 3000);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/network/udp-dns
 * Raw UDP DNS query
 */
router.post('/udp-dns', async (req, res) => {
  try {
    const { domain, server, timeout } = req.body;
    
    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }
    
    const result = await udpDnsQuery(
      domain, 
      server || '8.8.8.8', 
      parseInt(timeout) || 5000
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/network/ping
 * ICMP ping a host
 */
router.post('/ping', async (req, res) => {
  try {
    const { host, count, timeout } = req.body;
    
    if (!host) {
      return res.status(400).json({ error: 'Host is required' });
    }
    
    const result = await ping(
      host, 
      parseInt(count) || 4, 
      parseInt(timeout) || 5000
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/network/traceroute
 * Traceroute to a host
 */
router.post('/traceroute', async (req, res) => {
  try {
    const { host, maxHops, timeout } = req.body;
    
    if (!host) {
      return res.status(400).json({ error: 'Host is required' });
    }
    
    const result = await traceroute(
      host, 
      parseInt(maxHops) || 30, 
      parseInt(timeout) || 5000
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/network/latency
 * TCP latency test
 */
router.post('/latency', async (req, res) => {
  try {
    const { host, port, count } = req.body;
    
    if (!host) {
      return res.status(400).json({ error: 'Host is required' });
    }
    
    const result = await latencyTest(
      host, 
      parseInt(port) || 80, 
      parseInt(count) || 10
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
