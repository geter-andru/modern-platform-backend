/**
 * Test Setup Helper
 * 
 * Provides test environment configuration and mocks
 * for backend test suites.
 */

import TestAuthHelper from './auth.js';

class TestSetup {
  /**
   * Setup Supabase test environment
   * @param {Object} jest - Jest instance
   */
  static setupSupabaseTestEnvironment(jest) {
    // Mock supabaseDataService for testing
    jest.doMock('../../src/services/supabaseDataService.js', () => ({
      getCustomerById: jest.fn().mockImplementation((customerId) => {
        // Return mock customer for test UUIDs
        return {
          customerId: customerId,
          customerName: `Test Customer ${customerId}`,
          company: `Test Company ${customerId}`,
          email: `test@${customerId.toLowerCase()}.com`,
          status: 'active',
          emailConfirmed: true,
          createdAt: new Date().toISOString(),
          lastSignIn: new Date().toISOString()
        };
      }),
      
      getAllCustomers: jest.fn().mockResolvedValue([]),
      
      upsertCustomer: jest.fn().mockResolvedValue({
        customerId: 'test-uuid',
        customerName: 'New Test Customer',
        company: 'New Test Company'
      }),
      
      updateCustomer: jest.fn().mockResolvedValue({
        customerId: 'test-uuid',
        customerName: 'Updated Test Customer'
      })
    }));
  }

  /**
   * Setup test environment variables
   */
  static setupTestEnvironment() {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-key';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  }

  /**
   * Create test customer data
   * @param {string} customerId - Customer ID
   * @returns {Object} Test customer data
   */
  static createTestCustomer(customerId = null) {
    const id = customerId || TestAuthHelper.getValidCustomerId();
    return {
      customerId: id,
      customerName: `Test Customer ${id}`,
      company: `Test Company ${id}`,
      email: `test@${id.toLowerCase()}.com`,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Create multiple test customers
   * @param {number} count - Number of customers to create
   * @returns {Array} Array of test customers
   */
  static createTestCustomers(count = 3) {
    const customers = [];
    for (let i = 0; i < count; i++) {
      customers.push(this.createTestCustomer());
    }
    return customers;
  }

  /**
   * Mock Supabase service for testing
   * @param {Object} jest - Jest instance
   */
  static setupSupabaseMocks(jest) {
    jest.doMock('../../src/services/supabaseService.js', () => ({
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null })
            })
          }),
          insert: jest.fn().mockResolvedValue({ data: [], error: null }),
          update: jest.fn().mockResolvedValue({ data: [], error: null }),
          delete: jest.fn().mockResolvedValue({ data: [], error: null })
        })
      })
    }));
  }

  /**
   * Setup all test mocks and environment
   * @param {Object} jest - Jest instance
   */
  static setupAll(jest) {
    this.setupTestEnvironment();
    this.setupSupabaseTestEnvironment(jest);
    this.setupSupabaseMocks(jest);
  }

  /**
   * Clean up test environment
   */
  static cleanup() {
    // Reset environment variables
    delete process.env.NODE_ENV;
    delete process.env.JWT_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
    
    // Clear all mocks if jest is available
    if (typeof jest !== 'undefined') {
      jest.clearAllMocks();
    }
  }

  /**
   * Create test request options
   * @param {Object} options - Base options
   * @returns {Object} Test request options
   */
  static createTestRequestOptions(options = {}) {
    const customerId = options.customerId || TestAuthHelper.getValidCustomerId();
    const token = TestAuthHelper.generateTestToken(customerId);
    
    return {
      customerId,
      token,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: options.body || {},
      query: options.query || {},
      ...options
    };
  }
}

export default TestSetup;
