/**
 * Mock Supabase Authentication Middleware for Testing
 *
 * This mock accepts any Bearer token and creates a mock user
 * based on the customer ID in the request path.
 */

export const authenticateSupabaseJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Missing or invalid authorization header',
      details: 'Expected format: Authorization: Bearer <token>'
    });
  }

  // Extract customer ID from path (e.g., /api/customer/CUST_001)
  const pathParts = req.path.split('/');
  let customerIdFromPath = null;

  // Try to find customer ID in various path patterns
  const customerIndex = pathParts.indexOf('customer');
  if (customerIndex !== -1 && pathParts[customerIndex + 1]) {
    customerIdFromPath = pathParts[customerIndex + 1];
  }

  const customerId = customerIdFromPath || 'CUST_001';

  // Create mock user object
  req.user = {
    id: customerId,
    email: `test-${customerId}@example.com`,
    customerId: customerId,
    user_metadata: {
      customerId: customerId
    }
  };

  req.auth = {
    customerId: customerId,
    userId: customerId,
    email: `test-${customerId}@example.com`
  };

  next();
};

export default {
  authenticateSupabaseJWT
};
