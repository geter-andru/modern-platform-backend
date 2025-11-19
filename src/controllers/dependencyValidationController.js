/**
 * Dependency Validation Controller
 *
 * Handles API requests for resource dependency validation
 * Part of the Cumulative Intelligence Approach implementation
 */

import { dependencyValidationService } from '../services/DependencyValidationService.js';
import logger from '../utils/logger.js';

/**
 * POST /api/dependencies/validate
 * Validate if a resource can be generated based on dependencies
 *
 * Request body:
 * {
 *   resourceId: string (required) - Resource to validate
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
 *     estimatedTokens: number,
 *     suggestedOrder: Array
 *   }
 * }
 */
export async function validateResourceGeneration(req, res) {
  try {
    const { resourceId } = req.body;
    const userId = req.user.id; // From authenticateSupabaseJWT middleware

    if (!resourceId) {
      return res.status(400).json({
        success: false,
        error: 'resourceId is required'
      });
    }

    logger.info(`Validating resource generation for user ${userId}, resource ${resourceId}`);

    const validation = await dependencyValidationService.validateResourceGeneration(userId, resourceId);

    return res.status(200).json({
      success: true,
      validation
    });
  } catch (error) {
    logger.error(`Error validating resource generation: ${error.message}`, { error });

    return res.status(500).json({
      success: false,
      error: 'Failed to validate resource generation',
      message: error.message
    });
  }
}

/**
 * POST /api/dependencies/validate-batch
 * Validate multiple resources at once
 *
 * Request body:
 * {
 *   resourceIds: string[] (required) - Resources to validate
 * }
 *
 * Response:
 * {
 *   success: true,
 *   result: {
 *     valid: boolean,
 *     validations: Array,
 *     summary: {
 *       total: number,
 *       valid: number,
 *       invalid: number,
 *       totalCost: number,
 *       totalTokens: number
 *     }
 *   }
 * }
 */
export async function validateBatch(req, res) {
  try {
    const { resourceIds } = req.body;
    const userId = req.user.id;

    if (!resourceIds || !Array.isArray(resourceIds) || resourceIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'resourceIds must be a non-empty array'
      });
    }

    if (resourceIds.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 10 resources per batch validation'
      });
    }

    logger.info(`Batch validating ${resourceIds.length} resources for user ${userId}`);

    const result = await dependencyValidationService.validateBatch(userId, resourceIds);

    return res.status(200).json({
      success: true,
      result
    });
  } catch (error) {
    logger.error(`Error in batch validation: ${error.message}`, { error });

    return res.status(500).json({
      success: false,
      error: 'Failed to validate batch',
      message: error.message
    });
  }
}

/**
 * GET /api/dependencies/available
 * Get resources user can generate now
 *
 * Response:
 * {
 *   success: true,
 *   resources: Array<{
 *     resourceId: string,
 *     resourceName: string,
 *     tier: number,
 *     category: string,
 *     estimatedCost: number,
 *     estimatedTokens: number,
 *     impactStatement: string
 *   }>
 * }
 */
export async function getAvailableResources(req, res) {
  try {
    const userId = req.user.id;

    logger.info(`Getting available resources for user ${userId}`);

    const resources = await dependencyValidationService.getAvailableResources(userId);

    return res.status(200).json({
      success: true,
      resources,
      count: resources.length
    });
  } catch (error) {
    logger.error(`Error getting available resources: ${error.message}`, { error });

    return res.status(500).json({
      success: false,
      error: 'Failed to get available resources',
      message: error.message
    });
  }
}

/**
 * GET /api/dependencies/recommended
 * Get recommended next resources
 *
 * Query params:
 * - limit: number (optional, default: 5, max: 10)
 *
 * Response:
 * {
 *   success: true,
 *   recommended: Array<{
 *     resourceId: string,
 *     resourceName: string,
 *     tier: number,
 *     category: string,
 *     estimatedCost: number,
 *     estimatedTokens: number,
 *     impactStatement: string
 *   }>
 * }
 */
export async function getRecommendedNext(req, res) {
  try {
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 5, 10);

    logger.info(`Getting recommended next resources for user ${userId} (limit: ${limit})`);

    const recommended = await dependencyValidationService.getRecommendedNext(userId, limit);

    return res.status(200).json({
      success: true,
      recommended,
      count: recommended.length
    });
  } catch (error) {
    logger.error(`Error getting recommended resources: ${error.message}`, { error });

    return res.status(500).json({
      success: false,
      error: 'Failed to get recommended resources',
      message: error.message
    });
  }
}

/**
 * DELETE /api/dependencies/cache
 * Invalidate dependency validation cache for current user
 *
 * Response:
 * {
 *   success: true,
 *   message: string
 * }
 */
export async function invalidateCache(req, res) {
  try {
    const userId = req.user.id;

    logger.info(`Invalidating dependency validation cache for user ${userId}`);

    await dependencyValidationService.invalidateCache(userId);

    return res.status(200).json({
      success: true,
      message: 'Cache invalidated successfully'
    });
  } catch (error) {
    logger.error(`Error invalidating cache: ${error.message}`, { error });

    return res.status(500).json({
      success: false,
      error: 'Failed to invalidate cache',
      message: error.message
    });
  }
}
