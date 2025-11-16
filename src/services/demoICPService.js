import logger from '../utils/logger.js';

/**
 * Lightweight ICP generation service for public demo page
 * Stripped-down version of aiService.js - no auth, tracking, or complex features
 */
class DemoICPService {
  constructor() {
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  }

  /**
   * Generate demo ICP personas using narrative format
   * @param {string} productName - Product name
   * @param {string} productDescription - What the product does
   * @param {string|null} targetBuyer - Optional target buyer hint
   * @returns {Promise<Object>} Generated personas
   */
  async generateDemoICP(productName, productDescription, targetBuyer = null) {
    const startTime = Date.now();

    try {
      // Validate inputs
      if (!productName || !productDescription) {
        throw new Error('Product name and description are required');
      }

      const prompt = this.buildDemoICPPrompt(productName, productDescription, targetBuyer);

      logger.info(`🎯 Generating demo ICP for: ${productName}`);

      // Use Claude Haiku for speed and cost-efficiency
      const aiResponse = await this.callAnthropicAPI(prompt, {
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 3000,
        temperature: 0.8 // Higher creativity for diverse personas
      });

      const personasData = this.parsePersonasResponse(aiResponse);

      const duration = Date.now() - startTime;
      logger.info(`✅ Generated ${personasData.personas.length} personas in ${duration}ms`);

      return {
        success: true,
        data: personasData,
        metadata: {
          generatedAt: new Date().toISOString(),
          model: 'claude-3-5-haiku-20241022',
          duration,
          source: 'demo_generation'
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`❌ Demo ICP generation failed: ${error.message} (${duration}ms)`);

      return {
        success: false,
        error: error.message,
        fallback: this.getDemoFallback(productName, productDescription)
      };
    }
  }

  /**
   * Build the demo ICP generation prompt with intelligence extraction
   */
  buildDemoICPPrompt(productName, productDescription, targetBuyer = null) {
    const targetBuyerContext = targetBuyer
      ? `\nThe founder mentioned their target buyer is: ${targetBuyer}`
      : '';

    return `You are an expert B2B sales strategist specializing in Ideal Customer Profiles and buyer intelligence extraction.

Product Information:
- Product Name: ${productName}
- Raw Description: ${productDescription}${targetBuyerContext}

Your task is to generate deep buyer intelligence from this simple product description. This is NOT just running an AI prompt - you are extracting pure signal about who truly needs this product and why.

STEP 1A: ENHANCED PRODUCT DESCRIPTION (40-60 words)
Analyze the raw product information and create a refined description that:
- Clarifies technical capabilities in business language
- Identifies target market signals from the description
- Highlights unique differentiators that matter to buyers
- Ensures enterprise buyer comprehension (avoid jargon)

Output Format: Start with "${productName} is..." and complete in 1-2 clear sentences.

STEP 1B: EXTRACT CORE CAPABILITY (The Pure Signal)
Ignore all features, branding, and differentiators. Identify the fundamental, single, high-value outcome this product delivers.

Ask yourself: "If I stripped away all the bells and whistles, what is the ONE non-negotiable, high-value problem this product solves at its most basic level?"

Output Format: Single outcome statement (10-15 words max)

STEP 2: GENERATE EXACTLY 2 BUYER PERSONAS (NOT 3, NOT 5 - ONLY 2!)
Using the refined understanding from Steps 1A and 1B, generate EXACTLY 2 distinct buyer personas using this narrative format for EACH:

(Title) at (company size)(industry) who need to (humanized primary goal) but are (emotion) that/about (specific pain point/obstacle to their goal) and (typical solution for problem) is no longer working.

PERSONA REQUIREMENTS:
1. Title: Specific job title (e.g., "VP of Engineering", "Head of Sales", "CTO")
2. Company size: Specific stage (e.g., "Series B", "mid-market", "50-200 employee")
3. Industry: Relevant vertical for this product (e.g., "SaaS companies", "healthcare tech")
4. Humanized primary goal: What they desperately want to achieve (use active, emotional language)
5. Emotion: How they feel about the obstacle (anxious, frustrated, overwhelmed, worried, concerned, desperate)
6. Specific pain point: The exact obstacle preventing their goal (be specific, not generic)
7. Typical solution: What they've tried that isn't working anymore (specific tools/approaches)

CRITICAL RULES:
- Each persona must be DISTINCT (different titles, company sizes, and pain points)
- Be SPECIFIC, not generic (avoid "improve efficiency" - say "ship faster without sacrificing quality")
- Use EMOTIONAL language (these are real people with real pressures)
- Focus on HIGH-VALUE buyers (decision makers, not end users)

For each persona, also provide:
- 3-5 specific goals they want to achieve
- 3-5 specific pain points they're experiencing
- Role category: "Economic Buyer", "Technical Buyer", or "Champion"
- WHY THIS PERSONA: 1-2 sentence strategic rationale explaining why this persona represents their ideal customer (not just "they need this feature" - explain the business logic)
- 2 UNIQUE OBJECTIONS: Business outcome focused objections this persona would raise (e.g., ROI concerns, CAC impact, revenue velocity, implementation risk) with strategic responses

Return ONLY valid JSON in this exact structure:
{
  "refinedProductDescription": "${productName} is [40-60 word refined description]",
  "coreCapability": "[Single high-value outcome statement]",
  "personas": [
    {
      "id": "persona-1",
      "title": "VP of Engineering",
      "role": "Economic Buyer",
      "narrative": "(Title) at (size)(industry) who need to (goal) but are (emotion) that (pain) and (failed solution) is no longer working",
      "whyThisPersona": "Strategic rationale for why this persona is the ideal customer (1-2 sentences)",
      "goals": ["goal 1", "goal 2", "goal 3"],
      "painPoints": ["pain 1", "pain 2", "pain 3"],
      "objections": [
        {
          "objection": "Business outcome focused concern",
          "response": "Strategic response addressing the concern"
        },
        {
          "objection": "Different business outcome concern",
          "response": "Strategic response"
        }
      ],
      "demographics": {
        "companySize": "Series B",
        "industry": "SaaS companies",
        "location": "North America"
      },
      "psychographics": {
        "motivations": "Brief motivation summary",
        "fears": "Brief fear summary"
      }
    }
  ]
}

Examples of GOOD narratives:
- "VP of Engineering at Series B SaaS companies who need to ship faster without sacrificing quality but are anxious that manual code reviews are becoming bottlenecks and traditional static analysis tools are no longer catching critical bugs"
- "Head of Sales at mid-market healthcare companies who need to close enterprise deals in 60 days instead of 180 but are frustrated that their reps lack buyer intelligence and generic outreach is no longer getting responses"

Examples of GOOD objections:
- {"objection": "How do we justify the ROI when our current solution costs 60% less?", "response": "The current solution's hidden cost is 15+ hours/week of engineering time on manual reviews - that's $156K/year in fully-loaded costs vs our $48K annual fee. You're already paying 3x more."}
- {"objection": "Will this actually reduce our customer acquisition cost or just shift it?", "response": "Our customers see 40% CAC reduction in 90 days because reps stop wasting time on poor-fit prospects. You're not shifting cost - you're eliminating waste in your pipeline."}

CRITICAL REMINDER: Generate EXACTLY 2 personas in the JSON response. The "personas" array must contain exactly 2 objects, no more, no less.

Generate the complete intelligence extraction now (Steps 1A, 1B, and EXACTLY 2 personas).`;
  }

  /**
   * Call Anthropic Claude API
   */
  async callAnthropicAPI(prompt, options = {}) {
    if (!this.anthropicApiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const modelToUse = options.model || 'claude-3-5-haiku-20241022';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.anthropicApiKey,
        'Anthropic-Version': '2023-06-01'
      },
      body: JSON.stringify({
        model: modelToUse,
        max_tokens: options.max_tokens || 3000,
        temperature: options.temperature || 0.8,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    return result.content[0].text;
  }

  /**
   * Parse personas response from AI with intelligence fields
   */
  parsePersonasResponse(response) {
    try {
      // Extract JSON from response (may have markdown code blocks)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate intelligence extraction fields
      if (!parsed.refinedProductDescription) {
        logger.warn('Missing refinedProductDescription in AI response');
      }
      if (!parsed.coreCapability) {
        logger.warn('Missing coreCapability in AI response');
      }

      // Validate structure
      if (!parsed.personas || !Array.isArray(parsed.personas)) {
        throw new Error('Invalid personas structure in response');
      }

      // Validate each persona has required fields including new ones
      parsed.personas.forEach((persona, index) => {
        if (!persona.title || !persona.narrative || !persona.goals || !persona.painPoints) {
          throw new Error(`Persona ${index + 1} missing required fields`);
        }
        if (!persona.whyThisPersona) {
          logger.warn(`Persona ${index + 1} missing whyThisPersona field`);
        }
        if (!persona.objections || !Array.isArray(persona.objections) || persona.objections.length !== 2) {
          logger.warn(`Persona ${index + 1} missing or invalid objections field (expected array of 2)`);
        }
      });

      return parsed;
    } catch (error) {
      logger.error(`Failed to parse personas response: ${error.message}`);
      logger.debug('Raw response:', response);
      throw error;
    }
  }

  /**
   * Generate fallback personas if AI fails
   */
  getDemoFallback(productName, productDescription) {
    logger.warn('Using fallback demo personas');

    return {
      refinedProductDescription: `${productName} is a B2B platform that helps companies understand their ideal customers and craft resonant sales messaging through AI-powered buyer intelligence, reducing customer acquisition costs and shortening sales cycles.`,
      coreCapability: "Accelerate revenue growth by identifying and converting ideal customers faster",
      personas: [
        {
          id: "persona-fallback-1",
          title: "VP of Sales",
          role: "Economic Buyer",
          narrative: `VP of Sales at growth-stage B2B companies who need to hit aggressive revenue targets but are frustrated that their team lacks visibility into buyer needs and generic sales pitches are no longer converting`,
          whyThisPersona: "This persona controls budget and is directly accountable for revenue outcomes. They have the authority to invest in tools that demonstrably improve win rates and reduce sales cycle length, making them the ideal economic buyer.",
          goals: [
            "Increase win rates from 20% to 35%",
            "Shorten sales cycles by 30%",
            "Scale the sales team efficiently"
          ],
          painPoints: [
            "Sales reps struggle to articulate value in customer language",
            "Long sales cycles due to misaligned messaging",
            "High cost of acquiring new customers"
          ],
          objections: [
            {
              objection: "How do we justify the ROI when we're already using sales enablement tools?",
              response: "Current sales enablement focuses on content management, not buyer intelligence. Our customers see 40% higher win rates within 90 days because reps finally understand who to target and what messages resonate. That's $2M+ in additional ARR for a typical Series B sales team."
            },
            {
              objection: "Will this actually reduce our customer acquisition cost or just add another expense?",
              response: "The average sales team wastes 60% of their time on poor-fit prospects. Our platform reduces CAC by 35% in the first quarter by helping reps focus only on ideal customers, cutting wasted outreach and shortening sales cycles by 30 days."
            }
          ],
          demographics: {
            companySize: "Series A-B",
            industry: "B2B SaaS",
            location: "North America"
          },
          psychographics: {
            motivations: "Hit quota, prove ROI of sales org, scale efficiently",
            fears: "Missing targets, high CAC, low conversion rates"
          }
        },
        {
          id: "persona-fallback-2",
          title: "Head of Marketing",
          role: "Champion",
          narrative: `Head of Marketing at mid-market companies who need to generate high-quality leads but are anxious that generic content isn't resonating and paid acquisition costs keep rising`,
          whyThisPersona: "This persona owns demand generation and is measured on MQL quality and cost-per-lead. They champion solutions that improve campaign performance and demonstrate clear attribution, making them natural advocates within the buying committee.",
          goals: [
            "Improve marketing qualified lead conversion",
            "Reduce cost per acquisition",
            "Create buyer-specific content"
          ],
          painPoints: [
            "Generic messaging doesn't stand out",
            "Difficulty understanding buyer psychology",
            "Low engagement on campaigns"
          ],
          objections: [
            {
              objection: "We already have buyer personas from our agency - why do we need this?",
              response: "Agency personas are static documents based on assumptions. Our platform generates real-time buyer intelligence from actual product signals, including specific objections and messaging that resonates. Our customers see 3x higher campaign engagement because the intelligence is actionable, not theoretical."
            },
            {
              objection: "How does this integrate with our existing marketing stack and attribution model?",
              response: "Unlike point solutions, our platform provides intelligence that improves every campaign you run - email, ads, content, events. Customers see 25% improvement in MQL-to-SQL conversion within 60 days because marketing finally delivers leads that sales wants to work."
            }
          ],
          demographics: {
            companySize: "50-200 employees",
            industry: "Technology",
            location: "Global"
          },
          psychographics: {
            motivations: "Prove marketing ROI, drive pipeline growth",
            fears: "Budget cuts, poor lead quality, attribution issues"
          }
        }
      ]
    };
  }
}

export default new DemoICPService();
