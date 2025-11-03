/**
 * Product Extraction Routes
 *
 * Routes for automatic product extraction from company websites.
 * Integrates with queue system for async job processing.
 */

import express from 'express';
import productExtractionController from '../controllers/productExtractionController.js';
import { authenticateMulti, customerRateLimit } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const triggerExtractionSchema = Joi.object({
  customerId: Joi.string().required(),
  email: Joi.string().email().required()
});

/**
 * Trigger product extraction for a user
 * POST /api/product-extraction/trigger
 *
 * Request body:
 * {
 *   "customerId": "customer-id",
 *   "email": "user@company.com"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Product extraction job queued successfully",
 *   "data": {
 *     "jobId": "product-extraction-customer-id-123456789",
 *     "queueName": "product-extraction",
 *     "status": "queued",
 *     "customerId": "customer-id",
 *     "email": "user@company.com",
 *     "domain": "company.com",
 *     "freeEmail": false,
 *     "jobQueued": true
 *   }
 * }
 */
router.post('/trigger',
  customerRateLimit(5, 60 * 60 * 1000), // 5 requests per hour (AI extraction is expensive)
  authenticateMulti,
  validate(triggerExtractionSchema),
  productExtractionController.triggerExtraction
);

/**
 * Get product extraction job status
 * GET /api/product-extraction/status/:jobId
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "jobId": "product-extraction-customer-id-123456789",
 *     "queueName": "product-extraction",
 *     "status": "completed",
 *     "progress": 100,
 *     "data": { ... },
 *     "result": { ... }
 *   }
 * }
 */
router.get('/status/:jobId',
  customerRateLimit(50, 15 * 60 * 1000), // 50 requests per 15 minutes
  authenticateMulti,
  productExtractionController.getExtractionStatus
);

/**
 * Get product details for a customer
 * GET /api/product-extraction/:customerId
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "customerId": "customer-id",
 *     "productDetails": {
 *       "productName": "Greptile",
 *       "description": "AI-powered code search and navigation",
 *       "distinguishingFeature": "Natural language code search",
 *       "businessModel": "B2B SaaS",
 *       "sourceUrl": "https://greptile.com",
 *       "extractedAt": "2025-11-01T21:30:00.000Z",
 *       "fallback": false
 *     },
 *     "extracted": true
 *   }
 * }
 */
router.get('/:customerId',
  customerRateLimit(30, 15 * 60 * 1000), // 30 requests per 15 minutes
  authenticateMulti,
  productExtractionController.getProductDetails
);

export default router;
