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

      // Join the data manually
      const foundingMembers = milestones.map(milestone => {
        const user = users.users.find(u => u.id === milestone.user_id);
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
          assessment_session_id: user?.user_metadata?.assessment_session_id || null
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
