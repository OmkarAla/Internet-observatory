/**
 * Analytics Service - Phase 8
 * 
 * Concepts demonstrated:
 * 1. MongoDB aggregation pipelines
 * 2. Indexes for query performance
 * 3. Time-series data patterns
 * 4. Metrics and statistics
 * 
 * Prediction: Without indexes, these queries will scan the ENTIRE collection.
 * With 100,000 check results, that's slow. With 1,000,000, it's unusable.
 */

import CheckResult from '../models/CheckResult.js';
import ApiCheckResult from '../models/ApiCheckResult.js';
import Website from '../models/Website.js';
import Api from '../models/Api.js';

/**
 * Ensure indexes exist
 * 
 * WHY indexes matter:
 * - Without index: MongoDB scans every document (full collection scan)
 * - With index: MongoDB uses a B-tree to jump directly to matching documents
 * - Analogy: Index is like a book's table of contents vs reading every page
 * 
 * When to add indexes:
 * - Fields used in WHERE clauses (filtering)
 * - Fields used in SORT operations
 * - Fields used in GROUP BY (aggregation)
 */
export const ensureIndexes = async () => {
  try {
    // CheckResult indexes
    await CheckResult.schema.index({ websiteId: 1, checkedAt: -1 });
    await CheckResult.schema.index({ checkedAt: -1 });
    await CheckResult.schema.index({ success: 1 });
    
    // ApiCheckResult indexes
    await ApiCheckResult.schema.index({ apiId: 1, checkedAt: -1 });
    await ApiCheckResult.schema.index({ checkedAt: -1 });
    await ApiCheckResult.schema.index({ success: 1 });
    
    // Create indexes in background (non-blocking)
    await CheckResult.ensureIndexes();
    await ApiCheckResult.ensureIndexes();
    
    console.log('[ANALYTICS] Indexes ensured');
  } catch (error) {
    console.error('[ANALYTICS] Index creation failed:', error.message);
  }
};

/**
 * Uptime Percentage
 * 
 * Question: How do we calculate uptime?
 * Answer: (successful checks / total checks) × 100
 * 
 * Without index on { websiteId: 1, checkedAt: -1 }:
 * - MongoDB scans ALL check results, then filters
 * - With 100k results for 100 websites = 1000 scans per query
 * 
 * With index:
 * - MongoDB jumps directly to the matching website's checks
 * - Only scans the relevant documents
 */
export const getUptime = async (type = 'website', id = null, hours = 24) => {
  const Model = type === 'website' ? CheckResult : ApiCheckResult;
  const idField = type === 'website' ? 'websiteId' : 'apiId';
  
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  const matchStage = {
    checkedAt: { $gte: since }
  };
  
  if (id) {
    matchStage[idField] = id;
  }
  
  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: id ? null : `$${idField}`,
        total: { $sum: 1 },
        successful: { $sum: { $cond: ['$success', 1, 0] } },
        failed: { $sum: { $cond: ['$success', 0, 1] } }
      }
    },
    {
      $project: {
        _id: 0,
        id: '$_id',
        total: 1,
        successful: 1,
        failed: 1,
        uptime: {
          $cond: [
            { $eq: ['$total', 0] },
            100,
            { $multiply: [{ $divide: ['$successful', '$total'] }, 100] }
          ]
        }
      }
    }
  ];
  
  return await Model.aggregate(pipeline);
};

/**
 * Response Time Statistics
 * 
 * MongoDB aggregation operators used:
 * - $avg: Average of all values
 * - $min: Minimum value
 * - $max: Maximum value
 * - $stdDevPop: Standard deviation (how spread out the data is)
 * 
 * Why standard deviation matters:
 * - Low stddev = consistent performance
 * - High stddev = unpredictable (bad for user experience)
 */
