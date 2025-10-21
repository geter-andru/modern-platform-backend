import authService from '../../src/services/authService.js';

/**
 * Test Helper: Generate Authentication Tokens
 *
 * Provides utilities for generating valid JWT tokens for testing
 * protected endpoints without requiring actual authentication flows.
 */

/**
 * Generate a valid access token for testing
 * @param {string} customerId - Customer ID to generate token for
 * @returns {string} Valid JWT access token
 */
export function generateTestAccessToken(customerId = '550e8400-e29b-41d4-a716-446655440001') {
  return authService.generateToken(customerId, 'access');
}

/**
 * Generate a valid refresh token for testing
 * @param {string} customerId - Customer ID to generate token for
 * @returns {string} Valid JWT refresh token
 */
export function generateTestRefreshToken(customerId = '550e8400-e29b-41d4-a716-446655440001') {
  return authService.generateToken(customerId, 'refresh');
}

/**
 * Generate both access and refresh tokens for testing
 * @param {string} customerId - Customer ID to generate tokens for
 * @returns {Object} Object containing accessToken and refreshToken
 */
export function generateTestTokenPair(customerId = '550e8400-e29b-41d4-a716-446655440001') {
  return {
    accessToken: generateTestAccessToken(customerId),
    refreshToken: generateTestRefreshToken(customerId)
  };
}

/**
 * Get authorization header with Bearer token for supertest requests
 * @param {string} customerId - Customer ID to generate token for
 * @returns {Object} Object with Authorization header
 */
export function getAuthHeader(customerId = '550e8400-e29b-41d4-a716-446655440001') {
  const token = generateTestAccessToken(customerId);
  return {
    'Authorization': `Bearer ${token}`
  };
}

/**
 * Helper to add auth headers to a supertest request
 * Usage: request(app).get('/api/endpoint').set(withAuth('CUST_001'))
 * @param {string} customerId - Customer ID to generate token for
 * @returns {Object} Headers object for supertest .set()
 */
export function withAuth(customerId = '550e8400-e29b-41d4-a716-446655440001') {
  return getAuthHeader(customerId);
}

/**
 * Generate an expired token for testing token expiration handling
 * @param {string} customerId - Customer ID to generate token for
 * @returns {string} Expired JWT token
 */
export function generateExpiredToken(customerId = '550e8400-e29b-41d4-a716-446655440001') {
  // Generate a token with -1 hour expiry (already expired)
  const jwt = require('jsonwebtoken');
  const config = require('../../src/config/index.js').default;

  return jwt.sign(
    {
      customerId,
      tokenType: 'access'
    },
    config.jwt.secret,
    { expiresIn: '-1h' } // Negative expiry creates expired token
  );
}

/**
 * Generate an invalid token (wrong signature) for testing error handling
 * @returns {string} Invalid JWT token
 */
export function generateInvalidToken() {
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
}

export default {
  generateTestAccessToken,
  generateTestRefreshToken,
  generateTestTokenPair,
  getAuthHeader,
  withAuth,
  generateExpiredToken,
  generateInvalidToken
};
