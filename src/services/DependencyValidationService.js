/**
 * Dependency Validation Service
 *
 * Validates resource dependencies before AI generation, ensuring:
 * 1. Required dependencies exist
 * 2. Optional dependencies are identified
 * 3. Suggested generation order (topological sort)
 * 4. Cost/token estimates
 *
 * Part of the Cumulative Intelligence Approach implementation.
 *
 * @see /DEPENDENCY_VALIDATION_SYSTEM.md for architecture
 * @see /backend/src/config/resource-dependencies.js for dependency registry
 */

import supabase from './supabaseService.js';
import logger from '../utils/logger.js';
import {
  RESOURCE_DEPENDENCIES,
  getResourceConfig,
  validateDependencies,
  calculateGenerationCost,
  getSuggestedGenerationOrder
} from '../config/resource-dependencies.js';

/**
 * Dependency Validation Service
 * Validates resource generation against dependency requirements
 */
class DependencyValidationService {
  /**
   * Validate if a resource can be generated
   * Checks for required dependencies and provides suggestions
   *
   * @param {string} userId - User ID
   * @param {string} resourceId - Resource to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateResourceGeneration(userId, resourceId) {
    const startTime = Date.now();

    try {
      logger.info(`Validating resource generation for user ${userId}, resource ${resourceId}`);

      // Get resource configuration
      const resourceConfig = getResourceConfig(resourceId);

      if (!resourceConfig) {
        return {
          valid: false,
          error: `Resource '${resourceId}' not found in dependency registry`,
          resourceId
        };
      }

      // Get user's generated resources
      const userResources = await this.getUserGeneratedResources(userId);
      const generatedResourceIds = userResources.map(r => r.resource_id);

      logger.info(`User ${userId} has generated ${generatedResourceIds.length} resources`);

      // Validate dependencies
      const validation = validateDependencies(resourceId, generatedResourceIds);

      if (!validation.valid) {
        // Calculate cost for missing dependencies
        const costBreakdown = calculateGenerationCost(resourceId, generatedResourceIds);

        // Get suggested generation order
        const suggestedOrder = getSuggestedGenerationOrder(resourceId, generatedResourceIds);

        logger.info(`Resource ${resourceId} has ${validation.missingRequired.length} missing required dependencies`);

        return {
          valid: false,
          resourceId: validation.resourceId,
          resourceName: validation.resourceName,
          missingDependencies: validation.missingRequired.map(depId => this._createMissingDependency(depId)),
          optionalMissingDependencies: validation.missingOptional.map(depId => this._createMissingDependency(depId)),
          suggestedOrder: suggestedOrder.map(resId => this._createResourceInfo(resId)),
          estimatedCost: costBreakdown.totalCost,
          estimatedTokens: costBreakdown.resourceCount * 1200, // Average tokens per resource
          resourceCount: costBreakdown.resourceCount,
          canProceedWithWarning: false,
          validationTime: Date.now() - startTime
        };
      }

      // Check for optional missing dependencies
      const hasOptionalMissing = validation.missingOptional && validation.missingOptional.length > 0;

      logger.info(`Resource ${resourceId} validation passed. Optional missing: ${hasOptionalMissing}`);

      return {
        valid: true,
        resourceId: validation.resourceId,
        resourceName: validation.resourceName,
        missingDependencies: [],
        optionalMissingDependencies: hasOptionalMissing
          ? validation.missingOptional.map(depId => this._createMissingDependency(depId))
          : [],
        suggestedOrder: [resourceId],
        estimatedCost: resourceConfig.generationCost,
        estimatedTokens: resourceConfig.estimatedTokens,
        resourceCount: 1,
        canProceedWithWarning: hasOptionalMissing,
        warningMessage: hasOptionalMissing
          ? `This resource can be enhanced with ${validation.missingOptional.length} optional dependencies. Generate them first for better results.`
          : undefined,
        validationTime: Date.now() - startTime
      };
    } catch (error) {
      logger.error(`Error validating resource generation: ${error.message}`, { error, userId, resourceId });

      return {
        valid: false,
        error: `Validation error: ${error.message}`,
        resourceId,
        validationTime: Date.now() - startTime
      };
    }
  }

  /**
   * Validate batch resource generation
   * Checks dependencies for multiple resources at once
   *
   * @param {string} userId - User ID
   * @param {string[]} resourceIds - Resources to validate
   * @returns {Promise<Object>} Batch validation result
   */
  async validateBatch(userId, resourceIds) {
    const startTime = Date.now();

    try {
      logger.info(`Validating batch generation for user ${userId}, ${resourceIds.length} resources`);

      const validations = await Promise.all(
        resourceIds.map(resourceId => this.validateResourceGeneration(userId, resourceId))
      );

      const allValid = validations.every(v => v.valid);
      const totalCost = validations.reduce((sum, v) => sum + (v.estimatedCost || 0), 0);
      const totalTokens = validations.reduce((sum, v) => sum + (v.estimatedTokens || 0), 0);

      return {
        valid: allValid,
        validations,
        summary: {
          total: resourceIds.length,
          valid: validations.filter(v => v.valid).length,
          invalid: validations.filter(v => !v.valid).length,
          totalCost,
          totalTokens
        },
        validationTime: Date.now() - startTime
      };
    } catch (error) {
      logger.error(`Error validating batch generation: ${error.message}`, { error, userId, resourceIds });

      return {
        valid: false,
        error: `Batch validation error: ${error.message}`,
        validationTime: Date.now() - startTime
      };
    }
  }

