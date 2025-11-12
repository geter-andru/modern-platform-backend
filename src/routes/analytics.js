import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateSupabaseJWT } from '../middleware/supabaseAuth.js';
import logger from '../utils/logger.js';
import supabase from '../services/supabaseService.js';

const router = express.Router();

/**
 * Rate limiter for anonymous tracking
 * More permissive to allow for legitimate page views
 * 100 page views per 15 minutes per IP
 */
const analyticsRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    error: 'Too many tracking requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for authenticated users
    return !!req.headers.authorization;
  }
});

/**
 * POST /api/analytics/public-page-view
 * Track anonymous visitor page views on public pages
 *
 * Authentication: None required (uses Supabase anon role)
 * Rate Limit: 100 requests per 15 minutes per IP
 *
 * Body:
 * - anonymous_session_id: string (required) - localStorage session ID
 * - page_path: string (required) - URL path visited
 * - page_title: string - Page title
 * - referrer_url: string - Referrer URL
 * - time_on_page: number - Seconds spent on page
 * - scroll_depth: number - Percentage scrolled (0-100)
 * - deviceType: string - 'desktop' | 'mobile' | 'tablet' | 'unknown'
 * - browser: string - Browser name
 * - userAgent: string - Full user agent string
 * - screenWidth: number - Screen width in pixels
 * - screenHeight: number - Screen height in pixels
 * - utm_source: string - UTM source parameter
 * - utm_medium: string - UTM medium parameter
 * - utm_campaign: string - UTM campaign parameter
 * - utm_term: string - UTM term parameter
 * - utm_content: string - UTM content parameter
 * - metadata: object - Additional metadata
 *
 * Response:
 * - success: true
 * - data: { id, created_at }
 */
router.post('/public-page-view', analyticsRateLimiter, async (req, res) => {
  try {
    const {
      anonymous_session_id,
      page_path,
      page_title,
      referrer_url,
      time_on_page,
      scroll_depth,
      deviceType,
      browser,
      userAgent,
      screenWidth,
      screenHeight,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      metadata
    } = req.body;

    // Validate required fields
    if (!anonymous_session_id) {
      logger.warn('⚠️ Public page view tracking: Missing anonymous_session_id');
      return res.status(400).json({
        success: false,
        error: 'anonymous_session_id is required'
      });
    }

    if (!page_path) {
      logger.warn('⚠️ Public page view tracking: Missing page_path');
      return res.status(400).json({
        success: false,
        error: 'page_path is required'
      });
    }

    logger.info('🚀 Tracking public page view', {
      session: anonymous_session_id,
      page: page_path,
      hasUTM: !!(utm_source || utm_medium || utm_campaign),
      device: deviceType
    });

    // Insert page visit using Supabase service role (bypasses RLS)
    const { data, error } = await supabase
      .from('public_page_visits')
      .insert({
        anonymous_session_id,
        page_path,
        page_title: page_title || null,
        referrer_url: referrer_url || null,
        time_on_page: time_on_page || 0,
        scroll_depth: scroll_depth || 0,
        device_type: deviceType || 'unknown',
        browser: browser || null,
        user_agent: userAgent || null,
        screen_width: screenWidth || null,
        screen_height: screenHeight || null,
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
        utm_term: utm_term || null,
        utm_content: utm_content || null,
        metadata: metadata || {},
        clicked_cta: false
      })
      .select('id, created_at')
      .single();

    if (error) {
      logger.error('❌ Error tracking public page view', {
        error: error.message,
        code: error.code,
        details: error.details,
        session: anonymous_session_id,
        page: page_path
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to track page view'
      });
    }

    logger.info('✅ Public page view tracked successfully', {
      id: data.id,
      session: anonymous_session_id,
      page: page_path
    });

    return res.json({
      success: true,
      data: {
        id: data.id,
        created_at: data.created_at
      }
    });

  } catch (error) {
    logger.error('❌ Unexpected error tracking public page view', {
      error: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to track page view'
    });
  }
});

/**
 * POST /api/analytics/public-cta-click
 * Track CTA clicks on public pages
 *
 * Authentication: None required (uses Supabase anon role)
 * Rate Limit: 100 requests per 15 minutes per IP
 *
 * Body:
 * - anonymous_session_id: string (required) - localStorage session ID
 * - page_path: string (required) - URL path where CTA was clicked
 * - cta_text: string (required) - Text of the CTA button
 * - cta_location: string (required) - Location of CTA on page (e.g., 'hero', 'pricing', 'footer')
 * - clicked_cta: boolean - Always true for this endpoint
 *
 * Response:
 * - success: true
 * - data: { id, created_at }
 */
