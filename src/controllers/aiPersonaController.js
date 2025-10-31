/**
 * AI Persona Controller
 * Generates buyer personas using Anthropic Claude AI
 * Saves personas to Supabase database
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import logger from '../utils/logger.js';

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
 * Generate buyer personas using Claude AI
 * POST /api/ai/generate-personas
 *
 * Request body:
 * {
 *   companyContext: string (required) - Company description and context
 *   industry: string (required) - Industry/vertical
 *   targetMarket: string (optional) - Specific target market
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   personas: array - Generated personas
 *   savedId: uuid - Database record ID
 *   metadata: object - Generation metadata
 * }
 */
export const generatePersonas = async (req, res, next) => {
  try {
    // ===== INPUT VALIDATION =====
    const { companyContext, industry, targetMarket } = req.body;
    const userId = req.user?.id;

    logger.info('[AI Persona] Generation request', { userId, industry });

    // Validate authentication
    if (!userId) {
      logger.warn('[AI Persona] Unauthenticated request');
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate required fields
    if (!companyContext || !industry) {
      logger.warn('[AI Persona] Missing required fields', {
        hasContext: !!companyContext,
        hasIndustry: !!industry
      });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: {
          companyContext: !companyContext ? 'Required' : 'OK',
          industry: !industry ? 'Required' : 'OK'
        }
      });
    }

    // Validate field lengths
    if (companyContext.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'companyContext must be at least 10 characters'
      });
    }

    if (industry.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'industry must be at least 2 characters'
      });
    }

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

    logger.info('[AI Persona] Calling Claude API');
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
    logger.info(`[AI Persona] Claude API responded in ${apiDuration}ms`);

    // ===== PARSE AI RESPONSE =====
    const responseText = response.content[0].text;

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (parseError) {
      logger.error('[AI Persona] JSON parse error', {
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
    if (!parsedResponse.personas || !Array.isArray(parsedResponse.personas)) {
      logger.error('[AI Persona] Invalid response structure', {
        receivedKeys: Object.keys(parsedResponse)
      });

      return res.status(500).json({
        success: false,
        error: 'AI response missing personas array',
        receivedKeys: Object.keys(parsedResponse)
      });
    }

    const personas = parsedResponse.personas;

    // Validate persona count
    if (personas.length < 3 || personas.length > 5) {
      logger.warn(`[AI Persona] Unexpected persona count: ${personas.length}`);
    }

    logger.info(`[AI Persona] Generated ${personas.length} personas`);

    // ===== DATABASE SAVE =====
    const { data, error } = await supabase
      .from('buyer_personas')
      .insert({
        user_id: userId,
        personas: personas,
        company_context: companyContext,
        industry: industry,
        target_market: targetMarket || null
      })
      .select()
      .single();

    if (error) {
      logger.error('[AI Persona] Database error', {
        error: error.message,
        code: error.code
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to save personas to database',
        details: error.message
      });
    }

    logger.info('[AI Persona] Saved to database', { id: data.id });

    // ===== SUCCESS RESPONSE =====
    res.status(201).json({
      success: true,
      personas: personas,
      savedId: data.id,
      metadata: {
        personaCount: personas.length,
        industry: industry,
        generatedAt: data.created_at,
        apiDuration: `${apiDuration}ms`
      }
    });

  } catch (error) {
    logger.error('[AI Persona] Unexpected error', {
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
      message: 'Failed to generate personas. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get saved personas for current user
 * GET /api/personas/current-user
 *
 * Response:
 * {
 *   success: boolean,
 *   personas: array - All saved persona records
 *   metadata: object - Summary metadata
 * }
 */
export const getCurrentUserPersonas = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    logger.info('[Get Personas] Request', { userId });

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Fetch all personas for this user, most recent first
    const { data, error } = await supabase
      .from('buyer_personas')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('[Get Personas] Database error', {
        error: error.message
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to fetch personas',
        details: error.message
      });
    }

    logger.info(`[Get Personas] Found ${data.length} persona records`);

    // Return personas with metadata
    res.json({
      success: true,
      personas: data,
      metadata: {
        count: data.length,
        mostRecent: data.length > 0 ? data[0].created_at : null
      }
    });

  } catch (error) {
    logger.error('[Get Personas] Unexpected error', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
