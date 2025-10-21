import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import { withAuth } from './helpers/auth.js';

// Create the mock BEFORE any imports that might use it
const mockSupabaseDataService = {
  getCustomerById: jest.fn(),
  updateCustomer: jest.fn(),
  upsertCustomer: jest.fn(),
  getAllCustomers: jest.fn(),
};

// Mock the service BEFORE importing app
jest.unstable_mockModule('../src/services/supabaseDataService.js', () => ({
  default: mockSupabaseDataService
}));

// NOW import app (after mock is set up)
const { default: app } = await import('../src/server.js');

describe('Input Validation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Customer ID Validation', () => {
    // Valid UUIDs (Supabase format)
    const validCustomerIds = [
      '550e8400-e29b-41d4-a716-446655440001',
      '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
      '6ba7b812-9dad-11d1-80b4-00c04fd430c8'
    ];

    // Invalid formats (old CUST_XXX format, malformed UUIDs, etc.)
    const invalidCustomerIds = [
      'CUST_001',                              // Old Airtable format
      'cust_001',                              // lowercase old format
      'CUSTOMER_001',                          // wrong prefix
      '550e8400-e29b-41d4-a716',              // incomplete UUID
      '550e8400e29b41d4a716446655440001',    // UUID without dashes
      '',                                      // empty
      '123',                                   // just numbers
      'not-a-uuid-at-all',                    // random string
      '550e8400-e29b-41d4-a716-446655440zzz', // invalid characters
    ];

    validCustomerIds.forEach(customerId => {
      test(`should accept valid UUID customer ID: ${customerId}`, async () => {
        const mockCustomer = {
          customerId: customerId,
          customerName: 'Test Customer'
        };

        mockSupabaseDataService.getCustomerById.mockResolvedValue(mockCustomer);
        mockSupabaseDataService.updateCustomer.mockResolvedValue({});

        const response = await request(app)
          .get(`/api/customer/${customerId}`)
          .set(withAuth(customerId));

        // Should not fail validation (200 if found, 404 if not found are both valid)
        if (response.status === 400) {
          console.error(`Valid UUID ${customerId} was rejected:`, response.body);
        }
        expect(response.status).not.toBe(400);
      });
    });

    invalidCustomerIds.forEach(customerId => {
      test(`should reject invalid customer ID: "${customerId}"`, async () => {
        const validTestId = '550e8400-e29b-41d4-a716-446655440001';
        const response = await request(app)
          .get(`/api/customer/${encodeURIComponent(customerId)}`)
          .set(withAuth(validTestId))
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: 'Validation Error'
        });
      });
    });
  });

  describe('Cost Calculator Input Validation', () => {
    const validInputs = [
      {
        customerId: '550e8400-e29b-41d4-a716-446655440001',
        potentialDeals: 10,
        averageDealSize: 50000,
        conversionRate: 0.3,
        delayMonths: 6,
        currentOperatingCost: 100000,
        inefficiencyRate: 0.2,
        employeeCount: 100,
        averageSalary: 75000,
        marketShare: 0.15,
        scenario: 'realistic'
      },
      {
        customerId: '550e8400-e29b-41d4-a716-446655440002',
        potentialDeals: 1,
        averageDealSize: 1000,
        conversionRate: 0.5,
        delayMonths: 1,
        currentOperatingCost: 10000,
        inefficiencyRate: 0.1,
        employeeCount: 10,
        averageSalary: 50000,
        marketShare: 0.05,
        scenario: 'conservative'
      },
      {
        customerId: '550e8400-e29b-41d4-a716-446655440003',
        potentialDeals: 100,
        averageDealSize: 100000,
        conversionRate: 0.8,
        delayMonths: 24, // max is 24 per validation.js
        currentOperatingCost: 1000000,
        inefficiencyRate: 0.5,
        employeeCount: 500,
        averageSalary: 100000,
        marketShare: 0.5,
        scenario: 'aggressive'
      }
    ];

    const invalidInputs = [
      {
        description: 'missing customerId',
        data: {
          potentialDeals: 10,
          averageDealSize: 50000,
          conversionRate: 0.3,
          delayMonths: 6,
          currentOperatingCost: 100000,
          inefficiencyRate: 0.2,
          employeeCount: 100,
          averageSalary: 75000,
          marketShare: 0.15
        }
      },
      {
        description: 'negative potentialDeals',
        data: {
          customerId: '550e8400-e29b-41d4-a716-446655440004',
          potentialDeals: -5,
          averageDealSize: 50000,
          conversionRate: 0.3,
          delayMonths: 6,
          currentOperatingCost: 100000,
          inefficiencyRate: 0.2,
          employeeCount: 100,
          averageSalary: 75000,
          marketShare: 0.15
        }
      },
      {
        description: 'excessive delayMonths (over 24)',
        data: {
          customerId: '550e8400-e29b-41d4-a716-446655440005',
          potentialDeals: 10,
          averageDealSize: 50000,
          conversionRate: 0.3,
          delayMonths: 25, // max is 24
          currentOperatingCost: 100000,
          inefficiencyRate: 0.2,
          employeeCount: 100,
          averageSalary: 75000,
          marketShare: 0.15
        }
      },
      {
        description: 'invalid scenario',
        data: {
          customerId: '550e8400-e29b-41d4-a716-446655440006',
          potentialDeals: 10,
          averageDealSize: 50000,
          conversionRate: 0.3,
          delayMonths: 6,
          currentOperatingCost: 100000,
          inefficiencyRate: 0.2,
          employeeCount: 100,
          averageSalary: 75000,
          marketShare: 0.15,
          scenario: 'invalid' // must be conservative/realistic/aggressive
        }
      }
    ];

    validInputs.forEach((input, index) => {
      test(`should accept valid cost calculator input #${index + 1}`, async () => {
        const response = await request(app)
          .post('/api/cost-calculator/calculate')
          .set(withAuth(input.customerId))
          .send(input);

        expect(response.status).not.toBe(400);
        if (response.status === 400) {
          console.error(`Valid input was rejected:`, response.body);
        }
      });
    });

    invalidInputs.forEach(({ description, data }) => {
      test(`should reject cost calculator input: ${description}`, async () => {
        const testCustomerId = '550e8400-e29b-41d4-a716-446655440007';
        const response = await request(app)
          .post('/api/cost-calculator/calculate')
          .set(withAuth(testCustomerId))
          .send(data)
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: 'Validation Error'
        });
      });
    });
  });

  describe('Export Format Validation', () => {
    // Per validation.js line 61: valid formats are pdf, docx, json, csv
    const validFormats = ['pdf', 'docx', 'json', 'csv'];
    const invalidFormats = ['xlsx', 'txt', 'html', 'pptx', '', 'PDF', 'DOCX'];

    validFormats.forEach(format => {
      test(`should accept valid export format: ${format}`, async () => {
        const testCustomerId = '550e8400-e29b-41d4-a716-446655440010';
        const mockCustomer = {
          customerId: testCustomerId,
          icpContent: JSON.stringify({ title: 'Test ICP' })
        };

        mockSupabaseDataService.getCustomerById.mockResolvedValue(mockCustomer);

        const response = await request(app)
          .post('/api/export/icp')
          .set(withAuth(testCustomerId))
          .send({
            customerId: testCustomerId,
            format: format
          });

        // Should not fail validation
        expect(response.status).not.toBe(400);
      });
    });

    invalidFormats.forEach(format => {
      test(`should reject invalid export format: "${format}"`, async () => {
        const testCustomerId = '550e8400-e29b-41d4-a716-446655440011';
        const response = await request(app)
          .post('/api/export/icp')
          .set(withAuth(testCustomerId))
          .send({
            customerId: testCustomerId,
            format: format
          })
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: 'Validation Error'
        });
      });
    });
  });

  describe('Request Size Limits', () => {
    test('should reject oversized JSON payload', async () => {
      const testCustomerId = '550e8400-e29b-41d4-a716-446655440012';
      // Create a large payload (over 10MB limit)
      const largeData = {
        customerId: testCustomerId,
        caseType: 'pilot',
        industry: 'Technology',
        companySize: 'medium',
        budget: 50000,
        timeline: 3,
        objectives: ['test'],
        successMetrics: ['test'],
        largeField: 'x'.repeat(11 * 1024 * 1024) // 11MB
      };

      const response = await request(app)
        .post('/api/business-case/generate')
        .set(withAuth(testCustomerId))
        .send(largeData)
        .expect(413); // Payload Too Large

      expect(response.status).toBe(413);
    });

    test('should accept reasonably sized JSON payload', async () => {
      const testCustomerId = '550e8400-e29b-41d4-a716-446655440013';
      const normalData = {
        customerId: testCustomerId,
        caseType: 'pilot',
        industry: 'Technology',
        companySize: 'medium',
        budget: 50000,
        timeline: 3,
        objectives: ['Increase revenue'],
        successMetrics: ['Revenue growth'],
        description: 'A'.repeat(1000) // 1KB - reasonable size
      };

      const response = await request(app)
        .post('/api/business-case/generate')
        .set(withAuth(testCustomerId))
        .send(normalData);

      expect(response.status).not.toBe(413);
    });
  });

  describe('Query Parameter Validation', () => {
    test('should validate limit parameter in customer list', async () => {
      const testCustomerId = '550e8400-e29b-41d4-a716-446655440014';
      const validLimits = [1, 10, 50, 100];
      const invalidLimits = [0, -1, 101, 1000, 'ten', ''];

      mockSupabaseDataService.getAllCustomers.mockResolvedValue([]);

      for (const limit of validLimits) {
        const response = await request(app)
          .get(`/api/customers?limit=${limit}`)
          .set(withAuth(testCustomerId));

        expect(response.status).not.toBe(400);
      }

      for (const limit of invalidLimits) {
        const response = await request(app)
          .get(`/api/customers?limit=${limit}`)
          .set(withAuth(testCustomerId))
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: 'Validation Error'
        });
      }
    });
  });

  describe('SQL Injection Prevention', () => {
    const sqlInjectionAttempts = [
      "'; DROP TABLE customers; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM users --",
      "'; INSERT INTO customers VALUES ('hacked'); --",
      "' OR 1=1 --",
      "admin'--",
      "' OR 'a'='a",
      "'; SHUTDOWN; --"
    ];

    sqlInjectionAttempts.forEach(injection => {
      test(`should prevent SQL injection: "${injection}"`, async () => {
        const validTestId = '550e8400-e29b-41d4-a716-446655440015';
        const response = await request(app)
          .get(`/api/customer/${encodeURIComponent(injection)}`)
          .set(withAuth(validTestId))
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: 'Validation Error'
        });
      });
    });
  });

  describe('XSS Prevention', () => {
    const xssAttempts = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src="x" onerror="alert(\'xss\')">',
      '<svg onload="alert(\'xss\')">',
      '"><script>alert("xss")</script>',
      'javascript:void(0)',
      '<iframe src="javascript:alert(\'xss\')"></iframe>'
    ];

    xssAttempts.forEach(xss => {
      test(`should sanitize XSS attempt: "${xss}"`, async () => {
        const testCustomerId = '550e8400-e29b-41d4-a716-446655440016';
        const response = await request(app)
          .post('/api/cost-calculator/calculate')
          .set(withAuth(testCustomerId))
          .send({
            customerId: testCustomerId,
            potentialDeals: 10,
            averageDealSize: 50000,
            conversionRate: 0.3,
            delayMonths: 6,
            currentOperatingCost: 100000,
            inefficiencyRate: 0.2,
            employeeCount: 100,
            averageSalary: 75000,
            marketShare: 0.15,
            notes: xss
          });

        // Should either reject the input or sanitize it
        if (response.status === 200) {
          // If accepted, ensure the XSS is sanitized in any response
          const responseText = JSON.stringify(response.body);
          expect(responseText).not.toContain('<script>');
          expect(responseText).not.toContain('javascript:');
          expect(responseText).not.toContain('onerror=');
          expect(responseText).not.toContain('onload=');
        } else {
          expect(response.status).toBe(400);
        }
      });
    });
  });

  describe('Path Traversal Prevention', () => {
    const pathTraversalAttempts = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '....//....//....//etc/passwd',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '..%252f..%252f..%252fetc%252fpasswd',
      '..%c0%af..%c0%af..%c0%afetc%c0%afpasswd'
    ];

    pathTraversalAttempts.forEach(attempt => {
      test(`should prevent path traversal: "${attempt}"`, async () => {
        const validTestId = '550e8400-e29b-41d4-a716-446655440017';
        const response = await request(app)
          .get(`/api/customer/${encodeURIComponent(attempt)}`)
          .set(withAuth(validTestId))
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: 'Validation Error'
        });
      });
    });
  });
});
