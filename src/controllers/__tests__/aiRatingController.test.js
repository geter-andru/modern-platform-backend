/**
 * AI Rating Controller Tests
 * Comprehensive test suite for company ICP fit rating functionality
 * Pattern: Following Phase 2 Chunk 1 surgical testing approach
 */

import { jest } from '@jest/globals';
import { rateCompany, getCurrentUserRatings, rateBatch } from '../aiRatingController.js';

// ===== MOCK SETUP =====

// Mock Anthropic SDK
const mockAnthropicCreate = jest.fn();
jest.unstable_mockModule('@anthropic-ai/sdk', () => ({
  default: jest.fn(() => ({
    messages: {
      create: mockAnthropicCreate
    }
  }))
}));

// Mock Supabase client
const mockSupabaseFrom = jest.fn();
const mockSupabaseSelect = jest.fn();
const mockSupabaseInsert = jest.fn();
const mockSupabaseEq = jest.fn();
const mockSupabaseLte = jest.fn();
const mockSupabaseGte = jest.fn();
const mockSupabaseOrder = jest.fn();
const mockSupabaseLimit = jest.fn();
const mockSupabaseRange = jest.fn();
const mockSupabaseSingle = jest.fn();

jest.unstable_mockModule('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: mockSupabaseFrom
  }))
}));

// Mock logger
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// ===== TEST SUITE =====

