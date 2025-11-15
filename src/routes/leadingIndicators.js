/**
 * TOOL OUTCOME INDICATORS API ROUTES (Dashboard-v3)
 * Purpose: Track observable outcomes from using Andru tools that predict financial results
 * Flow: Tool Usage → Tool Outcomes (weeks 2-6) → Financial Predictions (weeks 8-12)
 * Author: Senior Full-Stack Engineer (PLG-Focused)
 * Date: 2025-01-14
 */

import express from 'express';
import { authenticateMulti, customerRateLimit } from '../middleware/auth.js';
import supabase from '../services/supabaseService.js';
import { z } from 'zod';

const router = express.Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const ToolOutcomeIndicatorSchema = z.object({
  // Measurement period
  measurement_period_start: z.string().optional(),
  measurement_period_end: z.string().optional(),

  // Leading Indicator 1: Low-Fit Deal Reduction
  total_deals_evaluated: z.number().int().min(0).optional(),
  low_fit_deals_eliminated: z.number().int().min(0).optional(),
  low_fit_deal_reduction_percentage: z.number().min(0).max(100).optional(),
  baseline_low_fit_deal_percentage: z.number().min(0).max(100).optional(),

  // Leading Indicator 2: Meeting→Proposal Conversion
  first_meetings_held: z.number().int().min(0).optional(),
  proposals_generated: z.number().int().min(0).optional(),
  meeting_to_proposal_conversion: z.number().min(0).max(100).optional(),
  baseline_meeting_to_proposal_conversion: z.number().min(0).max(100).optional(),
  conversion_improvement_points: z.number().optional(),

  // Leading Indicator 3: Multi-Stakeholder Engagement
  deals_with_stakeholder_data: z.number().int().min(0).optional(),
  total_stakeholders_engaged: z.number().int().min(0).optional(),
  avg_stakeholders_per_deal: z.number().min(0).optional(),
  baseline_avg_stakeholders_per_deal: z.number().min(0).optional(),
  stakeholder_engagement_increase: z.number().optional(),
  economic_buyers_engaged: z.number().int().min(0).optional(),
  technical_buyers_engaged: z.number().int().min(0).optional(),
  end_users_engaged: z.number().int().min(0).optional(),
  champions_identified: z.number().int().min(0).optional(),

  // Leading Indicator 4: Deal Size Increase
  deals_closed_count: z.number().int().min(0).optional(),
  total_deal_value_cents: z.number().int().min(0).optional(),
  avg_deal_size_cents: z.number().int().min(0).optional(),
  baseline_avg_deal_size_cents: z.number().int().min(0).optional(),
  deal_size_increase_percentage: z.number().optional(),

  // Leading Indicator 5: Deal Cycle Time Reduction
  total_cycle_time_days: z.number().int().min(0).optional(),
  avg_deal_cycle_days: z.number().min(0).optional(),
  baseline_avg_deal_cycle_days: z.number().int().min(0).optional(),
  cycle_time_reduction_percentage: z.number().optional(),
  cycle_time_reduction_days: z.number().int().optional(),

  // Leading Indicator 6: Executive Engagement Win Rate
  deals_with_executive_engagement: z.number().int().min(0).optional(),
  executive_engaged_wins: z.number().int().min(0).optional(),
  executive_engagement_win_rate: z.number().min(0).max(100).optional(),
  deals_without_executive_engagement: z.number().int().min(0).optional(),
  non_executive_wins: z.number().int().min(0).optional(),
  non_executive_win_rate: z.number().min(0).max(100).optional(),
  executive_engagement_lift: z.number().optional(),

  // Leading Indicator 7: Customer Referral Rate
  customers_eligible_for_referral: z.number().int().min(0).optional(),
  customers_who_referred: z.number().int().min(0).optional(),
  referral_count: z.number().int().min(0).optional(),
  referral_rate: z.number().min(0).max(100).optional(),
  baseline_referral_rate: z.number().min(0).max(100).optional(),

  // Metadata
  data_source: z.enum(['manual', 'crm_sync', 'auto_calculated']).optional(),
  crm_provider: z.string().optional(),
  notes: z.string().optional(),
  snapshot_date: z.string().optional(),
  week_number: z.number().int().optional()
});

// ============================================================================
// GET /api/leading-indicators/outcomes/current
// Get current period's tool outcome indicators
// ============================================================================

