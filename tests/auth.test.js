import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/server.js';

describe('Authentication Tests', () => {
  describe('POST /api/auth/token', () => {
    test('should generate JWT token for valid customer', async () => {
      const response = await request(app)
        .post('/api/auth/token')
        .send({
          customerId: 'CUST_2'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.tokenType).toBe('Bearer');
      expect(response.body.data.expiresIn).toBe('24h');
    });

    test('should return 400 for missing customer ID', async () => {
      const response = await request(app)
        .post('/api/auth/token')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Customer ID');
    });

    test('should return 404 for non-existent customer', async () => {
      const response = await request(app)
        .post('/api/auth/token')
        .send({
          customerId: 'CUST_9999'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Customer not found');
    });

    test('should handle rate limiting', async () => {
      // Make requests up to the limit
      const promises = [];
      for (let i = 0; i < 25; i++) {
        promises.push(
          request(app)
            .post('/api/auth/token')
            .send({ customerId: 'CUST_2' })
        );
      }

      const responses = await Promise.all(promises);
      
      // Some should succeed, others should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken;

    beforeEach(async () => {
      // Get a refresh token first
      const tokenResponse = await request(app)
        .post('/api/auth/token')
        .send({ customerId: 'CUST_2' });
      
      refreshToken = tokenResponse.body.data.refreshToken;
    });

    test('should refresh JWT token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data.tokenType).toBe('Bearer');
    });

    test('should return 400 for missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Refresh token required');
    });

    test('should return 401 for invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid_token' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid refresh token');
    });
  });

  describe('GET /api/auth/verify', () => {
    let accessToken;

    beforeEach(async () => {
      // Get an access token first
      const tokenResponse = await request(app)
        .post('/api/auth/token')
        .send({ customerId: 'CUST_2' });
      
      accessToken = tokenResponse.body.data.accessToken;
    });

    test('should verify valid JWT token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(true);
      expect(response.body.data.customerId).toBe('CUST_2');
    });

    test('should return 400 for missing authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/verify');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authorization header required');
    });

    test('should return 401 for invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid token');
    });
  });

  describe('POST /api/auth/customer-token', () => {
    test('should generate customer access token', async () => {
      const response = await request(app)
        .post('/api/auth/customer-token')
        .send({
          customerId: 'CUST_2'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('customerId');
    });

    test('should return 404 for non-existent customer', async () => {
      const response = await request(app)
        .post('/api/auth/customer-token')
        .send({
          customerId: 'CUST_9999'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Customer not found');
    });
  });

  describe('POST /api/auth/api-key', () => {
    test('should generate API key for valid customer', async () => {
      const response = await request(app)
        .post('/api/auth/api-key')
        .send({
          customerId: 'CUST_2'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('apiKey');
      expect(response.body.data.customerId).toBe('CUST_2');
      expect(response.body.data.usage).toContain('X-API-Key');
    });

    test('should return 404 for non-existent customer', async () => {
      const response = await request(app)
        .post('/api/auth/api-key')
        .send({
          customerId: 'CUST_9999'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Customer not found');
    });
  });

  describe('GET /api/auth/permissions', () => {
    let accessToken;

    beforeEach(async () => {
      const tokenResponse = await request(app)
        .post('/api/auth/token')
        .send({ customerId: 'CUST_2' });
      
      accessToken = tokenResponse.body.data.accessToken;
    });

    test('should get customer permissions with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/permissions')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('permissions');
      expect(response.body.data.customerId).toBe('CUST_2');
    });

    test('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/auth/permissions');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/validate', () => {
    let accessToken;

    beforeEach(async () => {
      const tokenResponse = await request(app)
        .post('/api/auth/token')
        .send({ customerId: 'CUST_2' });
      
      accessToken = tokenResponse.body.data.accessToken;
    });

    test('should validate authentication successfully', async () => {
      const response = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.authenticated).toBe(true);
      expect(response.body.data.customerId).toBe('CUST_2');
      expect(response.body.data).toHaveProperty('customer');
      expect(response.body.data).toHaveProperty('permissions');
    });

    test('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/auth/validate');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/status', () => {
    test('should return auth service status', async () => {
      const response = await request(app)
        .get('/api/auth/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.authService).toBe('operational');
      expect(response.body.data.supportedMethods).toContain('JWT');
      expect(response.body.data).toHaveProperty('endpoints');
    });
  });

  describe('Multi-method Authentication', () => {
    let accessToken, apiKey, customerToken;

    beforeEach(async () => {
      // Get JWT token
      const jwtResponse = await request(app)
        .post('/api/auth/token')
        .send({ customerId: 'CUST_2' });
      accessToken = jwtResponse.body.data.accessToken;

      // Get API key
      const apiKeyResponse = await request(app)
        .post('/api/auth/api-key')
        .send({ customerId: 'CUST_2' });
      apiKey = apiKeyResponse.body.data.apiKey;

      // Get customer token
      const customerTokenResponse = await request(app)
        .post('/api/auth/customer-token')
        .send({ customerId: 'CUST_2' });
      customerToken = customerTokenResponse.body.data.accessToken;
    });

    test('should authenticate with JWT token', async () => {
      const response = await request(app)
        .get('/api/customer/CUST_2')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
    });

    test('should authenticate with API key', async () => {
      const response = await request(app)
        .get('/api/customer/CUST_2')
        .set('X-API-Key', apiKey);

      expect(response.status).toBe(200);
    });

    test('should authenticate with customer token', async () => {
      const response = await request(app)
        .get('/api/customer/CUST_2')
        .set('X-Access-Token', customerToken);

      expect(response.status).toBe(200);
    });

    test('should reject request without any authentication', async () => {
      const response = await request(app)
        .get('/api/customer/CUST_2');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });
  });

  describe('Customer Context Validation', () => {
    let accessToken;

    beforeEach(async () => {
      const tokenResponse = await request(app)
        .post('/api/auth/token')
        .send({ customerId: 'CUST_2' });
      
      accessToken = tokenResponse.body.data.accessToken;
    });

    test('should allow access to own customer data', async () => {
      const response = await request(app)
        .get('/api/customer/CUST_2')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
    });

    test('should deny access to other customer data', async () => {
      const response = await request(app)
        .get('/api/customer/CUST_3')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied');
      expect(response.body.details).toContain('Can only access your own customer data');
    });
  });

  describe('Test Authentication Endpoints (Development)', () => {
    let accessToken;

    beforeEach(async () => {
      // Set NODE_ENV to development for these tests
      process.env.NODE_ENV = 'development';
      
      const tokenResponse = await request(app)
        .post('/api/auth/token')
        .send({ customerId: 'CUST_2' });
      
      accessToken = tokenResponse.body.data.accessToken;
    });

    afterEach(() => {
      // Reset NODE_ENV
      process.env.NODE_ENV = 'test';
    });

    test('should access JWT test endpoint in development', async () => {
      const response = await request(app)
        .get('/api/auth/test/jwt')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('JWT authentication successful');
    });

    test('should access optional auth test endpoint', async () => {
      const response = await request(app)
        .get('/api/auth/test/optional')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.authenticated).toBe(true);
    });

    test('should access optional auth test endpoint without auth', async () => {
      const response = await request(app)
        .get('/api/auth/test/optional');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.authenticated).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce customer-specific rate limits', async () => {
      const promises = [];
      
      // Create many requests from the same customer
      for (let i = 0; i < 30; i++) {
        promises.push(
          request(app)
            .post('/api/auth/token')
            .send({ customerId: 'CUST_2' })
        );
      }

      const responses = await Promise.all(promises);
      
      // Check for rate limit headers
      const firstResponse = responses[0];
      expect(firstResponse.headers).toHaveProperty('x-ratelimit-limit');
      expect(firstResponse.headers).toHaveProperty('x-ratelimit-remaining');
      expect(firstResponse.headers).toHaveProperty('x-ratelimit-reset');

      // Some responses should be rate limited
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      expect(rateLimitedCount).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle service errors gracefully', async () => {
      // Mock a service error by using an invalid customer ID format
      const response = await request(app)
        .post('/api/auth/token')
        .send({
          customerId: 'INVALID_FORMAT'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should validate input schemas', async () => {
      const response = await request(app)
        .post('/api/auth/token')
        .send({
          customerId: 'INVALID'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});