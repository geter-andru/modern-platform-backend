import express from 'express';
import { authenticateSupabaseJWT } from '../middleware/supabaseAuth.js';
import logger from '../utils/logger.js';
import supabase from '../services/supabaseService.js';

const router = express.Router();

// Admin email whitelist
const ADMIN_EMAILS = ['geter@humusnshore.org'];

/**
 * Middleware to check if user is admin
 */
const requireAdmin = async (req, res, next) => {
  const userEmail = req.user?.email;

  if (!userEmail) {
    logger.warn('Admin access denied: No user email');
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (!ADMIN_EMAILS.includes(userEmail)) {
    logger.warn('Admin access denied', { email: userEmail });
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }

  next();
};

/**
 * GET /api/admin/founding-members
 * Get list of all founding members who paid $497
 *
 * Authentication: Required (Supabase JWT)
 * Authorization: Admin only (geter@humusnshore.org)
 *
 * Response: Array of founding member records with:
 * - User info (id, email, created_at)
 * - Payment info (payment_date, amount, stripe_customer_id)
 * - Access info (has_early_access, access_granted_date, forever_lock_price)
 * - Assessment info (assessment_session_id if linked)
 * - assessmentStatus: { completed, overallScore, buyerScore, completedAt }
 * - platformStatus: { lastActive, toolSessions, exportsGenerated, daysSinceLastActivity }
 */
router.get('/founding-members', authenticateSupabaseJWT, requireAdmin, async (req, res) => {
  try {
    logger.info('Admin: Fetching founding members list', {
      adminEmail: req.user.email
    });

    // Query auth.users and user_milestones
    const { data, error } = await supabase.rpc('get_founding_members_admin');

    if (error) {
      // If RPC doesn't exist, fall back to direct query
      logger.info('RPC not found, using direct query');

      const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

      if (usersError) {
        throw usersError;
      }

      const { data: milestones, error: milestonesError } = await supabase
        .from('user_milestones')
        .select('*')
        .eq('is_founding_member', true)
        .eq('milestone_type', 'waitlist_paid')
        .order('completed_at', { ascending: false });

      if (milestonesError) {
        throw milestonesError;
      }

      // Fetch assessment data for all founding members
      const userIds = milestones.map(m => m.user_id);

      logger.info('📊 Fetching assessment data for founding members', {
        userCount: userIds.length,
        adminEmail: req.user.email
      });

      const { data: assessments, error: assessmentsError } = await supabase
        .from('assessment_sessions')
        .select('user_id, overall_score, buyer_score, created_at')
        .in('user_id', userIds);

      if (assessmentsError) {
        logger.warn('⚠️ Failed to fetch assessment data', {
          error: assessmentsError.message,
          adminEmail: req.user.email
        });
      } else {
        logger.info('✅ Assessment data retrieved', {
          count: assessments?.length || 0,
          adminEmail: req.user.email
        });
      }

      // Fetch behavior insights for all founding members
      logger.info('📊 Fetching behavior insights for founding members', {
        userCount: userIds.length,
        adminEmail: req.user.email
      });

      const { data: insights, error: insightsError } = await supabase
        .from('behavior_insights')
        .select('customer_id, total_tool_sessions, total_exports_generated, last_session_timestamp, days_since_last_activity')
        .in('customer_id', userIds.map(id => id.toString()));

      if (insightsError) {
        logger.warn('⚠️ Failed to fetch behavior insights', {
          error: insightsError.message,
          adminEmail: req.user.email
        });
      } else {
        logger.info('✅ Behavior insights retrieved', {
          count: insights?.length || 0,
          adminEmail: req.user.email
        });
      }

      // Join the data manually with assessment and platform status
      const foundingMembers = milestones.map(milestone => {
        const user = users.users.find(u => u.id === milestone.user_id);
        const assessment = assessments?.find(a => a.user_id === milestone.user_id);
        const behaviorInsight = insights?.find(i => i.customer_id === milestone.user_id.toString());

        return {
          user_id: milestone.user_id,
          email: user?.email || 'Unknown',
          account_created: user?.created_at || null,
          payment_date: milestone.completed_at,
          access_granted_date: milestone.access_granted_date,
          has_early_access: milestone.has_early_access,
          is_founding_member: milestone.is_founding_member,
          forever_lock_price: milestone.forever_lock_price,
          stripe_customer_id: milestone.stripe_customer_id,
          stripe_subscription_id: milestone.stripe_subscription_id,
          amount_paid: milestone.metadata?.payment_amount || null,
          payment_currency: milestone.metadata?.payment_currency || 'usd',
          founding_member_number: milestone.metadata?.founding_member_number || null,
          assessment_session_id: user?.user_metadata?.assessment_session_id || null,
          // NEW: Assessment status
          assessmentStatus: assessment ? {
            completed: true,
            overallScore: assessment.overall_score,
            buyerScore: assessment.buyer_score,
            completedAt: assessment.created_at
          } : {
            completed: false,
            overallScore: null,
            buyerScore: null,
            completedAt: null
          },
          // NEW: Platform usage status
          platformStatus: behaviorInsight ? {
            lastActive: behaviorInsight.last_session_timestamp,
            toolSessions: behaviorInsight.total_tool_sessions || 0,
            exportsGenerated: behaviorInsight.total_exports_generated || 0,
            daysSinceLastActivity: behaviorInsight.days_since_last_activity || null
          } : {
            lastActive: null,
            toolSessions: 0,
            exportsGenerated: 0,
            daysSinceLastActivity: null
          }
        };
      });

      logger.info('Admin: Founding members retrieved', {
        count: foundingMembers.length,
        adminEmail: req.user.email
      });

      return res.json({
        success: true,
        data: {
          foundingMembers,
          totalCount: foundingMembers.length,
          withEarlyAccess: foundingMembers.filter(m => m.has_early_access).length,
          withoutEarlyAccess: foundingMembers.filter(m => !m.has_early_access).length,
          totalRevenue: foundingMembers.reduce((sum, m) => sum + (m.amount_paid || 0), 0)
        }
      });
    }

    // If RPC exists, use that data
    logger.info('Admin: Founding members retrieved via RPC', {
      count: data?.length || 0,
      adminEmail: req.user.email
    });

    return res.json({
      success: true,
      data: {
        foundingMembers: data || [],
        totalCount: data?.length || 0,
        withEarlyAccess: data?.filter(m => m.has_early_access).length || 0,
        withoutEarlyAccess: data?.filter(m => !m.has_early_access).length || 0,
        totalRevenue: data?.reduce((sum, m) => sum + (m.amount_paid || 0), 0) || 0
      }
    });

  } catch (error) {
    logger.error('Error fetching founding members', {
      error: error.message,
      adminEmail: req.user.email
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch founding members'
    });
  }
});

/**
 * GET /api/admin/assessment-analytics
 * Get assessment completion analytics for founding members
 *
 * Authentication: Required (Supabase JWT)
 * Authorization: Admin only (geter@humusnshore.org)
 *
 * Response:
 * - totalFoundingMembers: Count of users with is_founding_member = true
 * - completedAssessments: Count of founding members with linked assessment
 * - pendingAssessments: Count of founding members without assessment
 * - completionRate: Percentage of founding members who completed assessment
 * - avgOverallScore: Average overall_score across all founding member assessments
 * - avgBuyerScore: Average buyer_score across all founding member assessments
 * - recentCompletions: Last 10 assessment completions with user details
 *
 * Empty State: Returns zeros and empty array when 0 founding members exist
 */
router.get('/assessment-analytics', authenticateSupabaseJWT, requireAdmin, async (req, res) => {
  try {
    logger.info('🚀 Admin: Fetching assessment analytics', {
      adminEmail: req.user.email
    });

    // Step 1: Get all founding members
    const { data: milestones, error: milestonesError } = await supabase
      .from('user_milestones')
      .select('user_id')
      .eq('is_founding_member', true)
      .eq('milestone_type', 'waitlist_paid');

    if (milestonesError) {
      logger.error('❌ Error fetching founding members for analytics', {
        error: milestonesError.message,
        adminEmail: req.user.email
      });
      throw milestonesError;
    }

    const totalFoundingMembers = milestones?.length || 0;

    logger.info('📊 Founding members count', {
      count: totalFoundingMembers,
      adminEmail: req.user.email
    });

    // EMPTY STATE: Return early if no founding members exist
    if (totalFoundingMembers === 0) {
      logger.info('✅ Assessment analytics: Empty state (0 founding members)', {
        adminEmail: req.user.email
      });

      return res.json({
        success: true,
        data: {
          totalFoundingMembers: 0,
          completedAssessments: 0,
          pendingAssessments: 0,
          completionRate: 0,
          avgOverallScore: 0,
          avgBuyerScore: 0,
          recentCompletions: [],
          message: 'No founding members yet'
        }
      });
    }

    // Step 2: Get assessment data for founding members
    const userIds = milestones.map(m => m.user_id);

    const { data: assessments, error: assessmentsError } = await supabase
      .from('assessment_sessions')
      .select(`
        id,
        session_id,
        user_id,
        user_email,
        overall_score,
        buyer_score,
        status,
        created_at
      `)
      .in('user_id', userIds)
      .order('created_at', { ascending: false });

    if (assessmentsError) {
      logger.error('❌ Error fetching assessment sessions', {
        error: assessmentsError.message,
        adminEmail: req.user.email
      });
      throw assessmentsError;
    }

    logger.info('📊 Assessment sessions retrieved', {
      count: assessments?.length || 0,
      adminEmail: req.user.email
    });

    // Step 3: Calculate analytics
    const completedAssessments = assessments?.length || 0;
    const pendingAssessments = totalFoundingMembers - completedAssessments;
    const completionRate = totalFoundingMembers > 0
      ? Math.round((completedAssessments / totalFoundingMembers) * 100)
      : 0;

    // Calculate average scores (only for completed assessments with scores)
    const assessmentsWithScores = assessments?.filter(a =>
      a.overall_score !== null && a.buyer_score !== null
    ) || [];

    const avgOverallScore = assessmentsWithScores.length > 0
      ? Math.round(
          assessmentsWithScores.reduce((sum, a) => sum + a.overall_score, 0) / assessmentsWithScores.length
        )
      : 0;

    const avgBuyerScore = assessmentsWithScores.length > 0
      ? Math.round(
          assessmentsWithScores.reduce((sum, a) => sum + a.buyer_score, 0) / assessmentsWithScores.length
        )
      : 0;

    // Step 4: Get recent completions (last 10, deduplicated by email)
    const seenEmails = new Set();
    const recentCompletions = (assessments || [])
      .filter(a => {
        if (seenEmails.has(a.user_email)) {
          return false;
        }
        seenEmails.add(a.user_email);
        return true;
      })
      .slice(0, 10)
      .map(a => ({
        email: a.user_email,
        overallScore: a.overall_score,
        buyerScore: a.buyer_score,
        completedAt: a.created_at,
        status: a.status
      }));

    const analyticsData = {
      totalFoundingMembers,
      completedAssessments,
      pendingAssessments,
      completionRate,
      avgOverallScore,
      avgBuyerScore,
      recentCompletions
    };

    logger.info('✅ Assessment analytics calculated', {
      ...analyticsData,
      adminEmail: req.user.email
    });

    return res.json({
      success: true,
      data: analyticsData
    });

  } catch (error) {
    logger.error('❌ Error fetching assessment analytics', {
      error: error.message,
      stack: error.stack,
      adminEmail: req.user.email
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch assessment analytics'
    });
  }
});

/**
 * GET /api/admin/platform-analytics
 * Get simplified platform usage analytics for founding members
 *
 * Authentication: Required (Supabase JWT)
 * Authorization: Admin only (geter@humusnshore.org)
 *
 * Response:
 * - aggregateStats:
 *   - totalToolSessions: Total tool usage sessions across all founding members
 *   - totalExports: Total exports generated across all founding members
 *   - activeUsers: Founding members active in last 7 days
 *   - inactiveUsers: Founding members inactive 7+ days
 * - topExporters: Top 5 founding members by export count
 *
 * Data Source: behavior_insights table (auto-aggregated by database triggers)
 * Empty State: Returns zeros and empty array when 0 founding members exist
 */
router.get('/platform-analytics', authenticateSupabaseJWT, requireAdmin, async (req, res) => {
  try {
    logger.info('🚀 Admin: Fetching platform analytics', {
      adminEmail: req.user.email
    });

    // Step 1: Get all founding members
    const { data: milestones, error: milestonesError } = await supabase
      .from('user_milestones')
      .select('user_id')
      .eq('is_founding_member', true)
      .eq('milestone_type', 'waitlist_paid');

    if (milestonesError) {
      logger.error('❌ Error fetching founding members for platform analytics', {
        error: milestonesError.message,
        adminEmail: req.user.email
      });
      throw milestonesError;
    }

    const totalFoundingMembers = milestones?.length || 0;

    logger.info('📊 Founding members count', {
      count: totalFoundingMembers,
      adminEmail: req.user.email
    });

    // EMPTY STATE: Return early if no founding members exist
    if (totalFoundingMembers === 0) {
      logger.info('✅ Platform analytics: Empty state (0 founding members)', {
        adminEmail: req.user.email
      });

      return res.json({
        success: true,
        data: {
          aggregateStats: {
            totalToolSessions: 0,
            totalExports: 0,
            activeUsers: 0,
            inactiveUsers: 0
          },
          topExporters: [],
          message: 'No founding members yet'
        }
      });
    }

    // Step 2: Get behavior insights for founding members
    // Note: behavior_insights uses customer_id as TEXT, need to cast user_id
    const userIds = milestones.map(m => m.user_id);

    const { data: insights, error: insightsError } = await supabase
      .from('behavior_insights')
      .select(`
        customer_id,
        total_tool_sessions,
        total_exports_generated,
        days_since_last_activity,
        last_session_timestamp
      `)
      .in('customer_id', userIds.map(id => id.toString()));

    if (insightsError) {
      logger.error('❌ Error fetching behavior insights', {
        error: insightsError.message,
        adminEmail: req.user.email
      });
      throw insightsError;
    }

    logger.info('📊 Behavior insights retrieved', {
      count: insights?.length || 0,
      adminEmail: req.user.email
    });

    // Step 3: Calculate aggregate stats
    const totalToolSessions = insights?.reduce((sum, i) => sum + (i.total_tool_sessions || 0), 0) || 0;
    const totalExports = insights?.reduce((sum, i) => sum + (i.total_exports_generated || 0), 0) || 0;

    // Active = last activity within 7 days
    const activeUsers = insights?.filter(i => (i.days_since_last_activity || 999) <= 7).length || 0;
    const inactiveUsers = totalFoundingMembers - activeUsers;

    // Step 4: Get top 5 exporters
    // Need to join with auth.users to get email addresses
    const topExporterInsights = (insights || [])
      .filter(i => i.total_exports_generated > 0)
      .sort((a, b) => b.total_exports_generated - a.total_exports_generated)
      .slice(0, 5);

    // Fetch user emails for top exporters
    const topExporterUserIds = topExporterInsights.map(i => i.customer_id);
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      logger.error('❌ Error fetching user emails for top exporters', {
        error: usersError.message,
        adminEmail: req.user.email
      });
      throw usersError;
    }

    const topExporters = topExporterInsights.map(insight => {
      const user = users.users.find(u => u.id === insight.customer_id);
      return {
        email: user?.email || 'Unknown',
        exportCount: insight.total_exports_generated
      };
    });

    const analyticsData = {
      aggregateStats: {
        totalToolSessions,
        totalExports,
        activeUsers,
        inactiveUsers
      },
      topExporters
    };

    logger.info('✅ Platform analytics calculated', {
      ...analyticsData,
      adminEmail: req.user.email
    });

    return res.json({
      success: true,
      data: analyticsData
    });

  } catch (error) {
    logger.error('❌ Error fetching platform analytics', {
      error: error.message,
      stack: error.stack,
      adminEmail: req.user.email
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch platform analytics'
    });
  }
});

