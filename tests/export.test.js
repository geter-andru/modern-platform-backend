import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/server.js';

// Mock the airtable service
const mockAirtableService = {
  getCustomerById: jest.fn(),
  updateCustomer: jest.fn(),
};

jest.unstable_mockModule('../src/services/airtableService.js', () => ({
  default: mockAirtableService
}));

describe('Export Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/export/icp', () => {
    test('should export ICP data as PDF', async () => {
      const mockCustomer = {
        customerId: 'CUST_001',
        customerName: 'Test Customer',
        icpContent: JSON.stringify({
          title: 'Enterprise ICP Framework',
          segments: [
            {
              name: 'Enterprise SaaS',
              score: 95,
              criteria: ['500+ employees', '$50M+ revenue']
            }
          ],
          keyIndicators: ['Scalability challenges', 'Digital transformation']
        })
      };

      mockAirtableService.getCustomerById.mockResolvedValue(mockCustomer);

      const response = await request(app)
        .post('/api/export/icp')
        .send({
          customerId: 'CUST_001',
          format: 'pdf',
          options: {
            includeScoring: true,
            includeMetrics: true,
            template: 'executive'
          }
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          downloadUrl: expect.stringMatching(/^https?:\/\//),
          format: 'pdf',
          filename: expect.stringContaining('ICP'),
          fileSize: expect.any(Number),
          expiresAt: expect.any(String),
          metadata: {
            customerName: 'Test Customer',
            generatedAt: expect.any(String),
            segmentCount: 1
          }
        }
      });

      // Verify tracking is updated
      expect(mockAirtableService.updateCustomer).toHaveBeenCalledWith(
        'CUST_001',
        expect.objectContaining({
          'Usage Count': expect.any(Number),
          'Last Accessed': expect.any(String)
        })
      );
    });

    test('should export ICP data as Excel', async () => {
      const mockCustomer = {
        customerId: 'CUST_001',
        icpContent: JSON.stringify({
          title: 'ICP Framework',
          segments: []
        })
      };

      mockAirtableService.getCustomerById.mockResolvedValue(mockCustomer);

      const response = await request(app)
        .post('/api/export/icp')
        .send({
          customerId: 'CUST_001',
          format: 'xlsx'
        })
        .expect(200);

      expect(response.body.data.format).toBe('xlsx');
      expect(response.body.data.filename).toMatch(/\.xlsx$/);
    });

    test('should validate export format', async () => {
      const response = await request(app)
        .post('/api/export/icp')
        .send({
          customerId: 'CUST_001',
          format: 'invalid'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Validation Error'
      });
    });

    test('should handle missing ICP content', async () => {
      const mockCustomer = {
        customerId: 'CUST_001',
        icpContent: null
      };

      mockAirtableService.getCustomerById.mockResolvedValue(mockCustomer);

      const response = await request(app)
        .post('/api/export/icp')
        .send({
          customerId: 'CUST_001',
          format: 'pdf'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'No ICP content available for export'
      });
    });
  });

  describe('POST /api/export/cost-calculator', () => {
    test('should export cost calculator results as PDF', async () => {
      const mockCustomer = {
        customerId: 'CUST_001',
        customerName: 'Test Customer',
        costCalculatorContent: JSON.stringify({
          latestCalculation: {
            totalCost: 500000,
            monthlyCost: 41666.67,
            scenario: 'Realistic',
            categories: {
              lostRevenue: { value: 250000, percentage: 50 },
              operationalInefficiencies: { value: 150000, percentage: 30 },
              competitiveDisadvantage: { value: 75000, percentage: 15 },
              productivityLosses: { value: 25000, percentage: 5 }
            },
            calculatedAt: '2024-01-15T10:00:00Z'
          },
          history: []
        })
      };

      mockAirtableService.getCustomerById.mockResolvedValue(mockCustomer);

      const response = await request(app)
        .post('/api/export/cost-calculator')
        .send({
          customerId: 'CUST_001',
          format: 'pdf',
          options: {
            includeCharts: true,
            includeHistory: false,
            template: 'executive'
          }
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          downloadUrl: expect.stringMatching(/^https?:\/\//),
          format: 'pdf',
          filename: expect.stringContaining('Cost_Calculator'),
          fileSize: expect.any(Number),
          metadata: {
            totalCost: 500000,
            scenario: 'Realistic',
            categoryCount: 4
          }
        }
      });
    });

    test('should export cost calculator with historical data', async () => {
      const mockCustomer = {
        customerId: 'CUST_001',
        costCalculatorContent: JSON.stringify({
          latestCalculation: { totalCost: 500000 },
          history: [
            { totalCost: 450000, calculatedAt: '2024-01-10T10:00:00Z' },
            { totalCost: 475000, calculatedAt: '2024-01-12T10:00:00Z' }
          ]
        })
      };

      mockAirtableService.getCustomerById.mockResolvedValue(mockCustomer);

      const response = await request(app)
        .post('/api/export/cost-calculator')
        .send({
          customerId: 'CUST_001',
          format: 'xlsx',
          options: {
            includeHistory: true,
            includeComparisons: true
          }
        })
        .expect(200);

      expect(response.body.data.metadata.historicalDataPoints).toBe(2);
    });

    test('should handle missing cost calculator data', async () => {
      const mockCustomer = {
        customerId: 'CUST_001',
        costCalculatorContent: null
      };

      mockAirtableService.getCustomerById.mockResolvedValue(mockCustomer);

      const response = await request(app)
        .post('/api/export/cost-calculator')
        .send({
          customerId: 'CUST_001',
          format: 'pdf'
        })
        .expect(400);

      expect(response.body.error).toContain('No cost calculator data available');
    });
  });

  describe('POST /api/export/comprehensive', () => {
    test('should export comprehensive report with all data', async () => {
      const mockCustomer = {
        customerId: 'CUST_001',
        customerName: 'Test Customer',
        company: 'Test Company',
        icpContent: JSON.stringify({
          title: 'ICP Framework',
          segments: [{ name: 'Enterprise', score: 95 }]
        }),
        costCalculatorContent: JSON.stringify({
          latestCalculation: { totalCost: 500000 }
        }),
        businessCaseContent: JSON.stringify({
          bc_001: {
            type: 'pilot',
            investment: { totalCost: 75000 }
          }
        })
      };

      mockAirtableService.getCustomerById.mockResolvedValue(mockCustomer);

      const response = await request(app)
        .post('/api/export/comprehensive')
        .send({
          customerId: 'CUST_001',
          format: 'pdf',
          sections: ['icp', 'cost-calculator', 'business-case'],
          options: {
            includeExecutiveSummary: true,
            includeCharts: true,
            template: 'full'
          }
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          downloadUrl: expect.stringMatching(/^https?:\/\//),
          format: 'pdf',
          filename: expect.stringContaining('Comprehensive_Report'),
          fileSize: expect.any(Number),
          metadata: {
            customerName: 'Test Customer',
            sectionsIncluded: ['icp', 'cost-calculator', 'business-case'],
            pageCount: expect.any(Number)
          }
        }
      });
    });

    test('should handle partial data availability', async () => {
      const mockCustomer = {
        customerId: 'CUST_001',
        customerName: 'Test Customer',
        icpContent: JSON.stringify({ title: 'ICP' }),
        costCalculatorContent: null,
        businessCaseContent: null
      };

      mockAirtableService.getCustomerById.mockResolvedValue(mockCustomer);

      const response = await request(app)
        .post('/api/export/comprehensive')
        .send({
          customerId: 'CUST_001',
          format: 'pdf',
          sections: ['icp', 'cost-calculator', 'business-case']
        })
        .expect(200);

      expect(response.body.data.metadata.sectionsIncluded).toEqual(['icp']);
      expect(response.body.data.metadata.unavailableSections).toEqual(['cost-calculator', 'business-case']);
    });

    test('should validate section names', async () => {
      const response = await request(app)
        .post('/api/export/comprehensive')
        .send({
          customerId: 'CUST_001',
          format: 'pdf',
          sections: ['invalid-section', 'icp']
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/export/status/:exportId', () => {
    test('should return export status for completed export', async () => {
      const response = await request(app)
        .get('/api/export/status/exp_12345')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          exportId: 'exp_12345',
          status: expect.stringMatching(/^(pending|processing|completed|failed)$/),
          progress: expect.any(Number),
          downloadUrl: expect.any(String),
          expiresAt: expect.any(String)
        }
      });
    });

    test('should return processing status for in-progress export', async () => {
      // This test simulates a processing export
      const response = await request(app)
        .get('/api/export/status/exp_processing')
        .expect(200);

      expect(['pending', 'processing', 'completed']).toContain(response.body.data.status);
      expect(response.body.data.progress).toBeGreaterThanOrEqual(0);
      expect(response.body.data.progress).toBeLessThanOrEqual(100);
    });

    test('should return 404 for non-existent export', async () => {
      const response = await request(app)
        .get('/api/export/status/exp_nonexistent')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Export not found'
      });
    });
  });

  describe('DELETE /api/export/:exportId', () => {
    test('should delete export file and metadata', async () => {
      const response = await request(app)
        .delete('/api/export/exp_12345')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          exportId: 'exp_12345',
          deleted: true,
          message: 'Export file and metadata deleted successfully'
        }
      });
    });

    test('should handle deletion of non-existent export', async () => {
      const response = await request(app)
        .delete('/api/export/exp_nonexistent')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Export not found'
      });
    });
  });

  describe('GET /api/export/history/:customerId', () => {
    test('should return export history for customer', async () => {
      const response = await request(app)
        .get('/api/export/history/CUST_001')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          customerId: 'CUST_001',
          exports: expect.arrayContaining([
            expect.objectContaining({
              exportId: expect.any(String),
              type: expect.stringMatching(/^(icp|cost-calculator|business-case|comprehensive)$/),
              format: expect.stringMatching(/^(pdf|xlsx|docx)$/),
              createdAt: expect.any(String),
              status: expect.any(String)
            })
          ])
        }
      });
    });

    test('should handle empty export history', async () => {
      const response = await request(app)
        .get('/api/export/history/CUST_NEW')
        .expect(200);

      expect(response.body.data.exports).toEqual([]);
    });

    test('should support pagination', async () => {
      const response = await request(app)
        .get('/api/export/history/CUST_001?limit=5&offset=0')
        .expect(200);

      expect(response.body.data).toMatchObject({
        exports: expect.any(Array),
        pagination: {
          limit: 5,
          offset: 0,
          total: expect.any(Number)
        }
      });
    });
  });

  describe('Rate Limiting and Security', () => {
    test('should be rate limited for export endpoints', async () => {
      const mockCustomer = {
        customerId: 'CUST_001',
        icpContent: JSON.stringify({ title: 'Test' })
      };

      mockAirtableService.getCustomerById.mockResolvedValue(mockCustomer);

      // Make first request
      const response1 = await request(app)
        .post('/api/export/icp')
        .send({
          customerId: 'CUST_001',
          format: 'pdf'
        })
        .expect(200);

      expect(response1.headers).toHaveProperty('x-ratelimit-limit');
      expect(response1.headers).toHaveProperty('x-ratelimit-remaining');
    });

    test('should validate customer ID format in export requests', async () => {
      const response = await request(app)
        .post('/api/export/icp')
        .send({
          customerId: 'invalid-format',
          format: 'pdf'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should sanitize file names in export responses', async () => {
      const mockCustomer = {
        customerId: 'CUST_001',
        customerName: 'Test <script>alert("xss")</script> Customer',
        icpContent: JSON.stringify({ title: 'Test' })
      };

      mockAirtableService.getCustomerById.mockResolvedValue(mockCustomer);

      const response = await request(app)
        .post('/api/export/icp')
        .send({
          customerId: 'CUST_001',
          format: 'pdf'
        })
        .expect(200);

      // Filename should be sanitized
      expect(response.body.data.filename).not.toContain('<script>');
      expect(response.body.data.filename).not.toContain('</script>');
    });
  });
});