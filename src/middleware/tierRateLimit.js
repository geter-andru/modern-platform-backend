/**
 * Tier-Based Rate Limiting Middleware
 *
 * Applies different rate limits based on user subscription tier:
 * - Anonymous (no auth): 3 AI calls per 24 hours per IP
 * - Free (signed up, no payment): 5 AI calls per 24 hours per user
 * - Trial (active trial period): 15 AI calls per 24 hours per user
 * - Paid (active subscription): Unlimited (subject to abuse limits only)
 *
 * Each AI call costs ~$0.15-0.20, so this protects against cost runaway
 * while still allowing users to experience the product.
 *
 * @module middleware/tierRateLimit
 */

import logger from '../utils/logger.js';
import { createClient } from '@supabase/supabase-js';
import config from '../config/index.js';

// In-memory store for rate limiting (use Redis in production for multi-instance)
const rateLimitStore = new Map();

// Tier configuration
const TIER_LIMITS = {
  anonymous: {
    maxCalls: 3,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    windowDescription: '24 hours',
    upgradeMessage: 'Create a free account to get 5 AI generations per day.',
    upgradeUrl: '/auth',
    upgradeButtonText: 'Sign Up Free'
  },
  free: {
    maxCalls: 5,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    windowDescription: '24 hours',
    upgradeMessage: 'Upgrade to get unlimited AI generations and full platform access.',
    upgradeUrl: '/pricing',
    upgradeButtonText: 'View Pricing - $497/month'
  },
  trial: {
    maxCalls: 15,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    windowDescription: '24 hours',
    upgradeMessage: 'Your trial includes 15 AI generations per day. Upgrade for unlimited access.',
    upgradeUrl: '/pricing',
    upgradeButtonText: 'Upgrade Now'
  },
  paid: {
    maxCalls: 100, // Soft limit to prevent abuse, not a hard cap
    windowMs: 60 * 60 * 1000, // 1 hour (abuse protection only)
    windowDescription: 'hour',
    upgradeMessage: null, // Paid users don't see upgrade prompts
    upgradeUrl: null,
    upgradeButtonText: null
  }
};

/**
 * Get user's subscription tier from Supabase
 * @param {string|null} userId - User ID (null for anonymous)
 * @returns {Promise<string>} - Tier: 'anonymous', 'free', 'trial', or 'paid'
 */
async function getUserTier(userId) {
  if (!userId) {
    return 'anonymous';
  }

  try {
    const supabase = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey
    );

    // Query subscriptions table
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('status, trial_end, stripe_subscription_id')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error(`Error fetching subscription for tier: ${error.message}`);
      return 'free'; // Default to free on error
    }

    // No subscription found = free user (signed up but no payment)
    if (!subscription) {
      return 'free';
    }

    // Check subscription status
    const now = new Date();
    const trialEnd = subscription.trial_end ? new Date(subscription.trial_end) : null;

    // Active paid subscription
    if (subscription.status === 'active' && subscription.stripe_subscription_id) {
      return 'paid';
    }

    // Active trial
    if (subscription.status === 'trialing' || (trialEnd && now < trialEnd)) {
      return 'trial';
    }

    // Subscription exists but not active (canceled, past_due, etc.)
    return 'free';
  } catch (error) {
    logger.error(`getUserTier error: ${error.message}`);
    return 'free';
  }
}

/**
 * Generate rate limit key based on user/IP
 * @param {string|null} userId - User ID
 * @param {string} ip - IP address
 * @param {string} endpoint - Endpoint being rate limited
 * @returns {string} - Unique key for rate limiting
 */
function getRateLimitKey(userId, ip, endpoint) {
  const identifier = userId || `ip:${ip}`;
  return `tier_limit:${endpoint}:${identifier}`;
}

/**
 * Clean expired entries from the store
 */
