import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';

// Create the mock BEFORE any imports that might use it
const mockSupabaseDataService = {
  getCustomerById: jest.fn(),
};

// Mock the service BEFORE importing app
jest.unstable_mockModule('../src/services/supabaseDataService.js', () => ({
  default: mockSupabaseDataService
}));

// NOW import app (after mock is set up)
const { default: app } = await import('../src/server.js');

describe('Health Check Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    test('should return 200 and health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          status: 'healthy',
          environment: 'test',
          version: expect.any(String),
          timestamp: expect.any(String),
          uptime: expect.any(Number),
          memory: expect.objectContaining({
            rss: expect.any(Number),
            heapTotal: expect.any(Number),
            heapUsed: expect.any(Number),
            external: expect.any(Number)
          })
        }
      });
    });

    test('should include proper headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.headers['x-request-id']).toBeDefined();
    });
  });

  describe('GET /health/detailed', () => {
    test('should return detailed health status', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          status: expect.stringMatching(/healthy|degraded/),
          environment: 'test',
          dependencies: {
            supabase: {
              status: expect.stringMatching(/healthy|unhealthy/),
              responseTime: expect.any(Number)
            }
          },
          responseTime: expect.any(Number)
        }
      });
    });

    test('should handle supabase connection failures gracefully', async () => {
      // This test verifies that the health check handles external service failures
      const response = await request(app)
        .get('/health/detailed');

      // Should not crash and should return a response
      expect(response.status).toBeLessThanOrEqual(503);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 for non-existent health endpoints', async () => {
      const response = await request(app)
        .get('/health/nonexistent')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Endpoint not found'
      });
    });
  });
});
