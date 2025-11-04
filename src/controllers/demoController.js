/**
 * Demo Controller
 * Generates demo ICP analyses for unauthenticated users
 *
 * Key differences from authenticated ICP generation:
 * - No authentication required (rate limited by IP)
 * - Generates only 3 personas (vs 3-5 for paid)
 * - Lower max_tokens (1500 vs 4096) for faster/cheaper generation
 * - Returns demo flag for watermarking exports
 * - Does NOT save to database (demo only)
 *
 * @module controllers/demoController
 */

import Anthropic from '@anthropic-ai/sdk';
import logger from '../utils/logger.js';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * Generate demo ICP analysis
 * POST /api/demo/generate-icp
 *
 * Request body:
 * {
 *   productName: string (required, 2-100 chars) - Product name
 *   description: string (required, 10-500 chars) - Product description
 *   businessModel: string (required) - "b2b-subscription" | "b2b-one-time"
 * }
 *
 * Response:
 * {
 *   success: true,
 *   demo: true,
 *   personas: array - 3 generated personas
 *   icp: object - ICP overview data
 *   product: object - Product info submitted
 *   metadata: object - Generation metadata
 * }
 *
 * Rate limit: 3 requests per IP per 24 hours
 */
export const generateDemoICP = async (req, res, next) => {
  const startTime = Date.now();

  try {
    // ===== INPUT VALIDATION =====
    const { productName, description, businessModel } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress;

    logger.info('[Demo ICP] Generation request', {
      clientIP,
      productName,
      hasDescription: !!description
    });

    // Validate required fields
    if (!productName || !description || !businessModel) {
      logger.warn('[Demo ICP] Missing required fields', {
        hasProductName: !!productName,
        hasDescription: !!description,
        hasBusinessModel: !!businessModel
      });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: {
          productName: !productName ? 'Required (2-100 characters)' : 'OK',
          description: !description ? 'Required (10-500 characters)' : 'OK',
          businessModel: !businessModel ? 'Required (b2b-subscription or b2b-one-time)' : 'OK'
        }
      });
    }

    // Validate field lengths
    if (productName.length < 2 || productName.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'productName must be 2-100 characters'
      });
    }

    if (description.length < 10 || description.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'description must be 10-500 characters'
      });
    }

    // Validate business model
    const validBusinessModels = ['b2b-subscription', 'b2b-one-time'];
    if (!validBusinessModels.includes(businessModel)) {
      return res.status(400).json({
        success: false,
        error: 'businessModel must be "b2b-subscription" or "b2b-one-time"'
      });
    }

    // ===== AI PROMPT CONSTRUCTION =====
    const prompt = buildDemoICPPrompt(productName, description, businessModel);

    logger.info('[Demo ICP] Calling Claude API');
    const apiStartTime = Date.now();

    // ===== ANTHROPIC API CALL =====
    // NOTE: Using Opus as API key doesn't have Sonnet 3.5 access
    // With Sonnet 3.5, this would be ~12-15s (3x faster)
    const response = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 1200, // Reduced from 1500 for faster generation
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const apiDuration = Date.now() - apiStartTime;
    logger.info(`[Demo ICP] Claude API responded in ${apiDuration}ms`);

    // ===== PARSE AI RESPONSE =====
    const responseText = response.content[0].text;

    let parsedResponse;
    try {
      // Extract JSON from response (handles markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      parsedResponse = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      logger.error('[Demo ICP] JSON parse error', {
        error: parseError.message,
        responsePreview: responseText.substring(0, 300)
      });

      return res.status(500).json({
        success: false,
        error: 'AI returned invalid JSON',
        details: parseError.message
      });
    }

    // Validate response structure
    if (!parsedResponse.personas || !Array.isArray(parsedResponse.personas)) {
      logger.error('[Demo ICP] Invalid response structure', {
        receivedKeys: Object.keys(parsedResponse)
      });

      return res.status(500).json({
        success: false,
        error: 'AI returned invalid response structure'
      });
    }

    // Validate we got exactly 3 personas
    if (parsedResponse.personas.length !== 3) {
      logger.warn('[Demo ICP] Expected 3 personas, got different count', {
        count: parsedResponse.personas.length
      });
    }

    // ===== BUILD RESPONSE =====
    const totalDuration = Date.now() - startTime;

    const result = {
      success: true,
      demo: true, // Flag for watermarking
      personas: parsedResponse.personas,
      icp: parsedResponse.icp || null,
      product: {
        productName,
        description,
        businessModel
      },
      generatedAt: new Date().toISOString(),
      metadata: {
        generationTimeMs: totalDuration,
        apiCallTimeMs: apiDuration,
        model: 'claude-3-opus-20240229',
        personaCount: parsedResponse.personas.length,
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
        cost: calculateApproximateCost(response.usage)
      }
    };

    logger.info('[Demo ICP] Generation successful', {
      clientIP,
      personaCount: result.personas.length,
      totalDuration,
      tokensUsed: result.metadata.tokensUsed
    });

    return res.status(200).json(result);

  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('[Demo ICP] Generation failed', {
      error: error.message,
      stack: error.stack,
      durationMs: duration
    });

    // Check for rate limit errors from Anthropic
    if (error.status === 429) {
      return res.status(429).json({
        success: false,
        error: 'AI service rate limit reached. Please try again in a few minutes.'
      });
    }

    // Generic error response
    return res.status(500).json({
      success: false,
      error: 'Failed to generate demo ICP',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Build AI prompt for demo ICP generation
 * Generates exactly 3 buyer personas (not 3-5)
 */
function buildDemoICPPrompt(productName, description, businessModel) {
  return `You are a B2B marketing expert. Generate EXACTLY 3 buyer personas for this product.

PRODUCT: ${productName}
DESCRIPTION: ${description}
BUSINESS MODEL: ${businessModel}

Return ONLY valid JSON with NO trailing commas, NO markdown blocks. Structure:

{
  "personas": [
    {
      "title": "specific job title",
      "level": "C-Suite|VP|Director|Manager|IC",
      "department": "department name",
      "demographics": {
        "companySize": "employee range",
        "revenue": "revenue range",
        "industryVertical": "specific industry",
        "region": "geographic region",
        "yearsExperience": "years range"
      },
      "psychographics": {
        "goals": ["goal 1", "goal 2", "goal 3"],
        "challenges": ["challenge 1", "challenge 2", "challenge 3"],
        "motivations": ["motivation 1", "motivation 2"],
        "fears": ["fear 1", "fear 2"],
        "values": ["value 1", "value 2"]
      },
      "buyingBehavior": {
        "decisionCriteria": ["criteria 1", "criteria 2", "criteria 3"],
        "budgetAuthority": "Recommends|Approves|Controls",
        "buyingProcessRole": "Initiator|Influencer|Decision Maker|Purchaser",
        "informationSources": ["source 1", "source 2"],
        "preferredChannels": ["channel 1", "channel 2"]
      }
    }
  ],
  "icp": {
    "targetMarket": "description",
    "idealCompanySize": "size ranges",
    "keyIndustries": ["industry 1", "industry 2", "industry 3"],
    "geographicFocus": ["region 1", "region 2"],
    "keyValueProposition": "main benefit"
  }
}

Generate EXACTLY 3 personas. Be specific and actionable. Use proper JSON formatting with no trailing commas.`;
}

/**
 * Calculate approximate cost of API call
 * Based on Anthropic pricing for Claude 3.5 Sonnet
 */
function calculateApproximateCost(usage) {
  // Claude 3.5 Sonnet pricing (as of Jan 2025):
  // Input: $3 per million tokens
  // Output: $15 per million tokens
  const inputCostPerToken = 3 / 1000000;
  const outputCostPerToken = 15 / 1000000;

  const inputCost = usage.input_tokens * inputCostPerToken;
  const outputCost = usage.output_tokens * outputCostPerToken;
  const totalCost = inputCost + outputCost;

  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    totalTokens: usage.input_tokens + usage.output_tokens,
    inputCost: parseFloat(inputCost.toFixed(4)),
    outputCost: parseFloat(outputCost.toFixed(4)),
    totalCost: parseFloat(totalCost.toFixed(4))
  };
}

export default {
  generateDemoICP
};
