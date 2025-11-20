-- ===============================================
-- RESOURCES LIBRARY SYSTEM
-- Date: 2025-01-20
-- Purpose: Resource generation, storage, and unlock tracking
-- Author: Stealth Gamification Systems Architect
-- ===============================================
--
-- SYSTEM OVERVIEW:
-- This schema implements the Resource Library Foundation - the core value
-- delivery system for the platform. Resources are AI-generated strategic
-- assets with cumulative intelligence (each builds on previous resources).
--
-- CORE CONCEPTS:
-- - 38 user-facing Strategic Assets (each combines strategic + implementation prompts)
-- - 46 strategic prompts + 52 implementation prompts = 98 total backend prompts
-- - Resources unlock via milestone threshold progression (25%, 50%, 75%, 100%)
-- - Cumulative intelligence: Resource N has context from Resources 1-(N-1)
-- - 3 tiers: Foundation (14 assets), Growth (14 assets), Enterprise (10 assets)
-- ===============================================

-- ===============================================
-- CLEANUP: Drop existing tables in correct dependency order
-- This ensures a clean slate and prevents column mismatch errors
-- ===============================================

DROP TABLE IF EXISTS resource_generation_queue CASCADE;
DROP TABLE IF EXISTS generated_resources CASCADE;
DROP TABLE IF EXISTS user_resource_unlocks CASCADE;
DROP TABLE IF EXISTS resources CASCADE;

-- Drop views explicitly (CASCADE should handle this, but being explicit)
DROP VIEW IF EXISTS user_resource_library CASCADE;
DROP VIEW IF EXISTS resource_generation_analytics CASCADE;

