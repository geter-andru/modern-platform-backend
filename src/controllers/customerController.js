import airtableService from '../services/airtableService.js';
import aiService from '../services/aiService.js';
import makeService from '../services/makeService.js';
import logger from '../utils/logger.js';

const customerController = {
  // Get customer by ID
  async getCustomer(req, res) {
    try {
      const { customerId } = req.params;
      
      logger.info(`Fetching customer data for ${customerId}`);
      
      const customer = await airtableService.getCustomerById(customerId);
      
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found',
          customerId
        });
      }

      // Update last accessed timestamp
      await airtableService.updateCustomer(customerId, {
        'Last Accessed': new Date().toISOString()
      });

      res.status(200).json({
        success: true,
        data: customer
      });
    } catch (error) {
      logger.error(`Error fetching customer ${req.params.customerId}:`, error);
      throw error;
    }
  },

  // Get customer's ICP data
  async getCustomerICP(req, res) {
    try {
      const { customerId } = req.params;
      
      logger.info(`Fetching ICP data for customer ${customerId}`);
      
      const customer = await airtableService.getCustomerById(customerId);
      
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found',
          customerId
        });
      }

      // Parse ICP content if it exists
      let icpData = null;
      if (customer.icpContent) {
        try {
          icpData = JSON.parse(customer.icpContent);
        } catch (parseError) {
          logger.warn(`Failed to parse ICP content for customer ${customerId}:`, parseError);
          icpData = { rawContent: customer.icpContent };
        }
      }

      res.status(200).json({
        success: true,
        data: {
          customerId: customer.customerId,
          icpData,
          contentStatus: customer.contentStatus,
          lastAccessed: customer.lastAccessed
        }
      });
    } catch (error) {
      logger.error(`Error fetching ICP data for customer ${req.params.customerId}:`, error);
      throw error;
    }
  },

  // Update customer data
  async updateCustomer(req, res) {
    try {
      const { customerId } = req.params;
      const updateData = req.body;
      
      logger.info(`Updating customer ${customerId} with data:`, updateData);
      
      // Ensure customer exists first
      const existingCustomer = await airtableService.getCustomerById(customerId);
      if (!existingCustomer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found',
          customerId
        });
      }

      // Add timestamp for last updated
      updateData['Last Accessed'] = new Date().toISOString();
      
      const updatedRecord = await airtableService.updateCustomer(customerId, updateData);
      
      res.status(200).json({
        success: true,
        data: {
          customerId,
          updated: true,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error(`Error updating customer ${req.params.customerId}:`, error);
      throw error;
    }
  },

  // Get all customers (admin endpoint)
  async getAllCustomers(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 100;
      
      logger.info(`Fetching all customers with limit ${limit}`);
      
      const customers = await airtableService.getAllCustomers(limit);
      
      res.status(200).json({
        success: true,
        data: {
          customers,
          count: customers.length,
          limit
        }
      });
    } catch (error) {
      logger.error('Error fetching all customers:', error);
      throw error;
    }
  },

  // Generate AI-powered ICP analysis
  async generateAIICP(req, res) {
    try {
      const { customerId } = req.params;
      const { industry, companySize, currentChallenges, goals, triggerAutomation } = req.body;

      logger.info(`Generating AI-powered ICP for customer ${customerId}`);

      // Get customer data
      const customer = await airtableService.getCustomerById(customerId);
      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
      }

      // Prepare business context
      const businessContext = {
        industry: industry || 'Technology',
        companySize: companySize || 'medium',
        currentChallenges: currentChallenges || ['scalability', 'efficiency'],
        goals: goals || ['increase revenue', 'improve operations']
      };

      // Generate ICP using AI
      const aiResult = await aiService.generateICPAnalysis(customer, businessContext);

      if (!aiResult.success) {
        return res.status(500).json({
          success: false,
          error: 'Failed to generate ICP analysis',
          details: aiResult.error,
          fallback: aiResult.fallback
        });
      }

      // Save the generated ICP to customer record
      const icpContent = {
        ...aiResult.data,
        generatedAt: aiResult.metadata.generatedAt,
        confidence: aiResult.metadata.confidence,
        source: 'ai_generated'
      };

      await airtableService.updateCustomer(customerId, {
        'ICP Content': JSON.stringify(icpContent),
        'Content Status': 'Ready',
        'Last Accessed': new Date().toISOString()
      });

      // Trigger automation workflow if requested
      if (triggerAutomation) {
        const automationResult = await makeService.triggerICPAnalysis(customer);
        logger.info(`Automation triggered: ${automationResult.success}`);
      }

      res.status(200).json({
        success: true,
        data: {
          customerId,
          icpAnalysis: aiResult.data,
          metadata: aiResult.metadata,
          saved: true,
          automationTriggered: !!triggerAutomation
        }
      });

    } catch (error) {
      logger.error(`Error generating AI ICP for customer ${req.params.customerId}:`, error);
      res.status(500).json({
        success: false,
        error: 'ICP generation failed',
        details: error.message
      });
    }
  }
};

export default customerController;