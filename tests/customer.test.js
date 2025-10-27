import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import { withAuth } from './helpers/auth.js';

// Create the mock BEFORE any imports that might use it
const mockSupabaseDataService = {
  getCustomerById: jest.fn(),
  getCustomerByEmail: jest.fn(),
  updateCustomer: jest.fn(),
  getAllCustomers: jest.fn(),
  createCustomer: jest.fn(),
  deleteCustomer: jest.fn(),
};

// Mock the service BEFORE importing app
jest.unstable_mockModule('../src/services/supabaseDataService.js', () => ({
  default: mockSupabaseDataService
}));

// NOW import app (after mock is set up)
const { default: app } = await import('../src/server.js');

describe('Customer Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/customer/:customerId', () => {
    test('should return customer data for valid ID', async () => {
      const testCustomerId = '550e8400-e29b-41d4-a716-446655440001';
      const mockCustomer = {
        id: 'rec123',
        customerId: testCustomerId,
        customerName: 'Test Customer',
        email: 'test@example.com',
        company: 'Test Company',
        icpContent: '{"test": "data"}',
        contentStatus: 'Ready'
      };

      mockSupabaseDataService.getCustomerById.mockResolvedValue(mockCustomer);
      mockSupabaseDataService.updateCustomer.mockResolvedValue({});

      const response = await request(app)
        .get(`/api/customer/${testCustomerId}`)
        .set(withAuth(testCustomerId));

      // Debug: Log actual response
      if (response.status !== 200) {
        console.log('Response status:', response.status);
        console.log('Response body:', JSON.stringify(response.body, null, 2));
      }

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: mockCustomer
      });

      expect(mockSupabaseDataService.getCustomerById).toHaveBeenCalledWith(testCustomerId);
      expect(mockSupabaseDataService.updateCustomer).toHaveBeenCalledWith(
        testCustomerId,
        expect.objectContaining({
          last_accessed: expect.any(String)
        })
      );
    });

    test('should return 404 for non-existent customer', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440999';
      mockSupabaseDataService.getCustomerById.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/customer/${nonExistentId}`)
        .set(withAuth(nonExistentId))
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Customer not found',
        customerId: nonExistentId
      });
    });

    test('should validate customer ID format', async () => {
      const validTestId = '550e8400-e29b-41d4-a716-446655440001';
      const response = await request(app)
        .get('/api/customer/invalid-id')
        .set(withAuth(validTestId))
        .expect(400); // Validation middleware catches invalid ID format

      expect(response.body).toMatchObject({
        success: false
      });
    });

    test('should handle supabase service errors', async () => {
      const testCustomerId = '550e8400-e29b-41d4-a716-446655440001';
      mockSupabaseDataService.getCustomerById.mockRejectedValue(
        new Error('Supabase connection failed')
      );

      const response = await request(app)
        .get(`/api/customer/${testCustomerId}`)
        .set(withAuth(testCustomerId))
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.any(String)
      });
    });
  });

  describe('GET /api/customer/:customerId/icp', () => {
    test('should return ICP data for valid customer', async () => {
      const testCustomerId = '550e8400-e29b-41d4-a716-446655440002';
      const mockCustomer = {
        customerId: testCustomerId,
        icpContent: JSON.stringify({
          title: 'Test ICP',
          segments: ['Enterprise', 'Mid-Market']
        }),
        contentStatus: 'Ready'
      };

      mockSupabaseDataService.getCustomerById.mockResolvedValue(mockCustomer);

      const response = await request(app)
        .get(`/api/customer/${testCustomerId}/icp`)
        .set(withAuth(testCustomerId))
        .expect(200);

      expect(response.body.data.icpData).toEqual({
        title: 'Test ICP',
        segments: ['Enterprise', 'Mid-Market']
      });
    });

    test('should handle malformed ICP JSON', async () => {
      const testCustomerId = '550e8400-e29b-41d4-a716-446655440003';
      const mockCustomer = {
        customerId: testCustomerId,
        icpContent: 'invalid json{',
        contentStatus: 'Ready'
      };

      mockSupabaseDataService.getCustomerById.mockResolvedValue(mockCustomer);

      const response = await request(app)
        .get(`/api/customer/${testCustomerId}/icp`)
        .set(withAuth(testCustomerId))
        .expect(200);

      expect(response.body.data.icpData).toEqual({
        rawContent: 'invalid json{'
      });
    });
  });

  describe('PUT /api/customer/:customerId', () => {
    test('should update customer data successfully', async () => {
      const testCustomerId = '550e8400-e29b-41d4-a716-446655440004';
      const mockCustomer = {
        customerId: testCustomerId,
        customerName: 'Existing Customer'
      };

      const updateData = {
        'Content Status': 'Generating',
        'Usage Count': 5
      };

      mockSupabaseDataService.getCustomerById.mockResolvedValue(mockCustomer);
      mockSupabaseDataService.updateCustomer.mockResolvedValue({});

      const response = await request(app)
        .put(`/api/customer/${testCustomerId}`)
        .set(withAuth(testCustomerId))
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          customerId: testCustomerId,
          updated: true
        }
      });

      expect(mockSupabaseDataService.updateCustomer).toHaveBeenCalledWith(
        testCustomerId,
        expect.objectContaining({
          ...updateData,
          last_accessed: expect.any(String)
        })
      );
    });

    test('should return 404 for non-existent customer update', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440998';
      mockSupabaseDataService.getCustomerById.mockResolvedValue(null);

      const response = await request(app)
        .put(`/api/customer/${nonExistentId}`)
        .set(withAuth(nonExistentId))
        .send({ 'Content Status': 'Ready' })
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Customer not found'
      });
    });
  });

  describe('GET /api/customers', () => {
    test('should return all customers with default limit', async () => {
      const testCustomerId = '550e8400-e29b-41d4-a716-446655440005';
      const mockCustomers = [
        { customerId: '550e8400-e29b-41d4-a716-446655440005', customerName: 'Customer 1' },
        { customerId: '550e8400-e29b-41d4-a716-446655440006', customerName: 'Customer 2' }
      ];

      mockSupabaseDataService.getAllCustomers.mockResolvedValue(mockCustomers);

      const response = await request(app)
        .get('/api/customers')
        .set(withAuth(testCustomerId))
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          customers: mockCustomers,
          count: 2,
          limit: 100
        }
      });

      expect(mockSupabaseDataService.getAllCustomers).toHaveBeenCalledWith(100);
    });

    test('should respect custom limit parameter', async () => {
      const testCustomerId = '550e8400-e29b-41d4-a716-446655440007';
      mockSupabaseDataService.getAllCustomers.mockResolvedValue([]);

      await request(app)
        .get('/api/customers?limit=50')
        .set(withAuth(testCustomerId))
        .expect(200);

      expect(mockSupabaseDataService.getAllCustomers).toHaveBeenCalledWith(50);
    });

    test('should be rate limited (strict)', async () => {
      const testCustomerId = '550e8400-e29b-41d4-a716-446655440008';
      // This test verifies that the endpoint has strict rate limiting
      // In a real test environment, you might want to test this with actual rate limiting
      mockSupabaseDataService.getAllCustomers.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/customers')
        .set(withAuth(testCustomerId))
        .expect(200);

      // Rate limit headers use lowercase format
      expect(response.headers).toHaveProperty('ratelimit-limit');
    });
  });
});