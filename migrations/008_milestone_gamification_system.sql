-- ===============================================
-- MILESTONE GAMIFICATION SYSTEM
-- Date: 2025-01-19
-- Purpose: Stealth gamification through milestone-driven resource unlocks
-- Author: Stealth Gamification Systems Architect
-- ===============================================
--
-- SYSTEM OVERVIEW:
-- This schema implements a stealth gamification system that drives revenue work
-- through milestone progression, action tracking, and threshold-based resource unlocks.
--
-- CORE CONCEPTS:
-- - Users progress through milestones M9-M14 (Initial PMF → Revenue Growth)
-- - Each milestone has 3 sub-milestones (18 total)
-- - Platform + Real-world actions add % progress toward sub-milestones
-- - At specific thresholds (25%, 50%, 75%, 100%), resources unlock
-- - 97 total resources across 4 tiers (Core, Advanced, Strategic, Implementation)
-- - Combo bonuses, evidence bonuses, and diminishing returns drive engagement
-- ===============================================

-- ===============================================
-- FUNCTION: update_updated_at_column (if not exists)
-- Purpose: Auto-update updated_at timestamp on row updates
-- ===============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- TABLE: milestones
-- Purpose: Master table of all milestone definitions (M9-M14)
-- ===============================================

CREATE TABLE IF NOT EXISTS milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Milestone Identification
  milestone_number INTEGER NOT NULL UNIQUE,
  milestone_code TEXT NOT NULL UNIQUE,

  -- Milestone Details
  name TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Business Context (from 32 Startup Milestones)
  arr_range_min INTEGER,
  arr_range_max INTEGER,
  user_count_min INTEGER,
  user_count_max INTEGER,

  -- Milestone Ordering
  sequence_order INTEGER NOT NULL,

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_milestone_number CHECK (milestone_number BETWEEN 9 AND 14)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_milestones_number ON milestones(milestone_number);
CREATE INDEX IF NOT EXISTS idx_milestones_code ON milestones(milestone_code);
CREATE INDEX IF NOT EXISTS idx_milestones_sequence ON milestones(sequence_order);

-- Trigger
DROP TRIGGER IF EXISTS update_milestones_updated_at ON milestones;
CREATE TRIGGER update_milestones_updated_at
    BEFORE UPDATE ON milestones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE milestones IS 'Master definition of M9-M14 milestones with business context (ARR ranges, user counts)';
COMMENT ON COLUMN milestones.milestone_code IS 'Unique code identifier (M9, M10, etc.)';
COMMENT ON COLUMN milestones.arr_range_min IS 'Minimum ARR for this milestone in USD';

-- ===============================================
-- TABLE: sub_milestones
-- Purpose: 3 sub-milestones per major milestone (18 total)
-- ===============================================

CREATE TABLE IF NOT EXISTS sub_milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Parent Milestone
  milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,

  -- Sub-Milestone Identification
  sub_milestone_code TEXT NOT NULL UNIQUE,
  sub_milestone_number INTEGER NOT NULL,

  -- Sub-Milestone Details
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  objective TEXT,

  -- Progression Configuration
  sequence_order INTEGER NOT NULL,

  -- Threshold Configuration (JSONB for flexibility)
  threshold_config JSONB DEFAULT '{
    "thresholds": [
      {"percentage": 25, "unlocks_count": 1},
      {"percentage": 50, "unlocks_count": 1},
      {"percentage": 75, "unlocks_count": 1},
      {"percentage": 100, "unlocks_count": 1}
    ],
    "random_bonus_chance": 10,
    "random_bonus_tier": "advanced"
  }'::jsonb,

  -- Pacing Strategy
  pacing_strategy TEXT DEFAULT 'standard',

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_sub_milestone_number CHECK (sub_milestone_number BETWEEN 1 AND 3)
);

-- Add unique constraint conditionally
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_milestone_sub_number'
  ) THEN
    ALTER TABLE sub_milestones
      ADD CONSTRAINT unique_milestone_sub_number UNIQUE(milestone_id, sub_milestone_number);
  END IF;
