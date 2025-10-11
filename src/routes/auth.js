import express from 'express';
import authController from '../controllers/authController.js';
import { authenticateMulti, optionalAuth, customerRateLimit } from '../middleware/auth.js';
import { validate, authSchemas } from '../middleware/validation.js';

const router = express.Router();

// Auth status endpoint (public)
router.get('/status', authController.authStatus);

// Generate JWT token
router.post('/token', 
  customerRateLimit(20, 15 * 60 * 1000), // 20 requests per 15 minutes
  validate(authSchemas.generateToken),
  authController.generateToken
);

// Refresh JWT token
router.post('/refresh',
  customerRateLimit(10, 15 * 60 * 1000), // 10 requests per 15 minutes
  validate(authSchemas.refreshToken),
  authController.refreshToken
);

// Verify JWT token
router.get('/verify',
  customerRateLimit(50, 15 * 60 * 1000), // 50 requests per 15 minutes
  authController.verifyToken
);

// REMOVED (2025-10-11): Customer Access Token endpoints deprecated
// Rationale: Redundant with JWT, added database overhead, simplified to 2-method auth
// - POST /customer-token (generate customer access token)
// - DELETE /customer-token/:customerId (revoke customer access token)

// Generate API key
router.post('/api-key',
  customerRateLimit(3, 60 * 60 * 1000), // 3 requests per hour
  validate(authSchemas.generateApiKey),
  authController.generateApiKey
);

// Get customer permissions (requires auth)
router.get('/permissions',
  authenticateMulti,
  authController.getPermissions
);

// Get permissions for specific customer (requires auth)
router.get('/permissions/:customerId',
  authenticateMulti,
  validate(authSchemas.customerId, 'params'),
  authController.getPermissions
);

// Validate current authentication (requires auth)
router.get('/validate',
  authenticateMulti,
  authController.validateAuth
);

// Test authentication endpoints (for development/testing)
if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
  // Test JWT authentication
  router.get('/test/jwt',
    customerRateLimit(100, 15 * 60 * 1000),
    authenticateMulti,
    (req, res) => {
      res.json({
        success: true,
        message: 'JWT authentication successful',
        auth: req.auth
      });
    }
  );

  // Test optional authentication
  router.get('/test/optional',
    optionalAuth,
    (req, res) => {
      res.json({
        success: true,
        message: 'Optional authentication test',
        authenticated: !!req.auth,
        auth: req.auth || null
      });
    }
  );
}

export default router;