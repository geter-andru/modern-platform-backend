import { describe, test, expect, beforeEach, jest } from '@jest/globals';

/**
 * ICP Framework Controller Test Suite
 * Tests for ICP framework generation, caching, and retrieval
 */

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

jest.unstable_mockModule('../src/utils/logger.js', () => ({
  default: mockLogger
}));

// Import controller after mocks are set up
const {
  generateFramework,
  getFramework,
  listFrameworks,
  clearFrameworkCache
} = await import('../src/controllers/icpFrameworkController.js');

describe('ICP Framework Controller', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock request
    mockReq = {
      body: {},
      params: {}
    };

    // Setup mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Setup mock next
    mockNext = jest.fn();
  });

  describe('generateFramework', () => {
    describe('Input Validation', () => {
      test('should reject missing product name', async () => {
        mockReq.body = {
          productDescription: 'Test description',
          targetMarket: 'SaaS'
        };

        await generateFramework(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Product name, description, and target market are required'
        });
      });

      test('should reject missing product description', async () => {
        mockReq.body = {
          productName: 'Test Product',
          targetMarket: 'SaaS'
        };

        await generateFramework(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Product name, description, and target market are required'
        });
      });

      test('should reject missing target market', async () => {
        mockReq.body = {
          productName: 'Test Product',
          productDescription: 'Test description'
        };

        await generateFramework(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Product name, description, and target market are required'
        });
      });

      test('should accept valid input with required fields', async () => {
        mockReq.body = {
          productName: 'Test Product',
          productDescription: 'A revolutionary SaaS platform',
          targetMarket: 'SaaS'
        };

        await generateFramework(mockReq, mockRes, mockNext);

        expect(mockRes.json).toHaveBeenCalled();
        const response = mockRes.json.mock.calls[0][0];
        expect(response.success).toBe(true);
        expect(response.framework).toBeDefined();
      });

      test('should accept optional fields', async () => {
        mockReq.body = {
          productName: 'Test Product',
          productDescription: 'A revolutionary SaaS platform',
          targetMarket: 'SaaS',
          keyFeatures: ['Feature 1', 'Feature 2'],
          problemsSolved: ['Problem 1', 'Problem 2'],
          customerProfile: { size: '50-200', industry: 'Technology' }
        };

        await generateFramework(mockReq, mockRes, mockNext);

        expect(mockRes.json).toHaveBeenCalled();
        const response = mockRes.json.mock.calls[0][0];
        expect(response.success).toBe(true);
      });
    });

    describe('Framework Structure', () => {
      test('should generate framework with metadata', async () => {
        mockReq.body = {
          productName: 'Test Product',
          productDescription: 'A revolutionary SaaS platform',
          targetMarket: 'SaaS'
        };

        await generateFramework(mockReq, mockRes, mockNext);

        const response = mockRes.json.mock.calls[0][0];
        expect(response.framework.metadata).toBeDefined();
        expect(response.framework.metadata.productName).toBe('Test Product');
        expect(response.framework.metadata.targetMarket).toBe('SaaS');
        expect(response.framework.metadata.generatedAt).toBeDefined();
        expect(response.framework.metadata.version).toBe('1.0');
      });

      test('should generate 6 rating categories', async () => {
        mockReq.body = {
          productName: 'Test Product',
          productDescription: 'A revolutionary SaaS platform',
          targetMarket: 'SaaS'
        };

        await generateFramework(mockReq, mockRes, mockNext);

        const response = mockRes.json.mock.calls[0][0];
        expect(response.framework.categories).toHaveLength(6);

        // Verify each category has required structure
        response.framework.categories.forEach(category => {
          expect(category.name).toBeDefined();
          expect(category.description).toBeDefined();
          expect(category.weight).toBeDefined();
          expect(category.criteria).toBeDefined();
          expect(Array.isArray(category.criteria)).toBe(true);
        });
      });

      test('should generate scoring configuration', async () => {
        mockReq.body = {
          productName: 'Test Product',
          productDescription: 'A revolutionary SaaS platform',
          targetMarket: 'SaaS'
        };

        await generateFramework(mockReq, mockRes, mockNext);

        const response = mockRes.json.mock.calls[0][0];
        expect(response.framework.scoring).toBeDefined();
        expect(response.framework.scoring.weights).toBeDefined();
        expect(response.framework.scoring.tiers).toBeDefined();

        // Verify weights sum to 100
        const totalWeight = Object.values(response.framework.scoring.weights).reduce((a, b) => a + b, 0);
        expect(totalWeight).toBe(100);

        // Verify 4 tiers
        expect(response.framework.scoring.tiers).toHaveLength(4);
      });

      test('should generate qualification questions', async () => {
        mockReq.body = {
          productName: 'Test Product',
          productDescription: 'A revolutionary SaaS platform',
          targetMarket: 'SaaS'
        };

        await generateFramework(mockReq, mockRes, mockNext);

        const response = mockRes.json.mock.calls[0][0];
        expect(response.framework.qualificationQuestions).toBeDefined();
        expect(Array.isArray(response.framework.qualificationQuestions)).toBe(true);
        expect(response.framework.qualificationQuestions.length).toBeGreaterThan(0);
      });

      test('should generate disqualifiers', async () => {
        mockReq.body = {
          productName: 'Test Product',
          productDescription: 'A revolutionary SaaS platform',
          targetMarket: 'SaaS'
        };

        await generateFramework(mockReq, mockRes, mockNext);

        const response = mockRes.json.mock.calls[0][0];
        expect(response.framework.disqualifiers).toBeDefined();
        expect(Array.isArray(response.framework.disqualifiers)).toBe(true);
      });

      test('should generate ideal profile', async () => {
        mockReq.body = {
          productName: 'Test Product',
          productDescription: 'A revolutionary SaaS platform',
          targetMarket: 'SaaS'
        };

        await generateFramework(mockReq, mockRes, mockNext);

        const response = mockRes.json.mock.calls[0][0];
        expect(response.framework.idealProfile).toBeDefined();
        expect(response.framework.idealProfile.summary).toBeDefined();
        expect(response.framework.idealProfile.characteristics).toBeDefined();
      });
    });

    describe('Caching Behavior', () => {
      test('should cache generated framework', async () => {
        mockReq.body = {
          productName: 'Cached Product',
          productDescription: 'A revolutionary SaaS platform',
          targetMarket: 'SaaS'
        };

        // First request
        await generateFramework(mockReq, mockRes, mockNext);

        const firstResponse = mockRes.json.mock.calls[0][0];
        expect(firstResponse.fromCache).toBeUndefined();

        // Clear mocks
        jest.clearAllMocks();

        // Second request - should hit cache
        await generateFramework(mockReq, mockRes, mockNext);

        const secondResponse = mockRes.json.mock.calls[0][0];
        expect(secondResponse.fromCache).toBe(true);
        expect(secondResponse.cacheAge).toBeDefined();
        expect(secondResponse.cacheAge).toBeGreaterThanOrEqual(0);
      });

      test('should bypass cache when forceRegenerate is true', async () => {
        mockReq.body = {
          productName: 'Force Regen Product',
          productDescription: 'A revolutionary SaaS platform',
          targetMarket: 'SaaS'
        };

        // First request
        await generateFramework(mockReq, mockRes, mockNext);

        jest.clearAllMocks();

        // Second request with forceRegenerate
        mockReq.body.forceRegenerate = true;
        await generateFramework(mockReq, mockRes, mockNext);

        const response = mockRes.json.mock.calls[0][0];
        expect(response.fromCache).toBeUndefined();
      });

      test('should use case-insensitive cache keys', async () => {
        mockReq.body = {
          productName: 'CaSe InSeNsItIvE',
          productDescription: 'A revolutionary SaaS platform',
          targetMarket: 'SaaS'
        };

        await generateFramework(mockReq, mockRes, mockNext);

        jest.clearAllMocks();

        // Request with different case
        mockReq.body.productName = 'case insensitive';
        await generateFramework(mockReq, mockRes, mockNext);

        const response = mockRes.json.mock.calls[0][0];
        expect(response.fromCache).toBe(true);
      });
    });

    describe('Scoring Tiers', () => {
      test('should define Tier 1 with correct thresholds', async () => {
        mockReq.body = {
          productName: 'Test Product',
          productDescription: 'A revolutionary SaaS platform',
          targetMarket: 'SaaS'
        };

        await generateFramework(mockReq, mockRes, mockNext);

        const response = mockRes.json.mock.calls[0][0];
        const tier1 = response.framework.scoring.tiers[0];

        expect(tier1.name).toContain('Tier 1');
        expect(tier1.minScore).toBe(85);
        expect(tier1.maxScore).toBe(100);
        expect(tier1.description).toBeDefined();
        expect(tier1.actionPlan).toBeDefined();
        expect(tier1.color).toBeDefined();
      });

      test('should have no gaps between tier score ranges', async () => {
        mockReq.body = {
          productName: 'Test Product',
          productDescription: 'A revolutionary SaaS platform',
          targetMarket: 'SaaS'
        };

        await generateFramework(mockReq, mockRes, mockNext);

        const response = mockRes.json.mock.calls[0][0];
        const tiers = response.framework.scoring.tiers;

        // Tiers should be continuous from 0-100
        const sortedTiers = tiers.sort((a, b) => b.minScore - a.minScore);

        for (let i = 0; i < sortedTiers.length - 1; i++) {
          const currentTier = sortedTiers[i];
          const nextTier = sortedTiers[i + 1];

          // Next tier's maxScore should be current tier's minScore - 1
          expect(nextTier.maxScore).toBe(currentTier.minScore - 1);
        }

        // First tier should end at 100
        expect(sortedTiers[0].maxScore).toBe(100);

        // Last tier should start at 0
        expect(sortedTiers[sortedTiers.length - 1].minScore).toBe(0);
      });
    });

    describe('Error Handling', () => {
      test('should call next with error on exception', async () => {
        // Force an error by passing invalid data type
        mockReq.body = {
          productName: null,
          productDescription: null,
          targetMarket: null
        };

        await generateFramework(mockReq, mockRes, mockNext);

        // Should either return 400 or call next with error
        const wasValidationError = mockRes.status.mock.calls.some(call => call[0] === 400);
        const wasNextCalled = mockNext.mock.calls.length > 0;

        expect(wasValidationError || wasNextCalled).toBe(true);
      });
    });
  });

  describe('getFramework', () => {
    beforeEach(async () => {
      // Clear cache before each test
      mockReq.body = {};
      await clearFrameworkCache(mockReq, mockRes, mockNext);
      jest.clearAllMocks();
    });

    test('should retrieve cached framework by product and market', async () => {
      // First, generate a framework
      mockReq.body = {
        productName: 'Retrievable Product',
        productDescription: 'A revolutionary SaaS platform',
        targetMarket: 'SaaS'
      };

      await generateFramework(mockReq, mockRes, mockNext);

      jest.clearAllMocks();

      // Now try to retrieve it
      mockReq.params = {
        productName: 'Retrievable Product',
        targetMarket: 'SaaS'
      };

      await getFramework(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.framework).toBeDefined();
      expect(response.framework.metadata.productName).toBe('Retrievable Product');
    });

    test('should return 404 when framework not found', async () => {
      mockReq.params = {
        productName: 'Non Existent Product',
        targetMarket: 'Unknown Market'
      };

      await getFramework(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Framework not found. Please generate it first.'
      });
    });

    test('should handle case-insensitive lookup', async () => {
      // Generate with one case
      mockReq.body = {
        productName: 'Test Product',
        productDescription: 'A revolutionary SaaS platform',
        targetMarket: 'SaaS'
      };

      await generateFramework(mockReq, mockRes, mockNext);

      jest.clearAllMocks();

      // Retrieve with different case
      mockReq.params = {
        productName: 'TEST PRODUCT',
        targetMarket: 'saas'
      };

      await getFramework(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.framework).toBeDefined();
    });
  });

  describe('listFrameworks', () => {
    beforeEach(async () => {
      // Clear cache before each test
      mockReq.body = {};
      await clearFrameworkCache(mockReq, mockRes, mockNext);
      jest.clearAllMocks();
    });

    test('should return empty list when no frameworks cached', async () => {
      mockReq = {};
      mockRes = {
        json: jest.fn()
      };

      await listFrameworks(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.frameworks).toEqual([]);
      expect(response.total).toBe(0);
    });

    test('should list all cached frameworks', async () => {
      // Generate multiple frameworks
      const products = [
        { name: 'Product A', market: 'SaaS' },
        { name: 'Product B', market: 'E-commerce' },
        { name: 'Product C', market: 'FinTech' }
      ];

      for (const product of products) {
        mockReq.body = {
          productName: product.name,
          productDescription: 'Test description',
          targetMarket: product.market
        };
        await generateFramework(mockReq, mockRes, mockNext);
      }

      jest.clearAllMocks();

      // List frameworks
      mockReq = {};
      mockRes = { json: jest.fn() };

      await listFrameworks(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.frameworks).toHaveLength(3);
      expect(response.total).toBe(3);

      // Verify each framework summary has required fields
      response.frameworks.forEach(fw => {
        expect(fw.productName).toBeDefined();
        expect(fw.targetMarket).toBeDefined();
        expect(fw.generatedAt).toBeDefined();
        expect(fw.cacheAge).toBeDefined();
      });
    });

    test('should include total count in response', async () => {
      mockReq = {};
      mockRes = { json: jest.fn() };

      await listFrameworks(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.total).toBeDefined();
      expect(typeof response.total).toBe('number');
    });
  });

  describe('clearFrameworkCache', () => {
    test('should clear all cache when no product specified', async () => {
      // Generate a framework first
      mockReq.body = {
        productName: 'Test Product',
        productDescription: 'A revolutionary SaaS platform',
        targetMarket: 'SaaS'
      };

      await generateFramework(mockReq, mockRes, mockNext);

      jest.clearAllMocks();

      // Clear all cache
      mockReq.body = {};

      await clearFrameworkCache(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toContain('All framework cache cleared');
      expect(response.keysCleared).toBeGreaterThanOrEqual(1);
    });

    test('should clear specific product cache', async () => {
      // Generate two frameworks
      mockReq.body = {
        productName: 'Product A',
        productDescription: 'Description A',
        targetMarket: 'SaaS'
      };
      await generateFramework(mockReq, mockRes, mockNext);

      mockReq.body = {
        productName: 'Product B',
        productDescription: 'Description B',
        targetMarket: 'E-commerce'
      };
      await generateFramework(mockReq, mockRes, mockNext);

      jest.clearAllMocks();

      // Clear only Product A
      mockReq.body = {
        productName: 'Product A',
        targetMarket: 'SaaS'
      };

      await clearFrameworkCache(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toContain('Product A');
      expect(response.keysCleared).toBeGreaterThanOrEqual(1);

      // Verify Product B still in cache
      jest.clearAllMocks();
      mockReq.params = {
        productName: 'Product B',
        targetMarket: 'E-commerce'
      };

      await getFramework(mockReq, mockRes, mockNext);

      const getResponse = mockRes.json.mock.calls[0][0];
      expect(getResponse.success).toBe(true);
    });

    test('should handle clearing non-existent cache', async () => {
      mockReq.body = {
        productName: 'Non Existent',
        targetMarket: 'Unknown'
      };

      await clearFrameworkCache(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.keysCleared).toBe(0);
    });
  });

  describe('Integration Scenarios', () => {
    beforeEach(async () => {
      // Clear cache before each integration test
      mockReq = { body: {} };
      mockRes = { json: jest.fn() };
      mockNext = jest.fn();
      await clearFrameworkCache(mockReq, mockRes, mockNext);
      jest.clearAllMocks();
    });

    test('should handle complete framework lifecycle', async () => {
      const productData = {
        productName: 'Lifecycle Product',
        productDescription: 'A comprehensive SaaS platform',
        targetMarket: 'Enterprise SaaS',
        keyFeatures: ['Analytics', 'Reporting', 'Integration'],
        problemsSolved: ['Data silos', 'Manual processes']
      };

      // 1. Generate framework
      mockReq.body = productData;
      await generateFramework(mockReq, mockRes, mockNext);

      expect(mockRes.json.mock.calls[0][0].success).toBe(true);

      jest.clearAllMocks();

      // 2. List frameworks
      mockReq = {};
      mockRes = { json: jest.fn() };
      await listFrameworks(mockReq, mockRes, mockNext);

      expect(mockRes.json.mock.calls[0][0].frameworks).toHaveLength(1);

      jest.clearAllMocks();

      // 3. Retrieve specific framework
      mockReq.params = {
        productName: productData.productName,
        targetMarket: productData.targetMarket
      };
      mockRes = { json: jest.fn(), status: jest.fn().mockReturnThis() };
      await getFramework(mockReq, mockRes, mockNext);

      expect(mockRes.json.mock.calls[0][0].success).toBe(true);

      jest.clearAllMocks();

      // 4. Clear cache
      mockReq.body = {
        productName: productData.productName,
        targetMarket: productData.targetMarket
      };
      mockRes = { json: jest.fn() };
      await clearFrameworkCache(mockReq, mockRes, mockNext);

      expect(mockRes.json.mock.calls[0][0].success).toBe(true);
    });

    test('should handle multiple products for same market', async () => {
      const market = 'SaaS';
      const products = ['Product 1', 'Product 2', 'Product 3'];

      // Generate frameworks for all products
      for (const product of products) {
        mockReq.body = {
          productName: product,
          productDescription: 'Test',
          targetMarket: market
        };
        await generateFramework(mockReq, mockRes, mockNext);
      }

      jest.clearAllMocks();

      // List should show all 3
      mockReq = {};
      mockRes = { json: jest.fn() };
      await listFrameworks(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.frameworks).toHaveLength(3);
      expect(response.frameworks.every(fw => fw.targetMarket === market)).toBe(true);
    });
  });
});