END$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sub_milestones_milestone ON sub_milestones(milestone_id);
CREATE INDEX IF NOT EXISTS idx_sub_milestones_code ON sub_milestones(sub_milestone_code);
CREATE INDEX IF NOT EXISTS idx_sub_milestones_active ON sub_milestones(is_active);

-- Trigger
DROP TRIGGER IF EXISTS update_sub_milestones_updated_at ON sub_milestones;
CREATE TRIGGER update_sub_milestones_updated_at
    BEFORE UPDATE ON sub_milestones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE sub_milestones IS '18 sub-milestones (3 per major milestone) with threshold unlock configuration';
COMMENT ON COLUMN sub_milestones.threshold_config IS 'JSONB configuration for threshold unlocks and bonuses';

-- ===============================================
-- TABLE: milestone_actions
-- Purpose: Definition of all trackable actions (platform + real-world)
-- ===============================================

CREATE TABLE IF NOT EXISTS milestone_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Action Identification
  action_code TEXT NOT NULL UNIQUE,
  action_name TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Action Classification
  category TEXT NOT NULL,
  is_platform_action BOOLEAN NOT NULL,

  -- Progress Configuration
  base_weight DECIMAL(5,2) NOT NULL,
  tier INTEGER NOT NULL,

  -- Frequency Controls (Prevent Gaming)
  max_per_day INTEGER,
  max_per_week INTEGER,
  cooldown_hours INTEGER,

  -- Diminishing Returns Configuration
  has_diminishing_returns BOOLEAN DEFAULT false,
  diminishing_returns_schedule JSONB DEFAULT '{
    "1st": 100,
    "2nd": 50,
    "3rd": 25,
    "4th+": 0
  }'::jsonb,

  -- Evidence Bonus Configuration
  has_evidence_bonus BOOLEAN DEFAULT false,
  evidence_bonus_percentage DECIMAL(5,2),
  evidence_types JSONB DEFAULT '[]'::jsonb,

  -- Combo Configuration
  combo_actions JSONB DEFAULT '[]'::jsonb,
  combo_bonus_percentage DECIMAL(5,2),
  combo_window_hours INTEGER DEFAULT 48,

  -- UI Hints
  estimated_time_minutes INTEGER,
  difficulty_level TEXT,

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_tier CHECK (tier BETWEEN 1 AND 5),
  CONSTRAINT valid_weight CHECK (base_weight > 0 AND base_weight <= 30)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_actions_code ON milestone_actions(action_code);
CREATE INDEX IF NOT EXISTS idx_actions_platform ON milestone_actions(is_platform_action);
CREATE INDEX IF NOT EXISTS idx_actions_tier ON milestone_actions(tier);
CREATE INDEX IF NOT EXISTS idx_actions_category ON milestone_actions(category);

-- Trigger
DROP TRIGGER IF EXISTS update_milestone_actions_updated_at ON milestone_actions;
CREATE TRIGGER update_milestone_actions_updated_at
    BEFORE UPDATE ON milestone_actions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE milestone_actions IS 'Definition of all trackable platform and real-world actions with weighting and constraints';
COMMENT ON COLUMN milestone_actions.base_weight IS 'Base percentage this action adds to progress (0-30)';

-- ===============================================
-- TABLE: sub_milestone_action_mappings
-- Purpose: Maps which actions contribute to which sub-milestones
-- ===============================================

CREATE TABLE IF NOT EXISTS sub_milestone_action_mappings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  sub_milestone_id UUID NOT NULL REFERENCES sub_milestones(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES milestone_actions(id) ON DELETE CASCADE,

  -- Weight Override
  weight_override DECIMAL(5,2),

  -- Recommended Priority
  is_recommended BOOLEAN DEFAULT false,
  recommended_priority INTEGER,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint conditionally
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_sub_milestone_action'
  ) THEN
    ALTER TABLE sub_milestone_action_mappings
      ADD CONSTRAINT unique_sub_milestone_action UNIQUE(sub_milestone_id, action_id);
  END IF;
END$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mappings_sub_milestone ON sub_milestone_action_mappings(sub_milestone_id);
CREATE INDEX IF NOT EXISTS idx_mappings_action ON sub_milestone_action_mappings(action_id);
CREATE INDEX IF NOT EXISTS idx_mappings_recommended ON sub_milestone_action_mappings(is_recommended, recommended_priority);

