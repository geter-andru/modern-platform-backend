/**
 * Resource Library API Routes
 *
 * Handles generation, retrieval, and management of personalized revenue intelligence resources
 */

import express from 'express';
import resourceGenerationService from '../services/resourceGenerationService.js';
import { authenticateSupabaseJWT } from '../middleware/supabaseAuth.js';
import { customerRateLimit } from '../middleware/auth.js';
import logger from '../utils/logger.js';
import {
  STRATEGIC_ASSETS,
  getAssetsByTier,
  getAssetById,
  calculateTierGenerationTime
} from '../config/resource-assets-mapping.js';

const router = express.Router();

/**
 * POST /api/resources/generate
 * Generate a complete resource (strategic framework + implementation guides)
 *
 * Request body:
 * {
 *   resourceId: string (UUID from resources table) OR assetId: string (for backward compatibility)
 *   streaming: boolean (optional, default: false)
 * }
 */
router.post('/generate',
  customerRateLimit(30, 60 * 1000), // 30 requests per minute
  authenticateSupabaseJWT,
  async (req, res) => {
    const { resourceId: providedResourceId, assetId, streaming = false } = req.body;
    const userId = req.user.id;

    try {
      // Support both resourceId (UUID) and assetId (for backward compatibility)
      const resourceId = providedResourceId || assetId;

      if (!resourceId) {
        return res.status(400).json({
          success: false,
          error: 'resourceId or assetId is required'
        });
      }

      logger.info(`🎯 Resource generation request: ${resourceId} for user ${userId}`);

      // Check if streaming is requested
      if (streaming) {
        // Set up Server-Sent Events
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

        // Progress callback for streaming
        const onProgress = (progressData) => {
          res.write(`data: ${JSON.stringify(progressData)}\n\n`);
        };

        try {
          // Generate with streaming
          const result = await resourceGenerationService.generateResource(
            userId,
            resourceId,
            { streaming: true, onProgress }
          );

          // Send final result
          res.write(`data: ${JSON.stringify({ ...result, final: true })}\n\n`);
          res.end();

        } catch (error) {
          // Send error via SSE
          res.write(`data: ${JSON.stringify({
            stage: 'error',
            error: error.message
          })}\n\n`);
          res.end();
        }

      } else {
        // Standard generation (no streaming)
        const result = await resourceGenerationService.generateResource(userId, resourceId);
        res.json(result);
      }

    } catch (error) {
      logger.error(`❌ Resource generation failed: ${error.message}`);

      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
});

/**
 * POST /api/resources/generate-batch
 * Generate multiple assets in sequence (for tier unlock)
 *
 * Request body:
 * {
 *   assetIds: string[] (e.g., ['asset-1-icp-analysis', 'asset-2-buyer-personas'])
 *   tier: string (optional, for logging)
 * }
 */
router.post('/generate-batch',
  customerRateLimit(10, 60 * 1000), // 10 batch requests per minute
  authenticateSupabaseJWT,
  async (req, res) => {
    const { assetIds, tier } = req.body;
    const userId = req.user.id;

    try {
      logger.info(`Batch generation request: ${assetIds.length} assets for user ${userId}`);

      if (!Array.isArray(assetIds) || assetIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'assetIds must be a non-empty array'
        });
      }

      // Set up streaming response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const results = [];
      let completed = 0;

      // Generate each asset sequentially (preserve dependency order)
      for (const assetId of assetIds) {
        res.write(`data: ${JSON.stringify({
          stage: 'starting',
          assetId,
          progress: (completed / assetIds.length) * 100
        })}\n\n`);

        const result = await resourceGenerationService.generateAsset(
          userId,
          assetId,
          {
            onProgress: (progressData) => {
              res.write(`data: ${JSON.stringify({
                ...progressData,
                assetId,
                batchProgress: (completed / assetIds.length) * 100
              })}\n\n`);
            }
          }
        );

        results.push(result);
        completed++;

        res.write(`data: ${JSON.stringify({
          stage: 'completed',
          assetId,
          progress: (completed / assetIds.length) * 100,
          result
        })}\n\n`);
      }

      // Send final summary
      res.write(`data: ${JSON.stringify({
        final: true,
        success: true,
        results,
        metadata: {
          totalAssets: assetIds.length,
          successCount: results.filter(r => r.success).length,
          failedCount: results.filter(r => !r.success).length,
          tier
        }
      })}\n\n`);

      res.end();

    } catch (error) {
      logger.error('Batch generation failed', error);
      res.write(`data: ${JSON.stringify({
        final: true,
        success: false,
        error: error.message
      })}\n\n`);
      res.end();
    }
});

/**
 * GET /api/resources/library
 * Get user's complete resource library (all resources with unlock status)
 */
