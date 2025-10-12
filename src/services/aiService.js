import config from '../config/index.js';
import logger from '../utils/logger.js';

class AIService {
  constructor() {
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    this.openaiApiKey = process.env.OPENAI_API_KEY;
  }

  /**
   * Generate ICP (Ideal Customer Profile) analysis using AI
   */
  async generateICPAnalysis(customerData, businessContext = {}) {
    try {
      const prompt = this.buildICPPrompt(customerData, businessContext);
      
      const aiResponse = await this.callAnthropicAPI(prompt, {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        temperature: 0.7
      });

      const icpAnalysis = this.parseICPResponse(aiResponse);
      
      logger.info(`Generated ICP analysis for customer ${customerData.customerId}`);
      
      return {
        success: true,
        data: icpAnalysis,
        metadata: {
          generatedAt: new Date().toISOString(),
          model: 'claude-3-sonnet',
          confidence: this.calculateConfidence(icpAnalysis),
          source: 'ai_generated'
        }
      };
    } catch (error) {
      logger.error(`Failed to generate ICP analysis: ${error.message}`);
      return {
        success: false,
        error: error.message,
        fallback: this.getICPFallback(customerData)
      };
    }
  }

  /**
   * Generate cost of inaction calculation with AI insights
   */
  async generateCostCalculation(customerData, inputData) {
    try {
      const prompt = this.buildCostCalculationPrompt(customerData, inputData);
      
      const aiResponse = await this.callAnthropicAPI(prompt, {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1500,
        temperature: 0.5
      });

      const costAnalysis = this.parseCostCalculationResponse(aiResponse, inputData);
      
      logger.info(`Generated cost calculation for customer ${customerData.customerId}`);
      
      return {
        success: true,
        data: costAnalysis,
        metadata: {
          generatedAt: new Date().toISOString(),
          model: 'claude-3-sonnet',
          confidence: this.calculateConfidence(costAnalysis),
          source: 'ai_generated'
        }
      };
    } catch (error) {
      logger.error(`Failed to generate cost calculation: ${error.message}`);
      return {
        success: false,
        error: error.message,
        fallback: this.getCostCalculationFallback(inputData)
      };
    }
  }

  /**
   * Generate business case with AI
   */
  async generateBusinessCase(customerData, requirements) {
    try {
      const prompt = this.buildBusinessCasePrompt(customerData, requirements);
      
      const aiResponse = await this.callAnthropicAPI(prompt, {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 3000,
        temperature: 0.6
      });

      const businessCase = this.parseBusinessCaseResponse(aiResponse);
      
      logger.info(`Generated business case for customer ${customerData.customerId}`);
      
      return {
        success: true,
        data: businessCase,
        metadata: {
          generatedAt: new Date().toISOString(),
          model: 'claude-3-sonnet',
          confidence: this.calculateConfidence(businessCase),
          source: 'ai_generated'
        }
      };
    } catch (error) {
      logger.error(`Failed to generate business case: ${error.message}`);
      return {
        success: false,
        error: error.message,
        fallback: this.getBusinessCaseFallback(requirements)
      };
    }
  }

