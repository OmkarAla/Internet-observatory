import axios from 'axios';

/**
 * Improved Web Crawler - Phase 5
 * 
 * Concepts demonstrated:
 * 1. Parallel fetching (Promise.allSettled for fault tolerance)
 * 2. Error isolation (one page failure doesn't kill crawl)
 * 3. Same-domain focus (graph traversal strategy)
 * 4. Rate limiting (don't overwhelm servers)
 * 5. Visited set (prevent infinite loops)
 * 6. BFS traversal (level-by-level discovery)
 */

const extractLinks = (html, baseUrl) => {
  const links = new Set();
  const linkRegex = /href=["']([^"']+)["']/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    let href = match[1];

    if (!href.startsWith('http') && !href.startsWith('/')) continue;

    if (href.startsWith('/')) {
      const urlObj = new URL(baseUrl);
      href = `${urlObj.protocol}//${urlObj.host}${href}`;
    }

    try {
      const urlObj = new URL(href);
      const normalized = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`.toLowerCase();
      links.add(normalized);
    } catch (e) {
      // Invalid URL, skip
    }
  }

  return Array.from(links);
};

/**
 * Fetch a single page with error isolation
 */
export const crawlPage = async (url) => {
  const startTime = Date.now();

  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'InternetObservatory/1.0 (Learning Crawler)'
      },
      maxRedirects: 5
    });

    const html = response.data;
    const links = extractLinks(html, url);
    const responseTime = Date.now() - startTime;

    return {
      url,
      status: response.status,
      links,
      linksCount: links.length,
      responseTime,
      size: typeof html === 'string' ? html.length : 0,
      contentType: response.headers['content-type'],
      error: null
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      url,
      status: error.response?.status || 0,
      links: [],
      linksCount: 0,
      responseTime,
      size: 0,
      contentType: null,
      error: error.code === 'ECONNABORTED' ? 'Timeout' :
             error.code === 'ENOTFOUND' ? 'DNS failure' :
             error.response?.status === 404 ? 'Not found' :
             error.message
    };
  }
};

/**
 * Filter links to same domain (optional strategy)
 */
const sameDomainFilter = (links, baseUrl) => {
  try {
    const baseHost = new URL(baseUrl).host;
    return links.filter(link => {
      try {
        return new URL(link).host === baseHost;
      } catch {
        return false;
      }
    });
  } catch {
    return links;
  }
};

/**
 * Rate-limited delay
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * BFS Crawler - Improved with parallel fetching + error isolation
 * 
 * Key changes from simplest version:
 * - Fetches pages in parallel batches (Promise.allSettled)
 * - One failure doesn't kill the crawl
 * - Rate limiting between batches
 * - Same-domain filtering option
 */
export const crawlBFS = async (startUrl, options = {}) => {
  const {
    maxDepth = 1,
    maxPages = 10,
    sameDomain = false,
    concurrency = 3,
    delayMs = 200
  } = options;

  const visited = new Set();
  const queue = [{ url: startUrl, depth: 0 }];
  const results = [];
  const errors = [];
  let pagesCrawled = 0;

  while (queue.length > 0 && pagesCrawled < maxPages) {
    // Take a batch of URLs from the queue
    const batch = [];
    while (queue.length > 0 && batch.length < concurrency && pagesCrawled + batch.length < maxPages) {
      const item = queue.shift();
      if (!visited.has(item.url)) {
        batch.push(item);
      }
    }

    if (batch.length === 0) break;

    // Mark all as visited before fetching (prevents duplicates in queue)
    batch.forEach(item => visited.add(item.url));

    // Fetch all pages in parallel
    const fetchPromises = batch.map(item =>
      crawlPage(item.url)
        .then(result => ({ ...result, depth: item.depth }))
    );

    const settled = await Promise.allSettled(fetchPromises);

    // Process results
    for (const result of settled) {
      if (result.status === 'fulfilled') {
        const pageResult = result.value;
        results.push(pageResult);
        pagesCrawled++;

        // Add discovered links to queue (if within depth limit)
        if (pageResult.depth < maxDepth && !pageResult.error) {
          let links = pageResult.links;

          // Optionally filter to same domain
          if (sameDomain) {
            links = sameDomainFilter(links, startUrl);
          }

          for (const link of links) {
            if (!visited.has(link)) {
              queue.push({ url: link, depth: pageResult.depth + 1 });
            }
          }
        }
      } else {
        // Promise itself rejected (shouldn't happen with our error handling)
        errors.push({
          url: batch[settled.indexOf(result)]?.url || 'unknown',
          error: result.reason?.message || 'Unknown error'
        });
      }
    }

    // Rate limit between batches
    if (queue.length > 0 && pagesCrawled < maxPages) {
      await delay(delayMs);
    }
  }

  return {
    startUrl,
    pagesCrawled: results.length,
    maxDepth,
    sameDomain,
    results,
    errors,
    visitedCount: visited.size,
    queueRemaining: queue.length
  };
};