import express from 'express';
import healthController from '../controllers/healthController.js';
import customerController from '../controllers/customerController.js';
import costCalculatorController from '../controllers/costCalculatorController.js';
import businessCaseController from '../controllers/businessCaseController.js';
import exportController from '../controllers/exportController.js';
import authRoutes from './auth.js';
import webhookRoutes from './webhooks.js';
import progressRoutes from './progress.js';
import { validate, paramSchemas, costCalculationSchema, businessCaseSchema } from '../middleware/validation.js';
import { strictRateLimiter } from '../middleware/security.js';
import { authenticateMulti, requireCustomerContext, customerRateLimit } from '../middleware/auth.js';

const router = express.Router();

// Health check routes (public)
router.get('/health', healthController.checkHealth);
router.get('/health/detailed', healthController.checkHealthDetailed);

// Authentication routes (public)
router.use('/api/auth', authRoutes);

// Webhook routes (mixed auth)
router.use('/api/webhooks', webhookRoutes);

// Progress tracking routes (requires auth)
router.use('/api/progress', progressRoutes);

// Customer routes (requires authentication)
router.get('/api/customer/:customerId', 
  customerRateLimit(50, 15 * 60 * 1000), // 50 requests per 15 minutes
  authenticateMulti,
  requireCustomerContext,
  validate(paramSchemas.customerId, 'params'),
  customerController.getCustomer
);

router.get('/api/customer/:customerId/icp',
  customerRateLimit(30, 15 * 60 * 1000), // 30 requests per 15 minutes
  authenticateMulti,
  requireCustomerContext,
  validate(paramSchemas.customerId, 'params'),
  customerController.getCustomerICP
);

router.put('/api/customer/:customerId',
  customerRateLimit(20, 15 * 60 * 1000), // 20 requests per 15 minutes
  authenticateMulti,
  requireCustomerContext,
  validate(paramSchemas.customerId, 'params'),
  customerController.updateCustomer
);

// AI-powered ICP generation
router.post('/api/customer/:customerId/generate-icp',
  customerRateLimit(5, 60 * 60 * 1000), // 5 requests per hour (AI generation is expensive)
  authenticateMulti,
  requireCustomerContext,
  validate(paramSchemas.customerId, 'params'),
  customerController.generateAIICP
);

// Admin route - get all customers (requires authentication + admin permissions)
router.get('/api/customers',
  strictRateLimiter,
  authenticateMulti,
  // Note: This endpoint might need additional admin permission checks in the future
  customerController.getAllCustomers
);

// Cost calculator routes (requires authentication)
router.post('/api/cost-calculator/calculate',
  customerRateLimit(30, 15 * 60 * 1000), // 30 requests per 15 minutes
  authenticateMulti,
  validate(costCalculationSchema),
  costCalculatorController.calculateCost
);

router.post('/api/cost-calculator/calculate-ai',
  customerRateLimit(5, 60 * 60 * 1000), // 5 requests per hour (AI is expensive)
  authenticateMulti,
  validate(costCalculationSchema),
  costCalculatorController.calculateCostWithAI
);

router.post('/api/cost-calculator/save',
  customerRateLimit(20, 15 * 60 * 1000), // 20 requests per 15 minutes
  authenticateMulti,
  validate(costCalculationSchema),
  costCalculatorController.saveCostCalculation
);

router.get('/api/cost-calculator/history/:customerId',
  customerRateLimit(25, 15 * 60 * 1000), // 25 requests per 15 minutes
  authenticateMulti,
  requireCustomerContext,
  validate(paramSchemas.customerId, 'params'),
  costCalculatorController.getCostCalculationHistory
);

router.post('/api/cost-calculator/compare',
  customerRateLimit(15, 15 * 60 * 1000), // 15 requests per 15 minutes
  authenticateMulti,
  validate(costCalculationSchema),
  costCalculatorController.compareCostScenarios
);

// Business case routes (requires authentication)
router.post('/api/business-case/generate',
  customerRateLimit(10, 15 * 60 * 1000), // 10 requests per 15 minutes
  authenticateMulti,
  validate(businessCaseSchema),
  businessCaseController.generateBusinessCase
);

router.post('/api/business-case/customize',
  customerRateLimit(15, 15 * 60 * 1000), // 15 requests per 15 minutes
  authenticateMulti,
  businessCaseController.customizeBusinessCase
);

router.post('/api/business-case/save',
  customerRateLimit(20, 15 * 60 * 1000), // 20 requests per 15 minutes
  authenticateMulti,
  businessCaseController.saveBusinessCase
);

router.post('/api/business-case/export',
  customerRateLimit(5, 15 * 60 * 1000), // 5 requests per 15 minutes
  authenticateMulti,
  businessCaseController.exportBusinessCase
);

router.get('/api/business-case/templates',
  customerRateLimit(50, 15 * 60 * 1000), // 50 requests per 15 minutes (templates are less sensitive)
  authenticateMulti,
  businessCaseController.getTemplates
);

router.get('/api/business-case/:customerId/history',
  customerRateLimit(25, 15 * 60 * 1000), // 25 requests per 15 minutes
  authenticateMulti,
  requireCustomerContext,
  validate(paramSchemas.customerId, 'params'),
  businessCaseController.getBusinessCaseHistory
);

