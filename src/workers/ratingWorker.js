/**
 * Company Rating Worker
 *
 * Processes async company rating jobs from the queue.
 * Extracts core logic from aiRatingController for background processing.
 * Handles both single company rating and batch rating operations.
 *
 * @module workers/ratingWorker
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { SimpleWorker } from '../lib/simpleQueue.js';
import { getRatingQueue, getBatchRatingQueue } from '../lib/queue.js';
import logger from '../utils/logger.js';
import { recordAIMetric } from '../middleware/performanceMonitoring.js';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Helper: Get ICP framework for a user
 *
 * @param {string} userId - User ID
 * @param {string} icpFrameworkId - Optional specific framework ID
 * @returns {Promise<Object>} ICP framework
 */
async function getICPFramework(userId, icpFrameworkId = null) {
  if (icpFrameworkId) {
    // Use specific framework
    const { data: framework, error } = await supabase
      .from('icp_frameworks')
      .select('*')
      .eq('id', icpFrameworkId)
      .eq('user_id', userId)
      .single();

    if (error || !framework) {
      throw new Error(`ICP framework not found: ${icpFrameworkId}`);
    }

    return framework;
  }

  // Use most recent framework
  const { data: frameworks, error } = await supabase
    .from('icp_frameworks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !frameworks || frameworks.length === 0) {
    throw new Error('No ICP framework found for user. Please create one first.');
  }

  return frameworks[0];
}

/**
 * Helper: Get company research data (cached or minimal)
 *
 * @param {string} userId - User ID
 * @param {string} companyUrl - Company URL
 * @returns {Promise<Object>} Company data
 */
