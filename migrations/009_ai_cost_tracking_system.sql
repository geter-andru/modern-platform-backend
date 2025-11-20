-- =====================================================
-- AI COST TRACKING SYSTEM
-- Migration: 009
-- Created: 2025-11-19
-- Purpose: Track AI API usage, token consumption, and costs for unit economics
-- =====================================================

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS ai_usage_metrics CASCADE;
DROP TABLE IF EXISTS ai_cost_daily_summary CASCADE;

-- =====================================================
-- 1. AI USAGE METRICS TABLE
-- =====================================================
-- Stores individual AI API calls with token usage and cost data

CREATE TABLE ai_usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tracking metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Operation details
  operation TEXT NOT NULL, -- e.g., 'generateICP', 'generatePersonas', 'rateCompany'
  model TEXT NOT NULL, -- e.g., 'claude-3-opus-20240229', 'claude-3-5-haiku-20241022'
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error_message TEXT, -- Populated if success = false

  -- Performance metrics
  duration_ms INTEGER NOT NULL, -- Duration in milliseconds
  retry_count INTEGER DEFAULT 0,

  -- Token usage (from Anthropic API response)
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,

  -- Cost calculation
  estimated_cost_usd DECIMAL(10, 6) NOT NULL, -- Cost in dollars (6 decimal precision)

  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb, -- Flexible field for extra data

  -- Indexes for common queries
  CONSTRAINT valid_tokens CHECK (input_tokens >= 0 AND output_tokens >= 0),
  CONSTRAINT valid_cost CHECK (estimated_cost_usd >= 0)
);

-- Indexes for performance
CREATE INDEX idx_ai_usage_metrics_user_id ON ai_usage_metrics(user_id);
CREATE INDEX idx_ai_usage_metrics_created_at ON ai_usage_metrics(created_at DESC);
CREATE INDEX idx_ai_usage_metrics_operation ON ai_usage_metrics(operation);
CREATE INDEX idx_ai_usage_metrics_model ON ai_usage_metrics(model);
CREATE INDEX idx_ai_usage_metrics_success ON ai_usage_metrics(success);
CREATE INDEX idx_ai_usage_metrics_user_created ON ai_usage_metrics(user_id, created_at DESC);

-- Composite index for common dashboard queries
CREATE INDEX idx_ai_usage_metrics_dashboard ON ai_usage_metrics(created_at DESC, operation, success)
  INCLUDE (estimated_cost_usd, total_tokens);

-- Enable Row Level Security
ALTER TABLE ai_usage_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admin users can see all metrics
CREATE POLICY "Admin users can view all ai_usage_metrics"
  ON ai_usage_metrics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Users can only see their own metrics
CREATE POLICY "Users can view their own ai_usage_metrics"
  ON ai_usage_metrics
  FOR SELECT
  USING (user_id = auth.uid());

-- Service role can insert metrics (for backend API)
CREATE POLICY "Service role can insert ai_usage_metrics"
  ON ai_usage_metrics
  FOR INSERT
  WITH CHECK (TRUE); -- Backend will use service role key

COMMENT ON TABLE ai_usage_metrics IS 'Tracks individual AI API calls with token usage and cost data for unit economics analysis';
COMMENT ON COLUMN ai_usage_metrics.operation IS 'AI operation type (e.g., generateICP, generatePersonas)';
COMMENT ON COLUMN ai_usage_metrics.model IS 'Claude model used (e.g., claude-3-opus-20240229)';
COMMENT ON COLUMN ai_usage_metrics.duration_ms IS 'API call duration in milliseconds';
COMMENT ON COLUMN ai_usage_metrics.input_tokens IS 'Number of input tokens consumed';
COMMENT ON COLUMN ai_usage_metrics.output_tokens IS 'Number of output tokens generated';
COMMENT ON COLUMN ai_usage_metrics.estimated_cost_usd IS 'Estimated cost in USD based on token usage and model pricing';

