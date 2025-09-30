import airtableService from '../services/airtableService.js';
import aiService from '../services/aiService.js';
import makeService from '../services/makeService.js';
import logger from '../utils/logger.js';

const costCalculatorController = {
  // Calculate cost of inaction
  async calculateCost(req, res) {
    try {
      const {
        customerId,
        potentialDeals,
        averageDealSize,
        conversionRate,
        delayMonths,
        currentOperatingCost,
        inefficiencyRate,
        employeeCount,
        averageSalary,
        marketShare,
        scenario = 'realistic'
      } = req.body;

      logger.info(`Calculating cost for customer ${customerId} with scenario ${scenario}`);

      // Scenario multipliers
      const scenarioMultipliers = {
        conservative: 0.8,
        realistic: 1.0,
        aggressive: 1.3
      };

      const multiplier = scenarioMultipliers[scenario];

      // Calculate different cost categories
      const calculations = {
        lostRevenue: {
          formula: 'potentialDeals * averageDealSize * conversionRate * (delayMonths / 12)',
          value: potentialDeals * averageDealSize * conversionRate * (delayMonths / 12) * multiplier,
          description: 'Revenue lost due to delayed sales cycles'
        },
        operationalInefficiencies: {
          formula: 'currentOperatingCost * inefficiencyRate * (delayMonths / 12)',
          value: currentOperatingCost * inefficiencyRate * (delayMonths / 12) * multiplier,
          description: 'Costs from maintaining inefficient processes'
        },
        competitiveDisadvantage: {
          formula: 'marketShare * (potentialDeals * averageDealSize) * 0.08 * (delayMonths / 12)',
          value: marketShare * (potentialDeals * averageDealSize) * 0.08 * (delayMonths / 12) * multiplier,
          description: 'Market position erosion to competitors'
        },
        productivityLosses: {
          formula: 'employeeCount * averageSalary * 0.05 * (delayMonths / 12)',
          value: employeeCount * averageSalary * 0.05 * (delayMonths / 12) * multiplier,
          description: 'Employee time wasted on manual processes'
        }
      };

      // Calculate total cost
      const totalCost = Object.values(calculations).reduce((sum, calc) => sum + calc.value, 0);

      // Calculate potential ROI scenarios
      const roiScenarios = {
        conservative: {
          investment: 25000,
          benefits: totalCost * 0.6,
          roi: ((totalCost * 0.6 - 25000) / 25000 * 100),
          paybackMonths: 25000 / (totalCost * 0.6 / 12)
        },
        realistic: {
          investment: 50000,
          benefits: totalCost * 0.8,
          roi: ((totalCost * 0.8 - 50000) / 50000 * 100),
          paybackMonths: 50000 / (totalCost * 0.8 / 12)
        },
        aggressive: {
          investment: 100000,
          benefits: totalCost * 1.0,
          roi: ((totalCost * 1.0 - 100000) / 100000 * 100),
          paybackMonths: 100000 / (totalCost * 1.0 / 12)
        }
      };

      const result = {
        customerId,
        scenario,
        input: req.body,
        calculations,
        totalCost,
        roiScenarios,
        generatedAt: new Date().toISOString()
      };

      // Save calculation result to customer record
      await airtableService.updateCustomer(customerId, {
        'Cost Calculator Content': JSON.stringify(result),
        'Content Status': 'Ready',
        'Last Accessed': new Date().toISOString()
      });

      // Create user progress record
      await airtableService.createUserProgress(customerId, 'Cost Calculator', {
        calculationType: 'cost_of_inaction',
        scenario,
        totalCost,
        completedAt: new Date().toISOString()
      });

      logger.info(`Cost calculation completed for customer ${customerId}, total cost: $${totalCost.toFixed(2)}`);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error in cost calculation:', error);
      throw error;
    }
  },

  // Get saved cost calculation
  async getCostCalculation(req, res) {
    try {
      const { customerId } = req.params;
      
      logger.info(`Fetching cost calculation for customer ${customerId}`);
      
      const customer = await airtableService.getCustomerById(customerId);
      
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found',
          customerId
        });
      }

      let costData = null;
      if (customer.costCalculatorContent) {
        try {
          costData = JSON.parse(customer.costCalculatorContent);
        } catch (parseError) {
          logger.warn(`Failed to parse cost calculator content for customer ${customerId}:`, parseError);
          costData = { rawContent: customer.costCalculatorContent };
        }
      }

      res.status(200).json({
        success: true,
        data: {
          customerId: customer.customerId,
          costData,
          contentStatus: customer.contentStatus,
          lastAccessed: customer.lastAccessed
        }
      });
    } catch (error) {
      logger.error(`Error fetching cost calculation for customer ${req.params.customerId}:`, error);
      throw error;
    }
  },

  // Save cost calculation
  async saveCostCalculation(req, res) {
    try {
      const { customerId, calculations } = req.body;
      
      // Verify customer exists
      const customer = await airtableService.getCustomerById(customerId);
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found',
          customerId
        });
      }

      // Save to customer record
      await airtableService.updateCustomer(customerId, {
        'Cost Calculator Content': JSON.stringify({
          latestCalculation: calculations,
          savedAt: new Date().toISOString()
        })
      });

      // Create progress record
      await airtableService.createUserProgress({
        'Customer ID': customerId,
        'Tool Name': 'Cost Calculator',
        'Progress Data': JSON.stringify(calculations),
        'Updated At': new Date().toISOString()
      });

      res.status(200).json({
        success: true,
        data: {
          customerId,
          saved: true
        }
      });
    } catch (error) {
      logger.error(`Error saving cost calculation for customer ${req.body.customerId}:`, error);
      throw error;
    }
  },

  // Get cost calculation history
  async getCostCalculationHistory(req, res) {
    try {
      const { customerId } = req.params;
      
      // Get customer with cost calculation content
      const customer = await airtableService.getCustomerById(customerId);
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found',
          customerId
        });
      }

      let history = [];
      if (customer.costCalculatorContent) {
        try {
          const content = JSON.parse(customer.costCalculatorContent);
          history = content.history || [];
        } catch (parseError) {
          logger.warn(`Malformed cost calculator JSON for customer ${customerId}:`, parseError);
        }
      }

      res.status(200).json({
        success: true,
        data: {
          customerId,
          history
        }
      });
    } catch (error) {
      logger.error(`Error fetching cost calculation history for customer ${req.params.customerId}:`, error);
      throw error;
    }
  },

  // Compare cost scenarios
  async compareCostScenarios(req, res) {
    try {
      const { customerId, baseInputs, scenarios } = req.body;

      const comparisons = [];
      const scenarioMultipliers = {
        conservative: 0.8,
        realistic: 1.0,
        aggressive: 1.3
      };

      for (const scenario of scenarios) {
        if (!scenarioMultipliers[scenario.toLowerCase()]) {
          return res.status(400).json({
            success: false,
            error: 'Validation Error',
            details: `Invalid scenario: ${scenario}`
          });
        }

        const multiplier = scenarioMultipliers[scenario.toLowerCase()];
        
        // Calculate for this scenario
        const totalCost = (
          (baseInputs.potentialDeals || 0) * (baseInputs.averageDealSize || 0) * 
          (baseInputs.conversionRate || 0.15) * ((baseInputs.delayMonths || 0) / 12)
        ) * multiplier;

        comparisons.push({
          scenario,
          totalCost,
          multiplier,
          inputs: { ...baseInputs, scenario }
        });
      }

      res.status(200).json({
        success: true,
        data: {
          customerId,
          comparisons
        }
      });
    } catch (error) {
      logger.error(`Error comparing cost scenarios for customer ${req.body.customerId}:`, error);
      throw error;
    }
  },

  // AI-enhanced cost calculation with insights
  async calculateCostWithAI(req, res) {
    try {
      const inputData = req.body;
      const { customerId } = inputData;

      logger.info(`Calculating AI-enhanced cost analysis for customer ${customerId}`);

      // Get customer data
      const customer = await airtableService.getCustomerById(customerId);
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
      }

      // First perform standard calculation
      const {
        potentialDeals, averageDealSize, conversionRate, delayMonths,
        currentOperatingCost, inefficiencyRate, employeeCount,
        averageSalary, marketShare, scenario = 'realistic'
      } = inputData;

      // Standard cost calculation
      const lostRevenue = potentialDeals * averageDealSize * conversionRate * (delayMonths / 12);
      const operationalCost = currentOperatingCost * inefficiencyRate * (delayMonths / 12);
      const productivityLoss = employeeCount * averageSalary * 0.05 * (delayMonths / 12);
      const competitiveLoss = averageDealSize * potentialDeals * marketShare * 0.1 * (delayMonths / 12);

      const scenarioMultipliers = {
        conservative: 0.8,
        realistic: 1.0,
        aggressive: 1.3
      };

      const multiplier = scenarioMultipliers[scenario];
      const baseTotalCost = (lostRevenue + operationalCost + productivityLoss + competitiveLoss) * multiplier;

      const standardCalculation = {
        totalCost: Math.round(baseTotalCost),
        breakdown: {
          lostRevenue: Math.round(lostRevenue * multiplier),
          operationalCost: Math.round(operationalCost * multiplier),
          productivityLoss: Math.round(productivityLoss * multiplier),
          competitiveLoss: Math.round(competitiveLoss * multiplier)
        },
        scenario,
        multiplier
      };

      // Generate AI insights
      const aiResult = await aiService.generateCostCalculation(customer, inputData);

      let finalResult;
      if (aiResult.success) {
        // Combine standard calculation with AI insights
        finalResult = {
          ...standardCalculation,
          aiInsights: aiResult.data.insights || [],
          aiRecommendations: aiResult.data.recommendations || [],
          confidenceScore: aiResult.metadata.confidence,
          enhancedAnalysis: aiResult.data.breakdown || {},
          source: 'ai_enhanced'
        };
      } else {
        // Fall back to standard calculation with basic insights
        finalResult = {
          ...standardCalculation,
          insights: ['Basic cost calculation completed'],
          recommendations: ['Consider reviewing delay factors'],
          confidenceScore: 75,
          source: 'standard_calculation'
        };
      }

      // Save the calculation
      const costData = {
        latestCalculation: finalResult,
        calculatedAt: new Date().toISOString(),
        inputData: inputData
      };

      await airtableService.updateCustomer(customerId, {
        'Cost Calculator Content': JSON.stringify(costData),
        'Content Status': 'Ready',
        'Last Accessed': new Date().toISOString()
      });

      // Trigger automation if requested
      if (inputData.triggerAutomation) {
        const automationResult = await makeService.triggerCostCalculation(customer, finalResult);
        logger.info(`Cost calculation automation triggered: ${automationResult.success}`);
      }

      res.status(200).json({
        success: true,
        data: {
          customerId,
          calculation: finalResult,
          aiEnhanced: aiResult.success,
          saved: true,
          automationTriggered: !!inputData.triggerAutomation
        }
      });

    } catch (error) {
      logger.error(`Error in AI-enhanced cost calculation: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'AI-enhanced cost calculation failed',
        details: error.message
      });
    }
  }
};

export default costCalculatorController;