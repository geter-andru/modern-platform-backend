/**
 * Product Extraction Worker
 *
 * Processes async product extraction jobs from the queue.
 * Automatically extracts product details from company website on user signup.
 *
 * @module workers/productExtractionWorker
 */

import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer';
import { SimpleWorker } from '../lib/simpleQueue.js';
import { getProductExtractionQueue } from '../lib/queue.js';
import { extractProductDetailsFromDomain } from '../services/productExtractionService.js';
import supabaseDataService from '../services/supabaseDataService.js';
import logger from '../utils/logger.js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Create browser automation wrapper using Puppeteer
 *
 * Launches a headless browser and provides methods to navigate, evaluate scripts,
 * take screenshots, and close the browser. Provides a consistent interface for
 * the product extraction service.
 *
 * @returns {Promise<Object>} Browser wrapper with navigate, evaluate, screenshot, close methods
 */
async function createMCPWrapper() {
  logger.info('[ProductExtractionWorker] Launching Puppeteer browser');

  // Launch headless browser
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });

  const page = await browser.newPage();

  // Set viewport and user agent
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  logger.info('[ProductExtractionWorker] Puppeteer browser launched successfully');

  return {
    async navigate(url) {
      logger.info('[ProductExtractionWorker] Navigating to:', url);

      try {
        await page.goto(url, {
          waitUntil: 'networkidle2',
          timeout: 30000 // 30 second timeout
        });
        logger.info('[ProductExtractionWorker] Navigation successful');
      } catch (error) {
        logger.error('[ProductExtractionWorker] Navigation failed:', error);
        throw error;
      }
    },

    async evaluate(script) {
      logger.info('[ProductExtractionWorker] Evaluating script in page context');

      try {
        const result = await page.evaluate(script);
        logger.info('[ProductExtractionWorker] Script evaluation successful');
        return result;
      } catch (error) {
        logger.error('[ProductExtractionWorker] Script evaluation failed:', error);
        throw error;
      }
    },

    async screenshot() {
      try {
        logger.info('[ProductExtractionWorker] Taking screenshot');
        const screenshot = await page.screenshot({
          fullPage: false,
          type: 'png'
        });
        logger.info('[ProductExtractionWorker] Screenshot captured');
        return screenshot;
      } catch (error) {
        logger.warn('[ProductExtractionWorker] Screenshot failed (optional):', error);
        return null; // Screenshot is optional, don't throw
      }
    },

    async close() {
      try {
        logger.info('[ProductExtractionWorker] Closing browser');
        await browser.close();
        logger.info('[ProductExtractionWorker] Browser closed successfully');
      } catch (error) {
        logger.warn('[ProductExtractionWorker] Browser close warning (non-fatal):', error);
        // Don't throw - close errors are non-fatal
      }
    }
  };
}

/**
 * Core product extraction logic
 *
 * @param {Object} jobData - Job data from queue
 * @param {string} jobData.customerId - User ID
 * @param {string} jobData.email - User email address
 * @param {string} jobData.domain - Company domain to extract from
 * @param {Object} job - Job instance for progress updates
 * @returns {Promise<Object>} Result with product details and metadata
 */
