import authService from '../services/authService.js';
import airtableService from '../services/airtableService.js';
import logger from '../utils/logger.js';

const authController = {
  /**
   * Generate JWT token for customer
   */
  async generateToken(req, res) {
    try {
      const { customerId } = req.body;

      if (!customerId) {
        return res.status(400).json({
          success: false,
          error: 'Customer ID required'
        });
      }

      // Verify customer exists
      const customer = await airtableService.getCustomerById(customerId);
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
      }

      // Generate tokens
      const accessToken = authService.generateToken(customerId, 'access');
      const refreshToken = authService.generateRefreshToken(customerId);

      logger.info(`Generated JWT tokens for customer ${customerId}`);

      res.status(200).json({
        success: true,
        data: {
          accessToken,
          refreshToken,
          tokenType: 'Bearer',
          expiresIn: '24h',
          customer: {
            customerId: customer.customerId,
            customerName: customer.customerName,
            company: customer.company
          }
        }
      });
    } catch (error) {
      logger.error(`Error generating JWT token: ${error.message}`);
      throw error;
    }
  },

  /**
   * Refresh JWT token
   */
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: 'Refresh token required'
        });
      }

      const result = await authService.refreshAccessToken(refreshToken);

      res.status(200).json({
        success: true,
        data: {
          accessToken: result.accessToken,
          tokenType: 'Bearer',
          expiresIn: '24h',
          customerId: result.customerId
        }
      });
    } catch (error) {
      logger.error(`Error refreshing token: ${error.message}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
        details: error.message
      });
    }
  },

  /**
   * Verify JWT token
   */
  async verifyToken(req, res) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(400).json({
          success: false,
          error: 'Authorization header required'
        });
      }

      const token = authHeader.substring(7);
      const verification = authService.verifyToken(token);

      if (!verification.valid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid token',
          details: verification.error,
          expired: verification.expired
        });
      }

      // Get customer permissions
      const permissions = await authService.getCustomerPermissions(verification.customerId);

      res.status(200).json({
        success: true,
        data: {
          valid: true,
          customerId: verification.customerId,
          tokenType: verification.tokenType,
          issuedAt: new Date(verification.decoded.iat * 1000).toISOString(),
          expiresAt: new Date(verification.decoded.exp * 1000).toISOString(),
          permissions: permissions.permissions
        }
      });
    } catch (error) {
      logger.error(`Error verifying token: ${error.message}`);
      throw error;
    }
  },

  /**
   * Generate customer access token
   */
  async generateCustomerToken(req, res) {
    try {
      const { customerId } = req.body;

      if (!customerId) {
        return res.status(400).json({
          success: false,
          error: 'Customer ID required'
        });
      }

      const result = await authService.generateCustomerAccessToken(customerId);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error.message === 'Customer not found') {
        return res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
      }

      logger.error(`Error generating customer token: ${error.message}`);
      throw error;
    }
  },

  /**
   * Revoke customer access token
   */
  async revokeCustomerToken(req, res) {
    try {
      const { customerId } = req.params;

      if (!customerId) {
        return res.status(400).json({
          success: false,
          error: 'Customer ID required'
        });
      }

      const result = await authService.revokeCustomerAccessToken(customerId);

      res.status(200).json({
        success: true,
        data: {
          customerId,
          revoked: result.revoked,
          revokedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error(`Error revoking customer token: ${error.message}`);
      throw error;
    }
  },

  /**
   * Generate API key
   */
  async generateApiKey(req, res) {
    try {
      const { customerId } = req.body;

      if (!customerId) {
        return res.status(400).json({
          success: false,
          error: 'Customer ID required'
        });
      }

      // Verify customer exists
      const customer = await airtableService.getCustomerById(customerId);
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
      }

      const apiKey = authService.generateApiKey(customerId);

      logger.info(`Generated API key for customer ${customerId}`);

      res.status(200).json({
        success: true,
        data: {
          apiKey,
          customerId,
          generatedAt: new Date().toISOString(),
          usage: 'Include in X-API-Key header or apiKey query parameter'
        }
      });
    } catch (error) {
      logger.error(`Error generating API key: ${error.message}`);
      throw error;
    }
  },

  /**
   * Get customer permissions
   */
  async getPermissions(req, res) {
    try {
      const customerId = req.auth?.customerId || req.params.customerId;

      if (!customerId) {
        return res.status(400).json({
          success: false,
          error: 'Customer ID required'
        });
      }

      const permissions = await authService.getCustomerPermissions(customerId);

      res.status(200).json({
        success: true,
        data: {
          customerId,
          permissions: permissions.permissions,
          retrievedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error(`Error getting permissions: ${error.message}`);
      throw error;
    }
  },

  /**
   * Validate authentication method
   */
  async validateAuth(req, res) {
    try {
      if (!req.auth) {
        return res.status(401).json({
          success: false,
          error: 'No authentication provided'
        });
      }

      const { customerId, method, decoded } = req.auth;
      
      // Get customer data for validation
      const customer = await airtableService.getCustomerById(customerId);
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
      }

      // Get permissions
      const permissions = await authService.getCustomerPermissions(customerId);

      res.status(200).json({
        success: true,
        data: {
          authenticated: true,
          method: method || 'jwt',
          customerId,
          customer: {
            customerId: customer.customerId,
            customerName: customer.customerName,
            company: customer.company,
            contentStatus: customer.contentStatus
          },
          permissions: permissions.permissions,
          validatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error(`Error validating auth: ${error.message}`);
      throw error;
    }
  },

  /**
   * Authentication status endpoint (health check for auth)
   */
  async authStatus(req, res) {
    try {
      res.status(200).json({
        success: true,
        data: {
          authService: 'operational',
          supportedMethods: ['JWT', 'Customer Token', 'API Key'],
          endpoints: {
            generateToken: 'POST /api/auth/token',
            refreshToken: 'POST /api/auth/refresh',
            verifyToken: 'GET /api/auth/verify',
            generateCustomerToken: 'POST /api/auth/customer-token',
            revokeCustomerToken: 'DELETE /api/auth/customer-token/:customerId',
            generateApiKey: 'POST /api/auth/api-key',
            permissions: 'GET /api/auth/permissions',
            validate: 'GET /api/auth/validate'
          },
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error(`Error getting auth status: ${error.message}`);
      throw error;
    }
  }
};

export default authController;