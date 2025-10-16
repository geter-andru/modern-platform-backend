import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/server.js';

// Mock the airtable service
const mockAirtableService = {
  getCustomerById: jest.fn(),
  updateCustomer: jest.fn(),
  createUserProgress: jest.fn(),
};

jest.unstable_mockModule('../src/services/airtableService.js', () => ({
  default: mockAirtableService
}));

describe('Cost Calculator Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/cost-calculator/calculate', () => {
    test('should calculate cost of inaction with default values', async () => {
      const input = {
        customerId: 'CUST_001',
        potentialDeals: 10,
        averageDealSize: 50000,
        delayMonths: 6,
        employeeCount: 100,
        averageSalary: 75000
      };

      const response = await request(app)
        .post('/api/cost-calculator/calculate')
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
          scenario: 'Realistic',
          inputs: expect.objectContaining(input)
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
        customerId: 'CUST_001',
        potentialDeals: 5,
        averageDealSize: 25000,
        delayMonths: 3,
        scenario: 'Conservative'
      };

      const response = await request(app)
        .post('/api/cost-calculator/calculate')
        .send(input)
        .expect(200);

      expect(response.body.data.scenario).toBe('Conservative');
      expect(response.body.data.summary.totalCost).toBeGreaterThan(0);
    });

    test('should handle aggressive scenario', async () => {
      const input = {
        customerId: 'CUST_001',
        potentialDeals: 20,
        averageDealSize: 100000,
        delayMonths: 12,
        scenario: 'Aggressive'
      };

      const response = await request(app)
        .post('/api/cost-calculator/calculate')
        .send(input)
        .expect(200);

      expect(response.body.data.scenario).toBe('Aggressive');
      
      // Aggressive scenario should have higher costs
      const aggressiveTotal = response.body.data.summary.totalCost;
      
      // Calculate same with realistic for comparison
      const realisticResponse = await request(app)
        .post('/api/cost-calculator/calculate')
        .send({ ...input, scenario: 'Realistic' });
      
      const realisticTotal = realisticResponse.body.data.summary.totalCost;
      expect(aggressiveTotal).toBeGreaterThan(realisticTotal);
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/cost-calculator/calculate')
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
        .send({
          customerId: 'CUST_001',
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
        .send({
          customerId: 'CUST_001',
          potentialDeals: 7.5,
          averageDealSize: 45678.90,
          delayMonths: 4.5,
          conversionRate: 0.125,
          inefficiencyRate: 0.085
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary.totalCost).toBeGreaterThan(0);
    });
  });

  describe('POST /api/cost-calculator/save', () => {
    test('should save calculation results', async () => {
      const mockCustomer = {
        customerId: 'CUST_001',
        customerName: 'Test Customer'
      };

      const calculationData = {
        customerId: 'CUST_001',
        calculations: {
          totalCost: 500000,
          monthlyCost: 41666.67,
          scenario: 'Realistic',
          categories: {
            lostRevenue: { value: 250000 },
            operationalInefficiencies: { value: 150000 },
            competitiveDisadvantage: { value: 75000 },
            productivityLosses: { value: 25000 }
          }
        }
      };

      mockAirtableService.getCustomerById.mockResolvedValue(mockCustomer);
      mockAirtableService.updateCustomer.mockResolvedValue({});
      mockAirtableService.createUserProgress.mockResolvedValue({ id: 'rec123' });

      const response = await request(app)
        .post('/api/cost-calculator/save')
        .send(calculationData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          customerId: 'CUST_001',
          saved: true
        }
      });

      expect(mockAirtableService.updateCustomer).toHaveBeenCalledWith(
        'CUST_001',
        expect.objectContaining({
          'Cost Calculator Content': expect.stringContaining('500000')
        })
      );

      expect(mockAirtableService.createUserProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          'Customer ID': 'CUST_001',
          'Tool Name': 'Cost Calculator'
        })
      );
    });

    test('should return 404 for non-existent customer', async () => {
      mockAirtableService.getCustomerById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/cost-calculator/save')
        .send({
          customerId: 'CUST_999',
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
        .send({
          customerId: 'CUST_001',
          calculations: 'invalid'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/cost-calculator/history/:customerId', () => {
    test('should retrieve calculation history', async () => {
      const mockCustomer = {
        customerId: 'CUST_001',
        costCalculatorContent: JSON.stringify({
          history: [
            {
              date: '2024-01-15T10:00:00Z',
              totalCost: 450000,
              scenario: 'Conservative'
            },
            {
              date: '2024-01-20T14:30:00Z',
              totalCost: 500000,
              scenario: 'Realistic'
            }
          ]
        })
      };

      mockAirtableService.getCustomerById.mockResolvedValue(mockCustomer);

      const response = await request(app)
        .get('/api/cost-calculator/history/CUST_001')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          customerId: 'CUST_001',
          history: expect.arrayContaining([
            expect.objectContaining({
              totalCost: 450000,
              scenario: 'Conservative'
            })
          ])
        }
      });

      expect(response.body.data.history).toHaveLength(2);
    });

    test('should handle empty history', async () => {
      const mockCustomer = {
        customerId: 'CUST_001',
        costCalculatorContent: null
      };

      mockAirtableService.getCustomerById.mockResolvedValue(mockCustomer);

      const response = await request(app)
        .get('/api/cost-calculator/history/CUST_001')
        .expect(200);

      expect(response.body.data.history).toEqual([]);
    });

    test('should handle malformed history JSON', async () => {
      const mockCustomer = {
        customerId: 'CUST_001',
        costCalculatorContent: 'invalid json{'
      };

      mockAirtableService.getCustomerById.mockResolvedValue(mockCustomer);

      const response = await request(app)
        .get('/api/cost-calculator/history/CUST_001')
        .expect(200);

      expect(response.body.data.history).toEqual([]);
    });
  });

  describe('POST /api/cost-calculator/compare', () => {
    test('should compare multiple scenarios', async () => {
      const input = {
        customerId: 'CUST_001',
        baseInputs: {
          potentialDeals: 10,
          averageDealSize: 50000,
          delayMonths: 6
        },
        scenarios: ['Conservative', 'Realistic', 'Aggressive']
      };

      const response = await request(app)
        .post('/api/cost-calculator/compare')
        .send(input)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          comparisons: expect.arrayContaining([
            expect.objectContaining({
              scenario: 'Conservative',
              totalCost: expect.any(Number)
            }),
            expect.objectContaining({
              scenario: 'Realistic',
              totalCost: expect.any(Number)
            }),
            expect.objectContaining({
              scenario: 'Aggressive',
              totalCost: expect.any(Number)
            })
          ])
        }
      });

      // Verify ordering: Conservative < Realistic < Aggressive
      const comparisons = response.body.data.comparisons;
      const conservative = comparisons.find(c => c.scenario === 'Conservative');
      const realistic = comparisons.find(c => c.scenario === 'Realistic');
      const aggressive = comparisons.find(c => c.scenario === 'Aggressive');

      expect(conservative.totalCost).toBeLessThan(realistic.totalCost);
      expect(realistic.totalCost).toBeLessThan(aggressive.totalCost);
    });

    test('should handle single scenario comparison', async () => {
      const response = await request(app)
        .post('/api/cost-calculator/compare')
        .send({
          customerId: 'CUST_001',
          baseInputs: {
            potentialDeals: 5,
            averageDealSize: 25000,
            delayMonths: 3
          },
          scenarios: ['Realistic']
        })
        .expect(200);

      expect(response.body.data.comparisons).toHaveLength(1);
      expect(response.body.data.comparisons[0].scenario).toBe('Realistic');
    });

    test('should validate scenario names', async () => {
      const response = await request(app)
        .post('/api/cost-calculator/compare')
        .send({
          customerId: 'CUST_001',
          baseInputs: {
            potentialDeals: 10,
            averageDealSize: 50000,
            delayMonths: 6
          },
          scenarios: ['Invalid', 'Realistic']
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});