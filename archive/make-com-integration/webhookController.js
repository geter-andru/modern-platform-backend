import makeService from '../services/makeService.js';
import airtableService from '../services/airtableService.js';
import logger from '../utils/logger.js';

const webhookController = {
  /**
   * Handle incoming webhook from Make.com with processed data
   */
  async handleIncomingWebhook(req, res) {
    try {
      const { webhookType, customerId, data, processedContent, metadata } = req.body;

      if (!webhookType || !customerId) {
        return res.status(400).json({
          success: false,
          error: 'webhookType and customerId are required'
        });
      }

      logger.info(`Received webhook: ${webhookType} for customer ${customerId}`);

      // Get customer data
      const customer = await airtableService.getCustomerById(customerId);
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
      }

      let updateResult;

      switch (webhookType) {
        case 'icp_analysis_complete':
          updateResult = await webhookController.handleICPComplete(customer, processedContent, metadata);
          break;
        
        case 'cost_calculation_complete':
          updateResult = await webhookController.handleCostCalculationComplete(customer, processedContent, metadata);
          break;
        
        case 'business_case_complete':
          updateResult = await webhookController.handleBusinessCaseComplete(customer, processedContent, metadata);
          break;
        
        case 'progress_milestone':
          updateResult = await webhookController.handleProgressMilestone(customer, processedContent, metadata);
          break;
        
        default:
          logger.warn(`Unknown webhook type: ${webhookType}`);
          return res.status(400).json({
            success: false,
            error: 'Unknown webhook type'
          });
      }

      res.status(200).json({
        success: true,
        data: {
          webhookType,
          customerId,
          processed: true,
          updateResult,
          processedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error(`Error handling webhook: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Webhook processing failed',
        details: error.message
      });
    }
  },

  /**
   * Handle ICP analysis completion
   */
  async handleICPComplete(customer, processedContent, metadata) {
    try {
      const icpData = {
        title: processedContent.title || 'AI-Generated ICP Analysis',
        description: processedContent.description,
        segments: processedContent.segments || [],
        keyIndicators: processedContent.keyIndicators || [],
        redFlags: processedContent.redFlags || [],
        ratingCriteria: processedContent.ratingCriteria || [],
        confidence: metadata?.confidence || 85,
        generatedAt: new Date().toISOString(),
        source: 'ai_automation'
      };

      // Update customer record with new ICP content
      const updateData = {
        'ICP Content': JSON.stringify(icpData),
        'Content Status': 'Ready',
        'Last Accessed': new Date().toISOString()
      };

      await airtableService.updateCustomer(customer.customerId, updateData);

      // Update progress tracking
      await airtableService.updateUserProgress(customer.customerId, 'ICP Analysis', {
        completionStatus: 'completed',
        aiGenerated: true,
        confidence: icpData.confidence,
        completedAt: new Date().toISOString(),
        segmentsIdentified: icpData.segments.length,
        indicatorsFound: icpData.keyIndicators.length
      });

      logger.info(`ICP analysis completed for customer ${customer.customerId}`);
      return { updated: true, contentType: 'icp', segments: icpData.segments.length };
    } catch (error) {
      logger.error(`Failed to handle ICP completion: ${error.message}`);
      throw error;
    }
  },

  /**
   * Handle cost calculation completion
   */
  async handleCostCalculationComplete(customer, processedContent, metadata) {
    try {
      const costData = {
        latestCalculation: {
          totalCost: processedContent.totalCost,
          scenario: processedContent.scenario || 'realistic',
          categories: processedContent.categories || {},
          breakdown: processedContent.breakdown || {},
          recommendations: processedContent.recommendations || [],
          calculatedAt: new Date().toISOString()
        },
        aiInsights: processedContent.insights || [],
        confidence: metadata?.confidence || 80,
        source: 'ai_automation'
      };

      // Update customer record
      const updateData = {
        'Cost Calculator Content': JSON.stringify(costData),
        'Content Status': 'Ready',
        'Last Accessed': new Date().toISOString()
      };

      await airtableService.updateCustomer(customer.customerId, updateData);

      // Update progress tracking
      await airtableService.updateUserProgress(customer.customerId, 'Cost Calculator', {
        completionStatus: 'completed',
        aiGenerated: true,
        totalCost: costData.latestCalculation.totalCost,
        scenario: costData.latestCalculation.scenario,
        completedAt: new Date().toISOString()
      });

      logger.info(`Cost calculation completed for customer ${customer.customerId}`);
      return { updated: true, contentType: 'cost_calculator', totalCost: costData.latestCalculation.totalCost };
    } catch (error) {
      logger.error(`Failed to handle cost calculation completion: ${error.message}`);
      throw error;
    }
  },

  /**
   * Handle business case completion
   */
  async handleBusinessCaseComplete(customer, processedContent, metadata) {
    try {
      const businessCaseData = {
        title: processedContent.title || 'AI-Generated Business Case',
        executive_summary: processedContent.executiveSummary,
        problem_statement: processedContent.problemStatement,
        proposed_solution: processedContent.proposedSolution,
        financial_projections: processedContent.financialProjections || {},
        implementation_plan: processedContent.implementationPlan || {},
        risk_assessment: processedContent.riskAssessment || {},
        success_metrics: processedContent.successMetrics || [],
        recommendations: processedContent.recommendations || [],
        confidence: metadata?.confidence || 85,
        generatedAt: new Date().toISOString(),
        source: 'ai_automation'
      };

      // Update customer record
      const updateData = {
        'Business Case Content': JSON.stringify(businessCaseData),
        'Content Status': 'Ready',
        'Last Accessed': new Date().toISOString()
      };

      await airtableService.updateCustomer(customer.customerId, updateData);

      // Update progress tracking
      await airtableService.updateUserProgress(customer.customerId, 'Business Case Builder', {
        completionStatus: 'completed',
        aiGenerated: true,
        confidence: businessCaseData.confidence,
        completedAt: new Date().toISOString(),
        sectionsGenerated: Object.keys(businessCaseData).filter(key => 
          typeof businessCaseData[key] === 'string' && businessCaseData[key].length > 0
        ).length
      });

      logger.info(`Business case completed for customer ${customer.customerId}`);
      return { updated: true, contentType: 'business_case', title: businessCaseData.title };
    } catch (error) {
      logger.error(`Failed to handle business case completion: ${error.message}`);
      throw error;
    }
  },

  /**
   * Handle progress milestone
   */
  async handleProgressMilestone(customer, processedContent, metadata) {
    try {
      const progressUpdate = {
        milestone: processedContent.milestone,
        achievement: processedContent.achievement,
        impact: processedContent.impact,
        nextSteps: processedContent.nextSteps || [],
        confidence: metadata?.confidence || 90,
        achievedAt: new Date().toISOString(),
        source: 'ai_automation'
      };

      // Update progress tracking
      await airtableService.updateUserProgress(customer.customerId, progressUpdate.milestone, {
        completionStatus: 'milestone_achieved',
        aiTracked: true,
        achievement: progressUpdate.achievement,
        impact: progressUpdate.impact,
        achievedAt: progressUpdate.achievedAt
      });

      logger.info(`Progress milestone achieved for customer ${customer.customerId}: ${progressUpdate.milestone}`);
      return { updated: true, contentType: 'progress', milestone: progressUpdate.milestone };
    } catch (error) {
      logger.error(`Failed to handle progress milestone: ${error.message}`);
      throw error;
    }
  },

  /**
   * Trigger outbound automation
   */
  async triggerAutomation(req, res) {
    try {
      const { customerId, automationType, data } = req.body;

      if (!customerId || !automationType) {
        return res.status(400).json({
          success: false,
          error: 'customerId and automationType are required'
        });
      }

      // Get customer data
      const customer = await airtableService.getCustomerById(customerId);
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
      }

      let result;

      switch (automationType) {
        case 'icp_analysis':
          result = await makeService.triggerICPAnalysis(customer);
          break;
        
        case 'cost_calculation':
          result = await makeService.triggerCostCalculation(customer, data);
          break;
        
        case 'business_case':
          result = await makeService.triggerBusinessCaseGeneration(customer, data);
          break;
        
        case 'progress_update':
          result = await makeService.triggerProgressUpdate(customer, data);
          break;
        
        default:
          result = await makeService.triggerAutomation(automationType, customer, data);
      }

      res.status(200).json({
        success: true,
        data: {
          customerId,
          automationType,
          triggered: result.success,
          result,
          triggeredAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error(`Error triggering automation: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Automation trigger failed',
        details: error.message
      });
    }
  },

  /**
   * Test webhook connectivity
   */
  async testWebhooks(req, res) {
    try {
      const { webhookType } = req.params;

      if (webhookType && !['icp', 'costCalculator', 'businessCase'].includes(webhookType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid webhook type'
        });
      }

      const webhookStatus = makeService.getWebhookStatus();
      
      if (webhookType) {
        // Test specific webhook
        const testResult = await makeService.testWebhook(webhookType);
        return res.status(200).json({
          success: true,
          data: {
            webhookType,
            testResult,
            status: webhookStatus
          }
        });
      } else {
        // Test all configured webhooks
        const testResults = {};
        for (const type of ['icp', 'costCalculator', 'businessCase']) {
          if (webhookStatus[type]) {
            testResults[type] = await makeService.testWebhook(type);
          }
        }

        return res.status(200).json({
          success: true,
          data: {
            testResults,
            status: webhookStatus,
            testedAt: new Date().toISOString()
          }
        });
      }

    } catch (error) {
      logger.error(`Error testing webhooks: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Webhook test failed',
        details: error.message
      });
    }
  },

  /**
   * Get automation status and configuration
   */
  async getAutomationStatus(req, res) {
    try {
      const webhookStatus = makeService.getWebhookStatus();
      
      res.status(200).json({
        success: true,
        data: {
          automationEnabled: webhookStatus.configured > 0,
          webhookStatus,
          availableAutomations: [
            'icp_analysis',
            'cost_calculation',
            'business_case',
            'progress_update'
          ],
          configuration: {
            makeIntegration: webhookStatus.configured > 0,
            aiProcessing: true,
            progressTracking: true
          },
          checkedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error(`Error getting automation status: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to get automation status',
        details: error.message
      });
    }
  }
};

export default webhookController;