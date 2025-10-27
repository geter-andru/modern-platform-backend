import { describe, test, expect, beforeEach, jest, beforeAll, afterAll } from '@jest/globals';

/**
 * Company Research Controller Test Suite
 * Tests for web scraping, data extraction, scoring, and caching
 */

// Create mock objects
const mockAxios = {
  get: jest.fn()
};

const mockCheerioInstance = {
  find: jest.fn().mockReturnThis(),
  text: jest.fn().mockReturnValue(''),
  each: jest.fn()
};

const mockCheerio = {
  load: jest.fn(() => () => mockCheerioInstance)
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock modules before importing controller
jest.unstable_mockModule('axios', () => ({
  default: mockAxios
}));

jest.unstable_mockModule('cheerio', () => ({
  load: mockCheerio.load
}));

jest.unstable_mockModule('../src/utils/logger.js', () => ({
  default: mockLogger
}));

// Import controller after mocks are set up
const { researchCompany, getResearchedCompanies, clearResearchCache } = await import('../src/controllers/companyResearchController.js');

describe('Company Research Controller', () => {
  let mockReq;
  let mockRes;
  let mockNext;
  let mockSearchResults; // Shared state for search results
  let mockSearchQueue = []; // Queue of results for multiple searches

  // Helper to set mock search results that cheerio will return (single search)
  const setMockSearchResults = (results) => {
    mockSearchResults = results;
    mockSearchQueue = []; // Clear queue when setting single result
  };

  // Helper to set multiple search results (for multi-search tests)
  const setMockSearchQueue = (queueOfResults) => {
    mockSearchQueue = [...queueOfResults];
    mockSearchResults = null; // Clear single result when using queue
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Reset search results and queue to empty
    mockSearchResults = [];
    mockSearchQueue = [];

    // Reset mock implementations
    mockAxios.get.mockReset();

    // Default: return empty HTML
    mockAxios.get.mockResolvedValue({
      data: '<html><body></body></html>'
    });

    // Set up cheerio.load to use mockSearchResults or mockSearchQueue
    let cheerioLoadCallCount = 0;
    mockCheerio.load.mockImplementation(() => {
      cheerioLoadCallCount++;

      // Get current search results (from queue or single result)
      let currentResults;
      if (mockSearchQueue.length > 0) {
        currentResults = mockSearchQueue.shift(); // Take from queue
      } else {
        currentResults = mockSearchResults || [];
      }

      // Create the main $ function that handles both selectors and element wrapping
      const $ = (selectorOrElement) => {
        // Case 1: CSS selector like '.result'
        if (selectorOrElement === '.result') {
          return {
            each: (callback) => {
              currentResults.forEach((result, index) => {
                const mockElement = { _mockResult: result };
                callback(index, mockElement);
              });
            }
          };
        }

        // Case 2: Wrapping an element like $(element)
        if (selectorOrElement && selectorOrElement._mockResult) {
          const result = selectorOrElement._mockResult;
          return {
            find: (findSelector) => {
              const texts = {
                '.result__title': result.title || '',
                '.result__snippet': result.snippet || '',
                '.result__url': result.url || ''
              };
              const text = texts[findSelector] || '';

              // Return object that mimics jQuery element with text() method
              return {
                text: () => text
              };
            }
          };
        }

        // Default: return empty
        return { each: () => {}, find: () => ({ text: () => '', trim: () => ({ text: () => '' }) }) };
      };

      return $;
    });

    // Setup mock request
    mockReq = {
      body: {}
    };

    // Setup mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    // Setup mock next
    mockNext = jest.fn();
  });

  describe('researchCompany', () => {
    describe('Input Validation', () => {
      test('should reject missing company name', async () => {
        mockReq.body = {};

        await researchCompany(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Valid company name is required (minimum 2 characters)'
        });
      });

      test('should reject company name with less than 2 characters', async () => {
        mockReq.body = { companyName: 'A' };

        await researchCompany(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Valid company name is required (minimum 2 characters)'
        });
      });

      test('should reject non-string company name', async () => {
        mockReq.body = { companyName: 123 };

        await researchCompany(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Valid company name is required (minimum 2 characters)'
        });
      });

      test('should accept valid company name', async () => {
        mockReq.body = { companyName: 'Acme Corp' };

        // Mock successful web search
        mockAxios.get.mockResolvedValue({
          data: '<html><body></body></html>'
        });

        const mockCheerioInstance = {
          find: jest.fn().mockReturnThis(),
          text: jest.fn().mockReturnValue(''),
          each: jest.fn()
        };
        mockCheerio.load.mockReturnValue(() => mockCheerioInstance);

        await researchCompany(mockReq, mockRes, mockNext);

        expect(mockRes.json).toHaveBeenCalled();
        expect(mockRes.json.mock.calls[0][0].success).toBe(true);
      });

      test('should trim whitespace from company name', async () => {
        mockReq.body = { companyName: '  Acme Corp  ' };

        mockAxios.get.mockResolvedValue({
          data: '<html><body></body></html>'
        });

        const mockCheerioInstance = {
          find: jest.fn().mockReturnThis(),
          text: jest.fn().mockReturnValue(''),
          each: jest.fn()
        };
        mockCheerio.load.mockReturnValue(() => mockCheerioInstance);

        await researchCompany(mockReq, mockRes, mockNext);

        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('Acme Corp')
        );
      });
    });

    describe('Caching Behavior', () => {
      test('should return cached data when available and not expired', async () => {
        mockReq.body = { companyName: 'Cached Company' };

        // First request - populate cache
        mockAxios.get.mockResolvedValue({
          data: '<html><body></body></html>'
        });

        const mockCheerioInstance = {
          find: jest.fn().mockReturnThis(),
          text: jest.fn().mockReturnValue(''),
          each: jest.fn()
        };
        mockCheerio.load.mockReturnValue(() => mockCheerioInstance);

        await researchCompany(mockReq, mockRes, mockNext);

        // Clear mocks
        jest.clearAllMocks();

        // Second request - should use cache
        await researchCompany(mockReq, mockRes, mockNext);

        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            fromCache: true,
            cacheAge: expect.any(Number)
          })
        );
        expect(mockAxios.get).not.toHaveBeenCalled();
      });

      test('should bypass cache when forceRefresh is true', async () => {
        mockReq.body = {
          companyName: 'Force Refresh Company',
          forceRefresh: true
        };

        // First request - populate cache
        mockAxios.get.mockResolvedValue({
          data: '<html><body></body></html>'
        });

        const mockCheerioInstance = {
          find: jest.fn().mockReturnThis(),
          text: jest.fn().mockReturnValue(''),
          each: jest.fn()
        };
        mockCheerio.load.mockReturnValue(() => mockCheerioInstance);

        await researchCompany(mockReq, mockRes, mockNext);

        const firstCallCount = mockAxios.get.mock.calls.length;

        // Second request with forceRefresh
        await researchCompany(mockReq, mockRes, mockNext);

        // Should have made new web requests
        expect(mockAxios.get.mock.calls.length).toBeGreaterThan(firstCallCount);

        const response = mockRes.json.mock.calls[1][0];
        expect(response.fromCache).toBeUndefined();
      });

      test('should use different cache keys for different depths', async () => {
        const companyName = 'Multi Depth Company';

        // Basic depth
        mockReq.body = { companyName, depth: 'basic' };

        mockAxios.get.mockResolvedValue({
          data: '<html><body></body></html>'
        });

        const mockCheerioInstance = {
          find: jest.fn().mockReturnThis(),
          text: jest.fn().mockReturnValue(''),
          each: jest.fn()
        };
        mockCheerio.load.mockReturnValue(() => mockCheerioInstance);

        await researchCompany(mockReq, mockRes, mockNext);

        const basicCallCount = mockAxios.get.mock.calls.length;

        // Comprehensive depth - should not use cache from basic
        mockReq.body = { companyName, depth: 'comprehensive' };
        await researchCompany(mockReq, mockRes, mockNext);

        // Should have made new web requests
        expect(mockAxios.get.mock.calls.length).toBeGreaterThan(basicCallCount);
      });
    });

    describe('Data Extraction', () => {
      test('should extract industry from search results', async () => {
        mockReq.body = { companyName: 'Tech Company' };

        // Set mock search results with software keyword in snippet
        setMockSearchResults([
          {
            title: 'Tech Company - Software Solutions',
            snippet: 'Tech Company is a leading software company specializing in enterprise solutions.',
            url: 'https://example.com'
          }
        ]);

        await researchCompany(mockReq, mockRes, mockNext);

        const response = mockRes.json.mock.calls[0][0];
        expect(response.success).toBe(true);
        expect(response.data.profile.industry).toBe('Software');
      });

      test('should extract headquarters location from search results', async () => {
        mockReq.body = { companyName: 'SF Company' };

        setMockSearchResults([
          {
            title: 'SF Company Overview',
            snippet: 'SF Company is based in san francisco california and serves global markets.',
            url: 'https://example.com'
          }
        ]);

        await researchCompany(mockReq, mockRes, mockNext);

        const response = mockRes.json.mock.calls[0][0];
        expect(response.success).toBe(true);
        expect(response.data.profile.headquarters).toBe('San Francisco');
      });

      test('should extract founding year from search results', async () => {
        mockReq.body = { companyName: 'Old Company' };

        setMockSearchResults([
          {
            title: 'Old Company History',
            snippet: 'Old Company was founded in 2015 by entrepreneurs in the tech sector.',
            url: 'https://example.com'
          }
        ]);

        await researchCompany(mockReq, mockRes, mockNext);

        const response = mockRes.json.mock.calls[0][0];
        expect(response.success).toBe(true);
        expect(response.data.profile.founded).toBe(2015);
      });

      test('should extract employee count and determine range', async () => {
        mockReq.body = { companyName: 'Growing Company', depth: 'comprehensive' };

        // Comprehensive mode makes 5 searches:
        // 1. Overview (empty)
        // 2. Employee size (has results with employee count)
        // 3. Funding (empty)
        // 4. Tech stack (empty)
        // 5. News (empty)
        setMockSearchQueue([
          [], // Search 1: overview - no results
          [ // Search 2: employee size - has employee data
            {
              title: 'Growing Company Team',
              snippet: 'Growing Company has 150 employees across multiple offices worldwide.',
              url: 'https://example.com'
            }
          ],
          [], // Search 3: funding - no results
          [], // Search 4: tech stack - no results
          []  // Search 5: news - no results
        ]);

        await researchCompany(mockReq, mockRes, mockNext);

        const response = mockRes.json.mock.calls[0][0];
        expect(response.success).toBe(true);
        expect(response.data.metrics.employees.count).toBe(150);
        expect(response.data.metrics.employees.range).toBe('51-200');
        expect(response.data.market.positioning).toBe('Growth Stage');
      });

      test('should extract funding information', async () => {
        mockReq.body = { companyName: 'Funded Startup' };
        // Note: depth defaults to 'comprehensive' (5 searches)

        // Comprehensive mode makes 5 searches:
        // 1. Overview (empty)
        // 2. Employee size (empty)
        // 3. Funding (has results with funding info) ← THIS IS THE KEY FIX
        // 4. Tech stack (empty)
        // 5. News (empty)
        setMockSearchQueue([
          [], // Search 1: overview - no results
          [], // Search 2: employee size - no results
          [ // Search 3: funding - has funding data
            {
              title: 'Funded Startup Raises Series B',
              snippet: 'Funded Startup raised $25 million in Series B funding to expand operations.',
              url: 'https://example.com'
            }
          ],
          [], // Search 4: tech stack - no results
          []  // Search 5: news - no results
        ]);

        await researchCompany(mockReq, mockRes, mockNext);

        const response = mockRes.json.mock.calls[0][0];
        expect(response.success).toBe(true);
        expect(response.data.metrics.funding.total).toBe(25);
        expect(response.data.metrics.funding.stage).toBe('Series B');
      });

      test('should detect growth signals from hiring keywords', async () => {
        mockReq.body = { companyName: 'Hiring Company', depth: 'comprehensive' };

        // Comprehensive mode makes 5 searches:
        // 1. Overview (empty)
        // 2. Employee size (has hiring keyword)
        // 3. Funding (empty)
        // 4. Tech stack (empty)
        // 5. News (empty)
        setMockSearchQueue([
          [], // Search 1: overview - no results
          [ // Search 2: size - has hiring keyword
            {
              title: 'Hiring Company Careers',
              snippet: 'Hiring Company is actively hiring and expanding team across all departments.',
              url: 'https://example.com'
            }
          ],
          [], // Search 3: funding - no results
          [], // Search 4: tech stack - no results
          []  // Search 5: news - no results
        ]);

        await researchCompany(mockReq, mockRes, mockNext);

        const response = mockRes.json.mock.calls[0][0];
        expect(response.success).toBe(true);
        expect(response.data.signals.growth.hiring).toBe(true);
      });

      test('should detect risk signals from layoff keywords', async () => {
        mockReq.body = { companyName: 'Struggling Company' };
        // Note: depth defaults to 'comprehensive' (5 searches)

        // Comprehensive mode makes 5 searches:
        // 1. Overview (empty)
        // 2. Employee size (empty)
        // 3. Funding (empty)
        // 4. Tech stack (empty)
        // 5. News (has layoff keyword)
        setMockSearchQueue([
          [], // Search 1: overview - no results
          [], // Search 2: employee size - no results
          [], // Search 3: funding - no results
          [], // Search 4: tech stack - no results
          [ // Search 5: news - has layoff keyword
            {
              title: 'Struggling Company Announces Restructuring',
              snippet: 'Struggling Company announces layoffs and major restructuring to cut costs.',
              url: 'https://example.com'
            }
          ]
        ]);

        await researchCompany(mockReq, mockRes, mockNext);

        const response = mockRes.json.mock.calls[0][0];
        expect(response.success).toBe(true);
        expect(response.data.signals.risk.layoffs).toBe(true);
      });
    });

    describe('Assessment & Scoring', () => {
      test('should assign Tier 1 for high-scoring companies', async () => {
        mockReq.body = { companyName: 'Top Company', depth: 'comprehensive' };

        // Comprehensive mode makes 5 searches:
        // 1. Overview (empty)
        // 2. Employee size (has employees + hiring)
        // 3. Funding (has money + revenue)
        // 4. Tech stack (empty)
        // 5. News (has expansion + product launch)
        setMockSearchQueue([
          [], // Search 1: overview - no results
          [ // Search 2: size - employees + hiring signal
            {
              title: 'Top Company Team',
              snippet: 'Top Company has 500 employees and is hiring rapidly across all departments.',
              url: 'https://example.com'
            }
          ],
          [ // Search 3: funding - raised money + revenue
            {
              title: 'Top Company Funding',
              snippet: 'Top Company raised $100 million Series C with $50 million in annual revenue.',
              url: 'https://example.com'
            }
          ],
          [], // Search 4: tech stack - no results
          [ // Search 5: news - expansion + product launch
            {
              title: 'Top Company News',
              snippet: 'Top Company announces expansion and new product launch in 2024 with record growth.',
              url: 'https://example.com'
            }
          ]
        ]);

        await researchCompany(mockReq, mockRes, mockNext);

        const response = mockRes.json.mock.calls[0][0];
        expect(response.success).toBe(true);
        expect(response.data.assessment.score).toBeGreaterThanOrEqual(85);
        expect(response.data.assessment.tier).toContain('Tier 1');
      });

      test('should assign Tier 4 for low-scoring companies', async () => {
        mockReq.body = { companyName: 'Weak Company' };

        mockAxios.get.mockResolvedValue({
          data: '<html><body></body></html>'
        });

        const mockCheerioInstance = {
          each: jest.fn()
        };

        mockCheerio.load.mockReturnValue(() => mockCheerioInstance);

        await researchCompany(mockReq, mockRes, mockNext);

        const response = mockRes.json.mock.calls[0][0];
        expect(response.success).toBe(true);
        expect(response.data.assessment.tier).toContain('Tier 4');
      });

      test('should estimate deal size based on employee count', async () => {
        mockReq.body = { companyName: 'Mid Company', depth: 'comprehensive' };

        // Comprehensive mode makes 5 searches:
        // 1. Overview (empty)
        // 2. Employee size (has employee count)
        // 3. Funding (empty)
        // 4. Tech stack (empty)
        // 5. News (empty)
        setMockSearchQueue([
          [], // Search 1: overview - no results
          [ // Search 2: size - has employee count
            {
              title: 'Mid Company Team Size',
              snippet: 'Mid Company employs 150 people across multiple locations.',
              url: 'https://example.com'
            }
          ],
          [], // Search 3: funding - no results
          [], // Search 4: tech stack - no results
          []  // Search 5: news - no results
        ]);

        await researchCompany(mockReq, mockRes, mockNext);

        const response = mockRes.json.mock.calls[0][0];
        expect(response.success).toBe(true);
        expect(response.data.assessment.estimatedDealSize).toBe('$30K - $100K');
      });

      test('should identify strengths for well-funded companies', async () => {
        mockReq.body = { companyName: 'Rich Company' };
        // Note: depth defaults to 'comprehensive' (5 searches)

        // Comprehensive mode makes 5 searches:
        // 1. Overview (empty)
        // 2. Employee size (empty)
        // 3. Funding (has recent funding)
        // 4. Tech stack (empty)
        // 5. News (empty)
        setMockSearchQueue([
          [], // Search 1: overview - no results
          [], // Search 2: employee size - no results
          [ // Search 3: funding - has recent funding
            {
              title: 'Rich Company Raises Funding',
              snippet: 'Rich Company raised $50 million funding in 2024 to accelerate growth.',
              url: 'https://example.com'
            }
          ],
          [], // Search 4: tech stack - no results
          []  // Search 5: news - no results
        ]);

        await researchCompany(mockReq, mockRes, mockNext);

        const response = mockRes.json.mock.calls[0][0];
        expect(response.success).toBe(true);
        expect(response.data.assessment.strengths).toContain('Well-funded');
        expect(response.data.assessment.strengths).toContain('Recent funding (budget available)');
      });

      test('should identify weaknesses for companies with layoffs', async () => {
        mockReq.body = { companyName: 'Downsizing Company' };
        // Note: depth defaults to 'comprehensive' (5 searches)

        // Comprehensive mode makes 5 searches:
        // 1. Overview (empty)
        // 2. Employee size (empty)
        // 3. Funding (empty)
        // 4. Tech stack (empty)
        // 5. News (has layoff keyword)
        setMockSearchQueue([
          [], // Search 1: overview - no results
          [], // Search 2: employee size - no results
          [], // Search 3: funding - no results
          [], // Search 4: tech stack - no results
          [ // Search 5: news - has layoff keyword
            {
              title: 'Downsizing Company Cuts Staff',
              snippet: 'Downsizing Company announces layoffs and cost reduction measures.',
              url: 'https://example.com'
            }
          ]
        ]);

        await researchCompany(mockReq, mockRes, mockNext);

        const response = mockRes.json.mock.calls[0][0];
        expect(response.success).toBe(true);
        expect(response.data.assessment.weaknesses).toContain('Recent layoffs (budget concerns)');
      });
    });

    describe('Depth Modes', () => {
      test('should skip employee search in basic mode', async () => {
        mockReq.body = { companyName: 'Basic Company', depth: 'basic' };

        mockAxios.get.mockResolvedValue({
          data: '<html><body></body></html>'
        });

        const mockCheerioInstance = {
          each: jest.fn()
        };

        mockCheerio.load.mockReturnValue(() => mockCheerioInstance);

        await researchCompany(mockReq, mockRes, mockNext);

        // In basic mode, only 3 searches: overview, funding, news
        expect(mockAxios.get).toHaveBeenCalledTimes(3);
      });

      test('should include employee search in comprehensive mode', async () => {
        mockReq.body = { companyName: 'Comprehensive Company', depth: 'comprehensive' };

        mockAxios.get.mockResolvedValue({
          data: '<html><body></body></html>'
        });

        const mockCheerioInstance = {
          each: jest.fn()
        };

        mockCheerio.load.mockReturnValue(() => mockCheerioInstance);

        await researchCompany(mockReq, mockRes, mockNext);

        // Comprehensive mode: overview, size, funding, tech, news (5 searches)
        expect(mockAxios.get).toHaveBeenCalledTimes(5);
      });

      test('should include technology search in deep mode', async () => {
        mockReq.body = { companyName: 'Deep Company', depth: 'deep' };

        mockAxios.get.mockResolvedValue({
          data: '<html><body></body></html>'
        });

        const mockCheerioInstance = {
          each: jest.fn()
        };

        mockCheerio.load.mockReturnValue(() => mockCheerioInstance);

        await researchCompany(mockReq, mockRes, mockNext);

        // Deep mode includes all searches
        expect(mockAxios.get).toHaveBeenCalledTimes(5);
      });
    });

    describe('Error Handling', () => {
      test('should handle web search failures gracefully', async () => {
        mockReq.body = { companyName: 'Fail Company' };

        // All searches fail
        mockAxios.get.mockRejectedValue(new Error('Network error'));

        await researchCompany(mockReq, mockRes, mockNext);

        // Should complete successfully even when searches fail
        expect(mockRes.json).toHaveBeenCalled();
        expect(mockRes.json.mock.calls[0][0].success).toBe(true);
        // Should not crash - next() not called with error
        expect(mockNext).not.toHaveBeenCalled();
      });

      test('should continue on individual search failure', async () => {
        mockReq.body = { companyName: 'Partial Fail Company' };

        // First search succeeds, second fails, rest succeed
        mockAxios.get
          .mockResolvedValueOnce({ data: '<html><body></body></html>' })
          .mockRejectedValueOnce(new Error('Timeout'))
          .mockResolvedValue({ data: '<html><body></body></html>' });

        const mockCheerioInstance = {
          each: jest.fn()
        };

        mockCheerio.load.mockReturnValue(() => mockCheerioInstance);

        await researchCompany(mockReq, mockRes, mockNext);

        // Should complete successfully despite individual search failure
        expect(mockRes.json).toHaveBeenCalled();
        expect(mockRes.json.mock.calls[0][0].success).toBe(true);
        // performWebSearch catches errors and calls logger.error (not logger.warn)
        expect(mockLogger.error).toHaveBeenCalled();
      });

      test('should handle malformed HTML gracefully', async () => {
        mockReq.body = { companyName: 'Bad HTML Company' };

        mockAxios.get.mockResolvedValue({
          data: '<html><body><div class="broken'
        });

        // Cheerio throwing error would be caught in performWebSearch
        // which returns [] and allows function to continue
        mockCheerio.load.mockImplementation(() => {
          throw new Error('Parse error');
        });

        await researchCompany(mockReq, mockRes, mockNext);

        // Should complete successfully even with parse errors
        expect(mockRes.json).toHaveBeenCalled();
        expect(mockRes.json.mock.calls[0][0].success).toBe(true);
        // Should not crash - errors handled gracefully
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('Metadata & Metrics', () => {
      test('should calculate data quality based on collected data points', async () => {
        mockReq.body = { companyName: 'Quality Company' };

        mockAxios.get.mockResolvedValue({
          data: '<html><body></body></html>'
        });

        const mockCheerioInstance = {
          each: jest.fn()
        };

        mockCheerio.load.mockReturnValue(() => mockCheerioInstance);

        await researchCompany(mockReq, mockRes, mockNext);

        const response = mockRes.json.mock.calls[0][0];
        expect(response.success).toBe(true);
        expect(response.data.metadata.dataQuality).toBeGreaterThanOrEqual(0);
        expect(response.data.metadata.dataQuality).toBeLessThanOrEqual(100);
      });

      test('should track research date in metadata', async () => {
        mockReq.body = { companyName: 'Date Company' };

        mockAxios.get.mockResolvedValue({
          data: '<html><body></body></html>'
        });

        const mockCheerioInstance = {
          each: jest.fn()
        };

        mockCheerio.load.mockReturnValue(() => mockCheerioInstance);

        await researchCompany(mockReq, mockRes, mockNext);

        const response = mockRes.json.mock.calls[0][0];
        expect(response.success).toBe(true);
        expect(response.data.metadata.researchDate).toBeTruthy();
        expect(new Date(response.data.metadata.researchDate).getTime()).toBeLessThanOrEqual(Date.now());
      });

      test('should return metrics with response', async () => {
        mockReq.body = { companyName: 'Metrics Company' };

        mockAxios.get.mockResolvedValue({
          data: '<html><body></body></html>'
        });

        const mockCheerioInstance = {
          each: jest.fn()
        };

        mockCheerio.load.mockReturnValue(() => mockCheerioInstance);

        await researchCompany(mockReq, mockRes, mockNext);

        const response = mockRes.json.mock.calls[0][0];
        expect(response.metrics).toBeDefined();
        expect(response.metrics.dataPointsCollected).toBeGreaterThanOrEqual(0);
        expect(response.metrics.searchesPerformed).toBeGreaterThan(0);
        expect(response.metrics.confidence).toBeGreaterThanOrEqual(0);
        expect(response.metrics.dataQuality).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('getResearchedCompanies', () => {
    beforeEach(async () => {
      // Clear cache before each test
      mockReq.body = {};
      await clearResearchCache(mockReq, mockRes, mockNext);
      jest.clearAllMocks();
    });

    test('should return empty list when no companies cached', async () => {
      mockReq = {};
      mockRes = {
        json: jest.fn()
      };

      await getResearchedCompanies(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        companies: [],
        cacheInfo: {
          totalCached: 0,
          ttl: expect.any(Number)
        }
      });
    });

    test('should return list of cached companies', async () => {
      // First, research a company to populate cache
      mockReq.body = { companyName: 'Cached Company 1' };

      mockAxios.get.mockResolvedValue({
        data: '<html><body></body></html>'
      });

      const mockCheerioInstance = {
        each: jest.fn()
      };

      mockCheerio.load.mockReturnValue(() => mockCheerioInstance);

      await researchCompany(mockReq, mockRes, mockNext);

      jest.clearAllMocks();

      // Now get the list
      mockReq = {};
      mockRes = {
        json: jest.fn()
      };

      await getResearchedCompanies(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.companies).toHaveLength(1);
      expect(response.companies[0].name).toBe('Cached Company 1');
      expect(response.companies[0].tier).toBeDefined();
      expect(response.companies[0].score).toBeDefined();
      expect(response.companies[0].cachedAt).toBeDefined();
    });

    test('should handle errors gracefully', async () => {
      mockReq = {};
      mockRes = {
        json: jest.fn()
      };
      mockNext = jest.fn();

      // Force an error by making the function throw
      const originalConsoleError = console.error;
      console.error = jest.fn();

      await getResearchedCompanies(mockReq, mockRes, mockNext);

      console.error = originalConsoleError;

      // Should still return success or call next with error
      expect(mockRes.json).toHaveBeenCalled();
    });
  });

  describe('clearResearchCache', () => {
    test('should clear all cache when no company name provided', async () => {
      // First, populate cache with a company
      mockReq.body = { companyName: 'Test Company' };

      mockAxios.get.mockResolvedValue({
        data: '<html><body></body></html>'
      });

      const mockCheerioInstance = {
        each: jest.fn()
      };

      mockCheerio.load.mockReturnValue(() => mockCheerioInstance);

      await researchCompany(mockReq, mockRes, mockNext);

      jest.clearAllMocks();

      // Clear all cache
      mockReq.body = {};

      await clearResearchCache(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'All cache cleared',
        keysCleared: expect.any(Number)
      });
    });

    test('should clear specific company cache when name provided', async () => {
      // Populate cache with two companies
      mockReq.body = { companyName: 'Company A' };

      mockAxios.get.mockResolvedValue({
        data: '<html><body></body></html>'
      });

      const mockCheerioInstance = {
        each: jest.fn()
      };

      mockCheerio.load.mockReturnValue(() => mockCheerioInstance);

      await researchCompany(mockReq, mockRes, mockNext);

      mockReq.body = { companyName: 'Company B' };
      await researchCompany(mockReq, mockRes, mockNext);

      jest.clearAllMocks();

      // Clear only Company A
      mockReq.body = { companyName: 'Company A' };

      await clearResearchCache(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.message).toContain('Company A');
      expect(response.keysCleared).toBeGreaterThanOrEqual(1);
    });

    test('should handle errors when clearing cache', async () => {
      mockReq.body = {};
      mockRes = {
        json: jest.fn()
      };
      mockNext = jest.fn();

      await clearResearchCache(mockReq, mockRes, mockNext);

      // Should either succeed or call next with error
      const wasSuccessful = mockRes.json.mock.calls.length > 0;
      const wasError = mockNext.mock.calls.length > 0;

      expect(wasSuccessful || wasError).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle complete research workflow', async () => {
      const companyName = 'Complete Workflow Company';

      // 1. Research company
      mockReq.body = { companyName };

      mockAxios.get.mockResolvedValue({
        data: '<html><body></body></html>'
      });

      const mockCheerioInstance = {
        each: jest.fn()
      };

      mockCheerio.load.mockReturnValue(() => mockCheerioInstance);

      await researchCompany(mockReq, mockRes, mockNext);

      expect(mockRes.json.mock.calls[0][0].success).toBe(true);

      jest.clearAllMocks();

      // 2. Get researched companies list
      mockReq = {};
      mockRes = { json: jest.fn() };

      await getResearchedCompanies(mockReq, mockRes, mockNext);

      expect(mockRes.json.mock.calls[0][0].companies).toHaveLength(1);

      jest.clearAllMocks();

      // 3. Clear specific company cache
      mockReq.body = { companyName };
      mockRes = { json: jest.fn() };

      await clearResearchCache(mockReq, mockRes, mockNext);

      expect(mockRes.json.mock.calls[0][0].success).toBe(true);
    });

    test('should handle case-insensitive company name matching', async () => {
      const companyName = 'CaSe InSeNsItIvE';

      // Research with mixed case
      mockReq.body = { companyName };

      mockAxios.get.mockResolvedValue({
        data: '<html><body></body></html>'
      });

      const mockCheerioInstance = {
        each: jest.fn()
      };

      mockCheerio.load.mockReturnValue(() => mockCheerioInstance);

      await researchCompany(mockReq, mockRes, mockNext);

      jest.clearAllMocks();

      // Clear with different case
      mockReq.body = { companyName: companyName.toLowerCase() };

      await clearResearchCache(mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.keysCleared).toBeGreaterThanOrEqual(1);
    });
  });
});