-- =====================================================
-- 2. AI COST DAILY SUMMARY TABLE
-- =====================================================
-- Stores aggregated daily costs for faster dashboard queries

CREATE TABLE ai_cost_daily_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Date tracking
  date DATE NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Aggregated metrics
  total_calls INTEGER NOT NULL DEFAULT 0,
  successful_calls INTEGER NOT NULL DEFAULT 0,
  failed_calls INTEGER NOT NULL DEFAULT 0,

  -- Token aggregates
  total_input_tokens BIGINT NOT NULL DEFAULT 0,
  total_output_tokens BIGINT NOT NULL DEFAULT 0,
  total_tokens BIGINT GENERATED ALWAYS AS (total_input_tokens + total_output_tokens) STORED,

  -- Cost aggregates
  total_cost_usd DECIMAL(12, 6) NOT NULL DEFAULT 0,

  -- Per-operation breakdown (JSONB for flexibility)
  operations_breakdown JSONB DEFAULT '{}'::jsonb,
  -- Example: {"generateICP": {"calls": 50, "cost": 7.35}, "generatePersonas": {"calls": 30, "cost": 1.74}}

  -- Per-model breakdown
  models_breakdown JSONB DEFAULT '{}'::jsonb,
  -- Example: {"claude-3-opus-20240229": {"calls": 60, "cost": 8.82}, "claude-3-5-haiku-20241022": {"calls": 20, "cost": 0.10}}

  CONSTRAINT valid_daily_calls CHECK (total_calls >= 0),
  CONSTRAINT valid_daily_cost CHECK (total_cost_usd >= 0)
);

-- Indexes
CREATE INDEX idx_ai_cost_daily_summary_date ON ai_cost_daily_summary(date DESC);

-- Enable Row Level Security
ALTER TABLE ai_cost_daily_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policies (admin only)
CREATE POLICY "Admin users can view ai_cost_daily_summary"
  ON ai_cost_daily_summary
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Service role can insert/update summaries
CREATE POLICY "Service role can manage ai_cost_daily_summary"
  ON ai_cost_daily_summary
  FOR ALL
  USING (TRUE)
  WITH CHECK (TRUE);

COMMENT ON TABLE ai_cost_daily_summary IS 'Aggregated daily AI cost summaries for fast dashboard queries';
COMMENT ON COLUMN ai_cost_daily_summary.operations_breakdown IS 'JSON breakdown of costs by operation type';
COMMENT ON COLUMN ai_cost_daily_summary.models_breakdown IS 'JSON breakdown of costs by AI model';

-- =====================================================
-- 3. HELPER FUNCTIONS
-- =====================================================

-- Function to aggregate daily summaries
CREATE OR REPLACE FUNCTION aggregate_ai_costs_for_date(target_date DATE)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_calls INTEGER;
  v_successful_calls INTEGER;
  v_failed_calls INTEGER;
  v_total_input_tokens BIGINT;
  v_total_output_tokens BIGINT;
  v_total_cost DECIMAL(12, 6);
  v_operations_breakdown JSONB;
  v_models_breakdown JSONB;
