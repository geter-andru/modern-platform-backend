/**
 * Demo Routes
 * Handles unauthenticated demo ICP generation for marketing/lead gen
 *
 * Key characteristics:
 * - No authentication required
 * - Strict IP-based rate limiting (3 per 24 hours)
 * - Generates 3 personas (vs 3-5 for paid users)
 * - Returns demo flag for watermarking exports
 * - Does NOT save to database
 *
 * @module routes/demoRoutes
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { generateDemoICP } from '../controllers/demoController.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Demo ICP generation rate limiter
 * 3 requests per IP per 24 hours
 *
 * Why this limit:
 * - Prevents abuse (each generation costs ~$0.02-0.03)
 * - Encourages signup after 3 demos
 * - 24-hour window allows revisiting same IP next day
 *
 * Bypass in test environment to prevent test interference
 */
const demoRateLimiter = process.env.NODE_ENV === 'test'
  ? (req, res, next) => next() // Bypass in tests
  : rateLimit({
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
      max: 3, // 3 requests per 24 hours per IP
      // Skip rate limiting for localhost (development/testing)
      skip: (req) => {
        const ip = req.ip || req.connection.remoteAddress;
        const isLocalhost = ip === '::1' ||
                          ip === '127.0.0.1' ||
                          ip === '::ffff:127.0.0.1';
        if (isLocalhost) {
          logger.info(`[Demo Rate Limit] Skipping for localhost: ${ip}`);
        }
        return isLocalhost;
      },
      message: {
        success: false,
        error: 'Demo limit reached. You\'ve generated 3 demo ICPs in the last 24 hours.',
        details: 'Upgrade to founding member to generate unlimited ICPs with full platform access.',
        retryAfter: 86400, // 24 hours in seconds
        callToAction: {
          text: 'Get Full Access - $497/month',
          url: '/pricing'
        }
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        const clientIP = req.ip || req.connection.remoteAddress;
        logger.warn(`[Demo Rate Limit] Exceeded for IP: ${clientIP}`);

        res.status(429).json({
          success: false,
          error: 'Demo limit reached. You\'ve generated 3 demo ICPs in the last 24 hours.',
          details: 'Upgrade to founding member to generate unlimited ICPs with full platform access.',
          retryAfter: 86400,
          callToAction: {
            text: 'Get Full Access - $497/month',
            url: '/pricing'
          }
        });
      },
      // Track by IP address
      keyGenerator: (req) => {
        return req.ip || req.connection.remoteAddress || 'unknown';
      },
      // Skip successful requests (don't count toward limit if generation failed)
      skipSuccessfulRequests: false,
      // Skip failed requests (rate limit only counts toward limit, not errors)
      skipFailedRequests: true
    });

/**
 * POST /api/demo/generate-icp
 * Generate demo ICP analysis (no auth required)
 *
 * Rate limit: 3 requests per IP per 24 hours
 * Auth: None (public endpoint)
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
 *   personas: [...], // 5 personas with narrative format
 *   product: { productName, productDescription, targetBuyer },
 *   metadata: { generationTimeMs, model, personaCount, ... }
 * }
 *
 * Error responses:
 * - 400: Invalid input (missing fields, invalid formats)
 * - 429: Rate limit exceeded (3 per 24h)
 * - 500: AI generation failed
 */
router.post(
  '/generate-icp',
  demoRateLimiter,
  generateDemoICP
);

/**
 * GET /api/demo/limits
 * Check demo generation limits for current IP
 *
 * Returns remaining demo generations available
 */
router.get('/limits', (req, res) => {
  // This would require accessing rate limiter state
  // For now, return static limit info
  res.json({
    success: true,
    limits: {
      maxPerDay: 3,
      windowHours: 24,
      message: 'You can generate up to 3 demo ICPs per 24 hours. Sign up for unlimited generations.'
    }
  });
});

export default router;