  /**
   * Get available resources user can generate now
   * Returns resources whose dependencies are all satisfied
   *
   * @param {string} userId - User ID
   * @returns {Promise<Object[]>} Available resources
   */
  async getAvailableResources(userId) {
    try {
      logger.info(`Getting available resources for user ${userId}`);

      const userResources = await this.getUserGeneratedResources(userId);
      const generatedResourceIds = userResources.map(r => r.resource_id);

      const available = [];

      for (const [resourceId, config] of Object.entries(RESOURCE_DEPENDENCIES)) {
        // Skip if already generated
        if (generatedResourceIds.includes(resourceId)) {
          continue;
        }

        const validation = validateDependencies(resourceId, generatedResourceIds);

        if (validation.valid) {
          available.push({
            resourceId: config.resourceId,
            resourceName: config.resourceName,
            tier: config.tier,
            category: config.category,
            estimatedCost: config.generationCost,
            estimatedTokens: config.estimatedTokens,
            impactStatement: config.impactStatement,
            hasOptionalMissing: validation.missingOptional && validation.missingOptional.length > 0,
            optionalMissingCount: validation.missingOptional ? validation.missingOptional.length : 0
          });
        }
      }

      // Sort by tier (lower first) then by name
      available.sort((a, b) => a.tier - b.tier || a.resourceName.localeCompare(b.resourceName));

      logger.info(`Found ${available.length} available resources for user ${userId}`);

      return available;
    } catch (error) {
      logger.error(`Error getting available resources: ${error.message}`, { error, userId });
      throw error;
    }
  }

  /**
   * Get recommended next resources
   * Suggests highest-value resources based on tier and dependencies
   *
   * @param {string} userId - User ID
   * @param {number} limit - Maximum recommendations (default: 5)
   * @returns {Promise<Object[]>} Recommended resources
   */
  async getRecommendedNext(userId, limit = 5) {
    try {
      logger.info(`Getting recommended next resources for user ${userId}`);

      const available = await this.getAvailableResources(userId);

      // Prioritize by:
      // 1. Lower tier (foundational resources first)
      // 2. No optional missing dependencies
      // 3. Core category over advanced/strategic
      const priorityScore = (resource) => {
        let score = 0;

        // Lower tier = higher priority (multiply by 1000 to make it most important)
        score += (10 - resource.tier) * 1000;

        // No optional missing = higher priority
        if (!resource.hasOptionalMissing) {
          score += 100;
        }

        // Core category = higher priority
        if (resource.category === 'core') {
          score += 50;
        }

        return score;
      };

      const recommended = available
        .map(resource => ({
          ...resource,
          priorityScore: priorityScore(resource)
        }))
        .sort((a, b) => b.priorityScore - a.priorityScore)
        .slice(0, limit)
        .map(({ priorityScore, ...resource }) => resource);

      logger.info(`Recommending ${recommended.length} resources for user ${userId}`);

      return recommended;
    } catch (error) {
      logger.error(`Error getting recommended resources: ${error.message}`, { error, userId });
      throw error;
    }
  }

