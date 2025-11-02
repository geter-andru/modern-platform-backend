/**
 * Job Controller
 *
 * Handles async job submission and status checking.
 * Provides REST API for job queue operations.
 *
 * @module controllers/jobController
 */

import {
  addPersonaGenerationJob,
  addCompanyRatingJob,
  addBatchRatingJob,
  addICPGenerationJob,
  getPersonaQueue,
  getRatingQueue,
  getBatchRatingQueue,
  getICPQueue,
  getJobStatus,
  getQueueStats
} from '../lib/queue.js';
import logger from '../utils/logger.js';

/**
 * Submit persona generation job
 * POST /api/jobs/personas
 *
 * Request body:
 * {
 *   companyContext: string (required),
 *   industry: string (required),
 *   targetMarket: string (optional)
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   jobId: string,
 *   status: 'queued',
 *   message: string
 * }
 */
export const submitPersonaJob = async (req, res, next) => {
  try {
    const { companyContext, industry, targetMarket } = req.body;
    const userId = req.user?.id;

    logger.info('[JobController] Persona job submission', { userId, industry });

    // Validate authentication
    if (!userId) {
      logger.warn('[JobController] Unauthenticated request');
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate required fields
    if (!companyContext || !industry) {
      logger.warn('[JobController] Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: {
          companyContext: !companyContext ? 'Required' : 'OK',
          industry: !industry ? 'Required' : 'OK'
        }
      });
    }

    // Validate field lengths
    if (companyContext.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'companyContext must be at least 10 characters'
      });
    }

    if (industry.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'industry must be at least 2 characters'
      });
    }

    // Add job to queue
    const jobInfo = await addPersonaGenerationJob({
      customerId: userId,
      companyContext,
      industry,
      targetMarket
    });

    logger.info('[JobController] Persona job queued', {
      jobId: jobInfo.jobId,
      userId
    });

    res.status(202).json({
      success: true,
      jobId: jobInfo.jobId,
      status: jobInfo.status,
      message: 'Persona generation job queued. Use jobId to check status.',
      estimatedDuration: '30-60 seconds',
      statusEndpoint: `/api/jobs/${jobInfo.jobId}`
    });
  } catch (error) {
    logger.error('[JobController] Failed to submit persona job', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Submit company rating job
 * POST /api/jobs/rate-company
 *
 * Request body:
 * {
 *   companyUrl: string (required),
 *   icpFrameworkId: uuid (optional)
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   jobId: string,
 *   status: 'queued',
 *   message: string
 * }
 */
export const submitRatingJob = async (req, res, next) => {
  try {
    const { companyUrl, icpFrameworkId } = req.body;
    const userId = req.user?.id;

    logger.info('[JobController] Rating job submission', { userId, companyUrl });

    // Validate authentication
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate required fields
    if (!companyUrl) {
      return res.status(400).json({
        success: false,
        error: 'companyUrl is required'
      });
    }

    // Validate URL format
    const urlRegex = /^https?:\/\/.+/i;
    if (!urlRegex.test(companyUrl)) {
      return res.status(400).json({
        success: false,
        error: 'companyUrl must be a valid HTTP(S) URL'
      });
    }

    // Add job to queue
    const jobInfo = await addCompanyRatingJob({
      customerId: userId,
      companyUrl,
      icpFrameworkId
    });

    logger.info('[JobController] Rating job queued', {
      jobId: jobInfo.jobId,
      userId,
      companyUrl
    });

    res.status(202).json({
      success: true,
      jobId: jobInfo.jobId,
      status: jobInfo.status,
      message: 'Company rating job queued. Use jobId to check status.',
      estimatedDuration: '10-20 seconds',
      statusEndpoint: `/api/jobs/${jobInfo.jobId}`
    });
  } catch (error) {
    logger.error('[JobController] Failed to submit rating job', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Submit batch rating job
 * POST /api/jobs/rate-batch
 *
 * Request body:
 * {
 *   companies: Array<string | {url: string}> (required),
 *   icpFrameworkId: uuid (optional)
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   jobId: string,
 *   status: 'queued',
 *   totalCompanies: number
 * }
 */
export const submitBatchRatingJob = async (req, res, next) => {
  try {
    const { companies, icpFrameworkId } = req.body;
    const userId = req.user?.id;

    logger.info('[JobController] Batch rating job submission', {
      userId,
      companyCount: companies?.length
    });

    // Validate authentication
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate required fields
    if (!companies || !Array.isArray(companies)) {
      return res.status(400).json({
        success: false,
        error: 'companies must be an array'
      });
    }

    if (companies.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'companies array cannot be empty'
      });
    }

    if (companies.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 50 companies per batch'
      });
    }

    // Add job to queue
    const jobInfo = await addBatchRatingJob({
      customerId: userId,
      companies,
      icpFrameworkId
    });

    logger.info('[JobController] Batch rating job queued', {
      jobId: jobInfo.jobId,
      userId,
      totalCompanies: jobInfo.totalCompanies
    });

    res.status(202).json({
      success: true,
      jobId: jobInfo.jobId,
      status: jobInfo.status,
      totalCompanies: jobInfo.totalCompanies,
      message: 'Batch rating job queued. Use jobId to check status and progress.',
      estimatedDuration: `${jobInfo.totalCompanies * 10}-${jobInfo.totalCompanies * 15} seconds`,
      statusEndpoint: `/api/jobs/${jobInfo.jobId}`
    });
  } catch (error) {
    logger.error('[JobController] Failed to submit batch rating job', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Submit ICP generation job
 * POST /api/jobs/generate-icp
 *
 * Request body:
 * {
 *   productInfo: {
 *     name: string (optional),
 *     description: string (optional),
 *     distinguishingFeature: string (optional),
 *     businessModel: string (optional)
 *   },
 *   industry: string (optional),
 *   goals: Array<string> (optional)
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   jobId: string,
 *   status: 'queued',
 *   message: string
 * }
 */
export const submitIcpJob = async (req, res, next) => {
  try {
    const { productInfo, industry, goals } = req.body;
    const userId = req.user?.id;

    logger.info('[JobController] ICP generation job submission', { userId });

    // Validate authentication
    if (!userId) {
      logger.warn('[JobController] Unauthenticated ICP generation request');
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate that at least productInfo has some data
    if (!productInfo || (typeof productInfo === 'object' && Object.keys(productInfo).length === 0)) {
      logger.warn('[JobController] Missing productInfo for ICP generation');
      return res.status(400).json({
        success: false,
        error: 'productInfo is required',
        details: 'At least one field (name, description, distinguishingFeature, or businessModel) must be provided'
      });
    }

    // Add job to queue
    const jobInfo = await addICPGenerationJob({
      customerId: userId,
      productInfo: productInfo || {},
      industry: industry || null,
      goals: goals || null
    });

    logger.info('[JobController] ICP generation job queued', {
      jobId: jobInfo.jobId,
      userId
    });

    res.status(202).json({
      success: true,
      jobId: jobInfo.jobId,
      status: jobInfo.status,
      message: 'ICP generation job queued. Use jobId to check status.',
      estimatedDuration: '20-30 seconds',
      statusEndpoint: `/api/jobs/${jobInfo.jobId}`
    });
  } catch (error) {
    logger.error('[JobController] Failed to submit ICP generation job', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Get job status
 * GET /api/jobs/:jobId
 *
 * Response:
 * {
 *   success: boolean,
 *   job: {
 *     jobId: string,
 *     queueName: string,
 *     status: string (waiting|active|completed|failed),
 *     progress: number (0-100),
 *     result: object (if completed),
 *     failedReason: string (if failed),
 *     ...
 *   }
 * }
 */
export const getJobStatusEndpoint = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const userId = req.user?.id;

    logger.info('[JobController] Job status request', { userId, jobId });

    // Validate authentication
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Determine which queue to check based on jobId prefix
    let queue;
    let queueType;

    if (jobId.startsWith('persona-')) {
      queue = getPersonaQueue();
      queueType = 'persona-generation';
    } else if (jobId.startsWith('rating-')) {
      queue = getRatingQueue();
      queueType = 'company-rating';
    } else if (jobId.startsWith('batch-')) {
      queue = getBatchRatingQueue();
      queueType = 'batch-rating';
    } else if (jobId.startsWith('icp-')) {
      queue = getICPQueue();
      queueType = 'icp-generation';
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid jobId format'
      });
    }

    // Get job status
    const jobStatus = await getJobStatus(queue, jobId);

    if (!jobStatus) {
      logger.warn('[JobController] Job not found', { jobId });
      return res.status(404).json({
        success: false,
        error: 'Job not found',
        details: 'Job may have expired or never existed'
      });
    }

    // Verify job belongs to current user (security check)
    if (jobStatus.data?.customerId !== userId) {
      logger.warn('[JobController] Unauthorized job access attempt', {
        jobId,
        userId,
        jobUserId: jobStatus.data?.customerId
      });
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        details: 'You do not have access to this job'
      });
    }

    logger.info('[JobController] Job status retrieved', {
      jobId,
      status: jobStatus.status,
      progress: jobStatus.progress
    });

    res.json({
      success: true,
      job: {
        jobId: jobStatus.jobId,
        queueName: jobStatus.queueName,
        status: jobStatus.status,
        progress: jobStatus.progress,
        data: jobStatus.data,
        result: jobStatus.result,
        failedReason: jobStatus.failedReason,
        attemptsMade: jobStatus.attemptsMade,
        timestamp: jobStatus.timestamp,
        processedOn: jobStatus.processedOn,
        finishedOn: jobStatus.finishedOn
      }
    });
  } catch (error) {
    logger.error('[JobController] Failed to get job status', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

/**
 * Get all jobs for current user
 * GET /api/jobs/current-user
 *
 * Query params:
 * - status: filter by status (waiting|active|completed|failed)
 * - limit: max results (default: 20)
 *
 * Response:
 * {
 *   success: boolean,
 *   jobs: Array<JobStatus>,
 *   queueStats: Object
 * }
 */
export const getCurrentUserJobs = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { status, limit = 20 } = req.query;

    logger.info('[JobController] Current user jobs request', { userId, status, limit });

    // Validate authentication
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Get stats from all queues
    const [personaStats, ratingStats, batchStats] = await Promise.all([
      getQueueStats(getPersonaQueue()),
      getQueueStats(getRatingQueue()),
      getQueueStats(getBatchRatingQueue())
    ]);

    res.json({
      success: true,
      message: 'Job listing for current user',
      queueStats: {
        personaGeneration: personaStats,
        companyRating: ratingStats,
        batchRating: batchStats
      },
      note: 'Full job history not yet implemented - use individual job status endpoints'
    });
  } catch (error) {
    logger.error('[JobController] Failed to get current user jobs', {
      error: error.message,
      stack: error.stack
    });
    next(error);
  }
};

export default {
  submitPersonaJob,
  submitRatingJob,
  submitBatchRatingJob,
  getJobStatusEndpoint,
  getCurrentUserJobs
};
