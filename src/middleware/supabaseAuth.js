import { createClient } from '@supabase/supabase-js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Supabase JWT Authentication Middleware
 * Validates Supabase JWT tokens from Authorization header
 * This allows frontend Supabase users to access backend APIs
 */
export const authenticateSupabaseJWT = async (req, res, next) => {
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
