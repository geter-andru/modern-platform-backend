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
        model: 'claude-3-sonnet-20240229',
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
        model: 'claude-3-sonnet-20240229',
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
        model: 'claude-3-sonnet-20240229',
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
    return `You are an expert B2B sales strategist. Generate a comprehensive Ideal Customer Profile (ICP) analysis based on the following information:

Customer Information:
- Company: ${customerData.company || 'Not specified'}
- Industry: ${businessContext.industry || 'Technology'}
- Company Size: ${businessContext.companySize || 'Medium'}
- Current Challenges: ${businessContext.currentChallenges?.join(', ') || 'Scalability, efficiency, growth'}
- Goals: ${businessContext.goals?.join(', ') || 'Increase revenue, improve operations'}

Please provide a structured ICP analysis with:

1. Title and Description
2. Top 3-5 Customer Segments (with names, scores 1-100, and specific criteria)
3. Key Buying Indicators (5-8 indicators)
4. Red Flags to avoid (3-5 red flags)
5. Rating Criteria (4-5 criteria with weights and descriptions)

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
        model: options.model || 'claude-3-sonnet-20240229',
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
      ]
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