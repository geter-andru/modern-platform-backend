import { jest } from '@jest/globals';
import { TEST_USERS, getValidTestUserId, getValidTestUserId2, getInvalidTestUserId, isValidTestUserId, getTestUserById } from './fixtures/testUsers.js';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3002';

// Supabase test credentials (required for backend config validation)
process.env.SUPABASE_URL = 'https://test-project.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-service-role-key';

// Backend API Key for test requests
process.env.BACKEND_API_KEY = 'test-api-key-12345';


// JWT secret for token generation/validation in tests
process.env.JWT_SECRET = 'test-jwt-secret-key';

process.env.LOG_LEVEL = 'error'; // Reduce log noise during testing

// Mock console.log and console.error during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

// Global test timeout
jest.setTimeout(30000);

// Mock Supabase Data service for tests with UUID fixture support
jest.unstable_mockModule('../src/services/supabaseDataService.js', () => ({
  default: {
    getCustomerById: jest.fn().mockImplementation((customerId) => {
      // Return mock customer for known test user IDs
      const testUser = Object.values(TEST_USERS).find(u => u.id === customerId);
      if (testUser && customerId !== TEST_USERS.invalid.id) {
        return {
          customerId: testUser.id,
          email: testUser.email,
          customerName: testUser.name,
          company: `Test Company`,
          emailConfirmed: true,
          status: 'active',
          createdAt: new Date().toISOString(),
          lastSignIn: new Date().toISOString()
        };
      }
      return null;
    }),
    updateCustomer: jest.fn().mockResolvedValue({}),
    upsertCustomer: jest.fn().mockResolvedValue({}),
    getAllCustomers: jest.fn().mockResolvedValue([]),
    createUserProgress: jest.fn().mockResolvedValue({}),
    updateUserProgress: jest.fn().mockResolvedValue({}),
    getUserProgress: jest.fn().mockResolvedValue({}),
  }
}));

export const mockSupabaseDataService = {
  getCustomerById: jest.fn().mockImplementation((customerId) => {
    // Return mock customer for known test user IDs
    const testUser = Object.values(TEST_USERS).find(u => u.id === customerId);
    if (testUser && customerId !== TEST_USERS.invalid.id) {
      return {
        customerId: testUser.id,
        email: testUser.email,
        customerName: testUser.name,
        company: `Test Company`,
        emailConfirmed: true,
        status: 'active',
        createdAt: new Date().toISOString(),
        lastSignIn: new Date().toISOString()
      };
    }
    return null;
  }),
  updateCustomer: jest.fn().mockResolvedValue({}),
  upsertCustomer: jest.fn().mockResolvedValue({}),
  getAllCustomers: jest.fn().mockResolvedValue([]),
  createUserProgress: jest.fn().mockResolvedValue({}),
  updateUserProgress: jest.fn().mockResolvedValue({}),
  getUserProgress: jest.fn().mockResolvedValue({}),
};