  /**
   * Build ICP analysis prompt
   */
  buildICPPrompt(customerData, businessContext) {
    // Extract product information from businessContext
    const productInfo = businessContext.productInfo || {};
    const productContext = productInfo.name ? `
Product Information:
- Product Name: ${productInfo.name}
- Product Description: ${productInfo.description || 'Not specified'}
- Distinguishing Feature: ${productInfo.distinguishingFeature || 'Not specified'}
- Business Model: ${productInfo.businessModel || 'Not specified'}
` : '';

    return `You are an expert B2B sales strategist. Generate a comprehensive Ideal Customer Profile (ICP) analysis based on the following information:

${productContext}

Customer Information:
- Company: ${customerData.company || 'Not specified'}
- Industry: ${businessContext.industry || 'Technology'}
- Company Size: ${businessContext.companySize || 'Medium'}
- Current Challenges: ${businessContext.currentChallenges?.join(', ') || 'Scalability, efficiency, growth'}
- Goals: ${businessContext.goals?.join(', ') || 'Increase revenue, improve operations'}

Please analyze the ideal customer profile by considering these 10 criteria in detail:

1. Firmographics: Company size, industry, geographic location, company structure, growth stage
2. Technographics: Technology stack, sophistication level, infrastructure preferences
3. Budget and Financial Considerations: Budget range, financial health, spending patterns
4. Pain Points and Challenges: Business problems solved, operational inefficiencies addressed
5. Goals and Objectives: Short/long-term objectives, growth targets, strategic initiatives
6. Decision-Making Process: Key decision-makers, buying committee, sales cycle, evaluation methods
7. Behavioral Characteristics: Buying behavior, brand preferences, risk tolerance, innovation appetite
8. Value Drivers: Solution aspects valued most, ROI expectations, success metrics
9. Engagement Preferences: Communication channels, content habits, marketing approaches
10. Current Solution Landscape: Existing solutions, satisfaction levels, solution gaps

Based on this analysis, provide a structured ICP analysis with:

1. Title and Description (tailored to the specific product)
2. Top 3-5 Customer Segments (with names, scores 1-100, and specific criteria that align with the product's value proposition)
3. Key Buying Indicators (5-8 indicators that signal readiness for this specific product)
4. Red Flags to avoid (3-5 red flags that indicate poor fit for this product)
5. Rating Criteria (4-5 criteria with weights and descriptions specific to this product's ideal customers)
6. **Buyer Personas (2-3 detailed personas)**: Generate specific individual buyer personas (not generic roles) with:
   - Personal details: name, title, role (CEO, CTO, VP Sales, etc.)
   - Demographics: age range, experience level, education, location, company size, industry
   - Psychographics: values, motivations, fears, personality type, work style, communication style
   - Professional goals: specific measurable goals (e.g., "Scale from $2M to $10M ARR")
   - Pain points: specific challenges they face (e.g., "Cannot accurately forecast revenue pipeline")
   - Buying behavior: research style, risk tolerance, decision speed, information sources, evaluation criteria
   - Communication preferences: preferred channels, communication style, meeting preferences, follow-up frequency
   - Technology usage: current tools, tech savviness, preferred platforms, integration requirements
   - Decision influence: influencers, decision factors, approval process, budget authority, timeline
   - Objections: common objections they might raise
   - Information sources: where they learn about solutions

Focus on how the product's distinguishing features and business model influence the ideal customer profile. Consider the specific pain points this product solves and the type of companies that would benefit most from it.

CRITICAL: Generate realistic buyer personas with actual names (e.g., "Sarah Chen", "Marcus Rodriguez") and specific, actionable details. Avoid generic descriptions.

Format your response as valid JSON with the following structure:
{
  "title": "Ideal Customer Profile Framework",
  "description": "Brief description of the ICP",
  "segments": [
    {
      "name": "Segment Name",
      "score": 95,
      "criteria": ["criterion1", "criterion2", "criterion3"]
    }
  ],
  "keyIndicators": ["indicator1", "indicator2"],
  "redFlags": ["flag1", "flag2"],
  "ratingCriteria": [
    {
      "name": "Criteria Name",
      "weight": 25,
      "description": "Description of criteria"
    }
  ],
  "buyerPersonas": [
    {
      "id": "persona-1",
      "name": "Sarah Chen",
      "role": "CEO",
      "title": "CEO & Co-Founder",
      "demographics": {
        "ageRange": "35-45",
        "experience": "15+ years in tech",
        "education": "Computer Science degree",
        "location": "San Francisco Bay Area",
        "companySize": "50-200 employees",
        "industry": "B2B SaaS"
      },
      "psychographics": {
        "values": ["Systematic efficiency", "Data-driven decisions", "Long-term thinking"],
        "motivations": ["Achieve predictable growth", "Build world-class team"],
        "fears": ["Missing fundraising targets", "Losing board credibility"],
        "personality": "INTJ (Architect)",
        "workStyle": "Analytical, systematic, data-focused",
        "communicationStyle": "Direct, technical, evidence-based"
      },
      "goals": ["Scale from $2M to $10M ARR", "Build repeatable sales motion"],
      "painPoints": ["Cannot forecast pipeline", "Losing deals to competitors"],
      "buyingBehavior": {
        "researchStyle": "Thorough technical evaluation",
        "riskTolerance": "Low - needs proven ROI",
        "decisionSpeed": "Deliberate - 2-4 weeks",
        "informationSources": ["Peer recommendations", "Technical docs", "Case studies"],
        "evaluationCriteria": ["ROI proof", "Integration ease", "Technical credibility"],
        "decisionProcess": "Analytical evaluation → ROI validation → Implementation planning"
      },
      "communicationPreferences": {
        "preferredChannels": ["Email", "Product demos", "Documentation"],
        "communicationStyle": "Technical, direct, data-driven",
        "meetingPreferences": "Concise, agenda-driven, outcome-focused",
        "followUpFrequency": "Weekly updates",
        "contentPreferences": ["Case studies", "ROI calculators", "Technical whitepapers"]
      },
      "technologyUsage": {
        "currentTools": ["HubSpot", "Salesforce", "Gong"],
        "techSavviness": "Very high - technical founder",
        "preferredPlatforms": ["Web app", "API integrations"],
        "integrationRequirements": ["CRM sync", "Sales automation", "Data export"]
      },
      "decisionInfluence": {
        "influencers": ["Board members", "VP Sales", "CFO"],
        "decisionFactors": ["ROI", "Team impact", "Implementation time"],
        "approvalProcess": "CEO decision with board visibility",
        "budgetAuthority": "Full authority up to $50K",
        "timeline": "2-4 weeks for tools, 1-3 months for platforms"
      },
      "objections": ["Does this work for B2B SaaS?", "How long until results?"],
      "informationSources": ["SaaStr community", "Y Combinator network", "Industry analysts"]
    }
  ]
}`;
  }