-- Drop functions explicitly
DROP FUNCTION IF EXISTS get_cumulative_context(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS unlock_resources_for_threshold(UUID, TEXT, INTEGER) CASCADE;

-- ===============================================
-- FUNCTION: update_updated_at_column
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
-- TABLE: resources
-- Purpose: Master definition of all 38 strategic assets
-- ===============================================

CREATE TABLE resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Resource Identification
  resource_code TEXT NOT NULL UNIQUE, -- e.g., "asset-1-icp-analysis"
  asset_number INTEGER NOT NULL, -- 1-38

  -- Display Information
  name TEXT NOT NULL, -- "ICP Analysis Framework"
  description TEXT NOT NULL, -- User-facing description
  tier TEXT NOT NULL CHECK (tier IN ('foundation', 'growth', 'enterprise')),

  -- Prompt Configuration
  strategic_prompts JSONB NOT NULL, -- Array of prompt IDs: ["icp-analysis"]
  implementation_guides JSONB NOT NULL, -- Array of guide IDs: ["icp-crm-qualification-checklist", ...]

  -- Generation Metadata
  generation_time_minutes INTEGER NOT NULL, -- Estimated time to generate
  consulting_equivalent_usd INTEGER NOT NULL, -- Value positioning

  -- Cumulative Intelligence
  requires_context_from TEXT[], -- Array of resource_codes this depends on
  personalization_depth INTEGER NOT NULL, -- How many previous resources inform this (1-38)

  -- Unlock Configuration (denormalized for performance)
  unlock_milestone_code TEXT NOT NULL, -- "M9.1", "M9.2", etc.
  unlock_threshold_percentage INTEGER NOT NULL CHECK (unlock_threshold_percentage IN (25, 50, 75, 100)),

  -- Ordering
  display_order INTEGER NOT NULL,

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_resources_asset_number ON resources(asset_number);
CREATE INDEX IF NOT EXISTS idx_resources_tier ON resources(tier);
CREATE INDEX IF NOT EXISTS idx_resources_unlock_milestone ON resources(unlock_milestone_code, unlock_threshold_percentage);
CREATE INDEX IF NOT EXISTS idx_resources_display_order ON resources(display_order);

-- Trigger
DROP TRIGGER IF EXISTS update_resources_updated_at ON resources;
CREATE TRIGGER update_resources_updated_at
    BEFORE UPDATE ON resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE resources IS 'Master definition of 38 strategic assets with unlock criteria and prompt configurations';
COMMENT ON COLUMN resources.strategic_prompts IS 'JSONB array of strategic prompt IDs from /resource-prompts/';
COMMENT ON COLUMN resources.implementation_guides IS 'JSONB array of implementation guide prompt IDs';
COMMENT ON COLUMN resources.personalization_depth IS 'Number of previous resources that provide context (cumulative intelligence)';

-- ===============================================
-- TABLE: user_resource_unlocks
-- Purpose: Track which resources are unlocked for each user
-- ===============================================

CREATE TABLE user_resource_unlocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- User & Resource
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,

  -- Unlock Metadata
  unlocked_via TEXT NOT NULL CHECK (unlocked_via IN ('threshold', 'random_bonus', 'manual')),
  sub_milestone_code TEXT NOT NULL, -- Which sub-milestone unlocked it
  threshold_percentage INTEGER NOT NULL, -- 25, 50, 75, or 100
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- User Engagement Tracking
  viewed_at TIMESTAMPTZ, -- When user first viewed in Resource Library
  generated_at TIMESTAMPTZ, -- When user first generated the resource
  generation_count INTEGER DEFAULT 0, -- How many times regenerated
  last_accessed_at TIMESTAMPTZ, -- Last time user interacted with resource

  -- Resource State
  status TEXT NOT NULL DEFAULT 'unlocked' CHECK (status IN ('unlocked', 'generated', 'exported')),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_user_resource UNIQUE(user_id, resource_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_resource_unlocks_user ON user_resource_unlocks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_resource_unlocks_resource ON user_resource_unlocks(resource_id);
CREATE INDEX IF NOT EXISTS idx_user_resource_unlocks_status ON user_resource_unlocks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_resource_unlocks_unlocked_at ON user_resource_unlocks(unlocked_at DESC);

-- Trigger
DROP TRIGGER IF EXISTS update_user_resource_unlocks_updated_at ON user_resource_unlocks;
CREATE TRIGGER update_user_resource_unlocks_updated_at
    BEFORE UPDATE ON user_resource_unlocks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE user_resource_unlocks IS 'Tracks which resources each user has unlocked and their engagement';
COMMENT ON COLUMN user_resource_unlocks.unlocked_via IS 'How the resource was unlocked: threshold progression, random bonus, or manual';
COMMENT ON COLUMN user_resource_unlocks.generation_count IS 'Number of times user has regenerated this resource';

-- ===============================================
-- TABLE: generated_resources
-- Purpose: Store actual AI-generated resource content
-- ===============================================

CREATE TABLE generated_resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- References
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  unlock_id UUID NOT NULL REFERENCES user_resource_unlocks(id) ON DELETE CASCADE,

  -- Generated Content
  strategic_content JSONB NOT NULL, -- Output from strategic prompt(s)
  implementation_content JSONB NOT NULL, -- Outputs from implementation guide prompts

  -- Generation Metadata
  generation_version INTEGER NOT NULL DEFAULT 1, -- Version number (for regenerations)
  model_used TEXT NOT NULL, -- "claude-sonnet-4-20250514"

  -- Token Usage & Cost
  total_input_tokens INTEGER NOT NULL,
  total_output_tokens INTEGER NOT NULL,
  estimated_cost_usd NUMERIC(10, 6) NOT NULL, -- Cost in dollars

  -- Generation Performance
  generation_started_at TIMESTAMPTZ NOT NULL,
  generation_completed_at TIMESTAMPTZ NOT NULL,
  generation_duration_seconds INTEGER NOT NULL,

  -- Cumulative Context (for debugging/auditing)
  context_resources_used TEXT[], -- Array of resource_codes used for context
  context_token_count INTEGER, -- Tokens used for cumulative context

  -- User Interaction
  user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5), -- Quality feedback
  user_notes TEXT, -- User's custom notes
  exported_at TIMESTAMPTZ, -- When user exported
  export_format TEXT, -- 'pdf', 'docx', 'markdown', 'notion'

  -- Metadata
  is_active BOOLEAN DEFAULT true, -- False if user regenerated (keeps history)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_generated_resources_user ON generated_resources(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_resources_resource ON generated_resources(resource_id);
CREATE INDEX IF NOT EXISTS idx_generated_resources_unlock ON generated_resources(unlock_id);
CREATE INDEX IF NOT EXISTS idx_generated_resources_version ON generated_resources(user_id, resource_id, generation_version DESC);
CREATE INDEX IF NOT EXISTS idx_generated_resources_active ON generated_resources(user_id, resource_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_generated_resources_created_at ON generated_resources(created_at DESC);

-- Trigger
DROP TRIGGER IF EXISTS update_generated_resources_updated_at ON generated_resources;
CREATE TRIGGER update_generated_resources_updated_at
    BEFORE UPDATE ON generated_resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE generated_resources IS 'Stores actual AI-generated resource content with full audit trail';
COMMENT ON COLUMN generated_resources.strategic_content IS 'JSONB output from strategic prompt(s) execution';
COMMENT ON COLUMN generated_resources.implementation_content IS 'JSONB outputs from implementation guide prompts';
COMMENT ON COLUMN generated_resources.context_resources_used IS 'Array of resource_codes that provided cumulative context';

-- ===============================================
-- TABLE: resource_generation_queue
-- Purpose: Queue for batch pre-generation
-- ===============================================

CREATE TABLE resource_generation_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Queue Entry
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,

  -- Priority
  priority INTEGER NOT NULL DEFAULT 100, -- Lower = higher priority
  generation_strategy TEXT NOT NULL CHECK (generation_strategy IN ('on_unlock', 'pre_generate', 'batch')),

  -- Status
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,

  -- Error Handling
  last_error TEXT,
  last_attempted_at TIMESTAMPTZ,

  -- Scheduling
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_queued_resource UNIQUE(user_id, resource_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_resource_queue_user ON resource_generation_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_queue_status ON resource_generation_queue(status, priority, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_resource_queue_next_job ON resource_generation_queue(status, scheduled_for) WHERE status = 'queued';

-- Trigger
DROP TRIGGER IF EXISTS update_resource_generation_queue_updated_at ON resource_generation_queue;
CREATE TRIGGER update_resource_generation_queue_updated_at
    BEFORE UPDATE ON resource_generation_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE resource_generation_queue IS 'Queue for managing batch resource generation and pre-generation strategies';
COMMENT ON COLUMN resource_generation_queue.generation_strategy IS 'When to generate: on_unlock (user-triggered), pre_generate (background), batch (scheduled)';

-- ===============================================
-- VIEW: user_resource_library
-- Purpose: Complete view of user's resource library state
-- ===============================================

CREATE OR REPLACE VIEW user_resource_library AS
SELECT
  u.id as user_id,
  r.id as resource_id,
  r.resource_code,
  r.asset_number,
  r.name,
  r.description,
  r.tier,
  r.generation_time_minutes,
  r.consulting_equivalent_usd,
  r.unlock_milestone_code,
  r.unlock_threshold_percentage,
  r.display_order,

  -- Unlock status
  uru.id as unlock_id,
  uru.unlocked_via,
  uru.unlocked_at,
  uru.viewed_at,
  uru.generated_at,
  uru.generation_count,
  uru.last_accessed_at,
  uru.status as unlock_status,

  -- Generated content reference
  gr.id as latest_generated_id,
  gr.generation_version as latest_version,
  gr.user_rating,
  gr.exported_at,

  -- Computed flags
  (uru.id IS NOT NULL) as is_unlocked,
  (gr.id IS NOT NULL) as is_generated,
  (gr.exported_at IS NOT NULL) as is_exported

FROM users u
CROSS JOIN resources r
LEFT JOIN user_resource_unlocks uru ON u.id = uru.user_id AND r.id = uru.resource_id
LEFT JOIN LATERAL (
  SELECT *
  FROM generated_resources
  WHERE user_id = u.id
    AND resource_id = r.id
    AND is_active = true
  ORDER BY generation_version DESC
  LIMIT 1
) gr ON true

WHERE r.is_active = true
ORDER BY r.display_order;

-- Comments
COMMENT ON VIEW user_resource_library IS 'Complete view of resource library for any user, showing unlock status and generated content';

-- ===============================================
-- VIEW: resource_generation_analytics
-- Purpose: Analytics for resource generation system
-- ===============================================

CREATE OR REPLACE VIEW resource_generation_analytics AS
SELECT
  r.id as resource_id,
  r.resource_code,
  r.asset_number,
  r.name,
  r.tier,

  -- Unlock metrics
  COUNT(DISTINCT uru.user_id) as total_unlocks,
  COUNT(DISTINCT CASE WHEN uru.status = 'generated' THEN uru.user_id END) as total_generated,
  COUNT(DISTINCT CASE WHEN gr.exported_at IS NOT NULL THEN uru.user_id END) as total_exported,

  -- Engagement metrics
  AVG(EXTRACT(EPOCH FROM (uru.generated_at - uru.unlocked_at)) / 86400) as avg_unlock_to_generation_days,
  AVG(uru.generation_count) as avg_regeneration_count,
  AVG(gr.user_rating) as avg_user_rating,

  -- Cost metrics
  AVG(gr.estimated_cost_usd) as avg_generation_cost_usd,
  SUM(gr.estimated_cost_usd) as total_generation_cost_usd,
  AVG(gr.total_output_tokens) as avg_output_tokens,

  -- Performance metrics
  AVG(gr.generation_duration_seconds) as avg_generation_duration_seconds,
  MAX(gr.generation_duration_seconds) as max_generation_duration_seconds

FROM resources r
LEFT JOIN user_resource_unlocks uru ON r.id = uru.resource_id
LEFT JOIN generated_resources gr ON uru.id = gr.unlock_id AND gr.is_active = true

WHERE r.is_active = true
GROUP BY r.id, r.resource_code, r.asset_number, r.name, r.tier
ORDER BY r.asset_number;

-- Comments
COMMENT ON VIEW resource_generation_analytics IS 'Analytics view for resource generation performance, costs, and user engagement';

-- ===============================================
-- FUNCTION: get_cumulative_context
-- Purpose: Build cumulative context for resource generation
-- ===============================================

CREATE OR REPLACE FUNCTION get_cumulative_context(
  p_user_id UUID,
  p_resource_id UUID
)
RETURNS TABLE (
  resource_code TEXT,
  strategic_content JSONB,
  implementation_content JSONB,
  generated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.resource_code,
    gr.strategic_content,
    gr.implementation_content,
    gr.generation_completed_at as generated_at
  FROM resources r
  JOIN generated_resources gr ON r.id = gr.resource_id
  WHERE gr.user_id = p_user_id
    AND gr.is_active = true
    AND r.asset_number < (SELECT asset_number FROM resources WHERE id = p_resource_id)
  ORDER BY r.asset_number ASC;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON FUNCTION get_cumulative_context IS 'Retrieves all previously generated resources for a user to build cumulative context';

-- ===============================================
-- FUNCTION: unlock_resources_for_threshold
-- Purpose: Unlock resources when user crosses a threshold
-- ===============================================

CREATE OR REPLACE FUNCTION unlock_resources_for_threshold(
  p_user_id UUID,
  p_sub_milestone_code TEXT,
  p_threshold_percentage INTEGER
)
RETURNS TABLE (
  resource_id UUID,
  resource_code TEXT,
  resource_name TEXT
) AS $$
BEGIN
  -- Insert unlock records for all resources at this threshold
  INSERT INTO user_resource_unlocks (
    user_id,
    resource_id,
    unlocked_via,
    sub_milestone_code,
    threshold_percentage,
    unlocked_at,
    status
  )
  SELECT
    p_user_id,
    r.id,
    'threshold',
    p_sub_milestone_code,
    p_threshold_percentage,
    NOW(),
    'unlocked'
  FROM resources r
  WHERE r.unlock_milestone_code = p_sub_milestone_code
    AND r.unlock_threshold_percentage = p_threshold_percentage
    AND r.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM user_resource_unlocks
      WHERE user_id = p_user_id AND resource_id = r.id
    )
  ON CONFLICT (user_id, resource_id) DO NOTHING;

  -- Return unlocked resources
  RETURN QUERY
  SELECT
    r.id as resource_id,
    r.resource_code,
    r.name as resource_name
  FROM resources r
  JOIN user_resource_unlocks uru ON r.id = uru.resource_id
  WHERE uru.user_id = p_user_id
    AND r.unlock_milestone_code = p_sub_milestone_code
    AND r.unlock_threshold_percentage = p_threshold_percentage;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON FUNCTION unlock_resources_for_threshold IS 'Unlocks resources when user crosses milestone threshold, returns newly unlocked resources';

-- ===============================================
-- ROW LEVEL SECURITY
-- ===============================================

-- Enable RLS on all tables
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_resource_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_generation_queue ENABLE ROW LEVEL SECURITY;

-- Resources: Public read (catalog)
DROP POLICY IF EXISTS "Anyone can view active resources" ON resources;
CREATE POLICY "Anyone can view active resources" ON resources
    FOR SELECT USING (is_active = true);

-- User Resource Unlocks: Own data only
DROP POLICY IF EXISTS "Users can view their own unlocks" ON user_resource_unlocks;
CREATE POLICY "Users can view their own unlocks" ON user_resource_unlocks
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own unlocks" ON user_resource_unlocks;
CREATE POLICY "Users can update their own unlocks" ON user_resource_unlocks
    FOR UPDATE USING (auth.uid() = user_id);

-- Generated Resources: Own data only
DROP POLICY IF EXISTS "Users can view their own generated resources" ON generated_resources;
CREATE POLICY "Users can view their own generated resources" ON generated_resources
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own generated resources" ON generated_resources;
CREATE POLICY "Users can insert their own generated resources" ON generated_resources
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own generated resources" ON generated_resources;
CREATE POLICY "Users can update their own generated resources" ON generated_resources
    FOR UPDATE USING (auth.uid() = user_id);

-- Queue: Own data only
DROP POLICY IF EXISTS "Users can view their own queue" ON resource_generation_queue;
CREATE POLICY "Users can view their own queue" ON resource_generation_queue
    FOR SELECT USING (auth.uid() = user_id);

-- Service role full access to all tables
DROP POLICY IF EXISTS "Service role full access resources" ON resources;
CREATE POLICY "Service role full access resources" ON resources
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access unlocks" ON user_resource_unlocks;
CREATE POLICY "Service role full access unlocks" ON user_resource_unlocks
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access generated" ON generated_resources;
CREATE POLICY "Service role full access generated" ON generated_resources
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access queue" ON resource_generation_queue;
CREATE POLICY "Service role full access queue" ON resource_generation_queue
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ===============================================
-- REALTIME
-- ===============================================

ALTER PUBLICATION supabase_realtime ADD TABLE user_resource_unlocks;
ALTER PUBLICATION supabase_realtime ADD TABLE generated_resources;

-- ===============================================
-- PERMISSIONS
-- ===============================================

GRANT ALL ON resources TO authenticated;
GRANT ALL ON user_resource_unlocks TO authenticated;
GRANT ALL ON generated_resources TO authenticated;
GRANT ALL ON resource_generation_queue TO authenticated;
