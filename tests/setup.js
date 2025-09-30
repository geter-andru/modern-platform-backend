import { jest } from '@jest/globals';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3002';
process.env.AIRTABLE_API_KEY = 'test_api_key';
process.env.AIRTABLE_BASE_ID = 'test_base_id';
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

// Mock Airtable service for tests
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