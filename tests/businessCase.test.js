import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import { withAuth } from './helpers/auth.js';

// Mock the supabase data service (backend migrated from Airtable to Supabase)
const mockSupabaseDataService = {
  getCustomerById: jest.fn(),
  getCustomerByEmail: jest.fn(),
  updateCustomer: jest.fn(),
  getAllCustomers: jest.fn(),
  createCustomer: jest.fn(),
  deleteCustomer: jest.fn(),
  updateUserProgress: jest.fn(),
  createUserProgress: jest.fn(),
};

// Mock MUST be set up BEFORE importing app
jest.unstable_mockModule('../src/services/supabaseDataService.js', () => ({
  default: mockSupabaseDataService
}));

// NOW import app (after mock is configured)
const { default: app } = await import('../src/server.js');

describe('Business Case Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/business-case/generate', () => {
    test('should generate pilot program business case', async () => {
      const input = {
        customerId: '550e8400-e29b-41d4-a716-446655441001',
        type: 'pilot',
        requirements: {
          timeline: '3-6 months',
          budget: 50000,
          teamSize: 5,
          successMetrics: ['ROI > 200%', 'User adoption > 80%']
        },
        context: {
          industry: 'Technology',
          companySize: 'Mid-Market',
          currentChallenges: ['Manual processes', 'Data silos']
        }
      };

      // Mock customer retrieval
      mockSupabaseDataService.getCustomerById.mockResolvedValue({
        customerId: input.customerId,
        customerName: 'Test Customer',
        email: 'test@example.com'
      });
      mockSupabaseDataService.updateCustomer.mockResolvedValue({});

      const response = await request(app)
        .post('/api/business-case/generate')
        .send(input)
        .set(withAuth(input.customerId))
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          businessCase: {
            type: 'pilot',
            executiveSummary: expect.any(String),
            problemStatement: expect.any(String),
            proposedSolution: expect.any(String),
            investment: expect.objectContaining({
              totalCost: expect.any(Number),
              timeline: expect.any(String)
            }),
            expectedOutcomes: expect.any(Array),
            successMetrics: expect.any(Array),
            riskAssessment: expect.any(Object),
            nextSteps: expect.any(Array)
          },
          metadata: {
            generatedAt: expect.any(String),
            customerId: '550e8400-e29b-41d4-a716-446655441001',
            version: expect.any(String)
          }
        }
      });

      // Verify content quality
      const businessCase = response.body.data.businessCase;
      expect(businessCase.executiveSummary.length).toBeGreaterThan(100);
      expect(businessCase.expectedOutcomes.length).toBeGreaterThan(0);
      expect(businessCase.investment.totalCost).toBeGreaterThan(0);
    });

    test('should generate full implementation business case', async () => {
      const input = {
        customerId: '550e8400-e29b-41d4-a716-446655441002',
        type: 'full',
        requirements: {
          timeline: '6-18 months',
          budget: 250000,
          teamSize: 15,
          successMetrics: ['Revenue increase > 25%', 'Cost reduction > 15%']
        },
        context: {
          industry: 'Financial Services',
          companySize: 'Enterprise',
          currentChallenges: ['Compliance overhead', 'Scalability issues']
        }
      };

      // Mock customer retrieval
      mockSupabaseDataService.getCustomerById.mockResolvedValue({
        customerId: input.customerId,
        customerName: 'Enterprise Customer',
        email: 'enterprise@example.com'
      });
      mockSupabaseDataService.updateCustomer.mockResolvedValue({});

      const response = await request(app)
        .post('/api/business-case/generate')
        .send(input)
        .set(withAuth(input.customerId))
        .expect(200);

      expect(response.body.data.businessCase.type).toBe('full');
      expect(response.body.data.businessCase.investment.totalCost).toBeGreaterThan(100000);
      
      // Full implementation should have more comprehensive content
      const businessCase = response.body.data.businessCase;
      expect(businessCase.strategicAlignment).toBeDefined();
      expect(businessCase.currentStateAnalysis).toBeDefined();
      expect(businessCase.solutionArchitecture).toBeDefined();
    });

    test('should validate business case type', async () => {
      const response = await request(app)
        .post('/api/business-case/generate')
        .send({
          customerId: '550e8400-e29b-41d4-a716-446655441001',
          type: 'invalid',
          requirements: {
            timeline: '3 months',
            budget: 50000
          }
        })
        .set(withAuth('550e8400-e29b-41d4-a716-446655441001'))
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Validation Error'
      });
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/business-case/generate')
        .send({
          customerId: '550e8400-e29b-41d4-a716-446655441001'
          // Missing type and requirements
        })
        .set(withAuth('550e8400-e29b-41d4-a716-446655441001'))
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should handle budget range validation', async () => {
      const response = await request(app)
        .post('/api/business-case/generate')
        .send({
          customerId: '550e8400-e29b-41d4-a716-446655441001',
          type: 'pilot',
          requirements: {
            budget: -1000,
            timeline: '3 months'
          }
        })
        .set(withAuth('550e8400-e29b-41d4-a716-446655441001'))
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/business-case/customize', () => {
    test('should customize existing business case', async () => {
      const input = {
        customerId: '550e8400-e29b-41d4-a716-446655441001',
        businessCaseId: 'bc_123',
        customizations: {
          executiveSummary: 'Custom executive summary content',
          additionalMetrics: ['Customer satisfaction > 90%'],
          stakeholderRequirements: ['Legal approval', 'IT security review'],
          budgetAdjustments: {
            additionalCosts: 10000,
            reasonCode: 'Additional compliance requirements'
          }
        }
      };

      const mockCustomer = {
        customerId: '550e8400-e29b-41d4-a716-446655441001',
        businessCaseContent: JSON.stringify({
          bc_123: {
            type: 'pilot',
            executiveSummary: 'Original summary',
            investment: { totalCost: 50000 }
          }
        })
      };

      mockSupabaseDataService.getCustomerById.mockResolvedValue(mockCustomer);
      mockSupabaseDataService.updateCustomer.mockResolvedValue({});

      const response = await request(app)
        .post('/api/business-case/customize')
        .send(input)
        .set(withAuth(input.customerId))
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          businessCase: {
            executiveSummary: 'Custom executive summary content',
            investment: {
              totalCost: 60000 // Original 50k + 10k adjustment
            }
          },
          customizations: {
            applied: expect.any(Array),
            timestamp: expect.any(String)
          }
        }
      });
    });

    test('should return 404 for non-existent business case', async () => {
      const mockCustomer = {
        customerId: '550e8400-e29b-41d4-a716-446655441001',
        businessCaseContent: null
      };

      mockSupabaseDataService.getCustomerById.mockResolvedValue(mockCustomer);

      const response = await request(app)
        .post('/api/business-case/customize')
        .send({
          customerId: '550e8400-e29b-41d4-a716-446655441001',
          businessCaseId: 'bc_nonexistent',
          customizations: {}
        })
        .set(withAuth('550e8400-e29b-41d4-a716-446655441001'))
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Business case not found'
      });
    });
  });

  describe('GET /api/business-case/templates', () => {
    test('should return available templates', async () => {
      const response = await request(app)
        .get('/api/business-case/templates')
        .set(withAuth('550e8400-e29b-41d4-a716-446655441001'))
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          templates: expect.arrayContaining([
            expect.objectContaining({
              name: 'Pilot Program Proposal',
              type: 'pilot',
              duration: expect.any(String),
              investment: expect.any(String),
              sections: expect.any(Array),
              keyPoints: expect.any(Array)
            }),
            expect.objectContaining({
              name: 'Full Implementation Business Case',
              type: 'full',
              duration: expect.any(String),
              investment: expect.any(String)
            })
          ])
        }
      });

      expect(response.body.data.templates.length).toBeGreaterThanOrEqual(2);
    });

    test('should filter templates by type', async () => {
      const response = await request(app)
        .get('/api/business-case/templates?type=pilot')
        .set(withAuth('550e8400-e29b-41d4-a716-446655441001'))
        .expect(200);

      const templates = response.body.data.templates;
      expect(templates.every(t => t.type === 'pilot')).toBe(true);
    });

    test('should handle invalid template type filter', async () => {
      const response = await request(app)
        .get('/api/business-case/templates?type=invalid')
        .set(withAuth('550e8400-e29b-41d4-a716-446655441001'))
        .expect(200);

      expect(response.body.data.templates).toEqual([]);
    });
  });

  describe('GET /api/business-case/:customerId/history', () => {
    test('should retrieve business case history', async () => {
      const mockCustomer = {
        customerId: '550e8400-e29b-41d4-a716-446655441001',
        businessCaseContent: JSON.stringify({
          bc_001: {
            type: 'pilot',
            createdAt: '2024-01-15T10:00:00Z',
            investment: { totalCost: 50000 }
          },
          bc_002: {
            type: 'full',
            createdAt: '2024-01-20T14:30:00Z',
            investment: { totalCost: 200000 }
          }
        })
      };

      mockSupabaseDataService.getCustomerById.mockResolvedValue(mockCustomer);

      const response = await request(app)
        .get('/api/business-case/550e8400-e29b-41d4-a716-446655441001/history')
        .set(withAuth('550e8400-e29b-41d4-a716-446655441001'))
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          customerId: '550e8400-e29b-41d4-a716-446655441001',
          businessCases: expect.arrayContaining([
            expect.objectContaining({
              id: 'bc_001',
              type: 'pilot'
            }),
            expect.objectContaining({
              id: 'bc_002',
              type: 'full'
            })
          ])
        }
      });

      expect(response.body.data.businessCases).toHaveLength(2);
    });

    test('should handle empty history', async () => {
      const mockCustomer = {
        customerId: '550e8400-e29b-41d4-a716-446655441001',
        businessCaseContent: null
      };

      mockSupabaseDataService.getCustomerById.mockResolvedValue(mockCustomer);

      const response = await request(app)
        .get('/api/business-case/550e8400-e29b-41d4-a716-446655441001/history')
        .set(withAuth('550e8400-e29b-41d4-a716-446655441001'))
        .expect(200);

      expect(response.body.data.businessCases).toEqual([]);
    });

    test('should sort history by creation date (newest first)', async () => {
      const mockCustomer = {
        customerId: '550e8400-e29b-41d4-a716-446655441001',
        businessCaseContent: JSON.stringify({
          bc_old: {
            createdAt: '2024-01-01T10:00:00Z',
            type: 'pilot'
          },
          bc_new: {
            createdAt: '2024-01-15T10:00:00Z',
            type: 'full'
          }
        })
      };

      mockSupabaseDataService.getCustomerById.mockResolvedValue(mockCustomer);

      const response = await request(app)
        .get('/api/business-case/550e8400-e29b-41d4-a716-446655441001/history')
        .set(withAuth('550e8400-e29b-41d4-a716-446655441001'))
        .expect(200);

      const businessCases = response.body.data.businessCases;
      expect(businessCases[0].id).toBe('bc_new');
      expect(businessCases[1].id).toBe('bc_old');
    });
  });

  describe('POST /api/business-case/save', () => {
    test('should save generated business case', async () => {
      const businessCaseData = {
        customerId: '550e8400-e29b-41d4-a716-446655441001',
        businessCase: {
          type: 'pilot',
          executiveSummary: 'Test executive summary',
          investment: { totalCost: 75000 },
          successMetrics: ['ROI > 200%']
        }
      };

      const mockCustomer = {
        customerId: '550e8400-e29b-41d4-a716-446655441001',
        customerName: 'Test Customer'
      };

      mockSupabaseDataService.getCustomerById.mockResolvedValue(mockCustomer);
      mockSupabaseDataService.updateCustomer.mockResolvedValue({});
      mockSupabaseDataService.createUserProgress.mockResolvedValue({ id: 'rec123' });

      const response = await request(app)
        .post('/api/business-case/save')
        .send(businessCaseData)
        .set(withAuth(businessCaseData.customerId))
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          customerId: '550e8400-e29b-41d4-a716-446655441001',
          businessCaseId: expect.any(String),
          saved: true
        }
      });

      expect(mockSupabaseDataService.updateCustomer).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655441001',
        expect.objectContaining({
          'business_case_content': expect.stringContaining('75000')
        })
      );
    });

    test('should handle duplicate business case saves', async () => {
      const mockCustomer = {
        customerId: '550e8400-e29b-41d4-a716-446655441001',
        businessCaseContent: JSON.stringify({
          existing: {
            type: 'pilot',
            executiveSummary: 'Existing summary'
          }
        })
      };

      mockSupabaseDataService.getCustomerById.mockResolvedValue(mockCustomer);
      mockSupabaseDataService.updateCustomer.mockResolvedValue({});

      const response = await request(app)
        .post('/api/business-case/save')
        .send({
          customerId: '550e8400-e29b-41d4-a716-446655441001',
          businessCase: {
            type: 'pilot',
            executiveSummary: 'New summary'
          }
        })
        .set(withAuth('550e8400-e29b-41d4-a716-446655441001'))
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Should generate a new business case ID
      expect(response.body.data.businessCaseId).toBeDefined();
      expect(response.body.data.businessCaseId).not.toBe('existing');
    });
  });

  describe('POST /api/business-case/export', () => {
    test('should export business case as PDF', async () => {
      const input = {
        customerId: '550e8400-e29b-41d4-a716-446655441001',
        businessCaseId: 'bc_123',
        format: 'pdf',
        options: {
          includeCharts: true,
          includeAppendices: false
        }
      };

      const mockCustomer = {
        customerId: '550e8400-e29b-41d4-a716-446655441001',
        businessCaseContent: JSON.stringify({
          bc_123: {
            type: 'pilot',
            executiveSummary: 'Test summary',
            investment: { totalCost: 50000 }
          }
        })
      };

      mockSupabaseDataService.getCustomerById.mockResolvedValue(mockCustomer);

      const response = await request(app)
        .post('/api/business-case/export')
        .send(input)
        .set(withAuth(input.customerId))
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          downloadUrl: expect.stringMatching(/^https?:\/\//),
          format: 'pdf',
          expiresAt: expect.any(String),
          fileSize: expect.any(Number)
        }
      });
    });

    test('should export business case as Word document', async () => {
      const input = {
        customerId: '550e8400-e29b-41d4-a716-446655441001',
        businessCaseId: 'bc_123',
        format: 'docx'
      };

      const mockCustomer = {
        customerId: '550e8400-e29b-41d4-a716-446655441001',
        businessCaseContent: JSON.stringify({
          bc_123: { type: 'pilot' }
        })
      };

      mockSupabaseDataService.getCustomerById.mockResolvedValue(mockCustomer);

      const response = await request(app)
        .post('/api/business-case/export')
        .send(input)
        .set(withAuth(input.customerId))
        .expect(200);

      expect(response.body.data.format).toBe('docx');
    });

    test('should validate export format', async () => {
      const response = await request(app)
        .post('/api/business-case/export')
        .send({
          customerId: '550e8400-e29b-41d4-a716-446655441001',
          businessCaseId: 'bc_123',
          format: 'invalid'
        })
        .set(withAuth('550e8400-e29b-41d4-a716-446655441001'))
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});