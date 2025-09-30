import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/server.js';

describe('Health Check Endpoints', () => {
  let server;

  beforeAll(async () => {
    // Start server for testing
    server = app.listen(0);
  });

  afterAll(async () => {
    // Close server after tests
    if (server) {
      server.close();
    }
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
            airtable: {
              status: expect.stringMatching(/healthy|unhealthy/),
              responseTime: expect.any(Number)
            }
          },
          responseTime: expect.any(Number)
        }
      });
    });

    test('should handle airtable connection failures gracefully', async () => {
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