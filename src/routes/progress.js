import express from 'express';
import progressController from '../controllers/progressController.js';
import { authenticateMulti, requireCustomerContext, customerRateLimit } from '../middleware/auth.js';
import { validate, paramSchemas } from '../middleware/validation.js';
import Joi from 'joi';

const router = express.Router();

// Progress validation schemas
const trackActionSchema = Joi.object({
  action: Joi.string().min(2).max(100).required(),
  metadata: Joi.object().optional()
});

const completeMilestoneSchema = Joi.object({
  metadata: Joi.object().optional()
});

// Get customer progress dashboard
router.get('/:customerId',
  customerRateLimit(100, 15 * 60 * 1000), // 100 requests per 15 minutes
  authenticateMulti,
  requireCustomerContext,
  validate(paramSchemas.customerId, 'params'),
  progressController.getProgress
);

// Track customer action/event
router.post('/:customerId/track',
  customerRateLimit(50, 15 * 60 * 1000), // 50 requests per 15 minutes
  authenticateMulti,
  requireCustomerContext,
  validate(paramSchemas.customerId, 'params'),
  validate(trackActionSchema),
  progressController.trackAction
);

// Get detailed milestones
router.get('/:customerId/milestones',
  customerRateLimit(100, 15 * 60 * 1000), // 100 requests per 15 minutes
  authenticateMulti,
  requireCustomerContext,
  validate(paramSchemas.customerId, 'params'),
  progressController.getMilestones
);

// Get progress insights and recommendations
router.get('/:customerId/insights',
  customerRateLimit(20, 15 * 60 * 1000), // 20 requests per 15 minutes
  authenticateMulti,
  requireCustomerContext,
  validate(paramSchemas.customerId, 'params'),
  progressController.getInsights
);

// Complete milestone manually
router.post('/:customerId/milestones/:milestoneId/complete',
  customerRateLimit(10, 15 * 60 * 1000), // 10 requests per 15 minutes
  authenticateMulti,
  requireCustomerContext,
  validate(paramSchemas.customerId, 'params'),
  validate(completeMilestoneSchema),
  progressController.completeMilestone
);

// Admin: Get progress analytics for all customers
router.get('/',
  customerRateLimit(10, 60 * 60 * 1000), // 10 requests per hour (admin only)
  authenticateMulti,
  // Note: Should add admin permission check in the future
  progressController.getProgressAnalytics
);

export default router;