// Export routes (requires authentication)
router.post('/api/export/icp',
  customerRateLimit(10, 15 * 60 * 1000), // 10 requests per 15 minutes
  authenticateMulti,
  exportController.exportICP
);

router.post('/api/export/cost-calculator',
  customerRateLimit(10, 15 * 60 * 1000), // 10 requests per 15 minutes
  authenticateMulti,
  exportController.exportCostCalculator
);

router.post('/api/export/business-case',
  customerRateLimit(10, 15 * 60 * 1000), // 10 requests per 15 minutes
  authenticateMulti,
  exportController.exportBusinessCase
);

router.post('/api/export/comprehensive',
  customerRateLimit(5, 15 * 60 * 1000), // 5 requests per 15 minutes (more resource intensive)
  authenticateMulti,
  exportController.exportComprehensive
);

router.get('/api/export/status/:exportId',
  customerRateLimit(50, 15 * 60 * 1000), // 50 requests per 15 minutes
  authenticateMulti,
  exportController.getExportStatus
);

router.delete('/api/export/:exportId',
  customerRateLimit(20, 15 * 60 * 1000), // 20 requests per 15 minutes
  authenticateMulti,
  exportController.deleteExport
);

router.get('/api/export/history/:customerId',
  customerRateLimit(25, 15 * 60 * 1000), // 25 requests per 15 minutes
  authenticateMulti,
  requireCustomerContext,
  validate(paramSchemas.customerId, 'params'),
  exportController.getExportHistory
);

// API documentation route
router.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    data: {
      title: 'H&S Platform API Documentation',
      version: '1.0.0',
      description: 'Production API for H&S Revenue Intelligence Platform with AI Automation',
      endpoints: {
        health: {
          'GET /health': 'Basic health check',
          'GET /health/detailed': 'Detailed health check with dependencies'
        },
        customer: {
          'GET /api/customer/:customerId': 'Get customer data',
          'GET /api/customer/:customerId/icp': 'Get customer ICP data',
          'PUT /api/customer/:customerId': 'Update customer data',
          'POST /api/customer/:customerId/generate-icp': 'Generate AI-powered ICP analysis',
          'GET /api/customers': 'Get all customers (admin only)'
        },
        costCalculator: {
          'POST /api/cost-calculator/calculate': 'Calculate cost of inaction',
          'POST /api/cost-calculator/calculate-ai': 'AI-enhanced cost calculation with insights',
          'POST /api/cost-calculator/save': 'Save cost calculation',
          'GET /api/cost-calculator/history/:customerId': 'Get cost calculation history',
          'POST /api/cost-calculator/compare': 'Compare multiple cost scenarios'
        },
        businessCase: {
          'POST /api/business-case/generate': 'Generate business case',
          'POST /api/business-case/customize': 'Customize existing business case',
          'POST /api/business-case/save': 'Save business case',
          'POST /api/business-case/export': 'Export business case',
          'GET /api/business-case/templates': 'Get available templates',
          'GET /api/business-case/:customerId/history': 'Get business case history'
        },
        export: {
          'POST /api/export/icp': 'Export ICP data',
          'POST /api/export/cost-calculator': 'Export cost calculator results',
          'POST /api/export/business-case': 'Export business case',
          'POST /api/export/comprehensive': 'Export comprehensive report',
          'GET /api/export/status/:exportId': 'Get export status',
          'DELETE /api/export/:exportId': 'Delete export',
          'GET /api/export/history/:customerId': 'Get export history'
        },
        webhooks: {
          'POST /api/webhooks/incoming': 'Handle incoming webhook from Make.com',
          'POST /api/webhooks/trigger': 'Trigger automation workflow',
          'GET /api/webhooks/test/:webhookType': 'Test webhook connectivity',
          'GET /api/webhooks/status': 'Get automation status',
          'GET /api/webhooks/health': 'Webhook service health check'
        },
        auth: {
          'POST /api/auth/token': 'Generate JWT token',
          'POST /api/auth/refresh': 'Refresh JWT token',
          'GET /api/auth/verify': 'Verify JWT token',
          'POST /api/auth/customer-token': 'Generate customer access token',
          'POST /api/auth/api-key': 'Generate API key',
          'GET /api/auth/permissions': 'Get customer permissions',
          'GET /api/auth/status': 'Authentication service status'
        },
        progress: {
          'GET /api/progress/:customerId': 'Get customer progress dashboard',
          'POST /api/progress/:customerId/track': 'Track customer action/event',
          'GET /api/progress/:customerId/milestones': 'Get detailed milestones',
          'GET /api/progress/:customerId/insights': 'Get progress insights and recommendations',
          'POST /api/progress/:customerId/milestones/:milestoneId/complete': 'Complete milestone manually',
          'GET /api/progress': 'Get progress analytics for all customers (admin)'
        }
      },
      supportedFormats: ['json', 'csv', 'pdf', 'docx'],
      authentication: 'Bearer token (Phase 2)',
      rateLimit: '100 requests per 15 minutes'
    }
  });
});

// Catch-all route for undefined endpoints
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: '/api/docs',
    timestamp: new Date().toISOString()
  });
});

export default router;