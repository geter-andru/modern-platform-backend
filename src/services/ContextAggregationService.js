/**
 * Context Aggregation Service
 *
 * Intelligently aggregates previously generated resources into optimized context
 * for AI generation using a four-tier strategy:
 *
 * - Tier 1 (Critical): Always include full context (~500 tokens)
 * - Tier 2 (Required): Full output from required dependencies (~2000 tokens)
 * - Tier 3 (Optional): Summarized optional context (~1000 tokens)
 * - Tier 4 (Skip): Prune distant, low-relevance resources (0 tokens)
 *
 * Target: 3,500 tokens maximum (84% cost reduction from 22,000 tokens)
 *
 * @see /CONTEXT_AGGREGATION_SYSTEM.md for architecture
 * @see /backend/src/config/context-tiers.js for tier configurations
 */

import supabase from './supabaseService.js';
import logger from '../utils/logger.js';
import contextCacheService from './ContextCacheService.js';
import {
  CONTEXT_TIER_CONFIGS,
  getContextTierConfig,
  getDefaultContextTierConfig
} from '../config/context-tiers.js';
import { getResourceConfig } from '../config/resource-dependencies.js';
import empathyContextExtractor from './empathyContextExtractor.js';

/**
 * Context Aggregation Service
 * Optimizes context usage for AI resource generation
 */
class ContextAggregationService {
  /**
   * Aggregate context for a resource generation
   * Applies four-tier strategy to optimize token usage
   *
   * @param {string} userId - User ID
   * @param {string} targetResourceId - Resource to generate
   * @returns {Promise<Object>} Aggregated context
   */
  async aggregateContext(userId, targetResourceId, useCache = true) {
    const startTime = Date.now();

    try {
      logger.info(`Aggregating context for user ${userId}, resource ${targetResourceId} (cache: ${useCache})`);

      // Get resource version for cache key
      const resourceVersion = await this._getResourceVersion(userId);

      // Check cache first (if enabled)
      if (useCache) {
        const cachedContext = await contextCacheService.getCachedContext(userId, targetResourceId, resourceVersion);

        if (cachedContext) {
          logger.info(`Using cached context for ${targetResourceId} (saved ${Date.now() - startTime}ms aggregation time)`);
          return cachedContext;
        }
      }

      // Get tier configuration
      let tierConfig = getContextTierConfig(targetResourceId);

      if (!tierConfig) {
        // Use default configuration if not explicitly defined
        const resourceConfig = getResourceConfig(targetResourceId);
        tierConfig = getDefaultContextTierConfig(resourceConfig);
        logger.info(`Using default tier configuration for ${targetResourceId}`);
      }

      // Fetch all user's generated resources
      const userResources = await this._getUserGeneratedResources(userId);

      logger.info(`User ${userId} has ${userResources.length} generated resources`);

      // Extract empathy context (Priority 1: Emotional Empathy Framework)
      const empathyContext = empathyContextExtractor.extractCombinedContext(userResources);
      logger.info(`Empathy context extracted: ${empathyContext.hasEmpathyContext ? 'YES' : 'NO'}, Critical Need: ${empathyContext.hasCriticalNeedContext ? 'YES' : 'NO'}`);

      // Aggregate by tier
      const tier1 = await this._aggregateTier1(userResources, tierConfig);
      const tier2 = await this._aggregateTier2(userResources, tierConfig);
      const tier3 = await this._aggregateTier3(userResources, tierConfig);

      // Format empathy context for prompt injection (Priority 1)
      const empathyPromptSection = empathyContextExtractor.formatForPrompt(empathyContext);
      const empathyTokens = this._estimateTokenCount(empathyPromptSection);

      // Calculate token counts
      const tokenBreakdown = {
        tier1: this._calculateTokens(tier1),
        tier2: this._calculateTokens(tier2),
        tier3: this._calculateTokens(tier3),
        empathy: empathyTokens
      };

      const totalTokens = tokenBreakdown.tier1 + tokenBreakdown.tier2 + tokenBreakdown.tier3 + tokenBreakdown.empathy;

      logger.info(`Context aggregated for ${targetResourceId}: ${totalTokens} tokens (T1: ${tokenBreakdown.tier1}, T2: ${tokenBreakdown.tier2}, T3: ${tokenBreakdown.tier3}, Empathy: ${tokenBreakdown.empathy})`);

      // Format for prompt injection (includes empathy context)
      const formattedPromptContext = this._formatPromptContext(tier1, tier2, tier3, empathyPromptSection);

      const aggregatedContext = {
        tier1_critical: tier1,
        tier2_required: tier2,
        tier3_optional: tier3,
        empathyContext, // Priority 1: Emotional Empathy Framework
        totalTokens,
        tokenBreakdown,
        formattedPromptContext,
        aggregationTime: Date.now() - startTime
      };

      // Cache the aggregated context (fire-and-forget)
      if (useCache) {
        contextCacheService.setCachedContext(userId, targetResourceId, resourceVersion, aggregatedContext)
          .catch(error => logger.warn(`Failed to cache context: ${error.message}`, { error }));
      }

      return aggregatedContext;
    } catch (error) {
      logger.error(`Error aggregating context: ${error.message}`, { error, userId, targetResourceId });
      throw error;
    }
  }

