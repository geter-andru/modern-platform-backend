import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/server.js';

describe('Input Validation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Customer ID Validation', () => {
    const validCustomerIds = [
      'CUST_001',
      'CUST_1234',
      'CUST_0001',
      'CUST_9999'
    ];

    const invalidCustomerIds = [
      'cust_001',           // lowercase
      'CUSTOMER_001',       // wrong prefix
      'CUST_',              // missing number
      'CUST_abc',           // non-numeric
      'CUST_001_extra',     // extra characters
      '',                   // empty
      '123',                // just numbers
      'CUST 001',           // space
      'CUST-001',           // hyphen instead of underscore
      'CUST_001$',          // special character
      'CUST_00001',         // too many digits
      'CUST_1',             // too few digits (assuming 3-4 digit requirement)
    ];

    validCustomerIds.forEach(customerId => {
      test(`should accept valid customer ID: ${customerId}`, async () => {
        const response = await request(app)
          .get(`/api/customer/${customerId}`)
          .expect([200, 404]); // 200 if exists, 404 if not found - both are valid responses

        if (response.status === 400) {
          console.error(`Valid customer ID ${customerId} was rejected:`, response.body);
        }
        expect(response.status).not.toBe(400);
      });
    });

    invalidCustomerIds.forEach(customerId => {
      test(`should reject invalid customer ID: "${customerId}"`, async () => {
        const response = await request(app)
          .get(`/api/customer/${encodeURIComponent(customerId)}`)
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
        customerId: 'CUST_001',
        potentialDeals: 10,
        averageDealSize: 50000,
        delayMonths: 6,
        employeeCount: 100,
        averageSalary: 75000
      },
      {
        customerId: 'CUST_002',
        potentialDeals: 1,
        averageDealSize: 1000,
        delayMonths: 1
      },
      {
        customerId: 'CUST_003',
        potentialDeals: 1000,
        averageDealSize: 1000000,
        delayMonths: 36
      },
      {
        customerId: 'CUST_004',
        potentialDeals: 5.5,
        averageDealSize: 25750.50,
        delayMonths: 3.5
      }
    ];

    const invalidInputs = [
      {
        description: 'missing customerId',
        data: {
          potentialDeals: 10,
          averageDealSize: 50000,
          delayMonths: 6
        }
      },
      {
        description: 'negative potentialDeals',
        data: {
          customerId: 'CUST_001',
          potentialDeals: -5,
          averageDealSize: 50000,
          delayMonths: 6
        }
      },
      {
        description: 'zero averageDealSize',
        data: {
          customerId: 'CUST_001',
          potentialDeals: 10,
          averageDealSize: 0,
          delayMonths: 6
        }
      },
      {
        description: 'negative delayMonths',
        data: {
          customerId: 'CUST_001',
          potentialDeals: 10,
          averageDealSize: 50000,
          delayMonths: -1
        }
      },
      {
        description: 'excessive delayMonths',
        data: {
          customerId: 'CUST_001',
          potentialDeals: 10,
          averageDealSize: 50000,
          delayMonths: 61 // over 5 years
        }
      },
      {
        description: 'non-numeric potentialDeals',
        data: {
          customerId: 'CUST_001',
          potentialDeals: 'ten',
          averageDealSize: 50000,
          delayMonths: 6
        }
      },
      {
        description: 'extremely large values',
        data: {
          customerId: 'CUST_001',
          potentialDeals: 1000000,
          averageDealSize: 999999999999,
          delayMonths: 6
        }
      }
    ];

    validInputs.forEach((input, index) => {
      test(`should accept valid cost calculator input #${index + 1}`, async () => {
        const response = await request(app)
          .post('/api/cost-calculator/calculate')
          .send(input);

        expect(response.status).not.toBe(400);
        if (response.status === 400) {
          console.error(`Valid input was rejected:`, response.body);
        }
      });
    });

    invalidInputs.forEach(({ description, data }) => {
      test(`should reject cost calculator input: ${description}`, async () => {
        const response = await request(app)
          .post('/api/cost-calculator/calculate')
          .send(data)
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: 'Validation Error'
        });
      });
    });
  });

  describe('Business Case Input Validation', () => {
    const validInputs = [
      {
        customerId: 'CUST_001',
        type: 'pilot',
        requirements: {
          timeline: '3-6 months',
          budget: 50000,
          teamSize: 5
        }
      },
      {
        customerId: 'CUST_002',
        type: 'full',
        requirements: {
          timeline: '6-18 months',
          budget: 250000,
          teamSize: 15
        }
      }
    ];

    const invalidInputs = [
      {
        description: 'missing type',
        data: {
          customerId: 'CUST_001',
          requirements: {
            timeline: '3-6 months',
            budget: 50000
          }
        }
      },
      {
        description: 'invalid type',
        data: {
          customerId: 'CUST_001',
          type: 'invalid',
          requirements: {
            timeline: '3-6 months',
            budget: 50000
          }
        }
      },
      {
        description: 'missing requirements',
        data: {
          customerId: 'CUST_001',
          type: 'pilot'
        }
      },
      {
        description: 'negative budget',
        data: {
          customerId: 'CUST_001',
          type: 'pilot',
          requirements: {
            timeline: '3-6 months',
            budget: -50000
          }
        }
      },
      {
        description: 'zero budget',
        data: {
          customerId: 'CUST_001',
          type: 'pilot',
          requirements: {
            timeline: '3-6 months',
            budget: 0
          }
        }
      },
      {
        description: 'negative team size',
        data: {
          customerId: 'CUST_001',
          type: 'pilot',
          requirements: {
            timeline: '3-6 months',
            budget: 50000,
            teamSize: -1
          }
        }
      }
    ];

    validInputs.forEach((input, index) => {
      test(`should accept valid business case input #${index + 1}`, async () => {
        const response = await request(app)
          .post('/api/business-case/generate')
          .send(input);

        expect(response.status).not.toBe(400);
      });
    });

    invalidInputs.forEach(({ description, data }) => {
      test(`should reject business case input: ${description}`, async () => {
        const response = await request(app)
          .post('/api/business-case/generate')
          .send(data)
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: 'Validation Error'
        });
      });
    });
  });

  describe('Export Input Validation', () => {
    const validFormats = ['pdf', 'xlsx', 'docx'];
    const invalidFormats = ['txt', 'csv', 'json', 'html', 'pptx', '', 'PDF', 'XLSX'];

    validFormats.forEach(format => {
      test(`should accept valid export format: ${format}`, async () => {
        const response = await request(app)
          .post('/api/export/icp')
          .send({
            customerId: 'CUST_001',
            format: format
          });

        // Should not fail validation (might fail for other reasons like missing data)
        expect(response.status).not.toBe(400);
      });
    });

    invalidFormats.forEach(format => {
      test(`should reject invalid export format: "${format}"`, async () => {
        const response = await request(app)
          .post('/api/export/icp')
          .send({
            customerId: 'CUST_001',
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
      // Create a large payload (over 10MB limit)
      const largeData = {
        customerId: 'CUST_001',
        type: 'pilot',
        requirements: {
          budget: 50000,
          timeline: '3 months',
          largeField: 'x'.repeat(11 * 1024 * 1024) // 11MB
        }
      };

      const response = await request(app)
        .post('/api/business-case/generate')
        .send(largeData)
        .expect(413); // Payload Too Large

      expect(response.status).toBe(413);
    });

    test('should accept reasonably sized JSON payload', async () => {
      const normalData = {
        customerId: 'CUST_001',
        type: 'pilot',
        requirements: {
          budget: 50000,
          timeline: '3 months',
          description: 'A'.repeat(1000) // 1KB - reasonable size
        }
      };

      const response = await request(app)
        .post('/api/business-case/generate')
        .send(normalData);

      expect(response.status).not.toBe(413);
    });
  });

  describe('Content-Type Validation', () => {
    test('should reject non-JSON content type for JSON endpoints', async () => {
      const response = await request(app)
        .post('/api/cost-calculator/calculate')
        .set('Content-Type', 'text/plain')
        .send('customerId=CUST_001&potentialDeals=10')
        .expect(400);

      expect(response.status).toBe(400);
    });

    test('should accept proper JSON content type', async () => {
      const response = await request(app)
        .post('/api/cost-calculator/calculate')
        .set('Content-Type', 'application/json')
        .send({
          customerId: 'CUST_001',
          potentialDeals: 10,
          averageDealSize: 50000,
          delayMonths: 6
        });

      expect(response.status).not.toBe(400);
    });
  });

  describe('Query Parameter Validation', () => {
    test('should validate limit parameter in customer list', async () => {
      const validLimits = [1, 10, 50, 100];
      const invalidLimits = [0, -1, 101, 1000, 'ten', ''];

      for (const limit of validLimits) {
        const response = await request(app)
          .get(`/api/customers?limit=${limit}`);
        
        expect(response.status).not.toBe(400);
      }

      for (const limit of invalidLimits) {
        const response = await request(app)
          .get(`/api/customers?limit=${limit}`)
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: 'Validation Error'
        });
      }
    });

    test('should validate offset parameter in pagination', async () => {
      const validOffsets = [0, 10, 100];
      const invalidOffsets = [-1, 'ten', ''];

      for (const offset of validOffsets) {
        const response = await request(app)
          .get(`/api/export/history/CUST_001?offset=${offset}`);
        
        expect(response.status).not.toBe(400);
      }

      for (const offset of invalidOffsets) {
        const response = await request(app)
          .get(`/api/export/history/CUST_001?offset=${offset}`)
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
        const response = await request(app)
          .get(`/api/customer/${encodeURIComponent(injection)}`)
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
        const response = await request(app)
          .post('/api/cost-calculator/calculate')
          .send({
            customerId: 'CUST_001',
            potentialDeals: 10,
            averageDealSize: 50000,
            delayMonths: 6,
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
        const response = await request(app)
          .get(`/api/customer/${encodeURIComponent(attempt)}`)
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: 'Validation Error'
        });
      });
    });
  });
});