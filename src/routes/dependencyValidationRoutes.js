/**
 * Dependency Validation Routes
 * Handles dependency validation for resource generation
 */

import express from 'express';
import {
  validateResourceGeneration,
  validateBatch,
  getAvailableResources,
  getRecommendedNext,
  invalidateCache
} from '../controllers/dependencyValidationController.js';
import { authenticateSupabaseJWT } from '../middleware/supabaseAuth.js';
import { customerRateLimit } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/dependencies/validate
 * Validate if a resource can be generated
 *
 * Rate limit: 60 requests per minute (validation is lightweight)
 * Auth: Required (Supabase JWT)
 *
 * Request body:
 * {
 *   resourceId: string (required)
 * }
 *
 * Response:
 * {
 *   success: true,
 *   validation: {
 *     valid: boolean,
 *     resourceId: string,
 *     resourceName: string,
 *     missingDependencies: Array,
 *     estimatedCost: number,
 *     suggestedOrder: Array
 *   }
 * }
 */
router.post(
  '/validate',
  customerRateLimit(60, 60 * 1000), // 60 requests per minute
  authenticateSupabaseJWT,
  validateResourceGeneration
);

/**
 * POST /api/dependencies/validate-batch
 * Validate multiple resources at once
 *
 * Rate limit: 30 requests per minute
 * Auth: Required (Supabase JWT)
 *
 * Request body:
 * {
 *   resourceIds: string[] (required, max 10 items)
 * }
 *
 * Response:
 * {
 *   success: true,
 *   result: {
 *     valid: boolean,
 *     validations: Array,
 *     summary: object
 *   }
 * }
 */
router.post(
  '/validate-batch',
  customerRateLimit(30, 60 * 1000), // 30 requests per minute
  authenticateSupabaseJWT,
  validateBatch
);

/**
 * GET /api/dependencies/available
 * Get resources user can generate now
 *
 * Rate limit: 60 requests per minute
 * Auth: Required (Supabase JWT)
 *
 * Response:
 * {
 *   success: true,
 *   resources: Array,
 *   count: number
 * }
 */
router.get(
  '/available',
  customerRateLimit(60, 60 * 1000), // 60 requests per minute
  authenticateSupabaseJWT,
  getAvailableResources
);

/**
 * GET /api/dependencies/recommended
 * Get recommended next resources
 *
 * Rate limit: 60 requests per minute
 * Auth: Required (Supabase JWT)
 *
 * Query params:
 * - limit: number (optional, default: 5, max: 10)
 *
 * Response:
 * {
 *   success: true,
 *   recommended: Array,
 *   count: number
 * }
 */
router.get(
  '/recommended',
  customerRateLimit(60, 60 * 1000), // 60 requests per minute
  authenticateSupabaseJWT,
  getRecommendedNext
);

/**
 * DELETE /api/dependencies/cache
 * Invalidate dependency validation cache
 *
 * Rate limit: 10 requests per minute (cache invalidation is infrequent)
 * Auth: Required (Supabase JWT)
 *
 * Response:
 * {
 *   success: true,
 *   message: string
 * }
 */
router.delete(
  '/cache',
  customerRateLimit(10, 60 * 1000), // 10 requests per minute
  authenticateSupabaseJWT,
  invalidateCache
);

export default router;
