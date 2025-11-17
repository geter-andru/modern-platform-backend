/**
 * Prospect Discovery Controller
 * Handles prospect discovery requests using Claude AI + web search
 *
 * Key characteristics:
 * - REQUIRES authentication (req.user from verifyToken middleware)
 * - Uses Claude API with web search ($10 per 1,000 searches)
 * - Finds 5-7 real companies matching Andru's "Revenue Desert" ICP
 * - Saves discovery results to database for user reference
 * - Rate limited: 5 requests per 24 hours per user
 *
 * @module controllers/prospectDiscoveryController
 */

import prospectDiscoveryService from '../services/prospectDiscoveryService.js';
import logger from '../utils/logger.js';

/**
 * Discover prospects matching user's ICP
 * POST /api/prospect-discovery/generate
 *
 * Request body:
 * {
 *   companyName: string (required) - User's company name
 *   refinedProductDescription: string (required) - Enhanced product description from ICP
 *   coreCapability: string (required) - Core capability/pure signal from ICP
 *   industry: string (optional) - Industry context
 *   targetMarket: string (optional) - Target market context
 * }
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     prospects: [...], // 5-7 companies with evidence + confidence scores
 *     searchSummary: {...} // Search metadata
 *   },
 *   metadata: {
 *     generatedAt: "2025-11-17T...",
 *     model: "claude-3-5-haiku-20241022",
 *     duration: 18500
 *   }
 * }
 *
 * Authentication: Required (JWT token via verifyToken middleware)
 * Rate limit: 5 requests per 24 hours per user
 */
export const discoverProspects = async (req, res, next) => {
  const startTime = Date.now();

  try {
    // ===== AUTHENTICATION CHECK =====
    if (!req.user || !req.user.id) {
      logger.warn('[Prospect Discovery] Unauthenticated request attempted');
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please sign in to discover prospects.'
      });
    }

    const userId = req.user.id;
    const userEmail = req.user.email || 'unknown';

    // ===== INPUT VALIDATION =====
    const {
      companyName,
      refinedProductDescription,
      coreCapability,
      industry,
      targetMarket
    } = req.body;

    logger.info('[Prospect Discovery] Generation request', {
      userId,
      userEmail,
      companyName,
      hasDescription: !!refinedProductDescription,
      hasCoreCapability: !!coreCapability,
      industry: industry || 'not specified',
      targetMarket: targetMarket || 'not specified'
    });

    // Validate required fields
    if (!companyName || !refinedProductDescription || !coreCapability) {
      logger.warn('[Prospect Discovery] Missing required fields', {
        userId,
        hasCompanyName: !!companyName,
        hasDescription: !!refinedProductDescription,
        hasCoreCapability: !!coreCapability
      });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: {
          companyName: !companyName ? 'Required' : 'OK',
          refinedProductDescription: !refinedProductDescription ? 'Required (from generated ICP)' : 'OK',
          coreCapability: !coreCapability ? 'Required (from generated ICP)' : 'OK'
        }
      });
    }

    // Validate field lengths
    if (companyName.length < 2 || companyName.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'companyName must be 2-100 characters'
      });
    }

    if (refinedProductDescription.length < 20 || refinedProductDescription.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'refinedProductDescription must be 20-500 characters'
      });
    }

    if (coreCapability.length < 10 || coreCapability.length > 150) {
      return res.status(400).json({
        success: false,
        error: 'coreCapability must be 10-150 characters'
      });
    }

    // ===== PROSPECT DISCOVERY =====
    const userICPData = {
      companyName,
      refinedProductDescription,
      coreCapability,
      industry,
      targetMarket
    };

    logger.info(`[Prospect Discovery] Starting discovery for ${companyName} (user: ${userId})`);

    const result = await prospectDiscoveryService.discoverProspects(userICPData, userId);

    if (!result.success) {
      logger.error(`[Prospect Discovery] Service failed for user ${userId}:`, result.error);

      // Return fallback data with 500 error
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to discover prospects',
        fallback: result.fallback || null,
        message: 'Prospect discovery service is temporarily unavailable. Please try again in a few minutes.'
      });
    }

    // ===== SUCCESS RESPONSE =====
    const duration = Date.now() - startTime;
    const prospectsCount = result.data?.prospects?.length || 0;

    logger.info(`[Prospect Discovery] Success for ${companyName}`, {
      userId,
      prospectsCount,
      averageConfidence: result.data?.searchSummary?.averageConfidenceRating || 'N/A',
      duration: `${duration}ms`
    });

    res.status(200).json({
      success: true,
      data: result.data,
      metadata: {
        ...result.metadata,
        requestDuration: duration,
        userId
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`[Prospect Discovery] Controller error: ${error.message}`, {
      userId: req.user?.id,
      duration: `${duration}ms`,
      stack: error.stack
    });

    // Return 500 Internal Server Error
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred during prospect discovery',
      message: 'Please try again in a few minutes. If the problem persists, contact support.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
