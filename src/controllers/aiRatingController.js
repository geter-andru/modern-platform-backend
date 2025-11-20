/**
 * AI Rating Controller
 * Rates companies against ICP frameworks using Anthropic Claude AI
 * Integrates with company research for comprehensive analysis
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import supabaseDataService from '../services/supabaseDataService.js';
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
 * Rate a company against an ICP framework
 * POST /api/ai/rate-company
 *
 * Request body:
 * {
 *   companyUrl: string (required) - Company website URL or name
 *   icpFrameworkId: uuid (optional) - Specific ICP framework to use
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   rating: object - { score, reasoning, breakdown }
 *   savedId: uuid - Database record ID
 *   metadata: object - Rating metadata
 * }
 */
export const rateCompany = async (req, res, next) => {
  try {
    // ===== INPUT VALIDATION =====
    const { companyUrl, icpFrameworkId } = req.body;
    const userId = req.user?.id;

    logger.info('[AI Rating] Rating request', { userId, companyUrl });

    // Validate authentication
    if (!userId) {
      logger.warn('[AI Rating] Unauthenticated request');
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate required fields
    if (!companyUrl) {
      logger.warn('[AI Rating] Missing company URL');
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        details: {
          companyUrl: 'Required'
        }
      });
    }

    // Validate URL format (basic check)
    const urlPattern = /^(https?:\/\/)?([\w\-]+\.)+[\w\-]+(\/.*)?$/i;
    if (!urlPattern.test(companyUrl.trim())) {
      logger.warn('[AI Rating] Invalid URL format', { companyUrl });
      return res.status(400).json({
        success: false,
        error: 'Invalid company URL format',
        details: 'Please provide a valid website URL or company name'
      });
    }

    const cleanCompanyUrl = companyUrl.trim();

    // ===== STEP 1: GET ICP FRAMEWORK =====
    logger.info('[AI Rating] Fetching ICP framework via supabaseDataService');

    // Use same service layer as Agent 1's getCustomerICP (customerController.js:46)
    // Service transforms snake_case DB fields to camelCase
    const customer = await supabaseDataService.getCustomerById(userId);

    // DEBUG: Log what we actually got back
    logger.info('[AI Rating] Customer data received', {
      userId,
      customerExists: !!customer,
      hasIcpContent: customer ? !!customer.icpContent : false,
      customerKeys: customer ? Object.keys(customer) : []
    });

    if (!customer) {
      logger.error('[AI Rating] Customer not found', { userId });
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }

    // Access camelCase field (transformed by service layer)
    if (!customer.icpContent) {
      logger.error('[AI Rating] No ICP data found for customer', {
        userId,
        availableFields: Object.keys(customer).filter(k => k.includes('icp') || k.includes('content'))
      });
      return res.status(404).json({
        success: false,
        error: 'No ICP framework found',
        details: 'Please generate an ICP analysis first before rating companies'
      });
    }

    // Parse ICP content - exact same pattern as customerController.js:58-63
    let icpData;
    try {
      // Supabase stores JSON directly, but handle string case for migration
      icpData = typeof customer.icpContent === 'string'
        ? JSON.parse(customer.icpContent)
        : customer.icpContent;
    } catch (parseError) {
      logger.warn(`[AI Rating] Failed to parse ICP content for user ${userId}:`, parseError);
      icpData = { rawContent: customer.icpContent };
    }

    logger.info('[AI Rating] ICP framework loaded successfully', {
      userId,
      title: icpData.title,
      contentStatus: customer.contentStatus // camelCase
    });

    // ===== STEP 2: GET COMPANY RESEARCH DATA =====
    logger.info('[AI Rating] Fetching company research data');

    // Check if we have cached company research
    const { data: existingResearch, error: researchError } = await supabase
      .from('company_research')
      .select('*')
      .eq('user_id', userId)
      .eq('company_url', cleanCompanyUrl)
      .order('created_at', { ascending: false })
      .limit(1);

    let companyData;
    if (existingResearch && existingResearch.length > 0) {
      // Use cached research (if less than 7 days old)
      const researchAge = Date.now() - new Date(existingResearch[0].created_at).getTime();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;

      if (researchAge < sevenDays) {
        logger.info('[AI Rating] Using cached company research', {
          companyName: existingResearch[0].company_name,
          ageInDays: Math.floor(researchAge / (24 * 60 * 60 * 1000))
        });
        companyData = existingResearch[0].research_data || {};
      }
    }

    // If no cached data, create minimal company context from URL
    if (!companyData) {
      logger.info('[AI Rating] No cached research, using URL-based context');

      // Extract company name from URL
      const urlParts = cleanCompanyUrl.replace(/^https?:\/\//, '').split('/')[0].split('.');
      const companyName = urlParts[urlParts.length - 2] || urlParts[0];

      companyData = {
        companyName: companyName.charAt(0).toUpperCase() + companyName.slice(1),
        companyUrl: cleanCompanyUrl,
        description: 'Company information not available - rating based on URL and limited context',
        dataQuality: 'minimal'
      };

      logger.warn('[AI Rating] Limited company data available', { companyName: companyData.companyName });
    }

    // ===== STEP 3: CONSTRUCT AI RATING PROMPT =====
    const prompt = `You are a B2B sales and marketing expert specializing in ICP (Ideal Customer Profile) fit analysis.

TASK: Rate how well this company fits the given ICP framework on a scale of 0-100.

ICP FRAMEWORK:
Title: ${icpData.title || 'Not provided'}
Description: ${icpData.description || 'Not provided'}

ICP Segments:
${JSON.stringify(icpData.segments || [], null, 2)}

Key Indicators:
${JSON.stringify(icpData.keyIndicators || [], null, 2)}

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
  "reasoning": "<2-3 sentence summary of why this score was assigned>",
  "breakdown": {
    "industryFit": {
      "score": <0-25>,
      "explanation": "<1 sentence>"
    },
    "companySizeFit": {
      "score": <0-25>,
      "explanation": "<1 sentence>"
    },
    "painPointAlignment": {
      "score": <0-25>,
      "explanation": "<1 sentence>"
    },
    "buyerPersonaMatch": {
      "score": <0-25>,
      "explanation": "<1 sentence>"
    }
  },
  "strengths": ["<strength 1>", "<strength 2>"],
  "concerns": ["<concern 1>", "<concern 2>"],
  "recommendation": "<Should we pursue this company? Why or why not?>"
}

SCORING GUIDE:
- 80-100: Excellent fit - High priority target
- 60-79: Good fit - Worth pursuing
- 40-59: Fair fit - Qualified lead with caveats
- 0-39: Poor fit - Not a priority target`;

    logger.info('[AI Rating] Calling Claude API');
    const startTime = Date.now();

    // ===== STEP 4: CALL ANTHROPIC API =====
    const response = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 2048,
      temperature: 0.5, // Lower temperature for more consistent scoring
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const apiDuration = Date.now() - startTime;
    logger.info(`[AI Rating] Claude API responded in ${apiDuration}ms`);

    // ===== EXTRACT TOKEN USAGE =====
    const usage = response.usage;
    const estimatedCost = calculateCost(
      usage.input_tokens,
      usage.output_tokens,
      'claude-3-opus-20240229'
    );

    // Record AI metric with token tracking
    recordAIMetric({
      operation: 'rateCompany',
      duration: apiDuration,
      success: true,
      customerId: userId,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      totalTokens: usage.input_tokens + usage.output_tokens,
      estimatedCost: estimatedCost,
      model: 'claude-3-opus-20240229'
    });

    // ===== STEP 5: PARSE AI RESPONSE =====
    const responseText = response.content[0].text;

    let ratingResult;
    try {
      ratingResult = JSON.parse(responseText);
    } catch (parseError) {
      logger.error('[AI Rating] JSON parse error', {
        error: parseError.message,
        responsePreview: responseText.substring(0, 200)
      });

      return res.status(500).json({
        success: false,
        error: 'AI returned invalid JSON',
        details: parseError.message
      });
    }

    // Validate response structure
    if (typeof ratingResult.score !== 'number' ||
        ratingResult.score < 0 ||
        ratingResult.score > 100) {
      logger.error('[AI Rating] Invalid score in response', {
        score: ratingResult.score
      });

      return res.status(500).json({
        success: false,
        error: 'AI returned invalid score',
        details: 'Score must be a number between 0 and 100'
      });
    }

    logger.info(`[AI Rating] Generated rating score: ${ratingResult.score}`);

    // ===== STEP 6: SAVE TO DATABASE =====
    const { data, error} = await supabase
      .from('company_ratings')
      .insert({
        user_id: userId,
        company_url: cleanCompanyUrl,
        company_name: companyData.companyName || cleanCompanyUrl,
        icp_framework_id: null, // No separate ICP framework table, data in customers.icp_content
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
      logger.error('[AI Rating] Database error', {
        error: error.message,
        code: error.code
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to save rating to database',
        details: error.message
      });
    }

    logger.info('[AI Rating] Saved to database', { id: data.id });

    // ===== SUCCESS RESPONSE =====
    res.status(201).json({
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
        companyName: companyData.companyName || cleanCompanyUrl,
        icpFramework: icpData.title || 'ICP Framework',
        ratedAt: data.created_at,
        apiDuration: `${apiDuration}ms`,
        dataQuality: companyData.dataQuality || 'full'
      }
    });

  } catch (error) {
    logger.error('[AI Rating] Unexpected error', {
      error: error.message,
      stack: error.stack
    });

    // Handle specific error types
    if (error.status === 429) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: 'Too many requests to AI service. Please try again in a few minutes.',
        retryAfter: 60
      });
    }

    if (error.status === 401) {
      return res.status(500).json({
        success: false,
        error: 'AI service authentication failed',
        message: 'Server configuration error. Please contact support.'
      });
    }

    // Generic error response
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to rate company. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get saved ratings for current user
 * GET /api/ratings/current-user
 *
 * Query parameters:
 * - limit: number (optional, default: 50, max: 100)
 * - offset: number (optional, default: 0)
 * - minScore: number (optional, filter by minimum score)
 * - maxScore: number (optional, filter by maximum score)
 *
 * Response:
 * {
 *   success: boolean,
 *   ratings: array - All saved rating records
 *   metadata: object - Pagination and summary metadata
 * }
 */
