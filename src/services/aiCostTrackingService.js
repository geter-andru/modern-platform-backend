/**
 * AI Cost Tracking Service
 *
 * Handles writing AI usage metrics to Supabase for cost tracking and analytics.
 * Integrates with performanceMonitoring.js to persist metrics to database.
 *
 * @module services/aiCostTrackingService
 */

import { createClient } from '@supabase/supabase-js';
import logger from '../utils/logger.js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class AICostTrackingService {
  /**
   * Record AI usage metric to database
   *
   * @param {Object} metric - Metric data
   * @param {string} metric.operation - Operation name (e.g., 'generateICP')
   * @param {string} metric.model - Model used (e.g., 'claude-3-opus-20240229')
   * @param {boolean} metric.success - Whether the call succeeded
   * @param {number} metric.duration - Duration in milliseconds
   * @param {string} [metric.customerId] - User ID (optional)
   * @param {number} [metric.inputTokens] - Input tokens consumed
   * @param {number} [metric.outputTokens] - Output tokens generated
   * @param {number} [metric.estimatedCost] - Estimated cost in USD
   * @param {string} [metric.error] - Error message if failed
   * @param {number} [metric.retryCount] - Number of retries
   * @param {Object} [metric.metadata] - Additional metadata
   * @returns {Promise<Object>} Result object
   */
  async recordMetric(metric) {
    try {
      const {
        operation,
        model,
        success,
        duration,
        customerId = null,
        inputTokens = 0,
        outputTokens = 0,
        estimatedCost = 0,
        error = null,
        retryCount = 0,
        metadata = {}
      } = metric;

      // Validate required fields
      if (!operation || !model || success === undefined || !duration) {
        logger.warn('[AICostTracking] Missing required fields', { metric });
        return { success: false, error: 'Missing required fields' };
      }

      // Insert into database
      const { data, error: dbError } = await supabase
        .from('ai_usage_metrics')
        .insert({
          user_id: customerId,
          operation: operation,
          model: model,
          success: success,
          error_message: error,
          duration_ms: Math.round(duration),
          retry_count: retryCount,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          estimated_cost_usd: estimatedCost,
          metadata: metadata
        })
        .select()
        .single();

      if (dbError) {
        logger.error('[AICostTracking] Failed to insert metric', {
          error: dbError.message,
          operation
        });
        return { success: false, error: dbError.message };
      }

      logger.debug('[AICostTracking] Metric recorded', {
        id: data.id,
        operation,
        cost: estimatedCost
      });

      return { success: true, data };
    } catch (error) {
      logger.error('[AICostTracking] Unexpected error recording metric', {
        error: error.message,
        stack: error.stack
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get today's AI costs in real-time
   *
   * @returns {Promise<Object>} Today's cost summary
   */
  async getTodaysCosts() {
    try {
      const { data, error } = await supabase
        .rpc('get_todays_ai_costs');

      if (error) {
        logger.error('[AICostTracking] Failed to get today\'s costs', { error: error.message });
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: data[0] || {
          total_calls: 0,
          successful_calls: 0,
          failed_calls: 0,
          total_cost_usd: 0,
          total_tokens: 0,
          operations_breakdown: {},
          models_breakdown: {}
        }
      };
    } catch (error) {
      logger.error('[AICostTracking] Unexpected error getting today\'s costs', {
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get monthly AI costs
   *
   * @param {Date} [month] - Target month (defaults to current month)
   * @returns {Promise<Object>} Monthly cost summary
   */
  async getMonthlyCosts(month = new Date()) {
    try {
      const targetMonth = month instanceof Date ? month : new Date(month);
      const monthStr = targetMonth.toISOString().split('T')[0]; // YYYY-MM-DD

      const { data, error } = await supabase
        .rpc('get_monthly_ai_costs', { target_month: monthStr });

      if (error) {
        logger.error('[AICostTracking] Failed to get monthly costs', { error: error.message });
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: data[0] || {
          month: monthStr,
          total_calls: 0,
          total_cost_usd: 0,
          total_tokens: 0,
          avg_cost_per_call: 0,
          avg_tokens_per_call: 0
        }
      };
    } catch (error) {
      logger.error('[AICostTracking] Unexpected error getting monthly costs', {
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get daily cost summaries for a date range
   *
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Object>} Array of daily summaries
   */
  async getDailyCosts(startDate, endDate) {
    try {
      const { data, error } = await supabase
        .from('ai_cost_daily_summary')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) {
        logger.error('[AICostTracking] Failed to get daily costs', { error: error.message });
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      logger.error('[AICostTracking] Unexpected error getting daily costs', {
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get top spending users
   *
   * @param {number} [limit=10] - Number of users to return
   * @param {Date} [since] - Start date for filtering
   * @returns {Promise<Object>} Top spending users
   */
  async getTopSpendingUsers(limit = 10, since = null) {
    try {
      let query = supabase
        .from('ai_usage_metrics')
        .select('user_id, estimated_cost_usd')
        .not('user_id', 'is', null);

      if (since) {
        query = query.gte('created_at', since.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        logger.error('[AICostTracking] Failed to get top spending users', {
          error: error.message
        });
        return { success: false, error: error.message };
      }

      // Aggregate by user
      const userSpending = {};
      data.forEach(row => {
        if (!userSpending[row.user_id]) {
          userSpending[row.user_id] = 0;
        }
        userSpending[row.user_id] += parseFloat(row.estimated_cost_usd || 0);
      });

      // Sort and limit
      const topUsers = Object.entries(userSpending)
        .map(([userId, totalCost]) => ({
          user_id: userId,
          total_cost_usd: parseFloat(totalCost.toFixed(6))
        }))
        .sort((a, b) => b.total_cost_usd - a.total_cost_usd)
        .slice(0, limit);

      return { success: true, data: topUsers };
    } catch (error) {
      logger.error('[AICostTracking] Unexpected error getting top spending users', {
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Aggregate costs for a specific date
   *
   * @param {Date} targetDate - Date to aggregate
   * @returns {Promise<Object>} Result object
   */
  async aggregateCostsForDate(targetDate) {
    try {
      const dateStr = targetDate.toISOString().split('T')[0];

      const { error } = await supabase
        .rpc('aggregate_ai_costs_for_date', { target_date: dateStr });

      if (error) {
        logger.error('[AICostTracking] Failed to aggregate costs', {
          error: error.message,
          date: dateStr
        });
        return { success: false, error: error.message };
      }

      logger.info('[AICostTracking] Aggregated costs for date', { date: dateStr });
      return { success: true };
    } catch (error) {
      logger.error('[AICostTracking] Unexpected error aggregating costs', {
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export default new AICostTrackingService();