router.post('/public-cta-click', analyticsRateLimiter, async (req, res) => {
  try {
    const {
      anonymous_session_id,
      page_path,
      cta_text,
      cta_location,
      clicked_cta = true
    } = req.body;

    // Validate required fields
    if (!anonymous_session_id) {
      logger.warn('⚠️ CTA click tracking: Missing anonymous_session_id');
      return res.status(400).json({
        success: false,
        error: 'anonymous_session_id is required'
      });
    }

    if (!page_path) {
      logger.warn('⚠️ CTA click tracking: Missing page_path');
      return res.status(400).json({
        success: false,
        error: 'page_path is required'
      });
    }

    if (!cta_text) {
      logger.warn('⚠️ CTA click tracking: Missing cta_text');
      return res.status(400).json({
        success: false,
        error: 'cta_text is required'
      });
    }

    if (!cta_location) {
      logger.warn('⚠️ CTA click tracking: Missing cta_location');
      return res.status(400).json({
        success: false,
        error: 'cta_location is required'
      });
    }

    logger.info('🎯 Tracking CTA click', {
      session: anonymous_session_id,
      page: page_path,
      cta: cta_text,
      location: cta_location
    });

    // Insert CTA click event
    const { data, error } = await supabase
      .from('public_page_visits')
      .insert({
        anonymous_session_id,
        page_path,
        cta_text,
        cta_location,
        clicked_cta: true,
        time_on_page: 0,
        scroll_depth: 0
      })
      .select('id, created_at')
      .single();

    if (error) {
      logger.error('❌ Error tracking CTA click', {
        error: error.message,
        code: error.code,
        details: error.details,
        session: anonymous_session_id,
        cta: cta_text
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to track CTA click'
      });
    }

    logger.info('✅ CTA click tracked successfully', {
      id: data.id,
      session: anonymous_session_id,
      cta: cta_text
    });

    return res.json({
      success: true,
      data: {
        id: data.id,
        created_at: data.created_at
      }
    });

  } catch (error) {
    logger.error('❌ Unexpected error tracking CTA click', {
      error: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to track CTA click'
    });
  }
});

/**
 * POST /api/analytics/link-anonymous-session
 * Link anonymous session to authenticated user after signup
 *
 * Authentication: Required (Supabase JWT)
 * Rate Limit: 100 requests per 15 minutes (shared with other analytics)
 *
 * Body:
 * - anonymous_session_id: string (required) - localStorage session ID to link
 * - user_id: string (required) - Authenticated user's ID
 *
 * Response:
 * - success: true
 * - data: { linkedCount, firstTouch, lastTouch }
 */
router.post('/link-anonymous-session', authenticateSupabaseJWT, analyticsRateLimiter, async (req, res) => {
  try {
    const { anonymous_session_id, user_id } = req.body;
    const authenticatedUserId = req.user?.id;

    // Validate required fields
    if (!anonymous_session_id) {
      logger.warn('⚠️ Link session: Missing anonymous_session_id', {
        userId: authenticatedUserId
      });
      return res.status(400).json({
        success: false,
        error: 'anonymous_session_id is required'
      });
    }

    if (!user_id) {
      logger.warn('⚠️ Link session: Missing user_id', {
        userId: authenticatedUserId
      });
      return res.status(400).json({
        success: false,
        error: 'user_id is required'
      });
    }

    // Security: Ensure user can only link their own sessions
    if (authenticatedUserId !== user_id) {
      logger.warn('⚠️ Link session: User mismatch', {
        authenticatedUserId,
        requestedUserId: user_id
      });
      return res.status(403).json({
        success: false,
        error: 'Cannot link sessions for other users'
      });
    }

    logger.info('🔗 Linking anonymous session to user', {
      session: anonymous_session_id,
      userId: user_id
    });

    // Call Supabase function to link sessions and mark attribution
    const { data, error } = await supabase
      .rpc('link_anonymous_sessions_to_user', {
        p_anonymous_session_id: anonymous_session_id,
        p_user_id: user_id
      });

    if (error) {
      logger.error('❌ Error linking anonymous session', {
        error: error.message,
        code: error.code,
        details: error.details,
        session: anonymous_session_id,
        userId: user_id
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to link anonymous session'
      });
    }

    // Get first touch and last touch pages for response
    const { data: visits, error: visitsError } = await supabase
      .from('public_page_visits')
      .select('page_path, first_touch, last_touch, created_at')
      .eq('anonymous_session_id', anonymous_session_id)
      .eq('user_id', user_id)
      .order('created_at', { ascending: true });

    if (visitsError) {
      logger.warn('⚠️ Could not fetch linked visits', {
        error: visitsError.message,
        userId: user_id
      });
    }

    const firstTouchPage = visits?.find(v => v.first_touch)?.page_path || null;
    const lastTouchPage = visits?.find(v => v.last_touch)?.page_path || null;

    logger.info('✅ Anonymous session linked successfully', {
      session: anonymous_session_id,
      userId: user_id,
      linkedCount: data,
      firstTouch: firstTouchPage,
      lastTouch: lastTouchPage
    });

    return res.json({
      success: true,
      data: {
        linkedCount: data,
        firstTouch: firstTouchPage,
        lastTouch: lastTouchPage,
        message: `Successfully linked ${data} page visits to user account`
      }
    });

  } catch (error) {
    logger.error('❌ Unexpected error linking anonymous session', {
      error: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to link anonymous session'
    });
  }
});

export default router;
