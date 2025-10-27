import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import { withAuth, generateTestTokenPair, generateInvalidToken } from './helpers/auth.js';

// Create the mock BEFORE any imports that might use it
const mockSupabaseDataService = {
  getCustomerById: jest.fn(),
  updateCustomer: jest.fn(),
};

// Mock the service BEFORE importing app
jest.unstable_mockModule('../src/services/supabaseDataService.js', () => ({
  default: mockSupabaseDataService
}));

// NOW import app (after mock is set up)
const { default: app } = await import('../src/server.js');

describe('Authentication Tests', () => {
  // Use UUIDs instead of CUST_XXX format
  const testCustomerId = '550e8400-e29b-41d4-a716-446655440001';
  const otherCustomerId = '550e8400-e29b-41d4-a716-446655440002';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock behaviors
    mockSupabaseDataService.getCustomerById.mockImplementation((customerId) => {
      if (customerId === testCustomerId) {
        return Promise.resolve({
          customerId: testCustomerId,
          customerName: 'Test Customer',
          email: 'test@example.com'
        });
      } else if (customerId === otherCustomerId) {
        return Promise.resolve({
          customerId: otherCustomerId,
          customerName: 'Other Customer',
          email: 'other@example.com'
        });
      }
      return Promise.resolve(null);
    });
  });

  describe('GET /api/auth/status', () => {
    test('should return auth service status', async () => {
      const response = await request(app)
        .get('/api/auth/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.authService).toBe('operational');
      expect(response.body.data.supportedMethods).toContain('Supabase JWT');
      expect(response.body.data).toHaveProperty('endpoints');
    });
  });

  describe('POST /api/auth/refresh', () => {
    test('should refresh JWT token with valid refresh token', async () => {
      const tokens = generateTestTokenPair(testCustomerId);

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: tokens.refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data.tokenType).toBe('Bearer');
      expect(response.body.data.expiresIn).toBe('24h');
    });

    test('should return 400 for missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation Error');
      expect(response.body.details).toContain('Refresh token is required');
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
    test('should verify valid JWT token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set(withAuth(testCustomerId));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(true);
      expect(response.body.data.customerId).toBe(testCustomerId);
      expect(response.body.data).toHaveProperty('permissions');
    });

    test('should return 400 for missing authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/verify');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authorization header required');
    });

    test('should return 401 for invalid token', async () => {
      const invalidToken = generateInvalidToken();
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid token');
    });
  });

  describe('POST /api/auth/api-key', () => {
    test('should generate API key for valid customer', async () => {
      const response = await request(app)
        .post('/api/auth/api-key')
        .send({
          customerId: testCustomerId
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('apiKey');
      expect(response.body.data.customerId).toBe(testCustomerId);
      expect(response.body.data.usage).toContain('X-API-Key');
    });

    test('should return 404 for non-existent customer', async () => {
      const nonExistentCustomerId = '550e8400-e29b-41d4-a716-446655449999';

      const response = await request(app)
        .post('/api/auth/api-key')
        .send({
          customerId: nonExistentCustomerId
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Customer not found');
    });
  });

  describe('GET /api/auth/permissions', () => {
    test('should get customer permissions with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/permissions')
        .set(withAuth(testCustomerId));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('permissions');
      expect(response.body.data.customerId).toBe(testCustomerId);
    });

    test('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/auth/permissions');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/validate', () => {
    test('should validate authentication successfully', async () => {
      const response = await request(app)
        .get('/api/auth/validate')
        .set(withAuth(testCustomerId));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.authenticated).toBe(true);
      expect(response.body.data.customerId).toBe(testCustomerId);
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

  describe('Multi-method Authentication', () => {
    test('should authenticate with JWT token', async () => {
      const response = await request(app)
        .get(`/api/customer/${testCustomerId}`)
        .set(withAuth(testCustomerId));

      expect(response.status).toBe(200);
    });

    test('should reject request without any authentication', async () => {
      const response = await request(app)
        .get(`/api/customer/${testCustomerId}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });
  });

  describe('Customer Context Validation', () => {
    test('should allow access to own customer data', async () => {
      const response = await request(app)
        .get(`/api/customer/${testCustomerId}`)
        .set(withAuth(testCustomerId));

      expect(response.status).toBe(200);
    });

    test('should deny access to other customer data', async () => {
      const response = await request(app)
        .get(`/api/customer/${otherCustomerId}`)
        .set(withAuth(testCustomerId));

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied');
      expect(response.body.details).toContain('Can only access your own customer data');
    });
  });

  describe('Test Authentication Endpoints (Development)', () => {
    beforeEach(() => {
      // Set NODE_ENV to development for these tests
      process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
      // Reset NODE_ENV
      process.env.NODE_ENV = 'test';
    });

    test('should access JWT test endpoint in development', async () => {
      const response = await request(app)
        .get('/api/auth/test/jwt')
        .set(withAuth(testCustomerId));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('JWT authentication successful');
    });

    test('should access optional auth test endpoint with auth', async () => {
      const response = await request(app)
        .get('/api/auth/test/optional')
        .set(withAuth(testCustomerId));

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

  describe('Error Handling', () => {
    test('should handle invalid token format', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid_format');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('should validate input schemas for API key generation', async () => {
      const response = await request(app)
        .post('/api/auth/api-key')
        .send({
          customerId: 'INVALID'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