/**
 * GET /api/admin/funnel-analytics
 * Get full funnel analytics from anonymous visitors → founding members
 *
 * Authentication: Required (Supabase JWT)
 * Authorization: Admin only (geter@humusnshore.org)
 *
 * Response:
 * - funnelStages: Conversion metrics at each stage
 *   - totalAnonymousSessions: Unique anonymous sessions
 *   - sessionsWithPageViews: Sessions with page view data
 *   - sessionsWithCtaClicks: Sessions with CTA click
 *   - sessionsLinkedToUsers: Sessions linked to authenticated users
 *   - foundingMembers: Users who paid $497
 * - conversionRates: Percentage conversion at each stage
 * - attribution:
 *   - firstTouchPages: Top first-touch entry pages
 *   - lastTouchPages: Top last-touch pages before conversion
 * - utmPerformance: Performance by UTM source/medium/campaign
 * - topEntryPages: Most common entry pages
 *
 * Empty State: Returns zeros when no tracking data exists
 */
router.get('/funnel-analytics', authenticateSupabaseJWT, requireAdmin, async (req, res) => {
  try {
    logger.info('🚀 Admin: Fetching funnel analytics', {
      adminEmail: req.user.email
    });

    // Step 1: Get total anonymous sessions
    const { data: allSessions, error: sessionsError } = await supabase
      .from('public_page_visits')
      .select('anonymous_session_id')
      .not('anonymous_session_id', 'is', null);

    if (sessionsError) {
      logger.error('❌ Error fetching anonymous sessions', {
        error: sessionsError.message,
        adminEmail: req.user.email
      });
      throw sessionsError;
    }

    const uniqueSessions = new Set(allSessions?.map(s => s.anonymous_session_id) || []);
    const totalAnonymousSessions = uniqueSessions.size;

    logger.info('📊 Total anonymous sessions', {
      count: totalAnonymousSessions,
      adminEmail: req.user.email
    });

    // EMPTY STATE: Return early if no tracking data exists
    if (totalAnonymousSessions === 0) {
      logger.info('✅ Funnel analytics: Empty state (no tracking data)', {
        adminEmail: req.user.email
      });

      return res.json({
        success: true,
        data: {
          funnelStages: {
            totalAnonymousSessions: 0,
            sessionsWithPageViews: 0,
            sessionsWithCtaClicks: 0,
            sessionsLinkedToUsers: 0,
            foundingMembers: 0
          },
          conversionRates: {
            pageViewToCtaClick: 0,
            ctaClickToLinked: 0,
            linkedToFoundingMember: 0,
            overallConversion: 0
          },
          attribution: {
            firstTouchPages: [],
            lastTouchPages: []
          },
          utmPerformance: {
            bySource: [],
            byMedium: [],
            byCampaign: []
          },
          topEntryPages: [],
          message: 'No tracking data yet'
        }
      });
    }

    // Step 2: Count sessions with CTA clicks
    const { data: ctaClicks, error: ctaError } = await supabase
      .from('public_page_visits')
      .select('anonymous_session_id')
      .eq('clicked_cta', true);

    if (ctaError) {
      logger.error('❌ Error fetching CTA clicks', {
        error: ctaError.message,
        adminEmail: req.user.email
      });
      throw ctaError;
    }

    const sessionsWithCta = new Set(ctaClicks?.map(c => c.anonymous_session_id) || []);
    const sessionsWithCtaClicks = sessionsWithCta.size;

    // Step 3: Count sessions linked to users
    const { data: linkedSessions, error: linkedError } = await supabase
      .from('public_page_visits')
      .select('anonymous_session_id, user_id')
      .not('user_id', 'is', null);

    if (linkedError) {
      logger.error('❌ Error fetching linked sessions', {
        error: linkedError.message,
        adminEmail: req.user.email
      });
      throw linkedError;
    }

    const uniqueLinkedSessions = new Set(linkedSessions?.map(s => s.anonymous_session_id) || []);
    const sessionsLinkedToUsers = uniqueLinkedSessions.size;

    // Step 4: Count founding members
    const { data: foundingMembers, error: foundingError } = await supabase
      .from('user_milestones')
      .select('user_id')
      .eq('is_founding_member', true)
      .eq('milestone_type', 'waitlist_paid');

    if (foundingError) {
      logger.error('❌ Error fetching founding members', {
        error: foundingError.message,
        adminEmail: req.user.email
      });
      throw foundingError;
    }

    const foundingMembersCount = foundingMembers?.length || 0;

    // Step 5: Calculate conversion rates
    const pageViewToCtaClick = totalAnonymousSessions > 0
      ? Math.round((sessionsWithCtaClicks / totalAnonymousSessions) * 100)
      : 0;

    const ctaClickToLinked = sessionsWithCtaClicks > 0
      ? Math.round((sessionsLinkedToUsers / sessionsWithCtaClicks) * 100)
      : 0;

    const linkedToFoundingMember = sessionsLinkedToUsers > 0
      ? Math.round((foundingMembersCount / sessionsLinkedToUsers) * 100)
      : 0;

    const overallConversion = totalAnonymousSessions > 0
      ? Math.round((foundingMembersCount / totalAnonymousSessions) * 100)
      : 0;

    // Step 6: Get attribution data (first touch and last touch pages)
    const { data: firstTouchData, error: firstTouchError } = await supabase
      .from('public_page_visits')
      .select('page_path')
      .eq('first_touch', true);

    if (firstTouchError) {
      logger.error('❌ Error fetching first touch data', {
        error: firstTouchError.message,
        adminEmail: req.user.email
      });
      throw firstTouchError;
    }

    const { data: lastTouchData, error: lastTouchError } = await supabase
      .from('public_page_visits')
      .select('page_path')
      .eq('last_touch', true);

    if (lastTouchError) {
      logger.error('❌ Error fetching last touch data', {
        error: lastTouchError.message,
        adminEmail: req.user.email
      });
      throw lastTouchError;
    }

    // Count page frequencies
    const firstTouchCounts = {};
    firstTouchData?.forEach(visit => {
      firstTouchCounts[visit.page_path] = (firstTouchCounts[visit.page_path] || 0) + 1;
    });

    const lastTouchCounts = {};
    lastTouchData?.forEach(visit => {
      lastTouchCounts[visit.page_path] = (lastTouchCounts[visit.page_path] || 0) + 1;
    });

    const firstTouchPages = Object.entries(firstTouchCounts)
      .map(([page, count]) => ({ page, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const lastTouchPages = Object.entries(lastTouchCounts)
      .map(([page, count]) => ({ page, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Step 7: Get UTM performance
    const { data: utmData, error: utmError } = await supabase
      .from('public_page_visits')
      .select('utm_source, utm_medium, utm_campaign, anonymous_session_id')
      .or('utm_source.not.is.null,utm_medium.not.is.null,utm_campaign.not.is.null');

    if (utmError) {
      logger.error('❌ Error fetching UTM data', {
        error: utmError.message,
        adminEmail: req.user.email
      });
      throw utmError;
    }

    // Aggregate by source, medium, campaign
    const sourceCounts = {};
    const mediumCounts = {};
    const campaignCounts = {};

    utmData?.forEach(visit => {
      if (visit.utm_source) {
        sourceCounts[visit.utm_source] = (sourceCounts[visit.utm_source] || 0) + 1;
      }
      if (visit.utm_medium) {
        mediumCounts[visit.utm_medium] = (mediumCounts[visit.utm_medium] || 0) + 1;
      }
      if (visit.utm_campaign) {
        campaignCounts[visit.utm_campaign] = (campaignCounts[visit.utm_campaign] || 0) + 1;
      }
    });

    const bySource = Object.entries(sourceCounts)
      .map(([source, count]) => ({ source, sessions: count }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 10);

    const byMedium = Object.entries(mediumCounts)
      .map(([medium, count]) => ({ medium, sessions: count }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 10);

    const byCampaign = Object.entries(campaignCounts)
      .map(([campaign, count]) => ({ campaign, sessions: count }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 10);

    // Step 8: Get top entry pages (all page views, not just first touch)
    const { data: allPageViews, error: pageViewsError } = await supabase
      .from('public_page_visits')
      .select('page_path')
      .eq('clicked_cta', false);

    if (pageViewsError) {
      logger.error('❌ Error fetching page views', {
        error: pageViewsError.message,
        adminEmail: req.user.email
      });
      throw pageViewsError;
    }

    const pageViewCounts = {};
    allPageViews?.forEach(visit => {
      pageViewCounts[visit.page_path] = (pageViewCounts[visit.page_path] || 0) + 1;
    });

    const topEntryPages = Object.entries(pageViewCounts)
      .map(([page, views]) => ({ page, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    const analyticsData = {
      funnelStages: {
        totalAnonymousSessions,
        sessionsWithPageViews: totalAnonymousSessions, // All sessions have page views
        sessionsWithCtaClicks,
        sessionsLinkedToUsers,
        foundingMembers: foundingMembersCount
      },
      conversionRates: {
        pageViewToCtaClick,
        ctaClickToLinked,
        linkedToFoundingMember,
        overallConversion
      },
      attribution: {
        firstTouchPages,
        lastTouchPages
      },
      utmPerformance: {
        bySource,
        byMedium,
        byCampaign
      },
      topEntryPages
    };

    logger.info('✅ Funnel analytics calculated', {
      ...analyticsData.funnelStages,
      adminEmail: req.user.email
    });

    return res.json({
      success: true,
      data: analyticsData
    });

  } catch (error) {
    logger.error('❌ Error fetching funnel analytics', {
      error: error.message,
      stack: error.stack,
      adminEmail: req.user.email
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch funnel analytics'
    });
  }
});

/**
 * GET /api/admin/stats
 * Get high-level statistics about the platform
 *
 * Authentication: Required (Supabase JWT)
 * Authorization: Admin only
 */
router.get('/stats', authenticateSupabaseJWT, requireAdmin, async (req, res) => {
  try {
    logger.info('Admin: Fetching platform stats', {
      adminEmail: req.user.email
    });

    // Get user count
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      throw usersError;
    }

    // Get founding members count
    const { data: foundingMembers, error: foundingError } = await supabase
      .from('user_milestones')
      .select('*', { count: 'exact' })
      .eq('is_founding_member', true)
      .eq('milestone_type', 'waitlist_paid');

    if (foundingError) {
      throw foundingError;
    }

    // Get assessment sessions count
    const { data: assessments, error: assessmentsError } = await supabase
      .from('assessment_sessions')
      .select('*', { count: 'exact' });

    if (assessmentsError) {
      throw assessmentsError;
    }

    const stats = {
      totalUsers: users.length,
      foundingMembers: foundingMembers?.length || 0,
      assessmentSessions: assessments?.length || 0,
      totalRevenue: (foundingMembers?.length || 0) * 497,
      lastUpdated: new Date().toISOString()
    };

    logger.info('Admin: Stats retrieved', {
      stats,
      adminEmail: req.user.email
    });

    return res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error fetching stats', {
      error: error.message,
      adminEmail: req.user.email
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

export default router;