export const getResponseTimeStats = async (type = 'website', id = null, hours = 24) => {
  const Model = type === 'website' ? CheckResult : ApiCheckResult;
  const idField = type === 'website' ? 'websiteId' : 'apiId';
  
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  const matchStage = {
    checkedAt: { $gte: since },
    success: true,
    responseTime: { $ne: null }
  };
  
  if (id) {
    matchStage[idField] = id;
  }
  
  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: id ? null : `$${idField}`,
        count: { $sum: 1 },
        avg: { $avg: '$responseTime' },
        min: { $min: '$responseTime' },
        max: { $max: '$responseTime' },
        stddev: { $stdDevPop: '$responseTime' }
      }
    },
    {
      $project: {
        _id: 0,
        id: '$_id',
        count: 1,
        avg: { $round: ['$avg', 2] },
        min: 1,
        max: 1,
        stddev: { $round: ['$stddev', 2] }
      }
    }
  ];
  
  return await Model.aggregate(pipeline);
};

/**
 * Time-Series Aggregation (Hourly Buckets)
 * 
 * This is the core of time-series analytics.
 * 
 * Problem: "What was the average response time each hour today?"
 * 
 * Solution: $group by time bucket
 * - $dateTrunc: Rounds timestamp to the hour
 * - $avg: Calculates average within each bucket
 * 
 * Without index on checkedAt:
 * - Full collection scan to find all documents in time range
 * - Then groups them
 * 
 * With index:
 * - Index range scan directly to matching documents
 * - Only processes relevant time range
 */
export const getHourlyStats = async (type = 'website', id = null, hours = 24) => {
  const Model = type === 'website' ? CheckResult : ApiCheckResult;
  const idField = type === 'website' ? 'websiteId' : 'apiId';
  
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  const matchStage = {
    checkedAt: { $gte: since }
  };
  
  if (id) {
    matchStage[idField] = id;
  }
  
  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: {
          hour: { $dateTrunc: { date: '$checkedAt', unit: 'hour' } },
          ...(id ? {} : { [idField]: `$${idField}` })
        },
        checks: { $sum: 1 },
        successful: { $sum: { $cond: ['$success', 1, 0] } },
        avgResponseTime: {
          $avg: {
            $cond: ['$success', '$responseTime', null]
          }
        },
        errors: {
          $push: {
            $cond: ['$success', null, '$error']
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        hour: '$_id.hour',
        ...(id ? {} : { [idField]: `$_id.${idField}` }),
        checks: 1,
        successful: 1,
        avgResponseTime: { $round: ['$avgResponseTime', 2] },
        errorCount: {
          $size: {
            $filter: {
              input: '$errors',
              cond: { $ne: ['$$this', null] }
            }
          }
        }
      }
    },
    { $sort: { hour: 1 } }
  ];
  
  return await Model.aggregate(pipeline);
};

/**
 * Error Breakdown
 * 
 * Group errors by type to find patterns.
 * 
 * Example output:
 * - "ECONNREFUSED": 45 occurrences
 * - "Timeout": 12 occurrences
 * - "DNS failure": 3 occurrences
 * 
 * This tells you: The main problem is connection refused (server down),
 * not timeouts (slow network) or DNS failures (name resolution).
 */
export const getErrorBreakdown = async (type = 'website', id = null, hours = 24) => {
  const Model = type === 'website' ? CheckResult : ApiCheckResult;
  const idField = type === 'website' ? 'websiteId' : 'apiId';
  
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  const matchStage = {
    checkedAt: { $gte: since },
    success: false,
    error: { $ne: null }
  };
  
  if (id) {
    matchStage[idField] = id;
  }
  
  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: '$error',
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        error: '$_id',
        count: 1
      }
    },
    { $sort: { count: -1 } }
  ];
  
  return await Model.aggregate(pipeline);
};

/**
 * Dashboard Summary
 * 
 * Single query that returns all metrics needed for the dashboard.
 * Uses $facet to run multiple aggregations in one pass.
 * 
 * Why $facet?
 * - Without: 4 separate queries = 4 full collection scans
 * - With: 1 scan, 4 aggregation branches
 * - Tradeoff: More memory per query, but fewer round trips
 */
