/**
 * Supabase Service
 *
 * Central service for all Supabase data operations.
 * Provides a singleton Supabase client for backend use.
 */

import { createClient } from '@supabase/supabase-js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

// Validate configuration
if (!config.supabase.url || !config.supabase.serviceRoleKey) {
  logger.error('Supabase configuration is missing. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  throw new Error('Supabase configuration error');
}

/**
 * Create Supabase client with service role key
 * Service role key bypasses RLS (Row Level Security) for backend operations
 */
const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  }
);

logger.info('Supabase client initialized successfully');

/**
 * Test Supabase connection
 */
export async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('customer_assets')
      .select('customer_id')
      .limit(1);

    if (error) {
      logger.error(`Supabase connection test failed: ${error.message}`);
      return { connected: false, error: error.message };
    }

    logger.info('Supabase connection test successful');
    return { connected: true, message: 'Connected to Supabase' };
  } catch (error) {
    logger.error(`Supabase connection test error: ${error.message}`);
    return { connected: false, error: error.message };
  }
}

// Export singleton client
export default supabase;
