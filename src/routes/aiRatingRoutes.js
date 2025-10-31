/**
 * AI Rating Routes
 * Routes for company ICP fit rating using AI
 * Includes authentication and rate limiting
 */

import express from 'express';
import { authenticateSupabaseJWT } from '../middleware/supabaseAuth.js';
import { customerRateLimit } from '../middleware/auth.js';
import {
  rateCompany,
  getCurrentUserRatings,
  rateBatch
} from '../controllers/aiRatingController.js';

const router = express.Router();

/**
 * POST /api/ai/rate-company
 * Rate a single company against user's ICP framework
 *
 * Rate limit: 10 requests per hour (AI operations are expensive)
 * Auth: Supabase JWT required
 *
 * Request body:
 * {
 *   companyUrl: string (required) - Company website URL
 *   icpFrameworkId: uuid (optional) - Specific ICP framework to use
 * }
 */
router.post(
  '/rate-company',
  customerRateLimit(10, 60 * 60 * 1000), // 10 requests per hour
  authenticateSupabaseJWT,
  rateCompany
);

/**
 * POST /api/ai/rate-batch
 * Rate multiple companies in a single batch (max 10)
 *
 * Rate limit: 3 requests per hour (batch operations are very expensive)
 * Auth: Supabase JWT required
 *
 * Request body:
 * {
 *   companies: array of { companyUrl: string } (required, max 10)
 *   icpFrameworkId: uuid (optional)
 * }
 */
router.post(
  '/rate-batch',
  customerRateLimit(3, 60 * 60 * 1000), // 3 requests per hour
  authenticateSupabaseJWT,
  rateBatch
);

/**
 * GET /api/ratings/current-user
 * Get all saved ratings for the authenticated user
 *
 * Rate limit: 30 requests per 15 minutes (database reads are cheap)
 * Auth: Supabase JWT required
 *
 * Query parameters:
 * - limit: number (optional, default: 50, max: 100)
 * - offset: number (optional, default: 0)
 * - minScore: number (optional, 0-100)
 * - maxScore: number (optional, 0-100)
 */
router.get(
  '/current-user',
  customerRateLimit(30, 15 * 60 * 1000), // 30 requests per 15 minutes
  authenticateSupabaseJWT,
  getCurrentUserRatings
);

export default router;