BEGIN
  -- Aggregate metrics for the target date
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE success = true),
    COUNT(*) FILTER (WHERE success = false),
    COALESCE(SUM(input_tokens), 0),
    COALESCE(SUM(output_tokens), 0),
    COALESCE(SUM(estimated_cost_usd), 0)
  INTO
    v_total_calls,
    v_successful_calls,
    v_failed_calls,
    v_total_input_tokens,
    v_total_output_tokens,
    v_total_cost
  FROM ai_usage_metrics
  WHERE DATE(created_at) = target_date;

  -- Aggregate by operation
  SELECT jsonb_object_agg(
    operation,
    jsonb_build_object(
      'calls', call_count,
      'cost', total_cost,
      'tokens', total_tokens
    )
  )
  INTO v_operations_breakdown
  FROM (
    SELECT
      operation,
      COUNT(*) as call_count,
      COALESCE(SUM(estimated_cost_usd), 0) as total_cost,
      COALESCE(SUM(total_tokens), 0) as total_tokens
    FROM ai_usage_metrics
    WHERE DATE(created_at) = target_date
    GROUP BY operation
  ) op_agg;

  -- Aggregate by model
  SELECT jsonb_object_agg(
    model,
    jsonb_build_object(
      'calls', call_count,
      'cost', total_cost,
      'tokens', total_tokens
    )
  )
  INTO v_models_breakdown
  FROM (
    SELECT
      model,
      COUNT(*) as call_count,
      COALESCE(SUM(estimated_cost_usd), 0) as total_cost,
      COALESCE(SUM(total_tokens), 0) as total_tokens
    FROM ai_usage_metrics
    WHERE DATE(created_at) = target_date
    GROUP BY model
  ) model_agg;

  -- Insert or update summary
  INSERT INTO ai_cost_daily_summary (
    date,
    total_calls,
    successful_calls,
    failed_calls,
    total_input_tokens,
    total_output_tokens,
    total_cost_usd,
    operations_breakdown,
    models_breakdown,
    updated_at
  )
  VALUES (
    target_date,
    v_total_calls,
    v_successful_calls,
    v_failed_calls,
    v_total_input_tokens,
    v_total_output_tokens,
    v_total_cost,
    COALESCE(v_operations_breakdown, '{}'::jsonb),
    COALESCE(v_models_breakdown, '{}'::jsonb),
    NOW()
  )
  ON CONFLICT (date)
  DO UPDATE SET
    total_calls = EXCLUDED.total_calls,
    successful_calls = EXCLUDED.successful_calls,
    failed_calls = EXCLUDED.failed_calls,
    total_input_tokens = EXCLUDED.total_input_tokens,
    total_output_tokens = EXCLUDED.total_output_tokens,
    total_cost_usd = EXCLUDED.total_cost_usd,
    operations_breakdown = EXCLUDED.operations_breakdown,
    models_breakdown = EXCLUDED.models_breakdown,
    updated_at = NOW();

END;
$$;

COMMENT ON FUNCTION aggregate_ai_costs_for_date(DATE) IS 'Aggregates AI usage metrics into daily summary for a specific date';

