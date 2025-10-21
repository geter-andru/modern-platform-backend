import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import { withAuth } from './helpers/auth.js';

// Create the mock BEFORE any imports that might use it
const mockSupabaseDataService = {
  getCustomerById: jest.fn(),
  updateCustomer: jest.fn(),
  createUserProgress: jest.fn(),
};

// Mock the service BEFORE importing app
jest.unstable_mockModule('../src/services/supabaseDataService.js', () => ({
  default: mockSupabaseDataService
}));

// NOW import app (after mock is set up)
const { default: app } = await import('../src/server.js');

describe('Cost Calculator Endpoints', () => {
  const testCustomerId = '550e8400-e29b-41d4-a716-446655440001';
  const nonExistentCustomerId = '550e8400-e29b-41d4-a716-446655449999';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock behaviors
    mockSupabaseDataService.getCustomerById.mockImplementation((customerId) => {
      if (customerId === testCustomerId) {
        return Promise.resolve({
          customerId: testCustomerId,
          customerName: 'Test Customer'
        });
      }
      return Promise.resolve(null);
    });
  });

  describe('POST /api/cost-calculator/calculate', () => {
    test('should calculate cost of inaction with default values', async () => {
      const input = {
        customerId: testCustomerId,
        potentialDeals: 10,
        averageDealSize: 50000,
        conversionRate: 0.3,
        delayMonths: 6,
        currentOperatingCost: 100000,
        inefficiencyRate: 0.2,
        employeeCount: 100,
        averageSalary: 75000,
        marketShare: 0.15
      };

      const response = await request(app)
        .post('/api/cost-calculator/calculate')
        .set(withAuth(testCustomerId))
        .send(input)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          summary: {
            totalCost: expect.any(Number),
            monthlyCost: expect.any(Number),
            dailyCost: expect.any(Number)
          },
          categories: {
            lostRevenue: expect.objectContaining({
              value: expect.any(Number),
              formula: expect.any(String),
              percentage: expect.any(Number)
            }),
            operationalInefficiencies: expect.objectContaining({
              value: expect.any(Number),
              formula: expect.any(String)
            }),
            competitiveDisadvantage: expect.objectContaining({
              value: expect.any(Number)
            }),
            productivityLosses: expect.objectContaining({
              value: expect.any(Number)
            })
          },
          scenario: 'realistic',
          inputs: expect.objectContaining({
            customerId: testCustomerId,
            potentialDeals: 10,
            averageDealSize: 50000
          })
        }
      });

      // Verify calculations are reasonable
      const { data } = response.body;
      expect(data.summary.totalCost).toBeGreaterThan(0);
      expect(data.summary.monthlyCost).toBeLessThan(data.summary.totalCost);
      expect(data.categories.lostRevenue.value).toBeGreaterThan(0);
    });

    test('should handle conservative scenario', async () => {
      const input = {
        customerId: testCustomerId,
        potentialDeals: 5,
        averageDealSize: 25000,
        conversionRate: 0.25,
        delayMonths: 3,
        currentOperatingCost: 50000,
        inefficiencyRate: 0.15,
        employeeCount: 50,
        averageSalary: 60000,
        marketShare: 0.1,
        scenario: 'conservative'
      };

      const response = await request(app)
        .post('/api/cost-calculator/calculate')
        .set(withAuth(testCustomerId))
        .send(input)
        .expect(200);

      expect(response.body.data.scenario).toBe('conservative');
      expect(response.body.data.summary.totalCost).toBeGreaterThan(0);
    });

    test('should handle aggressive scenario', async () => {
      const input = {
        customerId: testCustomerId,
        potentialDeals: 20,
        averageDealSize: 100000,
        conversionRate: 0.4,
        delayMonths: 12,
        currentOperatingCost: 200000,
        inefficiencyRate: 0.3,
        employeeCount: 200,
        averageSalary: 90000,
        marketShare: 0.25,
        scenario: 'aggressive'
      };

      const response = await request(app)
        .post('/api/cost-calculator/calculate')
        .set(withAuth(testCustomerId))
        .send(input)
        .expect(200);

      expect(response.body.data.scenario).toBe('aggressive');

      // Aggressive scenario should have higher costs
      const aggressiveTotal = response.body.data.summary.totalCost;

      // Calculate same with realistic for comparison
      const realisticResponse = await request(app)
        .post('/api/cost-calculator/calculate')
        .set(withAuth(testCustomerId))
        .send({ ...input, scenario: 'realistic' });

      const realisticTotal = realisticResponse.body.data.summary.totalCost;
      expect(aggressiveTotal).toBeGreaterThan(realisticTotal);
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/cost-calculator/calculate')
        .set(withAuth(testCustomerId))
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Validation Error'
      });
    });

    test('should validate numeric ranges', async () => {
      const response = await request(app)
        .post('/api/cost-calculator/calculate')
        .set(withAuth(testCustomerId))
        .send({
          customerId: testCustomerId,
          potentialDeals: -5,
          averageDealSize: 0,
          delayMonths: 100
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should handle decimal values correctly', async () => {
      const response = await request(app)
        .post('/api/cost-calculator/calculate')
        .set(withAuth(testCustomerId))
        .send({
          customerId: testCustomerId,
          potentialDeals: 7.5,
          averageDealSize: 45678.90,
          conversionRate: 0.125,
          delayMonths: 4.5,
          currentOperatingCost: 85000,
          inefficiencyRate: 0.085,
          employeeCount: 75,
          averageSalary: 65000,
          marketShare: 0.12
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.totalCost).toBeGreaterThan(0);
    });
  });

  describe('POST /api/cost-calculator/save', () => {
    test('should save calculation results', async () => {
      const mockCustomer = {
        customerId: testCustomerId,
        customerName: 'Test Customer'
      };

      const calculationData = {
        customerId: testCustomerId,
        calculations: {
          totalCost: 500000,
          monthlyCost: 41666.67,
          scenario: 'realistic',
          categories: {
            lostRevenue: { value: 250000 },
            operationalInefficiencies: { value: 150000 },
            competitiveDisadvantage: { value: 75000 },
            productivityLosses: { value: 25000 }
          }
        }
      };

      mockSupabaseDataService.getCustomerById.mockResolvedValue(mockCustomer);
      mockSupabaseDataService.updateCustomer.mockResolvedValue({});
      mockSupabaseDataService.createUserProgress.mockResolvedValue({ id: 'rec123' });

      const response = await request(app)
        .post('/api/cost-calculator/save')
        .set(withAuth(testCustomerId))
        .send(calculationData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          customerId: testCustomerId,
          saved: true
        }
      });

      expect(mockSupabaseDataService.updateCustomer).toHaveBeenCalledWith(
        testCustomerId,
        expect.objectContaining({
          cost_calculator_content: expect.stringContaining('500000')
        })
      );

      expect(mockSupabaseDataService.createUserProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_id: testCustomerId,
          tool_name: 'Cost Calculator'
        })
      );
    });

    test('should return 404 for non-existent customer', async () => {
      mockSupabaseDataService.getCustomerById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/cost-calculator/save')
        .set(withAuth(nonExistentCustomerId))
        .send({
          customerId: nonExistentCustomerId,
          calculations: { totalCost: 100000 }
        })
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Customer not found'
      });
    });

    test('should validate calculation data structure', async () => {
      const response = await request(app)
        .post('/api/cost-calculator/save')
        .set(withAuth(testCustomerId))
        .send({
          customerId: testCustomerId,
          calculations: 'invalid'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/cost-calculator/history/:customerId', () => {
    test('should retrieve calculation history', async () => {
      const mockCustomer = {
        customerId: testCustomerId,
        cost_calculator_content: JSON.stringify({
          history: [
            {
              date: '2024-01-15T10:00:00Z',
              totalCost: 450000,
              scenario: 'conservative'
            },
            {
              date: '2024-01-20T14:30:00Z',
              totalCost: 500000,
              scenario: 'realistic'
            }
          ]
        })
      };

      mockSupabaseDataService.getCustomerById.mockResolvedValue(mockCustomer);

      const response = await request(app)
        .get(`/api/cost-calculator/history/${testCustomerId}`)
        .set(withAuth(testCustomerId))
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          customerId: testCustomerId,
          history: expect.arrayContaining([
            expect.objectContaining({
              totalCost: 450000,
              scenario: 'conservative'
            })
          ])
        }
      });

      expect(response.body.data.history).toHaveLength(2);
    });

    test('should handle empty history', async () => {
      const mockCustomer = {
        customerId: testCustomerId,
        cost_calculator_content: null
      };

      mockSupabaseDataService.getCustomerById.mockResolvedValue(mockCustomer);

      const response = await request(app)
        .get(`/api/cost-calculator/history/${testCustomerId}`)
        .set(withAuth(testCustomerId))
        .expect(200);

      expect(response.body.data.history).toEqual([]);
    });

    test('should handle malformed history JSON', async () => {
      const mockCustomer = {
        customerId: testCustomerId,
        cost_calculator_content: 'invalid json{'
      };

      mockSupabaseDataService.getCustomerById.mockResolvedValue(mockCustomer);

      const response = await request(app)
        .get(`/api/cost-calculator/history/${testCustomerId}`)
        .set(withAuth(testCustomerId))
        .expect(200);

      expect(response.body.data.history).toEqual([]);
    });
  });

  describe('POST /api/cost-calculator/compare', () => {
    test('should compare multiple scenarios', async () => {
      const input = {
        customerId: testCustomerId,
        baseInputs: {
          potentialDeals: 10,
          averageDealSize: 50000,
          conversionRate: 0.3,
          delayMonths: 6,
          currentOperatingCost: 100000,
          inefficiencyRate: 0.2,
          employeeCount: 100,
          averageSalary: 75000,
          marketShare: 0.15
        },
        scenarios: ['conservative', 'realistic', 'aggressive']
      };

      const response = await request(app)
        .post('/api/cost-calculator/compare')
        .set(withAuth(testCustomerId))
        .send(input)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          comparisons: expect.arrayContaining([
            expect.objectContaining({
              scenario: 'conservative',
              totalCost: expect.any(Number)
            }),
            expect.objectContaining({
              scenario: 'realistic',
              totalCost: expect.any(Number)
            }),
            expect.objectContaining({
              scenario: 'aggressive',
              totalCost: expect.any(Number)
            })
          ])
        }
      });

      // Verify ordering: Conservative < Realistic < Aggressive
      const comparisons = response.body.data.comparisons;
      const conservative = comparisons.find(c => c.scenario === 'conservative');
      const realistic = comparisons.find(c => c.scenario === 'realistic');
      const aggressive = comparisons.find(c => c.scenario === 'aggressive');

      expect(conservative.totalCost).toBeLessThan(realistic.totalCost);
      expect(realistic.totalCost).toBeLessThan(aggressive.totalCost);
    });

    test('should handle single scenario comparison', async () => {
      const response = await request(app)
        .post('/api/cost-calculator/compare')
        .set(withAuth(testCustomerId))
        .send({
          customerId: testCustomerId,
          baseInputs: {
            potentialDeals: 5,
            averageDealSize: 25000,
            conversionRate: 0.25,
            delayMonths: 3,
            currentOperatingCost: 50000,
            inefficiencyRate: 0.15,
            employeeCount: 50,
            averageSalary: 60000,
            marketShare: 0.1
          },
          scenarios: ['realistic']
        })
        .expect(200);

      expect(response.body.data.comparisons).toHaveLength(1);
      expect(response.body.data.comparisons[0].scenario).toBe('realistic');
    });

    test('should validate scenario names', async () => {
      const response = await request(app)
        .post('/api/cost-calculator/compare')
        .set(withAuth(testCustomerId))
        .send({
          customerId: testCustomerId,
          baseInputs: {
            potentialDeals: 10,
            averageDealSize: 50000,
            conversionRate: 0.3,
            delayMonths: 6,
            currentOperatingCost: 100000,
            inefficiencyRate: 0.2,
            employeeCount: 100,
            averageSalary: 75000,
            marketShare: 0.15
          },
          scenarios: ['invalid', 'realistic']
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