router.get('/outcomes/current',
  customerRateLimit(30, 15 * 60 * 1000),
  authenticateMulti,
  async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const currentWeek = getCurrentWeekNumber();

      const { data, error } = await supabase
        .from('tool_outcome_indicators')
        .select('*')
        .eq('user_id', userId)
        .eq('week_number', currentWeek)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching tool outcomes:', error);
        return res.status(500).json({ error: 'Failed to fetch tool outcomes' });
      }

      res.json({
        success: true,
        data: data || null,
        week: currentWeek
      });
    } catch (error) {
      console.error('Error in GET /outcomes/current:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ============================================================================
// GET /api/leading-indicators/outcomes/history
// Get historical tool outcomes for trend analysis
// ============================================================================

router.get('/outcomes/history',
  customerRateLimit(30, 15 * 60 * 1000),
  authenticateMulti,
  async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const weeks = parseInt(req.query.weeks) || 12;

      const { data, error } = await supabase
        .from('tool_outcome_indicators')
        .select('*')
        .eq('user_id', userId)
        .order('snapshot_date', { ascending: false })
        .limit(weeks);

      if (error) {
        console.error('Error fetching tool outcomes history:', error);
        return res.status(500).json({ error: 'Failed to fetch history' });
      }

      res.json({
        success: true,
        data: data || [],
        count: data?.length || 0
      });
    } catch (error) {
      console.error('Error in GET /outcomes/history:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ============================================================================
// POST /api/leading-indicators/outcomes
// Record tool outcome indicators for current period
// ============================================================================

router.post('/outcomes',
  customerRateLimit(20, 15 * 60 * 1000),
  authenticateMulti,
  async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Validate request body
      const validationResult = ToolOutcomeIndicatorSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validationResult.error.errors
        });
      }

      const outcomeData = validationResult.data;
      const currentWeek = getCurrentWeekNumber();
      const snapshotDate = outcomeData.snapshot_date || new Date().toISOString().split('T')[0];

      // Auto-calculate derived metrics if base data provided
      const calculatedData = calculateDerivedMetrics(outcomeData);

      // Prepare data for upsert
      const dataToInsert = {
        user_id: userId,
        week_number: outcomeData.week_number || currentWeek,
        snapshot_date: snapshotDate,
        measurement_period_start: outcomeData.measurement_period_start || getWeekStart(snapshotDate),
        measurement_period_end: outcomeData.measurement_period_end || snapshotDate,
        ...calculatedData
      };

      // Upsert (insert or update if exists)
      const { data, error } = await supabase
        .from('tool_outcome_indicators')
        .upsert(dataToInsert, {
          onConflict: 'user_id,week_number,snapshot_date'
        })
        .select()
        .single();

      if (error) {
        console.error('Error upserting tool outcomes:', error);
        return res.status(500).json({ error: 'Failed to save tool outcomes' });
      }

      // Predictions are auto-generated by database trigger

      res.json({
        success: true,
        data,
        message: 'Tool outcomes saved successfully. Predictions generated automatically.'
      });
    } catch (error) {
      console.error('Error in POST /outcomes:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ============================================================================
// GET /api/leading-indicators/predictions/active
// Get active financial outcome predictions
// ============================================================================

router.get('/predictions/active',
  customerRateLimit(30, 15 * 60 * 1000),
  authenticateMulti,
  async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { data, error } = await supabase
        .from('financial_outcome_predictions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_validated', false)
        .gte('prediction_target_date', new Date().toISOString().split('T')[0])
        .order('prediction_target_date', { ascending: true });

      if (error) {
        console.error('Error fetching active predictions:', error);
        return res.status(500).json({ error: 'Failed to fetch predictions' });
      }

      res.json({
        success: true,
        data: data || [],
        count: data?.length || 0
      });
    } catch (error) {
      console.error('Error in GET /predictions/active:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ============================================================================
// GET /api/leading-indicators/predictions/past
// Get past predictions with validation results
// ============================================================================

router.get('/predictions/past',
  customerRateLimit(30, 15 * 60 * 1000),
  authenticateMulti,
  async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { data, error } = await supabase
        .from('financial_outcome_predictions')
        .select('*')
        .eq('user_id', userId)
        .lt('prediction_target_date', new Date().toISOString().split('T')[0])
        .order('prediction_target_date', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching past predictions:', error);
        return res.status(500).json({ error: 'Failed to fetch predictions' });
      }

      // Calculate overall accuracy
      const validated = data?.filter(p => p.is_validated) || [];
      const avgAccuracy = validated.length > 0
        ? validated.reduce((sum, p) => sum + (p.accuracy_percentage || 0), 0) / validated.length
        : null;

      res.json({
        success: true,
        data: data || [],
        count: data?.length || 0,
        stats: {
          total_predictions: data?.length || 0,
          validated_count: validated.length,
          avg_accuracy: avgAccuracy ? Math.round(avgAccuracy * 10) / 10 : null
        }
      });
    } catch (error) {
      console.error('Error in GET /predictions/past:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ============================================================================
// PUT /api/leading-indicators/predictions/:id/validate
// Validate a prediction with actual outcome
// ============================================================================

router.put('/predictions/:id/validate',
  customerRateLimit(20, 15 * 60 * 1000),
  authenticateMulti,
  async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { id } = req.params;
      const { actual_value, actual_value_source } = req.body;

      if (typeof actual_value !== 'number') {
        return res.status(400).json({ error: 'actual_value must be a number' });
      }

      // Fetch the prediction
      const { data: prediction, error: fetchError } = await supabase
        .from('financial_outcome_predictions')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (fetchError || !prediction) {
        return res.status(404).json({ error: 'Prediction not found' });
      }

      // Calculate accuracy
      const predicted = prediction.predicted_value;
      const accuracy = calculatePredictionAccuracy(predicted, actual_value);
      const error_amount = Math.abs(predicted - actual_value);

      // Update prediction
      const { data, error } = await supabase
        .from('financial_outcome_predictions')
        .update({
          is_validated: true,
          actual_value,
          actual_value_source: actual_value_source || 'manual',
          accuracy_percentage: accuracy,
          prediction_error: error_amount,
          validated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error validating prediction:', error);
        return res.status(500).json({ error: 'Failed to validate prediction' });
      }

      res.json({
        success: true,
        data,
        message: `Prediction validated: ${accuracy.toFixed(1)}% accurate (predicted ${predicted}, actual ${actual_value})`
      });
    } catch (error) {
      console.error('Error in PUT /predictions/:id/validate:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ============================================================================
// GET /api/leading-indicators/benchmarks
// Get industry benchmarks for tool outcomes
// ============================================================================

router.get('/benchmarks',
  customerRateLimit(50, 15 * 60 * 1000),
  authenticateMulti,
  async (req, res) => {
    try {
      const industry = req.query.industry || 'B2B SaaS';
      const stage = req.query.stage || 'Series A';

      const { data, error } = await supabase
        .from('outcome_benchmarks')
        .select('*')
        .eq('industry', industry)
        .eq('company_stage', stage)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching benchmarks:', error);
        return res.status(500).json({ error: 'Failed to fetch benchmarks' });
      }

      res.json({
        success: true,
        data: data || null
      });
    } catch (error) {
      console.error('Error in GET /benchmarks:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ============================================================================
// POST /api/leading-indicators/tool-usage
// Track tool usage (auto-feeds into outcome calculations)
// ============================================================================

router.post('/tool-usage',
  customerRateLimit(100, 15 * 60 * 1000), // High limit for frequent tracking
  authenticateMulti,
  async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { tool_name, action, entity_id, metadata } = req.body;

      if (!tool_name || !action) {
        return res.status(400).json({ error: 'tool_name and action are required' });
      }

      const { data, error } = await supabase
        .from('tool_usage_tracking')
        .insert({
          user_id: userId,
          tool_name,
          action,
          entity_id,
          metadata: metadata || {}
        })
        .select()
        .single();

      if (error) {
        console.error('Error tracking tool usage:', error);
        return res.status(500).json({ error: 'Failed to track tool usage' });
      }

      res.json({
        success: true,
        data,
        message: 'Tool usage tracked'
      });
    } catch (error) {
      console.error('Error in POST /tool-usage:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ============================================================================
// GET /api/leading-indicators/dashboard
// Get complete dashboard data (outcomes + predictions + benchmarks)
// ============================================================================

router.get('/dashboard',
  customerRateLimit(20, 15 * 60 * 1000),
  authenticateMulti,
  async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const currentWeek = getCurrentWeekNumber();

      // Fetch all data in parallel
      const [outcomesResult, predictionsResult, benchmarksResult, historyResult] = await Promise.all([
        // Current outcomes
        supabase
          .from('tool_outcome_indicators')
          .select('*')
          .eq('user_id', userId)
          .eq('week_number', currentWeek)
          .order('snapshot_date', { ascending: false })
          .limit(1)
          .single(),

        // Active predictions
        supabase
          .from('financial_outcome_predictions')
          .select('*')
          .eq('user_id', userId)
          .eq('is_validated', false)
          .gte('prediction_target_date', new Date().toISOString().split('T')[0])
          .order('prediction_target_date', { ascending: true }),

        // Benchmarks
        supabase
          .from('outcome_benchmarks')
          .select('*')
          .eq('industry', 'B2B SaaS')
          .eq('company_stage', 'Series A')
          .single(),

        // Historical outcomes (last 12 weeks)
        supabase
          .from('tool_outcome_indicators')
          .select('*')
          .eq('user_id', userId)
          .order('snapshot_date', { ascending: false })
          .limit(12)
      ]);

      res.json({
        success: true,
        data: {
          current_outcomes: outcomesResult.data || null,
          active_predictions: predictionsResult.data || [],
          benchmarks: benchmarksResult.data || null,
          historical_outcomes: historyResult.data || []
        },
        week: currentWeek
      });
    } catch (error) {
      console.error('Error in GET /dashboard:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getCurrentWeekNumber() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.ceil(diff / oneWeek);
}

function getWeekStart(dateString) {
  const date = new Date(dateString);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  const weekStart = new Date(date.setDate(diff));
  return weekStart.toISOString().split('T')[0];
}

function calculateDerivedMetrics(outcomeData) {
  const calculated = { ...outcomeData };

  // Calculate low-fit reduction percentage
  if (outcomeData.total_deals_evaluated > 0 && outcomeData.low_fit_deals_eliminated !== undefined) {
    calculated.low_fit_deal_reduction_percentage =
      (outcomeData.low_fit_deals_eliminated / outcomeData.total_deals_evaluated) * 100;
  }

  // Calculate meeting→proposal conversion
  if (outcomeData.first_meetings_held > 0 && outcomeData.proposals_generated !== undefined) {
    calculated.meeting_to_proposal_conversion =
      (outcomeData.proposals_generated / outcomeData.first_meetings_held) * 100;

    // Calculate improvement points if baseline provided
    if (outcomeData.baseline_meeting_to_proposal_conversion) {
      calculated.conversion_improvement_points =
        calculated.meeting_to_proposal_conversion - outcomeData.baseline_meeting_to_proposal_conversion;
    }
  }

  // Calculate avg stakeholders per deal
  if (outcomeData.deals_with_stakeholder_data > 0 && outcomeData.total_stakeholders_engaged !== undefined) {
    calculated.avg_stakeholders_per_deal =
      outcomeData.total_stakeholders_engaged / outcomeData.deals_with_stakeholder_data;

    // Calculate increase if baseline provided
    if (outcomeData.baseline_avg_stakeholders_per_deal) {
      calculated.stakeholder_engagement_increase =
        calculated.avg_stakeholders_per_deal - outcomeData.baseline_avg_stakeholders_per_deal;
    }
  }

  // Calculate avg deal size
  if (outcomeData.deals_closed_count > 0 && outcomeData.total_deal_value_cents !== undefined) {
    calculated.avg_deal_size_cents =
      Math.round(outcomeData.total_deal_value_cents / outcomeData.deals_closed_count);

    // Calculate increase percentage if baseline provided
    if (outcomeData.baseline_avg_deal_size_cents) {
      calculated.deal_size_increase_percentage =
        ((calculated.avg_deal_size_cents - outcomeData.baseline_avg_deal_size_cents) /
          outcomeData.baseline_avg_deal_size_cents) * 100;
    }
  }

  // Calculate cycle time reduction
  if (outcomeData.baseline_avg_deal_cycle_days && outcomeData.avg_deal_cycle_days) {
    calculated.cycle_time_reduction_days =
      outcomeData.baseline_avg_deal_cycle_days - outcomeData.avg_deal_cycle_days;
    calculated.cycle_time_reduction_percentage =
      (calculated.cycle_time_reduction_days / outcomeData.baseline_avg_deal_cycle_days) * 100;
  }

  // Calculate executive engagement lift
  if (outcomeData.executive_engagement_win_rate && outcomeData.non_executive_win_rate) {
    calculated.executive_engagement_lift =
      outcomeData.executive_engagement_win_rate - outcomeData.non_executive_win_rate;
  }

  // Calculate referral rate
  if (outcomeData.customers_eligible_for_referral > 0 && outcomeData.customers_who_referred !== undefined) {
    calculated.referral_rate =
      (outcomeData.customers_who_referred / outcomeData.customers_eligible_for_referral) * 100;
  }

  return calculated;
}

function calculatePredictionAccuracy(predicted, actual) {
  if (predicted === 0) return 0;
  const diff = Math.abs(predicted - actual);
  const accuracy = Math.max(0, 100 - (diff / Math.abs(predicted)) * 100);
  return Math.round(accuracy * 10) / 10; // Round to 1 decimal
}

export default router;
