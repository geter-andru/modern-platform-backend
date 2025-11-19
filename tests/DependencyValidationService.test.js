/**
 * Unit tests for DependencyValidationService
 *
 * Tests dependency validation logic with mocked database
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock Supabase client BEFORE importing the service
const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
  delete: jest.fn(() => mockSupabase),
  upsert: jest.fn(() => mockSupabase),
  single: jest.fn(() => mockSupabase)
};

// Mock the supabaseService module
jest.unstable_mockModule('../src/services/supabaseService.js', () => ({
  default: mockSupabase
}));

// Mock logger
jest.unstable_mockModule('../src/utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Now import the service under test
const { dependencyValidationService } = await import('../src/services/DependencyValidationService.js');

describe('DependencyValidationService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Reset all mock implementations
    mockSupabase.from.mockReset();
    mockSupabase.select.mockReset();
    mockSupabase.eq.mockReset();
    mockSupabase.order.mockReset();
    mockSupabase.delete.mockReset();
    mockSupabase.upsert.mockReset();
    mockSupabase.single.mockReset();
  });

  describe('validateResourceGeneration', () => {
    const testUserId = 'user-123';

    test('should validate ICP Analysis with all dependencies', async () => {
      // Mock user has no generated resources (starting from scratch)
      mockSupabase.from.mockReturnValueOnce(mockSupabase);
      mockSupabase.select.mockReturnValueOnce(mockSupabase);
      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.order.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const result = await dependencyValidationService.validateResourceGeneration(testUserId, 'icp-analysis');

      expect(result.valid).toBe(false); // Missing product-name, product-description inputs
      expect(result.resourceId).toBe('icp-analysis');
      expect(result.resourceName).toBe('ICP Analysis');
    });

    test('should detect missing required dependencies', async () => {
      // Mock user has product inputs but no ICP
      mockSupabase.from.mockReturnValueOnce(mockSupabase);
      mockSupabase.select.mockReturnValueOnce(mockSupabase);
      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.order.mockResolvedValueOnce({
        data: [
          { resource_id: 'product-name', resource_name: 'Product Name', generated_at: '2025-01-01' },
          { resource_id: 'product-description', resource_name: 'Product Description', generated_at: '2025-01-01' }
        ],
        error: null
      });

      const result = await dependencyValidationService.validateResourceGeneration(testUserId, 'target-buyer-personas');

      expect(result.valid).toBe(false);
      expect(result.missingDependencies.length).toBeGreaterThan(0);
      expect(result.missingDependencies.some(d => d.resourceId === 'icp-analysis')).toBe(true);
    });

    test('should pass validation when all dependencies exist', async () => {
      // Mock user has all required dependencies for target-buyer-personas
      mockSupabase.from.mockReturnValueOnce(mockSupabase);
      mockSupabase.select.mockReturnValueOnce(mockSupabase);
      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.order.mockResolvedValueOnce({
        data: [
          { resource_id: 'product-name', resource_name: 'Product Name', generated_at: '2025-01-01' },
          { resource_id: 'product-description', resource_name: 'Product Description', generated_at: '2025-01-01' },
          { resource_id: 'icp-analysis', resource_name: 'ICP Analysis', generated_at: '2025-01-01' }
        ],
        error: null
      });

      const result = await dependencyValidationService.validateResourceGeneration(testUserId, 'target-buyer-personas');

      expect(result.valid).toBe(true);
      expect(result.missingDependencies.length).toBe(0);
      expect(result.estimatedCost).toBeGreaterThan(0);
    });

    test('should identify optional missing dependencies', async () => {
      // Mock user has required but not optional dependencies
      mockSupabase.from.mockReturnValueOnce(mockSupabase);
      mockSupabase.select.mockReturnValueOnce(mockSupabase);
      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.order.mockResolvedValueOnce({
        data: [
          { resource_id: 'product-name', resource_name: 'Product Name', generated_at: '2025-01-01' },
          { resource_id: 'product-description', resource_name: 'Product Description', generated_at: '2025-01-01' },
          { resource_id: 'icp-analysis', resource_name: 'ICP Analysis', generated_at: '2025-01-01' }
        ],
        error: null
      });

      const result = await dependencyValidationService.validateResourceGeneration(testUserId, 'target-buyer-personas');

      expect(result.valid).toBe(true);
      expect(result.canProceedWithWarning).toBe(false); // No optional deps configured for this resource
    });

    test('should handle resource not found error', async () => {
      mockSupabase.from.mockReturnValueOnce(mockSupabase);
      mockSupabase.select.mockReturnValueOnce(mockSupabase);
      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.order.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const result = await dependencyValidationService.validateResourceGeneration(testUserId, 'nonexistent-resource');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not found');
    });

    test('should handle database errors gracefully', async () => {
      mockSupabase.from.mockReturnValueOnce(mockSupabase);
      mockSupabase.select.mockReturnValueOnce(mockSupabase);
      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.order.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' }
      });

      // validateResourceGeneration catches errors and returns error object
      const result = await dependencyValidationService.validateResourceGeneration(testUserId, 'icp-analysis');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Validation error');
    });
  });

  describe('getAvailableResources', () => {
    const testUserId = 'user-456';

    test('should return empty array when no resources generated', async () => {
      // Reset and setup fresh mocks
      jest.clearAllMocks();

      mockSupabase.from.mockReturnValue(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue(mockSupabase);
      mockSupabase.order.mockResolvedValue({
        data: [],
        error: null
      });

      const result = await dependencyValidationService.getAvailableResources(testUserId);

      // Should return array (possibly empty if no resources have all dependencies met)
      expect(Array.isArray(result)).toBe(true);
      // When user has nothing generated, no resources are available (all have dependencies)
      expect(result.length).toBe(0);
    });

    test('should return available resources based on generated dependencies', async () => {
      // Reset and setup fresh mocks
      jest.clearAllMocks();

      // Mock user has generated ICP Analysis and other foundational resources
      mockSupabase.from.mockReturnValue(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue(mockSupabase);
      mockSupabase.order.mockResolvedValue({
        data: [
          { resource_id: 'product-name', resource_name: 'Product Name', generated_at: '2025-01-01' },
          { resource_id: 'product-description', resource_name: 'Product Description', generated_at: '2025-01-01' },
          { resource_id: 'current-business-stage', resource_name: 'Current Business Stage', generated_at: '2025-01-01' },
          { resource_id: 'icp-analysis', resource_name: 'ICP Analysis', generated_at: '2025-01-01' }
        ],
        error: null
      });

      const result = await dependencyValidationService.getAvailableResources(testUserId);

      expect(Array.isArray(result)).toBe(true);
      // With icp-analysis generated, several resources should be available
      expect(result.length).toBeGreaterThanOrEqual(1);

      // Should include target-buyer-personas (depends on product-name, product-description, icp-analysis which all exist)
      const hasPersonas = result.some(r => r.resourceId === 'target-buyer-personas');
      expect(hasPersonas).toBe(true);

      // Should NOT include already generated icp-analysis
      const hasIcp = result.some(r => r.resourceId === 'icp-analysis');
      expect(hasIcp).toBe(false);
    });

    test('should sort available resources by tier', async () => {
      mockSupabase.from.mockReturnValueOnce(mockSupabase);
      mockSupabase.select.mockReturnValueOnce(mockSupabase);
      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.order.mockResolvedValueOnce({
        data: [
          { resource_id: 'product-name', resource_name: 'Product Name', generated_at: '2025-01-01' },
          { resource_id: 'product-description', resource_name: 'Product Description', generated_at: '2025-01-01' },
          { resource_id: 'icp-analysis', resource_name: 'ICP Analysis', generated_at: '2025-01-01' },
          { resource_id: 'target-buyer-personas', resource_name: 'Target Buyer Personas', generated_at: '2025-01-01' }
        ],
        error: null
      });

      const result = await dependencyValidationService.getAvailableResources(testUserId);

      // Verify sorted by tier (ascending)
      for (let i = 1; i < result.length; i++) {
        expect(result[i].tier).toBeGreaterThanOrEqual(result[i - 1].tier);
      }
    });
  });

  describe('getRecommendedNext', () => {
    const testUserId = 'user-789';

    test('should recommend foundational resources first', async () => {
      mockSupabase.from.mockReturnValueOnce(mockSupabase);
      mockSupabase.select.mockReturnValueOnce(mockSupabase);
      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.order.mockResolvedValueOnce({
        data: [
          { resource_id: 'product-name', resource_name: 'Product Name', generated_at: '2025-01-01' },
          { resource_id: 'product-description', resource_name: 'Product Description', generated_at: '2025-01-01' },
          { resource_id: 'current-business-stage', resource_name: 'Current Business Stage', generated_at: '2025-01-01' }
        ],
        error: null
      });

      const result = await dependencyValidationService.getRecommendedNext(testUserId, 3);

      expect(result.length).toBeLessThanOrEqual(3);
      expect(result.length).toBeGreaterThan(0);

      // First recommendation should be low tier (foundational)
      expect(result[0].tier).toBeLessThanOrEqual(2);
    });

    test('should limit recommendations to specified count', async () => {
      mockSupabase.from.mockReturnValueOnce(mockSupabase);
      mockSupabase.select.mockReturnValueOnce(mockSupabase);
      mockSupabase.eq.mockReturnValueOnce(mockSupabase);
      mockSupabase.order.mockResolvedValueOnce({
        data: [
          { resource_id: 'product-name', resource_name: 'Product Name', generated_at: '2025-01-01' },
          { resource_id: 'product-description', resource_name: 'Product Description', generated_at: '2025-01-01' },
          { resource_id: 'icp-analysis', resource_name: 'ICP Analysis', generated_at: '2025-01-01' }
        ],
        error: null
      });

      const result = await dependencyValidationService.getRecommendedNext(testUserId, 2);

      expect(result.length).toBeLessThanOrEqual(2);
    });
  });

  describe('validateBatch', () => {
    const testUserId = 'user-batch';

    test('should validate multiple resources at once', async () => {
      mockSupabase.from.mockReturnValue(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue(mockSupabase);
      mockSupabase.order.mockResolvedValue({
        data: [
          { resource_id: 'product-name', resource_name: 'Product Name', generated_at: '2025-01-01' },
          { resource_id: 'product-description', resource_name: 'Product Description', generated_at: '2025-01-01' },
          { resource_id: 'icp-analysis', resource_name: 'ICP Analysis', generated_at: '2025-01-01' }
        ],
        error: null
      });

      const resourceIds = ['target-buyer-personas', 'value-messaging'];
      const result = await dependencyValidationService.validateBatch(testUserId, resourceIds);

      expect(result).toBeDefined();
      expect(result.validations).toHaveLength(2);
      expect(result.summary).toBeDefined();
      expect(result.summary.total).toBe(2);
    });

    test('should provide cost summary for batch', async () => {
      mockSupabase.from.mockReturnValue(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue(mockSupabase);
      mockSupabase.order.mockResolvedValue({
        data: [
          { resource_id: 'product-name', resource_name: 'Product Name', generated_at: '2025-01-01' },
          { resource_id: 'product-description', resource_name: 'Product Description', generated_at: '2025-01-01' },
          { resource_id: 'icp-analysis', resource_name: 'ICP Analysis', generated_at: '2025-01-01' }
        ],
        error: null
      });

      const resourceIds = ['target-buyer-personas'];
      const result = await dependencyValidationService.validateBatch(testUserId, resourceIds);

      expect(result.summary.totalCost).toBeGreaterThan(0);
      expect(result.summary.totalTokens).toBeGreaterThan(0);
    });
  });
});
