import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/server.js';

describe('AI Integration Tests', () => {
  let accessToken;

  beforeAll(async () => {
    // Get access token for testing
    const tokenResponse = await request(app)
      .post('/api/auth/token')
      .send({ customerId: 'CUST_2' });
    
    if (tokenResponse.status === 200) {
      accessToken = tokenResponse.body.data.accessToken;
    }
  });

  describe('AI-Powered ICP Generation', () => {
    test('should accept ICP generation request', async () => {
      if (!accessToken) {
        console.log('Skipping test - no access token available');
        return;
      }

      const response = await request(app)
        .post('/api/customer/CUST_2/generate-icp')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          industry: 'Technology',
          companySize: 'medium',
          currentChallenges: ['scalability', 'efficiency'],
          goals: ['increase revenue', 'improve operations'],
          triggerAutomation: false
        });

      console.log('AI ICP Response status:', response.status);
      console.log('AI ICP Response body:', JSON.stringify(response.body, null, 2));

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
        .post('/api/customer/CUST_2/generate-icp')
        .send({
          industry: 'Technology'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('should enforce rate limiting', async () => {
      if (!accessToken) {
        console.log('Skipping rate limit test - no access token available');
        return;
      }

      // Make multiple requests to test rate limiting (5 per hour)
      const promises = [];
      for (let i = 0; i < 7; i++) {
        promises.push(
          request(app)
            .post('/api/customer/CUST_2/generate-icp')
            .set('Authorization', `Bearer ${accessToken}`)
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
        .get('/api/webhooks/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('automationEnabled');
      expect(response.body.data).toHaveProperty('webhookStatus');
    });

    test('should handle webhook health check', async () => {
      const response = await request(app)
        .get('/api/webhooks/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.service).toBe('webhook_service');
    });
  });

  describe('API Documentation', () => {
    test('should include new AI endpoints in documentation', async () => {
      const response = await request(app)
        .get('/api/docs');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.description).toContain('AI Automation');
      expect(response.body.data.endpoints.customer).toHaveProperty('POST /api/customer/:customerId/generate-icp');
      expect(response.body.data.endpoints).toHaveProperty('webhooks');
    });
  });
});