router.get('/library',
  customerRateLimit(60, 60 * 1000), // 60 requests per minute
  authenticateSupabaseJWT,
  async (req, res) => {
    const userId = req.user.id;
    const { tier } = req.query;

    try {
      logger.info(`📚 Fetching resource library for user ${userId}`);

      const library = await resourceGenerationService.getUserResourceLibrary(userId);

      // Filter by tier if specified
      const filteredLibrary = tier
        ? library.filter(r => r.tier === tier)
        : library;

      res.json({
        success: true,
        data: filteredLibrary,
        metadata: {
          totalResources: filteredLibrary.length,
          unlocked: filteredLibrary.filter(r => r.is_unlocked).length,
          generated: filteredLibrary.filter(r => r.is_generated).length,
          exported: filteredLibrary.filter(r => r.is_exported).length,
          tier
        }
      });

    } catch (error) {
      logger.error(`Failed to fetch resource library: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
});

/**
 * GET /api/resources/:resourceId
 * Get a specific generated resource
 */
router.get('/:resourceId',
  customerRateLimit(60, 60 * 1000),
  authenticateSupabaseJWT,
  async (req, res) => {
    const { resourceId } = req.params;
    const userId = req.user.id;

    try {
      logger.info(`📦 Fetching resource ${resourceId} for user ${userId}`);

      const resource = await resourceGenerationService.getGeneratedResource(userId, resourceId);

      if (!resource) {
        return res.status(404).json({
          success: false,
          error: 'Resource not found or not generated yet'
        });
      }

      res.json({
        success: true,
        data: resource
      });

    } catch (error) {
      logger.error(`Failed to fetch resource: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
});

/**
 * GET /api/resources/catalog
 * Get the complete catalog of 38 strategic assets from database
 */
router.get('/catalog',
  customerRateLimit(100, 60 * 1000),
  async (req, res) => {
    const { tier } = req.query;

    try {
      const { pool } = await import('../config/database.js');
      const client = await pool.connect();

      try {
        // Query resources table
        let query = `
          SELECT
            id,
            resource_code,
            asset_number,
            name as title,
            description,
            tier,
            generation_time_minutes as estimated_generation_time,
            consulting_equivalent_usd as consulting_equivalent,
            implementation_guides,
            unlock_milestone_code,
            unlock_threshold_percentage,
            display_order
          FROM resources
          WHERE is_active = true
        `;

        const params = [];
        if (tier) {
          query += ` AND tier = $1`;
          params.push(tier);
        }

        query += ` ORDER BY display_order`;

        const result = await client.query(query, params);

        // Map to frontend format
        const catalog = result.rows.map(resource => ({
          id: resource.id, // UUID for generation
          resourceCode: resource.resource_code,
          assetNumber: resource.asset_number,
          title: resource.title,
          description: resource.description,
          category: 'revenue-intelligence', // TODO: Add category to resources table
          tier: resource.tier,
          unlockThreshold: {
            milestone: resource.unlock_milestone_code,
            progress: resource.unlock_threshold_percentage
          },
          estimatedGenerationTime: `${resource.estimated_generation_time} min`,
          consultingEquivalent: `$${(resource.consulting_equivalent / 1000).toFixed(0)}k`,
          implementationGuidesCount: Array.isArray(resource.implementation_guides)
            ? resource.implementation_guides.length
            : 0
        }));

        res.json({
          success: true,
          data: {
            catalog,
            metadata: {
              totalAssets: catalog.length,
              tierBreakdown: {
                foundation: catalog.filter(a => a.tier === 'foundation').length,
                growth: catalog.filter(a => a.tier === 'growth').length,
                enterprise: catalog.filter(a => a.tier === 'enterprise').length
              }
            }
          }
        });

      } finally {
        client.release();
      }

    } catch (error) {
      logger.error('Failed to fetch catalog', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
});

/**
 * GET /api/resources/tier-info/:tier
 * Get information about a specific tier
 */
router.get('/tier-info/:tier',
  customerRateLimit(100, 60 * 1000),
  async (req, res) => {
    const { tier } = req.params;

    try {
      const assets = getAssetsByTier(tier);
      const generationTime = calculateTierGenerationTime(tier);

      res.json({
        success: true,
        data: {
          tier,
          assetCount: assets.length,
          generationTime,
          assets: assets.map(a => ({
            id: a.id,
            assetNumber: a.assetNumber,
            title: a.title,
            description: a.description
          }))
        }
      });

    } catch (error) {
      logger.error(`Failed to fetch tier info: ${tier}`, error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
});

/**
 * POST /api/resources/regenerate
 * Regenerate an existing asset (user wants to update with new context)
 */
router.post('/regenerate',
  customerRateLimit(20, 60 * 1000),
  authenticateSupabaseJWT,
  async (req, res) => {
    const { assetId, feedback } = req.body;
    const userId = req.user.id;

    try {
      logger.info(`Regeneration request: ${assetId} for user ${userId}`);

      // TODO: Add feedback to context for regeneration
      const result = await resourceGenerationService.generateAsset(
        userId,
        assetId,
        { feedback }
      );

      res.json(result);

    } catch (error) {
      logger.error(`Regeneration failed: ${assetId}`, error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
});

/**
 * GET /api/resources/status
 * Get generation status and statistics
 */
router.get('/status',
  customerRateLimit(100, 60 * 1000),
  authenticateSupabaseJWT,
  async (req, res) => {
    const userId = req.user.id;

    try {
      // TODO: Fetch from database
      res.json({
        success: true,
        data: {
          userId,
          generatedCount: 0,
          unlockedCount: 0,
          totalAvailable: 38,
          currentTier: 'foundation',
          completionPercentage: 0
        }
      });

    } catch (error) {
      logger.error('Failed to fetch status', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
});

export default router;
