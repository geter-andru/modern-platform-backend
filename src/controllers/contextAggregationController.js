/**
 * Context Aggregation Controller
 *
 * Handles API requests for context aggregation and caching
 * Part of the Cumulative Intelligence Approach implementation
 */

import { contextAggregationService } from '../services/ContextAggregationService.js';
import { contextCacheService } from '../services/ContextCacheService.js';
import logger from '../utils/logger.js';

/**
 * POST /api/context/aggregate
 * Aggregate context for a resource generation
 *
 * Request body:
 * {
 *   targetResourceId: string (required) - Resource to aggregate context for
 *   useCache: boolean (optional, default: true) - Whether to use cache
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
 *     tokenBreakdown: object,
 *     formattedPromptContext: string,
 *     aggregationTime: number
 *   }
 * }
 */
export async function aggregateContext(req, res) {
  try {
    const { targetResourceId, useCache = true } = req.body;
    const userId = req.user.id; // From authenticateSupabaseJWT middleware

    if (!targetResourceId) {
      return res.status(400).json({
        success: false,
        error: 'targetResourceId is required'
      });
    }

    logger.info(`Aggregating context for user ${userId}, resource ${targetResourceId}`);

    const context = await contextAggregationService.aggregateContext(userId, targetResourceId, useCache);

    return res.status(200).json({
      success: true,
      context
    });
  } catch (error) {
    logger.error(`Error aggregating context: ${error.message}`, { error });

    return res.status(500).json({
      success: false,
      error: 'Failed to aggregate context',
      message: error.message
    });
  }
}

/**
 * GET /api/context/analytics
 * Get context aggregation analytics
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
 *     breakdown: object,
 *     optimization: {
 *       naiveTotalTokens: number,
 *       optimizedTokens: number,
 *       tokensSaved: number,
 *       savingsPercent: number
 *     }
 *   }
 * }
 */
export async function getContextAnalytics(req, res) {
  try {
    const { targetResourceId } = req.query;
    const userId = req.user.id;

    if (!targetResourceId) {
      return res.status(400).json({
        success: false,
        error: 'targetResourceId query parameter is required'
      });
    }

    logger.info(`Getting context analytics for user ${userId}, resource ${targetResourceId}`);

    const analytics = await contextAggregationService.getContextAnalytics(userId, targetResourceId);

    return res.status(200).json({
      success: true,
      analytics
    });
  } catch (error) {
    logger.error(`Error getting context analytics: ${error.message}`, { error });

    return res.status(500).json({
      success: false,
      error: 'Failed to get context analytics',
      message: error.message
    });
  }
}

/**
 * GET /api/context/cache/stats
 * Get cache statistics for current user
 *
 * Response:
 * {
 *   success: true,
 *   stats: {
 *     totalEntries: number,
 *     resources: Array,
 *     averageAge: number,
 *     oldestEntry: string,
 *     newestEntry: string
 *   }
 * }
 */
export async function getCacheStats(req, res) {
  try {
    const userId = req.user.id;

    logger.info(`Getting cache stats for user ${userId}`);

    const stats = await contextCacheService.getCacheStats(userId);

    return res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error(`Error getting cache stats: ${error.message}`, { error });

    return res.status(500).json({
      success: false,
      error: 'Failed to get cache stats',
      message: error.message
    });
  }
}

/**
 * DELETE /api/context/cache
 * Invalidate context cache for current user
 *
 * Response:
 * {
 *   success: true,
 *   invalidatedCount: number
 * }
 */
export async function invalidateContextCache(req, res) {
  try {
    const userId = req.user.id;

    logger.info(`Invalidating context cache for user ${userId}`);

    const invalidatedCount = await contextCacheService.invalidateUserCache(userId);

    return res.status(200).json({
      success: true,
      invalidatedCount,
      message: `Invalidated ${invalidatedCount} cache entries`
    });
  } catch (error) {
    logger.error(`Error invalidating context cache: ${error.message}`, { error });

    return res.status(500).json({
      success: false,
      error: 'Failed to invalidate context cache',
      message: error.message
    });
  }
}

/**
 * GET /api/context/cache/performance
 * Get cache performance metrics (admin/monitoring)
 *
 * Response:
 * {
 *   success: true,
 *   metrics: {
 *     totalCachedContexts: number,
 *     averageTokens: number,
 *     averageAggregationTime: number,
 *     totalTokensCached: number,
 *     estimatedTokensSaved: number,
 *     cacheHitPotential: string
 *   }
 * }
 */
export async function getPerformanceMetrics(req, res) {
  try {
    logger.info('Getting cache performance metrics');

    const metrics = await contextCacheService.getPerformanceMetrics();

    return res.status(200).json({
      success: true,
      metrics
    });
  } catch (error) {
    logger.error(`Error getting performance metrics: ${error.message}`, { error });

    return res.status(500).json({
      success: false,
      error: 'Failed to get performance metrics',
      message: error.message
    });
  }
}
