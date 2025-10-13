/**
 * Test User Fixtures
 * 
 * Centralized test user data with predefined Supabase UUIDs
 * for consistent testing across all test suites.
 */

export const TEST_USERS = {
  valid: {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'test1@example.com',
    name: 'Test User 1'
  },
  valid2: {
    id: '550e8400-e29b-41d4-a716-446655440002', 
    email: 'test2@example.com',
    name: 'Test User 2'
  },
  valid3: {
    id: '550e8400-e29b-41d4-a716-446655440003',
    email: 'test3@example.com',
    name: 'Test User 3'
  },
  invalid: {
    id: '550e8400-e29b-41d4-a716-446655440099',
    email: 'nonexistent@example.com'
  }
};

/**
 * Get a valid test user ID
 * @returns {string} Valid UUID for testing
 */
export const getValidTestUserId = () => TEST_USERS.valid.id;

/**
 * Get a second valid test user ID
 * @returns {string} Second valid UUID for testing
 */
export const getValidTestUserId2 = () => TEST_USERS.valid2.id;

/**
 * Get an invalid test user ID (for testing error cases)
 * @returns {string} Invalid UUID for testing
 */
export const getInvalidTestUserId = () => TEST_USERS.invalid.id;

/**
 * Get all test user IDs as an array
 * @returns {string[]} Array of all test user UUIDs
 */
export const getAllTestUserIds = () => [
  TEST_USERS.valid.id,
  TEST_USERS.valid2.id,
  TEST_USERS.valid3.id
];

/**
 * Check if a customer ID is a valid test user
 * @param {string} customerId - Customer ID to check
 * @returns {boolean} True if it's a valid test user ID
 */
export const isValidTestUserId = (customerId) => {
  return Object.values(TEST_USERS).some(user => user.id === customerId);
};

/**
 * Get test user data by ID
 * @param {string} customerId - Customer ID to look up
 * @returns {Object|null} Test user data or null if not found
 */
export const getTestUserById = (customerId) => {
  return Object.values(TEST_USERS).find(user => user.id === customerId) || null;
};
