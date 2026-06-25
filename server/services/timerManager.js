/**
 * Timer Manager - Queue-Based Implementation
 * 
 * Replaces setInterval (which causes pile-up) with a queue system
 * that respects concurrency limits.
 * 
 * Concepts demonstrated:
 * 1. Replacing fire-and-forget with controlled execution
 * 2. Producer-Consumer pattern for background tasks
 * 3. Backpressure: what happens when queue is full
 */

import Website from '../models/Website.js';
import Api from '../models/Api.js';
import { checkWebsite } from '../routes/checks.js';
import { checkApi } from '../routes/apis.js';
import { broadcastCheckResult } from './socketService.js';

// Timer tracking
const timers = new Map();

// Job queue
const queue = [];

// Concurrency control
let activeJobs = 0;
const MAX_CONCURRENT = 3;

// Worker state
let workerRunning = false;

/**
 * Create a check function for a given type
 */
const createCheckFunction = (type) => {
  return async (id) => {
    if (type === 'website') {
      const result = await checkWebsite(id);
      broadcastCheckResult(id, 'website', result);
      return result;
    } else {
      const result = await checkApi(id);
      broadcastCheckResult(id, 'api', result);
      return result;
    }
  };
};

/**
 * Process a single job from the queue
 */
const processJob = async (job) => {
  const start = Date.now();
  activeJobs++;

  try {
    console.log(`[TIMER] Processing: ${job.type} (${job.id}). Active: ${activeJobs}/${MAX_CONCURRENT}`);

    const checkFn = createCheckFunction(job.type);
    await checkFn(job.id);

    const elapsed = Date.now() - start;
    console.log(`[TIMER] Completed: ${job.type} (${job.id}) in ${elapsed}ms`);
  } catch (error) {
    console.error(`[TIMER] Failed: ${job.type} (${job.id}) - ${error.message}`);
  } finally {
    activeJobs--;
  }
};

/**
 * Worker loop - processes jobs from queue with concurrency control
 */
const workerLoop = async () => {
  if (workerRunning) return;
  workerRunning = true;

  console.log(`[WORKER] Started (max concurrent: ${MAX_CONCURRENT})`);

  while (workerRunning) {
    // Wait if at max concurrency
    if (activeJobs >= MAX_CONCURRENT) {
      await new Promise(resolve => setTimeout(resolve, 100));
      continue;
    }

    // Check if there's work
    if (queue.length === 0) {
      await new Promise(resolve => setTimeout(resolve, 200));
      continue;
    }

    // Take the next job
    const job = queue.shift();
    if (!job) continue;

    // Process it (don't await - let concurrency control handle it)
    processJob(job).catch(() => {});
  }
};

/**
 * Start a timer for an endpoint
 * 
 * Instead of setInterval (which causes pile-up), we:
 * 1. Add the job to a queue at the specified interval
 * 2. A worker processes jobs with concurrency control
 */
export const startTimer = (id, type, intervalMs) => {
  const key = `${type}:${id}`;
  clearTimer(key);

  const addJob = () => {
    // Check if this timer is still active
    if (!timers.has(key)) return;

    // Add job to queue
    queue.push({ type, id, key, timestamp: Date.now() });
    console.log(`[TIMER] Job queued: ${key}. Queue size: ${queue.length}`);

    // Schedule next job
    const timeout = setTimeout(addJob, intervalMs);
    timers.set(key, { intervalMs, timeout, type, id, key });
  };

  // Start the first job
  addJob();
  console.log(`[TIMER] Timer started for ${key}: ${intervalMs}ms`);

  // Start worker if not running
  if (!workerRunning) {
    workerLoop();
  }
};

/**
 * Clear a timer
 */
export const clearTimer = (key) => {
  if (timers.has(key)) {
    clearTimeout(timers.get(key).timeout);
    timers.delete(key);
    console.log(`[TIMER] Timer cleared for ${key}`);
  }
};

/**
 * Get timer status
 */
export const getTimerStatus = (id, type) => {
  const key = `${type}:${id}`;
  return timers.has(key) ? timers.get(key) : null;
};

/**
 * Get queue stats
 */
export const getQueueStats = () => ({
  queueSize: queue.length,
  activeJobs,
  maxConcurrent: MAX_CONCURRENT,
  timerCount: timers.size
});

/**
 * Load timers from database on startup
 */
export const loadTimersFromDB = async () => {
  try {
    const websites = await Website.find({ checkInterval: { $ne: null } });
    const apis = await Api.find({ checkInterval: { $ne: null } });

    websites.forEach(w => startTimer(w._id, 'website', w.checkInterval));
    apis.forEach(a => startTimer(a._id, 'api', a.checkInterval));

    console.log(`Loaded ${websites.length + apis.length} timers from DB`);
  } catch (error) {
    console.error('Failed to load timers from DB:', error);
  }
};

export default {
  startTimer,
  clearTimer,
  getTimerStatus,
  getQueueStats,
  loadTimersFromDB
};