function cleanExpiredEntries() {
  const now = Date.now();
  for (const [key, data] of rateLimitStore) {
    if (data.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Track AI call usage and update database for analytics
 * @param {string|null} userId - User ID
 * @param {string} tier - User tier
 * @param {string} endpoint - Endpoint called
 */
async function trackAIUsage(userId, tier, endpoint) {
  if (!userId) return; // Don't track anonymous usage in DB

  try {
    const supabase = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey
    );

    // Upsert daily usage record
    const today = new Date().toISOString().split('T')[0];

    await supabase.rpc('increment_ai_usage', {
      p_user_id: userId,
      p_date: today,
      p_endpoint: endpoint,
      p_tier: tier
    });
  } catch (error) {
    // Non-blocking - just log the error
    logger.warn(`Failed to track AI usage: ${error.message}`);
  }
}

/**
 * Tier-Based Rate Limiting Middleware Factory
 *
 * @param {string} endpointName - Name of the endpoint for logging/tracking
 * @param {Object} options - Override default tier limits
 * @returns {Function} Express middleware
 *
 * @example
 * // Use with default limits
 * router.post('/generate-icp', tierRateLimit('icp_generation'), controller.generateICP);
 *
 * // Use with custom limits
 * router.post('/generate-icp', tierRateLimit('icp_generation', {
 *   free: { maxCalls: 3 },
 *   paid: { maxCalls: 50 }
 * }), controller.generateICP);
 */
export const tierRateLimit = (endpointName, options = {}) => {
  // Merge custom limits with defaults
  const limits = { ...TIER_LIMITS };
  for (const tier in options) {
    if (limits[tier]) {
      limits[tier] = { ...limits[tier], ...options[tier] };
    }
  }

  return async (req, res, next) => {
    // Bypass in test environment
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    // Bypass for localhost in development
    if (process.env.NODE_ENV !== 'production') {
      const ip = req.ip || req.connection?.remoteAddress;
      if (ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1') {
        logger.debug(`[Tier Rate Limit] Bypassing for localhost`);
        return next();
      }
    }

    try {
      // Get user ID from auth (if authenticated)
      const userId = req.auth?.userId || req.auth?.customerId || req.user?.id || null;
      const ip = req.ip || req.connection?.remoteAddress || 'unknown';

      // Get user's tier
      const tier = await getUserTier(userId);
      const tierConfig = limits[tier];

      // Generate rate limit key
      const key = getRateLimitKey(userId, ip, endpointName);
      const now = Date.now();

      // Clean expired entries periodically
      if (Math.random() < 0.1) { // 10% chance to clean on each request
        cleanExpiredEntries();
      }

      // Get or create usage record
      let usage = rateLimitStore.get(key);
      if (!usage || usage.resetTime < now) {
        usage = {
          count: 0,
          resetTime: now + tierConfig.windowMs,
          tier: tier
        };
        rateLimitStore.set(key, usage);
      }

      // Add tier info to request for downstream use
      req.tierInfo = {
        tier,
        limit: tierConfig.maxCalls,
        remaining: Math.max(0, tierConfig.maxCalls - usage.count),
        resetTime: usage.resetTime,
        windowDescription: tierConfig.windowDescription
      };

      // Check if limit exceeded
      if (usage.count >= tierConfig.maxCalls) {
        const resetIn = Math.ceil((usage.resetTime - now) / 1000 / 60); // minutes

        logger.warn(`[Tier Rate Limit] ${tier} user hit limit on ${endpointName}`, {
          userId: userId || 'anonymous',
          ip,
          tier,
          count: usage.count,
          limit: tierConfig.maxCalls
        });

        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          details: `You've used all ${tierConfig.maxCalls} AI generations for this ${tierConfig.windowDescription}.`,
          tier: tier,
          limit: tierConfig.maxCalls,
          used: usage.count,
          resetIn: `${resetIn} minutes`,
          resetTime: new Date(usage.resetTime).toISOString(),
          // Upgrade prompt (for non-paid users)
          upgrade: tierConfig.upgradeMessage ? {
            message: tierConfig.upgradeMessage,
            url: tierConfig.upgradeUrl,
            buttonText: tierConfig.upgradeButtonText
          } : null
        });
      }

      // Increment usage
      usage.count++;
      rateLimitStore.set(key, usage);

      // Track usage in database (async, non-blocking)
      trackAIUsage(userId, tier, endpointName);

      // Add rate limit headers
      res.setHeader('X-RateLimit-Tier', tier);
      res.setHeader('X-RateLimit-Limit', tierConfig.maxCalls);
      res.setHeader('X-RateLimit-Remaining', tierConfig.maxCalls - usage.count);
      res.setHeader('X-RateLimit-Reset', new Date(usage.resetTime).toISOString());

      logger.info(`[Tier Rate Limit] ${tier} user: ${usage.count}/${tierConfig.maxCalls} on ${endpointName}`, {
        userId: userId || 'anonymous',
        tier,
        count: usage.count,
        limit: tierConfig.maxCalls
      });

      next();
    } catch (error) {
      logger.error(`Tier rate limit error: ${error.message}`);
      // On error, allow the request (fail open)
      next();
    }
  };
};

/**
 * Get current usage for a user (for displaying in UI)
 * @param {string|null} userId - User ID
 * @param {string} ip - IP address
 * @param {string} endpoint - Endpoint name
 * @returns {Object} Current usage info
 */
export const getUsageInfo = async (userId, ip, endpoint) => {
  const tier = await getUserTier(userId);
  const tierConfig = TIER_LIMITS[tier];
  const key = getRateLimitKey(userId, ip, endpoint);
  const usage = rateLimitStore.get(key);
  const now = Date.now();

  if (!usage || usage.resetTime < now) {
    return {
      tier,
      limit: tierConfig.maxCalls,
      used: 0,
      remaining: tierConfig.maxCalls,
      resetTime: null,
      windowDescription: tierConfig.windowDescription
    };
  }

  return {
    tier,
    limit: tierConfig.maxCalls,
    used: usage.count,
    remaining: Math.max(0, tierConfig.maxCalls - usage.count),
    resetTime: new Date(usage.resetTime).toISOString(),
    windowDescription: tierConfig.windowDescription
  };
};

export default {
  tierRateLimit,
  getUsageInfo,
  TIER_LIMITS
};
