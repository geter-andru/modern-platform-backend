import logger from '../utils/logger.js';
import { recordAIMetric, retryOperation } from '../middleware/performanceMonitoring.js';

/**
 * Prospect Discovery Service
 * Uses Claude AI + Web Search to find 5-7 real companies matching Andru's "Revenue Desert" ICP
 *
 * Input: User's generated ICP details (company name, refined description, core capability)
 * Output: 5-7 real companies with evidence links, confidence scores (1-10)
 *
 * Authentication: Required (authenticated ICP tool only)
 */
class ProspectDiscoveryService {
  constructor() {
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  }

  /**
   * Discover prospects matching user's ICP using Claude + web search
   * @param {Object} userICPData - User's generated ICP details
   * @param {string} userICPData.companyName - User's company name
   * @param {string} userICPData.refinedProductDescription - Enhanced product description
   * @param {string} userICPData.coreCapability - Core capability/pure signal
   * @param {string} userICPData.industry - Optional industry context
   * @param {string} userICPData.targetMarket - Optional target market context
   * @param {string} userId - User ID for tracking
   * @returns {Promise<Object>} Discovery results with prospects array
   */
  async discoverProspects(userICPData, userId) {
    const startTime = Date.now();

    try {
      // Validate inputs
      if (!userICPData || !userICPData.companyName || !userICPData.refinedProductDescription) {
        throw new Error('Company name and refined product description are required');
      }

      const prompt = this.buildProspectDiscoveryPrompt(userICPData);

      logger.info(`🔍 Starting prospect discovery for ${userICPData.companyName} (user: ${userId})`);

      // Call Claude API with web search enabled + retry logic
      const aiResponse = await retryOperation(
        () => this.callAnthropicAPIWithWebSearch(prompt, {
          model: 'claude-3-5-haiku-20241022', // Fast + cost-efficient
          max_tokens: 4000,
          temperature: 0.6,
          max_searches: 10 // Allow multiple searches for comprehensive discovery
        }),
        {
          maxRetries: 3,
          delayMs: 1000,
          operationName: 'prospectDiscovery'
        }
      );

      const prospects = this.parseProspectsResponse(aiResponse);

      const duration = Date.now() - startTime;
      logger.info(`✅ Discovered ${prospects.prospects.length} prospects in ${duration}ms`);

      // Record successful AI call metric
      recordAIMetric({
        operation: 'prospectDiscovery',
        duration,
        success: true,
        customerId: userId,
        resultsCount: prospects.prospects.length
      });

      return {
        success: true,
        data: prospects,
        metadata: {
          generatedAt: new Date().toISOString(),
          model: 'claude-3-5-haiku-20241022',
          source: 'prospect_discovery',
          duration,
          searchQueriesUsed: prospects.searchSummary?.queriesUsed || 'N/A'
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Prospect discovery failed: ${error.message} (${duration}ms)`);

      // Record failed AI call metric
      recordAIMetric({
        operation: 'prospectDiscovery',
        duration,
        success: false,
        error: error.message,
        customerId: userId
      });

      return {
        success: false,
        error: error.message,
        fallback: this.getProspectDiscoveryFallback(userICPData)
      };
    }
  }

  /**
   * Build the prospect discovery prompt with web search instructions
   */
  buildProspectDiscoveryPrompt(userICPData) {
    const { companyName, refinedProductDescription, coreCapability, industry, targetMarket } = userICPData;

    return `You are an expert B2B sales prospecting analyst with deep web research capabilities. Your task is to identify 5-7 real companies that match Andru's "Revenue Desert" ICP profile.

## CONTEXT: The Company You're Finding Prospects For

**Company**: ${companyName}
**Product Description**: ${refinedProductDescription}
**Core Capability**: ${coreCapability}
${industry ? `**Industry**: ${industry}` : ''}
${targetMarket ? `**Target Market**: ${targetMarket}` : ''}

## MISSION

Find 5-7 technical B2B SaaS companies currently in the "Revenue Desert" - post-PMF technical founders struggling with enterprise sales translation despite having superior products. These companies would benefit from Andru's buyer intelligence platform.

## CRITICAL SEARCH CRITERIA

### Primary Observable Signals (Search for these):

1. **Recent Enterprise Sales Leadership Hiring (6-12 months ago)**
   - Search: "VP Enterprise Sales" OR "Head of Enterprise" OR "CRO" LinkedIn job changes at technical B2B SaaS companies
   - Look for: LinkedIn announcements, job postings, "We're excited to welcome [Name]" posts
   - Target companies: Seed to Series B, technical infrastructure/developer tools

2. **Technical Founder CEO Background**
   - Search: Company founders with PhD, ex-FAANG engineer, technical research backgrounds
   - Look for: LinkedIn profiles showing "Software Engineer at Google/Meta/Amazon" → "Founder/CEO"
   - Avoid: Business/sales background founders

3. **Funding Timeline Indicators (Last raise 12-24 months ago)**
   - Search: "[Company name] Series A" OR "seed funding" on Crunchbase, TechCrunch
   - Look for: Funding dates in 2023-2024 range (implying 6-18 months runway now)
   - Target stage: $3M-$15M raised total

4. **High Engineering-to-Sales Ratio**
   - Search: Company LinkedIn page → "See all employees"
   - Look for: 70%+ engineering/product roles, <10% sales roles
   - Count: 15-50+ total employees with heavy technical skew

5. **Public Pain Signals**
   - Search: Founder LinkedIn posts about "enterprise sales," "moving upmarket," "selling to CFOs"
   - Look for: Job postings mentioning "complex technical products," "enterprise sales cycles"
   - Search: G2/Capterra reviews mentioning "hard to explain ROI" or "technically great but..."

6. **Product Category (Technical Infrastructure)**
   - Target: Developer tools, data infrastructure, security/compliance, API platforms, DevOps tools, ML infrastructure
   - Avoid: Business software (CRM, marketing, HR tools), consumer products

### Geographic Focus:
- Headquartered in: US (prioritize SF Bay Area, Seattle, NYC, Boston) or Canada
- English-language primary market

## SEARCH METHODOLOGY

### Phase 1: Identify Candidates

Use web search to find companies matching these patterns:
1. "VP Enterprise Sales" hired 2024 at developer tools companies
2. Series A funding 2023-2024 in technical B2B SaaS
3. Technical founders from FAANG backgrounds
4. Y Combinator technical infrastructure companies
5. LinkedIn founder posts about enterprise sales challenges

### Phase 2: Validate Each Candidate

For each potential company, verify:
1. Founder background (technical vs business)
2. Recent enterprise sales hire
3. Funding stage and timeline
4. Team composition (eng/sales ratio)
5. Pain signals (posts, job descriptions, reviews)
6. Company size (15-75 employees)
7. Revenue indicators (enterprise customer mentions)

## OUTPUT FORMAT

Return ONLY valid JSON in this exact structure:

{
  "prospects": [
    {
      "companyName": "TechFlow AI",
      "website": "techflow.ai",
      "headquarters": "San Francisco, CA",
      "productCategory": "ML Infrastructure / Developer Tools",
      "estimatedStage": "$2-4M ARR, Series A, 14 months post-funding",
      "icpFitEvidence": [
        "Hired Michael Torres as VP Enterprise Sales 7 months ago (LinkedIn: [URL]) - 15 years at Oracle",
        "Founder Dr. Lisa Chen: PhD ML Stanford, 9 years at Google Brain (LinkedIn: [URL])",
        "Raised $10M Series A Sept 2024 (Crunchbase: [URL]) - ~13 months runway",
        "Team: 42 employees - 34 Eng (81%), 4 Sales (10%) per LinkedIn",
        "Founder posted 'Struggling to translate ML into CFO ROI' 6 weeks ago"
      ],
      "confidenceRating": 9,
      "ratingJustification": "All five critical signals present with strong evidence. Recent enterprise hire, clear technical founder, appropriate funding timeline, massive eng/sales ratio imbalance, and explicit public pain signal.",
      "evidenceLinks": {
        "linkedinCompany": "linkedin.com/company/techflow-ai",
        "founderLinkedIn": "linkedin.com/in/dr-lisa-chen",
        "fundingData": "crunchbase.com/organization/techflow-ai",
        "painSignal": "linkedin.com/posts/dr-lisa-chen/enterprise-challenges"
      }
    }
  ],
  "searchSummary": {
    "totalProspectsIdentified": 6,
    "averageConfidenceRating": 8.2,
    "strongestSignalPatterns": "Most companies found through recent enterprise sales hires on LinkedIn",
    "searchChallengesEncountered": "Difficult to verify exact revenue stage - used employee count as proxy",
    "queriesUsed": 8
  }
}

## CONFIDENCE RATING CRITERIA

**9-10/10 - EXCELLENT FIT (4-5+ strong signals)**
- ✅ Recent enterprise sales hire verified (6-12 months)
- ✅ Technical founder with clear engineering background
- ✅ Funding 12-24 months ago verified
- ✅ High eng/sales ratio verified (70%+)
- ✅ Public pain signals visible

**7-8/10 - STRONG FIT (3-4 signals)**
- ✅ 3-4 of above signals verified
- Some signals inferred but not directly confirmed
- Minor deviation from ideal

**5-6/10 - MODERATE FIT (2-3 signals)**
- ✅ 2-3 signals verified
- Missing key signals
- May require additional qualification

**Below 5/10 - WEAK FIT**
- Only 1-2 signals present
- Don't include in final output unless struggling to find 5 companies

## ANTI-PATTERNS TO AVOID

❌ **DO NOT include**:
- Companies with non-technical founders (MBA, sales background)
- Companies selling business software (CRM, marketing, HR)
- Pre-product or pre-revenue companies (too early)
- $10M+ ARR companies (past desert stage)
- Companies with 100+ employees (too large)
- Companies that raised funding in last 6 months (too early to be in crisis)
- Companies with proven enterprise playbook

## DELIVERABLE

Provide exactly 5-7 companies matching this profile, ranked by confidence score (highest first).

If you can only find 3-4 strong matches, that's acceptable - quality over quantity. Better to deliver 4 companies with 8-10/10 confidence than 7 companies with 4-6/10 confidence.

Begin your comprehensive web search and prospect discovery now. Return ONLY the JSON output with no additional commentary.`;
  }

  /**
   * Call Anthropic Claude API with web search enabled
   */
  async callAnthropicAPIWithWebSearch(prompt, options = {}) {
    if (!this.anthropicApiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const modelToUse = options.model || 'claude-3-5-haiku-20241022';
    logger.info(`🤖 Calling Anthropic API with web search: ${modelToUse}`);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.anthropicApiKey,
        'Anthropic-Version': '2023-06-01'
      },
      body: JSON.stringify({
        model: modelToUse,
        max_tokens: options.max_tokens || 4000,
        temperature: options.temperature || 0.6,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        // Enable web search tool
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search',
            max_uses: options.max_searches || 10
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();

    // Extract text content from response (web search results are embedded)
    let fullText = '';
    for (const content of result.content) {
      if (content.type === 'text') {
        fullText += content.text;
      }
    }

    return fullText;
  }

  /**
   * Parse prospects response from AI with web search results
   */
  parseProspectsResponse(response) {
    try {
      // Extract JSON from response (may have markdown code blocks)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate structure
      if (!parsed.prospects || !Array.isArray(parsed.prospects)) {
        throw new Error('Invalid prospects structure in response');
      }

      // Validate each prospect has required fields
      parsed.prospects.forEach((prospect, index) => {
        if (!prospect.companyName || !prospect.icpFitEvidence || !prospect.confidenceRating) {
          throw new Error(`Prospect ${index + 1} missing required fields`);
        }
        if (prospect.confidenceRating < 1 || prospect.confidenceRating > 10) {
          logger.warn(`Prospect ${index + 1} has invalid confidence rating: ${prospect.confidenceRating}`);
        }
      });

      // Sort by confidence rating (highest first)
      parsed.prospects.sort((a, b) => b.confidenceRating - a.confidenceRating);

      return parsed;
    } catch (error) {
      logger.error(`Failed to parse prospects response: ${error.message}`);
      logger.debug('Raw response:', response);
      throw error;
    }
  }

  /**
   * Generate fallback prospects if AI fails
   */
  getProspectDiscoveryFallback(userICPData) {
    logger.warn('Using fallback prospect discovery data');

    return {
      prospects: [
        {
          companyName: "Example TechCo",
          website: "example-techco.com",
          headquarters: "San Francisco, CA",
          productCategory: "Developer Tools",
          estimatedStage: "$2M ARR, Series A",
          icpFitEvidence: [
            "Technical founder with engineering background",
            "Recently hired VP of Sales",
            "Series A funded 18 months ago",
            "High engineering-to-sales ratio visible on LinkedIn",
            "Active job postings for enterprise sales roles"
          ],
          confidenceRating: 7,
          ratingJustification: "Standard ICP match based on typical patterns. Additional qualification recommended.",
          evidenceLinks: {
            linkedinCompany: "#",
            founderLinkedIn: "#",
            fundingData: "#"
          }
        }
      ],
      searchSummary: {
        totalProspectsIdentified: 1,
        averageConfidenceRating: 7.0,
        strongestSignalPatterns: "Fallback data - web search unavailable",
        searchChallengesEncountered: "AI service unavailable - using fallback data",
        queriesUsed: 0
      }
    };
  }
}

export default new ProspectDiscoveryService();
