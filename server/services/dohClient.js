const RESOLVERS = {
  google: {
    name: 'Google',
    url: 'https://dns.google/resolve',
  },
  cloudflare: {
    name: 'Cloudflare',
    url: 'https://cloudflare-dns.com/dns-query',
  },
  quad9: {
    name: 'Quad9',
    url: 'https://dns.quad9.net:5053/dns-query',
  },
};

const CACHE_TTL = 30000;
const QUERY_TIMEOUT = 5000;
const cache = new Map();

const getCacheKey = (domain, types) => `${domain}:${[...types].sort().join(',')}`;

const getCached = (key) => {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  cache.delete(key);
  return null;
};

const setCache = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

const querySingleResolver = async (resolverKey, domain, types) => {
  const resolver = RESOLVERS[resolverKey];
  const records = {};

  const queries = types.map(async (type) => {
    try {
      const url = new URL(resolver.url);
      url.searchParams.set('name', domain);
      url.searchParams.set('type', type);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), QUERY_TIMEOUT);

      const response = await fetch(url.toString(), {
        headers: { 'Accept': 'application/dns-json' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return { type, records: [], error: `HTTP ${response.status}` };
      }

      const data = await response.json();

      if (data.Status === 3) {
        return { type, records: [], error: 'NXDOMAIN' };
      }

      const parsedRecords = (data.Answer || [])
        .filter((a) => a.type === getTypeCode(type))
        .map((a) => ({
          data: a.data,
          TTL: a.TTL,
          ...(type === 'MX' && { priority: extractMxPriority(a.data) }),
        }));

      return { type, records: parsedRecords, error: null };
    } catch (err) {
      if (err.name === 'AbortError') {
        return { type, records: [], error: 'Timeout' };
      }
      return { type, records: [], error: err.message };
    }
  });

  const results = await Promise.all(queries);
  let hasError = false;

  results.forEach((r) => {
    records[r.type] = r.records;
    if (r.error) hasError = true;
  });

  return {
    records,
    error: hasError ? results.find((r) => r.error)?.error : null,
  };
};

const getTypeCode = (type) => {
  const codes = { A: 1, AAAA: 28, MX: 15, NS: 2, CNAME: 5, TXT: 16, SOA: 6 };
  if (!codes[type]) throw new Error(`Unknown record type: ${type}`);
  return codes[type];
};

const extractMxPriority = (data) => {
  const match = data.match(/^(\d+)\s+/);
  return match ? parseInt(match[1]) : 0;
};

export const clearCache = () => cache.clear();

export const resolveDomain = async (domain, types = ['A', 'AAAA', 'MX', 'NS', 'CNAME', 'TXT', 'SOA']) => {
  const cacheKey = getCacheKey(domain, types);
  const cached = getCached(cacheKey);
  if (cached) return { ...cached, cached: true };

  const startTime = Date.now();

  const resolverKeys = Object.keys(RESOLVERS);
  const resolverPromises = resolverKeys.map((key) =>
    querySingleResolver(key, domain, types)
      .then((result) => ({
        key,
        ...result,
        responseTime: Date.now() - startTime,
      }))
      .catch((error) => ({
        key,
        records: {},
        responseTime: Date.now() - startTime,
        error: 'Resolver failed',
      }))
  );

  const results = await Promise.all(resolverPromises);

  const queries = {};
  results.forEach(({ key, records, error, responseTime }) => {
    queries[key] = { records, responseTime, error };
  });

  const response = {
    domain,
    queries,
    resolutionChain: buildResolutionChain(domain),
    timestamp: new Date().toISOString(),
    cached: false,
  };

  setCache(cacheKey, response);
  return response;
};

const buildResolutionChain = (domain) => {
  const parts = domain.split('.');
  const tld = parts[parts.length - 1];
  const registered = parts.slice(-2).join('.');

  return [
    { server: 'Root', description: `Referral to .${tld} TLD nameservers` },
    { server: 'TLD', description: `Referral to ${registered} authoritative nameservers` },
    { server: 'Authoritative', description: `Final answer for ${domain}` },
  ];
};

export default { resolveDomain };
