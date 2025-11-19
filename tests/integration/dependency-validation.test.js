/**
 * Dependency Validation Integration Tests
 *
 * Tests the complete dependency validation system including:
 * - Cache layer (database)
 * - Validation logic
 * - API endpoints
 * - Cache invalidation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

// Test configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_URL = process.env.API_URL || 'http://localhost:3001';

let supabase;
let testUserId;
let authToken;

// Helper function to create test user
async function createTestUser() {
  const { data, error } = await supabase.auth.signUp({
    email: `test-${Date.now()}@example.com`,
    password: 'test-password-123'
  });

  if (error) throw error;
  return data.user.id;
}

// Helper function to create test resources
async function createTestResource(userId, resourceId, title) {
  const { data, error } = await supabase
    .from('resources')
    .insert({
      customer_id: userId,
      tier: 1,
      category: 'core',
      title,
      description: `Test resource: ${title}`,
      content: { test: true },
      metadata: {},
      dependencies: []
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Helper function to call validation API
async function validateResource(resourceId, token) {
  const response = await fetch(`${API_URL}/api/dependencies/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ resourceId })
  });

  return response.json();
}

describe('Dependency Validation Integration Tests', () => {
  beforeAll(async () => {
    // Initialize Supabase client
    if (!SUPABASE_SERVICE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not set');
    }

    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Create test user and get auth token
    testUserId = await createTestUser();

    const { data: session } = await supabase.auth.getSession();
    authToken = session?.access_token;
  });

  afterAll(async () => {
    // Cleanup: Delete test user's cache entries
    if (testUserId) {
      await supabase
        .from('dependency_validation_cache')
        .delete()
        .eq('user_id', testUserId);

      await supabase
        .from('context_aggregation_cache')
        .delete()
        .eq('user_id', testUserId);

      await supabase
        .from('resources')
        .delete()
        .eq('customer_id', testUserId);
    }
  });

  beforeEach(async () => {
    // Clear cache before each test
    if (testUserId) {
      await supabase
        .from('dependency_validation_cache')
        .delete()
        .eq('user_id', testUserId);
    }
  });

  describe('Cache Layer Tests', () => {
    it('should create dependency_validation_cache table', async () => {
      const { data, error } = await supabase
        .from('dependency_validation_cache')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
    });

    it('should create context_aggregation_cache table', async () => {
      const { data, error } = await supabase
        .from('context_aggregation_cache')
        .select('*')
        .limit(1);

      expect(error).toBeNull();
    });

    it('should enforce RLS on dependency_validation_cache', async () => {
      // Create client with user credentials (not service role)
      const userClient = createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

      const { data, error } = await userClient
        .from('dependency_validation_cache')
        .select('*');

      // Should fail without auth
      expect(error).toBeTruthy();
    });

    it('should allow users to insert their own cache entries', async () => {
      const { data, error } = await supabase
        .from('dependency_validation_cache')
        .insert({
          user_id: testUserId,
          resource_id: 'test-resource',
          resource_version: 'v1',
          validation_result: {
            valid: true,
            missingDependencies: []
          }
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.resource_id).toBe('test-resource');
    });

    it('should auto-update updated_at timestamp on update', async () => {
      // Insert initial cache entry
      const { data: initial } = await supabase
        .from('dependency_validation_cache')
        .insert({
          user_id: testUserId,
          resource_id: 'test-resource-2',
          resource_version: 'v1',
          validation_result: { valid: true }
        })
        .select()
        .single();

      const initialTimestamp = new Date(initial.updated_at);

      // Wait 100ms
      await new Promise(resolve => setTimeout(resolve, 100));

      // Update the entry
      const { data: updated } = await supabase
        .from('dependency_validation_cache')
        .update({ resource_version: 'v2' })
        .eq('id', initial.id)
        .select()
        .single();

      const updatedTimestamp = new Date(updated.updated_at);

      expect(updatedTimestamp.getTime()).toBeGreaterThan(initialTimestamp.getTime());
    });

    it('should invalidate cache when new resource is created', async () => {
      // Insert cache entry
      await supabase
        .from('dependency_validation_cache')
        .insert({
          user_id: testUserId,
          resource_id: 'test-resource-3',
          resource_version: 'v1',
          validation_result: { valid: true }
        });

      // Verify cache exists
      const { data: before } = await supabase
        .from('dependency_validation_cache')
        .select('*')
        .eq('user_id', testUserId);

      expect(before.length).toBeGreaterThan(0);

      // Create new resource (should trigger cache invalidation)
      await createTestResource(testUserId, 'new-resource', 'New Resource');

      // Verify cache was cleared
      const { data: after } = await supabase
        .from('dependency_validation_cache')
        .select('*')
        .eq('user_id', testUserId);

      expect(after.length).toBe(0);
    });
  });

  describe('Validation Logic Tests', () => {
    it('should validate resource with no dependencies', async () => {
      const result = await validateResource('product-description', authToken);

      expect(result.success).toBe(true);
      expect(result.validation.valid).toBe(true);
      expect(result.validation.missingDependencies).toHaveLength(0);
    });

    it('should detect missing dependencies', async () => {
      const result = await validateResource('sales-slide-deck', authToken);

      expect(result.success).toBe(true);
      expect(result.validation.valid).toBe(false);
      expect(result.validation.missingDependencies.length).toBeGreaterThan(0);
    });

    it('should calculate total estimated cost', async () => {
      const result = await validateResource('sales-slide-deck', authToken);

      expect(result.validation.estimatedCost).toBeGreaterThan(0);
      expect(result.validation.estimatedTokens).toBeGreaterThan(0);
    });

    it('should provide suggested generation order', async () => {
      const result = await validateResource('sales-slide-deck', authToken);

      if (!result.validation.valid) {
        expect(result.validation.suggestedOrder).toBeDefined();
        expect(result.validation.suggestedOrder.length).toBeGreaterThan(0);

        // Verify order is sorted by tier (lower tiers first)
        for (let i = 1; i < result.validation.suggestedOrder.length; i++) {
          expect(result.validation.suggestedOrder[i].tier)
            .toBeGreaterThanOrEqual(result.validation.suggestedOrder[i - 1].tier);
        }
      }
    });

    it('should mark resource as valid after dependencies are met', async () => {
      // First validation - should be invalid
      const initial = await validateResource('icp-rating-system', authToken);

      if (!initial.validation.valid) {
        // Create required dependencies
        await createTestResource(testUserId, 'product-description', 'Product Description');
        await createTestResource(testUserId, 'icp-analysis', 'ICP Analysis');

        // Second validation - should be valid
        const after = await validateResource('icp-rating-system', authToken);

        expect(after.validation.valid).toBe(true);
        expect(after.validation.missingDependencies).toHaveLength(0);
      }
    });
  });

  describe('API Endpoint Tests', () => {
    it('should require authentication', async () => {
      const response = await fetch(`${API_URL}/api/dependencies/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceId: 'test' })
      });

      expect(response.status).toBe(401);
    });

    it('should validate request body', async () => {
      const response = await fetch(`${API_URL}/api/dependencies/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({}) // Missing resourceId
      });

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('resourceId');
    });

    it('should return 404 for unknown resource', async () => {
      const result = await validateResource('unknown-resource-xyz', authToken);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should cache validation results', async () => {
      // First call - cache miss
      const first = await validateResource('product-description', authToken);
      expect(first.validation.cacheStatus?.cached).toBe(false);

      // Second call - cache hit
      const second = await validateResource('product-description', authToken);
      expect(second.validation.cacheStatus?.cached).toBe(true);
    });

    it('should respect rate limits', async () => {
      // Make 61 rapid requests (limit is 60 per minute)
      const requests = Array.from({ length: 61 }, () =>
        validateResource('product-description', authToken)
      );

      const results = await Promise.all(requests);

      // Last request should be rate limited
      const lastResult = results[results.length - 1];
      expect(lastResult.success).toBe(false);
      expect(lastResult.error).toContain('rate limit');
    }, 10000); // 10 second timeout
  });

  describe('Batch Validation Tests', () => {
    it('should validate multiple resources at once', async () => {
      const response = await fetch(`${API_URL}/api/dependencies/validate-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          resourceIds: ['product-description', 'icp-analysis', 'sales-slide-deck']
        })
      });

      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.result.validations).toHaveLength(3);
      expect(data.result.summary).toBeDefined();
    });

    it('should limit batch size to 10 resources', async () => {
      const response = await fetch(`${API_URL}/api/dependencies/validate-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          resourceIds: Array.from({ length: 11 }, (_, i) => `resource-${i}`)
        })
      });

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('maximum');
    });
  });

  describe('Cache Cleanup Tests', () => {
    it('should remove expired cache entries', async () => {
      // Insert cache entry with old timestamp
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 2);

      await supabase
        .from('dependency_validation_cache')
        .insert({
          user_id: testUserId,
          resource_id: 'old-cache',
          resource_version: 'v1',
          validation_result: { valid: true },
          created_at: yesterday.toISOString(),
          updated_at: yesterday.toISOString()
        });

      // Run cleanup function
      const { data, error } = await supabase.rpc('cleanup_expired_cache');

      expect(error).toBeNull();
      expect(data).toBeGreaterThanOrEqual(1);

      // Verify old entry was deleted
      const { data: remaining } = await supabase
        .from('dependency_validation_cache')
        .select('*')
        .eq('resource_id', 'old-cache');

      expect(remaining.length).toBe(0);
    });
  });

  describe('Monitoring Views Tests', () => {
    it('should provide cache statistics via v_dependency_validation_cache_stats', async () => {
      const { data, error } = await supabase
        .from('v_dependency_validation_cache_stats')
        .select('*')
        .single();

      expect(error).toBeNull();
      expect(data).toHaveProperty('total_entries');
      expect(data).toHaveProperty('unique_users');
      expect(data).toHaveProperty('unique_resources');
    });

    it('should provide user-specific cache health', async () => {
      const { data, error } = await supabase
        .from('v_user_cache_health')
        .select('*')
        .eq('user_id', testUserId)
        .single();

      expect(error).toBeNull();
      expect(data).toHaveProperty('dependency_cache_entries');
      expect(data).toHaveProperty('context_cache_entries');
    });
  });
});

describe('Context Aggregation Integration Tests', () => {
  it('should aggregate context for resource generation', async () => {
    const response = await fetch(`${API_URL}/api/context/aggregate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        targetResourceId: 'sales-slide-deck'
      })
    });

    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.context).toBeDefined();
    expect(data.context.tier1_critical).toBeDefined();
    expect(data.context.tier2_required).toBeDefined();
    expect(data.context.tier3_optional).toBeDefined();
  });

  it('should cache aggregated context', async () => {
    // First call - cache miss
    const first = await fetch(`${API_URL}/api/context/aggregate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ targetResourceId: 'sales-slide-deck' })
    });

    const firstData = await first.json();
    expect(firstData.cacheStatus?.cached).toBe(false);

    // Second call - cache hit
    const second = await fetch(`${API_URL}/api/context/aggregate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ targetResourceId: 'sales-slide-deck' })
    });

    const secondData = await second.json();
    expect(secondData.cacheStatus?.cached).toBe(true);
  });

  it('should optimize token usage with tier-based context', async () => {
    const response = await fetch(`${API_URL}/api/context/aggregate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ targetResourceId: 'sales-slide-deck' })
    });

    const data = await response.json();

    // Verify token optimization
    expect(data.metadata.totalTokens).toBeLessThan(5000); // Should be ~3500
    expect(data.metadata.tierBreakdown).toBeDefined();
    expect(data.metadata.tierBreakdown.tier1).toBeLessThanOrEqual(500);
    expect(data.metadata.tierBreakdown.tier2).toBeLessThanOrEqual(2000);
  });
});
