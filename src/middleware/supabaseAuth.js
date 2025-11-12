import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Supabase JWT Authentication Middleware
 * Validates Supabase JWT tokens from Authorization header
 * This allows frontend Supabase users to access backend APIs
 */
export const authenticateSupabaseJWT = async (req, res, next) => {
  // DEVELOPMENT ENVIRONMENT: Validate Supabase JWT with relaxed error handling
  if (process.env.NODE_ENV === 'development') {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header',
        details: 'Expected format: Authorization: Bearer <token>'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      // Validate the Supabase JWT token (even in development)
      const supabase = createClient(
        config.supabase.url,
        config.supabase.serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );

      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        logger.warn(`Development JWT validation failed: ${error?.message || 'No user'}`);
        return res.status(401).json({
          success: false,
          error: 'Invalid Supabase JWT token',
          details: error?.message || 'No user found'
        });
      }

      // Use real user data from Supabase JWT
      req.user = {
        id: user.id,
        email: user.email,
        customerId: user.id,
        user_metadata: user.user_metadata
      };

      req.auth = {
        customerId: user.id,
        userId: user.id,
        email: user.email,
        method: 'supabase-jwt-dev'
      };

      logger.info(`Development Supabase JWT authenticated for user ${user.id} (${user.email})`);
      return next();

    } catch (err) {
      logger.error(`Development JWT authentication error: ${err.message}`);
      return res.status(500).json({
        success: false,
        error: 'Authentication service error',
        details: err.message
      });
    }
  }

  // TEST ENVIRONMENT BYPASS: Accept any Bearer token in test environment only
  if (process.env.NODE_ENV === 'test') {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header',
        details: 'Expected format: Authorization: Bearer <token>'
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.decode(token);

    let customerId = 'CUST_001';
    if (decoded && decoded.customerId) {
      customerId = decoded.customerId;
    } else if (decoded && decoded.sub) {
      customerId = decoded.sub;
    }

    // Create mock user for automated testing only
    req.user = {
      id: customerId,
      email: `test-${customerId}@example.com`,
      customerId: customerId,
      user_metadata: { customerId: customerId }
    };

    req.auth = {
      customerId: customerId,
      userId: customerId,
      email: `test-${customerId}@example.com`
    };

    return next();
  }

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header',
        details: 'Expected format: Authorization: Bearer <supabase-jwt-token>'
      });
    }

    // Validate Supabase configuration
    if (!config.supabase.url || !config.supabase.serviceRoleKey) {
      logger.error('Supabase configuration missing - cannot validate JWT');
      return res.status(500).json({
        success: false,
        error: 'Authentication service configuration error'
      });
    }

    // Create Supabase client with service role key for JWT validation
    const supabase = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Validate the Supabase JWT token
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      logger.warn(`Supabase JWT validation failed: ${error.message}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid Supabase JWT token',
        details: error.message
      });
    }

    if (!user) {
      logger.warn('Supabase JWT validation returned no user');
      return res.status(401).json({
        success: false,
        error: 'Invalid Supabase JWT token',
        details: 'No user found in token'
      });
    }

    // Map Supabase user to backend auth format
    req.auth = {
      userId: user.id,
      email: user.email,
      customerId: user.id, // Use Supabase user ID as customer ID
      method: 'supabase-jwt',
      supabaseUser: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        updated_at: user.updated_at,
        app_metadata: user.app_metadata,
        user_metadata: user.user_metadata
      }
    };

    logger.info(`Supabase JWT authenticated for user ${user.id} (${user.email})`);
    next();
    
  } catch (error) {
    logger.error(`Supabase JWT authentication error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Authentication service error',
      details: 'Internal server error during JWT validation'
    });
  }
};

/**
 * Optional Supabase JWT Authentication Middleware
 * Adds auth info if present but doesn't require it
 */
export const optionalSupabaseAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      // No auth header, continue without authentication
      next();
      return;
    }

    // Try to authenticate but don't fail if invalid
    const supabase = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (!error && user) {
      req.auth = {
        userId: user.id,
        email: user.email,
        customerId: user.id,
        method: 'supabase-jwt',
        supabaseUser: user
      };
      logger.info(`Optional Supabase auth successful for user ${user.id}`);
    } else {
      logger.warn(`Optional Supabase auth failed: ${error?.message || 'No user'}`);
    }

    next();
  } catch (error) {
    // Log error but continue without auth
    logger.warn(`Optional Supabase auth error: ${error.message}`);
    next();
  }
};

export default {
  authenticateSupabaseJWT,
  optionalSupabaseAuth
};
