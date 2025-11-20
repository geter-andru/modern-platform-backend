/**
 * Persona Generation Worker
 *
 * Processes async persona generation jobs from the queue.
 * Extracts core logic from aiPersonaController for background processing.
 *
 * @module workers/personaWorker
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { SimpleWorker } from '../lib/simpleQueue.js';
import { getPersonaQueue } from '../lib/queue.js';
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
 * Core persona generation logic (extracted from aiPersonaController)
 *
 * @param {Object} jobData - Job data from queue
 * @param {string} jobData.customerId - User ID
 * @param {string} jobData.companyContext - Company description
 * @param {string} jobData.industry - Industry/vertical
 * @param {string} jobData.targetMarket - Target market (optional)
 * @returns {Promise<Object>} Result with personas and metadata
 */
async function processPersonaGeneration(jobData) {
  const { customerId, companyContext, industry, targetMarket } = jobData;

  logger.info('[PersonaWorker] Processing job', {
    customerId,
    industry,
    hasTargetMarket: !!targetMarket
  });

  // ===== AI PROMPT CONSTRUCTION =====
  const prompt = `You are a B2B marketing and sales strategy expert specializing in creating detailed buyer personas.

TASK: Generate 3-5 comprehensive buyer personas for the following company.

COMPANY INFORMATION:
- Company Context: ${companyContext}
- Industry: ${industry}
- Target Market: ${targetMarket || 'Not specified - infer from context'}

PERSONA REQUIREMENTS:
For each persona, provide:

1. TITLE/ROLE
   - Specific job title (e.g., "VP of Sales Operations", "Director of IT Infrastructure")
   - Level in organization (C-Suite, VP, Director, Manager, Individual Contributor)

2. DEMOGRAPHICS
   - Company size (employee count range)
   - Company revenue range
   - Industry vertical (be specific)
   - Geographic region (if relevant)
   - Years of experience in role

3. PSYCHOGRAPHICS
   - Primary goals (3-5 specific, measurable goals)
   - Key challenges (3-5 pain points they face daily)
   - Motivations (what drives their decisions)
   - Fears (what keeps them up at night)
   - Values (what they prioritize in solutions)

4. BUYING BEHAVIOR
   - Decision criteria (what factors influence their choice)
   - Budget authority (None, Recommends, Approves, Controls)
   - Buying process involvement (Initiator, Influencer, Decision Maker, Purchaser, User)
   - Information sources (where they research solutions)
   - Preferred communication channels

OUTPUT FORMAT:
Return ONLY valid JSON (no markdown, no code blocks, no explanations).

{
  "personas": [
    {
      "title": "exact job title",
      "level": "C-Suite|VP|Director|Manager|IC",
      "demographics": {
        "companySize": "50-200 employees",
        "revenue": "$10M-$50M",
        "industryVertical": "SaaS",
        "region": "North America",
        "yearsExperience": "5-10 years"
      },
      "psychographics": {
        "goals": ["goal 1", "goal 2", "goal 3"],
        "challenges": ["challenge 1", "challenge 2", "challenge 3"],
        "motivations": ["motivation 1", "motivation 2"],
        "fears": ["fear 1", "fear 2"],
        "values": ["value 1", "value 2", "value 3"]
      },
      "buyingBehavior": {
        "decisionCriteria": ["criteria 1", "criteria 2", "criteria 3"],
        "budgetAuthority": "Approves",
        "buyingProcessRole": "Decision Maker",
        "informationSources": ["source 1", "source 2"],
        "preferredChannels": ["LinkedIn", "Industry events"]
      }
    }
  ]
}`;

  logger.info('[PersonaWorker] Calling Claude API');
  const startTime = Date.now();

  // ===== ANTHROPIC API CALL =====
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    temperature: 0.7,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  const apiDuration = Date.now() - startTime;
  logger.info(`[PersonaWorker] Claude API responded in ${apiDuration}ms`);

  // ===== EXTRACT TOKEN USAGE =====
  const usage = response.usage;
  const estimatedCost = calculateCost(
    usage.input_tokens,
    usage.output_tokens,
    'claude-3-5-sonnet-20241022'
  );

  // Record AI metric with token tracking
  recordAIMetric({
    operation: 'generatePersonas_worker',
    duration: apiDuration,
    success: true,
    customerId: jobData.userId,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    totalTokens: usage.input_tokens + usage.output_tokens,
    estimatedCost: estimatedCost,
    model: 'claude-3-5-sonnet-20241022'
  });

  // ===== PARSE AI RESPONSE =====
  const responseText = response.content[0].text;

  let parsedResponse;
  try {
    parsedResponse = JSON.parse(responseText);
  } catch (parseError) {
    logger.error('[PersonaWorker] JSON parse error', {
      error: parseError.message,
      responsePreview: responseText.substring(0, 200)
    });
    throw new Error(`AI returned invalid JSON: ${parseError.message}`);
  }

  // Validate response structure
  if (!parsedResponse.personas || !Array.isArray(parsedResponse.personas)) {
    logger.error('[PersonaWorker] Invalid response structure', {
      receivedKeys: Object.keys(parsedResponse)
    });
    throw new Error('AI response missing personas array');
  }

  const personas = parsedResponse.personas;

  // Validate persona count
  if (personas.length < 3 || personas.length > 5) {
    logger.warn(`[PersonaWorker] Unexpected persona count: ${personas.length}`);
  }

  logger.info(`[PersonaWorker] Generated ${personas.length} personas`);

  // ===== DATABASE SAVE =====
  const { data, error } = await supabase
    .from('buyer_personas')
    .insert({
      user_id: customerId,
      personas: personas,
      company_context: companyContext,
      industry: industry,
      target_market: targetMarket || null
    })
    .select()
    .single();

  if (error) {
    logger.error('[PersonaWorker] Database error', {
      error: error.message,
      code: error.code
    });
    throw new Error(`Failed to save personas: ${error.message}`);
  }

  logger.info('[PersonaWorker] Personas saved to database', {
    savedId: data.id,
    personaCount: personas.length
  });

  // ===== RETURN RESULT =====
  return {
    success: true,
    personas,
    savedId: data.id,
    metadata: {
      personaCount: personas.length,
      apiDuration,
      industry,
      targetMarket: targetMarket || null,
      createdAt: data.created_at
    }
  };
}

