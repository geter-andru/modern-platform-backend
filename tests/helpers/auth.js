/**
 * Test Authentication Helper
 * 
 * Provides utilities for creating authenticated test requests
 * to fix backend test authentication issues.
 * 
 * This helper generates valid test tokens and API keys
 * for use in backend test suites.
 */

import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

class TestAuthHelper {
  /**
   * Generate a valid Supabase UUID format customer ID
   * @returns {string} Valid UUID format customer ID for Supabase
   */
  static getValidCustomerId() {
    return uuidv4();
  }

  /**
   * Generate a test JWT token for a customer
   * @param {string} customerId - Customer ID to include in token
   * @returns {string} JWT token
   */
  static generateTestToken(customerId) {
    const payload = {
      customerId: customerId,
      type: 'test',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
    };

    return jwt.sign(
      payload,
      process.env.JWT_SECRET || 'test-secret-key',
      { algorithm: 'HS256' }
    );
  }

  /**
   * Generate a test API key for a customer
   * @param {string} customerId - Customer ID to include in API key
   * @returns {string} Test API key
   */
  static generateTestApiKey(customerId) {
    return `test_api_key_${customerId}_${Date.now()}`;
  }

  /**
   * Generate a test refresh token
   * @param {string} customerId - Customer ID to include in refresh token
   * @returns {string} Refresh token
   */
  static generateTestRefreshToken(customerId) {
    const payload = {
      customerId: customerId,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
    };

    return jwt.sign(
      payload,
      process.env.JWT_REFRESH_SECRET || 'test-refresh-secret',
      { algorithm: 'HS256' }
    );
  }

  /**
   * Create an authenticated request with proper headers
   * @param {Object} app - Express app instance
   * @param {string} method - HTTP method (get, post, put, delete)
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Object} Authenticated request object
   */
  static createAuthenticatedRequest(app, method, endpoint, options = {}) {
    const customerId = options.customerId || this.getValidCustomerId();
    const token = this.generateTestToken(customerId);
    const apiKey = this.generateTestApiKey(customerId);
    
    let request = app[method.toLowerCase()](endpoint);
    
    // Add authentication headers based on options
    if (options.useToken) {
      request = request.set('Authorization', `Bearer ${token}`);
    }
    
    if (options.useApiKey) {
      request = request.set('X-API-Key', apiKey);
    }
    
    if (options.useCustomerToken) {
      request = request.set('X-Customer-Token', token);
    }
    
    // Add request body if provided
    if (options.body) {
      request = request.send(options.body);
    }
    
    // Add query parameters if provided
    if (options.query) {
      request = request.query(options.query);
    }
    
    // Add custom headers if provided
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        request = request.set(key, value);
      });
    }
    
    return request;
  }

  /**
   * Create a request with JWT token authentication
   * @param {Object} app - Express app instance
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Object} Authenticated request object
   */
  static createJWTRequest(app, method, endpoint, options = {}) {
    return this.createAuthenticatedRequest(app, method, endpoint, {
      ...options,
      useToken: true
    });
  }

  /**
   * Create a request with API key authentication
   * @param {Object} app - Express app instance
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Object} Authenticated request object
   */
  static createAPIKeyRequest(app, method, endpoint, options = {}) {
    return this.createAuthenticatedRequest(app, method, endpoint, {
      ...options,
      useApiKey: true
    });
  }

  /**
   * Create a request with customer token authentication
   * @param {Object} app - Express app instance
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Object} Authenticated request object
   */
  static createCustomerTokenRequest(app, method, endpoint, options = {}) {
    return this.createAuthenticatedRequest(app, method, endpoint, {
      ...options,
      useCustomerToken: true
    });
  }

  /**
   * Validate that a response has proper authentication structure
   * @param {Object} response - HTTP response object
   * @returns {boolean} True if response has proper auth structure
   */
  static validateAuthResponse(response) {
    return response.body && 
           response.body.success !== undefined && 
           response.body.data !== undefined;
  }

  /**
   * Extract customer ID from a JWT token
   * @param {string} token - JWT token
   * @returns {string|null} Customer ID or null if invalid
   */
  static extractCustomerIdFromToken(token) {
    try {
      const decoded = jwt.decode(token);
      return decoded ? decoded.customerId : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Create test data for authentication tests
   * @returns {Object} Test data object
   */
  static createTestData() {
    const customerId = this.getValidCustomerId();
    const token = this.generateTestToken(customerId);
    const refreshToken = this.generateTestRefreshToken(customerId);
    const apiKey = this.generateTestApiKey(customerId);

    return {
      customerId,
      token,
      refreshToken,
      apiKey,
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-API-Key': apiKey,
        'X-Customer-Token': token
      }
    };
  }

  /**
   * Create multiple test customers for testing
   * @param {number} count - Number of test customers to create
   * @returns {Array} Array of test customer data
   */
  static createMultipleTestCustomers(count = 3) {
    const customers = [];
    for (let i = 0; i < count; i++) {
      customers.push(this.createTestData());
    }
    return customers;
  }
}

export default TestAuthHelper;