  /**
   * Aggregate Tier 1: Critical Foundation (Always Include, Full)
   *
   * @param {Object[]} userResources - User's generated resources
   * @param {Object} tierConfig - Tier configuration
   * @returns {Promise<Object[]>} Tier 1 context
   * @private
   */
  async _aggregateTier1(userResources, tierConfig) {
    const tier1Resources = tierConfig.tiers.tier1_critical;
    const contexts = [];

    for (const resourceId of tier1Resources) {
      const resource = userResources.find(r => r.resource_id === resourceId);

      if (!resource) {
        logger.warn(`Tier 1 resource ${resourceId} not found for user`);
        continue;
      }

      // Include full output (no summarization for critical context)
      const output = this._extractOutput(resource);

      contexts.push({
        resourceId: resource.resource_id,
        resourceName: resource.resource_name,
        generatedAt: resource.generated_at,
        output,
        tokenCount: this._estimateTokenCount(output),
        tier: 1,
        summarized: false
      });
    }

    // Ensure tier1 doesn't exceed budget
    const tier1Budget = tierConfig.tokenBudget.tier1;
    return this._enforceTokenBudget(contexts, tier1Budget, false);
  }

  /**
   * Aggregate Tier 2: Required Dependencies (Full)
   *
   * @param {Object[]} userResources - User's generated resources
   * @param {Object} tierConfig - Tier configuration
   * @returns {Promise<Object[]>} Tier 2 context
   * @private
   */
  async _aggregateTier2(userResources, tierConfig) {
    const tier2Resources = tierConfig.tiers.tier2_required;
    const contexts = [];

    for (const resourceId of tier2Resources) {
      const resource = userResources.find(r => r.resource_id === resourceId);

      if (!resource) {
        logger.warn(`Tier 2 resource ${resourceId} not found for user`);
        continue;
      }

      // Include full output for required dependencies
      const output = this._extractOutput(resource);

      contexts.push({
        resourceId: resource.resource_id,
        resourceName: resource.resource_name,
        generatedAt: resource.generated_at,
        output,
        tokenCount: this._estimateTokenCount(output),
        tier: 2,
        summarized: false
      });
    }

    // Ensure tier2 doesn't exceed budget
    const tier2Budget = tierConfig.tokenBudget.tier2;
    return this._enforceTokenBudget(contexts, tier2Budget, false);
  }

  /**
   * Aggregate Tier 3: Optional Enhancement (Summarized)
   *
   * @param {Object[]} userResources - User's generated resources
   * @param {Object} tierConfig - Tier configuration
   * @returns {Promise<Object[]>} Tier 3 context
   * @private
   */
  async _aggregateTier3(userResources, tierConfig) {
    const tier3Resources = tierConfig.tiers.tier3_optional;
    const contexts = [];

    for (const resourceId of tier3Resources) {
      const resource = userResources.find(r => r.resource_id === resourceId);

      if (!resource) {
        logger.warn(`Tier 3 resource ${resourceId} not found for user`);
        continue;
      }

      // Summarize output for optional dependencies
      const fullOutput = this._extractOutput(resource);
      const summarizedOutput = await this._summarizeResource(fullOutput, 200); // Target 200 tokens

      contexts.push({
        resourceId: resource.resource_id,
        resourceName: resource.resource_name,
        generatedAt: resource.generated_at,
        output: summarizedOutput,
        tokenCount: this._estimateTokenCount(summarizedOutput),
        tier: 3,
        summarized: true
      });
    }

    // Ensure tier3 doesn't exceed budget
    const tier3Budget = tierConfig.tokenBudget.tier3;
    return this._enforceTokenBudget(contexts, tier3Budget, true);
  }