/**
 * Job processor function for SimpleQueue/BullMQ
 *
 * @param {Object} job - Job object from queue
 * @returns {Promise<Object>} Processing result
 */
async function processJob(job) {
  const { id: jobId, data } = job;

  logger.info('[PersonaWorker] Starting job', { jobId, customerId: data.customerId });

  try {
    const result = await processPersonaGeneration(data);
    logger.info('[PersonaWorker] Job completed successfully', { jobId });
    return result;
  } catch (error) {
    logger.error('[PersonaWorker] Job failed', {
      jobId,
      error: error.message,
      stack: error.stack
    });
    throw error; // Re-throw for queue retry handling
  }
}

/**
 * Initialize and start the persona worker
 *
 * @returns {SimpleWorker} Worker instance
 */
export function startPersonaWorker() {
  logger.info('[PersonaWorker] Initializing worker');

  const queue = getPersonaQueue();

  // Register processor with the queue
  queue.process(processJob);

  // Create worker instance for management
  const worker = new SimpleWorker('persona-generation', processJob);

  // Event listeners
  queue.on('completed', (job, result) => {
    logger.info('[PersonaWorker] Job completed', {
      jobId: job.id,
      personaCount: result.personas?.length
    });
  });

  queue.on('failed', (job, error) => {
    logger.error('[PersonaWorker] Job failed', {
      jobId: job.id,
      error: error.message,
      attemptsMade: job.attemptsMade
    });
  });

  worker.run();

  logger.info('[PersonaWorker] Worker started and ready for jobs');

  return worker;
}

export default {
  startPersonaWorker,
  processPersonaGeneration,
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

