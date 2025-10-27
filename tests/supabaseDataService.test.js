import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock Supabase client BEFORE importing the service
const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  upsert: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  single: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
  limit: jest.fn(() => mockSupabase),
  maybeSingle: jest.fn(() => mockSupabase),
};

// Mock the supabaseService module
jest.unstable_mockModule('../src/services/supabaseService.js', () => ({
  default: mockSupabase
}));

// Now import the service under test (it's a singleton instance, not a class)
const { default: service } = await import('../src/services/supabaseDataService.js');

describe('SupabaseDataService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('getCustomerById', () => {
    const testCustomerId = '550e8400-e29b-41d4-a716-446655440001';

    test('should return customer data when found', async () => {
      const mockData = {
        id: 1,
        customer_id: testCustomerId,
        customer_name: 'Test Customer',
        email: 'test@example.com',
        company: 'Test Company',
        icp_content: JSON.stringify({ test: 'data' }),
        cost_calculator_content: null,
        business_case_content: null,
        tool_access_status: 'active',
        content_status: 'draft',
        payment_status: 'active',
        usage_count: 5,
        last_accessed: '2025-01-01T00:00:00Z',
        created_at: '2024-12-01T00:00:00Z',
      };

      mockSupabase.single.mockResolvedValueOnce({
        data: mockData,
        error: null
      });

      const result = await service.getCustomerById(testCustomerId);

      expect(mockSupabase.from).toHaveBeenCalledWith('customer_assets');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.eq).toHaveBeenCalledWith('customer_id', testCustomerId);
      expect(mockSupabase.single).toHaveBeenCalled();

      expect(result).toEqual({
        id: 1,
        customerId: testCustomerId,
        customerName: 'Test Customer',
        email: 'test@example.com',
        company: 'Test Company',
        icpContent: JSON.stringify({ test: 'data' }),
        costCalculatorContent: null,
        businessCaseContent: null,
        toolAccessStatus: 'active',
        contentStatus: 'draft',
        paymentStatus: 'active',
        usageCount: 5,
        lastAccessed: '2025-01-01T00:00:00Z',
        createdAt: '2024-12-01T00:00:00Z',
      });
    });

    test('should return null when customer not found', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' }
      });

      const result = await service.getCustomerById(testCustomerId);

      expect(result).toBeNull();
    });

    test('should throw error on database failure', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'CONNECTION_ERROR', message: 'Database connection failed' }
      });

      await expect(service.getCustomerById(testCustomerId))
        .rejects.toThrow('Failed to fetch customer data');
    });

    test('should handle malformed customer IDs gracefully', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'INVALID_PARAM', message: 'Invalid UUID format' }
      });

      await expect(service.getCustomerById('invalid-id'))
        .rejects.toThrow();
    });
  });

  describe('updateCustomer', () => {
    const testCustomerId = '550e8400-e29b-41d4-a716-446655440002';

    beforeEach(() => {
      // Mock getCustomerById for existence check
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 2,
          customer_id: testCustomerId,
          customer_name: 'Existing Customer',
          email: 'existing@example.com'
        },
        error: null
      });
    });

    test('should update customer data successfully', async () => {
      const updateData = {
        'Customer Name': 'Updated Name',
        'Email': 'updated@example.com',
        'Company': 'Updated Company'
      };

      const mockUpdatedData = {
        id: 2,
        customer_id: testCustomerId,
        customer_name: 'Updated Name',
        email: 'updated@example.com',
        company: 'Updated Company',
        updated_at: expect.any(String)
      };

      // Second call: update() chain returns single record
      mockSupabase.single.mockResolvedValueOnce({
        data: mockUpdatedData,
        error: null
      });

      const result = await service.updateCustomer(testCustomerId, updateData);

      expect(mockSupabase.from).toHaveBeenCalledWith('customer_assets');
      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
        customer_name: 'Updated Name',
        email: 'updated@example.com',
        company: 'Updated Company',
        updated_at: expect.any(String)
      }));
      expect(mockSupabase.eq).toHaveBeenCalledWith('customer_id', testCustomerId);
      expect(result).toBeTruthy();
    });

    test('should throw error when customer not found', async () => {
      // Reset mock to return null for getCustomerById (PGRST116 = not found, returns null)
      jest.clearAllMocks();
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' }
      });

      // getCustomerById returns null, then updateCustomer throws its own error
      // The actual error caught shows: "Failed to update customer: Not found"
      await expect(service.updateCustomer('non-existent-id', {}))
        .rejects.toThrow('Failed to update customer');
    });

    test('should handle update errors gracefully', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'UPDATE_FAILED', message: 'Update operation failed' }
      });

      await expect(service.updateCustomer(testCustomerId, { 'Customer Name': 'Test' }))
        .rejects.toThrow();
    });

    test('should always update updated_at timestamp', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { updated_at: '2025-01-01T00:00:00Z' },
        error: null
      });

      await service.updateCustomer(testCustomerId, { 'Customer Name': 'Test' });

      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
        updated_at: expect.any(String)
      }));
    });
  });

  describe('getAllCustomers', () => {
    test('should return all customers with default limit', async () => {
      const mockCustomers = [
        { customer_id: 'id-1', customer_name: 'Customer 1' },
        { customer_id: 'id-2', customer_name: 'Customer 2' }
      ];

      mockSupabase.limit.mockResolvedValueOnce({
        data: mockCustomers,
        error: null
      });

      const result = await service.getAllCustomers();

      expect(mockSupabase.from).toHaveBeenCalledWith('customer_assets');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockSupabase.limit).toHaveBeenCalledWith(100); // Default limit
      expect(result).toHaveLength(2);
    });

    test('should respect custom limit parameter', async () => {
      mockSupabase.limit.mockResolvedValueOnce({
        data: [],
        error: null
      });

      await service.getAllCustomers(50);

      expect(mockSupabase.limit).toHaveBeenCalledWith(50);
    });

    test('should return empty array when no customers', async () => {
      mockSupabase.limit.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const result = await service.getAllCustomers();

      expect(result).toEqual([]);
    });

    test('should throw error on database failure', async () => {
      mockSupabase.limit.mockResolvedValueOnce({
        data: null,
        error: { code: 'DB_ERROR', message: 'Database error' }
      });

      await expect(service.getAllCustomers())
        .rejects.toThrow('Failed to fetch customers');
    });
  });

  describe('upsertCustomer', () => {
    const testCustomerId = '550e8400-e29b-41d4-a716-446655440003';

    test('should insert new customer when not exists', async () => {
      const customerData = {
        customerName: 'New Customer',
        email: 'new@example.com',
        company: 'New Company'
      };

      const mockInsertedData = {
        id: 3,
        customer_id: testCustomerId,
        customer_name: 'New Customer',
        email: 'new@example.com',
        company: 'New Company',
        created_at: expect.any(String)
      };

      mockSupabase.single.mockResolvedValueOnce({
        data: mockInsertedData,
        error: null
      });

      const result = await service.upsertCustomer(testCustomerId, customerData);

      expect(mockSupabase.from).toHaveBeenCalledWith('customer_assets');
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_id: testCustomerId,
          customer_name: 'New Customer',
          email: 'new@example.com',
          company: 'New Company'
        }),
        { onConflict: 'customer_id' }
      );
      expect(result).toBeTruthy();
    });

    test('should update existing customer when exists', async () => {
      const customerData = {
        customerName: 'Updated Customer',
        paymentStatus: 'active',
        email: 'updated@example.com'
      };

      mockSupabase.single.mockResolvedValueOnce({
        data: { customer_id: testCustomerId, customer_name: 'Updated Customer' },
        error: null
      });

      const result = await service.upsertCustomer(testCustomerId, customerData);

      expect(mockSupabase.upsert).toHaveBeenCalled();
      expect(result).toBeTruthy();
    });

    test('should handle upsert errors gracefully', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'UPSERT_FAILED', message: 'Upsert failed' }
      });

      await expect(service.upsertCustomer(testCustomerId, { email: 'test@example.com' }))
        .rejects.toThrow();
    });
  });

  describe('getUserProgress', () => {
    const testCustomerId = '550e8400-e29b-41d4-a716-446655440004';

    test('should return progress for specific tool', async () => {
      const mockProgressData = [{
        id: 1,
        customer_id: testCustomerId,
        tool_name: 'cost-calculator',
        progress_data: { step: 3, completed: false },
        updated_at: '2025-01-01T00:00:00Z'
      }];

      // With toolName: query = supabase.from().select().eq().order().eq() - then await query
      // The final .eq() call (for tool_name) is what gets awaited
      // We need to make the last eq() call return a promise

      // First eq() returns mockSupabase (chaining continues)
      // order() returns mockSupabase (chaining continues)
      // Second eq() returns the promise (gets awaited)
      const mockQueryResult = Promise.resolve({
        data: mockProgressData,
        error: null
      });

      // The second call to eq() should return the promise
      mockSupabase.eq
        .mockReturnValueOnce(mockSupabase)  // First call (customer_id) - continue chain
        .mockReturnValueOnce(mockQueryResult);  // Second call (tool_name) - return promise

      const result = await service.getUserProgress(testCustomerId, 'cost-calculator');

      expect(mockSupabase.from).toHaveBeenCalledWith('user_progress');
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 1,
        customerId: testCustomerId,
        toolName: 'cost-calculator',
        progressData: { step: 3, completed: false }
      });
    });

    test('should return all progress when no tool specified', async () => {
      const mockProgressList = [
        { id: 1, customer_id: testCustomerId, tool_name: 'icp', progress_data: {}, updated_at: '2025-01-01' },
        { id: 2, customer_id: testCustomerId, tool_name: 'cost-calculator', progress_data: {}, updated_at: '2025-01-02' }
      ];

      mockSupabase.order.mockReturnValueOnce(Promise.resolve({
        data: mockProgressList,
        error: null
      }));

      const result = await service.getUserProgress(testCustomerId);

      expect(result).toHaveLength(2);
      expect(result[0].toolName).toBe('icp');
      expect(result[1].toolName).toBe('cost-calculator');
    });

    test('should return empty array when no progress found', async () => {
      mockSupabase.order.mockReturnValueOnce(Promise.resolve({
        data: [],
        error: null
      }));

      const result = await service.getUserProgress(testCustomerId, 'non-existent-tool');

      expect(result).toEqual([]);
    });
  });

  describe('updateUserProgress', () => {
    const testCustomerId = '550e8400-e29b-41d4-a716-446655440005';

    test('should update progress data successfully', async () => {
      const progressData = {
        step: 5,
        completed: true,
        answers: { q1: 'answer1' }
      };

      mockSupabase.select.mockResolvedValueOnce({
        data: [{
          customer_id: testCustomerId,
          tool_name: 'icp',
          progress_data: progressData,  // Stored as object, not JSON string
          updated_at: expect.any(String)
        }],
        error: null
      });

      const result = await service.updateUserProgress(testCustomerId, 'icp', progressData);

      expect(mockSupabase.from).toHaveBeenCalledWith('user_progress');
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_id: testCustomerId,
          tool_name: 'icp',
          progress_data: progressData,  // Object, not JSON string
          updated_at: expect.any(String)
        }),
        { onConflict: 'customer_id,tool_name' }
      );
      expect(result).toBe(true);
    });

    test('should handle JSON serialization of complex progress data', async () => {
      const complexData = {
        nested: { deep: { value: 'test' } },
        array: [1, 2, 3],
        date: new Date().toISOString()
      };

      mockSupabase.select.mockResolvedValueOnce({
        data: [{ progress_data: complexData }],  // Object, not JSON string
        error: null
      });

      await service.updateUserProgress(testCustomerId, 'test-tool', complexData);

      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          progress_data: complexData  // Object, not JSON string
        }),
        expect.any(Object)
      );
    });
  });

  describe('Data Transformation', () => {
    test('should correctly transform Airtable field names to Supabase columns', async () => {
      const testCustomerId = '550e8400-e29b-41d4-a716-446655440006';

      // Mock getCustomerById (first .single() call)
      mockSupabase.single.mockResolvedValueOnce({
        data: { customer_id: testCustomerId },
        error: null
      });

      // Mock update result (second .single() call)
      mockSupabase.single.mockResolvedValueOnce({
        data: {},
        error: null
      });

      await service.updateCustomer(testCustomerId, {
        'Customer Name': 'Test',
        'ICP Content': 'content',
        'Payment Status': 'active',
        'Tool Access Status': 'enabled'
      });

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_name: 'Test',
          icp_content: 'content',
          payment_status: 'active',
          tool_access_status: 'enabled'
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('should provide meaningful error messages on failure', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: {
          code: 'PGTIMEOUT',
          message: 'Query timeout',
          details: 'Connection timed out after 30s'
        }
      });

      try {
        await service.getCustomerById('test-id');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Failed to fetch customer data');
        expect(error.message).toContain('Query timeout');
      }
    });

    test('should handle null/undefined gracefully', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });

      const result = await service.getCustomerById(null);
      expect(result).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty update data', async () => {
      const testCustomerId = '550e8400-e29b-41d4-a716-446655440007';

      // Mock getCustomerById
      mockSupabase.single.mockResolvedValueOnce({
        data: { customer_id: testCustomerId },
        error: null
      });

      // Mock update result
      mockSupabase.single.mockResolvedValueOnce({
        data: {},
        error: null
      });

      // Should still update timestamp even with empty data
      await service.updateCustomer(testCustomerId, {});

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          updated_at: expect.any(String)
        })
      );
    });

    test('should handle very large JSON content', async () => {
      const largeContent = JSON.stringify({ data: 'x'.repeat(100000) });
      const testCustomerId = '550e8400-e29b-41d4-a716-446655440008';

      // Mock getCustomerById
      mockSupabase.single.mockResolvedValueOnce({
        data: { customer_id: testCustomerId },
        error: null
      });

      // Mock update result
      mockSupabase.single.mockResolvedValueOnce({
        data: { icp_content: largeContent },
        error: null
      });

      await service.updateCustomer(testCustomerId, {
        'ICP Content': largeContent
      });

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          icp_content: largeContent
        })
      );
    });

    test('should handle concurrent updates gracefully', async () => {
      const testCustomerId = '550e8400-e29b-41d4-a716-446655440009';

      // Mock will be called 6 times (3 x getCustomerById + 3 x update result)
      mockSupabase.single.mockResolvedValue({
        data: { customer_id: testCustomerId },
        error: null
      });

      // Simulate concurrent updates
      const updates = [
        service.updateCustomer(testCustomerId, { 'Customer Name': 'Name1' }),
        service.updateCustomer(testCustomerId, { 'Customer Name': 'Name2' }),
        service.updateCustomer(testCustomerId, { 'Customer Name': 'Name3' })
      ];

      await expect(Promise.all(updates)).resolves.toBeTruthy();
    });
  });
});
