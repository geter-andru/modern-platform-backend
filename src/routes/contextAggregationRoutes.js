/**
 * Context Aggregation Routes
 * Handles context aggregation and caching for resource generation
 */

import express from 'express';
import {
  aggregateContext,
  getContextAnalytics,
  getCacheStats,
  invalidateContextCache,
  getPerformanceMetrics
} from '../controllers/contextAggregationController.js';
import { authenticateSupabaseJWT } from '../middleware/supabaseAuth.js';
import { customerRateLimit } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/context/aggregate
 * Aggregate context for a resource generation
 *
 * Rate limit: 30 requests per minute (context aggregation can be expensive)
 * Auth: Required (Supabase JWT)
 *
 * Request body:
 * {
 *   targetResourceId: string (required),
 *   useCache: boolean (optional, default: true)
 * }
 *
 * Response:
 * {
 *   success: true,
 *   context: {
 *     tier1_critical: Array,
 *     tier2_required: Array,
 *     tier3_optional: Array,
 *     totalTokens: number,
 *     formattedPromptContext: string
 *   }
 * }
 */
router.post(
  '/aggregate',
  customerRateLimit(30, 60 * 1000), // 30 requests per minute
  authenticateSupabaseJWT,
  aggregateContext
);

/**
 * GET /api/context/analytics
 * Get context aggregation analytics
 *
 * Rate limit: 60 requests per minute
 * Auth: Required (Supabase JWT)
 *
 * Query params:
 * - targetResourceId: string (required)
 *
 * Response:
 * {
 *   success: true,
 *   analytics: {
 *     estimatedTokens: number,
 *     estimatedCost: number,
 *     optimization: {
 *       savingsPercent: number
 *     }
 *   }
 * }
 */
router.get(
  '/analytics',
  customerRateLimit(60, 60 * 1000), // 60 requests per minute
  authenticateSupabaseJWT,
  getContextAnalytics
);

/**
 * GET /api/context/cache/stats
 * Get cache statistics for current user
 *
 * Rate limit: 60 requests per minute
 * Auth: Required (Supabase JWT)
 *
 * Response:
 * {
 *   success: true,
 *   stats: {
 *     totalEntries: number,
 *     resources: Array,
 *     averageAge: number
 *   }
 * }
 */
router.get(
  '/cache/stats',
  customerRateLimit(60, 60 * 1000), // 60 requests per minute
  authenticateSupabaseJWT,
  getCacheStats
);

/**
 * DELETE /api/context/cache
 * Invalidate context cache for current user
 *
 * Rate limit: 10 requests per minute
 * Auth: Required (Supabase JWT)
 *
 * Response:
 * {
 *   success: true,
 *   invalidatedCount: number
 * }
 */
router.delete(
  '/cache',
  customerRateLimit(10, 60 * 1000), // 10 requests per minute
  authenticateSupabaseJWT,
  invalidateContextCache
);

/**
 * GET /api/context/cache/performance
 * Get cache performance metrics
 *
 * Rate limit: 30 requests per minute
 * Auth: Required (Supabase JWT)
 *
 * Response:
 * {
 *   success: true,
 *   metrics: {
 *     totalCachedContexts: number,
 *     averageTokens: number,
 *     cacheHitPotential: string
 *   }
 * }
 */
router.get(
  '/cache/performance',
  customerRateLimit(30, 60 * 1000), // 30 requests per minute
  authenticateSupabaseJWT,
  getPerformanceMetrics
);

export default router;
