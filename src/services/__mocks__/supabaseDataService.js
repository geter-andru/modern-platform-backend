/**
 * Mock Supabase Data Service for Testing
 *
 * This mock is automatically used by Jest when jest.mock('../services/supabaseDataService.js') is called.
 * Tests can import and configure this mock to control return values.
 *
 * Usage in tests:
 *   import { mockSupabaseDataService } from './setup.js';
 *   mockSupabaseDataService.getCustomerById.mockResolvedValue({ customerId: '123', ... });
 */

import { jest } from '@jest/globals';

// Create mock functions for all supabaseDataService methods
export const mockSupabaseDataService = {
  // Customer operations
  getCustomerById: jest.fn(),
  getCustomerByEmail: jest.fn(),
  getCustomerByStripeSubscriptionId: jest.fn(),
  updateCustomer: jest.fn(),
  getAllCustomers: jest.fn(),
  createCustomer: jest.fn(),
  deleteCustomer: jest.fn(),

  // Connection/health
  testConnection: jest.fn().mockResolvedValue(true),

  // User progress operations
  getUserProgress: jest.fn(),
  createUserProgress: jest.fn(),
  updateUserProgress: jest.fn(),
};

// Export as default for ES module default import compatibility
export default mockSupabaseDataService;
