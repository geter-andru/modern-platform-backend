# Resource Library Migrations - Application Instructions

## Overview
This directory contains migrations 010 and 011 that implement the Resource Library system.

- **Migration 010**: Creates database schema (tables, views, functions, RLS policies)
- **Migration 011**: Seeds the `resources` table with 38 strategic assets

## Files
- `010_resources_library_system.sql` (553 lines, 21KB)
- `011_seed_resources_table.sql` (1004 lines, 50KB)

## Prerequisites
- Supabase project configured
- Database connection credentials
- Supabase CLI installed (optional but recommended)

## Application Methods

### Method 1: Supabase Dashboard (Recommended for Production)

1. Log in to [Supabase Dashboard](https://app.supabase.com)
2. Navigate to your project
3. Go to **SQL Editor**
4. Apply migrations in order:

**Step 1: Apply Migration 010**
```sql
-- Copy and paste the entire contents of:
-- backend/migrations/010_resources_library_system.sql
-- Then click "Run"
```

**Step 2: Apply Migration 011**
```sql
-- Copy and paste the entire contents of:
-- backend/migrations/011_seed_resources_table.sql
-- Then click "Run"
```

### Method 2: Supabase CLI (Recommended for Development)

```bash
# Navigate to project root
cd /Users/geter/andru/hs-andru-test/modern-platform

# Link to your Supabase project (if not already linked)
supabase link --project-ref molcqjsqtjbfclasynpg

# Apply migrations
supabase db push
```

### Method 3: Direct PostgreSQL Connection

```bash
# Set environment variables
export DB_URL="postgresql://postgres.molcqjsqtjbfclasynpg:YOUR_PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres"

# Apply migration 010
psql "$DB_URL" < backend/migrations/010_resources_library_system.sql

# Apply migration 011
psql "$DB_URL" < backend/migrations/011_seed_resources_table.sql
```

### Method 4: Node.js Script (Alternative)

Create a script `apply-migrations.js`:

```javascript
import fs from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    `postgresql://postgres.molcqjsqtjbfclasynpg:${process.env.SUPABASE_PASSWORD}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`
});

async function applyMigrations() {
  const client = await pool.connect();

  try {
    console.log('Applying migration 010...');
    const migration010 = fs.readFileSync('./backend/migrations/010_resources_library_system.sql', 'utf-8');
    await client.query(migration010);
    console.log('✅ Migration 010 applied');

    console.log('Applying migration 011...');
    const migration011 = fs.readFileSync('./backend/migrations/011_seed_resources_table.sql', 'utf-8');
    await client.query(migration011);
    console.log('✅ Migration 011 applied');

    console.log('✅ All migrations applied successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigrations();
```

Run with:
```bash
node apply-migrations.js
```

## Verification

After applying migrations, verify they worked:

### 1. Check Tables Created
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('resources', 'user_resource_unlocks', 'generated_resources', 'resource_generation_queue')
ORDER BY table_name;
```

Expected result: 4 tables

### 2. Check Resources Seeded
```sql
SELECT
  COUNT(*) as total_resources,
  COUNT(*) FILTER (WHERE tier = 'foundation') as foundation_count,
  COUNT(*) FILTER (WHERE tier = 'growth') as growth_count,
  COUNT(*) FILTER (WHERE tier = 'enterprise') as enterprise_count
FROM resources;
```

Expected result:
- total_resources: 38
- foundation_count: 14
- growth_count: 14
- enterprise_count: 10

### 3. Check Resource Details
```sql
SELECT
  asset_number,
  resource_code,
  name,
  tier,
  unlock_milestone_code,
  unlock_threshold_percentage
FROM resources
ORDER BY asset_number
LIMIT 5;
```

Should show first 5 assets starting with asset-1-icp-analysis

### 4. Check Views Created
```sql
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN ('user_resource_library', 'resource_generation_analytics');
```

Expected result: 2 views

### 5. Check Functions Created
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('get_cumulative_context', 'unlock_resources_for_threshold');
```

Expected result: 2 functions

### 6. Check RLS Policies
```sql
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('resources', 'user_resource_unlocks', 'generated_resources', 'resource_generation_queue')
ORDER BY tablename, policyname;
```

Should show multiple policies per table

## Test API Endpoint

After migrations are applied, test the catalog endpoint:

```bash
curl http://localhost:3001/api/resources/catalog | jq
```

Expected response:
```json
{
  "success": true,
  "data": {
    "catalog": [
      {
        "id": "uuid-here",
        "resourceCode": "asset-1-icp-analysis",
        "assetNumber": 1,
        "title": "ICP Analysis Framework",
        "tier": "foundation",
        ...
      },
      // ... 37 more assets
    ],
    "metadata": {
      "totalAssets": 38,
      "tierBreakdown": {
        "foundation": 14,
        "growth": 14,
        "enterprise": 10
      }
    }
  }
}
```

## Rollback

If you need to rollback the migrations:

```sql
-- Drop all tables (CASCADE will drop dependent objects)
DROP TABLE IF EXISTS resource_generation_queue CASCADE;
DROP TABLE IF EXISTS generated_resources CASCADE;
DROP TABLE IF EXISTS user_resource_unlocks CASCADE;
DROP TABLE IF EXISTS resources CASCADE;

-- Drop views
DROP VIEW IF EXISTS user_resource_library CASCADE;
DROP VIEW IF EXISTS resource_generation_analytics CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS get_cumulative_context(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS unlock_resources_for_threshold(UUID, TEXT, INTEGER) CASCADE;
```

## Troubleshooting

### Error: "column asset_number does not exist"
This means the old `resources` table exists. Migration 010 has DROP CASCADE statements to handle this. Re-run migration 010.

### Error: "relation resources already exists"
The table exists from a previous migration. Either:
1. Drop the table manually: `DROP TABLE resources CASCADE;`
2. Re-run migration 010 which has DROP statements at the beginning

### Error: "duplicate key value violates unique constraint"
Migration 011 was already applied. Check:
```sql
SELECT COUNT(*) FROM resources;
```
If result is 38, migration is already applied.

## Next Steps

After migrations are successfully applied:

1. ✅ Test catalog endpoint returns 38 assets
2. ✅ Verify frontend Resource Library displays assets
3. ✅ Test resource generation endpoint with a test user
4. ✅ Verify cumulative context building works
5. ✅ Test unlock function with milestone thresholds

## Support

For issues or questions:
- Check Supabase logs in Dashboard → Logs
- Review PostgreSQL error messages carefully
- Verify database user has required permissions
- Ensure you're connected to the correct database/project

---

**Generated**: 2025-11-20
**Migrations**: 010, 011
**Total Assets**: 38
**System**: Resource Library Foundation
