import config from '../config/index.js';
import logger from '../utils/logger.js';
import { recordAIMetric, retryOperation } from '../middleware/performanceMonitoring.js';

class AIService {
  constructor() {
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    this.openaiApiKey = process.env.OPENAI_API_KEY;
  }

  /**
   * Generate ICP (Ideal Customer Profile) analysis using AI
   */
  async generateICPAnalysis(customerData, businessContext = {}) {
    const startTime = Date.now();

    try {
      const prompt = this.buildICPPrompt(customerData, businessContext);

      // Wrap API call with retry logic (max 3 retries)
      const aiResponse = await retryOperation(
        () => this.callAnthropicAPI(prompt, {
          model: 'claude-3-opus-20240229',
          max_tokens: 2000,
          temperature: 0.7
        }),
        {
          maxRetries: 3,
          delayMs: 1000,
          operationName: 'generateICP'
        }
      );

      const icpAnalysis = this.parseICPResponse(aiResponse.text);

      logger.info(`Generated ICP analysis for customer ${customerData.customerId}`);

      // Calculate estimated cost
      const estimatedCost = this.calculateCost(aiResponse.usage, aiResponse.model);

      // Record successful AI call metric with token usage
      recordAIMetric({
        operation: 'generateICP',
        duration: Date.now() - startTime,
        success: true,
        customerId: customerData.customerId,
        inputTokens: aiResponse.usage.inputTokens,
        outputTokens: aiResponse.usage.outputTokens,
        totalTokens: aiResponse.usage.totalTokens,
        estimatedCost: estimatedCost,
        model: aiResponse.model
      });

      return {
        success: true,
        data: icpAnalysis,
        metadata: {
          generatedAt: new Date().toISOString(),
          model: 'claude-3-opus-20240229',
          confidence: this.calculateConfidence(icpAnalysis),
          source: 'ai_generated',
          duration: Date.now() - startTime
        }
      };
    } catch (error) {
      logger.error(`Failed to generate ICP analysis: ${error.message}`);

      // Record failed AI call metric
      recordAIMetric({
        operation: 'generateICP',
        duration: Date.now() - startTime,
        success: false,
        error: error.message,
        customerId: customerData.customerId
      });

      return {
        success: false,
        error: error.message,
        fallback: this.getICPFallback(customerData)
      };
    }
  }

