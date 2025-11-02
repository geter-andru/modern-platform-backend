/**
 * Job Routes
 *
 * Routes for async job submission and status checking.
 *
 * @module routes/jobRoutes
 */

import express from 'express';
import {
  submitPersonaJob,
  submitRatingJob,
  submitBatchRatingJob,
  submitIcpJob,
  getJobStatusEndpoint,
  getCurrentUserJobs
} from '../controllers/jobController.js';
import { authenticateSupabaseJWT } from '../middleware/supabaseAuth.js';
import { customerRateLimit } from '../middleware/auth.js';

const router = express.Router();

/**
 * Job submission endpoints
 */

// Submit persona generation job
// POST /api/jobs/personas
router.post(
  '/personas',
  customerRateLimit(10, 60 * 60 * 1000), // 10 per hour
  authenticateSupabaseJWT,
  submitPersonaJob
);

// Submit company rating job
// POST /api/jobs/rate-company
router.post(
  '/rate-company',
  customerRateLimit(20, 60 * 60 * 1000), // 20 per hour
  authenticateSupabaseJWT,
  submitRatingJob
);

// Submit batch rating job
// POST /api/jobs/rate-batch
router.post(
  '/rate-batch',
  customerRateLimit(5, 60 * 60 * 1000), // 5 per hour (more expensive)
  authenticateSupabaseJWT,
  submitBatchRatingJob
);

// Submit ICP generation job
// POST /api/jobs/generate-icp
router.post(
  '/generate-icp',
  customerRateLimit(5, 60 * 60 * 1000), // 5 per hour (expensive AI operation)
  authenticateSupabaseJWT,
  submitIcpJob
);

/**
 * Job status endpoints
 */

// Get specific job status
// GET /api/jobs/:jobId
router.get(
  '/:jobId',
  customerRateLimit(60, 60 * 1000), // 60 per minute (frequent polling)
  authenticateSupabaseJWT,
  getJobStatusEndpoint
);

// Get all jobs for current user
// GET /api/jobs/current-user
router.get(
  '/current-user',
  customerRateLimit(30, 15 * 60 * 1000), // 30 per 15 minutes
  authenticateSupabaseJWT,
  getCurrentUserJobs
);

export default router;
