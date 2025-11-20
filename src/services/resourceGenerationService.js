/**
 * Resource Generation Service
 *
 * Handles AI-powered generation of personalized revenue intelligence resources
 * with cumulative intelligence (each resource builds on all previous ones).
 *
 * Core Features:
 * - Load prompts from disk
 * - Inject user context + previous resource outputs (cumulative intelligence)
 * - Generate using Claude AI with streaming support
 * - Store generated resources with metadata
 * - Track dependencies and generation costs
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import aiService from './aiService.js';
import logger from '../utils/logger.js';
import { pool } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ResourceGenerationService {
  constructor() {
    this.promptsBasePath = path.join(__dirname, '../../../dev/resource-library/resource-prompts');
    this.resourceMappingPath = path.join(__dirname, '../../../dev/resource-library/RESOURCE_ASSET_MAPPING.json');
    this.resourceMapping = null;
  }

  /**
   * Load resource asset mapping from disk
   */
  async loadResourceMapping() {
    if (this.resourceMapping) {
      return this.resourceMapping;
    }

    try {
      const content = await fs.readFile(this.resourceMappingPath, 'utf-8');
      this.resourceMapping = JSON.parse(content);
      logger.info('✅ Loaded resource asset mapping: 38 strategic assets');
      return this.resourceMapping;
    } catch (error) {
      logger.error(`Failed to load resource mapping: ${error.message}`);
      throw new Error('Resource mapping file not found');
    }
  }

  /**
   * Generate a complete resource (strategic framework + implementation guides)
   * This is the main entry point for resource generation
   */
  async generateResource(userId, resourceId, options = {}) {
    const startTime = Date.now();
    const { streaming = false, onProgress = null } = options;
    const client = await pool.connect();

    try {
      logger.info(`🎯 Starting resource generation: ${resourceId} for user ${userId}`);

      // 1. Get resource definition from database
      const resourceResult = await client.query(`
        SELECT * FROM resources WHERE id = $1 AND is_active = true
      `, [resourceId]);

      if (resourceResult.rows.length === 0) {
        throw new Error(`Resource ${resourceId} not found`);
      }

      const resource = resourceResult.rows[0];
      logger.info(`  📦 Resource: ${resource.name} (Asset #${resource.asset_number})`);

      // 2. Verify resource is unlocked for user
      const unlockResult = await client.query(`
        SELECT * FROM user_resource_unlocks
        WHERE user_id = $1 AND resource_id = $2
      `, [userId, resourceId]);

      if (unlockResult.rows.length === 0) {
        throw new Error(`Resource ${resource.resource_code} is not unlocked for user ${userId}`);
      }

      const unlock = unlockResult.rows[0];

      // 3. Build cumulative context from ALL previous resources
      if (onProgress) {
        onProgress({ stage: 'building_context', progress: 10 });
      }
      const cumulativeContext = await this.buildCumulativeContext(userId, resource.asset_number, client);

      // 4. Generate strategic content
      const strategicPrompts = resource.strategic_prompts; // JSONB array
      const strategicOutputs = [];
      let totalInputTokens = cumulativeContext.contextTokenEstimate || 0;
      let totalOutputTokens = 0;

      for (let i = 0; i < strategicPrompts.length; i++) {
        const promptId = strategicPrompts[i];

        if (onProgress) {
          onProgress({
            stage: 'generating_strategic',
            promptId,
            progress: 10 + ((i / strategicPrompts.length) * 40)
          });
        }

        logger.info(`  📝 Generating strategic content: ${promptId}`);

        const output = await this.generateSinglePrompt(
          userId,
          promptId,
          resource.tier,
          cumulativeContext,
          streaming && i === 0, // Only stream first strategic prompt
          onProgress
        );

        strategicOutputs.push(output);
        totalInputTokens += output.metadata.tokens.inputTokens;
        totalOutputTokens += output.metadata.tokens.outputTokens;
      }

      // 5. Generate implementation guides
      const implementationGuides = resource.implementation_guides; // JSONB array
      const implementationOutputs = [];

      for (let i = 0; i < implementationGuides.length; i++) {
        const guideId = implementationGuides[i];

        if (onProgress) {
          onProgress({
            stage: 'generating_implementation',
            guideId,
            progress: 50 + ((i / implementationGuides.length) * 40)
          });
        }

        logger.info(`  📋 Generating implementation guide: ${guideId}`);

        // Add strategic outputs to context for implementation guides
        const implContext = {
          ...cumulativeContext,
          strategicOutput: strategicOutputs.map(o => o.content).join('\n\n')
        };

        const output = await this.generateSinglePrompt(
          userId,
          guideId,
          'implementation',
          implContext,
          false, // No streaming for implementation guides
          onProgress
        );

        implementationOutputs.push(output);
        totalInputTokens += output.metadata.tokens.inputTokens;
        totalOutputTokens += output.metadata.tokens.outputTokens;
      }

      // 6. Calculate total cost
      const estimatedCost = aiService.calculateCost(
        { inputTokens: totalInputTokens, outputTokens: totalOutputTokens },
        'claude-sonnet-4-20250514'
      );

      // 7. Store generated resource in database
      if (onProgress) {
        onProgress({ stage: 'saving', progress: 95 });
      }

      const generationDuration = Math.floor((Date.now() - startTime) / 1000);

      // Get current version number
      const versionResult = await client.query(`
        SELECT COALESCE(MAX(generation_version), 0) + 1 as next_version
        FROM generated_resources
        WHERE user_id = $1 AND resource_id = $2
      `, [userId, resourceId]);

      const nextVersion = versionResult.rows[0].next_version;

      // Mark previous versions as inactive
      await client.query(`
        UPDATE generated_resources
        SET is_active = false
        WHERE user_id = $1 AND resource_id = $2 AND is_active = true
      `, [userId, resourceId]);

      // Insert new generated resource
      const insertResult = await client.query(`
        INSERT INTO generated_resources (
          user_id,
          resource_id,
          unlock_id,
          strategic_content,
          implementation_content,
          generation_version,
          model_used,
          total_input_tokens,
          total_output_tokens,
          estimated_cost_usd,
          generation_started_at,
          generation_completed_at,
          generation_duration_seconds,
          context_resources_used,
          context_token_count,
          is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true)
        RETURNING id
      `, [
        userId,
        resourceId,
        unlock.id,
        JSON.stringify(strategicOutputs),
        JSON.stringify(implementationOutputs),
        nextVersion,
        'claude-sonnet-4-20250514',
        totalInputTokens,
        totalOutputTokens,
        estimatedCost,
        new Date(startTime),
        new Date(),
        generationDuration,
        cumulativeContext.usedResourceCodes || [],
        cumulativeContext.contextTokenEstimate
      ]);

      const generatedId = insertResult.rows[0].id;

      // 8. Update unlock record
      await client.query(`
        UPDATE user_resource_unlocks
        SET
          status = 'generated',
          generated_at = NOW(),
          generation_count = generation_count + 1,
          last_accessed_at = NOW()
        WHERE id = $1
      `, [unlock.id]);

      logger.info(`✅ Resource generated: ${resource.name} (v${nextVersion}, ${generationDuration}s, $${estimatedCost.toFixed(4)})`);

      if (onProgress) {
        onProgress({ stage: 'complete', progress: 100 });
      }

      return {
        success: true,
        generatedId,
        resourceCode: resource.resource_code,
        resourceName: resource.name,
        assetNumber: resource.asset_number,
        version: nextVersion,
        strategicContent: strategicOutputs,
        implementationContent: implementationOutputs,
        metadata: {
          generatedAt: new Date().toISOString(),
          durationSeconds: generationDuration,
          totalInputTokens,
          totalOutputTokens,
          estimatedCostUSD: estimatedCost,
          cumulativeContextResources: cumulativeContext.resourceCount || 0,
          model: 'claude-sonnet-4-20250514'
        }
      };

    } catch (error) {
      logger.error(`❌ Resource generation failed: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate a single prompt (strategic or implementation guide)
   */
  async generateSinglePrompt(userId, promptId, tier, cumulativeContext, streaming = false, onProgress = null) {
    const startTime = Date.now();

    try {
      // 1. Load prompt template from disk
      const promptTemplate = await this.loadPromptTemplate(promptId, tier);

      // 2. Inject cumulative context into prompt
      const executablePrompt = this.injectCumulativeContext(promptTemplate, cumulativeContext);

      // 3. Call AI service
      let aiResponse;
      if (streaming) {
        aiResponse = await aiService.callAnthropicAPIStreaming(
          executablePrompt,
          {
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4000,
            temperature: 0.7
          },
          (progress, chunk) => {
            if (onProgress) {
              onProgress({
                stage: 'streaming',
                promptId,
                progress: 10 + (progress * 0.4), // Map 0-100 to 10-50
                chunk
              });
            }
          }
        );
      } else {
        aiResponse = await aiService.callAnthropicAPI(
          executablePrompt,
          {
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4000,
            temperature: 0.7
          }
        );
      }

      // 4. Parse and structure the output
      const parsedContent = this.parseResourceOutput(aiResponse.text, promptId);

      return {
        promptId,
        tier,
        content: parsedContent,
        metadata: {
          generatedAt: new Date().toISOString(),
          model: 'claude-sonnet-4-20250514',
          tokens: aiResponse.usage,
          generationTimeMs: Date.now() - startTime
        }
      };

    } catch (error) {
      logger.error(`Prompt generation failed: ${promptId}`, error);
      throw error;
    }
  }

  /**
   * Load prompt template from disk
   */
  async loadPromptTemplate(resourceId, type) {
    try {
      const typeFolders = {
        'strategic': ['core-resources', 'advanced-resources', 'strategic-resources'],
        'implementation': ['implementation-resources/core', 'implementation-resources/advanced', 'implementation-resources/strategic']
      };

      const foldersToSearch = typeFolders[type] || typeFolders['strategic'];

      // Try each folder until we find the prompt
      for (const folder of foldersToSearch) {
        const promptPath = path.join(this.promptsBasePath, folder, resourceId);

        try {
          const promptContent = await fs.readFile(promptPath, 'utf-8');
          logger.debug(`Loaded prompt: ${resourceId} from ${folder}`);
          return promptContent;
        } catch (err) {
          // File not in this folder, try next
          continue;
        }
      }

      throw new Error(`Prompt file not found: ${resourceId}`);

    } catch (error) {
      logger.error(`Failed to load prompt: ${resourceId}`, error);
      throw new Error(`Prompt loading failed for ${resourceId}: ${error.message}`);
    }
  }

  /**
   * Build cumulative context from ALL previous resources
   * THIS IS THE KEY TO EXPONENTIAL PERSONALIZATION (1x → 38x)
   */
  async buildCumulativeContext(userId, currentAssetNumber, client) {
    try {
      // 1. Get user's product details (base context)
      const productDetails = await this.getUserProductDetails(userId, client);

      // 2. Get all previously generated resources for this user (using database function)
      const result = await client.query(`
        SELECT * FROM get_cumulative_context($1,
          (SELECT id FROM resources WHERE asset_number = $2)
        )
      `, [userId, currentAssetNumber]);

      const previousResources = result.rows;

      // 3. Build context string and track resource codes
      let contextString = '';
      let tokenEstimate = 100; // Base overhead
      const usedResourceCodes = [];

      if (previousResources.length > 0) {
        contextString = '## PREVIOUS STRATEGIC ASSETS GENERATED:\n\n';

        for (const resource of previousResources) {
          const { resource_code, strategic_content, implementation_content } = resource;
          usedResourceCodes.push(resource_code);

          contextString += `### ${resource_code}\n`;

          // Include strategic content
          if (strategic_content) {
            const contentStr = typeof strategic_content === 'string'
              ? strategic_content
              : JSON.stringify(strategic_content, null, 2);
            contextString += `${contentStr}\n\n`;
            tokenEstimate += Math.ceil(contentStr.length / 4);
          }

          // Include implementation guides
          if (implementation_content) {
            const implStr = typeof implementation_content === 'string'
              ? implementation_content
              : JSON.stringify(implementation_content, null, 2);
            contextString += `Implementation Guides:\n${implStr}\n\n`;
            tokenEstimate += Math.ceil(implStr.length / 4);
          }

          contextString += '---\n\n';
        }
      }

      const context = {
        productDetails,
        previousOutputs: contextString,
        contextSummary: previousResources.length > 0
          ? `Built on ${previousResources.length} previous strategic assets.`
          : 'No previous resources generated yet.',
        resourceCount: previousResources.length,
        contextTokenEstimate: tokenEstimate,
        usedResourceCodes,
        personalizationLevel: previousResources.length + 1 // 1x, 2x, 3x...
      };

      logger.info(`Built cumulative context: ${context.personalizationLevel}x personalization (${previousResources.length} previous resources)`);

      return context;

    } catch (error) {
      logger.error(`Failed to build cumulative context`, error);
      // Return minimal context on error
      return {
        productDetails: await this.getUserProductDetails(userId, client),
        previousOutputs: '',
        contextSummary: 'Error loading previous context.',
        resourceCount: 0,
        contextTokenEstimate: 0,
        usedResourceCodes: [],
        personalizationLevel: 1
      };
    }
  }

  /**
   * Inject cumulative context into prompt template
   * Replaces placeholders with actual user data + previous outputs
   */
  injectCumulativeContext(promptTemplate, cumulativeContext) {
    let enrichedPrompt = promptTemplate;

    // 1. Inject product details
    const productDetails = cumulativeContext.productDetails || {};
    enrichedPrompt = enrichedPrompt.replace(/\{product_name\}/g, productDetails.name || '[Product Name]');
    enrichedPrompt = enrichedPrompt.replace(/\{product_description\}/g, productDetails.description || '[Product Description]');
    enrichedPrompt = enrichedPrompt.replace(/\{product_category\}/g, productDetails.category || '[Product Category]');
    enrichedPrompt = enrichedPrompt.replace(/\{distinguishing_feature\}/g, productDetails.distinguishingFeature || '[Distinguishing Feature]');
    enrichedPrompt = enrichedPrompt.replace(/\{primary_benefit\}/g, productDetails.primaryBenefit || '[Primary Benefit]');
    enrichedPrompt = enrichedPrompt.replace(/\{current_business_stage\}/g, productDetails.businessStage || '[Business Stage]');

    // 2. Inject ALL previous resource outputs (THE CUMULATIVE INTELLIGENCE MAGIC)
    const previousOutputsSection = this.formatPreviousOutputs(cumulativeContext.previousResources || {});
    enrichedPrompt = enrichedPrompt.replace(/\{previous_outputs\}/g, previousOutputsSection);
    enrichedPrompt = enrichedPrompt.replace(/\{from_previous_output\}/g, previousOutputsSection);

    // 3. Add personalization metadata
    const personalizationLevel = cumulativeContext.metadata?.personalizationLevel || 1;
    enrichedPrompt = enrichedPrompt.replace(/\{personalization_level\}/g, `${personalizationLevel}x`);

    return enrichedPrompt;
  }

  /**
   * Format previous resource outputs for prompt injection
   */
  formatPreviousOutputs(previousResources) {
    if (!previousResources || Object.keys(previousResources).length === 0) {
      return 'No previous resources generated yet. This is the first resource in the collection.';
    }

    const formatted = Object.entries(previousResources).map(([resourceId, content]) => {
      return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PREVIOUS RESOURCE: ${resourceId}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${typeof content === 'object' ? JSON.stringify(content, null, 2) : content}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    }).join('\n');

    return `
YOU HAVE ACCESS TO ${Object.keys(previousResources).length} PREVIOUSLY GENERATED RESOURCES.
Use these outputs to create DEEPER, MORE PERSONALIZED content that builds on this context.

${formatted}

IMPORTANT: Reference specific insights from these previous resources in your output to create
seamless continuity and exponentially deeper personalization.
`;
  }

  /**
   * Parse AI output into structured format
   */
  parseResourceOutput(rawText, resourceId) {
    try {
      // Try to parse as JSON first (many prompts request JSON format)
      const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // Try direct JSON parse
      try {
        return JSON.parse(rawText);
      } catch (err) {
        // Not JSON, return as structured text
        return {
          resourceId,
          format: 'markdown',
          content: rawText,
          generatedAt: new Date().toISOString()
        };
      }

    } catch (error) {
      logger.warn(`Failed to parse structured output for ${resourceId}, returning raw text`);
      return {
        resourceId,
        format: 'text',
        content: rawText,
        generatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Validate dependencies before generation
   */
  async validateDependencies(userId, assetId) {
    const asset = getAssetById(assetId);
    if (!asset || !asset.dependencies) {
      return true; // No dependencies to check
    }

    const requiredDeps = asset.dependencies.requiredDependencies || [];
    const missingDeps = [];

    for (const depId of requiredDeps) {
      const exists = await this.resourceExists(userId, depId);
      if (!exists) {
        missingDeps.push(depId);
      }
    }

    if (missingDeps.length > 0) {
      throw new Error(`Missing required dependencies for ${assetId}: ${missingDeps.join(', ')}`);
    }

    return true;
  }

  /**
   * Check if a resource exists for a user
   */
  async resourceExists(userId, resourceId) {
    try {
      const resource = await this.getGeneratedResource(userId, resourceId);
      return !!resource;
    } catch (err) {
      return false;
    }
  }

  /**
   * Get user's product details (from assessment/database)
   */
  async getUserProductDetails(userId, client) {
    try {
      const result = await client.query(`
        SELECT
          u.id,
          u.email,
          u.full_name,
          p.name as product_name,
          p.description as product_description,
          p.distinguishing_feature,
          p.business_model,
          p.target_market,
          p.primary_benefit,
          c.name as company_name,
          c.industry,
          c.current_arr,
          c.user_count
        FROM users u
        LEFT JOIN products p ON u.id = p.user_id AND p.is_active = true
        LEFT JOIN companies c ON u.company_id = c.id
        WHERE u.id = $1
        LIMIT 1
      `, [userId]);

      if (result.rows.length === 0) {
        throw new Error(`User ${userId} not found`);
      }

      const row = result.rows[0];

      return {
        userId: row.id,
        userEmail: row.email,
        userName: row.full_name,
        productName: row.product_name || '[Product Name]',
        productDescription: row.product_description || '[Product Description]',
        distinguishingFeature: row.distinguishing_feature || '[Key Differentiator]',
        businessModel: row.business_model || '[Business Model]',
        targetMarket: row.target_market || '[Target Market]',
        primaryBenefit: row.primary_benefit || '[Primary Benefit]',
        companyName: row.company_name || '[Company Name]',
        industry: row.industry || '[Industry]',
        currentARR: row.current_arr || '[Current ARR]',
        userCount: row.user_count || '[User Count]'
      };
    } catch (error) {
      logger.error(`Failed to get user product details: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user's resource library (all resources with unlock status)
   */
  async getUserResourceLibrary(userId) {
    const client = await pool.connect();

    try {
      const result = await client.query(`
        SELECT * FROM user_resource_library
        WHERE user_id = $1
        ORDER BY display_order
      `, [userId]);

      return result.rows;
    } catch (error) {
      logger.error(`Failed to get user resource library: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get a specific generated resource
   */
  async getGeneratedResource(userId, resourceId) {
    const client = await pool.connect();

    try {
      const result = await client.query(`
        SELECT
          gr.*,
          r.name as resource_name,
          r.resource_code,
          r.tier,
          r.asset_number
        FROM generated_resources gr
        JOIN resources r ON gr.resource_id = r.id
        WHERE gr.user_id = $1
          AND gr.resource_id = $2
          AND gr.is_active = true
        ORDER BY gr.generation_version DESC
        LIMIT 1
      `, [userId, resourceId]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error(`Failed to get generated resource: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Batch generate multiple resources
   */
  async generateResourceBatch(userId, resourceIds, options = {}) {
    const results = [];
    const errors = [];

    for (const resourceId of resourceIds) {
      try {
        const result = await this.generateResource(userId, resourceId, options);
        results.push(result);
      } catch (error) {
        errors.push({
          resourceId,
          error: error.message
        });
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors,
      totalGenerated: results.length,
      totalFailed: errors.length
    };
  }

  /**
   * Calculate AI generation cost
   */
  calculateCost(usage) {
    // Claude Sonnet 4 pricing: $3/M input tokens, $15/M output tokens
    const inputCost = (usage.inputTokens / 1000000) * 3;
    const outputCost = (usage.outputTokens / 1000000) * 15;
    return inputCost + outputCost;
  }

  /**
   * Calculate total cost for an asset bundle
   */
  calculateTotalCost(strategicResources, implementationResources) {
    const strategic = strategicResources.reduce((sum, r) => sum + (r.metadata?.cost || 0), 0);
    const implementation = implementationResources.reduce((sum, r) => sum + (r.metadata?.cost || 0), 0);
    return strategic + implementation;
  }
}

export default new ResourceGenerationService();
