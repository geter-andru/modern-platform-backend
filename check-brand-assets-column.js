/**
 * Check if brand_assets column exists in customer_assets table
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkColumn() {
  console.log('Checking if brand_assets column exists...\n');

  try {
    // Query information schema
    const { data, error } = await supabase
      .from('customer_assets')
      .select('brand_assets')
      .limit(1);

    if (error) {
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('❌ brand_assets column DOES NOT EXIST');
        console.log('\nNext step: Apply migration');
        console.log('File: infra/supabase/migrations/20251102000001_add_brand_assets_column.sql');
        console.log('\nTo apply:');
        console.log('1. Go to Supabase Dashboard → SQL Editor');
        console.log('2. Paste the migration SQL');
        console.log('3. Click "Run"');
        return false;
      }

      console.error('Error checking column:', error);
      return false;
    }

    console.log('✅ brand_assets column EXISTS');
    console.log('Migration already applied. Ready to proceed with frontend integration.');
    return true;

  } catch (error) {
    console.error('Error:', error.message);
    return false;
  }
}

checkColumn().then(exists => {
  process.exit(exists ? 0 : 1);
});
