import authService from '../services/authService.js';
import { authenticateSupabaseJWT } from './supabaseAuth.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';

/**
 * API Key Authentication Middleware
 * Validates API keys for external integrations
 */
export const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key required',
        details: 'Provide API key in X-API-Key header or apiKey query parameter'
      });
    }

    const validation = authService.validateApiKey(apiKey);

    if (!validation.valid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key',
        details: validation.reason
      });
    }

    // Add customer info to request
    req.auth = {
      customerId: validation.customerId,
      method: 'api-key',
      generatedAt: validation.generatedAt
    };

    logger.info(`API key authenticated for customer ${validation.customerId}`);
    next();
  } catch (error) {
    logger.error(`API key authentication error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Authentication service error'
    });
  }
};

/**
 * Multi-method Authentication Middleware
 * Accepts Supabase JWT (primary) or API key
 */
export const authenticateMulti = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];

  // Try Supabase JWT first (primary authentication method)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticateSupabaseJWT(req, res, next);
  }

  // Try API key for external integrations
  if (apiKey) {
    return authenticateApiKey(req, res, next);
  }

  // No valid authentication method found
  return res.status(401).json({
    success: false,
    error: 'Authentication required',
    details: 'Provide Supabase JWT token or API key',
    acceptedMethods: [
      'Authorization: Bearer <supabase-jwt-token>',
      'X-API-Key: <api-key>'
    ]
  });
};

/**
 * Permission Check Middleware Factory
 * Creates middleware that checks for specific permissions
 */
export const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.auth || !req.auth.customerId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required for permission check'
        });
      }

      const hasPermission = await authService.hasPermission(req.auth.customerId, permission);

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          required: permission
        });
      }

      next();
    } catch (error) {
      logger.error(`Permission check error: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: 'Permission service error'
      });
    }
  };
};

/**
 * Customer Context Middleware
 * Ensures the authenticated customer matches the requested customer
 */
export const requireCustomerContext = (req, res, next) => {
  const requestedCustomerId = req.params.customerId || req.body.customerId;
  const authenticatedCustomerId = req.auth?.customerId;

  if (!requestedCustomerId) {
    return res.status(400).json({
      success: false,
      error: 'Customer ID required in request'
    });
  }

  if (!authenticatedCustomerId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (requestedCustomerId !== authenticatedCustomerId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      details: 'Can only access your own customer data'
    });
  }

  next();
};

/**
 * Optional Supabase Authentication Middleware
 * Attempts to authenticate using Supabase JWT but continues even if authentication fails.
 * This is the modern replacement for legacy optionalAuth.
 *
 * If a valid Supabase JWT is present, adds auth info to req.auth.
 * If no auth or invalid auth, continues without setting req.auth.
 */
export const optionalSupabaseAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Only attempt Supabase JWT authentication if Bearer token is present
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Create a mock response object to capture auth state
      let authAttempted = false;
      let authSucceeded = false;

      // Wrap the next function to capture authentication success
      const mockNext = () => {
        authSucceeded = true;
      };

      // Try Supabase authentication (non-blocking)
      try {
        await authenticateSupabaseJWT(req, res, mockNext);

        // If we get here and mockNext was called, auth succeeded
        if (authSucceeded) {
          logger.debug('Optional Supabase auth succeeded');
        }
      } catch (error) {
        // Authentication failed, but that's okay for optional auth
        logger.debug(`Optional Supabase auth failed: ${error.message}`);
      }
    }

    // Always continue, regardless of authentication result
    next();
  } catch (error) {
    // Log error but always continue
    logger.warn(`Optional Supabase auth error: ${error.message}`);
    next();
  }
};

/**
 * DEPRECATED: Legacy Optional Authentication Middleware
 * @deprecated Use optionalSupabaseAuth instead
 *
 * ⚠️ SCHEDULED FOR REMOVAL - Only used in 2 test endpoints
 * ⚠️ DO NOT USE in new code
 * ⚠️ Migrate existing usage to optionalSupabaseAuth
 *
 * Uses legacy platform JWT system.
 * Will be removed once test endpoints are migrated to Supabase auth.
 */
export const optionalAuth = async (req, res, next) => {
  logger.warn('DEPRECATED: optionalAuth called - use optionalSupabaseAuth instead. This function will be removed.');

  // Check feature flag
  if (!config.security.enableLegacyJWT) {
    logger.debug('Legacy JWT disabled via feature flag - skipping optionalAuth');
    return next();
  }

  try {
    // Try to authenticate but don't fail if not present
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'];

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const verification = authService.verifyToken(token);

      if (verification.valid) {
        req.auth = {
          customerId: verification.customerId,
          tokenType: verification.tokenType,
          decoded: verification.decoded
        };
      }
    } else if (apiKey) {
      const validation = authService.validateApiKey(apiKey);

      if (validation.valid) {
        req.auth = {
          customerId: validation.customerId,
          method: 'api-key'
        };
      }
    }

    next();
  } catch (error) {
    // Log error but continue without auth
    logger.warn(`Optional auth failed: ${error.message}`);
    next();
  }
};

/**
 * Rate Limiting by Customer ID
 * Enhanced rate limiting that tracks by customer
 * Bypassed in test environment to prevent test interference
 */
export const customerRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  // Bypass rate limiting in test environment
  if (process.env.NODE_ENV === 'test') {
    return (req, res, next) => next();
  }

  const requestCounts = new Map();

  return (req, res, next) => {
    const customerId = req.auth?.customerId || req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old entries
    for (const [key, data] of requestCounts) {
      if (data.resetTime < now) {
        requestCounts.delete(key);
      }
    }
    
    // Get or create customer record
    let customerData = requestCounts.get(customerId);
    if (!customerData || customerData.resetTime < now) {
      customerData = {
        count: 0,
        resetTime: now + windowMs
      };
      requestCounts.set(customerId, customerData);
    }
    
    // Check limit
    if (customerData.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        details: `Maximum ${maxRequests} requests per ${windowMs / 1000} seconds`,
        resetTime: new Date(customerData.resetTime).toISOString()
      });
    }
    
    // Increment count
    customerData.count++;
    
    // Add headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', maxRequests - customerData.count);
    res.setHeader('X-RateLimit-Reset', new Date(customerData.resetTime).toISOString());
    
    next();
  };
};

export default {
  // authenticateJWT - REMOVED (dead code, never used in production)
  authenticateApiKey,
  authenticateMulti,
  requirePermission,
  requireCustomerContext,
  optionalAuth,            // DEPRECATED - only used in 2 test endpoints, will be removed
  optionalSupabaseAuth,    // NEW - modern Supabase-based optional auth
  customerRateLimit
};