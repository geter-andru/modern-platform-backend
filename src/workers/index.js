/**
 * Workers Index
 *
 * Central management for all background workers.
 * Starts and manages persona generation, company rating, batch rating, and ICP generation workers.
 *
 * @module workers
 */

import { startPersonaWorker } from './personaWorker.js';
import { startRatingWorker, startBatchRatingWorker } from './ratingWorker.js';
import { startICPWorker } from './icpWorker.js';
import logger from '../utils/logger.js';

// Store worker instances
let workers = {
  personaWorker: null,
  ratingWorker: null,
  batchRatingWorker: null,
  icpWorker: null
};

/**
 * Start all workers
 *
 * Initializes and starts all background workers for async job processing.
 * Workers listen to their respective queues and process jobs as they arrive.
 *
 * @returns {Object} Worker instances
 */
export function startAllWorkers() {
  logger.info('[Workers] Starting all workers...');

  try {
    // Start persona generation worker
    workers.personaWorker = startPersonaWorker();
    logger.info('[Workers] ✅ Persona worker started');

    // Start single company rating worker
    workers.ratingWorker = startRatingWorker();
    logger.info('[Workers] ✅ Rating worker started');

    // Start batch rating worker
    workers.batchRatingWorker = startBatchRatingWorker();
    logger.info('[Workers] ✅ Batch rating worker started');

    // Start ICP generation worker
    workers.icpWorker = startICPWorker();
    logger.info('[Workers] ✅ ICP worker started');

    logger.info('[Workers] All workers started successfully');

    return workers;
  } catch (error) {
    logger.error('[Workers] Failed to start workers', {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Stop all workers
 *
 * Gracefully shuts down all workers, allowing in-progress jobs to complete.
 *
 * @returns {Promise<void>}
 */
export async function stopAllWorkers() {
  logger.info('[Workers] Stopping all workers...');

  const stopPromises = [];

  if (workers.personaWorker) {
    stopPromises.push(workers.personaWorker.close());
  }

  if (workers.ratingWorker) {
    stopPromises.push(workers.ratingWorker.close());
  }

  if (workers.batchRatingWorker) {
    stopPromises.push(workers.batchRatingWorker.close());
  }

  if (workers.icpWorker) {
    stopPromises.push(workers.icpWorker.close());
  }

  await Promise.all(stopPromises);

  workers = {
    personaWorker: null,
    ratingWorker: null,
    batchRatingWorker: null,
    icpWorker: null
  };

  logger.info('[Workers] All workers stopped');
}

/**
 * Get worker status
 *
 * @returns {Object} Status of all workers
 */
export function getWorkerStatus() {
  return {
    personaWorker: {
      running: workers.personaWorker?.running || false,
      queueName: 'persona-generation'
    },
    ratingWorker: {
      running: workers.ratingWorker?.running || false,
      queueName: 'company-rating'
    },
    batchRatingWorker: {
      running: workers.batchRatingWorker?.running || false,
      queueName: 'batch-rating'
    },
    icpWorker: {
      running: workers.icpWorker?.running || false,
      queueName: 'icp-generation'
    }
  };
}

export default {
  startAllWorkers,
  stopAllWorkers,
  getWorkerStatus,
  workers
};
