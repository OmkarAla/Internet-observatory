/**
 * Network Diagnostics Service - Phase 7
 * 
 * Concepts demonstrated:
 * 1. TCP connections (net module)
 * 2. UDP datagrams (dgram module)
 * 3. ICMP ping (child_process)
 * 4. Latency measurement
 * 5. Port scanning
 * 6. traceroute
 */

import net from 'net';
import dgram from 'dgram';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * TCP Connect Test
 * 
 * What happens when you connect to a port?
 * 1. SYN packet sent to server
 * 2. Server responds with SYN-ACK (if port open)
 * 3. Client sends ACK (three-way handshake)
 * 4. Connection established
 * 
 * If port is closed:
 * 1. SYN packet sent
 * 2. Server responds with RST (reset)
 * 3. Connection refused
 */
export const tcpConnect = (host, port, timeout = 5000) => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const socket = new net.Socket();

    const timer = setTimeout(() => {
      socket.destroy();
      resolve({
        host,
        port,
        status: 'timeout',
        latency: timeout,
        error: 'Connection timed out'
      });
    }, timeout);

    socket.connect(port, host, () => {
      const latency = Date.now() - startTime;
      clearTimeout(timer);
      socket.destroy();
      resolve({
        host,
        port,
        status: 'open',
        latency,
        error: null
      });
    });

    socket.on('error', (err) => {
      const latency = Date.now() - startTime;
      clearTimeout(timer);
      socket.destroy();
      resolve({
        host,
        port,
        status: 'closed',
        latency,
        error: err.code === 'ECONNREFUSED' ? 'Connection refused' :
               err.code === 'ENOTFOUND' ? 'Host not found' :
               err.code === 'ETIMEDOUT' ? 'Connection timed out' :
               err.message
      });
    });
  });
};

/**
 * TCP Port Scan
 * 
 * Scan multiple ports to find open services.
 * Common ports: 80 (HTTP), 443 (HTTPS), 22 (SSH), 21 (FTP), 3306 (MySQL)
 */
export const tcpPortScan = async (host, ports = [22, 80, 443, 3306, 5432], timeout = 3000) => {
  const results = await Promise.all(
    ports.map(port => tcpConnect(host, port, timeout))
  );
  
  return {
    host,
    ports: results,
    openPorts: results.filter(r => r.status === 'open').length,
    closedPorts: results.filter(r => r.status === 'closed').length,
    timeoutPorts: results.filter(r => r.status === 'timeout').length
  };
};

/**
 * UDP DNS Query (raw)
 * 
 * Compare to DoH (Phase 4):
 * - DoH: HTTPS → encrypted, works through firewalls
 * - Raw UDP: port 53 → faster, but unencrypted, may be blocked
 * 
 * UDP is connectionless:
 * - No handshake (just send)
 * - No guarantee of delivery
 * - No guarantee of order
 * - No guarantee the packet arrives at all
 */
export const udpDnsQuery = (domain, dnsServer = '8.8.8.8', timeout = 5000) => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const client = dgram.createSocket('udp4');

    // Build DNS query packet (simplified)
    const query = buildDnsQuery(domain);

    const timer = setTimeout(() => {
      client.close();
      resolve({
        domain,
        server: dnsServer,
        status: 'timeout',
        latency: timeout,
        error: 'Query timed out',
        response: null
      });
    }, timeout);

    client.send(query, 53, dnsServer, (err) => {
      if (err) {
        clearTimeout(timer);
        client.close();
        resolve({
          domain,
          server: dnsServer,
          status: 'error',
          latency: Date.now() - startTime,
          error: err.message,
          response: null
        });
      }
    });

    client.on('message', (msg) => {
      const latency = Date.now() - startTime;
      clearTimeout(timer);
      client.close();
      
      const response = parseDnsResponse(msg);
      resolve({
        domain,
        server: dnsServer,
        status: 'success',
        latency,
        error: null,
        response
      });
    });

    client.on('error', (err) => {
      clearTimeout(timer);
      client.close();
      resolve({
        domain,
        server: dnsServer,
        status: 'error',
        latency: Date.now() - startTime,
        error: err.message,
        response: null
      });
    });
  });
};