  /**
   * Build cost calculation prompt
   */
  buildCostCalculationPrompt(customerData, inputData) {
    return `You are a financial analyst specializing in cost of inaction calculations. Analyze the following scenario and provide insights:

Customer: ${customerData.company}
Industry: ${inputData.industry || 'Technology'}

Input Parameters:
- Potential Deals: ${inputData.potentialDeals}
- Average Deal Size: $${inputData.averageDealSize}
- Conversion Rate: ${(inputData.conversionRate * 100).toFixed(1)}%
- Delay Period: ${inputData.delayMonths} months
- Current Operating Cost: $${inputData.currentOperatingCost}
- Inefficiency Rate: ${(inputData.inefficiencyRate * 100).toFixed(1)}%
- Employee Count: ${inputData.employeeCount}
- Average Salary: $${inputData.averageSalary}
- Market Share: ${(inputData.marketShare * 100).toFixed(1)}%

Provide analysis with:
1. Detailed cost breakdown by category
2. AI-powered insights about hidden costs
3. Industry-specific recommendations
4. Risk assessment

Format as JSON:
{
  "totalCost": calculated_total,
  "categories": {
    "lostRevenue": amount,
    "operationalInefficiency": amount,
    "competitiveLoss": amount,
    "productivityLoss": amount
  },
  "breakdown": {
    "detailed breakdown per category"
  },
  "insights": ["insight1", "insight2"],
  "recommendations": ["rec1", "rec2"]
}`;
  }

  /**
   * Build business case prompt
   */
  buildBusinessCasePrompt(customerData, requirements) {
    return `You are a business case expert. Create a compelling business case based on:

Customer: ${customerData.company}
Case Type: ${requirements.caseType}
Industry: ${requirements.industry}
Company Size: ${requirements.companySize}
Budget: $${requirements.budget}
Timeline: ${requirements.timeline} months
Objectives: ${requirements.objectives?.join(', ')}
Success Metrics: ${requirements.successMetrics?.join(', ')}

Create a comprehensive business case with:
1. Executive Summary
2. Problem Statement
3. Proposed Solution
4. Financial Projections
5. Implementation Plan
6. Risk Assessment
7. Success Metrics
8. Recommendations

Format as JSON:
{
  "title": "Business Case Title",
  "executiveSummary": "Summary text",
  "problemStatement": "Problem description",
  "proposedSolution": "Solution description",
  "financialProjections": {
    "roi": percentage,
    "paybackPeriod": months,
    "npv": amount,
    "benefits": ["benefit1", "benefit2"]
  },
  "implementationPlan": {
    "phases": ["phase1", "phase2"],
    "timeline": "timeline description",
    "resources": ["resource1", "resource2"]
  },
  "riskAssessment": {
    "risks": ["risk1", "risk2"],
    "mitigation": ["strategy1", "strategy2"]
  },
  "successMetrics": ["metric1", "metric2"],
  "recommendations": ["rec1", "rec2"]
}`;
  }

