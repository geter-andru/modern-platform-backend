import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/server.js';
import { TEST_USERS, getValidTestUserId, getValidTestUserId2, getInvalidTestUserId } from './fixtures/testUsers.js';

// Mock the supabase data service
const mockSupabaseDataService = {
  getCustomerById: jest.fn(),
  updateCustomer: jest.fn(),
  getAllCustomers: jest.fn(),
};

jest.unstable_mockModule('../src/services/supabaseDataService.js', () => ({
  default: mockSupabaseDataService
}));

describe('Customer Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/customer/:customerId', () => {
    test('should return customer data for valid ID', async () => {
      const mockCustomer = {
        id: 'rec123',
        customerId: getValidTestUserId(),
        customerName: 'Test Customer',
        email: 'test@example.com',
        company: 'Test Company',
        icpContent: '{"test": "data"}',
        contentStatus: 'Ready'
      };

      mockSupabaseDataService.getCustomerById.mockResolvedValue(mockCustomer);
      mockSupabaseDataService.updateCustomer.mockResolvedValue({});

      const response = await request(app)
        .get('/api/customer/CUST_001')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: mockCustomer
      });

      expect(mockSupabaseDataService.getCustomerById).toHaveBeenCalledWith(getValidTestUserId());
      expect(mockSupabaseDataService.updateCustomer).toHaveBeenCalledWith(
        getValidTestUserId(),
        expect.objectContaining({
          'Last Accessed': expect.any(String)
        })
      );
    });

    test('should return 404 for non-existent customer', async () => {
      mockSupabaseDataService.getCustomerById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/customer/CUST_999')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Customer not found',
        customerId: getInvalidTestUserId()
      });
    });

    test('should validate customer ID format', async () => {
      const response = await request(app)
        .get('/api/customer/invalid-id')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Validation Error'
      });
    });

    test('should handle airtable service errors', async () => {
      mockSupabaseDataService.getCustomerById.mockRejectedValue(
        new Error('Airtable connection failed')
      );

      const response = await request(app)
        .get('/api/customer/CUST_001')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.any(String)
      });
    });
  });

  describe('GET /api/customer/:customerId/icp', () => {
    test('should return ICP data for valid customer', async () => {
      const mockCustomer = {
        customerId: getValidTestUserId(),
        icpContent: JSON.stringify({
          title: 'Test ICP',
          segments: ['Enterprise', 'Mid-Market']
        }),
        contentStatus: 'Ready'
      };

      mockSupabaseDataService.getCustomerById.mockResolvedValue(mockCustomer);

      const response = await request(app)
        .get('/api/customer/CUST_001/icp')
        .expect(200);

      expect(response.body.data.icpData).toEqual({
        title: 'Test ICP',
        segments: ['Enterprise', 'Mid-Market']
      });
    });

    test('should handle malformed ICP JSON', async () => {
      const mockCustomer = {
        customerId: getValidTestUserId(),
        icpContent: 'invalid json{',
        contentStatus: 'Ready'
      };

      mockSupabaseDataService.getCustomerById.mockResolvedValue(mockCustomer);

      const response = await request(app)
        .get('/api/customer/CUST_001/icp')
        .expect(200);

      expect(response.body.data.icpData).toEqual({
        rawContent: 'invalid json{'
      });
    });
  });

  describe('PUT /api/customer/:customerId', () => {
    test('should update customer data successfully', async () => {
      const mockCustomer = {
        customerId: getValidTestUserId(),
        customerName: 'Existing Customer'
      };

      const updateData = {
        'Content Status': 'Generating',
        'Usage Count': 5
      };

      mockSupabaseDataService.getCustomerById.mockResolvedValue(mockCustomer);
      mockSupabaseDataService.updateCustomer.mockResolvedValue({});

      const response = await request(app)
        .put('/api/customer/CUST_001')
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          customerId: getValidTestUserId(),
          updated: true
        }
      });

      expect(mockSupabaseDataService.updateCustomer).toHaveBeenCalledWith(
        getValidTestUserId(),
        expect.objectContaining({
          ...updateData,
          'Last Accessed': expect.any(String)
        })
      );
    });

    test('should return 404 for non-existent customer update', async () => {
      mockSupabaseDataService.getCustomerById.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/customer/CUST_999')
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
      const mockCustomers = [
        { customerId: getValidTestUserId(), customerName: 'Customer 1' },
        { customerId: getValidTestUserId2(), customerName: 'Customer 2' }
      ];

      mockSupabaseDataService.getAllCustomers.mockResolvedValue(mockCustomers);

      const response = await request(app)
        .get('/api/customers')
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
      mockSupabaseDataService.getAllCustomers.mockResolvedValue([]);

      await request(app)
        .get('/api/customers?limit=50')
        .expect(200);

      expect(mockSupabaseDataService.getAllCustomers).toHaveBeenCalledWith(50);
    });

    test('should be rate limited (strict)', async () => {
      // This test verifies that the endpoint has strict rate limiting
      // In a real test environment, you might want to test this with actual rate limiting
      mockSupabaseDataService.getAllCustomers.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/customers')
        .expect(200);

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
    });
  });
});