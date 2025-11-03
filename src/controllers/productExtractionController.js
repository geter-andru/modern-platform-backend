/**
 * Product Extraction Controller
 *
 * Handles product extraction job submission and status checking.
 * Automatically extracts product details from company website domain.
 *
 * @module controllers/productExtractionController
 */

import { addProductExtractionJob, getJobStatus, getProductExtractionQueue } from '../lib/queue.js';
import { isFreeEmailDomain, extractDomainFromEmail } from '../lib/freeEmailDomains.js';
import supabaseDataService from '../services/supabaseDataService.js';
import logger from '../utils/logger.js';

const productExtractionController = {
  /**
   * Trigger product extraction for a user
   * POST /api/product-extraction/trigger
   *
   * Request body:
   * {
   *   "customerId": "customer-id",
   *   "email": "user@company.com"
   * }
   */
  async triggerExtraction(req, res) {
    try {
      const { customerId, email } = req.body;

      // Validate required fields
      if (!customerId || !email) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: customerId, email',
          timestamp: new Date().toISOString()
        });
      }

      logger.info('[ProductExtractionController] Trigger request received', {
        customerId,
        email
      });

      // Extract domain from email
      const domain = extractDomainFromEmail(email);

      // Check if free email domain (skip extraction)
      if (!domain) {
        logger.info('[ProductExtractionController] Free email domain detected, skipping extraction', {
          customerId,
          email
        });

        return res.status(200).json({
          success: true,
          message: 'Free email domain detected, extraction skipped',
          data: {
            customerId,
            email,
            domain: null,
            freeEmail: true,
            jobQueued: false
          },
          timestamp: new Date().toISOString()
        });
      }

      logger.info('[ProductExtractionController] Business domain detected, queueing extraction job', {
        customerId,
        email,
        domain
      });

      // Queue product extraction job
      const job = await addProductExtractionJob({
        customerId,
        email,
        domain
      });

      logger.info('[ProductExtractionController] Product extraction job queued', {
        jobId: job.jobId,
        customerId,
        domain
      });

      return res.status(202).json({
        success: true,
        message: 'Product extraction job queued successfully',
        data: {
          jobId: job.jobId,
          queueName: job.queueName,
          status: job.status,
          customerId,
          email,
          domain,
          freeEmail: false,
          jobQueued: true
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('[ProductExtractionController] Error triggering extraction', {
        error: error.message,
        stack: error.stack
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to trigger product extraction',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  },

  /**
   * Get product extraction job status
   * GET /api/product-extraction/status/:jobId
   */
  async getExtractionStatus(req, res) {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameter: jobId',
          timestamp: new Date().toISOString()
        });
      }

      logger.info('[ProductExtractionController] Status request received', { jobId });

      const queue = getProductExtractionQueue();
      const jobStatus = await getJobStatus(queue, jobId);

      if (!jobStatus) {
        return res.status(404).json({
          success: false,
          error: 'Job not found',
          jobId,
          timestamp: new Date().toISOString()
        });
      }

      logger.info('[ProductExtractionController] Job status retrieved', {
        jobId,
        status: jobStatus.status,
        progress: jobStatus.progress
      });

      return res.status(200).json({
        success: true,
        data: jobStatus,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('[ProductExtractionController] Error getting status', {
        error: error.message,
        stack: error.stack
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to get job status',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  },

  /**
   * Get product details for a customer
   * GET /api/product-extraction/:customerId
   */
  async getProductDetails(req, res) {
    try {
      const { customerId } = req.params;

      if (!customerId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameter: customerId',
          timestamp: new Date().toISOString()
        });
      }

      logger.info('[ProductExtractionController] Get product details request', { customerId });

      // Get customer record
      const customer = await supabaseDataService.getCustomerById(customerId);

      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found',
          customerId,
          timestamp: new Date().toISOString()
        });
      }

      // Parse product_details from JSON string
      let productDetails = null;
      if (customer.product_details) {
        try {
          productDetails = typeof customer.product_details === 'string'
            ? JSON.parse(customer.product_details)
            : customer.product_details;
        } catch (parseError) {
          logger.warn('[ProductExtractionController] Failed to parse product_details', {
            customerId,
            error: parseError.message
          });
        }
      }

      logger.info('[ProductExtractionController] Product details retrieved', {
        customerId,
        hasProductDetails: !!productDetails,
        isFallback: productDetails?.fallback
      });

      return res.status(200).json({
        success: true,
        data: {
          customerId,
          productDetails: productDetails || null,
          extracted: !!productDetails && !productDetails.fallback
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('[ProductExtractionController] Error getting product details', {
        error: error.message,
        stack: error.stack
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to get product details',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
};

export default productExtractionController;
