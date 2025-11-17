/**
 * Prospect Discovery Routes
 * Handles authenticated prospect discovery using Claude AI + web search
 *
 * Key characteristics:
 * - REQUIRES authentication (authenticated ICP tool only)
 * - Uses Claude API with web search capability ($10 per 1,000 searches)
 * - Finds 5-7 real companies matching Andru's "Revenue Desert" ICP
 * - Returns prospects with evidence links and confidence scores
 * - Saves discovery results to database for user reference
 *
 * @module routes/prospectDiscoveryRoutes
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { discoverProspects } from '../controllers/prospectDiscoveryController.js';
import { authenticateMulti } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Prospect Discovery rate limiter
 * 5 requests per user per 24 hours
 *
 * Why this limit:
 * - Each discovery costs ~$0.20-0.30 (web search + Claude tokens)
 * - Prevents abuse of expensive web search feature
 * - 5 discoveries allows exploring different market segments
 * - Authenticated users only (tracked by user ID, not IP)
 */
const prospectDiscoveryRateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 5, // 5 requests per 24 hours per user
  keyGenerator: (req) => req.user?.id || req.ip, // Rate limit by user ID
  skip: (req) => {
    // Skip rate limiting in test/dev environments
    const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
    if (isDev) {
      logger.info(`[Prospect Discovery Rate Limit] Skipping for dev/test environment`);
    }
    return isDev;
  },
  message: {
    success: false,
    error: 'Rate limit exceeded. You can discover prospects 5 times per 24 hours. Please try again tomorrow.',
    retryAfter: '24 hours'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`[Prospect Discovery] Rate limit exceeded for user ${req.user?.id || 'unknown'}`);
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded. You can discover prospects 5 times per 24 hours. Please try again tomorrow.',
      retryAfter: '24 hours',
      limit: 5,
      window: '24 hours'
    });
  }
});

/**
 * POST /api/prospect-discovery/generate
 *
 * Generate prospect discovery results using Claude AI + web search
 *
 * Authentication: Required (JWT token)
 * Rate Limit: 5 requests per 24 hours per user
 *
 * Request Body:
 * {
 *   companyName: string (required) - User's company name
 *   refinedProductDescription: string (required) - Enhanced product description from ICP
 *   coreCapability: string (required) - Core capability/pure signal from ICP
 *   industry: string (optional) - Industry context
 *   targetMarket: string (optional) - Target market context
 * }
 *
 * Response (200 OK):
 * {
 *   success: true,
 *   data: {
 *     prospects: [
 *       {
 *         companyName: "TechFlow AI",
 *         website: "techflow.ai",
 *         headquarters: "San Francisco, CA",
 *         productCategory: "ML Infrastructure",
 *         estimatedStage: "$2-4M ARR, Series A",
 *         icpFitEvidence: ["signal 1", "signal 2", ...],
 *         confidenceRating: 9,
 *         ratingJustification: "...",
 *         evidenceLinks: { linkedinCompany: "...", ... }
 *       },
 *       ...
 *     ],
 *     searchSummary: {
 *       totalProspectsIdentified: 6,
 *       averageConfidenceRating: 8.2,
 *       strongestSignalPatterns: "...",
 *       searchChallengesEncountered: "...",
 *       queriesUsed: 8
 *     }
 *   },
 *   metadata: {
 *     generatedAt: "2025-11-17T...",
 *     model: "claude-3-5-haiku-20241022",
 *     source: "prospect_discovery",
 *     duration: 18500
 *   }
 * }
 *
 * Response (429 Too Many Requests):
 * {
 *   success: false,
 *   error: "Rate limit exceeded...",
 *   retryAfter: "24 hours"
 * }
 */
router.post(
  '/generate',
  authenticateMulti, // Require authentication (JWT or API key)
  prospectDiscoveryRateLimiter, // Apply rate limiting
  discoverProspects
);

export default router;