-- Trigger
DROP TRIGGER IF EXISTS update_sub_milestone_action_mappings_updated_at ON sub_milestone_action_mappings;
CREATE TRIGGER update_sub_milestone_action_mappings_updated_at
    BEFORE UPDATE ON sub_milestone_action_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE sub_milestone_action_mappings IS 'Maps which actions contribute to which sub-milestones with optional weight overrides';

-- ===============================================
-- TABLE: user_milestone_progress
-- Purpose: Tracks user's overall progress through milestone system
-- ===============================================

CREATE TABLE IF NOT EXISTS user_milestone_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,

  -- Progress Status
  status TEXT NOT NULL DEFAULT 'locked',

  -- Timestamps
  unlocked_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Completion Stats
  sub_milestones_completed INTEGER DEFAULT 0,
  total_sub_milestones INTEGER DEFAULT 3,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_status CHECK (status IN ('locked', 'active', 'completed'))
);

-- Add unique constraint conditionally
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_milestone'
  ) THEN
    ALTER TABLE user_milestone_progress
      ADD CONSTRAINT unique_user_milestone UNIQUE(user_id, milestone_id);
  END IF;
END$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_milestone_progress_user ON user_milestone_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_milestone_progress_status ON user_milestone_progress(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_milestone_progress_milestone ON user_milestone_progress(milestone_id);

-- Trigger
DROP TRIGGER IF EXISTS update_user_milestone_progress_updated_at ON user_milestone_progress;
CREATE TRIGGER update_user_milestone_progress_updated_at
    BEFORE UPDATE ON user_milestone_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE user_milestone_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own milestone progress" ON user_milestone_progress;
CREATE POLICY "Users can view their own milestone progress" ON user_milestone_progress
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own milestone progress" ON user_milestone_progress;
CREATE POLICY "Users can insert their own milestone progress" ON user_milestone_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own milestone progress" ON user_milestone_progress;
CREATE POLICY "Users can update their own milestone progress" ON user_milestone_progress
    FOR UPDATE USING (auth.uid() = user_id);

-- Permissions
GRANT ALL ON user_milestone_progress TO authenticated;

-- Comments
COMMENT ON TABLE user_milestone_progress IS 'User progress through major milestones (M9-M14) with completion tracking';

-- ===============================================
-- TABLE: user_sub_milestone_progress
-- Purpose: Tracks user's progress within each sub-milestone
-- ===============================================

CREATE TABLE IF NOT EXISTS user_sub_milestone_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sub_milestone_id UUID NOT NULL REFERENCES sub_milestones(id) ON DELETE CASCADE,

  -- Progress Tracking
  current_progress DECIMAL(5,2) DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'locked',

  -- Threshold Unlock Tracking
  thresholds_unlocked JSONB DEFAULT '[]'::jsonb,
  resources_unlocked_count INTEGER DEFAULT 0,

  -- Random Bonus Tracking
  random_bonus_received BOOLEAN DEFAULT false,
  random_bonus_resource_id UUID,

  -- Timestamps
  unlocked_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Progress Stats
  total_actions_completed INTEGER DEFAULT 0,
  platform_actions_completed INTEGER DEFAULT 0,
  real_world_actions_completed INTEGER DEFAULT 0,

  -- Progress Breakdown
  platform_progress_percentage DECIMAL(5,2) DEFAULT 0.00,
  real_world_progress_percentage DECIMAL(5,2) DEFAULT 0.00,

  -- Engagement Metrics
  combos_achieved INTEGER DEFAULT 0,
  evidence_submissions INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_progress CHECK (current_progress >= 0 AND current_progress <= 100),
  CONSTRAINT valid_sub_milestone_status CHECK (status IN ('locked', 'active', 'completed'))
);

-- Add unique constraint conditionally
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_sub_milestone'
  ) THEN
    ALTER TABLE user_sub_milestone_progress
      ADD CONSTRAINT unique_user_sub_milestone UNIQUE(user_id, sub_milestone_id);
  END IF;
