/**
 * Database configuration stub
 * This provides a minimal pool export to satisfy imports
 * The actual database operations use Supabase client
 */

// Stub pool export - not used for actual queries but satisfies imports
export const pool = {
  query: async () => ({ rows: [] }),
  connect: async () => ({
    query: async () => ({ rows: [] }),
    release: () => {}
  })
};

export default pool;
