/**
 * Job Queue Module
 *
 * Centralizes BullMQ queue initialization and management.
 * Provides queues for async operations (AI generation, company rating, batch processing).
 *
 * @module lib/queue
 */

import { Queue } from 'bullmq';
import { SimpleQueue } from './simpleQueue.js';
import { getQueueConnectionOptions, isRedisConfigured } from '../config/redis.js';

/**
 * Queue configuration
 */
const QUEUE_NAMES = {
  PERSONA_GENERATION: 'persona-generation',
  COMPANY_RATING: 'company-rating',
  BATCH_RATING: 'batch-rating',
};

/**
 * Default job options for all queues
 */
const DEFAULT_JOB_OPTIONS = {
  attempts: 3, // Retry failed jobs up to 3 times
  backoff: {
    type: 'exponential',
    delay: 2000, // Start with 2 second delay, doubles each retry
  },
  removeOnComplete: {
    age: 24 * 3600, // Keep completed jobs for 24 hours
    count: 100, // Keep max 100 completed jobs
  },
  removeOnFail: {
    age: 7 * 24 * 3600, // Keep failed jobs for 7 days
  },
};

/**
 * Queue instances (initialized lazily)
 */
let personaQueue = null;
let ratingQueue = null;
let batchRatingQueue = null;

/**
 * Initialize a queue (BullMQ with Redis or SimpleQueue in-memory)
 *
 * @param {string} name - Queue name
 * @param {Object} options - Additional queue options
 * @returns {Queue|SimpleQueue} Queue instance
 */
function createQueue(name, options = {}) {
  console.log(`[Queue] Initializing queue: ${name}`);

  // Use SimpleQueue if Redis is not configured
  if (!isRedisConfigured()) {
    console.log(`[Queue] Using in-memory SimpleQueue for: ${name}`);
    const queue = new SimpleQueue(name, options);

    // Event listeners for monitoring
    queue.on('error', (error) => {
      console.error(`[Queue:${name}] Error:`, error);
    });

    queue.on('waiting', (jobId) => {
      console.log(`[Queue:${name}] Job ${jobId} is waiting`);
    });

    console.log(`[Queue] Queue initialized (in-memory): ${name}`);
    return queue;
  }

  // Use BullMQ with Redis
  const connectionOptions = getQueueConnectionOptions();

  const queueOptions = {
    ...connectionOptions,
    defaultJobOptions: {
      ...DEFAULT_JOB_OPTIONS,
      ...options.defaultJobOptions,
    },
  };

  const queue = new Queue(name, queueOptions);

  // Event listeners for monitoring
  queue.on('error', (error) => {
    console.error(`[Queue:${name}] Error:`, error);
  });

  queue.on('waiting', (jobId) => {
    console.log(`[Queue:${name}] Job ${jobId} is waiting`);
  });

  console.log(`[Queue] Queue initialized (Redis): ${name}`);

  return queue;
}

/**
 * Get or create the persona generation queue
 *
 * @returns {Queue} Persona generation queue
 */
export function getPersonaQueue() {
  if (!personaQueue) {
    personaQueue = createQueue(QUEUE_NAMES.PERSONA_GENERATION, {
      defaultJobOptions: {
        attempts: 2, // AI operations less retries (expensive)
        backoff: {
          type: 'exponential',
          delay: 5000, // Wait longer between AI retries
        },
      },
    });
  }
  return personaQueue;
}

/**
 * Get or create the company rating queue
 *
 * @returns {Queue} Company rating queue
 */
