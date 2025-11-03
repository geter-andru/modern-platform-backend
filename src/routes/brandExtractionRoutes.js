/**
 * Brand Extraction Routes
 *
 * API routes for extracting brand assets from company websites.
 *
 * @module routes/brandExtractionRoutes
 */

import express from 'express';
import { extractBrandAssets, getBrandAssets } from '../controllers/brandExtractionController.js';
import { authenticateMulti, customerRateLimit } from '../middleware/auth.js';

const router = express.Router();

/**
 * Extract brand assets from a website
 * POST /api/brand-extraction
 *
 * Rate limit: 10 per hour (browser automation is expensive)
 */
router.post(
  '/',
  customerRateLimit(10, 60 * 60 * 1000), // 10 per hour
  authenticateMulti,
  extractBrandAssets
);

/**
 * Get stored brand assets for a customer
 * GET /api/brand-extraction/:customerId
 *
 * Rate limit: 60 per minute (read-only)
 */
router.get(
  '/:customerId',
  customerRateLimit(60, 60 * 1000), // 60 per minute
  authenticateMulti,
  getBrandAssets
);

export default router;