/**
 * Build a simple DNS query packet
 */
const buildDnsQuery = (domain) => {
  const parts = domain.split('.');
  const labels = [];
  
  for (const part of parts) {
    labels.push(Buffer.from([part.length, ...Buffer.from(part)]));
  }
  labels.push(Buffer.from([0])); // Root label
  
  const question = Buffer.concat([
    Buffer.concat(labels),
    Buffer.from([0x00, 0x01]), // Type A
    Buffer.from([0x00, 0x01])  // Class IN
  ]);
  
  // DNS header
  const header = Buffer.alloc(12);
  header.writeUInt16BE(Math.random() * 65535, 0); // Transaction ID
  header.writeUInt16BE(0x0100, 2); // Flags: standard query
  header.writeUInt16BE(1, 4);  // Questions
  header.writeUInt16BE(0, 6);  // Answers
  header.writeUInt16BE(0, 8);  // Authority
  header.writeUInt16BE(0, 10); // Additional
  
  return Buffer.concat([header, question]);
};

/**
 * Parse DNS response (simplified)
 */
const parseDnsResponse = (msg) => {
  const answers = [];
  const answerCount = msg.readUInt16BE(6);
  
  // Skip header (12 bytes) and question section
  let offset = 12;
  
  // Skip question
  while (msg[offset] !== 0) {
    offset += msg[offset] + 1;
  }
  offset += 5; // null + type + class
  
  // Parse answers
  for (let i = 0; i < answerCount; i++) {
    // Skip name (pointer or labels)
    if ((msg[offset] & 0xC0) === 0xC0) {
      offset += 2;
    } else {
      while (msg[offset] !== 0) offset += msg[offset] + 1;
      offset++;
    }
    
    const type = msg.readUInt16BE(offset);
    offset += 2;
    offset += 2; // Class
    const ttl = msg.readUInt32BE(offset);
    offset += 4;
    const dataLen = msg.readUInt16BE(offset);
    offset += 2;
    
    if (type === 1 && dataLen === 4) {
      answers.push({
        type: 'A',
        data: `${msg[offset]}.${msg[offset+1]}.${msg[offset+2]}.${msg[offset+3]}`,
        ttl
      });
    }
    
    offset += dataLen;
  }
  
  return { answers };
};

/**
 * ICMP Ping
 * 
 * ICMP (Internet Control Message Protocol):
 * - Used for diagnostics, not data transfer
 * - Ping uses ICMP Echo Request/Reply
 * - Works at network layer (below TCP/UDP)
 * 
 * Why ping uses ICMP:
 * - No port concept (ICMP is layer 3)
 * - No connection setup
 * - Minimal overhead
 * - Kernel handles it directly
 */
export const ping = async (host, count = 4, timeout = 5000) => {
  try {
    const platform = process.platform;
    const pingCmd = platform === 'win32' 
      ? `ping -n ${count} -w ${timeout} ${host}`
      : `ping -c ${count} -W ${Math.floor(timeout/1000)} ${host}`;
    
    const { stdout, stderr } = await execAsync(pingCmd, { timeout: timeout * count + 1000 });
    
    const result = parsePingOutput(stdout, platform);
    return {
      host,
      status: 'success',
      ...result
    };
  } catch (error) {
    return {
      host,
      status: 'error',
      error: error.message,
      packets: { sent: 0, received: 0, loss: 100 },
      times: []
    };
  }
};

/**
 * Parse ping output
 */
