/**
 * LEADING INDICATORS API ROUTES
 * Purpose: Track systematic execution behaviors that predict revenue outcomes
 * Author: Senior Full-Stack Engineer (PLG-Focused)
 * Date: 2025-01-14
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { supabase } from '../config/supabase';
import { z } from 'zod';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const LeadingIndicatorSchema = z.object({
  // ICP Precision
  icp_targeting_rate: z.number().min(0).max(100).optional(),
  icp_companies_contacted: z.number().int().min(0).optional(),
  total_companies_contacted: z.number().int().min(0).optional(),
  avg_icp_match_score: z.number().min(0).max(100).optional(),
  pipeline_icp_scores: z.array(z.number()).optional(),
  icp_drift_rate: z.number().min(0).max(100).optional(),
  baseline_icp_targeting_rate: z.number().min(0).max(100).optional(),

  // Messaging Quality
  translation_adoption_rate: z.number().min(0).max(100).optional(),
  messages_with_translation: z.number().int().min(0).optional(),
  total_messages_sent: z.number().int().min(0).optional(),
  persona_matching_score: z.number().min(0).max(100).optional(),
  correctly_matched_messages: z.number().int().min(0).optional(),
  message_variants_tested: z.number().int().min(0).optional(),
  messaging_iterations_per_week: z.number().min(0).optional(),

  // Systematic Execution
  weekly_contact_count: z.number().int().min(0).optional(),
  cadence_consistency_weeks: z.number().int().min(0).optional(),
  cadence_target_min: z.number().int().min(0).optional(),
  cadence_target_max: z.number().int().min(0).optional(),
  referral_forwards_sent: z.number().int().min(0).optional(),
  referral_requests_made: z.number().int().min(0).optional(),
  referral_activation_rate: z.number().min(0).max(100).optional(),
  avg_personas_per_deal: z.number().min(0).optional(),
  multi_persona_deals: z.number().int().min(0).optional(),
  total_active_deals: z.number().int().min(0).optional(),

  // Learning Velocity
  icp_refinement_count: z.number().int().min(0).optional(),
  days_since_last_icp_update: z.number().int().min(0).optional(),
  persona_validations: z.number().int().min(0).optional(),
  persona_validation_rate: z.number().min(0).max(100).optional(),
  translation_response_rates: z.record(z.number()).optional(),
  best_performing_variant_id: z.string().optional(),
  best_performing_response_rate: z.number().min(0).max(100).optional(),

  // Metadata
  data_source: z.enum(['manual', 'icp_tool', 'crm_sync']).optional(),
  snapshot_date: z.string().optional(),
  week_number: z.number().int().optional()
});

// ============================================================================
// GET /api/leading-indicators/current
// Get current week's leading indicators for authenticated user
// ============================================================================

router.get('/current', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const currentWeek = getCurrentWeekNumber();

    const { data, error } = await supabase
      .from('leading_indicators')
      .select('*')
      .eq('user_id', userId)
      .eq('week_number', currentWeek)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('Error fetching leading indicators:', error);
      return res.status(500).json({ error: 'Failed to fetch leading indicators' });
    }

    res.json({
      success: true,
      data: data || null,
      week: currentWeek
    });
  } catch (error) {
    console.error('Error in GET /leading-indicators/current:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// GET /api/leading-indicators/history
// Get historical leading indicators for trend analysis
// ============================================================================

router.get('/history', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const weeks = parseInt(req.query.weeks as string) || 12; // Default 12 weeks

    const { data, error } = await supabase
      .from('leading_indicators')
      .select('*')
      .eq('user_id', userId)
      .order('snapshot_date', { ascending: false })
      .limit(weeks);

    if (error) {
      console.error('Error fetching leading indicators history:', error);
      return res.status(500).json({ error: 'Failed to fetch history' });
    }

    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    });
  } catch (error) {
    console.error('Error in GET /leading-indicators/history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// POST /api/leading-indicators
// Create or update leading indicators for current week
// ============================================================================

router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate request body
    const validationResult = LeadingIndicatorSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationResult.error.errors
      });
    }

    const indicatorData = validationResult.data;
    const currentWeek = getCurrentWeekNumber();
    const snapshotDate = indicatorData.snapshot_date || new Date().toISOString().split('T')[0];

    // Prepare data for upsert
    const dataToInsert = {
      user_id: userId,
      week_number: indicatorData.week_number || currentWeek,
      snapshot_date: snapshotDate,
      ...indicatorData
    };

    // Upsert (insert or update if exists)
    const { data, error } = await supabase
      .from('leading_indicators')
      .upsert(dataToInsert, {
        onConflict: 'user_id,week_number,snapshot_date'
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting leading indicators:', error);
      return res.status(500).json({ error: 'Failed to save leading indicators' });
    }

    // Auto-calculate health score
    if (data?.id) {
      await calculateAndStoreHealthScore(userId, data.id);
    }

    res.json({
      success: true,
      data,
      message: 'Leading indicators saved successfully'
    });
  } catch (error) {
    console.error('Error in POST /leading-indicators:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// GET /api/leading-indicators/health-score/current
// Get current execution health score
// ============================================================================

router.get('/health-score/current', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const currentWeek = getCurrentWeekNumber();

    const { data, error } = await supabase
      .from('execution_health_scores')
      .select('*')
      .eq('user_id', userId)
      .eq('week_number', currentWeek)
      .order('score_date', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching health score:', error);
      return res.status(500).json({ error: 'Failed to fetch health score' });
    }

    res.json({
      success: true,
      data: data || null,
      week: currentWeek
    });
  } catch (error) {
    console.error('Error in GET /health-score/current:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// GET /api/leading-indicators/health-score/history
// Get historical health scores for trend visualization
// ============================================================================

router.get('/health-score/history', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const weeks = parseInt(req.query.weeks as string) || 12;

    const { data, error } = await supabase
      .from('execution_health_scores')
      .select('*')
      .eq('user_id', userId)
      .order('score_date', { ascending: false })
      .limit(weeks);

    if (error) {
      console.error('Error fetching health score history:', error);
      return res.status(500).json({ error: 'Failed to fetch history' });
    }

    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    });
  } catch (error) {
    console.error('Error in GET /health-score/history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// GET /api/leading-indicators/predictions/active
// Get active predictions (not yet validated)
// ============================================================================

router.get('/predictions/active', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data, error } = await supabase
      .from('predictions')
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
});

// ============================================================================
// GET /api/leading-indicators/predictions/past
// Get past predictions with validation status
// ============================================================================

router.get('/predictions/past', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data, error } = await supabase
      .from('predictions')
      .select('*')
      .eq('user_id', userId)
      .lt('prediction_target_date', new Date().toISOString().split('T')[0])
      .order('prediction_target_date', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching past predictions:', error);
      return res.status(500).json({ error: 'Failed to fetch predictions' });
    }

    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    });
  } catch (error) {
    console.error('Error in GET /predictions/past:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// PUT /api/leading-indicators/predictions/:id/validate
// Validate a prediction with actual outcome
// ============================================================================

router.put('/predictions/:id/validate', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { actual_value } = req.body;

    if (typeof actual_value !== 'number') {
      return res.status(400).json({ error: 'actual_value must be a number' });
    }

    // Fetch the prediction
    const { data: prediction, error: fetchError } = await supabase
      .from('predictions')
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

    // Update prediction
    const { data, error } = await supabase
      .from('predictions')
      .update({
        is_validated: true,
        actual_value,
        accuracy_percentage: accuracy,
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
      message: `Prediction validated: ${accuracy.toFixed(1)}% accurate`
    });
  } catch (error) {
    console.error('Error in PUT /predictions/:id/validate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// GET /api/leading-indicators/alerts/active
// Get active execution alerts
// ============================================================================

router.get('/alerts/active', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data, error } = await supabase
      .from('execution_alerts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_dismissed', false)
      .eq('is_resolved', false)
      .order('severity', { ascending: true }) // critical first
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching active alerts:', error);
      return res.status(500).json({ error: 'Failed to fetch alerts' });
    }

    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    });
  } catch (error) {
    console.error('Error in GET /alerts/active:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// PUT /api/leading-indicators/alerts/:id/dismiss
// Dismiss an alert
// ============================================================================

router.put('/alerts/:id/dismiss', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    const { data, error } = await supabase
      .from('execution_alerts')
      .update({
        is_dismissed: true,
        dismissed_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error dismissing alert:', error);
      return res.status(500).json({ error: 'Failed to dismiss alert' });
    }

    res.json({
      success: true,
      data,
      message: 'Alert dismissed'
    });
  } catch (error) {
    console.error('Error in PUT /alerts/:id/dismiss:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// GET /api/leading-indicators/benchmarks
// Get industry benchmark data
// ============================================================================

router.get('/benchmarks', authenticate, async (req: Request, res: Response) => {
  try {
    const industry = req.query.industry as string || 'B2B SaaS';
    const stage = req.query.stage as string || 'Series A';

    const { data, error } = await supabase
      .from('benchmark_data')
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
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getCurrentWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.ceil(diff / oneWeek);
}

async function calculateAndStoreHealthScore(userId: string, leadingIndicatorId: string) {
  try {
    // Call the Postgres function
    const { data, error } = await supabase.rpc('calculate_execution_health_score', {
      p_user_id: userId,
      p_leading_indicator_id: leadingIndicatorId
    });

    if (error) {
      console.error('Error calculating health score:', error);
    } else {
      console.log(`Health score calculated: ${data}`);
    }

    return data;
  } catch (error) {
    console.error('Error in calculateAndStoreHealthScore:', error);
    return null;
  }
}

function calculatePredictionAccuracy(predicted: number, actual: number): number {
  if (predicted === 0) return 0;
  const diff = Math.abs(predicted - actual);
  const accuracy = Math.max(0, 100 - (diff / predicted) * 100);
  return Math.round(accuracy * 10) / 10; // Round to 1 decimal
}

export default router;
