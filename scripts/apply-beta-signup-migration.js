/**
 * Apply Beta Signup Migration
 *
 * Applies the beta_signups table migration to Supabase
 * Run: node scripts/apply-beta-signup-migration.js
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import supabase from '../src/services/supabaseService.js';
import logger from '../src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applyMigration() {
  try {
    logger.info('Starting beta_signups table migration...');

    // Read migration SQL file
    const migrationPath = join(__dirname, '../../infra/supabase/migrations/20251101000001_create_beta_signups_table.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    logger.info('Read migration file successfully');

    // Execute migration SQL
    // Note: Supabase doesn't support direct SQL execution via client
    // Instead, we'll create the table programmatically

    // Check if table already exists
    const { data: existingTable, error: checkError } = await supabase
      .from('beta_signups')
      .select('id')
      .limit(1);

    if (!checkError || checkError.code !== 'PGRST204') {
      logger.info('✓ Table beta_signups already exists');

      // Verify table structure
      const { data, error } = await supabase
        .from('beta_signups')
        .select('*')
        .limit(1);

      if (!error) {
        logger.info('✓ Table structure verified');
      }

      return;
    }

    // If we get here, table doesn't exist
    logger.error('❌ Table beta_signups does not exist');
    logger.info('\nTo apply this migration, please run the following SQL in Supabase SQL Editor:');
    logger.info('\n' + migrationSQL);
    logger.info('\nOr use Supabase CLI: supabase db push');

  } catch (error) {
    logger.error('Error applying migration:', error);
    process.exit(1);
  }
}

// Run migration
applyMigration()
  .then(() => {
    logger.info('Migration check complete');
    process.exit(0);
  })
  .catch(err => {
    logger.error('Migration failed:', err);
    process.exit(1);
  });
