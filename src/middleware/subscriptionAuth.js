import logger from '../utils/logger.js';
import { createClient } from '@supabase/supabase-js';
import config from '../config/index.js';

/**
 * Subscription & Trial Access Control Middleware
 *
 * Enforces access restrictions based on user subscription status:
 * - Free trial users: Limited to ICP tool, assessment, and dashboard
 * - Paid users: Full platform access
 */

// Allowed routes during free trial
const TRIAL_ALLOWED_ROUTES = [
  '/api/customer/:customerId/icp',      // ICP tool
  '/api/customer/:customerId/assessment', // Assessment
  '/api/customer/:customerId',           // Dashboard (customer data)
  '/api/health',                          // Health check
  '/api/payment',                         // Payment endpoints (to upgrade)
];

// Allowed route patterns (regex) for trial users
const TRIAL_ALLOWED_PATTERNS = [
  /^\/api\/customer\/[^\/]+$/, //GET customer data (dashboard)
  /^\/api\/customer\/[^\/]+\/icp/, // ICP tool endpoints
  /^\/api\/customer\/[^\/]+\/assessment/, // Assessment endpoints
  /^\/api\/payment\//, // Payment endpoints
  /^\/api\/health$/, // Health check
  /^\/api\/test\//, // Test endpoints (development only)
];

/**
 * Get User Subscription Status from Supabase
 * @param {string} userId - User ID (from req.auth or req.user)
 * @returns {Promise<Object>} Subscription status
 */
async function getUserSubscriptionStatus(userId) {
  try {
    const supabase = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey
    );

    // Query subscriptions table
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      logger.error(`Error fetching subscription: ${error.message}`);
      return { status: 'unknown', isTrial: false, hasAccess: false };
    }

    // No subscription found = free trial or no access
    if (!subscription) {
      return {
        status: 'trial',
        isTrial: true,
        hasAccess: true, // Grant trial access by default
        trialEndsAt: null,
        stripeSubscriptionId: null
      };
    }

    // Check subscription status
    const now = new Date();
    const trialEnd = subscription.trial_end ? new Date(subscription.trial_end) : null;
    const isTrial = subscription.status === 'trialing' ||
                    (trialEnd && now < trialEnd);

    return {
      status: subscription.status,
      isTrial,
      hasAccess: subscription.status === 'active' ||
                 subscription.status === 'trialing',
      trialEndsAt: trialEnd,
      stripeSubscriptionId: subscription.stripe_subscription_id,
      cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at) : null
    };
  } catch (error) {
    logger.error(`getUserSubscriptionStatus error: ${error.message}`);
    return { status: 'unknown', isTrial: false, hasAccess: false };
  }
}

/**
 * Check if route is allowed during trial
 * @param {string} path - Request path
 * @param {string} method - HTTP method
 * @returns {boolean} - True if route is allowed during trial
 */
function isTrialAllowedRoute(path, method) {
  // Always allow GET requests to customer data (dashboard)
  if (method === 'GET' && path.match(/^\/api\/customer\/[^\/]+$/)) {
    return true;
  }

  // Check against allowed patterns
  for (const pattern of TRIAL_ALLOWED_PATTERNS) {
    if (pattern.test(path)) {
      return true;
    }
  }

  return false;
}

/**
 * Subscription Authorization Middleware
 *
 * Checks user subscription status and enforces access restrictions.
 * Trial users can only access ICP tool, assessment, and dashboard.
 */
export const requireSubscription = async (req, res, next) => {
  try {
    // Skip in development/test environments if flag is set
    if (process.env.NODE_ENV !== 'production' && process.env.SKIP_SUBSCRIPTION_CHECK === 'true') {
      logger.debug('Subscription check skipped (development mode)');
      return next();
    }

    // Require authentication first
    if (!req.auth && !req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        details: 'Please log in to access this resource'
      });
    }

    const userId = req.auth?.userId || req.auth?.customerId || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User ID not found',
        details: 'Authentication token missing user information'
      });
    }

    // Get subscription status
    const subscription = await getUserSubscriptionStatus(userId);

    // Attach subscription info to request
    req.subscription = subscription;

    // Check if user has access
    if (!subscription.hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Subscription required',
        details: 'Please subscribe to access this feature',
        subscriptionStatus: subscription.status,
        upgradeUrl: '/pricing'
      });
    }

    // If user is on trial, check route restrictions
    if (subscription.isTrial) {
      const isAllowed = isTrialAllowedRoute(req.path, req.method);

      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          error: 'Trial access limited',
          details: 'This feature is not available during your free trial',
          trialEndsAt: subscription.trialEndsAt,
          allowedFeatures: [
            'ICP Tool',
            'Assessment',
            'Dashboard'
          ],
          upgradeUrl: '/pricing',
          subscriptionStatus: 'trial'
        });
      }

      logger.info(`Trial user ${userId} accessing allowed route: ${req.path}`);
    }

    // User has full access or is accessing allowed trial route
    next();
  } catch (error) {
    logger.error(`Subscription authorization error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Subscription service error',
      details: 'Unable to verify subscription status'
    });
  }
};

/**
 * Optional Subscription Check
 *
 * Adds subscription info to request but doesn't block access.
 * Useful for routes that want to show different content based on subscription.
 */
export const optionalSubscriptionCheck = async (req, res, next) => {
  try {
    const userId = req.auth?.userId || req.auth?.customerId || req.user?.id;

    if (!userId) {
      // No user authenticated, continue without subscription info
      return next();
    }

    // Get subscription status
    const subscription = await getUserSubscriptionStatus(userId);
    req.subscription = subscription;

    next();
  } catch (error) {
    logger.warn(`Optional subscription check error: ${error.message}`);
    // Continue without subscription info
    next();
  }
};

/**
 * Require Paid Subscription (not trial)
 *
 * Blocks access for trial users, only allows paid subscribers.
 */
export const requirePaidSubscription = async (req, res, next) => {
  try {
    // First run the standard subscription check
    await new Promise((resolve, reject) => {
      requireSubscription(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Now check if user is on paid plan
    if (req.subscription?.isTrial) {
      return res.status(403).json({
        success: false,
        error: 'Paid subscription required',
        details: 'This feature is only available to paid subscribers',
        trialEndsAt: req.subscription.trialEndsAt,
        upgradeUrl: '/pricing',
        subscriptionStatus: 'trial'
      });
    }

    next();
  } catch (error) {
    logger.error(`Paid subscription check error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Subscription service error'
    });
  }
};

export default {
  requireSubscription,
  optionalSubscriptionCheck,
  requirePaidSubscription,
  getUserSubscriptionStatus
};