  /**
   * Call Anthropic Claude API
   */
  async callAnthropicAPI(prompt, options = {}) {
    if (!this.anthropicApiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.anthropicApiKey,
        'Anthropic-Version': '2023-06-01'
      },
      body: JSON.stringify({
        model: options.model || 'claude-3-5-sonnet-20241022',
        max_tokens: options.max_tokens || 2000,
        temperature: options.temperature || 0.7,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result.content[0].text;
  }

  /**
   * Parse ICP response from AI
   */
  parseICPResponse(response) {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate required fields
      if (!parsed.title || !parsed.segments || !Array.isArray(parsed.segments)) {
        throw new Error('Invalid ICP response structure');
      }

      // Validate buyer personas (critical for Priority #3 Technical Translation)
      if (!parsed.buyerPersonas || !Array.isArray(parsed.buyerPersonas)) {
        logger.warn('No buyer personas in AI response, adding fallback personas');
        parsed.buyerPersonas = this.getFallbackBuyerPersonas();
      } else if (parsed.buyerPersonas.length === 0) {
        logger.warn('Empty buyer personas array, adding fallback personas');
        parsed.buyerPersonas = this.getFallbackBuyerPersonas();
      } else {
        // Validate persona structure
        parsed.buyerPersonas = parsed.buyerPersonas.map((persona, index) => {
          if (!persona.id) persona.id = `persona-${index + 1}`;
          if (!persona.name) persona.name = `Buyer Persona ${index + 1}`;
          if (!persona.role) persona.role = index === 0 ? 'CEO' : 'VP Sales';
          if (!persona.title) persona.title = persona.role;
          if (!persona.goals || !Array.isArray(persona.goals)) persona.goals = [];
          if (!persona.painPoints || !Array.isArray(persona.painPoints)) persona.painPoints = [];
          return persona;
        });
        logger.info(`Validated ${parsed.buyerPersonas.length} buyer personas`);
      }

      return parsed;
    } catch (error) {
      logger.warn(`Failed to parse ICP response: ${error.message}`);
      return this.getICPFallback();
    }
  }

  /**
   * Parse cost calculation response
   */
  parseCostCalculationResponse(response, inputData) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Ensure we have the basic calculation
      if (!parsed.totalCost) {
        parsed.totalCost = this.calculateBasicCost(inputData);
      }
      
      return parsed;
    } catch (error) {
      logger.warn(`Failed to parse cost calculation response: ${error.message}`);
      return this.getCostCalculationFallback(inputData);
    }
  }

  /**
   * Parse business case response
   */
  parseBusinessCaseResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.warn(`Failed to parse business case response: ${error.message}`);
      return this.getBusinessCaseFallback();
    }
  }

  /**
   * Calculate confidence score based on content quality
   */
  calculateConfidence(content) {
    let confidence = 70; // Base confidence
    
    if (content.title && content.title.length > 10) confidence += 5;
    if (content.description && content.description.length > 50) confidence += 5;
    if (content.segments && content.segments.length >= 3) confidence += 10;
    if (content.insights && content.insights.length > 0) confidence += 5;
    if (content.recommendations && content.recommendations.length > 0) confidence += 5;
    
    return Math.min(confidence, 95);
  }

  /**
   * Calculate basic cost for fallback
   */
  calculateBasicCost(inputData) {
    const lostRevenue = inputData.potentialDeals * inputData.averageDealSize * inputData.conversionRate * (inputData.delayMonths / 12);
    const operationalCost = inputData.currentOperatingCost * inputData.inefficiencyRate * (inputData.delayMonths / 12);
    const productivityLoss = inputData.employeeCount * inputData.averageSalary * 0.05 * (inputData.delayMonths / 12);
    
    return Math.round(lostRevenue + operationalCost + productivityLoss);
  }

  /**
   * Generate fallback buyer personas
   */
  getFallbackBuyerPersonas(companyName = 'Target Company', industry = 'Technology') {
    return [
      {
        id: 'fallback-ceo',
        name: 'Alex Johnson',
        role: 'CEO',
        title: 'CEO & Co-Founder',
        demographics: {
          ageRange: '35-45',
          experience: '15+ years in technology',
          education: 'Computer Science or Business degree',
          location: 'Major tech hub',
          companySize: '50-200 employees',
          industry: industry
        },
        psychographics: {
          values: ['Systematic efficiency', 'Data-driven decisions', 'Long-term strategic thinking'],
          motivations: ['Achieve predictable revenue growth', 'Build world-class team', 'Scale operations systematically'],
          fears: ['Missing fundraising targets', 'Losing board credibility', 'Making wrong strategic bets'],
          personality: 'Analytical, strategic, results-oriented',
          workStyle: 'Data-focused, systematic, efficient',
          communicationStyle: 'Direct, technical, evidence-based'
        },
        goals: [
          `Scale ${companyName} to next growth stage`,
          'Achieve predictable revenue pipeline',
          'Build repeatable sales process'
        ],
        painPoints: [
          'Cannot accurately forecast revenue',
          'Difficulty articulating business value to economic buyers',
          'Struggling to build scalable sales motion',
          'Limited visibility into pipeline quality'
        ],
        buyingBehavior: {
          researchStyle: 'Thorough evaluation with technical validation',
          riskTolerance: 'Low - needs proven ROI and case studies',
          decisionSpeed: 'Deliberate - 2-4 weeks for tools',
          informationSources: ['Peer recommendations', 'Industry analyst reports', 'Case studies'],
          evaluationCriteria: ['Proven ROI', 'Integration ease', 'Technical credibility', 'Time to value'],
          decisionProcess: 'Research → Demo → ROI validation → Implementation planning'
        },
        communicationPreferences: {
          preferredChannels: ['Email', 'Product demonstrations', 'Technical documentation'],
          communicationStyle: 'Technical, direct, data-driven',
          meetingPreferences: 'Concise, agenda-driven, outcome-focused',
          followUpFrequency: 'Weekly progress updates',
          contentPreferences: ['Case studies', 'ROI calculators', 'Technical whitepapers']
        },
        technologyUsage: {
          currentTools: ['CRM system', 'Sales enablement tools', 'Analytics platforms'],
          techSavviness: 'High - technical background',
          preferredPlatforms: ['Web applications', 'API integrations', 'Mobile apps'],
          integrationRequirements: ['CRM sync', 'Data export', 'API access']
        },
        decisionInfluence: {
          influencers: ['Board members', 'VP Sales', 'CFO', 'CTO'],
          decisionFactors: ['ROI', 'Team productivity', 'Implementation time', 'Total cost of ownership'],
          approvalProcess: 'CEO decision with board visibility',
          budgetAuthority: 'Full authority up to $50K',
          timeline: '2-4 weeks for tools, 1-3 months for platforms'
        },
        objections: [
          'How does this integrate with existing systems?',
          'What\'s the expected ROI and payback period?',
          'How long until we see measurable results?',
          'What if our team resists adoption?'
        ],
        informationSources: [
          'Industry conferences',
          'Peer networks',
          'Industry analysts (Gartner, Forrester)',
          'Product review sites'
        ]
      },
      {
        id: 'fallback-vp-sales',
        name: 'Jordan Martinez',
        role: 'VP Sales',
        title: 'VP of Sales',
        demographics: {
          ageRange: '40-50',
          experience: '20+ years in sales leadership',
          education: 'Business or Marketing degree',
          location: 'Major business hub',
          companySize: '50-200 employees',
          industry: industry
        },
        psychographics: {
          values: ['Results-driven execution', 'Team success', 'Customer satisfaction'],
          motivations: ['Hit revenue targets', 'Build high-performing sales team', 'Improve win rates'],
          fears: ['Missing quota', 'Losing top performers', 'Competitive displacement'],
          personality: 'Competitive, driven, people-focused',
          workStyle: 'Goal-oriented, collaborative, metrics-driven',
          communicationStyle: 'Enthusiastic, outcome-focused, motivational'
        },
        goals: [
          'Achieve quarterly revenue targets',
          'Improve sales team win rate by 20%',
          'Reduce sales cycle length',
          'Build predictable pipeline'
        ],
        painPoints: [
          'Inconsistent sales performance across team',
          'Long sales cycles on enterprise deals',
          'Difficulty articulating ROI to economic buyers',
          'Sales reps struggle with value communication',
          'Low conversion rates on qualified leads'
        ],
        buyingBehavior: {
          researchStyle: 'Fast evaluation focused on team impact',
          riskTolerance: 'Medium - willing to try proven solutions',
          decisionSpeed: 'Fast - 1-2 weeks if ROI is clear',
          informationSources: ['Peer recommendations', 'Sales leader communities', 'Product demos'],
          evaluationCriteria: ['Team adoption', 'Immediate impact', 'Ease of use', 'Integration'],
          decisionProcess: 'Quick demo → Team pilot → Rollout decision'
        },
        communicationPreferences: {
          preferredChannels: ['Phone calls', 'Video meetings', 'Live demos'],
          communicationStyle: 'Enthusiastic, results-focused, people-oriented',
          meetingPreferences: 'Interactive, demo-heavy, results-focused',
          followUpFrequency: 'Frequent check-ins during evaluation',
          contentPreferences: ['Success stories', 'Video case studies', 'Sales playbooks']
        },
        technologyUsage: {
          currentTools: ['Salesforce', 'HubSpot', 'Outreach', 'Gong', 'LinkedIn Sales Navigator'],
          techSavviness: 'Medium - sales tech focused',
          preferredPlatforms: ['Mobile-first', 'CRM-integrated', 'Easy to use'],
          integrationRequirements: ['Salesforce sync', 'Email integration', 'Mobile app']
        },
        decisionInfluence: {
          influencers: ['Sales team', 'CEO', 'Revenue Operations', 'Top performers'],
          decisionFactors: ['Team buy-in', 'Win rate impact', 'Ease of adoption', 'Quick wins'],
          approvalProcess: 'VP Sales recommends, CEO approves',
          budgetAuthority: 'Approval authority up to $25K',
          timeline: '1-2 weeks for sales tools'
        },
        objections: [
          'Will my team actually use this?',
          'How quickly can we see results?',
          'What\'s the learning curve?',
          'Does this work with our CRM?'
        ],
        informationSources: [
          'Sales leadership communities',
          'Revenue Collective',
          'Pavilion community',
          'Sales conferences (SaaStr, Sales Hacker)'
        ]
      }
    ];
  }

  /**
   * Fallback ICP data
   */
  getICPFallback(customerData = {}) {
    return {
      title: "Standard ICP Framework",
      description: "Basic ideal customer profile framework",
      segments: [
        {
          name: "Enterprise Technology Companies",
          score: 90,
          criteria: ["500+ employees", "$50M+ revenue", "Growth stage"]
        }
      ],
      keyIndicators: ["Rapid growth", "Technology adoption", "Budget availability"],
      redFlags: ["Budget constraints", "Legacy system dependencies"],
      ratingCriteria: [
        {
          name: "Company Size",
          weight: 30,
          description: "Employee count and revenue"
        }
      ],
      buyerPersonas: this.getFallbackBuyerPersonas(customerData.company, customerData.industry)
    };
  }

  /**
   * Fallback cost calculation
   */
  getCostCalculationFallback(inputData) {
    const totalCost = this.calculateBasicCost(inputData);
    
    return {
      totalCost,
      categories: {
        lostRevenue: Math.round(totalCost * 0.4),
        operationalInefficiency: Math.round(totalCost * 0.3),
        productivityLoss: Math.round(totalCost * 0.3)
      },
      insights: ["Cost calculation based on standard industry metrics"],
      recommendations: ["Consider implementing efficiency improvements"]
    };
  }

  /**
   * Fallback business case
   */
  getBusinessCaseFallback(requirements = {}) {
    return {
      title: `Business Case for ${requirements.caseType || 'Technology Investment'}`,
      executiveSummary: "Standard business case framework",
      problemStatement: "Current operational challenges require strategic solution",
      proposedSolution: "Implement technology solution to address challenges",
      financialProjections: {
        roi: 25,
        paybackPeriod: 18,
        benefits: ["Improved efficiency", "Cost reduction"]
      },
      recommendations: ["Proceed with pilot implementation"]
    };
  }
}

export default new AIService();