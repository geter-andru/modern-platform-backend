/**
 * Run database migration for company_ratings table
 * Adds missing columns: rating_score, fit_level, breakdown, strengths, concerns, recommendation
 *
 * IMPORTANT: This migration follows SUPABASE_SCHEMA_SYNTAX_REFERENCE.md
 */

import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

// Construct PostgreSQL connection string from Supabase URL
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Extract project ref from Supabase URL (e.g., https://abcdefgh.supabase.co)
const projectRef = supabaseUrl.replace('https://', '').split('.')[0];
const connectionString = `postgresql://postgres.${projectRef}:${process.env.SUPABASE_SECRET_API_KEY?.replace('sb_secret_', '')}@aws-0-us-west-1.pooler.supabase.com:5432/postgres`;

// Note: If the above connection string doesn't work, you'll need to get the direct database connection string from Supabase dashboard

const migrationSQL = `
-- ===============================================
-- UPDATE COMPANY_RATINGS TABLE FOR PHASE 3
-- Date: 2025-10-29
-- Purpose: Add fields required by aiRatingController
-- Reference: SUPABASE_SCHEMA_SYNTAX_REFERENCE.md
-- ===============================================

-- Add new columns if they don't exist
DO $$
BEGIN
    -- Add rating_score (rename from rating for consistency)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='company_ratings' AND column_name='rating_score') THEN
        ALTER TABLE company_ratings ADD COLUMN rating_score INTEGER;
        -- Copy data from old rating column if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='company_ratings' AND column_name='rating') THEN
            UPDATE company_ratings SET rating_score = rating;
        END IF;
    END IF;

    -- Add fit_level
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='company_ratings' AND column_name='fit_level') THEN
        ALTER TABLE company_ratings ADD COLUMN fit_level TEXT;
    END IF;

    -- Add breakdown (detailed scoring)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='company_ratings' AND column_name='breakdown') THEN
        ALTER TABLE company_ratings ADD COLUMN breakdown JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- Add strengths array
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='company_ratings' AND column_name='strengths') THEN
        ALTER TABLE company_ratings ADD COLUMN strengths TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;

    -- Add concerns array
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='company_ratings' AND column_name='concerns') THEN
        ALTER TABLE company_ratings ADD COLUMN concerns TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;

    -- Add recommendation
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='company_ratings' AND column_name='recommendation') THEN
        ALTER TABLE company_ratings ADD COLUMN recommendation TEXT;
    END IF;

    RAISE NOTICE 'Columns added successfully';
END $$;

-- Update constraints to use rating_score
ALTER TABLE company_ratings DROP CONSTRAINT IF EXISTS company_ratings_rating_check;
ALTER TABLE company_ratings ADD CONSTRAINT company_ratings_rating_score_check
    CHECK (rating_score >= 0 AND rating_score <= 100);

-- Update fit_level constraint
ALTER TABLE company_ratings DROP CONSTRAINT IF EXISTS company_ratings_fit_level_check;
ALTER TABLE company_ratings ADD CONSTRAINT company_ratings_fit_level_check
    CHECK (fit_level IN ('Excellent', 'Good', 'Fair', 'Poor'));

-- Add index on rating_score (follows SUPABASE_SCHEMA_SYNTAX_REFERENCE.md)
CREATE INDEX IF NOT EXISTS idx_company_ratings_score ON company_ratings(rating_score DESC);

-- Add GIN index for breakdown JSONB (follows SUPABASE_SCHEMA_SYNTAX_REFERENCE.md)
CREATE INDEX IF NOT EXISTS idx_company_ratings_breakdown_gin ON company_ratings USING GIN (breakdown);
`;

async function runMigration() {
  console.log('🔧 Running company_ratings table migration...');
  console.log('📋 Migration follows SUPABASE_SCHEMA_SYNTAX_REFERENCE.md\n');

  console.log('⚠️  This migration requires direct database access.');
  console.log('📝 Please run this SQL manually in Supabase Dashboard > SQL Editor:\n');
  console.log('=' .repeat(80));
  console.log(migrationSQL);
  console.log('=' .repeat(80));
  console.log('\n✅ After running the SQL above, the following columns will be added:');
  console.log('  - rating_score (INTEGER)');
  console.log('  - fit_level (TEXT)');
  console.log('  - breakdown (JSONB)');
  console.log('  - strengths (TEXT[])');
  console.log('  - concerns (TEXT[])');
  console.log('  - recommendation (TEXT)');
  console.log('\n🔗 Supabase Dashboard: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
}

runMigration();