  /**
   * Get user's generated resources from database
   *
   * @param {string} userId - User ID
   * @returns {Promise<Object[]>} Generated resources
   * @private
   */
  async getUserGeneratedResources(userId) {
    try {
      const { data, error } = await supabase
        .from('generated_resources')
        .select('resource_id, resource_name, generated_at, output_summary')
        .eq('user_id', userId)
        .order('generated_at', { ascending: true });

      if (error) {
        logger.error(`Error fetching user resources: ${error.message}`, { error, userId });
        throw new Error(`Failed to fetch user resources: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      logger.error(`Error in getUserGeneratedResources: ${error.message}`, { error, userId });
      throw error;
    }
  }

  /**
   * Create missing dependency object
   *
   * @param {string} resourceId - Resource ID
   * @returns {Object} Missing dependency info
   * @private
   */
  _createMissingDependency(resourceId) {
    const config = getResourceConfig(resourceId);

    if (!config) {
      return {
        resourceId,
        resourceName: resourceId,
        tier: 0,
        category: 'unknown',
        estimatedCost: 0,
        estimatedTokens: 0,
        impactStatement: 'Resource not found in registry'
      };
    }

    return {
      resourceId: config.resourceId,
      resourceName: config.resourceName,
      tier: config.tier,
      category: config.category,
      estimatedCost: config.generationCost,
      estimatedTokens: config.estimatedTokens,
      impactStatement: config.impactStatement
    };
  }

  /**
   * Create resource info object
   *
   * @param {string} resourceId - Resource ID
   * @returns {Object} Resource info
   * @private
   */
  _createResourceInfo(resourceId) {
    const config = getResourceConfig(resourceId);

    if (!config) {
      return {
        resourceId,
        resourceName: resourceId,
        order: 0
      };
    }

    return {
      resourceId: config.resourceId,
      resourceName: config.resourceName,
      tier: config.tier,
      category: config.category,
      estimatedCost: config.generationCost,
      estimatedTokens: config.estimatedTokens
    };
  }

  /**
   * Save validation result to cache
   * Caches validation results to avoid redundant checks
   *
   * @param {string} userId - User ID
   * @param {string} resourceId - Resource ID
   * @param {Object} validationResult - Validation result to cache
   * @returns {Promise<void>}
   */
  async cacheValidationResult(userId, resourceId, validationResult) {
    try {
      const { error } = await supabase
        .from('dependency_validation_cache')
        .upsert({
          user_id: userId,
          resource_id: resourceId,
          validation_result: validationResult,
          resource_version: await this._getResourceVersion(userId),
          cached_at: new Date().toISOString()
        });

      if (error) {
        logger.warn(`Failed to cache validation result: ${error.message}`, { error });
        // Don't throw - caching is optional optimization
      }
    } catch (error) {
      logger.warn(`Error caching validation result: ${error.message}`, { error });
      // Don't throw - caching is optional optimization
    }
  }

  /**
   * Get cached validation result
   *
   * @param {string} userId - User ID
   * @param {string} resourceId - Resource ID
   * @returns {Promise<Object|null>} Cached result or null
   */
  async getCachedValidation(userId, resourceId) {
    try {
      const resourceVersion = await this._getResourceVersion(userId);

      const { data, error } = await supabase
        .from('dependency_validation_cache')
        .select('validation_result, cached_at')
        .eq('user_id', userId)
        .eq('resource_id', resourceId)
        .eq('resource_version', resourceVersion)
        .single();

      if (error || !data) {
        return null;
      }

      // Check if cache is fresh (less than 1 hour old)
      const cacheAge = Date.now() - new Date(data.cached_at).getTime();
      const cacheMaxAge = 60 * 60 * 1000; // 1 hour

      if (cacheAge > cacheMaxAge) {
        return null; // Expired
      }

      return data.validation_result;
    } catch (error) {
      logger.warn(`Error getting cached validation: ${error.message}`, { error });
      return null;
    }
  }

  /**
   * Invalidate validation cache for user
   * Called when user generates a new resource
   *
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async invalidateCache(userId) {
    try {
      const { error } = await supabase
        .from('dependency_validation_cache')
        .delete()
        .eq('user_id', userId);

      if (error) {
        logger.warn(`Failed to invalidate validation cache: ${error.message}`, { error });
      } else {
        logger.info(`Invalidated validation cache for user ${userId}`);
      }
    } catch (error) {
      logger.warn(`Error invalidating validation cache: ${error.message}`, { error });
    }
  }

  /**
   * Get resource version hash
   * Hash of user's generated resource IDs, used for cache invalidation
   *
   * @param {string} userId - User ID
   * @returns {Promise<string>} Resource version hash
   * @private
   */
  async _getResourceVersion(userId) {
    try {
      const resources = await this.getUserGeneratedResources(userId);
      const resourceIds = resources.map(r => r.resource_id).sort().join(',');

      // Simple hash (in production, use crypto.createHash)
      return Buffer.from(resourceIds).toString('base64');
    } catch (error) {
      logger.warn(`Error getting resource version: ${error.message}`, { error });
      return 'unknown';
    }
  }
}

// Export singleton instance
export const dependencyValidationService = new DependencyValidationService();

export default dependencyValidationService;
