-- ===============================================
-- LEADING INDICATORS SYSTEM
-- Date: 2025-01-14
-- Purpose: Track systematic execution behaviors that predict revenue outcomes
-- Author: Senior Full-Stack Engineer (PLG-Focused)
-- ===============================================

-- ===============================================
-- TABLE: leading_indicators
-- Purpose: Tracks the 12 core leading indicators that predict revenue performance
-- ===============================================

CREATE TABLE IF NOT EXISTS leading_indicators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Timestamp for this snapshot
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  week_number INTEGER NOT NULL,

  -- ========================================================================
  -- CATEGORY 1: ICP Precision (Predicts: Pipeline Quality, Close Rate)
  -- ========================================================================

  -- Indicator 1: ICP Targeting Rate
  icp_targeting_rate DECIMAL(5,2),
  icp_companies_contacted INTEGER DEFAULT 0,
  total_companies_contacted INTEGER DEFAULT 0,

  -- Indicator 2: ICP Match Score
  avg_icp_match_score DECIMAL(5,2),
  pipeline_icp_scores JSONB DEFAULT '[]'::jsonb,

  -- Indicator 3: ICP Drift Rate
  icp_drift_rate DECIMAL(5,2),
  baseline_icp_targeting_rate DECIMAL(5,2),

  -- ========================================================================
  -- CATEGORY 2: Messaging Quality (Predicts: Response Rate, Meeting Conv)
  -- ========================================================================

  -- Indicator 4: Tech-to-Buyer Translation Adoption
  translation_adoption_rate DECIMAL(5,2),
  messages_with_translation INTEGER DEFAULT 0,
  total_messages_sent INTEGER DEFAULT 0,

  -- Indicator 5: Persona-Message Matching Score
  persona_matching_score DECIMAL(5,2),
  correctly_matched_messages INTEGER DEFAULT 0,

  -- Indicator 6: Messaging Iteration Velocity
  message_variants_tested INTEGER DEFAULT 0,
  messaging_iterations_per_week DECIMAL(5,2),

  -- ========================================================================
  -- CATEGORY 3: Systematic Execution (Predicts: Pipeline Velocity, Deal Flow)
  -- ========================================================================

  -- Indicator 7: Outreach Cadence Consistency
  weekly_contact_count INTEGER DEFAULT 0,
  cadence_consistency_weeks INTEGER DEFAULT 0,
  cadence_target_min INTEGER DEFAULT 15,
  cadence_target_max INTEGER DEFAULT 20,

  -- Indicator 8: Referral Engine Activation Rate
  referral_forwards_sent INTEGER DEFAULT 0,
  referral_requests_made INTEGER DEFAULT 0,
  referral_activation_rate DECIMAL(5,2),

  -- Indicator 9: Multi-Persona Engagement Rate
  avg_personas_per_deal DECIMAL(5,2),
  multi_persona_deals INTEGER DEFAULT 0,
  total_active_deals INTEGER DEFAULT 0,

  -- ========================================================================
  -- CATEGORY 4: Learning Velocity (Predicts: Long-Term Capability)
  -- ========================================================================

  -- Indicator 10: ICP Refinement Cycles
  icp_refinement_count INTEGER DEFAULT 0,
  days_since_last_icp_update INTEGER,

  -- Indicator 11: Persona Validation Rate
  persona_validations INTEGER DEFAULT 0,
  persona_validation_rate DECIMAL(5,2),

  -- Indicator 12: Translation Effectiveness Score
  translation_response_rates JSONB DEFAULT '{}'::jsonb,
  best_performing_variant_id TEXT,
  best_performing_response_rate DECIMAL(5,2),

  -- ========================================================================
  -- METADATA
  -- ========================================================================

  data_source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_user_week UNIQUE(user_id, week_number, snapshot_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leading_indicators_user_id ON leading_indicators(user_id);
CREATE INDEX IF NOT EXISTS idx_leading_indicators_week ON leading_indicators(week_number);
CREATE INDEX IF NOT EXISTS idx_leading_indicators_date ON leading_indicators(snapshot_date DESC);

-- Trigger
DROP TRIGGER IF EXISTS update_leading_indicators_updated_at ON leading_indicators;
CREATE TRIGGER update_leading_indicators_updated_at
  BEFORE UPDATE ON leading_indicators
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE leading_indicators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own leading indicators" ON leading_indicators;
CREATE POLICY "Users can view their own leading indicators" ON leading_indicators
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own leading indicators" ON leading_indicators;
CREATE POLICY "Users can insert their own leading indicators" ON leading_indicators
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own leading indicators" ON leading_indicators;
CREATE POLICY "Users can update their own leading indicators" ON leading_indicators
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access to leading indicators" ON leading_indicators;
CREATE POLICY "Service role full access to leading indicators" ON leading_indicators
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE leading_indicators;

-- Permissions
GRANT ALL ON leading_indicators TO authenticated;

-- Comments
COMMENT ON TABLE leading_indicators IS 'Tracks systematic execution behaviors that predict revenue outcomes 4-8 weeks in advance';
COMMENT ON COLUMN leading_indicators.icp_targeting_rate IS 'Percentage of outreach going to Pure Signal ICP-fit companies (predicts close rate)';
COMMENT ON COLUMN leading_indicators.translation_adoption_rate IS 'Percentage of messages using persona-specific tech-to-buyer translation (predicts response rate)';
COMMENT ON COLUMN leading_indicators.weekly_contact_count IS 'Number of ICP-fit contacts made this week (predicts pipeline velocity)';

-- ===============================================
-- TABLE: execution_health_scores
-- Purpose: Composite scores calculated from leading indicators
-- ===============================================

CREATE TABLE IF NOT EXISTS execution_health_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leading_indicator_id UUID REFERENCES leading_indicators(id) ON DELETE CASCADE,

  -- Composite score (0-100)
  overall_score DECIMAL(5,2) NOT NULL,

  -- Category scores (0-100 each)
  icp_precision_score DECIMAL(5,2) NOT NULL,
  messaging_quality_score DECIMAL(5,2) NOT NULL,
  systematic_execution_score DECIMAL(5,2) NOT NULL,
  learning_velocity_score DECIMAL(5,2) NOT NULL,

  -- Score metadata
  score_date DATE NOT NULL DEFAULT CURRENT_DATE,
  week_number INTEGER NOT NULL,

  -- Contextual data
  score_tier TEXT CHECK (score_tier IN ('excellent', 'good', 'fair', 'needs_improvement')),
  confidence_level DECIMAL(5,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_user_score_week UNIQUE(user_id, week_number, score_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_health_scores_user_id ON execution_health_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_health_scores_date ON execution_health_scores(score_date DESC);

-- Trigger
DROP TRIGGER IF EXISTS update_execution_health_scores_updated_at ON execution_health_scores;
CREATE TRIGGER update_execution_health_scores_updated_at
  BEFORE UPDATE ON execution_health_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE execution_health_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own health scores" ON execution_health_scores;
CREATE POLICY "Users can view their own health scores" ON execution_health_scores
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own health scores" ON execution_health_scores;
CREATE POLICY "Users can insert their own health scores" ON execution_health_scores
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access to health scores" ON execution_health_scores;
CREATE POLICY "Service role full access to health scores" ON execution_health_scores
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE execution_health_scores;

-- Permissions
GRANT ALL ON execution_health_scores TO authenticated;

-- Comments
COMMENT ON TABLE execution_health_scores IS 'Composite scores (0-100) calculated from leading indicators using weighted algorithm';
COMMENT ON COLUMN execution_health_scores.overall_score IS 'Composite execution capability score: 30% ICP + 25% Messaging + 25% Execution + 20% Learning';

-- ===============================================
-- TABLE: predictions
-- Purpose: Stores predictions made based on leading indicators
-- ===============================================

CREATE TABLE IF NOT EXISTS predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leading_indicator_id UUID REFERENCES leading_indicators(id) ON DELETE CASCADE,

  -- What we're predicting
  prediction_type TEXT NOT NULL,
  predicted_value DECIMAL(10,2) NOT NULL,
  predicted_value_unit TEXT,

  -- Prediction bounds
  prediction_min DECIMAL(10,2),
  prediction_max DECIMAL(10,2),
  confidence_level DECIMAL(5,2) NOT NULL,

  -- Timeline
  prediction_made_at TIMESTAMPTZ DEFAULT NOW(),
  prediction_target_date DATE NOT NULL,
  prediction_target_week INTEGER NOT NULL,

  -- Context about what led to this prediction
  based_on_indicators JSONB DEFAULT '{}'::jsonb,
  prediction_logic TEXT,

  -- Validation status
  is_validated BOOLEAN DEFAULT FALSE,
  actual_value DECIMAL(10,2),
  validated_at TIMESTAMPTZ,
  accuracy_percentage DECIMAL(5,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_target_date ON predictions(prediction_target_date);
CREATE INDEX IF NOT EXISTS idx_predictions_type ON predictions(prediction_type);
CREATE INDEX IF NOT EXISTS idx_predictions_validated ON predictions(is_validated);

-- Trigger
DROP TRIGGER IF EXISTS update_predictions_updated_at ON predictions;
CREATE TRIGGER update_predictions_updated_at
  BEFORE UPDATE ON predictions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own predictions" ON predictions;
CREATE POLICY "Users can view their own predictions" ON predictions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own predictions" ON predictions;
CREATE POLICY "Users can insert their own predictions" ON predictions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own predictions" ON predictions;
CREATE POLICY "Users can update their own predictions" ON predictions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access to predictions" ON predictions;
CREATE POLICY "Service role full access to predictions" ON predictions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE predictions;

-- Permissions
GRANT ALL ON predictions TO authenticated;

-- Comments
COMMENT ON TABLE predictions IS 'Stores predictions made based on current leading indicators, validated against actual outcomes later';
COMMENT ON COLUMN predictions.confidence_level IS 'Statistical confidence in prediction accuracy (0-100%), based on historical pattern matching';

-- ===============================================
-- TABLE: execution_alerts
-- Purpose: Warnings when leading indicators drop below thresholds
-- ===============================================

CREATE TABLE IF NOT EXISTS execution_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leading_indicator_id UUID REFERENCES leading_indicators(id) ON DELETE CASCADE,

  -- Alert details
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),

  -- Alert content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  recommended_action TEXT,

  -- Impact prediction
  predicted_impact TEXT,
  impact_timeline_weeks INTEGER,

  -- Alert state
  is_dismissed BOOLEAN DEFAULT FALSE,
  dismissed_at TIMESTAMPTZ,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON execution_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON execution_alerts(is_dismissed, is_resolved);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON execution_alerts(severity);

-- Trigger
DROP TRIGGER IF EXISTS update_execution_alerts_updated_at ON execution_alerts;
CREATE TRIGGER update_execution_alerts_updated_at
  BEFORE UPDATE ON execution_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE execution_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own alerts" ON execution_alerts;
CREATE POLICY "Users can view their own alerts" ON execution_alerts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own alerts" ON execution_alerts;
CREATE POLICY "Users can insert their own alerts" ON execution_alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own alerts" ON execution_alerts;
CREATE POLICY "Users can update their own alerts" ON execution_alerts
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access to alerts" ON execution_alerts;
CREATE POLICY "Service role full access to alerts" ON execution_alerts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE execution_alerts;

-- Permissions
GRANT ALL ON execution_alerts TO authenticated;

-- Comments
COMMENT ON TABLE execution_alerts IS 'Warnings triggered when leading indicators drop below critical thresholds';

-- ===============================================
-- TABLE: benchmark_data
-- Purpose: Industry benchmarks for comparison
-- ===============================================

CREATE TABLE IF NOT EXISTS benchmark_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Benchmark context
  industry TEXT DEFAULT 'B2B SaaS',
  company_stage TEXT DEFAULT 'Series A',

  -- Leading indicator benchmarks
  benchmark_icp_targeting_rate DECIMAL(5,2) DEFAULT 60.0,
  benchmark_translation_adoption DECIMAL(5,2) DEFAULT 35.0,
  benchmark_weekly_cadence INTEGER DEFAULT 12,
  benchmark_response_rate DECIMAL(5,2) DEFAULT 5.0,

  -- Outcome benchmarks
  benchmark_close_rate DECIMAL(5,2) DEFAULT 18.0,
  benchmark_sales_cycle_days INTEGER DEFAULT 120,
  benchmark_meeting_conversion DECIMAL(5,2) DEFAULT 20.0,

  -- Metadata
  source TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_benchmark_industry ON benchmark_data(industry);
CREATE INDEX IF NOT EXISTS idx_benchmark_stage ON benchmark_data(company_stage);

-- Trigger
DROP TRIGGER IF EXISTS update_benchmark_data_updated_at ON benchmark_data;
CREATE TRIGGER update_benchmark_data_updated_at
  BEFORE UPDATE ON benchmark_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (benchmarks are public data)
ALTER TABLE benchmark_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view benchmarks" ON benchmark_data;
CREATE POLICY "Anyone can view benchmarks" ON benchmark_data
  FOR SELECT
  TO authenticated
  USING (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE benchmark_data;

-- Permissions
GRANT SELECT ON benchmark_data TO authenticated;

-- Comments
COMMENT ON TABLE benchmark_data IS 'Industry benchmarks for Series A B2B SaaS companies (from Bridge Group, SBI, Pavilion research)';

-- Insert default benchmark data
INSERT INTO benchmark_data (industry, company_stage, source) VALUES
('B2B SaaS', 'Series A', 'Industry research: Bridge Group, Sales Benchmark Index, Pavilion 2024')
ON CONFLICT DO NOTHING;

-- ===============================================
-- FUNCTION: Calculate Execution Health Score
-- Purpose: Auto-calculate composite score from leading indicators
-- ===============================================

CREATE OR REPLACE FUNCTION calculate_execution_health_score(
  p_user_id UUID,
  p_leading_indicator_id UUID
) RETURNS DECIMAL(5,2)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_icp_score DECIMAL(5,2);
  v_messaging_score DECIMAL(5,2);
  v_execution_score DECIMAL(5,2);
  v_learning_score DECIMAL(5,2);
  v_overall_score DECIMAL(5,2);
  v_indicator RECORD;
BEGIN
  -- Fetch the leading indicator record
  SELECT * INTO v_indicator FROM leading_indicators WHERE id = p_leading_indicator_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Calculate ICP Precision Score (30% weight)
  v_icp_score := COALESCE(
    (v_indicator.icp_targeting_rate * 0.5) +
    (v_indicator.avg_icp_match_score * 0.3) +
    ((100 - COALESCE(v_indicator.icp_drift_rate, 0)) * 0.2),
    0
  );

  -- Calculate Messaging Quality Score (25% weight)
  v_messaging_score := COALESCE(
    (v_indicator.translation_adoption_rate * 0.5) +
    (v_indicator.persona_matching_score * 0.3) +
    (LEAST(v_indicator.message_variants_tested * 10, 100) * 0.2),
    0
  );

  -- Calculate Systematic Execution Score (25% weight)
  v_execution_score := COALESCE(
    (CASE
      WHEN v_indicator.weekly_contact_count >= v_indicator.cadence_target_min
           AND v_indicator.weekly_contact_count <= v_indicator.cadence_target_max
      THEN 100.0
      WHEN v_indicator.weekly_contact_count < v_indicator.cadence_target_min
      THEN (v_indicator.weekly_contact_count::DECIMAL / v_indicator.cadence_target_min) * 100
      ELSE 100.0
    END * 0.4) +
    (COALESCE(v_indicator.referral_activation_rate, 0) * 0.3) +
    (LEAST(COALESCE(v_indicator.avg_personas_per_deal, 0) * 25, 100) * 0.3),
    0
  );

  -- Calculate Learning Velocity Score (20% weight)
  v_learning_score := COALESCE(
    (LEAST(v_indicator.icp_refinement_count * 50, 100) * 0.4) +
    (COALESCE(v_indicator.persona_validation_rate, 0) * 0.3) +
    (LEAST(COALESCE(v_indicator.best_performing_response_rate, 0) * 5, 100) * 0.3),
    0
  );

  -- Calculate overall score (weighted average)
  v_overall_score :=
    (v_icp_score * 0.30) +
    (v_messaging_score * 0.25) +
    (v_execution_score * 0.25) +
    (v_learning_score * 0.20);

  -- Insert into execution_health_scores table
  INSERT INTO execution_health_scores (
    user_id,
    leading_indicator_id,
    overall_score,
    icp_precision_score,
    messaging_quality_score,
    systematic_execution_score,
    learning_velocity_score,
    score_date,
    week_number,
    score_tier,
    confidence_level
  ) VALUES (
    p_user_id,
    p_leading_indicator_id,
    v_overall_score,
    v_icp_score,
    v_messaging_score,
    v_execution_score,
    v_learning_score,
    CURRENT_DATE,
    EXTRACT(WEEK FROM CURRENT_DATE)::INTEGER,
    CASE
      WHEN v_overall_score >= 85 THEN 'excellent'
      WHEN v_overall_score >= 70 THEN 'good'
      WHEN v_overall_score >= 50 THEN 'fair'
      ELSE 'needs_improvement'
    END,
    90.0
  )
  ON CONFLICT (user_id, week_number, score_date)
  DO UPDATE SET
    overall_score = EXCLUDED.overall_score,
    icp_precision_score = EXCLUDED.icp_precision_score,
    messaging_quality_score = EXCLUDED.messaging_quality_score,
    systematic_execution_score = EXCLUDED.systematic_execution_score,
    learning_velocity_score = EXCLUDED.learning_velocity_score,
    score_tier = EXCLUDED.score_tier;

  RETURN v_overall_score;
END;
$$ LANGUAGE plpgsql;

-- Comments on function
COMMENT ON FUNCTION calculate_execution_health_score IS 'Calculates composite execution health score from leading indicators: 30% ICP + 25% Messaging + 25% Execution + 20% Learning';
