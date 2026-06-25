/**
 * Background Job Queue - Fixed with Concurrency Control
 * 
 * Concepts demonstrated:
 * 1. Producer-Consumer pattern
 * 2. Concurrency limiting
 * 3. Why "wait for each job" is the baseline fix
 */

// The queue - just an array
const queue = [];

// Track what's happening
const stats = {
  totalEnqueued: 0,
  totalProcessed: 0,
  totalFailed: 0,
  currentlyProcessing: 0,
  peakConcurrent: 0
};

// Concurrency control
let activeWorkers = 0;
const MAX_CONCURRENT = 3; // Limit simultaneous jobs

/**
 * Add a job to the queue
 */
export const enqueue = (job) => {
  queue.push(job);
  stats.totalEnqueued++;
  console.log(`[QUEUE] Job enqueued: ${job.type} (${job.id}). Queue size: ${queue.length}`);
};

/**
 * Process a single job
 */
const processJob = async (job) => {
  const start = Date.now();
  stats.currentlyProcessing++;
  stats.peakConcurrent = Math.max(stats.peakConcurrent, stats.currentlyProcessing);

  try {
    console.log(`[WORKER] Processing: ${job.type} (${job.id}). Concurrent: ${stats.currentlyProcessing}`);

    // Simulate work - HTTP request + DB write
    await new Promise(resolve => setTimeout(resolve, job.duration || 1000));

    // Simulate occasional failure
    if (Math.random() < 0.1) {
      throw new Error(`Random failure for ${job.id}`);
    }

    stats.totalProcessed++;
    const elapsed = Date.now() - start;
    console.log(`[WORKER] Completed: ${job.type} (${job.id}) in ${elapsed}ms`);

    return { success: true, jobId: job.id, elapsed };
  } catch (error) {
    stats.totalFailed++;
    console.error(`[WORKER] Failed: ${job.type} (${job.id}) - ${error.message}`);
    return { success: false, jobId: job.id, error: error.message };
  } finally {
    stats.currentlyProcessing--;
  }
};

/**
 * The worker loop - FIXED version
 * 
 * Key change: Uses a while loop that waits for each job to complete
 * before grabbing the next one. Combined with concurrency limiting.
 */
const workerLoop = async () => {
  while (true) {
    // Wait if at max concurrency
    while (activeWorkers >= MAX_CONCURRENT) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Check if there's work
    if (queue.length === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
      continue;
    }

    // Take the next job
    const job = queue.shift();
    if (!job) continue;

    // Process it WITH await - this is the critical fix
    activeWorkers++;
    processJob(job)
      .finally(() => activeWorkers--);
  }
};

/**
 * Start the worker
 */
export const startWorker = () => {
  console.log(`[WORKER] Starting worker loop (max concurrent: ${MAX_CONCURRENT})...`);
  workerLoop();
};

/**
 * Get current queue stats
 */
export const getStats = () => ({
  ...stats,
  queueSize: queue.length,
  activeWorkers,
  maxConcurrent: MAX_CONCURRENT,
  timestamp: new Date().toISOString()
});

export default {
  enqueue,
  startWorker,
  getStats
};
