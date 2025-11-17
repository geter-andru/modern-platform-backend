import express from 'express';
import webhookController from '../controllers/webhookController.js';
import { authenticateMulti, optionalSupabaseAuth, customerRateLimit } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { notifyNewAssessment, notifyAssessmentStarted, notifyNewWaitlistSignup, sendTestNotification } from '../services/notificationService.js';
import logger from '../utils/logger.js';
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
  optionalSupabaseAuth,
  webhookController.getAutomationStatus
);

// ==============================================================================
// ADMIN NOTIFICATION WEBHOOKS (From Supabase Database Triggers)
// ==============================================================================

/**
 * Middleware to verify webhook secret for Supabase triggers
 */
function verifyWebhookSecret(req, res, next) {
  const authHeader = req.headers.authorization;
  const expectedSecret = `Bearer ${process.env.WEBHOOK_SECRET}`;

  if (!authHeader) {
    logger.warn('⚠️  Notification webhook called without authorization header', {
      ip: req.ip,
      path: req.path
    });
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  if (authHeader !== expectedSecret) {
    logger.warn('⚠️  Notification webhook called with invalid secret', {
      ip: req.ip,
      path: req.path
    });
    return res.status(401).json({ error: 'Invalid webhook secret' });
  }

  next();
}

/**
 * POST /api/webhooks/notifications/assessment
 *
 * Triggered by Supabase when a new assessment is completed
 * Sends email notification to admin
 */
router.post('/notifications/assessment',
  customerRateLimit(100, 15 * 60 * 1000), // 100 requests per 15 minutes
  verifyWebhookSecret,
  async (req, res) => {
    try {
      logger.info('📥 New assessment notification webhook received', {
        assessmentId: req.body.id,
        userEmail: req.body.user_email
      });

      // Validate required fields
      if (!req.body.id || !req.body.user_email) {
        logger.warn('⚠️  Invalid assessment webhook payload', { body: req.body });
        return res.status(400).json({ error: 'Missing required fields (id, user_email)' });
      }

      // Send notification
      const result = await notifyNewAssessment(req.body);

      res.json({
        success: true,
        message: 'Webhook processed',
        notificationSent: result.success,
        emailId: result.emailId
      });

    } catch (error) {
      logger.error('❌ Assessment webhook processing error', {
        error: error.message,
        stack: error.stack,
        body: req.body
      });

      res.status(500).json({
        error: 'Webhook processing failed',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/webhooks/notifications/assessment-completed
 *
 * Triggered by Supabase when an assessment is completed
 * Sends email notification to admin
 *
 * Note: This is the preferred endpoint name. /notifications/assessment is kept for backward compatibility.
 */
router.post('/notifications/assessment-completed',
  customerRateLimit(100, 15 * 60 * 1000), // 100 requests per 15 minutes
  verifyWebhookSecret,
  async (req, res) => {
    try {
      logger.info('📥 Assessment completed notification webhook received', {
        assessmentId: req.body.id,
        userEmail: req.body.user_email
      });

      // Validate required fields
      if (!req.body.id || !req.body.user_email) {
        logger.warn('⚠️  Invalid assessment completed webhook payload', { body: req.body });
        return res.status(400).json({ error: 'Missing required fields (id, user_email)' });
      }

      // Send notification
      const result = await notifyNewAssessment(req.body);

      res.json({
        success: true,
        message: 'Webhook processed',
        notificationSent: result.success,
        emailId: result.emailId
      });

    } catch (error) {
      logger.error('❌ Assessment completed webhook processing error', {
        error: error.message,
        stack: error.stack,
        body: req.body
      });

      res.status(500).json({
        error: 'Webhook processing failed',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/webhooks/notifications/assessment-started
 *
 * Triggered by Supabase when a user starts taking an assessment
 * Sends email notification to admin
 */
router.post('/notifications/assessment-started',
  customerRateLimit(100, 15 * 60 * 1000), // 100 requests per 15 minutes
  verifyWebhookSecret,
  async (req, res) => {
    try {
      logger.info('📥 Assessment started notification webhook received', {
        sessionId: req.body.session_id,
        userEmail: req.body.user_email
      });

      // Validate required fields (user_email is optional at start, collected later)
      if (!req.body.id || !req.body.session_id) {
        logger.warn('⚠️  Invalid assessment started webhook payload', { body: req.body });
        return res.status(400).json({
          error: 'Missing required fields (id, session_id)'
        });
      }

      // Send notification
      const result = await notifyAssessmentStarted(req.body);

      res.json({
        success: true,
        message: 'Webhook processed',
        notificationSent: result.success,
        emailId: result.emailId
      });

    } catch (error) {
      logger.error('❌ Assessment started webhook processing error', {
        error: error.message,
        stack: error.stack,
        body: req.body
      });

      res.status(500).json({
        error: 'Webhook processing failed',
        message: error.message
      });
    }
  }
);

/**
 * POST /api/webhooks/notifications/waitlist
 *
 * Triggered by Supabase when a new user signs up for beta waitlist
 * Sends email notification to admin
 */
router.post('/notifications/waitlist',
  customerRateLimit(100, 15 * 60 * 1000), // 100 requests per 15 minutes
  verifyWebhookSecret,
  async (req, res) => {
    try {
      logger.info('📥 New waitlist signup notification webhook received', {
        signupId: req.body.id,
        name: req.body.full_name,
        email: req.body.email
      });

      // Validate required fields
      if (!req.body.id || !req.body.full_name || !req.body.email) {
        logger.warn('⚠️  Invalid waitlist webhook payload', { body: req.body });
        return res.status(400).json({
          error: 'Missing required fields (id, full_name, email)'
        });
      }

      // Send notification
      const result = await notifyNewWaitlistSignup(req.body);

      res.json({
        success: true,
        message: 'Webhook processed',
        notificationSent: result.success,
        emailId: result.emailId
      });

    } catch (error) {
      logger.error('❌ Waitlist webhook processing error', {
        error: error.message,
        stack: error.stack,
        body: req.body
      });

      res.status(500).json({
        error: 'Webhook processing failed',
        message: error.message
      });
    }
  }
);

/**
 * GET /api/webhooks/notifications/test
 *
 * Test endpoint to verify notification service is working
 * Sends a test email to admin
 */
router.get('/notifications/test',
  customerRateLimit(10, 15 * 60 * 1000), // 10 requests per 15 minutes
  async (req, res) => {
    try {
      logger.info('🧪 Test notification endpoint called');

      const result = await sendTestNotification();

      res.json({
        success: result.success,
        message: result.success
          ? 'Test notification sent successfully! Check geter@humusnshore.org'
          : 'Test notification failed',
        emailId: result.emailId,
        error: result.error
      });

    } catch (error) {
      logger.error('❌ Test notification error', { error: error.message });

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
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
          status: 'GET /webhooks/status',
          notifications_assessment: 'POST /webhooks/notifications/assessment (deprecated - use assessment-completed)',
          notifications_assessment_completed: 'POST /webhooks/notifications/assessment-completed',
          notifications_assessment_started: 'POST /webhooks/notifications/assessment-started',
          notifications_waitlist: 'POST /webhooks/notifications/waitlist'
        },
        timestamp: new Date().toISOString()
      }
    });
  }
);

export default router;