describe('AI Rating Controller', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock request
    mockReq = {
      user: { id: 'test-user-123' },
      body: {},
      query: {}
    };

    // Setup mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    mockNext = jest.fn();

    // Default Supabase mock chain
    mockSupabaseFrom.mockReturnValue({
      select: mockSupabaseSelect,
      insert: mockSupabaseInsert
    });

    mockSupabaseSelect.mockReturnValue({
      eq: mockSupabaseEq,
      order: mockSupabaseOrder,
      gte: mockSupabaseGte,
      lte: mockSupabaseLte,
      range: mockSupabaseRange
    });

    mockSupabaseInsert.mockReturnValue({
      select: mockSupabaseSelect
    });

    mockSupabaseEq.mockReturnValue({
      eq: mockSupabaseEq,
      order: mockSupabaseOrder,
      single: mockSupabaseSingle,
      limit: mockSupabaseLimit,
      gte: mockSupabaseGte,
      lte: mockSupabaseLte,
      range: mockSupabaseRange
    });

    mockSupabaseOrder.mockReturnValue({
      limit: mockSupabaseLimit,
      range: mockSupabaseRange,
      single: mockSupabaseSingle
    });

    mockSupabaseLimit.mockReturnValue({
      data: [],
      error: null
    });

    mockSupabaseRange.mockReturnValue({
      data: [],
      error: null,
      count: 0
    });

    mockSupabaseSingle.mockReturnValue({
      data: null,
      error: null
    });

    mockSupabaseGte.mockReturnValue({
      lte: mockSupabaseLte,
      order: mockSupabaseOrder,
      range: mockSupabaseRange
    });

    mockSupabaseLte.mockReturnValue({
      order: mockSupabaseOrder,
      range: mockSupabaseRange
    });
  });

  // ===== GROUP 1: INPUT VALIDATION TESTS (12 tests) =====

  describe('Input Validation - rateCompany', () => {
    test('should reject request without authentication', async () => {
      mockReq.user = null;

      await rateCompany(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required'
      });
    });

    test('should reject request without companyUrl', async () => {
      mockReq.body = {};

      await rateCompany(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Missing required field',
        details: {
          companyUrl: 'Required'
        }
      });
    });

    test('should reject invalid URL format', async () => {
      mockReq.body = {
        companyUrl: 'not-a-valid-url'
      };

      await rateCompany(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid company URL format',
        details: 'Please provide a valid website URL or company name'
      });
    });

    test('should accept valid https URL', async () => {
      mockReq.body = {
        companyUrl: 'https://example.com'
      };

      // Mock ICP framework not found to stop execution early
      mockSupabaseLimit.mockReturnValue({
        data: [],
        error: null
      });

      await rateCompany(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'No ICP framework found',
        details: 'Please create an ICP framework first before rating companies'
      });
    });

    test('should accept valid http URL', async () => {
      mockReq.body = {
        companyUrl: 'http://example.com'
      };

      mockSupabaseLimit.mockReturnValue({
        data: [],
        error: null
      });

      await rateCompany(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    test('should accept URL with subdomain', async () => {
      mockReq.body = {
        companyUrl: 'https://app.example.com'
      };

      mockSupabaseLimit.mockReturnValue({
        data: [],
        error: null
      });

      await rateCompany(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    test('should accept URL with path', async () => {
      mockReq.body = {
        companyUrl: 'https://example.com/about'
      };

      mockSupabaseLimit.mockReturnValue({
        data: [],
        error: null
      });

      await rateCompany(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    test('should trim whitespace from URL', async () => {
      mockReq.body = {
        companyUrl: '  https://example.com  '
      };

      mockSupabaseLimit.mockReturnValue({
        data: [],
        error: null
      });

      await rateCompany(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    test('should reject when ICP framework ID not found', async () => {
      mockReq.body = {
        companyUrl: 'https://example.com',
        icpFrameworkId: 'non-existent-id'
      };

      mockSupabaseSingle.mockReturnValue({
        data: null,
        error: { message: 'Not found' }
      });

      await rateCompany(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'ICP framework not found',
        details: 'The specified ICP framework does not exist or you do not have access to it'
      });
    });

    test('should reject when no ICP frameworks exist for user', async () => {
      mockReq.body = {
        companyUrl: 'https://example.com'
      };

      mockSupabaseLimit.mockReturnValue({
        data: [],
        error: null
      });

      await rateCompany(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'No ICP framework found',
        details: 'Please create an ICP framework first before rating companies'
      });
    });

    test('should handle database error when fetching ICP framework', async () => {
      mockReq.body = {
        companyUrl: 'https://example.com'
      };

      mockSupabaseLimit.mockReturnValue({
        data: null,
        error: { message: 'Database connection failed' }
      });

      await rateCompany(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    test('should use most recent ICP framework when none specified', async () => {
      mockReq.body = {
        companyUrl: 'https://example.com'
      };

      const mockFramework = {
        id: 'framework-123',
        user_id: 'test-user-123',
        product_name: 'Test Product',
        product_description: 'Test Description',
        value_proposition: 'Test Value',
        framework: {
          buyerPersonas: [],
          valueCommunication: {},
          painPoints: []
        }
      };

      // First call: check for existing research (none)
      let callCount = 0;
      mockSupabaseLimit.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { data: [mockFramework], error: null };
        }
        return { data: [], error: null };
      });

      // Mock Claude API response
      mockAnthropicCreate.mockResolvedValue({
        content: [{
          text: JSON.stringify({
            score: 75,
            fitLevel: 'Good',
            reasoning: 'Good fit based on analysis',
            breakdown: {
              industryFit: { score: 20, explanation: 'Good industry match' },
              companySizeFit: { score: 18, explanation: 'Size aligns well' },
              painPointAlignment: { score: 19, explanation: 'Clear pain point match' },
              buyerPersonaMatch: { score: 18, explanation: 'Target personas present' }
            },
            strengths: ['Strength 1', 'Strength 2'],
            concerns: ['Concern 1'],
            recommendation: 'Pursue this lead'
          })
        }]
      });

      // Mock successful insert
      mockSupabaseSelect.mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'rating-123',
            created_at: '2025-10-27T10:00:00Z'
          },
          error: null
        })
      });

      await rateCompany(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          rating: expect.objectContaining({
            score: 75,
            fitLevel: 'Good'
          })
        })
      );
    });
  });

  // ===== GROUP 2: SUCCESSFUL RATING GENERATION (8 tests) =====

  describe('Successful Rating Generation', () => {
    beforeEach(() => {
      const mockFramework = {
        id: 'framework-123',
        user_id: 'test-user-123',
        product_name: 'Test Product',
        product_description: 'Test Description',
        value_proposition: 'Test Value',
        framework: {
          buyerPersonas: [{ title: 'VP Sales' }],
          valueCommunication: { coreValue: 'Value' },
          painPoints: [{ category: 'Operational' }]
        }
      };

      mockReq.body = {
        companyUrl: 'https://example.com'
      };

      // Mock ICP framework fetch
      mockSupabaseLimit.mockResolvedValueOnce({
        data: [mockFramework],
        error: null
      });

      // Mock company research fetch (none exists)
      mockSupabaseLimit.mockResolvedValueOnce({
        data: [],
        error: null
      });
    });

    test('should successfully rate a company with valid data', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [{
          text: JSON.stringify({
            score: 85,
            fitLevel: 'Excellent',
            reasoning: 'Excellent fit across all criteria',
            breakdown: {
              industryFit: { score: 22, explanation: 'Perfect industry match' },
              companySizeFit: { score: 21, explanation: 'Ideal company size' },
              painPointAlignment: { score: 22, explanation: 'Strong pain point alignment' },
              buyerPersonaMatch: { score: 20, explanation: 'Key decision makers present' }
            },
            strengths: ['Strong technical team', 'Growing rapidly'],
            concerns: ['Limited budget'],
            recommendation: 'High priority target - schedule demo ASAP'
          })
        }]
      });

      mockSupabaseSelect.mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'rating-123',
            created_at: '2025-10-27T10:00:00Z'
          },
          error: null
        })
      });

      await rateCompany(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          rating: expect.objectContaining({
            score: 85,
            fitLevel: 'Excellent',
            reasoning: expect.any(String),
            breakdown: expect.any(Object),
            strengths: expect.any(Array),
            concerns: expect.any(Array),
            recommendation: expect.any(String)
          }),
          savedId: 'rating-123',
          metadata: expect.objectContaining({
            companyName: expect.any(String),
            icpFramework: 'Test Product',
            ratedAt: expect.any(String),
            apiDuration: expect.stringMatching(/\d+ms/)
          })
        })
      );
    });

    test('should handle score of 0 (poor fit)', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [{
          text: JSON.stringify({
            score: 0,
            fitLevel: 'Poor',
            reasoning: 'No alignment with ICP',
            breakdown: {
              industryFit: { score: 0, explanation: 'Wrong industry' },
              companySizeFit: { score: 0, explanation: 'Too small' },
              painPointAlignment: { score: 0, explanation: 'No pain points match' },
              buyerPersonaMatch: { score: 0, explanation: 'No target personas' }
            },
            strengths: [],
            concerns: ['Complete mismatch'],
            recommendation: 'Do not pursue'
          })
        }]
      });

      mockSupabaseSelect.mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { id: 'rating-123', created_at: '2025-10-27T10:00:00Z' },
          error: null
        })
      });

      await rateCompany(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          rating: expect.objectContaining({
            score: 0,
            fitLevel: 'Poor'
          })
        })
      );
    });

    test('should handle score of 100 (perfect fit)', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [{
          text: JSON.stringify({
            score: 100,
            fitLevel: 'Excellent',
            reasoning: 'Perfect ICP match',
            breakdown: {
              industryFit: { score: 25, explanation: 'Exact industry match' },
              companySizeFit: { score: 25, explanation: 'Perfect size' },
              painPointAlignment: { score: 25, explanation: 'All pain points present' },
              buyerPersonaMatch: { score: 25, explanation: 'All personas present' }
            },
            strengths: ['Perfect fit'],
            concerns: [],
            recommendation: 'Top priority'
          })
        }]
      });

      mockSupabaseSelect.mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { id: 'rating-123', created_at: '2025-10-27T10:00:00Z' },
          error: null
        })
      });

      await rateCompany(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          rating: expect.objectContaining({
            score: 100
          })
        })
      );
    });

    test('should handle mid-range score (fair fit)', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [{
          text: JSON.stringify({
            score: 50,
            fitLevel: 'Fair',
            reasoning: 'Mixed signals',
            breakdown: {
              industryFit: { score: 15, explanation: 'Adjacent industry' },
              companySizeFit: { score: 12, explanation: 'Slightly smaller' },
              painPointAlignment: { score: 13, explanation: 'Some pain points' },
              buyerPersonaMatch: { score: 10, explanation: 'Some personas' }
            },
            strengths: ['Growth potential'],
            concerns: ['Not ideal fit'],
            recommendation: 'Qualified with caveats'
          })
        }]
      });

      mockSupabaseSelect.mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { id: 'rating-123', created_at: '2025-10-27T10:00:00Z' },
          error: null
        })
      });

      await rateCompany(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          rating: expect.objectContaining({
            score: 50,
            fitLevel: 'Fair'
          })
        })
      );
    });

    test('should use cached company research if available', async () => {
      // Override the mock to return cached research
      mockSupabaseLimit.mockResolvedValueOnce({
        data: [{
          id: 'framework-123',
          user_id: 'test-user-123',
          product_name: 'Test Product',
          framework: {}
        }],
        error: null
      });

      mockSupabaseLimit.mockResolvedValueOnce({
        data: [{
          id: 'research-123',
          company_name: 'Acme Corp',
          company_url: 'https://example.com',
          research_data: {
            companyName: 'Acme Corp',
            industry: 'SaaS',
            employeeCount: 150
          },
          created_at: new Date().toISOString() // Recent
        }],
        error: null
      });

      mockAnthropicCreate.mockResolvedValue({
        content: [{
          text: JSON.stringify({
            score: 70,
            fitLevel: 'Good',
            reasoning: 'Good fit',
            breakdown: {
              industryFit: { score: 18, explanation: 'SaaS match' },
              companySizeFit: { score: 17, explanation: 'Good size' },
              painPointAlignment: { score: 18, explanation: 'Aligned' },
              buyerPersonaMatch: { score: 17, explanation: 'Present' }
            },
            strengths: ['SaaS company'],
            concerns: [],
            recommendation: 'Pursue'
          })
        }]
      });

      mockSupabaseSelect.mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { id: 'rating-123', created_at: '2025-10-27T10:00:00Z' },
          error: null
        })
      });

      await rateCompany(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          metadata: expect.objectContaining({
            companyName: 'Acme Corp',
            dataQuality: 'full'
          })
        })
      );
    });

    test('should reject invalid score from AI (<0)', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [{
          text: JSON.stringify({
            score: -10,
            fitLevel: 'Poor',
            reasoning: 'Invalid score test',
            breakdown: {}
          })
        }]
      });

      await rateCompany(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'AI returned invalid score',
        details: 'Score must be a number between 0 and 100'
      });
    });

    test('should reject invalid score from AI (>100)', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [{
          text: JSON.stringify({
            score: 150,
            fitLevel: 'Excellent',
            reasoning: 'Invalid score test',
            breakdown: {}
          })
        }]
      });

      await rateCompany(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'AI returned invalid score',
        details: 'Score must be a number between 0 and 100'
      });
    });

    test('should handle non-numeric score from AI', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [{
          text: JSON.stringify({
            score: 'high',
            fitLevel: 'Good',
            reasoning: 'Invalid score test',
            breakdown: {}
          })
        }]
      });

      await rateCompany(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'AI returned invalid score',
        details: 'Score must be a number between 0 and 100'
      });
    });
  });

  // ===== GROUP 3: GET RATINGS ENDPOINT (8 tests) =====

  describe('Get Current User Ratings', () => {
    test('should reject request without authentication', async () => {
      mockReq.user = null;

      await getCurrentUserRatings(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required'
      });
    });

    test('should return empty array when no ratings exist', async () => {
      mockSupabaseRange.mockResolvedValue({
        data: [],
        error: null,
        count: 0
      });

      await getCurrentUserRatings(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        ratings: [],
        metadata: {
          count: 0,
          total: 0,
          limit: 50,
          offset: 0,
          hasMore: false,
          avgScore: 0,
          fitDistribution: {
            excellent: 0,
            good: 0,
            fair: 0,
            poor: 0
          },
          mostRecent: null
        }
      });
    });

    test('should return ratings with default pagination', async () => {
      const mockRatings = [
        {
          id: 'rating-1',
          rating_score: 85,
          company_name: 'Company A',
          created_at: '2025-10-27T10:00:00Z'
        },
        {
          id: 'rating-2',
          rating_score: 60,
          company_name: 'Company B',
          created_at: '2025-10-27T09:00:00Z'
        }
      ];

      mockSupabaseRange.mockResolvedValue({
        data: mockRatings,
        error: null,
        count: 2
      });

      await getCurrentUserRatings(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        ratings: mockRatings,
        metadata: {
          count: 2,
          total: 2,
          limit: 50,
          offset: 0,
          hasMore: false,
          avgScore: 73, // (85 + 60) / 2 = 72.5 -> 73
          fitDistribution: {
            excellent: 1,
            good: 1,
            fair: 0,
            poor: 0
          },
          mostRecent: '2025-10-27T10:00:00Z'
        }
      });
    });

    test('should respect custom limit parameter', async () => {
      mockReq.query = { limit: 10 };

      mockSupabaseRange.mockResolvedValue({
        data: [],
        error: null,
        count: 0
      });

      await getCurrentUserRatings(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            limit: 10
          })
        })
      );
    });

    test('should enforce maximum limit of 100', async () => {
      mockReq.query = { limit: 500 };

      mockSupabaseRange.mockResolvedValue({
        data: [],
        error: null,
        count: 0
      });

      await getCurrentUserRatings(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            limit: 100
          })
        })
      );
    });

    test('should respect offset parameter for pagination', async () => {
      mockReq.query = { offset: 20 };

      mockSupabaseRange.mockResolvedValue({
        data: [],
        error: null,
        count: 0
      });

      await getCurrentUserRatings(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            offset: 20
          })
        })
      );
    });

    test('should filter by minimum score', async () => {
      mockReq.query = { minScore: 70 };

      const mockRatings = [
        { id: 'rating-1', rating_score: 85, company_name: 'Company A', created_at: '2025-10-27T10:00:00Z' },
        { id: 'rating-2', rating_score: 75, company_name: 'Company B', created_at: '2025-10-27T09:00:00Z' }
      ];

      mockSupabaseRange.mockResolvedValue({
        data: mockRatings,
        error: null,
        count: 2
      });

      await getCurrentUserRatings(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          ratings: mockRatings,
          metadata: expect.objectContaining({
            avgScore: 80 // (85 + 75) / 2
          })
        })
      );
    });

    test('should calculate fit distribution correctly', async () => {
      const mockRatings = [
        { id: 'r1', rating_score: 90, company_name: 'A', created_at: '2025-10-27T10:00:00Z' }, // excellent
        { id: 'r2', rating_score: 85, company_name: 'B', created_at: '2025-10-27T09:00:00Z' }, // excellent
        { id: 'r3', rating_score: 70, company_name: 'C', created_at: '2025-10-27T08:00:00Z' }, // good
        { id: 'r4', rating_score: 50, company_name: 'D', created_at: '2025-10-27T07:00:00Z' }, // fair
        { id: 'r5', rating_score: 30, company_name: 'E', created_at: '2025-10-27T06:00:00Z' }  // poor
      ];

      mockSupabaseRange.mockResolvedValue({
        data: mockRatings,
        error: null,
        count: 5
      });

      await getCurrentUserRatings(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            fitDistribution: {
              excellent: 2,
              good: 1,
              fair: 1,
              poor: 1
            }
          })
        })
      );
    });
  });

  // ===== GROUP 4: BATCH RATING TESTS (6 tests) =====

  describe('Batch Rating', () => {
    test('should reject request without authentication', async () => {
      mockReq.user = null;
      mockReq.body = { companies: [] };

      await rateBatch(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required'
      });
    });

    test('should reject request without companies array', async () => {
      mockReq.body = {};

      await rateBatch(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'companies must be an array'
      });
    });

    test('should reject empty companies array', async () => {
      mockReq.body = { companies: [] };

      await rateBatch(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'At least one company is required'
      });
    });

    test('should reject more than 10 companies', async () => {
      const companies = Array.from({ length: 11 }, (_, i) => ({
        companyUrl: `https://company${i}.com`
      }));

      mockReq.body = { companies };

      await rateBatch(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Maximum 10 companies per batch',
        details: 'You provided 11 companies. Please split into multiple batches.'
      });
    });

    test('should reject companies without companyUrl', async () => {
      mockReq.body = {
        companies: [
          { companyUrl: 'https://valid.com' },
          { companyName: 'Invalid' } // Missing companyUrl
        ]
      };

      await rateBatch(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'All companies must have a companyUrl field'
      });
    });

    test('should process batch of companies successfully', async () => {
      mockReq.body = {
        companies: [
          { companyUrl: 'https://company1.com' },
          { companyUrl: 'https://company2.com' }
        ]
      };

      // This is a complex test - batch rating calls rateCompany internally
      // For now, we test that it accepts the input and returns a structure
      // Full integration would require mocking the internal rateCompany calls

      await rateBatch(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          results: expect.any(Array),
          metadata: expect.objectContaining({
            total: 2,
            successful: expect.any(Number),
            failed: expect.any(Number),
            durationMs: expect.any(Number)
          })
        })
      );
    });
  });

  // ===== GROUP 5: ERROR HANDLING (6 tests) =====

  describe('Error Handling', () => {
    beforeEach(() => {
      mockReq.body = {
        companyUrl: 'https://example.com'
      };

      // Mock ICP framework
      mockSupabaseLimit.mockResolvedValueOnce({
        data: [{
          id: 'framework-123',
          user_id: 'test-user-123',
          product_name: 'Test Product',
          framework: {}
        }],
        error: null
      });

      // Mock no cached research
      mockSupabaseLimit.mockResolvedValueOnce({
        data: [],
        error: null
      });
    });

    test('should handle Claude API 429 rate limit error', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.status = 429;

      mockAnthropicCreate.mockRejectedValue(rateLimitError);

      await rateCompany(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Rate limit exceeded',
        message: 'Too many requests to AI service. Please try again in a few minutes.',
        retryAfter: 60
      });
    });

    test('should handle Claude API 401 authentication error', async () => {
      const authError = new Error('Invalid API key');
      authError.status = 401;

      mockAnthropicCreate.mockRejectedValue(authError);

      await rateCompany(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'AI service authentication failed',
        message: 'Server configuration error. Please contact support.'
      });
    });

    test('should handle invalid JSON from Claude API', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [{
          text: 'This is not valid JSON'
        }]
      });

      await rateCompany(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'AI returned invalid JSON',
        details: expect.any(String)
      });
    });

    test('should handle database save error', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [{
          text: JSON.stringify({
            score: 75,
            fitLevel: 'Good',
            reasoning: 'Good fit',
            breakdown: {
              industryFit: { score: 20, explanation: 'Good' },
              companySizeFit: { score: 18, explanation: 'Good' },
              painPointAlignment: { score: 19, explanation: 'Good' },
              buyerPersonaMatch: { score: 18, explanation: 'Good' }
            },
            strengths: [],
            concerns: [],
            recommendation: 'Pursue'
          })
        }]
      });

      mockSupabaseSelect.mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database write failed' }
        })
      });

      await rateCompany(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to save rating to database',
        details: 'Database write failed'
      });
    });

    test('should handle generic unexpected error', async () => {
      mockAnthropicCreate.mockRejectedValue(new Error('Unexpected error'));

      await rateCompany(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
        message: 'Failed to rate company. Please try again.',
        details: undefined // In production mode
      });
    });

    test('should handle database error in getCurrentUserRatings', async () => {
      mockSupabaseRange.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      await getCurrentUserRatings(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to fetch ratings',
        details: 'Database error'
      });
    });
  });
});

// ===== TEST SUMMARY =====
// Total tests: 40+
// Groups:
//   1. Input Validation (12 tests)
//   2. Successful Rating Generation (8 tests)
//   3. Get Ratings Endpoint (8 tests)
//   4. Batch Rating (6 tests)
//   5. Error Handling (6 tests)