-- Function to get today's costs in real-time
CREATE OR REPLACE FUNCTION get_todays_ai_costs()
RETURNS TABLE (
  total_calls BIGINT,
  successful_calls BIGINT,
  failed_calls BIGINT,
  total_cost_usd DECIMAL(12, 6),
  total_tokens BIGINT,
  operations_breakdown JSONB,
  models_breakdown JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_calls,
    COUNT(*) FILTER (WHERE success = true) as successful_calls,
    COUNT(*) FILTER (WHERE success = false) as failed_calls,
    COALESCE(SUM(estimated_cost_usd), 0) as total_cost_usd,
    COALESCE(SUM(ai_usage_metrics.total_tokens), 0) as total_tokens,
    (
      SELECT jsonb_object_agg(
        operation,
        jsonb_build_object('calls', COUNT(*), 'cost', COALESCE(SUM(estimated_cost_usd), 0))
      )
      FROM ai_usage_metrics
      WHERE DATE(created_at) = CURRENT_DATE
      GROUP BY operation
    ) as operations_breakdown,
    (
      SELECT jsonb_object_agg(
        model,
        jsonb_build_object('calls', COUNT(*), 'cost', COALESCE(SUM(estimated_cost_usd), 0))
      )
      FROM ai_usage_metrics
      WHERE DATE(created_at) = CURRENT_DATE
      GROUP BY model
    ) as models_breakdown
  FROM ai_usage_metrics
  WHERE DATE(created_at) = CURRENT_DATE;
END;
$$;

COMMENT ON FUNCTION get_todays_ai_costs() IS 'Returns real-time AI costs for today (bypasses daily summary for freshness)';

-- Function to get monthly costs
CREATE OR REPLACE FUNCTION get_monthly_ai_costs(target_month DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  month DATE,
  total_calls BIGINT,
  total_cost_usd DECIMAL(12, 6),
  total_tokens BIGINT,
  avg_cost_per_call DECIMAL(10, 6),
  avg_tokens_per_call INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE_TRUNC('month', target_month)::DATE as month,
    COALESCE(SUM(ai_cost_daily_summary.total_calls), 0)::BIGINT as total_calls,
    COALESCE(SUM(total_cost_usd), 0) as total_cost_usd,
    COALESCE(SUM(ai_cost_daily_summary.total_tokens), 0)::BIGINT as total_tokens,
    CASE
      WHEN COALESCE(SUM(ai_cost_daily_summary.total_calls), 0) > 0
      THEN (COALESCE(SUM(total_cost_usd), 0) / SUM(ai_cost_daily_summary.total_calls))
      ELSE 0
    END as avg_cost_per_call,
    CASE
      WHEN COALESCE(SUM(ai_cost_daily_summary.total_calls), 0) > 0
      THEN (COALESCE(SUM(ai_cost_daily_summary.total_tokens), 0) / SUM(ai_cost_daily_summary.total_calls))::INTEGER
      ELSE 0
    END as avg_tokens_per_call
  FROM ai_cost_daily_summary
  WHERE date >= DATE_TRUNC('month', target_month)
    AND date < (DATE_TRUNC('month', target_month) + INTERVAL '1 month');
END;
$$;

COMMENT ON FUNCTION get_monthly_ai_costs(DATE) IS 'Returns aggregated AI costs for a specific month';

-- =====================================================
-- 4. SAMPLE DATA (for testing)
-- =====================================================
-- Insert sample data to test the system

-- Sample AI usage metrics (past 7 days)
-- DO $$
-- DECLARE
--   sample_date DATE;
--   i INTEGER;
-- BEGIN
--   FOR i IN 0..6 LOOP
--     sample_date := CURRENT_DATE - i;

--     -- Insert sample ICP generation calls
--     INSERT INTO ai_usage_metrics (operation, model, success, duration_ms, input_tokens, output_tokens, estimated_cost_usd, created_at)
--     VALUES
--       ('generateICP', 'claude-3-opus-20240229', true, 12500, 800, 1800, 0.147, sample_date + TIME '10:00:00'),
--       ('generateICP', 'claude-3-opus-20240229', true, 15000, 850, 1750, 0.144, sample_date + TIME '14:30:00');

--     -- Insert sample persona generation calls
--     INSERT INTO ai_usage_metrics (operation, model, success, duration_ms, input_tokens, output_tokens, estimated_cost_usd, created_at)
--     VALUES
--       ('generatePersonas', 'claude-3-5-sonnet-20241022', true, 18000, 1200, 3600, 0.058, sample_date + TIME '11:15:00');

--     -- Insert sample prospect discovery calls
--     INSERT INTO ai_usage_metrics (operation, model, success, duration_ms, input_tokens, output_tokens, estimated_cost_usd, created_at)
--     VALUES
--       ('prospectDiscovery', 'claude-3-5-haiku-20241022', true, 8000, 1000, 3600, 0.005, sample_date + TIME '16:00:00');

--     -- Aggregate for this date
--     PERFORM aggregate_ai_costs_for_date(sample_date);
--   END LOOP;
-- END $$;

-- =====================================================
-- 5. GRANTS
-- =====================================================

-- Grant permissions to authenticated users (via RLS)
GRANT SELECT ON ai_usage_metrics TO authenticated;
GRANT SELECT ON ai_cost_daily_summary TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_todays_ai_costs() TO authenticated;
GRANT EXECUTE ON FUNCTION get_monthly_ai_costs(DATE) TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Tables created: ai_usage_metrics, ai_cost_daily_summary
-- Functions created: aggregate_ai_costs_for_date, get_todays_ai_costs, get_monthly_ai_costs
-- RLS policies applied for security
-- =====================================================