  /**
   * Format aggregated context for prompt injection
   *
   * @param {Object[]} tier1 - Tier 1 contexts
   * @param {Object[]} tier2 - Tier 2 contexts
   * @param {Object[]} tier3 - Tier 3 contexts
   * @returns {string} Formatted context string
   * @private
   */
  _formatPromptContext(tier1, tier2, tier3, empathyPromptSection = '') {
    let formatted = '';

    // Priority 1: Empathy-Driven Context (ALWAYS FIRST)
    if (empathyPromptSection) {
      formatted += empathyPromptSection;
      formatted += '\n---\n\n';
    }

    // Tier 1: Critical Foundation
    if (tier1.length > 0) {
      formatted += '## CRITICAL FOUNDATION CONTEXT\n\n';
      for (const resource of tier1) {
        formatted += `### ${resource.resourceName}\n`;
        formatted += `${resource.output}\n\n`;
      }
    }

    // Tier 2: Required Dependencies
    if (tier2.length > 0) {
      formatted += '## REQUIRED DEPENDENCIES CONTEXT\n\n';
      for (const resource of tier2) {
        formatted += `### ${resource.resourceName}\n`;
        formatted += `${resource.output}\n\n`;
      }
    }

    // Tier 3: Optional Enhancement
    if (tier3.length > 0) {
      formatted += '## OPTIONAL ENHANCEMENT CONTEXT (Summarized)\n\n';
      for (const resource of tier3) {
        formatted += `### ${resource.resourceName} (Summary)\n`;
        formatted += `${resource.output}\n\n`;
      }
    }

    return formatted;
  }

  /**
   * Enforce token budget for a tier
   * If over budget, truncate or drop lowest priority resources
   *
   * @param {Object[]} contexts - Context resources
   * @param {number} budget - Token budget
   * @param {boolean} allowTruncation - Whether to allow dropping resources
   * @returns {Object[]} Budget-compliant contexts
   * @private
   */
  _enforceTokenBudget(contexts, budget, allowTruncation) {
    const currentTokens = this._calculateTokens(contexts);

    if (currentTokens <= budget) {
      return contexts; // Within budget
    }

    if (!allowTruncation) {
      // For Tier 1 & 2, keep all but warn (shouldn't happen with proper config)
      logger.warn(`Context exceeds budget: ${currentTokens} > ${budget}, keeping all (Tier 1/2)`);
      return contexts;
    }

    // For Tier 3, drop resources until within budget
    const sorted = [...contexts].sort((a, b) => b.tokenCount - a.tokenCount);
    const kept = [];
    let runningTotal = 0;

    for (const resource of sorted) {
      if (runningTotal + resource.tokenCount <= budget) {
        kept.push(resource);
        runningTotal += resource.tokenCount;
      } else {
        logger.info(`Dropping Tier 3 resource ${resource.resourceId} to stay within budget`);
      }
    }

    return kept;
  }

  /**
   * Summarize a resource output to target token count
   * Uses intelligent truncation (AI summarization in production)
   *
   * @param {string} fullOutput - Full resource output
   * @param {number} targetTokens - Target token count
   * @returns {Promise<string>} Summarized output
   * @private
   */
  async _summarizeResource(fullOutput, targetTokens) {
    const currentTokens = this._estimateTokenCount(fullOutput);

    if (currentTokens <= targetTokens) {
      return fullOutput; // Already within target
    }

    // Simple truncation (replace with AI summarization in production)
    const ratio = targetTokens / currentTokens;
    const targetLength = Math.floor(fullOutput.length * ratio);

    // Try to preserve JSON structure if applicable
    if (fullOutput.trim().startsWith('{') || fullOutput.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(fullOutput);

        // For objects, keep only top-level keys
        if (typeof parsed === 'object' && !Array.isArray(parsed)) {
          const summary = {};
          const keys = Object.keys(parsed).slice(0, 5); // Keep first 5 keys

          for (const key of keys) {
            const value = parsed[key];

            if (typeof value === 'string') {
              summary[key] = value.length > 100 ? value.substring(0, 100) + '...' : value;
            } else if (Array.isArray(value)) {
              summary[key] = `[Array of ${value.length} items]`;
            } else {
              summary[key] = value;
            }
          }

          return JSON.stringify(summary, null, 2);
        }
      } catch (e) {
        // Not valid JSON, use simple truncation
      }
    }

