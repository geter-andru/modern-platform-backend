import config from '../config/index.js';
import logger from '../utils/logger.js';

class MakeService {
  constructor() {
    this.webhooks = config.webhooks;
  }

  /**
   * Trigger ICP Analysis workflow in Make.com
   */
  async triggerICPAnalysis(customerData) {
    try {
      if (!this.webhooks.icp) {
        logger.warn('ICP webhook URL not configured');
        return { success: false, reason: 'Webhook not configured' };
      }

      const payload = {
        customerId: customerData.customerId,
        customerName: customerData.customerName,
        company: customerData.company,
        email: customerData.email,
        triggerType: 'icp_analysis',
        timestamp: new Date().toISOString(),
        data: {
          industry: customerData.industry || 'Technology',
          companySize: customerData.companySize || 'medium',
          currentChallenges: customerData.currentChallenges || [],
          goals: customerData.goals || []
        }
      };

      const response = await fetch(this.webhooks.icp, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'HS-Platform-API/1.0'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Make.com webhook failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      logger.info(`ICP analysis triggered for customer ${customerData.customerId}`);

      return {
        success: true,
        webhookResponse: result,
        triggeredAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Failed to trigger ICP analysis: ${error.message}`);
      return {
        success: false,
        error: error.message,
        triggeredAt: new Date().toISOString()
      };
    }
  }

  /**
   * Trigger Cost Calculator workflow in Make.com
   */
  async triggerCostCalculation(customerData, calculationData) {
    try {
      if (!this.webhooks.costCalculator) {
        logger.warn('Cost Calculator webhook URL not configured');
        return { success: false, reason: 'Webhook not configured' };
      }

      const payload = {
        customerId: customerData.customerId,
        customerName: customerData.customerName,
        company: customerData.company,
        triggerType: 'cost_calculation',
        timestamp: new Date().toISOString(),
        calculationData: {
          potentialDeals: calculationData.potentialDeals,
          averageDealSize: calculationData.averageDealSize,
          conversionRate: calculationData.conversionRate,
          delayMonths: calculationData.delayMonths,
          scenario: calculationData.scenario,
          totalCost: calculationData.totalCost,
          categories: calculationData.categories
        }
      };

      const response = await fetch(this.webhooks.costCalculator, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'HS-Platform-API/1.0'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Make.com webhook failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      logger.info(`Cost calculation triggered for customer ${customerData.customerId}`);

      return {
        success: true,
        webhookResponse: result,
        triggeredAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Failed to trigger cost calculation: ${error.message}`);
      return {
        success: false,
        error: error.message,
        triggeredAt: new Date().toISOString()
      };
    }
  }

  /**
   * Trigger Business Case Generation workflow in Make.com
   */
  async triggerBusinessCaseGeneration(customerData, businessCaseData) {
    try {
      if (!this.webhooks.businessCase) {
        logger.warn('Business Case webhook URL not configured');
        return { success: false, reason: 'Webhook not configured' };
      }

      const payload = {
        customerId: customerData.customerId,
        customerName: customerData.customerName,
        company: customerData.company,
        triggerType: 'business_case_generation',
        timestamp: new Date().toISOString(),
        businessCaseData: {
          caseType: businessCaseData.caseType,
          industry: businessCaseData.industry,
          companySize: businessCaseData.companySize,
          budget: businessCaseData.budget,
          timeline: businessCaseData.timeline,
          objectives: businessCaseData.objectives,
          successMetrics: businessCaseData.successMetrics,
          currentPain: businessCaseData.currentPain || [],
          proposedSolution: businessCaseData.proposedSolution || {}
        }
      };

      const response = await fetch(this.webhooks.businessCase, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'HS-Platform-API/1.0'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Make.com webhook failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      logger.info(`Business case generation triggered for customer ${customerData.customerId}`);

      return {
        success: true,
        webhookResponse: result,
        triggeredAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Failed to trigger business case generation: ${error.message}`);
      return {
        success: false,
        error: error.message,
        triggeredAt: new Date().toISOString()
      };
    }
  }

  /**
   * Trigger Progress Update workflow in Make.com
   */
  async triggerProgressUpdate(customerData, progressData) {
    try {
      // Use the ICP webhook for progress updates if no dedicated webhook
      const webhookUrl = this.webhooks.progress || this.webhooks.icp;
      
      if (!webhookUrl) {
        logger.warn('Progress webhook URL not configured');
        return { success: false, reason: 'Webhook not configured' };
      }

      const payload = {
        customerId: customerData.customerId,
        customerName: customerData.customerName,
        company: customerData.company,
        triggerType: 'progress_update',
        timestamp: new Date().toISOString(),
        progressData: {
          completedMilestones: progressData.completedMilestones || [],
          currentStage: progressData.currentStage,
          nextActions: progressData.nextActions || [],
          completionPercentage: progressData.completionPercentage || 0,
          timeSpent: progressData.timeSpent || 0,
          toolsUsed: progressData.toolsUsed || [],
          insights: progressData.insights || []
        }
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'HS-Platform-API/1.0'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Make.com webhook failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      logger.info(`Progress update triggered for customer ${customerData.customerId}`);

      return {
        success: true,
        webhookResponse: result,
        triggeredAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Failed to trigger progress update: ${error.message}`);
      return {
        success: false,
        error: error.message,
        triggeredAt: new Date().toISOString()
      };
    }
  }

  /**
   * Trigger general automation workflow
   */
  async triggerAutomation(webhookType, customerData, payload) {
    try {
      const webhookUrl = this.webhooks[webhookType];
      
      if (!webhookUrl) {
        logger.warn(`Webhook URL not configured for type: ${webhookType}`);
        return { success: false, reason: 'Webhook not configured' };
      }

      const automationPayload = {
        customerId: customerData.customerId,
        customerName: customerData.customerName,
        company: customerData.company,
        triggerType: webhookType,
        timestamp: new Date().toISOString(),
        payload
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'HS-Platform-API/1.0'
        },
        body: JSON.stringify(automationPayload)
      });

      if (!response.ok) {
        throw new Error(`Make.com webhook failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      logger.info(`Automation triggered: ${webhookType} for customer ${customerData.customerId}`);

      return {
        success: true,
        webhookResponse: result,
        triggeredAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Failed to trigger automation ${webhookType}: ${error.message}`);
      return {
        success: false,
        error: error.message,
        triggeredAt: new Date().toISOString()
      };
    }
  }

  /**
   * Test webhook connectivity
   */
  async testWebhook(webhookType) {
    try {
      const webhookUrl = this.webhooks[webhookType];
      
      if (!webhookUrl) {
        return { success: false, reason: 'Webhook not configured' };
      }

      const testPayload = {
        test: true,
        webhookType,
        timestamp: new Date().toISOString(),
        message: 'Webhook connectivity test from HS Platform API'
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'HS-Platform-API/1.0'
        },
        body: JSON.stringify(testPayload)
      });

      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        tested: webhookType,
        testedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error(`Webhook test failed for ${webhookType}: ${error.message}`);
      return {
        success: false,
        error: error.message,
        tested: webhookType,
        testedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Get webhook configuration status
   */
  getWebhookStatus() {
    return {
      icp: !!this.webhooks.icp,
      costCalculator: !!this.webhooks.costCalculator,
      businessCase: !!this.webhooks.businessCase,
      configured: Object.values(this.webhooks).filter(Boolean).length,
      total: Object.keys(this.webhooks).length
    };
  }
}

export default new MakeService();