/**
 * Demo Controller
 * Generates demo ICP analyses for unauthenticated users
 *
 * Key differences from authenticated ICP generation:
 * - No authentication required (rate limited by IP)
 * - Generates 5 personas with narrative format
 * - Uses Claude Haiku for speed/cost efficiency
 * - Returns demo flag for watermarking exports
 * - Does NOT save to database (demo only)
 *
 * @module controllers/demoController
 */

import demoICPService from '../services/demoICPService.js';
import logger from '../utils/logger.js';

/**
 * Generate demo ICP analysis
 * POST /api/demo/generate-icp
 *
 * Request body:
 * {
 *   productName: string (required, 2-100 chars) - Product name
 *   productDescription: string (required, 10-500 chars) - What the product does
 *   targetBuyer: string (optional) - Optional target buyer hint
 * }
 *
 * Response:
 * {
 *   success: true,
 *   demo: true,
 *   personas: array - 5 generated personas with narrative format
 *   product: object - Product info submitted
 *   metadata: object - Generation metadata
 * }
 *
 * Rate limit: 3 requests per IP per 24 hours
 */
export const generateDemoICP = async (req, res, next) => {
  const startTime = Date.now();

  try {
    // ===== INPUT VALIDATION =====
    const { productName, productDescription, targetBuyer } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;

    logger.info('[Demo ICP] Generation request', {
      clientIP,
      productName,
      hasDescription: !!productDescription,
      hasTargetBuyer: !!targetBuyer
    });

    // Validate required fields
    if (!productName || !productDescription) {
      logger.warn('[Demo ICP] Missing required fields', {
        hasProductName: !!productName,
        hasDescription: !!productDescription
      });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: {
          productName: !productName ? 'Required (2-100 characters)' : 'OK',
          productDescription: !productDescription ? 'Required (10-500 characters)' : 'OK'
        }
      });
    }

    // Validate field lengths
    if (productName.length < 2 || productName.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'productName must be 2-100 characters'
      });
    }

    if (productDescription.length < 10 || productDescription.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'productDescription must be 10-500 characters'
      });
    }

    // ===== CALL DEMO ICP SERVICE =====
    logger.info('[Demo ICP] Calling demoICPService');

    const result = await demoICPService.generateDemoICP(
      productName,
      productDescription,
      targetBuyer || null
    );

    // Check if generation was successful
    if (!result.success) {
      logger.warn('[Demo ICP] Service returned fallback data', {
        error: result.error
      });

      // Return fallback data with success flag (still useful for demo)
      return res.status(200).json({
        success: true,
        demo: true,
        personas: result.fallback.personas,
        product: {
          productName,
          productDescription,
          targetBuyer: targetBuyer || null
        },
        generatedAt: new Date().toISOString(),
        metadata: {
          generationTimeMs: Date.now() - startTime,
          model: 'fallback',
          personaCount: result.fallback.personas.length,
          usingFallback: true
        }
      });
    }

    // ===== BUILD SUCCESSFUL RESPONSE =====
    const totalDuration = Date.now() - startTime;

    const response = {
      success: true,
      demo: true, // Flag for watermarking exports
      personas: result.data.personas,
      product: {
        productName,
        productDescription,
        targetBuyer: targetBuyer || null
      },
      generatedAt: new Date().toISOString(),
      metadata: {
        ...result.metadata,
        generationTimeMs: totalDuration,
        personaCount: result.data.personas.length
      }
    };

    logger.info('[Demo ICP] Generation successful', {
      clientIP,
      personaCount: response.personas.length,
      totalDuration
    });

    return res.status(200).json(response);

  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('[Demo ICP] Generation failed', {
      error: error.message,
      stack: error.stack,
      durationMs: duration
    });

    // Generic error response
    return res.status(500).json({
      success: false,
      error: 'Failed to generate demo ICP',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default {
  generateDemoICP
};