async function getCompanyData(userId, companyUrl) {
  const cleanUrl = companyUrl.trim().toLowerCase();

  // Check for cached company research (within 7 days)
  const { data: existingResearch } = await supabase
    .from('company_research')
    .select('*')
    .eq('user_id', userId)
    .eq('company_url', cleanUrl)
    .order('created_at', { ascending: false})
    .limit(1);

  if (existingResearch && existingResearch.length > 0) {
    const researchAge = Date.now() - new Date(existingResearch[0].created_at).getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    if (researchAge < sevenDays) {
      logger.info('[RatingWorker] Using cached company research', {
        companyName: existingResearch[0].company_name
      });
      return existingResearch[0].research_data || {};
    }
  }

  // Create minimal company context from URL
  const urlParts = cleanUrl.replace(/^https?:\/\//, '').split('/')[0].split('.');
  const companyName = urlParts[urlParts.length - 2] || urlParts[0];

  return {
    companyName: companyName.charAt(0).toUpperCase() + companyName.slice(1),
    companyUrl: cleanUrl,
    description: 'Company information not available - rating based on URL',
    dataQuality: 'minimal'
  };
}

/**
 * Core rating logic for a single company
 *
 * @param {string} userId - User ID
 * @param {string} companyUrl - Company URL
 * @param {string} icpFrameworkId - Optional ICP framework ID
 * @returns {Promise<Object>} Rating result
 */
async function rateSingleCompany(userId, companyUrl, icpFrameworkId = null) {
  logger.info('[RatingWorker] Rating company', { userId, companyUrl });

  // Get ICP framework
  const icpFramework = await getICPFramework(userId, icpFrameworkId);
  logger.info('[RatingWorker] ICP framework loaded', {
    frameworkId: icpFramework.id,
    productName: icpFramework.product_name
  });

  // Get company data
  const companyData = await getCompanyData(userId, companyUrl);

  // Construct AI rating prompt
  const prompt = `You are a B2B sales and marketing expert specializing in ICP (Ideal Customer Profile) fit analysis.

TASK: Rate how well this company fits the given ICP framework on a scale of 0-100.

ICP FRAMEWORK:
Product: ${icpFramework.product_name}
Description: ${icpFramework.product_description || 'Not provided'}
Value Proposition: ${icpFramework.value_proposition || 'Not provided'}

ICP Details:
${JSON.stringify(icpFramework.framework, null, 2)}

COMPANY TO RATE:
${JSON.stringify(companyData, null, 2)}

RATING CRITERIA:
Evaluate the company across these dimensions:
1. **Industry Fit (0-25 points)**: Does the company operate in the target industry/vertical?
2. **Company Size Fit (0-25 points)**: Does the company size (employees, revenue) match the ICP?
3. **Pain Point Alignment (0-25 points)**: Does the company likely experience the pain points we solve?
4. **Buyer Persona Match (0-25 points)**: Do they likely have the decision-makers we target?

OUTPUT FORMAT:
Return ONLY valid JSON (no markdown, no code blocks, no explanations):

{
  "score": <integer 0-100>,
  "fitLevel": "Excellent|Good|Fair|Poor",
  "reasoning": "<2-3 sentence summary>",
  "breakdown": {
    "industryFit": { "score": <0-25>, "explanation": "<1 sentence>" },
    "companySizeFit": { "score": <0-25>, "explanation": "<1 sentence>" },
    "painPointAlignment": { "score": <0-25>, "explanation": "<1 sentence>" },
    "buyerPersonaMatch": { "score": <0-25>, "explanation": "<1 sentence>" }
  },
  "strengths": ["<strength 1>", "<strength 2>"],
  "concerns": ["<concern 1>", "<concern 2>"],
  "recommendation": "<Should we pursue? Why?>"
}

SCORING GUIDE:
- 80-100: Excellent fit (top priority, high win probability)
- 60-79: Good fit (qualified lead, worth pursuing)
- 40-59: Fair fit (may require extra qualification)
- 0-39: Poor fit (deprioritize or disqualify)`;

  logger.info('[RatingWorker] Calling Claude API');
  const startTime = Date.now();

  // Call Claude API
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2048,
    temperature: 0.5, // Lower for consistent scoring
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  const apiDuration = Date.now() - startTime;
  logger.info(`[RatingWorker] Claude API responded in ${apiDuration}ms`);

  // ===== EXTRACT TOKEN USAGE =====
  const usage = response.usage;
  const estimatedCost = calculateCost(
    usage.input_tokens,
    usage.output_tokens,
    'claude-3-5-sonnet-20241022'
  );

  // Record AI metric with token tracking
  recordAIMetric({
    operation: 'rateCompany_worker',
    duration: apiDuration,
    success: true,
    customerId: jobData.userId,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    totalTokens: usage.input_tokens + usage.output_tokens,
    estimatedCost: estimatedCost,
    model: 'claude-3-5-sonnet-20241022'
  });

  // Parse AI response
  const responseText = response.content[0].text;

  let ratingResult;
  try {
    ratingResult = JSON.parse(responseText);
  } catch (parseError) {
    logger.error('[RatingWorker] JSON parse error', {
      error: parseError.message,
      responsePreview: responseText.substring(0, 200)
    });
    throw new Error(`AI returned invalid JSON: ${parseError.message}`);
  }

  // Validate score
  if (typeof ratingResult.score !== 'number' ||
      ratingResult.score < 0 ||
      ratingResult.score > 100) {
    throw new Error('AI returned invalid score (must be 0-100)');
  }

  logger.info('[RatingWorker] Rating generated', {
    score: ratingResult.score,
    fitLevel: ratingResult.fitLevel
  });

  // Save to database
  const { data, error } = await supabase
    .from('company_ratings')
    .insert({
      user_id: userId,
      company_url: companyUrl.trim().toLowerCase(),
      company_name: companyData.companyName || companyUrl,
      icp_framework_id: icpFramework.id,
      rating_score: ratingResult.score,
      fit_level: ratingResult.fitLevel,
      reasoning: ratingResult.reasoning,
      breakdown: ratingResult.breakdown,
      strengths: ratingResult.strengths || [],
      concerns: ratingResult.concerns || [],
      recommendation: ratingResult.recommendation,
      company_data: companyData
    })
    .select()
    .single();

  if (error) {
    logger.error('[RatingWorker] Database error', {
      error: error.message,
      code: error.code
    });
    throw new Error(`Failed to save rating: ${error.message}`);
  }

  logger.info('[RatingWorker] Rating saved to database', { savedId: data.id });

  return {
    success: true,
    rating: {
      score: ratingResult.score,
      fitLevel: ratingResult.fitLevel,
      reasoning: ratingResult.reasoning,
      breakdown: ratingResult.breakdown,
      strengths: ratingResult.strengths,
      concerns: ratingResult.concerns,
      recommendation: ratingResult.recommendation
    },
    savedId: data.id,
    metadata: {
      companyName: companyData.companyName || companyUrl,
      icpFramework: icpFramework.product_name,
      apiDuration,
      dataQuality: companyData.dataQuality || 'full'
    }
  };
}

/**
 * Process single company rating job
 *
 * @param {Object} job - Job object from queue
 * @returns {Promise<Object>} Rating result
 */
async function processSingleRating(job) {
  const { id: jobId, data } = job;
  const { customerId, companyUrl, icpFrameworkId } = data;

  logger.info('[RatingWorker] Processing single rating job', { jobId, companyUrl });

  try {
    const result = await rateSingleCompany(customerId, companyUrl, icpFrameworkId);
    logger.info('[RatingWorker] Single rating job completed', { jobId });
    return result;
  } catch (error) {
    logger.error('[RatingWorker] Single rating job failed', {
      jobId,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Process batch rating job (rate multiple companies)
 *
 * @param {Object} job - Job object from queue
 * @returns {Promise<Object>} Batch rating results
 */
async function processBatchRating(job) {
  const { id: jobId, data } = job;
  const { customerId, companies, icpFrameworkId } = data;

  logger.info('[RatingWorker] Processing batch rating job', {
    jobId,
    companyCount: companies.length
  });

  const results = [];
  const errors = [];

  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];

    try {
      logger.info(`[RatingWorker] Rating company ${i + 1}/${companies.length}`, {
        companyUrl: company.url || company
      });

      const companyUrl = typeof company === 'string' ? company : company.url;
      const result = await rateSingleCompany(customerId, companyUrl, icpFrameworkId);

      results.push({
        companyUrl,
        success: true,
        rating: result.rating,
        savedId: result.savedId
      });

      // Update job progress
      if (job.updateProgress) {
        job.updateProgress(Math.round(((i + 1) / companies.length) * 100));
      }
    } catch (error) {
      logger.error(`[RatingWorker] Failed to rate company ${i + 1}`, {
        error: error.message
      });

      errors.push({
        companyUrl: typeof company === 'string' ? company : company.url,
        success: false,
        error: error.message
      });
    }
  }

  logger.info('[RatingWorker] Batch rating job completed', {
    jobId,
    successful: results.length,
    failed: errors.length
  });

  return {
    success: true,
    batchResults: {
      total: companies.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors
    }
  };
}

/**
 * Initialize and start the rating worker (single ratings)
 *
 * @returns {SimpleWorker} Worker instance
 */
export function startRatingWorker() {
  logger.info('[RatingWorker] Initializing rating worker');

  const queue = getRatingQueue();
  queue.process(processSingleRating);

  const worker = new SimpleWorker('company-rating', processSingleRating);

  // Event listeners
  queue.on('completed', (job, result) => {
    logger.info('[RatingWorker] Job completed', {
      jobId: job.id,
      score: result.rating?.score
    });
  });

  queue.on('failed', (job, error) => {
    logger.error('[RatingWorker] Job failed', {
      jobId: job.id,
      error: error.message
    });
  });

  worker.run();

  logger.info('[RatingWorker] Rating worker started');

  return worker;
}

/**
 * Initialize and start the batch rating worker
 *
 * @returns {SimpleWorker} Worker instance
 */
export function startBatchRatingWorker() {
  logger.info('[BatchRatingWorker] Initializing batch rating worker');

  const queue = getBatchRatingQueue();
  queue.process(processBatchRating);

  const worker = new SimpleWorker('batch-rating', processBatchRating);

  // Event listeners
  queue.on('completed', (job, result) => {
    logger.info('[BatchRatingWorker] Batch job completed', {
      jobId: job.id,
      successful: result.batchResults?.successful,
      failed: result.batchResults?.failed
    });
  });

  queue.on('failed', (job, error) => {
    logger.error('[BatchRatingWorker] Batch job failed', {
      jobId: job.id,
      error: error.message
    });
  });

  worker.run();

  logger.info('[BatchRatingWorker] Batch rating worker started');

  return worker;
}

export default {
  startRatingWorker,
  startBatchRatingWorker,
  rateSingleCompany,
};

/**
 * Calculate cost in USD based on token usage
 * Model pricing per 1M tokens:
 * - Claude 3 Opus: $15 input / $75 output
 * - Claude 3.5 Sonnet: $3 input / $15 output
 * - Claude 3.5 Haiku: $0.25 input / $1.25 output
 */
function calculateCost(inputTokens, outputTokens, model) {
  const pricing = {
    'claude-3-opus-20240229': { input: 15, output: 75 },
    'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
    'claude-3-5-haiku-20241022': { input: 0.25, output: 1.25 }
  };

  const modelPricing = pricing[model];
  if (!modelPricing) {
    logger.warn(`Unknown model pricing: ${model}, using Sonnet as fallback`);
    return calculateCost(inputTokens, outputTokens, 'claude-3-5-sonnet-20241022');
  }

  const inputCost = (inputTokens / 1_000_000) * modelPricing.input;
  const outputCost = (outputTokens / 1_000_000) * modelPricing.output;

  return parseFloat((inputCost + outputCost).toFixed(6));
}
