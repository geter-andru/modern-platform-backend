import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import { withAuth } from './helpers/auth.js';

// Create the mock BEFORE any imports that might use it
const mockSupabaseDataService = {
  getCustomerById: jest.fn(),
  updateCustomer: jest.fn(),
  upsertCustomer: jest.fn(),
};

// Mock the service BEFORE importing app
jest.unstable_mockModule('../src/services/supabaseDataService.js', () => ({
  default: mockSupabaseDataService
}));

// NOW import app (after mock is set up)
const { default: app } = await import('../src/server.js');

describe('AI Integration Tests', () => {
  const testCustomerId = '550e8400-e29b-41d4-a716-446655440001';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AI-Powered ICP Generation', () => {
    test('should accept ICP generation request', async () => {
      const mockCustomer = {
        customerId: testCustomerId,
        customerName: 'Test Customer',
        icpContent: null
      };

      mockSupabaseDataService.getCustomerById.mockResolvedValue(mockCustomer);
      mockSupabaseDataService.updateCustomer.mockResolvedValue({});

      const response = await request(app)
        .post(`/api/customer/${testCustomerId}/generate-icp`)
        .set(withAuth(testCustomerId))
        .send({
          industry: 'Technology',
          companySize: 'medium',
          currentChallenges: ['scalability', 'efficiency'],
          goals: ['increase revenue', 'improve operations'],
          triggerAutomation: false
        });

      // Should either succeed with AI or fail gracefully with fallback
      expect([200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('icpAnalysis');
      } else {
        expect(response.body.success).toBe(false);
        expect(response.body).toHaveProperty('fallback');
      }
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/customer/${testCustomerId}/generate-icp`)
        .send({
          industry: 'Technology'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('should enforce rate limiting', async () => {
      const mockCustomer = {
        customerId: testCustomerId,
        customerName: 'Test Customer',
        icpContent: null
      };

      mockSupabaseDataService.getCustomerById.mockResolvedValue(mockCustomer);
      mockSupabaseDataService.updateCustomer.mockResolvedValue({});

      // Make multiple requests to test rate limiting (5 per hour)
      const promises = [];
      for (let i = 0; i < 7; i++) {
        promises.push(
          request(app)
            .post(`/api/customer/${testCustomerId}/generate-icp`)
            .set(withAuth(testCustomerId))
            .send({ industry: 'Technology' })
        );
      }

      const responses = await Promise.all(promises);

      // Some should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Webhook Integration', () => {
    test('should get automation status', async () => {
      const response = await request(app)
        .get('/api/webhooks/status')
        .set(withAuth(testCustomerId));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('automationEnabled');
      expect(response.body.data).toHaveProperty('webhookStatus');
    });

    test('should handle webhook health check', async () => {
      const response = await request(app)
        .get('/api/webhooks/health')
        .set(withAuth(testCustomerId));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.service).toBe('webhook_service');
    });
  });

  describe('API Documentation', () => {
    test('should include new AI endpoints in documentation', async () => {
      const response = await request(app)
        .get('/api/docs')
        .set(withAuth(testCustomerId));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.description).toContain('AI Automation');
      expect(response.body.data.endpoints.customer).toHaveProperty('POST /api/customer/:customerId/generate-icp');
      expect(response.body.data.endpoints).toHaveProperty('webhooks');
    });
  });
});
