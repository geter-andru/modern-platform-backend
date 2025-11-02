/**
 * ICP Generation Worker
 *
 * Processes async ICP generation jobs from the queue.
 * Extracts core logic from customerController for background processing.
 *
 * @module workers/icpWorker
 */

import { createClient } from '@supabase/supabase-js';
import { SimpleWorker } from '../lib/simpleQueue.js';
import { getICPQueue } from '../lib/queue.js';
import aiService from '../services/aiService.js';
import supabaseDataService from '../services/supabaseDataService.js';
import logger from '../utils/logger.js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Core ICP generation logic (extracted from customerController)
 *
 * @param {Object} jobData - Job data from queue
 * @param {string} jobData.customerId - User ID
 * @param {Object} jobData.productInfo - Product information
 * @param {string} [jobData.industry] - Industry (optional)
 * @param {Array<string>} [jobData.goals] - Business goals (optional)
 * @param {Object} job - Job instance for progress updates
 * @returns {Promise<Object>} Result with ICP data and metadata
 */
async function processICPGeneration(jobData, job = null) {
  const { customerId, productInfo, industry, goals } = jobData;

  logger.info('[ICPWorker] Processing ICP generation job', {
    customerId,
    hasProductInfo: !!productInfo,
    industry: industry || 'not specified'
  });

  try {
    // Initial progress: Job started
    if (job) {
      job.updateProgress(10);
      logger.info('[ICPWorker] Progress: 10% - Job started');
    }

    // Get customer data from database
    const customer = await supabaseDataService.getCustomerById(customerId);

    if (!customer) {
      throw new Error(`Customer not found: ${customerId}`);
    }

    if (job) {
      job.updateProgress(20);
      logger.info('[ICPWorker] Progress: 20% - Customer data retrieved');
    }

    // Build business context from job data
    const businessContext = {
      industry: industry || customer.industry || 'Technology',
      goals: goals || ['increase revenue', 'improve operations'],
      productInfo: productInfo || null
    };

    logger.info('[ICPWorker] Calling AI service for streaming ICP generation');

    // Generate ICP using AI with streaming
    const aiResult = await aiService.generateICPAnalysisStreaming(
      customer,
      businessContext,
      (progress, stage) => {
        // Map AI progress (0-100) to job progress (20-90)
        const jobProgress = 20 + Math.round(progress * 0.7);
        if (job) {
          job.updateProgress(jobProgress);
          logger.info(`[ICPWorker] Progress: ${jobProgress}% - ${stage}`);
        }
      }
    );

    if (!aiResult.success) {
      logger.error('[ICPWorker] AI generation failed', {
        error: aiResult.error,
        fallback: aiResult.fallback
      });
      throw new Error(`Failed to generate ICP analysis: ${aiResult.error || 'Unknown error'}`);
    }

    if (job) {
      job.updateProgress(92);
      logger.info('[ICPWorker] Progress: 92% - Saving to database');
    }

    // Save the generated ICP to customer record
    const icpContent = {
      ...aiResult.data,
      generatedAt: aiResult.metadata.generatedAt,
      confidence: aiResult.metadata.confidence,
      source: 'ai_generated'
    };

    await supabaseDataService.updateCustomer(customerId, {
      icp_content: JSON.stringify(icpContent),
      content_status: 'Ready',
      last_accessed: new Date().toISOString()
    });

    logger.info('[ICPWorker] ICP content saved to customer record');

    if (job) {
      job.updateProgress(95);
      logger.info('[ICPWorker] Progress: 95% - Saving product details');
    }

    // Save product details to product_details table if provided
    let productSaved = false;
    if (productInfo && (productInfo.name || productInfo.description)) {
      try {
        await supabaseDataService.upsertProductDetails(customerId, {
          productName: productInfo.name || 'Unnamed Product',
          productDescription: productInfo.description || '',
          distinguishingFeature: productInfo.distinguishingFeature || '',
          businessModel: productInfo.businessModel || '',
          industry: industry || 'Technology',
          targetMarket: aiResult.data?.segments?.[0]?.criteria || null,
          valueProposition: aiResult.data?.keyIndicators?.[0] || null,
          isPrimary: true
        });
        productSaved = true;
        logger.info('[ICPWorker] Product details saved', {
          productName: productInfo.name
        });
      } catch (productError) {
        logger.error('[ICPWorker] Failed to save product details', {
          error: productError.message
        });
        // Don't fail the entire ICP generation if product save fails
      }
    }

    if (job) {
      job.updateProgress(100);
      logger.info('[ICPWorker] Progress: 100% - Complete');
    }

    logger.info('[ICPWorker] ICP generation completed successfully', {
      customerId,
      productSaved,
      hasICPSegments: !!(aiResult.data?.segments?.length),
      hasKeyIndicators: !!(aiResult.data?.keyIndicators?.length)
    });

    return {
      success: true,
      data: {
        icpContent,
        productSaved,
        metadata: {
          generatedAt: aiResult.metadata.generatedAt,
          confidence: aiResult.metadata.confidence,
          source: 'ai_generated',
          streaming: true
        }
      }
    };
  } catch (error) {
    logger.error('[ICPWorker] ICP generation failed', {
      customerId,
      error: error.message,
      stack: error.stack
    });
    throw error; // Re-throw for queue retry handling
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

  logger.info('[ICPWorker] Starting job', { jobId, customerId: data.customerId });

  try {
    // Pass job instance for progress tracking
    const result = await processICPGeneration(data, job);
    logger.info('[ICPWorker] Job completed successfully', { jobId });
    return result;
  } catch (error) {
    logger.error('[ICPWorker] Job failed', {
      jobId,
      error: error.message,
      stack: error.stack
    });
    throw error; // Re-throw for queue retry handling
  }
}

/**
 * Initialize and start the ICP worker
 *
 * @returns {SimpleWorker} Worker instance
 */
export function startICPWorker() {
  logger.info('[ICPWorker] Initializing worker');

  const queue = getICPQueue();

  // Register processor with the queue
  queue.process(processJob);

  // Create worker instance for management
  const worker = new SimpleWorker('icp-generation', processJob);

  // Event listeners
  queue.on('completed', (job, result) => {
    logger.info('[ICPWorker] Job completed', {
      jobId: job.id,
      success: result.success
    });
  });

  queue.on('failed', (job, error) => {
    logger.error('[ICPWorker] Job failed', {
      jobId: job.id,
      error: error.message,
      attemptsMade: job.attemptsMade
    });
  });

  worker.run();

  logger.info('[ICPWorker] Worker started and ready for jobs');

  return worker;
}

export default {
  startICPWorker,
  processICPGeneration,
};