async function processProductExtraction(jobData, job = null) {
  const { customerId, email, domain } = jobData;

  logger.info('[ProductExtractionWorker] Processing product extraction job', {
    customerId,
    email,
    domain
  });

  try {
    // Initial progress: Job started
    if (job) {
      job.updateProgress(10);
      logger.info('[ProductExtractionWorker] Progress: 10% - Job started');
    }

    // Verify customer exists in database
    const customer = await supabaseDataService.getCustomerById(customerId);

    if (!customer) {
      logger.warn('[ProductExtractionWorker] Customer not found, skipping extraction', {
        customerId
      });
      // Return success with fallback (customer may be created later)
      return {
        success: true,
        data: {
          fallback: true,
          reason: 'Customer not found in database',
          customerId
        }
      };
    }

    if (job) {
      job.updateProgress(20);
      logger.info('[ProductExtractionWorker] Progress: 20% - Customer verified');
    }

    // Create browser automation wrapper
    let mcpWrapper = null;

    try {
      mcpWrapper = await createMCPWrapper();

      if (job) {
        job.updateProgress(30);
        logger.info('[ProductExtractionWorker] Progress: 30% - Starting extraction');
      }

      logger.info('[ProductExtractionWorker] Calling extraction service', {
        domain,
        url: `https://${domain}`
      });

      // Extract product details from website
      const productDetails = await extractProductDetailsFromDomain(domain, mcpWrapper);

      if (job) {
        job.updateProgress(80);
        logger.info('[ProductExtractionWorker] Progress: 80% - Extraction complete');
      }

      // Check if extraction succeeded or fell back
      if (productDetails.fallback) {
        logger.warn('[ProductExtractionWorker] Extraction failed, using fallback', {
          customerId,
          domain,
          error: productDetails.error || 'Unknown error'
        });

        // Don't save fallback data - let form remain empty
        if (job) {
          job.updateProgress(100);
          logger.info('[ProductExtractionWorker] Progress: 100% - Complete (fallback)');
        }

        return {
          success: true,
          data: {
            fallback: true,
            reason: productDetails.error || 'Extraction failed',
            customerId,
            domain
          }
        };
      }

      if (job) {
        job.updateProgress(90);
        logger.info('[ProductExtractionWorker] Progress: 90% - Saving to database');
      }

      // Save extracted product details to customer record
      await supabaseDataService.updateCustomer(customerId, {
        product_details: JSON.stringify(productDetails)
      });

      logger.info('[ProductExtractionWorker] Product details saved to customer record', {
        customerId,
        productName: productDetails.productName,
        sourceUrl: productDetails.sourceUrl
      });

      if (job) {
        job.updateProgress(100);
        logger.info('[ProductExtractionWorker] Progress: 100% - Complete');
      }

      logger.info('[ProductExtractionWorker] Product extraction completed successfully', {
        customerId,
        domain,
        productName: productDetails.productName,
        extractionTimeMs: productDetails.extractionTimeMs
      });

      return {
        success: true,
        data: {
          productDetails,
          customerId,
          domain,
          fallback: false
        }
      };
    } finally {
      // Always close browser, even if extraction failed
      if (mcpWrapper) {
        await mcpWrapper.close();
      }
    }
  } catch (error) {
    logger.error('[ProductExtractionWorker] Product extraction failed', {
      customerId,
      domain,
      error: error.message,
      stack: error.stack
    });

    // Don't throw - we want silent fallback
    // Return success with fallback flag
    return {
      success: true,
      data: {
        fallback: true,
        reason: error.message,
        customerId,
        domain
      }
    };
  }
}

/**
 * Job processor function for SimpleQueue/BullMQ
 *
 * @param {Object} job - Job object from queue
 * @returns {Promise<Object>} Processing result
 */
async function processJob(job) {
  const { id: jobId, data } = job;

  logger.info('[ProductExtractionWorker] Starting job', {
    jobId,
    customerId: data.customerId,
    domain: data.domain
  });

  try {
    // Pass job instance for progress tracking
    const result = await processProductExtraction(data, job);

    logger.info('[ProductExtractionWorker] Job completed', {
      jobId,
      success: result.success,
      fallback: result.data?.fallback
    });

    return result;
  } catch (error) {
    logger.error('[ProductExtractionWorker] Job failed', {
      jobId,
      error: error.message,
      stack: error.stack
    });

    // Return success with fallback instead of throwing
    // Silent failure - user just sees empty form
    return {
      success: true,
      data: {
        fallback: true,
        reason: error.message
      }
    };
  }
}

/**
 * Initialize and start the product extraction worker
 *
 * @returns {SimpleWorker} Worker instance
 */
export function startProductExtractionWorker() {
  logger.info('[ProductExtractionWorker] Initializing worker');

  const queue = getProductExtractionQueue();

  // Register processor with the queue
  queue.process(processJob);

  // Create worker instance for management
  const worker = new SimpleWorker('product-extraction', processJob);

  // Event listeners
  queue.on('completed', (job, result) => {
    logger.info('[ProductExtractionWorker] Job completed', {
      jobId: job.id,
      success: result.success,
      fallback: result.data?.fallback
    });
  });

  queue.on('failed', (job, error) => {
    logger.error('[ProductExtractionWorker] Job failed', {
      jobId: job.id,
      error: error.message,
      attemptsMade: job.attemptsMade
    });
  });

  worker.run();

  logger.info('[ProductExtractionWorker] Worker started and ready for jobs');

  return worker;
}

export default {
  startProductExtractionWorker,
  processProductExtraction,
};
