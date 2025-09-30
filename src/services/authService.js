import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import config from '../config/index.js';
import airtableService from './airtableService.js';
import logger from '../utils/logger.js';

class AuthService {
  constructor() {
    this.jwtSecret = config.jwt.secret;
    this.jwtExpiresIn = config.jwt.expiresIn;
    this.refreshTokenExpiresIn = config.jwt.refreshExpiresIn;
    
    if (this.jwtSecret === 'default-secret-key-change-in-production') {
      logger.warn('Using default JWT secret. Change this in production!');
    }
  }

  /**
   * Generate JWT token for customer
   */
  generateToken(customerId, tokenType = 'access') {
    const payload = {
      customerId,
      tokenType,
      iat: Math.floor(Date.now() / 1000),
      jti: uuidv4() // JWT ID for token blacklisting if needed
    };

    const expiresIn = tokenType === 'refresh' ? this.refreshTokenExpiresIn : this.jwtExpiresIn;
    
    return jwt.sign(payload, this.jwtSecret, { 
      expiresIn,
      issuer: 'hs-platform-api',
      audience: 'hs-platform-customers'
    });
  }

  /**
   * Verify and decode JWT token
   */
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: 'hs-platform-api',
        audience: 'hs-platform-customers'
      });
      
      return {
        valid: true,
        decoded,
        customerId: decoded.customerId,
        tokenType: decoded.tokenType || 'access'
      };
    } catch (error) {
      logger.warn(`Token verification failed: ${error.message}`);
      return {
        valid: false,
        error: error.message,
        expired: error.name === 'TokenExpiredError'
      };
    }
  }

  /**
   * Generate customer access token (for customer-specific API access)
   */
  async generateCustomerAccessToken(customerId) {
    try {
      // Verify customer exists
      const customer = await airtableService.getCustomerById(customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      // Generate secure access token
      const accessToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = await bcrypt.hash(accessToken, 12);
      
      // Store hashed token in customer record
      await airtableService.updateCustomer(customerId, {
        'Access Token': hashedToken,
        'Token Generated At': new Date().toISOString(),
        'Token Last Used': new Date().toISOString()
      });

      logger.info(`Generated access token for customer ${customerId}`);
      
      return {
        accessToken,
        customerId,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
        permissions: ['read', 'write'] // Default permissions
      };
    } catch (error) {
      logger.error(`Failed to generate customer access token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate customer access token
   */
  async validateCustomerAccessToken(customerId, providedToken) {
    try {
      const customer = await airtableService.getCustomerById(customerId);
      if (!customer || !customer.accessToken) {
        return { valid: false, reason: 'No access token found for customer' };
      }

      const isValid = await bcrypt.compare(providedToken, customer.accessToken);
      
      if (isValid) {
        // Update last used timestamp
        await airtableService.updateCustomer(customerId, {
          'Token Last Used': new Date().toISOString()
        });

        logger.info(`Valid access token used for customer ${customerId}`);
        return { 
          valid: true, 
          customer: {
            customerId: customer.customerId,
            customerName: customer.customerName,
            company: customer.company,
            email: customer.email,
            contentStatus: customer.contentStatus
          }
        };
      } else {
        logger.warn(`Invalid access token attempt for customer ${customerId}`);
        return { valid: false, reason: 'Invalid access token' };
      }
    } catch (error) {
      logger.error(`Error validating customer access token: ${error.message}`);
      return { valid: false, reason: 'Token validation error' };
    }
  }

  /**
   * Revoke customer access token
   */
  async revokeCustomerAccessToken(customerId) {
    try {
      await airtableService.updateCustomer(customerId, {
        'Access Token': null,
        'Token Revoked At': new Date().toISOString()
      });

      logger.info(`Revoked access token for customer ${customerId}`);
      return { revoked: true };
    } catch (error) {
      logger.error(`Failed to revoke access token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(customerId) {
    return this.generateToken(customerId, 'refresh');
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken) {
    try {
      const verification = this.verifyToken(refreshToken);
      
      if (!verification.valid) {
        throw new Error('Invalid refresh token');
      }

      if (verification.decoded.tokenType !== 'refresh') {
        throw new Error('Token is not a refresh token');
      }

      // Generate new access token
      const newAccessToken = this.generateToken(verification.customerId, 'access');
      
      logger.info(`Refreshed access token for customer ${verification.customerId}`);
      
      return {
        accessToken: newAccessToken,
        customerId: verification.customerId
      };
    } catch (error) {
      logger.error(`Failed to refresh access token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get customer permissions
   */
  async getCustomerPermissions(customerId) {
    try {
      const customer = await airtableService.getCustomerById(customerId);
      
      if (!customer) {
        return { permissions: [] };
      }

      // Default permissions for all customers
      const basePermissions = ['read', 'write'];
      
      // Add conditional permissions based on customer status
      const permissions = [...basePermissions];
      
      if (customer.contentStatus === 'Ready') {
        permissions.push('export');
      }
      
      if (customer.paymentStatus === 'Completed') {
        permissions.push('premium');
      }

      return { permissions };
    } catch (error) {
      logger.error(`Failed to get customer permissions: ${error.message}`);
      return { permissions: ['read'] }; // Minimal fallback
    }
  }

  /**
   * Check if customer has specific permission
   */
  async hasPermission(customerId, requiredPermission) {
    const { permissions } = await this.getCustomerPermissions(customerId);
    return permissions.includes(requiredPermission);
  }

  /**
   * Generate API key for external integrations
   */
  generateApiKey(customerId) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(16).toString('hex');
    const payload = `${customerId}:${timestamp}:${random}`;
    const signature = crypto.createHmac('sha256', this.jwtSecret).update(payload).digest('hex');
    
    return `hsp_${Buffer.from(payload).toString('base64')}.${signature}`;
  }

  /**
   * Validate API key
   */
  validateApiKey(apiKey) {
    try {
      if (!apiKey.startsWith('hsp_')) {
        return { valid: false, reason: 'Invalid API key format' };
      }

      const [encodedPayload, signature] = apiKey.slice(4).split('.');
      const payload = Buffer.from(encodedPayload, 'base64').toString();
      const [customerId, timestamp] = payload.split(':');

      // Verify signature
      const expectedSignature = crypto.createHmac('sha256', this.jwtSecret).update(payload).digest('hex');
      
      if (signature !== expectedSignature) {
        return { valid: false, reason: 'Invalid signature' };
      }

      // Check if key is not too old (optional: 1 year max age)
      const keyAge = Date.now() - parseInt(timestamp);
      const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year
      
      if (keyAge > maxAge) {
        return { valid: false, reason: 'API key expired' };
      }

      return { 
        valid: true, 
        customerId,
        generatedAt: new Date(parseInt(timestamp)).toISOString()
      };
    } catch (error) {
      logger.warn(`API key validation failed: ${error.message}`);
      return { valid: false, reason: 'Malformed API key' };
    }
  }
}

// Export singleton instance
export default new AuthService();