const parsePingOutput = (output, platform) => {
  const lines = output.split('\n');
  const times = [];
  let sent = 0, received = 0;
  
  for (const line of lines) {
    if (platform === 'win32') {
      const timeMatch = line.match(/time[=<](\d+)ms/);
      if (timeMatch) times.push(parseInt(timeMatch[1]));
      if (line.includes('Packets: Sent')) {
        const match = line.match(/Sent = (\d+), Received = (\d+)/);
        if (match) {
          sent = parseInt(match[1]);
          received = parseInt(match[2]);
        }
      }
    } else {
      const timeMatch = line.match(/time=(\d+\.?\d*) ms/);
      if (timeMatch) times.push(parseFloat(timeMatch[1]));
      if (line.includes('packet loss')) {
        const match = line.match(/(\d+) packets transmitted.*?(\d+) received/);
        if (match) {
          sent = parseInt(match[1]);
          received = parseInt(match[2]);
        }
      }
    }
  }
  
  const avg = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  const min = times.length > 0 ? Math.min(...times) : 0;
  const max = times.length > 0 ? Math.max(...times) : 0;
  
  return {
    packets: {
      sent,
      received,
      loss: sent > 0 ? ((sent - received) / sent * 100).toFixed(1) : 100
    },
    times,
    statistics: { avg, min, max }
  };
};

/**
 * Traceroute
 * 
 * How it works:
 * 1. Send packet with TTL=1
 * 2. First router decrements TTL to 0, sends ICMP Time Exceeded
 * 3. Send packet with TTL=2
 * 4. Second router decrements to 0, sends ICMP Time Exceeded
 * 5. Continue until destination reached
 * 
 * Each router reveals its IP → builds the path
 */
export const traceroute = async (host, maxHops = 30, timeout = 5000) => {
  try {
    const platform = process.platform;
    const cmd = platform === 'win32'
      ? `tracert -d -h ${maxHops} ${host}`
      : `traceroute -n -m ${maxHops} -w ${Math.floor(timeout/1000)} ${host}`;
    
    const { stdout } = await execAsync(cmd, { timeout: timeout * maxHops + 5000 });
    
    const hops = parseTracerouteOutput(stdout, platform);
    return {
      host,
      status: 'success',
      hops,
      hopCount: hops.length
    };
  } catch (error) {
    return {
      host,
      status: 'error',
      error: error.message,
      hops: [],
      hopCount: 0
    };
  }
};

/**
 * Parse traceroute output
 */
const parseTracerouteOutput = (output, platform) => {
  const hops = [];
  const lines = output.split('\n');
  
  for (const line of lines) {
    if (platform === 'win32') {
      const match = line.match(/^\s*(\d+)\s+<?(\d+ ms|<1 ms|\d+ ms)\s+([\d.]+|Request timed out)/);
      if (match) {
        hops.push({
          hop: parseInt(match[1]),
          ip: match[3] === 'Request timed out' ? '*' : match[3],
          time: match[2]
        });
      }
    } else {
      const match = line.match(/^\s*(\d+)\s+([\d.]+|\*)\s+([\d.]+ ms|\*|\d+\.\d+ ms)/);
      if (match) {
        hops.push({
          hop: parseInt(match[1]),
          ip: match[2],
          time: match[3]
        });
      }
    }
  }
  
  return hops;
};

/**
 * Latency Test (TCP-based)
 * 
 * Measures round-trip time by connecting to a server.
 * More reliable than ICMP for measuring application-level latency.
 */
export const latencyTest = async (host, port = 80, count = 10) => {
  const results = [];
  
  for (let i = 0; i < count; i++) {
    const result = await tcpConnect(host, port, 5000);
    results.push({
      attempt: i + 1,
      latency: result.latency,
      status: result.status
    });
  }
  
  const successful = results.filter(r => r.status === 'open');
  const latencies = successful.map(r => r.latency);
  
  return {
    host,
    port,
    count,
    successful: successful.length,
    failed: count - successful.length,
    statistics: {
      min: Math.min(...latencies) || 0,
      max: Math.max(...latencies) || 0,
      avg: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
      median: latencies.sort((a, b) => a - b)[Math.floor(latencies.length / 2)] || 0
    },
    results
  };
};

export default {
  tcpConnect,
  tcpPortScan,
  udpDnsQuery,
  ping,
  traceroute,
  latencyTest
};