export const getCurrentUserRatings = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const {
      limit = 50,
      offset = 0,
      minScore,
      maxScore
    } = req.query;

    logger.info('[Get Ratings] Request', { userId, limit, offset });

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate pagination parameters
    const parsedLimit = Math.min(parseInt(limit) || 50, 100);
    const parsedOffset = Math.max(parseInt(offset) || 0, 0);

    // Build query
    let query = supabase
      .from('company_ratings')
      .select('*, icp_frameworks(product_name, product_description)', { count: 'exact' })
      .eq('user_id', userId);

    // Apply score filters if provided
    if (minScore !== undefined) {
      const min = parseInt(minScore);
      if (!isNaN(min)) {
        query = query.gte('rating_score', min);
      }
    }

    if (maxScore !== undefined) {
      const max = parseInt(maxScore);
      if (!isNaN(max)) {
        query = query.lte('rating_score', max);
      }
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(parsedOffset, parsedOffset + parsedLimit - 1);

    const { data, error, count } = await query;

    if (error) {
      logger.error('[Get Ratings] Database error', {
        error: error.message
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to fetch ratings',
        details: error.message
      });
    }

    logger.info(`[Get Ratings] Found ${data.length} ratings (total: ${count})`);

    // Calculate summary statistics
    const avgScore = data.length > 0
      ? data.reduce((sum, r) => sum + r.rating_score, 0) / data.length
      : 0;

    const fitDistribution = {
      excellent: data.filter(r => r.rating_score >= 80).length,
      good: data.filter(r => r.rating_score >= 60 && r.rating_score < 80).length,
      fair: data.filter(r => r.rating_score >= 40 && r.rating_score < 60).length,
      poor: data.filter(r => r.rating_score < 40).length
    };

    // Return ratings with metadata
    res.json({
      success: true,
      ratings: data,
      metadata: {
        count: data.length,
        total: count,
        limit: parsedLimit,
        offset: parsedOffset,
        hasMore: count > parsedOffset + parsedLimit,
        avgScore: Math.round(avgScore),
        fitDistribution,
        mostRecent: data.length > 0 ? data[0].created_at : null
      }
    });

  } catch (error) {
    logger.error('[Get Ratings] Unexpected error', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Rate multiple companies in batch
 * POST /api/ai/rate-batch
 *
 * Request body:
 * {
 *   companies: array of { companyUrl: string, companyName?: string }
 *   icpFrameworkId: uuid (optional)
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   results: array - Rating results for each company
 *   metadata: object - Batch processing metadata
 * }
 */
export const rateBatch = async (req, res, next) => {
  try {
    const { companies, icpFrameworkId } = req.body;
    const userId = req.user?.id;

    logger.info('[Batch Rating] Request', {
      userId,
      companyCount: companies?.length
    });

    // Validate authentication
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate input
    if (!companies || !Array.isArray(companies)) {
      return res.status(400).json({
        success: false,
        error: 'companies must be an array'
      });
    }

    if (companies.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one company is required'
      });
    }

    if (companies.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 10 companies per batch',
        details: `You provided ${companies.length} companies. Please split into multiple batches.`
      });
    }

    // Validate each company has a URL
    const invalidCompanies = companies.filter(c => !c.companyUrl);
    if (invalidCompanies.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'All companies must have a companyUrl field'
      });
    }

    logger.info('[Batch Rating] Processing batch', { count: companies.length });
    const startTime = Date.now();

    // Process all companies in parallel
    const ratingPromises = companies.map(async (company, index) => {
      try {
        // Simulate request for each company
        const mockReq = {
          body: {
            companyUrl: company.companyUrl,
            icpFrameworkId
          },
          user: { id: userId }
        };

        // Create a promise to capture the response
        return new Promise((resolve) => {
          const mockRes = {
            status: (code) => ({
              json: (data) => resolve({ statusCode: code, ...data, companyUrl: company.companyUrl })
            }),
            json: (data) => resolve({ statusCode: 200, ...data, companyUrl: company.companyUrl })
          };

          // Call rateCompany for each company
          rateCompany(mockReq, mockRes, () => {});
        });

      } catch (error) {
        logger.error(`[Batch Rating] Error rating company ${index}`, {
          companyUrl: company.companyUrl,
          error: error.message
        });

        return {
          companyUrl: company.companyUrl,
          success: false,
          error: error.message
        };
      }
    });

    // Wait for all ratings to complete
    const results = await Promise.all(ratingPromises);
    const duration = Date.now() - startTime;

    // Summarize results
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    logger.info('[Batch Rating] Batch complete', {
      total: results.length,
      successful,
      failed,
      durationMs: duration
    });

    res.json({
      success: true,
      results: results,
      metadata: {
        total: results.length,
        successful,
        failed,
        durationMs: duration,
        avgTimePerCompany: Math.round(duration / results.length)
      }
    });

  } catch (error) {
    logger.error('[Batch Rating] Unexpected error', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
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
    logger.warn(`Unknown model pricing: ${model}, using Opus as fallback`);
    return calculateCost(inputTokens, outputTokens, 'claude-3-opus-20240229');
  }

  const inputCost = (inputTokens / 1_000_000) * modelPricing.input;
  const outputCost = (outputTokens / 1_000_000) * modelPricing.output;

  return parseFloat((inputCost + outputCost).toFixed(6));
}