    // Simple truncation for non-JSON or invalid JSON
    return fullOutput.substring(0, targetLength) + '... [truncated for context optimization]';
  }

  /**
   * Extract output from resource record
   * Handles both JSON and string outputs
   *
   * @param {Object} resource - Resource record
   * @returns {string} Output string
   * @private
   */
  _extractOutput(resource) {
    if (typeof resource.output === 'string') {
      return resource.output;
    }

    if (typeof resource.output === 'object' && resource.output !== null) {
      return JSON.stringify(resource.output, null, 2);
    }

    // Fallback to output_summary if available
    if (resource.output_summary) {
      return resource.output_summary;
    }

    return '[No output available]';
  }

  /**
   * Estimate token count for text
   * Uses simple heuristic: ~4 characters per token
   *
   * @param {string} text - Text to count
   * @returns {number} Estimated token count
   * @private
   */
  _estimateTokenCount(text) {
    if (!text || typeof text !== 'string') {
      return 0;
    }

    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate total tokens for context array
   *
   * @param {Object[]} contexts - Context resources
   * @returns {number} Total token count
   * @private
   */
  _calculateTokens(contexts) {
    return contexts.reduce((sum, ctx) => sum + (ctx.tokenCount || 0), 0);
  }

  /**
   * Get context aggregation analytics
   * Provides cost estimates and breakdown
   *
   * @param {string} userId - User ID
   * @param {string} targetResourceId - Target resource
   * @returns {Promise<Object>} Analytics
   */
  async getContextAnalytics(userId, targetResourceId) {
    try {
      const context = await this.aggregateContext(userId, targetResourceId);

      // Estimate cost: $3 per 1M input tokens (Claude 3.5 Sonnet pricing)
      const estimatedCost = (context.totalTokens / 1_000_000) * 3;

      // Get savings vs non-optimized
      const userResources = await this._getUserGeneratedResources(userId);
      const naiveTotalTokens = userResources.reduce((sum, r) => {
        const output = this._extractOutput(r);
        return sum + this._estimateTokenCount(output);
      }, 0);

      const savingsPercent = naiveTotalTokens > 0
        ? ((naiveTotalTokens - context.totalTokens) / naiveTotalTokens) * 100
        : 0;

      return {
        estimatedTokens: context.totalTokens,
        estimatedCost,
        breakdown: {
          tier1: {
            resources: context.tier1_critical.length,
            tokens: context.tokenBreakdown.tier1
          },
          tier2: {
            resources: context.tier2_required.length,
            tokens: context.tokenBreakdown.tier2
          },
          tier3: {
            resources: context.tier3_optional.length,
            tokens: context.tokenBreakdown.tier3
          }
        },
        optimization: {
          naiveTotalTokens,
          optimizedTokens: context.totalTokens,
          tokensSaved: naiveTotalTokens - context.totalTokens,
          savingsPercent: Math.round(savingsPercent)
        }
      };
    } catch (error) {
      logger.error(`Error getting context analytics: ${error.message}`, { error, userId, targetResourceId });
      throw error;
    }
  }

  /**
   * Fetch user's generated resources from database
   *
   * @param {string} userId - User ID
   * @returns {Promise<Object[]>} Generated resources
   * @private
   */
  async _getUserGeneratedResources(userId) {
    try {
      const { data, error } = await supabase
        .from('generated_resources')
        .select('resource_id, resource_name, generated_at, output, output_summary')
        .eq('user_id', userId)
        .order('generated_at', { ascending: true });

      if (error) {
        logger.error(`Error fetching user resources: ${error.message}`, { error, userId });
        throw new Error(`Failed to fetch user resources: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      logger.error(`Error in _getUserGeneratedResources: ${error.message}`, { error, userId });
      throw error;
    }
  }

  /**
   * Get resource version hash
   * Hash of user's generated resource IDs, used for cache key
   *
   * @param {string} userId - User ID
   * @returns {Promise<string>} Resource version hash
   * @private
   */
  async _getResourceVersion(userId) {
    try {
      const resources = await this._getUserGeneratedResources(userId);
      const resourceIds = resources.map(r => r.resource_id).sort().join(',');

      // Simple hash using base64 encoding
      return Buffer.from(resourceIds).toString('base64');
    } catch (error) {
      logger.warn(`Error getting resource version: ${error.message}`, { error, userId });
      return 'unknown';
    }
  }
}

// Export singleton instance
export const contextAggregationService = new ContextAggregationService();

export default contextAggregationService;
