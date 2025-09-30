import express from 'express';
import webhookController from '../controllers/webhookController.js';
import { authenticateMulti, optionalAuth, customerRateLimit } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import Joi from 'joi';

const router = express.Router();

// Webhook validation schemas
const incomingWebhookSchema = Joi.object({
  webhookType: Joi.string().valid(
    'icp_analysis_complete',
    'cost_calculation_complete', 
    'business_case_complete',
    'progress_milestone'
  ).required(),
  customerId: Joi.string().pattern(/^CUST_\d+$/).required(),
  data: Joi.object().optional(),
  processedContent: Joi.object().required(),
  metadata: Joi.object().optional()
});

const triggerAutomationSchema = Joi.object({
  customerId: Joi.string().pattern(/^CUST_\d+$/).required(),
  automationType: Joi.string().valid(
    'icp_analysis',
    'cost_calculation', 
    'business_case',
    'progress_update'
  ).required(),
  data: Joi.object().optional()
});

// Incoming webhook endpoint (from Make.com) - No auth required
router.post('/incoming',
  customerRateLimit(50, 15 * 60 * 1000), // 50 requests per 15 minutes
  validate(incomingWebhookSchema),
  webhookController.handleIncomingWebhook
);

// Trigger automation endpoint - Requires auth
router.post('/trigger',
  customerRateLimit(20, 15 * 60 * 1000), // 20 requests per 15 minutes
  authenticateMulti,
  validate(triggerAutomationSchema),
  webhookController.triggerAutomation
);

// Test webhook connectivity - Requires auth
router.get('/test/:webhookType?',
  customerRateLimit(10, 15 * 60 * 1000), // 10 requests per 15 minutes
  authenticateMulti,
  webhookController.testWebhooks
);

// Get automation status - Optional auth
router.get('/status',
  customerRateLimit(100, 15 * 60 * 1000), // 100 requests per 15 minutes
  optionalAuth,
  webhookController.getAutomationStatus
);

// Health check for webhooks
router.get('/health',
  customerRateLimit(200, 15 * 60 * 1000), // 200 requests per 15 minutes
  (req, res) => {
    res.json({
      success: true,
      data: {
        service: 'webhook_service',
        status: 'operational',
        endpoints: {
          incoming: 'POST /webhooks/incoming',
          trigger: 'POST /webhooks/trigger', 
          test: 'GET /webhooks/test/:webhookType',
          status: 'GET /webhooks/status'
        },
        timestamp: new Date().toISOString()
      }
    });
  }
);

export default router;