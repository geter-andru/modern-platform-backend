import { jest } from '@jest/globals';
import dotenv from 'dotenv';

// Load test environment variables FIRST
process.env.NODE_ENV = 'test';
dotenv.config({ path: '.env.test' });

// Set additional test environment variables
process.env.PORT = '3002';
process.env.AIRTABLE_API_KEY = 'test_api_key';
process.env.AIRTABLE_BASE_ID = 'test_base_id';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during testing

// Verify critical environment variables are set
if (!process.env.JWT_SECRET) {
  console.error('ERROR: JWT_SECRET not found in test environment!');
  process.exit(1);
}

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

// Mock Supabase data service - uses __mocks__ directory
// This MUST be called before any test imports the app/server
jest.mock('../src/services/supabaseDataService.js');

// Import the mock object so tests can configure it
// This works because jest.mock() above redirects imports to __mocks__ directory
import mockSupabaseDataService from '../src/services/__mocks__/supabaseDataService.js';

// Export for tests to use
export { mockSupabaseDataService };

// Legacy: Mock Airtable service for old tests that haven't been migrated yet
jest.unstable_mockModule('../src/services/airtableService.js', () => ({
  default: {
    testConnection: jest.fn().mockResolvedValue(true),
    getCustomerById: jest.fn(),
    updateCustomer: jest.fn(),
    createUserProgress: jest.fn(),
    getUserProgress: jest.fn(),
    getAllCustomers: jest.fn(),
  }
}));

export const mockAirtableService = {
  testConnection: jest.fn().mockResolvedValue(true),
  getCustomerById: jest.fn(),
  updateCustomer: jest.fn(),
  createUserProgress: jest.fn(),
  getUserProgress: jest.fn(),
  getAllCustomers: jest.fn(),
};