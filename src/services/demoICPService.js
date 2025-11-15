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
   * Build the demo ICP generation prompt
   */
  buildDemoICPPrompt(productName, productDescription, targetBuyer = null) {
    const targetBuyerContext = targetBuyer
      ? `\nThe founder mentioned their target buyer is: ${targetBuyer}`
      : '';

    return `You are an expert B2B sales strategist specializing in Ideal Customer Profiles.

Product Information:
- Product Name: ${productName}
- Description: ${productDescription}${targetBuyerContext}

Generate 5 distinct buyer personas for this product using the following format for EACH persona:

(Title) at (company size)(industry) who need to (humanized primary goal) but are (emotion) that/about (specific pain point/obstacle to their goal) and (typical solution for problem) is no longer working.

REQUIREMENTS FOR EACH PERSONA:
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
- The "typical solution" should be a real approach/tool that's becoming inadequate
- Focus on HIGH-VALUE buyers (decision makers, not end users)

Additionally, for each persona provide:
- 3-5 specific goals they want to achieve
- 3-5 specific pain points they're experiencing
- Role category: "Economic Buyer", "Technical Buyer", or "Champion"

Return ONLY valid JSON in this exact structure:
{
  "personas": [
    {
      "id": "persona-1",
      "title": "VP of Engineering",
      "role": "Economic Buyer",
      "narrative": "(Title) at (size)(industry) who need to (goal) but are (emotion) that (pain) and (failed solution) is no longer working",
      "goals": ["goal 1", "goal 2", "goal 3"],
      "painPoints": ["pain 1", "pain 2", "pain 3"],
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
- "CTO at 100-300 employee fintech startups who need to achieve SOC2 compliance before Series B but are overwhelmed that security audits keep finding vulnerabilities and monthly penetration testing is no longer sufficient"

Generate 5 personas now.`;
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
   * Parse personas response from AI
   */
  parsePersonasResponse(response) {
    try {
      // Extract JSON from response (may have markdown code blocks)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate structure
      if (!parsed.personas || !Array.isArray(parsed.personas)) {
        throw new Error('Invalid personas structure in response');
      }

      // Validate each persona has required fields
      parsed.personas.forEach((persona, index) => {
        if (!persona.title || !persona.narrative || !persona.goals || !persona.painPoints) {
          throw new Error(`Persona ${index + 1} missing required fields`);
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
      personas: [
        {
          id: "persona-fallback-1",
          title: "VP of Sales",
          role: "Economic Buyer",
          narrative: `VP of Sales at growth-stage B2B companies who need to hit aggressive revenue targets but are frustrated that their team lacks visibility into buyer needs and generic sales pitches are no longer converting`,
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
          demographics: {
            companySize: "50-200 employees",
            industry: "Technology",
            location: "Global"
          },
          psychographics: {
            motivations: "Prove marketing ROI, drive pipeline growth",
            fears: "Budget cuts, poor lead quality, attribution issues"
          }
        },
        {
          id: "persona-fallback-3",
          title: "Founder & CEO",
          role: "Economic Buyer",
          narrative: `Founder & CEO at early-stage startups who need to find product-market fit quickly but are overwhelmed that customer discovery is too slow and most prospects don't convert`,
          goals: [
            "Validate product-market fit",
            "Accelerate customer acquisition",
            "Build repeatable sales process"
          ],
          painPoints: [
            "Unclear who the ideal customer is",
            "Wasting time on poor-fit prospects",
            "No systematic approach to sales"
          ],
          demographics: {
            companySize: "Seed to Series A",
            industry: "Startups",
            location: "Tech hubs"
          },
          psychographics: {
            motivations: "Achieve PMF, secure next funding round, build sustainable business",
            fears: "Running out of runway, building wrong product, slow growth"
          }
        }
      ]
    };
  }
}

export default new DemoICPService();