export function getRatingQueue() {
  if (!ratingQueue) {
    ratingQueue = createQueue(QUEUE_NAMES.COMPANY_RATING, {
      defaultJobOptions: {
        attempts: 2, // AI operations less retries
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    });
  }
  return ratingQueue;
}

/**
 * Get or create the batch rating queue
 *
 * @returns {Queue} Batch rating queue
 */
export function getBatchRatingQueue() {
  if (!batchRatingQueue) {
    batchRatingQueue = createQueue(QUEUE_NAMES.BATCH_RATING, {
      defaultJobOptions: {
        attempts: 1, // Batch jobs don't retry (partial completion)
        removeOnComplete: {
          age: 48 * 3600, // Keep batch results longer
          count: 50,
        },
      },
    });
  }
  return batchRatingQueue;
}

/**
 * Add a job to the persona generation queue
 *
 * @param {Object} data - Job data
 * @param {string} data.customerId - User ID
 * @param {string} data.companyContext - Company context
 * @param {string} data.industry - Industry
 * @param {string} [data.targetMarket] - Target market (optional)
 * @param {Object} [options] - Additional job options
 * @returns {Promise<Object>} Job object with id
 */
export async function addPersonaGenerationJob(data, options = {}) {
  const queue = getPersonaQueue();

  // Validate required fields
  if (!data.customerId || !data.companyContext || !data.industry) {
    throw new Error('Missing required fields: customerId, companyContext, industry');
  }

  const jobData = {
    customerId: data.customerId,
    companyContext: data.companyContext,
    industry: data.industry,
    targetMarket: data.targetMarket || null,
    submittedAt: new Date().toISOString(),
  };

  const jobOptions = {
    jobId: `persona-${data.customerId}-${Date.now()}`, // Unique job ID
    ...options,
  };

  console.log(`[Queue] Adding persona generation job for user: ${data.customerId}`);

  const job = await queue.add('generate-personas', jobData, jobOptions);

  return {
    jobId: job.id,
    queueName: QUEUE_NAMES.PERSONA_GENERATION,
    status: 'queued',
  };
}

/**
 * Add a job to the company rating queue
 *
 * @param {Object} data - Job data
 * @param {string} data.customerId - User ID
 * @param {string} data.companyUrl - Company URL to rate
 * @param {string} [data.icpFrameworkId] - ICP framework ID (optional)
 * @param {Object} [options] - Additional job options
 * @returns {Promise<Object>} Job object with id
 */
export async function addCompanyRatingJob(data, options = {}) {
  const queue = getRatingQueue();

  // Validate required fields
  if (!data.customerId || !data.companyUrl) {
    throw new Error('Missing required fields: customerId, companyUrl');
  }

  const jobData = {
    customerId: data.customerId,
    companyUrl: data.companyUrl,
    icpFrameworkId: data.icpFrameworkId || null,
    submittedAt: new Date().toISOString(),
  };

  const jobOptions = {
    jobId: `rating-${data.customerId}-${Date.now()}`,
    ...options,
  };

  console.log(`[Queue] Adding company rating job for: ${data.companyUrl}`);

  const job = await queue.add('rate-company', jobData, jobOptions);

  return {
    jobId: job.id,
    queueName: QUEUE_NAMES.COMPANY_RATING,
    status: 'queued',
  };
}

/**
 * Add a job to the batch rating queue
 *
 * @param {Object} data - Job data
 * @param {string} data.customerId - User ID
 * @param {Array<Object>} data.companies - Array of companies to rate
 * @param {string} [data.icpFrameworkId] - ICP framework ID (optional)
 * @param {Object} [options] - Additional job options
 * @returns {Promise<Object>} Job object with id
 */
export async function addBatchRatingJob(data, options = {}) {
  const queue = getBatchRatingQueue();

  // Validate required fields
  if (!data.customerId || !data.companies || !Array.isArray(data.companies)) {
    throw new Error('Missing required fields: customerId, companies (array)');
  }

  if (data.companies.length === 0) {
    throw new Error('companies array cannot be empty');
  }

  const jobData = {
    customerId: data.customerId,
    companies: data.companies,
    icpFrameworkId: data.icpFrameworkId || null,
    totalCompanies: data.companies.length,
    submittedAt: new Date().toISOString(),
  };

  const jobOptions = {
    jobId: `batch-${data.customerId}-${Date.now()}`,
    ...options,
  };

  console.log(`[Queue] Adding batch rating job for ${data.companies.length} companies`);

  const job = await queue.add('rate-batch', jobData, jobOptions);

  return {
    jobId: job.id,
    queueName: QUEUE_NAMES.BATCH_RATING,
    status: 'queued',
    totalCompanies: data.companies.length,
  };
}

/**
 * Get job status by ID
 *
 * @param {Queue} queue - Queue instance
 * @param {string} jobId - Job ID
 * @returns {Promise<Object|null>} Job status or null if not found
 */
export async function getJobStatus(queue, jobId) {
  const job = await queue.getJob(jobId);

  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = job.progress || 0;

  return {
    jobId: job.id,
    queueName: queue.name,
    status: state, // waiting, active, completed, failed, delayed
    progress, // 0-100
    data: job.data,
    result: job.returnvalue || null,
    failedReason: job.failedReason || null,
    attemptsMade: job.attemptsMade,
    timestamp: job.timestamp,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
  };
}

/**
 * Get queue statistics
 *
 * @param {Queue} queue - Queue instance
 * @returns {Promise<Object>} Queue statistics
 */
export async function getQueueStats(queue) {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    queueName: queue.name,
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

/**
 * Close all queue connections gracefully
 *
 * @returns {Promise<void>}
 */
export async function closeQueues() {
  console.log('[Queue] Closing all queue connections...');

  const promises = [];

  if (personaQueue) {
    promises.push(personaQueue.close());
  }
  if (ratingQueue) {
    promises.push(ratingQueue.close());
  }
  if (batchRatingQueue) {
    promises.push(batchRatingQueue.close());
  }

  await Promise.all(promises);

  console.log('[Queue] All queues closed');
}

/**
 * Health check for queue system
 *
 * @returns {Promise<Object>} Health status
 */
export async function checkQueueHealth() {
  try {
    const personaQueueInstance = getPersonaQueue();
    const ratingQueueInstance = getRatingQueue();
    const batchRatingQueueInstance = getBatchRatingQueue();

    const [personaStats, ratingStats, batchStats] = await Promise.all([
      getQueueStats(personaQueueInstance),
      getQueueStats(ratingQueueInstance),
      getQueueStats(batchRatingQueueInstance),
    ]);

    return {
      healthy: true,
      queues: {
        personaGeneration: personaStats,
        companyRating: ratingStats,
        batchRating: batchStats,
      },
    };
  } catch (error) {
    console.error('[Queue] Health check failed:', error);
    return {
      healthy: false,
      error: error.message,
    };
  }
}

export default {
  QUEUE_NAMES,
  getPersonaQueue,
  getRatingQueue,
  getBatchRatingQueue,
  addPersonaGenerationJob,
  addCompanyRatingJob,
  addBatchRatingJob,
  getJobStatus,
  getQueueStats,
  closeQueues,
  checkQueueHealth,
};
