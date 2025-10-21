import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import { withAuth } from './helpers/auth.js';

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

describe('Basic Authentication Tests', () => {
  const testCustomerId = '550e8400-e29b-41d4-a716-446655440001';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock behavior
    mockSupabaseDataService.getCustomerById.mockResolvedValue({
      customerId: testCustomerId,
      customerName: 'Test Customer'
    });
  });

  describe('Auth Status', () => {
    test('should return auth service status', async () => {
      const response = await request(app)
        .get('/api/auth/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.authService).toBe('operational');
      expect(response.body.data.supportedMethods).toContain('Supabase JWT');
    });
  });

  describe('Token Verification', () => {
    test('should verify valid JWT token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set(withAuth(testCustomerId));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(true);
      expect(response.body.data.customerId).toBe(testCustomerId);
    });

    test('should reject missing authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/verify');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authorization header required');
    });
  });

  describe('Validation Errors', () => {
    test('should reject invalid token format', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid_token_format');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid token');
    });
  });
});