END$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_sub_milestone_progress_user ON user_sub_milestone_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sub_milestone_progress_active ON user_sub_milestone_progress(user_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_user_sub_milestone_progress_sub_milestone ON user_sub_milestone_progress(sub_milestone_id);

-- Trigger
DROP TRIGGER IF EXISTS update_user_sub_milestone_progress_updated_at ON user_sub_milestone_progress;
CREATE TRIGGER update_user_sub_milestone_progress_updated_at
    BEFORE UPDATE ON user_sub_milestone_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE user_sub_milestone_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own sub-milestone progress" ON user_sub_milestone_progress;
CREATE POLICY "Users can view their own sub-milestone progress" ON user_sub_milestone_progress
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own sub-milestone progress" ON user_sub_milestone_progress;
CREATE POLICY "Users can insert their own sub-milestone progress" ON user_sub_milestone_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own sub-milestone progress" ON user_sub_milestone_progress;
CREATE POLICY "Users can update their own sub-milestone progress" ON user_sub_milestone_progress
    FOR UPDATE USING (auth.uid() = user_id);

-- Permissions
GRANT ALL ON user_sub_milestone_progress TO authenticated;

-- Comments
COMMENT ON TABLE user_sub_milestone_progress IS 'User progress within sub-milestones (0-100%) with threshold unlock tracking';

-- ===============================================
-- TABLE: user_action_log
-- Purpose: Detailed log of every action completed by users
-- ===============================================

CREATE TABLE IF NOT EXISTS user_action_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sub_milestone_id UUID NOT NULL REFERENCES sub_milestones(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES milestone_actions(id) ON DELETE CASCADE,

  -- Action Completion Details
  completed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Progress Earned
  base_progress_earned DECIMAL(5,2) NOT NULL,
  evidence_bonus_earned DECIMAL(5,2) DEFAULT 0.00,
  combo_bonus_earned DECIMAL(5,2) DEFAULT 0.00,
  diminishing_returns_multiplier DECIMAL(5,2) DEFAULT 100.00,
  total_progress_earned DECIMAL(5,2) NOT NULL,

  -- Evidence Submission
  evidence_provided BOOLEAN DEFAULT false,
  evidence_type TEXT,
  evidence_data JSONB,

  -- Combo Detection
  is_combo_action BOOLEAN DEFAULT false,
  combo_trigger_action_id UUID REFERENCES milestone_actions(id),
  combo_trigger_completed_at TIMESTAMPTZ,

  -- Frequency Tracking
  action_count_today INTEGER,
  action_count_this_week INTEGER,

  -- Metadata
  data_source TEXT DEFAULT 'user_initiated',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_progress_earned CHECK (total_progress_earned <= 30)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_action_log_user ON user_action_log(user_id);
CREATE INDEX IF NOT EXISTS idx_action_log_sub_milestone ON user_action_log(sub_milestone_id);
CREATE INDEX IF NOT EXISTS idx_action_log_action ON user_action_log(action_id);
CREATE INDEX IF NOT EXISTS idx_action_log_completed_at ON user_action_log(completed_at);
CREATE INDEX IF NOT EXISTS idx_action_log_combos ON user_action_log(user_id, action_id) WHERE is_combo_action = true;
CREATE INDEX IF NOT EXISTS idx_action_log_user_recent ON user_action_log(user_id, completed_at DESC);

-- RLS
ALTER TABLE user_action_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own action log" ON user_action_log;
CREATE POLICY "Users can view their own action log" ON user_action_log
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own actions" ON user_action_log;
CREATE POLICY "Users can insert their own actions" ON user_action_log
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Permissions
GRANT ALL ON user_action_log TO authenticated;

-- Comments
COMMENT ON TABLE user_action_log IS 'Detailed log of every action completion with progress earned and evidence';

-- ===============================================
-- TABLE: combo_opportunities
-- Purpose: Tracks active combo opportunities for users
-- ===============================================

CREATE TABLE IF NOT EXISTS combo_opportunities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sub_milestone_id UUID NOT NULL REFERENCES sub_milestones(id) ON DELETE CASCADE,

  -- Combo Configuration
  trigger_action_id UUID NOT NULL REFERENCES milestone_actions(id),
  required_action_id UUID NOT NULL REFERENCES milestone_actions(id),

  -- Timing
  trigger_completed_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,

  -- Bonus Details
  combo_bonus_percentage DECIMAL(5,2) NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'active',
  completed_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_combo_status CHECK (status IN ('active', 'completed', 'expired'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_combo_opportunities_user_active ON combo_opportunities(user_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_combo_opportunities_expires_at ON combo_opportunities(expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_combo_opportunities_user ON combo_opportunities(user_id);

-- Trigger
DROP TRIGGER IF EXISTS update_combo_opportunities_updated_at ON combo_opportunities;
CREATE TRIGGER update_combo_opportunities_updated_at
    BEFORE UPDATE ON combo_opportunities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE combo_opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own combo opportunities" ON combo_opportunities;
CREATE POLICY "Users can view their own combo opportunities" ON combo_opportunities
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own combo opportunities" ON combo_opportunities;
CREATE POLICY "Users can insert their own combo opportunities" ON combo_opportunities
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own combo opportunities" ON combo_opportunities;
CREATE POLICY "Users can update their own combo opportunities" ON combo_opportunities
    FOR UPDATE USING (auth.uid() = user_id);

-- Permissions
GRANT ALL ON combo_opportunities TO authenticated;

-- Comments
COMMENT ON TABLE combo_opportunities IS 'Active combo opportunities for users with expiration tracking';

-- ===============================================
-- TABLE: threshold_unlocks
-- Purpose: Tracks when resources unlock at specific thresholds
-- ===============================================

CREATE TABLE IF NOT EXISTS threshold_unlocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sub_milestone_id UUID NOT NULL REFERENCES sub_milestones(id) ON DELETE CASCADE,

  -- Threshold Details
  threshold_percentage INTEGER NOT NULL,

  -- Resources Unlocked
  resources_unlocked JSONB NOT NULL DEFAULT '[]'::jsonb,
  resource_count INTEGER NOT NULL DEFAULT 0,

  -- Unlock Type
  unlock_type TEXT NOT NULL,

  -- Timestamps
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),

  -- User Engagement
  resources_viewed_count INTEGER DEFAULT 0,
  resources_generated_count INTEGER DEFAULT 0,
  first_resource_viewed_at TIMESTAMPTZ,
  first_resource_generated_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_threshold CHECK (threshold_percentage IN (25, 50, 75, 100)),
  CONSTRAINT valid_unlock_type CHECK (unlock_type IN ('standard', 'random_bonus'))
);

-- Add unique constraint conditionally
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_sub_milestone_threshold'
  ) THEN
    ALTER TABLE threshold_unlocks
      ADD CONSTRAINT unique_user_sub_milestone_threshold UNIQUE(user_id, sub_milestone_id, threshold_percentage, unlock_type);
  END IF;
END$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_threshold_unlocks_user ON threshold_unlocks(user_id);
CREATE INDEX IF NOT EXISTS idx_threshold_unlocks_sub_milestone ON threshold_unlocks(sub_milestone_id);
CREATE INDEX IF NOT EXISTS idx_threshold_unlocks_unlocked_at ON threshold_unlocks(unlocked_at);

-- RLS
ALTER TABLE threshold_unlocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own threshold unlocks" ON threshold_unlocks;
CREATE POLICY "Users can view their own threshold unlocks" ON threshold_unlocks
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own threshold unlocks" ON threshold_unlocks;
CREATE POLICY "Users can insert their own threshold unlocks" ON threshold_unlocks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own threshold unlocks" ON threshold_unlocks;
CREATE POLICY "Users can update their own threshold unlocks" ON threshold_unlocks
    FOR UPDATE USING (auth.uid() = user_id);

-- Permissions
GRANT ALL ON threshold_unlocks TO authenticated;

-- Comments
COMMENT ON TABLE threshold_unlocks IS 'Record of resource unlocks at specific progress thresholds';

-- ===============================================
-- TABLE: user_engagement_stats
-- Purpose: Weekly aggregated stats for stealth effectiveness measurement
-- ===============================================

CREATE TABLE IF NOT EXISTS user_engagement_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Time Period
  week_start_date DATE NOT NULL,
  week_number INTEGER NOT NULL,

  -- Action Completion Stats
  total_actions_completed INTEGER DEFAULT 0,
  platform_actions_completed INTEGER DEFAULT 0,
  real_world_actions_completed INTEGER DEFAULT 0,

  -- Progress Stats
  total_progress_earned DECIMAL(5,2) DEFAULT 0.00,
  thresholds_unlocked INTEGER DEFAULT 0,
  sub_milestones_completed INTEGER DEFAULT 0,

  -- Engagement Metrics
  combos_achieved INTEGER DEFAULT 0,
  evidence_submissions INTEGER DEFAULT 0,
  random_bonuses_received INTEGER DEFAULT 0,

  -- Session Stats
  active_days_this_week INTEGER DEFAULT 0,
  multi_action_sessions INTEGER DEFAULT 0,

  -- Streak Tracking
  current_streak_days INTEGER DEFAULT 0,
  longest_streak_days INTEGER DEFAULT 0,

  -- Resource Engagement
  resources_unlocked_this_week INTEGER DEFAULT 0,
  resources_generated_this_week INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint conditionally
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_week'
  ) THEN
    ALTER TABLE user_engagement_stats
      ADD CONSTRAINT unique_user_week UNIQUE(user_id, week_number, week_start_date);
  END IF;
END$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_engagement_stats_user ON user_engagement_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_engagement_stats_week ON user_engagement_stats(week_start_date);

-- Trigger
DROP TRIGGER IF EXISTS update_user_engagement_stats_updated_at ON user_engagement_stats;
CREATE TRIGGER update_user_engagement_stats_updated_at
    BEFORE UPDATE ON user_engagement_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE user_engagement_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own engagement stats" ON user_engagement_stats;
CREATE POLICY "Users can view their own engagement stats" ON user_engagement_stats
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own engagement stats" ON user_engagement_stats;
CREATE POLICY "Users can insert their own engagement stats" ON user_engagement_stats
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own engagement stats" ON user_engagement_stats;
CREATE POLICY "Users can update their own engagement stats" ON user_engagement_stats
    FOR UPDATE USING (auth.uid() = user_id);

-- Permissions
GRANT ALL ON user_engagement_stats TO authenticated;

-- Comments
COMMENT ON TABLE user_engagement_stats IS 'Weekly aggregated engagement metrics for stealth effectiveness measurement';

-- ===============================================
-- VIEWS
-- ===============================================

-- View: Active user sub-milestones with progress details
CREATE OR REPLACE VIEW v_user_active_sub_milestones AS
SELECT
  usmp.user_id,
  usmp.id as progress_id,
  sm.id as sub_milestone_id,
  sm.sub_milestone_code,
  sm.name as sub_milestone_name,
  m.milestone_code,
  m.name as milestone_name,
  usmp.current_progress,
  usmp.status,
  usmp.thresholds_unlocked,
  usmp.total_actions_completed,
  usmp.platform_actions_completed,
  usmp.real_world_actions_completed,
  usmp.combos_achieved,
  usmp.started_at,
  sm.threshold_config
FROM user_sub_milestone_progress usmp
JOIN sub_milestones sm ON usmp.sub_milestone_id = sm.id
JOIN milestones m ON sm.milestone_id = m.id
WHERE usmp.status = 'active';

-- View: Available actions for a sub-milestone with full details
CREATE OR REPLACE VIEW v_sub_milestone_available_actions AS
SELECT
  smam.sub_milestone_id,
  ma.id as action_id,
  ma.action_code,
  ma.action_name,
  ma.description,
  ma.category,
  ma.is_platform_action,
  COALESCE(smam.weight_override, ma.base_weight) as effective_weight,
  ma.tier,
  ma.max_per_day,
  ma.max_per_week,
  ma.cooldown_hours,
  ma.has_diminishing_returns,
  ma.diminishing_returns_schedule,
  ma.has_evidence_bonus,
  ma.evidence_bonus_percentage,
  ma.evidence_types,
  ma.combo_actions,
  ma.combo_bonus_percentage,
  ma.combo_window_hours,
  ma.estimated_time_minutes,
  ma.difficulty_level,
  smam.is_recommended,
  smam.recommended_priority
FROM sub_milestone_action_mappings smam
JOIN milestone_actions ma ON smam.action_id = ma.id
WHERE ma.is_active = true;

-- View: User's combo opportunities with details
CREATE OR REPLACE VIEW v_user_active_combos AS
SELECT
  co.user_id,
  co.id as combo_id,
  sm.sub_milestone_code,
  trigger_ma.action_name as trigger_action,
  required_ma.action_name as required_action,
  co.combo_bonus_percentage,
  co.expires_at,
  EXTRACT(EPOCH FROM (co.expires_at - NOW())) / 3600 as hours_remaining,
  co.trigger_completed_at
FROM combo_opportunities co
JOIN sub_milestones sm ON co.sub_milestone_id = sm.id
JOIN milestone_actions trigger_ma ON co.trigger_action_id = trigger_ma.id
JOIN milestone_actions required_ma ON co.required_action_id = required_ma.id
WHERE co.status = 'active' AND co.expires_at > NOW();

-- ===============================================
-- FUNCTIONS
-- ===============================================

-- Function: Calculate next threshold for a sub-milestone
CREATE OR REPLACE FUNCTION get_next_threshold(
  p_current_progress DECIMAL,
  p_thresholds_unlocked JSONB
) RETURNS INTEGER AS $$
DECLARE
  unlocked_thresholds INTEGER[];
  next_threshold INTEGER;
BEGIN
  unlocked_thresholds := ARRAY(SELECT jsonb_array_elements_text(p_thresholds_unlocked)::INTEGER);

  IF NOT (25 = ANY(unlocked_thresholds)) AND p_current_progress < 25 THEN
    RETURN 25;
  ELSIF NOT (50 = ANY(unlocked_thresholds)) AND p_current_progress < 50 THEN
    RETURN 50;
  ELSIF NOT (75 = ANY(unlocked_thresholds)) AND p_current_progress < 75 THEN
    RETURN 75;
  ELSIF NOT (100 = ANY(unlocked_thresholds)) AND p_current_progress < 100 THEN
    RETURN 100;
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Check if user can complete action (frequency caps)
CREATE OR REPLACE FUNCTION can_complete_action(
  p_user_id UUID,
  p_action_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_action RECORD;
  v_count_today INTEGER;
  v_count_this_week INTEGER;
  v_last_completed TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_action FROM milestone_actions WHERE id = p_action_id;

  IF v_action.max_per_day IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count_today
    FROM user_action_log
    WHERE user_id = p_user_id
      AND action_id = p_action_id
      AND completed_at >= CURRENT_DATE;

    IF v_count_today >= v_action.max_per_day THEN
      RETURN FALSE;
    END IF;
  END IF;

  IF v_action.max_per_week IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count_this_week
    FROM user_action_log
    WHERE user_id = p_user_id
      AND action_id = p_action_id
      AND completed_at >= date_trunc('week', CURRENT_DATE);

    IF v_count_this_week >= v_action.max_per_week THEN
      RETURN FALSE;
    END IF;
  END IF;

  IF v_action.cooldown_hours IS NOT NULL THEN
    SELECT MAX(completed_at) INTO v_last_completed
    FROM user_action_log
    WHERE user_id = p_user_id AND action_id = p_action_id;

    IF v_last_completed IS NOT NULL
       AND v_last_completed + (v_action.cooldown_hours || ' hours')::INTERVAL > NOW() THEN
      RETURN FALSE;
    END IF;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- REALTIME (Enable after table creation)
-- ===============================================

DO $$
BEGIN
  -- Add tables to realtime publication (with duplicate handling)
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_milestone_progress;
  EXCEPTION WHEN duplicate_object THEN
    NULL; -- Table already in publication
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_sub_milestone_progress;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_action_log;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE combo_opportunities;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE threshold_unlocks;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END$$;

-- ===============================================
-- END OF MIGRATION
-- ===============================================
