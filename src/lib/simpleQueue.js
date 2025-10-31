/**
 * Simple In-Memory Job Queue
 *
 * Lightweight in-memory queue implementation for development without Redis.
 * Provides same API as BullMQ for easy migration to BullMQ+Redis in production.
 *
 * LIMITATIONS:
 * - Jobs lost on server restart (no persistence)
 * - Single-process only (no distributed workers)
 * - No advanced features (priority, repeat, rate limiting)
 *
 * FOR PRODUCTION: Replace with BullMQ + Redis for persistence and scalability.
 *
 * @module lib/simpleQueue
 */

import { EventEmitter } from 'events';

/**
 * Simple Job class
 */
class SimpleJob {
  constructor(id, queueName, jobType, data, options = {}) {
    this.id = id;
    this.queueName = queueName;
    this.jobType = jobType;
    this.data = data;
    this.options = options;

    this.state = 'waiting'; // waiting, active, completed, failed, delayed
    this.progress = 0;
    this.returnvalue = null;
    this.failedReason = null;
    this.attemptsMade = 0;
    this.timestamp = Date.now();
    this.processedOn = null;
    this.finishedOn = null;
  }

  async getState() {
    return this.state;
  }

  updateProgress(progress) {
    this.progress = progress;
  }
}

/**
 * Simple Queue class
 */
export class SimpleQueue extends EventEmitter {
  constructor(name, options = {}) {
    super();
    this.name = name;
    this.options = options;
    this.jobs = new Map(); // jobId -> SimpleJob
    this.waitingJobs = []; // Array of job IDs in waiting state
    this.activeJobs = new Set(); // Set of job IDs currently processing
    this.completedJobs = []; // Array of completed job IDs
    this.failedJobs = []; // Array of failed job IDs
    this.processor = null; // Job processor function

    console.log(`[SimpleQueue] Initialized queue: ${name} (in-memory)`);
  }

  /**
   * Add a job to the queue
   */
  async add(jobType, data, options = {}) {
    const jobId = options.jobId || `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const job = new SimpleJob(jobId, this.name, jobType, data, options);
    this.jobs.set(jobId, job);
    this.waitingJobs.push(jobId);

    this.emit('waiting', jobId);

    // Auto-process if processor is registered
    if (this.processor) {
      setImmediate(() => this._processNext());
    }

    return job;
  }

  /**
   * Register a processor function
   */
  process(processorFn) {
    this.processor = processorFn;

    // Start processing any waiting jobs
    setImmediate(() => this._processNext());
  }

  /**
   * Process next job in queue
   */
  async _processNext() {
    if (this.waitingJobs.length === 0 || !this.processor) {
      return;
    }

    const jobId = this.waitingJobs.shift();
    const job = this.jobs.get(jobId);

    if (!job) {
      return;
    }

    job.state = 'active';
    job.processedOn = Date.now();
    this.activeJobs.add(jobId);

    try {
      const result = await this.processor(job);

      job.state = 'completed';
      job.returnvalue = result;
      job.finishedOn = Date.now();
      this.activeJobs.delete(jobId);
      this.completedJobs.push(jobId);

      this.emit('completed', job, result);
    } catch (error) {
      job.state = 'failed';
      job.failedReason = error.message;
      job.finishedOn = Date.now();
      job.attemptsMade++;
      this.activeJobs.delete(jobId);
      this.failedJobs.push(jobId);

      this.emit('failed', job, error);
      this.emit('error', error);

      console.error(`[SimpleQueue:${this.name}] Job ${jobId} failed:`, error.message);
    }

    // Process next job
    setImmediate(() => this._processNext());
  }

  /**
   * Get job by ID
   */
  async getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get queue statistics
   */
  async getWaitingCount() {
    return this.waitingJobs.length;
  }

  async getActiveCount() {
    return this.activeJobs.size;
  }

  async getCompletedCount() {
    return this.completedJobs.length;
  }

  async getFailedCount() {
    return this.failedJobs.length;
  }

  async getDelayedCount() {
    return 0; // Not implemented in simple queue
  }

  /**
   * Close queue (no-op for in-memory)
   */
  async close() {
    console.log(`[SimpleQueue] Closing queue: ${this.name}`);
    this.removeAllListeners();
  }
}

/**
 * Simple Worker class
 */
export class SimpleWorker extends EventEmitter {
  constructor(queueName, processorFn, options = {}) {
    super();
    this.queueName = queueName;
    this.processorFn = processorFn;
    this.options = options;
    this.running = false;

    console.log(`[SimpleWorker] Initialized worker for queue: ${queueName}`);
  }

  /**
   * Start processing jobs (no-op for simple queue, processor registered on queue)
   */
  async run() {
    this.running = true;
    console.log(`[SimpleWorker] Worker started for queue: ${this.queueName}`);
  }

  /**
   * Stop worker
   */
  async close() {
    this.running = false;
    console.log(`[SimpleWorker] Worker stopped for queue: ${this.queueName}`);
    this.removeAllListeners();
  }
}

export default {
  SimpleQueue,
  SimpleWorker,
};
