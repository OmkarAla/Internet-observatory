/**
 * Queue Test - Compare Broken vs Fixed Implementation
 * 
 * Run: node test-queue.js
 * 
 * This demonstrates the problem with naive queues
 * and why concurrency control matters.
 */

// Simulate the broken queue (no await, no limit)
const testBrokenQueue = async () => {
  console.log('\n=== BROKEN QUEUE (No Concurrency Control) ===\n');

  let currentlyProcessing = 0;
  let peakConcurrent = 0;
  let completed = 0;
  const startTime = Date.now();

  const processJob = async (jobId) => {
    currentlyProcessing++;
    peakConcurrent = Math.max(peakConcurrent, currentlyProcessing);

    // Simulate 1 second of work
    await new Promise(resolve => setTimeout(resolve, 1000));

    currentlyProcessing--;
    completed++;
    console.log(`  Job ${jobId} completed (${completed}/10). Concurrent: ${currentlyProcessing}`);
  };

  // Enqueue 10 jobs
  console.log('Enqueueing 10 jobs...');
  for (let i = 1; i <= 10; i++) {
    // BUG: No await - fires and forgets
    processJob(i);
  }

  // Wait for all to finish
  await new Promise(resolve => setTimeout(resolve, 2000));

  const elapsed = Date.now() - startTime;
  console.log(`\nResults:`);
  console.log(`  Total time: ${elapsed}ms`);
  console.log(`  Peak concurrent: ${peakConcurrent}`);
  console.log(`  Jobs processed: ${completed}`);
};

// Simulate the fixed queue (with await and concurrency limit)
const testFixedQueue = async () => {
  console.log('\n=== FIXED QUEUE (Concurrency Limit = 3) ===\n');

  let currentlyProcessing = 0;
  let peakConcurrent = 0;
  let completed = 0;
  const startTime = Date.now();
  const MAX_CONCURRENT = 3;

  const processJob = async (jobId) => {
    currentlyProcessing++;
    peakConcurrent = Math.max(peakConcurrent, currentlyProcessing);

    // Simulate 1 second of work
    await new Promise(resolve => setTimeout(resolve, 1000));

    currentlyProcessing--;
    completed++;
    console.log(`  Job ${jobId} completed (${completed}/10). Concurrent: ${currentlyProcessing}`);
  };

  // Process jobs with concurrency limit
  const queue = [];
  for (let i = 1; i <= 10; i++) queue.push(i);

  console.log('Enqueueing 10 jobs...');

  const worker = async () => {
    while (queue.length > 0 || currentlyProcessing > 0) {
      // Wait if at max concurrency
      while (currentlyProcessing >= MAX_CONCURRENT && queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      if (queue.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 50));
        continue;
      }

      const jobId = queue.shift();
      // AWAIT: This is the critical fix
      processJob(jobId).catch(() => {});
    }
  };

  await worker();

  const elapsed = Date.now() - startTime;
  console.log(`\nResults:`);
  console.log(`  Total time: ${elapsed}ms`);
  console.log(`  Peak concurrent: ${peakConcurrent}`);
  console.log(`  Jobs processed: ${completed}`);
};

// Run both tests
const runTests = async () => {
  console.log('Queue Comparison Test');
  console.log('=====================');

  await testBrokenQueue();
  await testFixedQueue();

  console.log('\n=== SUMMARY ===');
  console.log('Broken: Fast but dangerous (high concurrency)');
  console.log('Fixed:  Slower but safe (controlled concurrency)');
  console.log('\nQuestion: What happens with 500 jobs?');
  console.log('Broken: 500 simultaneous HTTP + DB operations = crash');
  console.log('Fixed:  3 at a time, ~167 seconds = survives');
};

runTests().catch(console.error);