  /**
   * Generate ICP analysis with streaming support
   * @param {Object} customerData - Customer data
   * @param {Object} businessContext - Business context
   * @param {Function} onProgress - Callback for progress updates (progress, stage)
   * @returns {Promise<Object>} Result with ICP data
   */
  async generateICPAnalysisStreaming(customerData, businessContext = {}, onProgress = null) {
    const startTime = Date.now();

    try {
      const prompt = this.buildICPPrompt(customerData, businessContext);

      logger.info(`Starting streaming ICP generation for customer ${customerData.customerId}`);

      // Wrap streaming API call with retry logic
      const aiResponse = await retryOperation(
        () => this.callAnthropicAPIStreaming(
          prompt,
          {
            model: 'claude-3-opus-20240229',
            max_tokens: 2000,
            temperature: 0.7
          },
          (progress, chunk) => {
            // Map streaming progress to user-friendly stages
            let stage = 'Andru is thinking...';
            if (progress < 30) {
              stage = 'Analyzing your product...';
            } else if (progress < 60) {
              stage = 'Identifying customer segments...';
            } else if (progress < 90) {
              stage = 'Crafting buyer personas...';
            } else {
              stage = 'Finalizing analysis...';
            }

            if (onProgress) {
              onProgress(progress, stage);
            }
          }
        ),
        {
          maxRetries: 2, // Fewer retries for streaming (it's more expensive)
          delayMs: 1500,
          operationName: 'generateICPStreaming'
        }
      );

      const icpAnalysis = this.parseICPResponse(aiResponse.text);

      logger.info(`Streaming ICP generation completed for customer ${customerData.customerId}`);

      // Calculate estimated cost
      const estimatedCost = this.calculateCost(aiResponse.usage, aiResponse.model);

      // Record successful streaming AI call metric with token usage
      recordAIMetric({
        operation: 'generateICPStreaming',
        duration: Date.now() - startTime,
        success: true,
        customerId: customerData.customerId,
        inputTokens: aiResponse.usage.inputTokens,
        outputTokens: aiResponse.usage.outputTokens,
        totalTokens: aiResponse.usage.totalTokens,
        estimatedCost: estimatedCost,
        model: aiResponse.model
      });

      return {
        success: true,
        data: icpAnalysis,
        metadata: {
          generatedAt: new Date().toISOString(),
          model: 'claude-3-opus-20240229',
          confidence: this.calculateConfidence(icpAnalysis),
          source: 'ai_generated',
          streaming: true,
          duration: Date.now() - startTime
        }
      };
    } catch (error) {
      logger.error(`Failed to generate streaming ICP analysis: ${error.message}`);

      // Record failed AI call metric
      recordAIMetric({
        operation: 'generateICPStreaming',
        duration: Date.now() - startTime,
        success: false,
        error: error.message,
        customerId: customerData.customerId
      });

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
    const startTime = Date.now();

    try {
      const prompt = this.buildCostCalculationPrompt(customerData, inputData);

      // Wrap API call with retry logic
      const aiResponse = await retryOperation(
        () => this.callAnthropicAPI(prompt, {
          model: 'claude-3-opus-20240229',
          max_tokens: 1500,
          temperature: 0.5
        }),
        {
          maxRetries: 3,
          delayMs: 1000,
          operationName: 'generateCostCalculation'
        }
      );

      const costAnalysis = this.parseCostCalculationResponse(aiResponse.text, inputData);

      logger.info(`Generated cost calculation for customer ${customerData.customerId}`);

      // Calculate estimated cost
      const estimatedCost = this.calculateCost(aiResponse.usage, aiResponse.model);

      // Record successful AI call metric with token usage
      recordAIMetric({
        operation: 'generateCostCalculation',
        duration: Date.now() - startTime,
        success: true,
        customerId: customerData.customerId,
        inputTokens: aiResponse.usage.inputTokens,
        outputTokens: aiResponse.usage.outputTokens,
        totalTokens: aiResponse.usage.totalTokens,
        estimatedCost: estimatedCost,
        model: aiResponse.model
      });

      return {
        success: true,
        data: costAnalysis,
        metadata: {
          generatedAt: new Date().toISOString(),
          model: 'claude-3-opus-20240229',
          confidence: this.calculateConfidence(costAnalysis),
          source: 'ai_generated',
          duration: Date.now() - startTime
        }
      };
    } catch (error) {
      logger.error(`Failed to generate cost calculation: ${error.message}`);

      // Record failed AI call metric
      recordAIMetric({
        operation: 'generateCostCalculation',
        duration: Date.now() - startTime,
        success: false,
        error: error.message,
        customerId: customerData.customerId
      });

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
    const startTime = Date.now();

    try {
      const prompt = this.buildBusinessCasePrompt(customerData, requirements);

      // Wrap API call with retry logic
      const aiResponse = await retryOperation(
        () => this.callAnthropicAPI(prompt, {
          model: 'claude-3-opus-20240229',
          max_tokens: 3000,
          temperature: 0.6
        }),
        {
          maxRetries: 3,
          delayMs: 1000,
          operationName: 'generateBusinessCase'
        }
      );

      const businessCase = this.parseBusinessCaseResponse(aiResponse.text);

      logger.info(`Generated business case for customer ${customerData.customerId}`);

      // Calculate estimated cost
      const estimatedCost = this.calculateCost(aiResponse.usage, aiResponse.model);

      // Record successful AI call metric with token usage
      recordAIMetric({
        operation: 'generateBusinessCase',
        duration: Date.now() - startTime,
        success: true,
        customerId: customerData.customerId,
        inputTokens: aiResponse.usage.inputTokens,
        outputTokens: aiResponse.usage.outputTokens,
        totalTokens: aiResponse.usage.totalTokens,
        estimatedCost: estimatedCost,
        model: aiResponse.model
      });

      return {
        success: true,
        data: businessCase,
        metadata: {
          generatedAt: new Date().toISOString(),
          model: 'claude-3-opus-20240229',
          confidence: this.calculateConfidence(businessCase),
          source: 'ai_generated',
          duration: Date.now() - startTime
        }
      };
    } catch (error) {
      logger.error(`Failed to generate business case: ${error.message}`);

      // Record failed AI call metric
      recordAIMetric({
        operation: 'generateBusinessCase',
        duration: Date.now() - startTime,
        success: false,
        error: error.message,
        customerId: customerData.customerId
      });

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

Focus on how the product's distinguishing features and business model influence the ideal customer profile. Consider the specific pain points this product solves and the type of companies that would benefit most from it.

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

    const modelToUse = options.model || 'claude-3-opus-20240229';
    logger.info(`🤖 Calling Anthropic API with model: ${modelToUse}`);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.anthropicApiKey,
        'Anthropic-Version': '2023-06-01'
      },
      body: JSON.stringify({
        model: modelToUse,
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

    // Extract token usage data from response
    const usage = result.usage || {};
    const responseText = result.content[0].text;

    // Return both text and usage data
    return {
      text: responseText,
      usage: {
        inputTokens: usage.input_tokens || 0,
        outputTokens: usage.output_tokens || 0,
        totalTokens: (usage.input_tokens || 0) + (usage.output_tokens || 0)
      },
      model: modelToUse
    };
  }

  /**
   * Call Anthropic Claude API with streaming
   * @param {string} prompt - The prompt to send
   * @param {Object} options - API options
   * @param {Function} onProgress - Callback for progress updates (progress, chunk)
   * @returns {Promise<string>} Complete response text
   */
  async callAnthropicAPIStreaming(prompt, options = {}, onProgress = null) {
    if (!this.anthropicApiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const modelToUse = options.model || 'claude-3-opus-20240229';
    logger.info(`🤖 Calling Anthropic API (streaming) with model: ${modelToUse}`);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.anthropicApiKey,
        'Anthropic-Version': '2023-06-01'
      },
      body: JSON.stringify({
        model: modelToUse,
        max_tokens: options.max_tokens || 2000,
        temperature: options.temperature || 0.7,
        stream: true, // Enable streaming
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

    // Process the streaming response
    let fullText = '';
    let bytesReceived = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    const estimatedTotalBytes = (options.max_tokens || 2000) * 4; // Rough estimate: 4 bytes per token

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        bytesReceived += value.length;
        const chunk = decoder.decode(value, { stream: true });

        // Parse SSE (Server-Sent Events) format
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            // Skip control messages
            if (data === '[DONE]' || !data.trim()) continue;

            try {
              const parsed = JSON.parse(data);

              // Handle content_block_delta events (text chunks)
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                fullText += parsed.delta.text;

                // Notify progress callback if provided
                if (onProgress) {
                  const progress = Math.min(95, Math.round((bytesReceived / estimatedTotalBytes) * 100));
                  onProgress(progress, parsed.delta.text);
                }
              }

              // Capture usage data from message_delta event
              if (parsed.type === 'message_delta' && parsed.usage) {
                outputTokens = parsed.usage.output_tokens || 0;
              }

              // Capture usage data from message_start event
              if (parsed.type === 'message_start' && parsed.message?.usage) {
                inputTokens = parsed.message.usage.input_tokens || 0;
              }
            } catch (e) {
              // Skip unparseable lines
            }
          }
        }
      }

      // Final progress update
      if (onProgress) {
        onProgress(100, '');
      }

      logger.info(`🤖 Streaming complete: ${fullText.length} characters received`);

      // Return text and usage data
      return {
        text: fullText,
        usage: {
          inputTokens: inputTokens,
          outputTokens: outputTokens,
          totalTokens: inputTokens + outputTokens
        },
        model: modelToUse
      };
    } finally {
      reader.releaseLock();
    }
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
   * Calculate cost of API call based on token usage
   * Pricing as of November 2025
   */
  calculateCost(usage, model) {
    const { inputTokens, outputTokens } = usage;

    // Pricing per 1M tokens (in dollars)
    const pricing = {
      'claude-3-opus-20240229': { input: 15, output: 75 },
      'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
      'claude-3-5-haiku-20241022': { input: 0.25, output: 1.25 }
    };

    const modelPricing = pricing[model] || pricing['claude-3-opus-20240229'];

    const inputCost = (inputTokens / 1000000) * modelPricing.input;
    const outputCost = (outputTokens / 1000000) * modelPricing.output;
    const totalCost = inputCost + outputCost;

    return parseFloat(totalCost.toFixed(6)); // Return cost in dollars (6 decimal precision)
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