export const getDashboardSummary = async (hours = 24) => {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  const websitePipeline = [
    { $match: { checkedAt: { $gte: since } } },
    {
      $facet: {
        uptime: [
          {
            $group: {
              _id: '$websiteId',
              total: { $sum: 1 },
              successful: { $sum: { $cond: ['$success', 1, 0] } }
            }
          },
          {
            $group: {
              _id: null,
              totalChecks: { $sum: '$total' },
              totalSuccessful: { $sum: '$successful' }
            }
          }
        ],
        responseTime: [
          { $match: { success: true, responseTime: { $ne: null } } },
          {
            $group: {
              _id: null,
              avg: { $avg: '$responseTime' },
              min: { $min: '$responseTime' },
              max: { $max: '$responseTime' }
            }
          }
        ],
        topSlow: [
          { $match: { success: true, responseTime: { $ne: null } } },
          {
            $group: {
              _id: '$websiteId',
              avgResponseTime: { $avg: '$responseTime' },
              checks: { $sum: 1 }
            }
          },
          { $sort: { avgResponseTime: -1 } },
          { $limit: 5 }
        ]
      }
    }
  ];
  
  const apiPipeline = [
    { $match: { checkedAt: { $gte: since } } },
    {
      $facet: {
        uptime: [
          {
            $group: {
              _id: '$apiId',
              total: { $sum: 1 },
              successful: { $sum: { $cond: ['$success', 1, 0] } }
            }
          },
          {
            $group: {
              _id: null,
              totalChecks: { $sum: '$total' },
              totalSuccessful: { $sum: '$successful' }
            }
          }
        ],
        responseTime: [
          { $match: { success: true, responseTime: { $ne: null } } },
          {
            $group: {
              _id: null,
              avg: { $avg: '$responseTime' },
              min: { $min: '$responseTime' },
              max: { $max: '$responseTime' }
            }
          }
        ]
      }
    }
  ];
  
  const [websiteResults, apiResults] = await Promise.all([
    CheckResult.aggregate(websitePipeline),
    ApiCheckResult.aggregate(apiPipeline)
  ]);
  
  const websiteUptime = websiteResults[0]?.uptime[0] || { totalChecks: 0, totalSuccessful: 0 };
  const websiteResponse = websiteResults[0]?.responseTime[0] || { avg: 0, min: 0, max: 0 };
  const apiUptime = apiResults[0]?.uptime[0] || { totalChecks: 0, totalSuccessful: 0 };
  const apiResponse = apiResults[0]?.responseTime[0] || { avg: 0, min: 0, max: 0 };
  
  const totalChecks = websiteUptime.totalChecks + apiUptime.totalChecks;
  const totalSuccessful = websiteUptime.totalSuccessful + apiUptime.totalSuccessful;
  
  return {
    period: `${hours}h`,
    summary: {
      totalChecks,
      uptime: totalChecks > 0 ? ((totalSuccessful / totalChecks) * 100).toFixed(2) : 100,
      avgResponseTime: ((websiteResponse.avg * websiteUptime.totalChecks + apiResponse.avg * apiUptime.totalChecks) / (totalChecks || 1)).toFixed(2)
    },
    websites: {
      checks: websiteUptime.totalChecks,
      uptime: websiteUptime.totalChecks > 0 
        ? ((websiteUptime.totalSuccessful / websiteUptime.totalChecks) * 100).toFixed(2) 
        : 100,
      avgResponseTime: websiteResponse.avg?.toFixed(2) || 0,
      minResponseTime: websiteResponse.min || 0,
      maxResponseTime: websiteResponse.max || 0
    },
    apis: {
      checks: apiUptime.totalChecks,
      uptime: apiUptime.totalChecks > 0 
        ? ((apiUptime.totalSuccessful / apiUptime.totalChecks) * 100).toFixed(2) 
        : 100,
      avgResponseTime: apiResponse.avg?.toFixed(2) || 0,
      minResponseTime: apiResponse.min || 0,
      maxResponseTime: apiResponse.max || 0
    },
    topSlow: websiteResults[0]?.topSlow || []
  };
};

export default {
  ensureIndexes,
  getUptime,
  getResponseTimeStats,
  getHourlyStats,
  getErrorBreakdown,
  getDashboardSummary
};
